import logging
import json
from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import os
import uvicorn
import nltk
from datetime import datetime

try:
    nltk.download('punkt_tab', quiet=True)
    nltk.download('punkt', quiet=True)
    print("✅ NLTK resources downloaded successfully")
except Exception as e:
    print(f"⚠️ NLTK download warning: {e}")
from typing import Optional
from vocode.streaming.models.vector_db import PineconeConfig
from vocode.streaming.models.agent import ChatGPTAgentConfig, FillerAudioConfig, CutOffResponse
from vocode.streaming.action.end_conversation import EndConversationVocodeActionConfig
from vocode.streaming.action.transfer_call import TransferCallVocodeActionConfig
from vocode.streaming.models.actions import ActionConfig, PhraseBasedActionTrigger, PhraseBasedActionTriggerConfig, PhraseTrigger
from vocode.streaming.action.default_factory import DefaultActionFactory
from vocode.streaming.agent.chat_gpt_agent import ChatGPTAgent
from vocode.streaming.agent.abstract_factory import AbstractAgentFactory
from ssml_agent_wrapper import SSMLChatGPTAgent
from custom_vocode_wrappers import CustomSSMLChatGPTAgentWithRAG, CustomVectorDBFactory

from vocode.streaming.models.message import BaseMessage, SSMLMessage, SilenceMessage
from vocode.streaming.agent.base_agent import RespondAgent
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.models.transcriber import DeepgramTranscriberConfig, TimeEndpointingConfig, PunctuationEndpointingConfig
from vocode.streaming.telephony.conversation.outbound_call import OutboundCall
from vocode.streaming.telephony.server.base import TelephonyServer
from vocode.streaming.models.synthesizer import ElevenLabsSynthesizerConfig, StreamElementsSynthesizerConfig, RimeSynthesizerConfig
from memory_config import config_manager
from simple_webhooks import EVENTS_MANAGER
from vocode.streaming.models.synthesizer import AudioEncoding
from vocode.streaming import constants
from unified_cost_tracker import unified_cost_tracker as cost_calculator
from unified_cost_tracker import unified_cost_tracker as usage_tracker
from vocode_usage_hook import vocode_usage_hook
from error_handlers import JSONErrorHandlingMiddleware
from credential_validator import validator
from twilio_cost_fetcher import TwilioCostFetcher, twilio_cost_fetcher
from vocode.streaming.action.end_conversation import EndConversation
from vocode.streaming.action.transfer_call import TwilioTransferCall
from language_config_wrapper import LanguageConfig

# Temporarily disabled Sentry SDK due to compatibility issue with newer version
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.loguru import LoguruIntegration
from sentry_sdk import start_transaction, start_span
from vocode import sentry_transaction

import time

twilio_cost_fetcher = TwilioCostFetcher()
# Temporarily disabled Sentry SDK initialization to fix SpanRecorder compatibility issue
if os.getenv("SENTRY_DSN"):
    try:
        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            environment=os.getenv("ENVIRONMENT", "development"),
            traces_sample_rate=0.0,  # Disabled tracing due to SpanRecorder compatibility issue
            integrations=[
                FastApiIntegration(),
            ],
        )
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Sentry: {e}")


def async_timed(func):

    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        end = time.time()
        logger.info(f"⚡ {func.__name__} completed in {(end-start)*1000:.1f}ms")
        return result

    return wrapper


logging.basicConfig(
    level=logging.INFO,  # Changed from INFO to WARNING for performance
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Keep main logger at INFO for critical messages

# PERFORMANCE OPTIMIZATION: Minimize logging in high-frequency components
logging.getLogger("vocode").setLevel(logging.ERROR)  # Reduced from WARNING
logging.getLogger("vocode.streaming").setLevel(
    logging.ERROR)  # Reduced from WARNING
logging.getLogger("vocode.streaming.telephony").setLevel(logging.ERROR)
logging.getLogger("vocode.streaming.agent").setLevel(
    logging.INFO)  # Reduced from INFO
logging.getLogger("vocode.streaming.transcriber").setLevel(
    logging.WARNING)  # Reduced from INFO
logging.getLogger("vocode.streaming.synthesizer").setLevel(logging.ERROR)
logging.getLogger("vocode.streaming.streaming_conversation").setLevel(
    logging.WARNING)  # Reduced from INFO
logging.getLogger("vocode.streaming.utils").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.CRITICAL)
logging.getLogger("fastapi").setLevel(logging.CRITICAL)
logging.getLogger("uvicorn").setLevel(logging.CRITICAL)
logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)

# ------------- FastAPI App Setup ---------------------
app = FastAPI(docs_url=None)

# Add CORS middleware for WebSocket support
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add error handling middleware to prevent JSON decode errors
app.add_middleware(JSONErrorHandlingMiddleware)
templates = Jinja2Templates(directory="templates")

# WebSocket endpoint to handle Twilio connections
from fastapi import WebSocket, WebSocketDisconnect

# --------------- BASE_URL Setup ----------------------
BASE_URL = os.getenv("BASE_URL")
logger.info(f"Base url is, {BASE_URL}")

# Try Replit environment first
if not BASE_URL and os.getenv("REPL_SLUG") and os.getenv("REPL_OWNER"):
    BASE_URL = f"https://{os.getenv('REPL_SLUG')}.{os.getenv('REPL_OWNER')}.repl.co"
    logger.info(f"Using Replit URL: {BASE_URL}")

# Try ngrok as fallback
if not BASE_URL:
    try:
        from pyngrok import ngrok
        import sys
        ngrok_auth = os.environ.get("NGROK_AUTH_TOKEN")
        if ngrok_auth is not None:
            ngrok.set_auth_token(ngrok_auth)
        port = int(sys.argv[sys.argv.index("--port") +
                            1]) if "--port" in sys.argv else 3000
        tunnel = ngrok.connect(str(port))
        if tunnel and tunnel.public_url:
            BASE_URL = tunnel.public_url.replace("https://",
                                                 "").replace("http://", "")
        logger.info(f'ngrok tunnel "{BASE_URL}" -> "http://127.0.0.1:{port}"')
    except ImportError:
        logger.warning(
            "pyngrok not available and no BASE_URL set. Using localhost fallback."
        )

# Final fallback to ensure BASE_URL is never None
if not BASE_URL:
    BASE_URL = "localhost:3000"
    logger.warning(f"Using fallback BASE_URL: {BASE_URL}")

# Clean up protocol prefixes if present
if BASE_URL and (BASE_URL.startswith("https://")
                 or BASE_URL.startswith("http://")):
    BASE_URL = BASE_URL.replace("https://", "").replace("http://", "")

# Log the final BASE_URL for easy identification
logger.info(f"🌐 Application accessible at: https://{BASE_URL}")
logger.info(
    f"📡 API endpoint for Postman: https://{BASE_URL}/start_outbound_call")

CONFIG_MANAGER = config_manager

# Agent and Synthesizer Configs
AGENT_CONFIG = ChatGPTAgentConfig(
    initial_message=BaseMessage(text="Hello?"),
    prompt_preamble="You are a constumer care executive",
    generate_responses=True,
    model_name="gpt-4o-mini")
SYNTH_CONFIG = StreamElementsSynthesizerConfig.from_telephone_output_device()


# PERFORMANCE OPTIMIZATION: Simplified TTS configuration (caching temporarily disabled for stability)
def _configure_tts_provider_cached(provider: str,
                                   api_key: str = "",
                                   voice: str = "",
                                   model: str = "",
                                   speed: float = 1.0):
    """Configure TTS synthesizer with caching for performance."""
    if provider == "eleven_labs" and api_key:
        return _configure_eleven_labs(api_key, voice, model, speed)
    elif provider == "rime" and api_key:
        return _configure_rime_tts(api_key, voice, model, speed)
    elif provider == "stream_elements":
        return _configure_stream_elements_tts(voice, speed)
    else:
        return StreamElementsSynthesizerConfig.from_telephone_output_device()


def _build_enhanced_prompt(base_prompt: str,
                           voicemail_enabled: bool,
                           voicemail_msg: str = "",
                           transfer_msg: str = "",
                           language: str = "en"):
    """Build enhanced prompt with voicemail and transfer instructions in the appropriate language."""
    # Use LanguageConfig wrapper to get language-specific messages
    goodbye_msg = LanguageConfig.get_goodbye_message(language)
    goodbye_single = LanguageConfig.get_goodbye_word(language)

    if voicemail_enabled and voicemail_msg:
        return (
            f"{base_prompt} | Rules: "
            f"Voicemail→On detection say '{voicemail_msg}', then '{goodbye_single}' and end. "
            f"Transfer→If user asks for human/agent/service, say '{transfer_msg}'. "
            # FIX: Note the use of single quotes for the nested string 'Thank you...'
            f"NOT INTERESTED: If user says they're not interested, busy, or asks to be removed, say ONLY 'Thank you Have a Great day! GoodBye' (nothing else) which will AUTO-HANGUP immediately. "
            f"FINAL CLOSURE: When the conversation is complete (meeting booked, information provided, or call disqualified), say exactly: 'Thank you Have a Great day! GoodBye' - this will automatically end the call. **DO NOT WAIT FOR THE USER TO REPLY.**"
        )
    else:
        # When voicemail is disabled, return base prompt with immediate hangup instructions
        return (
            f"{base_prompt} | Rules: "
            f"Voicemail→HANG UP IMMEDIATELY without speaking. "
            f"Transfer→If user asks for human/agent/service, say '{transfer_msg}'. "
            f"NOT INTERESTED: If user says they're not interested, busy, or asks to be removed, say ONLY 'Thank you Have a Great day! GoodBye' (nothing else) which will AUTO-HANGUP immediately. "
            f"FINAL CLOSURE: When the conversation is complete (meeting booked, information provided, or call disqualified), say exactly: 'Thank you Have a Great day! GoodBye' - this will automatically end the call. **DO NOT WAIT FOR THE USER TO REPLY.**"
        )


def _configure_tts_provider(provider,
                            api_key,
                            voice,
                            model,
                            primary_language="",
                            speed=1.0):
    """Configure TTS synthesizer based on provider type."""
    # PERFORMANCE OPTIMIZATION: Reduced logging and use cached function
    return _configure_tts_provider_cached(provider, api_key, voice, model,
                                          speed)


def _configure_eleven_labs(api_key, voice, model=None, speed=1.0):
    """Configure ElevenLabs TTS with API key, voice, model, and speed."""
    synth_params = {}

    # Use API key from JSON payload, fallback to environment if not provided
    eleven_key = api_key or os.environ.get("ELEVEN_LABS_API_KEY")

    if api_key and api_key.strip():
        synth_params["api_key"] = api_key.strip()
        logger.info(f"🔑 ElevenLabs API key configured directly from JSON")
    elif eleven_key:
        synth_params["api_key"] = eleven_key
        logger.info(f"🔑 Using ElevenLabs API key from environment fallback")

    if voice and voice.strip():
        synth_params["voice_id"] = voice.strip()
        logger.info(f"🔊 Using ElevenLabs with voice_id: {voice}")
    else:
        # Use default ElevenLabs voice ID
        default_voice_id = "IKne3meq5aSn9XLyUdCD"
        synth_params["voice_id"] = default_voice_id
        logger.info(
            f"🔊 Using ElevenLabs with default voice_id: {default_voice_id}")

    # Use provided model or smart default based on speed requirements
    if model and model.strip():
        model_id = model.strip()
        logger.info(f"🎛️ Using ElevenLabs model from JSON: {model_id}")
    else:
        # Default to fastest model for best performance
        model_id = "eleven_flash_v2"
        logger.info(f"🎛️ Using ElevenLabs default fast model: {model_id}")

    # Convert agent_speed to ElevenLabs speed (adjust for ElevenLabs range if needed)
    eleven_labs_speed = max(0.5, min(2.0,
                                     speed))  # ElevenLabs speed range 0.5-2.0
    logger.info(f"🏃 Using ElevenLabs speed: {eleven_labs_speed}")

    # Add recommended ElevenLabs voice parameters
    synth_params.update({
        "stability": 0.5,  # Balanced expressiveness
        "similarity_boost": 0.78,  # Good resemblance to preset
        "style_exaggeration": 0,  # Default stylization
        "speaker_boost": True,
        "speed": eleven_labs_speed,  # Use speed from JSON payload
        "model_id": model_id,  # Use provided or default model
        "optimize_streaming_latency": 3  # Enable SSML processing
    })

    return ElevenLabsSynthesizerConfig.from_telephone_output_device(
        **synth_params)


def _configure_rime_tts(api_key, voice, model=None, speed=1.0):
    """Configure Rime TTS with API key, voice (speaker), model, and speed."""
    synth_params = {}

    # Configure voice/speaker - Rime uses 'speaker' parameter
    if voice and voice.strip():
        synth_params["speaker"] = voice.strip()
        logger.info(f"🔊 Using Rime TTS with speaker: {voice}")
    else:
        # Use Rime's default speaker - don't override to maintain compatibility
        logger.info(f"🔊 Using Rime TTS with default speaker")

    # Configure model - Rime model_id can be None for default
    if model and model.strip():
        synth_params["model_id"] = model.strip()
        logger.info(f"🎛️ Using Rime model: {model}")
    else:
        # Let Rime use its default model (None)
        logger.info(f"🎛️ Using Rime default model")

    # Configure speed (Rime uses speed_alpha parameter)
    # Convert standard speed (0.5-2.0) to Rime speed_alpha range
    rime_speed = max(0.5, min(2.0, speed))
    synth_params["speed_alpha"] = rime_speed
    logger.info(f"🏃 Using Rime speed_alpha: {rime_speed}")

    # Additional Rime-specific parameters for optimal performance
    synth_params.update({
        "reduce_latency": True,  # Enable faster processing for real-time calls
    })

    # Use API key from JSON payload, fallback to environment if not provided
    rime_key = api_key or os.environ.get("RIME_API_KEY")

    if api_key and api_key.strip():
        synth_params["api_key"] = api_key.strip()
        logger.info(f"🔑 Rime API key configured directly from JSON")
    elif rime_key:
        synth_params["api_key"] = rime_key
        logger.info(f"🔑 Using Rime API key from environment fallback")

    return RimeSynthesizerConfig.from_telephone_output_device(**synth_params)


def _configure_stream_elements_tts(voice, speed=1.0):
    """Configure StreamElements TTS (no API key needed)."""
    synth_params = {}

    if voice and voice.strip():
        synth_params["voice"] = voice.strip()
        logger.info(f"Using StreamElements TTS with voice: {voice}")
    else:
        logger.info("Using StreamElements TTS with default voice")

    # StreamElements may not support speed parameter directly
    logger.info(
        f"🏃 StreamElements speed parameter: {speed} (may not be supported)")

    return StreamElementsSynthesizerConfig.from_telephone_output_device(
        **synth_params)


# You need to import the action classes directly for this to work.


# Create custom agent factory with EndConversation action support
class CustomAgentFactory(AbstractAgentFactory):

    def __init__(self):
        # Create action factory with EndConversation and TransferCall actions
        end_conversation_config = EndConversationVocodeActionConfig()
        transfer_call_config = TransferCallVocodeActionConfig(phone_number="")

        # Pass the list of ActionConfig objects to the DefaultActionFactory
        self.action_factory = DefaultActionFactory(
            actions=[end_conversation_config, transfer_call_config])

        from vocode.streaming.models.actions import ActionType

        from vocode.streaming.action.dtmf import TwilioDTMF

        # Manually add Twilio actions to the factory's action registry
        self.action_factory.actions[
            ActionType.TRANSFER_CALL] = TwilioTransferCall
        self.action_factory.actions[ActionType.DTMF] = TwilioDTMF

        # Store language for SSML processing (default to English)
        self.language = "en"

    def set_language(self, language: str):
        """Set the language for SSML processing"""
        self.language = language

    def create_agent(self, agent_config):
        if isinstance(agent_config, ChatGPTAgentConfig):
            # Use custom wrapper with BOTH SSML pronunciation AND RAG functionality
            # This wrapper extends the vocode package without modifying it directly
            return CustomSSMLChatGPTAgentWithRAG(
                agent_config=agent_config,
                action_factory=self.action_factory,
                vector_db_factory=CustomVectorDBFactory(),
                language=self.language)
        else:
            # Fallback to default behavior for other agent types
            logger.info("Using default agent factory for non-ChatGPT agent")
            from vocode.streaming.agent.default_factory import DefaultAgentFactory
            default_factory = DefaultAgentFactory()
            return default_factory.create_agent(agent_config)


# Create custom agent factory and use default synthesizer factory
custom_agent_factory = CustomAgentFactory()

# TelephonyServer with proper EventsManager integration and default synthesizer factory
telephony_server = TelephonyServer(base_url=BASE_URL,
                                   config_manager=CONFIG_MANAGER,
                                   events_manager=EVENTS_MANAGER,
                                   agent_factory=custom_agent_factory)
app.include_router(telephony_server.get_router())

ACTIVE_CALLS = {}


async def start_dynamic_outbound_call(to_phone: str,
                                      from_phone: str,
                                      base_url: str,
                                      telephony_config: TwilioConfig,
                                      agent_config: ChatGPTAgentConfig,
                                      synthesizer_config,
                                      transcriber_config,
                                      on_no_human_answer: str = "continue",
                                      recording_enabled: bool = False):

    # Temporarily disabled Sentry tracing due to compatibility issues
    with start_transaction(op="telephony_conversation",
                           name=f"call:{to_phone}") as txn:
        sentry_transaction.set(txn)  # allow Vocode to hook in its own spans

        # Configure telephony parameters to include recording
        telephony_params = {}
        if recording_enabled:
            telephony_params["Record"] = "true"

            logger.info(f"📹 Recording enabled via telephony parameters")

        telephony_params["Timeout"] = str(20)

        # Temporarily disabled Sentry spans
        with start_span(op="outbound.setup"):
            outbound_call = OutboundCall(base_url=base_url,
                                         to_phone=to_phone,
                                         from_phone=from_phone,
                                         config_manager=CONFIG_MANAGER,
                                         agent_config=agent_config,
                                         telephony_config=telephony_config,
                                         synthesizer_config=synthesizer_config,
                                         transcriber_config=transcriber_config,
                                         telephony_params=telephony_params)
        with start_span(op="outbound.start"):
            await outbound_call.start()

        call_id = outbound_call.conversation_id
        logger.info(f"Outbound call started with conversation ID: {call_id}")

        return call_id


@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint for Docker and load balancer health probes."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "orchestrates",
            "timestamp": datetime.now().isoformat()
        }
    )


@app.get("/")
async def root(request: Request):
    env_vars = {
        "BASE_URL":
        BASE_URL,
        "OPENAI_API_KEY":
        "✅ Configured" if os.environ.get("OPENAI_API_KEY") else "❌ Missing",
        "DEEPGRAM_API_KEY":
        "✅ Configured" if os.environ.get("DEEPGRAM_API_KEY") else "❌ Missing",
        "RIME_API_KEY":
        "✅ Configured" if os.environ.get("RIME_API_KEY") else "❌ Missing",
        "TWILIO_ACCOUNT_SID":
        "✅ JSON-Only - No server-side storage",
        "TWILIO_AUTH_TOKEN":
        "✅ JSON-Only - No server-side storage",
        "PHONE_NUMBERS":
        "✅ JSON-Only - Per-call specification"
    }
    return templates.TemplateResponse("index.html", {
        "request": request,
        "env_vars": env_vars
    })


@app.post("/start_outbound_call")
async def api_start_outbound_call(request: Request):
    try:
        #data get
        data = await request.json()

        logger.info("🔐 Validating API credentials...")
        all_valid, validation_results = await validator.validate_all_credentials(
            data)

        if not all_valid:
            logger.error("🚫 Credential validation failed:")
            for service, message in validation_results.items():
                if ("invalid" in message.lower()
                        or "missing" in message.lower()
                        or "error" in message.lower()
                        or "failed" in message.lower()
                        or "timeout" in message.lower()
                        or "expired" in message.lower()):
                    logger.error(f"   ❌ {service}: {message}")
                else:
                    logger.info(f"   ✅ {service}: {message}")

            return {
                "status": "error",
                "message": "Invalid or missing credentials detected",
                "validation_details": validation_results
            }

        logger.info("✅ All credentials validated successfully")
        to_phone = data.get("to_phone")
        from_phone = data.get("from_phone")
        twilio_account_sid = data.get("twilio_account_sid")
        twilio_auth_token = data.get("twilio_auth_token")

        twilio_cost_fetcher.configure_credentials(twilio_account_sid,
                                                  twilio_auth_token)
        agent_initial_message_start = data.get("agent_initial_message")
        base_agent_prompt = data.get("agent_prompt_preamble")
        # rag_response = data.get("rag_response")
        base_url = data.get("base_url")
        user_speak_first = data.get("user_speak_first")

        customer_name = data.get("contact_name")

        # Extract first name only from full customer name
        customer_first_name = customer_name.split(
        )[0] if customer_name else None

        primary_language = data.get("language", "en")

        previous_call_history = data.get("previous_call_summary", None)
        logger.info(f"Previous call history: {previous_call_history}")
        current_time = data.get("current_time", None)
        current_date = data.get("current_date", None)

        if (primary_language == "es"):
            agent_prompt = f"""
            Soy un agente. Sigue estas instrucciones cada vez que hables: - El nombre del cliente es: {customer_first_name} (Usa el primer nombre ocasionalmente durante la conversación, NO en cada oración). Sigue las instrucciones base del agente: {base_agent_prompt}. CONTEXTO DE LLAMADA ANTERIOR: {previous_call_history if previous_call_history else "Primera llamada - sin historial previo"}. Siempre di algo como: “Sí, recuerdo nuestra última llamada. Usted preguntó sobre ~contexto~ y una reunión en ese día.” FECHA Y HORA ACTUAL: {current_date} a las {current_time}. Para los correos electrónicos, siempre pide que se deletreen letra por letra (por ejemplo: a-b-c arroba x-y-z punto com) y después de que el usuario lo diga, tú también confírmalo letra por letra. Usa “arroba” para '@' y “punto” para '.'. Si el usuario proporciona el correo completo; si solo da el nombre de usuario, infiere el dominio (por ejemplo: gmail.com, yahoo.com, hotmail.com). Si, por ejemplo, el nombre del usuario es Hardik Khandal y dice que su correo es harbikkhandl@gmail.com
, confírmalo una vez, ya que puede que lo hayas escuchado mal, y es fácil adivinar que su correo es hardikkhandal@gmail.com
. Los números deben decirse claramente y correctamente. Al programar una cita, DEBES confirmar TODOS estos elementos: DÍA DE LA SEMANA (por ejemplo, “miércoles”), FECHA COMPLETA (por ejemplo, “22 de octubre”), HORA EXACTA (por ejemplo, “1:30 PM”). Repite la cita completa: “Entonces confirmamos para el miércoles 22 de octubre a la 1:30 PM, ¿es correcto?”. No aceptes confirmaciones parciales. Debes escuchar un “sí” o una confirmación clara antes de guardar. Si falta algún elemento, pregunta específicamente: “¿Qué fecha de octubre prefiere para el miércoles?”. Habla los precios numéricamente, nunca con variables o marcadores de posición. Di siempre la moneda en palabras, nunca el símbolo: - Ejemplo: $100 → “100 dólares” - €50 → “50 euros” - Centavos: convierte 0.01 dólares → “1 centavo”. Usa los precios solo del conocimiento disponible. Si te preguntan por precios y no hay información específica, menciona el costo por minuto de las llamadas de Voxsun en EE. UU. y Canadá según la base de conocimiento. Para el mecanismo de respaldo, usa “Permítame verificar los detalles más recientes de precios para usted y le responderé en breve.” Si ocurre una interrupción, pide disculpas y completa tu mensaje anterior. Si el usuario guarda silencio por mucho tiempo, pregunta: “¿Sigue ahí?”. No intentes adivinar, inferir ni proporcionar información fuera de la base de conocimiento. Participa en una conversación inteligente, anticipa el contexto de intercambios anteriores. Usa el historial de llamadas previo para mantener una continuidad natural. Siempre intenta programar una reunión, una llamada de seguimiento o un correo de seguimiento. Mantén el discurso profesional, educado y preciso. Al finalizar la conversación, haz un cierre natural como “Gracias por su tiempo. ¡Que tenga un excelente día!”. Las direcciones de correo deben deletrearse letra por letra; se debe hacer una suposición inteligente si es necesario para el correo. Reconocimiento de correos electrónicos: Al dictar o confirmar direcciones de correo electrónico en español, sigue estas reglas mejoradas: El motor de reconocimiento de voz puede malinterpretar o reescribir direcciones cuando los usuarios las deletrean fonéticamente (por ejemplo, “a, r, r, o, b, a” para @). Para evitar esto, entrena y adapta el reconocimiento de voz para detectar patrones fonéticos específicos de correos electrónicos. Usa siempre el modo de confirmación letra por letra cuando escuches un correo. Ejemplo: “¿Dijo M-A-R-C arroba BoostMyDeal punto com?”. Usa la frase “arroba” para @ y “punto” para . Si el usuario solo proporciona el nombre de usuario, infiere un dominio común (por ejemplo: gmail.com, yahoo.com, hotmail.com). Después de que el usuario deletree el correo, confírmalo nuevamente letra por letra para evitar errores de transcripción. Asegúrate de que la sintaxis del correo sea válida (debe contener “arroba” y “punto”) antes de almacenarlo o usarlo.Después de que el usuario deletree el correo, confírmalo letra por letra para evitar errores de transcripción. Asegúrate de que la sintaxis del correo sea válida (debe contener “arroba” y “punto”) antes de guardarlo o usarlo. Ejemplo (en contexto español): “Por favor, deletree su correo letra por letra, por ejemplo: a-b-c arroba x-y-z punto com.” “Entonces, ¿confirmo que es a-b-c arroba x-y-z punto com?”.

            """

        elif (primary_language == "fr"):
            agent_prompt = f"""
            Je suis un agent. Suivez ces instructions chaque fois que vous parlez : - Le prénom du client est : {customer_first_name} (Utilisez le prénom occasionnellement pendant la conversation, PAS dans chaque phrase). Suivez les instructions de base de l’agent : {base_agent_prompt}. CONTEXTE D’APPEL PRÉCÉDENT : {previous_call_history if previous_call_history else "Premier appel - aucun historique précédent"}. Dites toujours quelque chose comme : « Oui, je me souviens de notre dernier appel. Vous aviez demandé à propos de ~contexte~ et d’une réunion ce jour-là. » DATE ET HEURE ACTUELLES : {current_date} à {current_time}. Pour les courriels, demandez toujours à ce qu’ils soient épelés lettre par lettre (par exemple : a-b-c arobase x-y-z point com), et après que l’utilisateur l’a dit, confirmez-le vous aussi lettre par lettre. Utilisez « arobase » pour '@' et « point » pour '.'. Si l’utilisateur fournit l’adresse complète ; si seulement le nom d’utilisateur, déduisez le domaine (par exemple : gmail.com, yahoo.com, hotmail.com). Si, par exemple, le nom de l’utilisateur est Hardik Khandal et qu’il dit que son courriel est [harbikkhandl@gmail.com](mailto:harbikkhandl@gmail.com), confirmez-le une fois, car il se peut que vous ayez mal entendu, et il est facile de deviner que son courriel est [hardikkhandal@gmail.com](mailto:hardikkhandal@gmail.com). Les chiffres doivent être prononcés clairement et correctement. Lors de la planification d’un rendez-vous, vous DEVEZ confirmer TOUS ces éléments : JOUR DE LA SEMAINE (par exemple : « mercredi »), DATE COMPLÈTE (par exemple : « 22 octobre »), HEURE EXACTE (par exemple : « 13 h 30 »). Répétez le rendez-vous complet : « Nous confirmons donc pour le mercredi 22 octobre à 13 h 30, est-ce correct ? ». N’acceptez pas de confirmations partielles. Vous devez entendre un « oui » ou une confirmation claire avant d’enregistrer. S’il manque un élément, demandez précisément : « Quelle date d’octobre préférez-vous pour le mercredi ? ». Énoncez les prix numériquement, jamais avec des variables ou des espaces réservés. Dites toujours la devise en toutes lettres, jamais le symbole : - Exemple : $100 → « 100 dollars » - €50 → « 50 euros » - Centimes : convertissez 0,01 dollar → « 1 centime ». Utilisez uniquement les prix provenant de la base de connaissances. Si on vous demande les prix et qu’aucune information spécifique n’est donnée, mentionnez le tarif par minute des appels Voxsun aux États-Unis et au Canada selon la base de connaissances. Pour le mécanisme de secours, dites : « Permettez-moi de vérifier les derniers détails tarifaires pour vous et je vous recontacterai bientôt. » En cas d’interruption, excusez-vous et terminez votre message précédent. Si l’utilisateur reste silencieux trop longtemps, demandez : « Êtes-vous toujours là ? ». N’essayez pas de deviner, d’inférer ni de fournir des informations en dehors de la base de connaissances. Participez à une conversation intelligente, anticipez le contexte à partir des échanges précédents. Utilisez l’historique des appels précédents pour maintenir une continuité naturelle. Essayez toujours de planifier un rendez-vous, un appel de suivi ou un courriel de suivi. Gardez un ton professionnel, poli et précis. À la fin de la conversation, concluez naturellement avec : « Merci pour votre temps. Passez une excellente journée ! ». Les adresses e-mail doivent être épelées lettre par lettre ; une supposition intelligente peut être faite si nécessaire. Reconnaissance des courriels : Lors de la dictée ou de la confirmation d’adresses e-mail en français, suivez ces règles améliorées : Le moteur de reconnaissance vocale peut mal interpréter ou réécrire les adresses lorsque les utilisateurs les épellent phonétiquement (par exemple : « a, r, r, o, b, a » pour @). Pour éviter cela, entraînez et adaptez la reconnaissance vocale afin de détecter les schémas phonétiques spécifiques aux adresses e-mail. Utilisez toujours le mode de confirmation lettre par lettre lorsque vous entendez une adresse e-mail. Exemple : « Avez-vous dit M-A-R-C arobase BoostMyDeal point com ? ». Utilisez le mot « arobase » pour @ et « point » pour . Si l’utilisateur fournit uniquement le nom d’utilisateur, déduisez un domaine courant (par exemple : gmail.com, yahoo.com, hotmail.com). Après que l’utilisateur a épelé l’adresse, confirmez-la à nouveau lettre par lettre pour éviter toute erreur de transcription. Assurez-vous que la syntaxe de l’adresse est valide (elle doit contenir « arobase » et « point ») avant de l’enregistrer ou de l’utiliser. Exemple (en contexte français) : « Veuillez épeler votre adresse e-mail lettre par lettre, par exemple : a-b-c arobase x-y-z point com. » « Donc, je confirme que c’est a-b-c arobase x-y-z point com ? ».

            """

        else:
            agent_prompt = f"""
            I am an agent . Follow these instructions every time you speak: - Customer's first name is: {customer_first_name} (Use the first name occasionally during conversation, NOT in every sentence) Follow the base agent prompt instructions: {base_agent_prompt} **PREVIOUS CALL CONTEXT:** {previous_call_history if previous_call_history else "First call - no previous history"}. Always say like this Yes, I remember our last call. You asked about ~context~ and a meeting on this day.” **CURRENT DATE AND TIME:** {current_date} at {current_time}. For email always ask to Spell letter by letter (e.g., a-b-c at the rate x-y-z dot com) and after user speaks ypu too confirm letter by letter. Use "at the rate" for '@' and "dot" for '.'. If user provides full email; if only username, infer domain (e.g., gmail.com, yahoo.com, hotmail.com). If for example users name is hardik khandal and he told email id as harbikkhandl@gmail.com please confirm it once it might be you have heard it wrong it can be easily guess that his email is hardikkhandal@gmail.com Numbers should be spoken clearly and correctly. When scheduling an appointment, MUST confirm ALL these elements:DAY OF WEEK (e.g., "Wednesday")FULL DATE (e.g., "October 22nd") EXACT TIME (e.g., "1:30 PM") Repeat the complete appointment: "So we're confirmed for Wednesday, October 22nd at 1:30 PM, is that correct?" Do NOT accept partial confirmations. You must hear "yes" or clear confirmation before saving.If any element is missing, ask specifically: "Which date in October would you prefer for Wednesday?"Speak prices **numerically**, never in variables or placeholders.Always say the currency in words, never the symbol: - Example: $100 → "100 dollars" - €50 → "50 euros" - Cents: convert 0.01 dollars → "1 cent" - Use pricing only from the provided knowledge base. - If asked about pricing and nothin specific is given then tell the pricing of voxsun calling in USA and Canada per minute from knowledge base. For fallback mechanism use "Let me check the latest pricing details for you and will get back to you" INTERRUPTIONS: If the user interrupts or the call is momentarily cut off (e.g., due to an 'accidental mute' or technical delay), you must apologize immediately: "I apologize, it seems I accidentally muted myself for a moment." Then, quickly repeat the last point you made and wait for the user to resume.If the user is silent for a long time, ask: "Are you still there?" Do not attempt to guess, infer, or provide information outside the knowledge base. Engage in smart conversation, anticipate context from previous exchanges.Use previous call history for natural continuity. Always try to schedule a meeting or follow-up call or follow up mail.Keep speech professional, polite, and accurate."Email addresses should be spelled out letter by letter, smart guessing needs to be done for mail id Email Recognition When dictating or confirming email addresses in Spanish, follow these enhanced rules:The speech recognition engine may misinterpret or rewrite addresses when users spell them phonetically (e.g., “a, r, r, o, b, a” for @).DISQUALIFICATION RULE (Efficiency): If the caller clearly states they are NOT interested (e.g., "I'm not interested in a phone system"), if they admit to wasting time, or if their replies are nonsensical, say ONLY: "Thank you Have a Great day! GoodBye" - this will automatically end the call. DO NOT say anything else before or after this phrase. To prevent this, train and adapt speech recognition to detect email-specific phonetic spelling patterns.Always use letter-by-letter confirmation mode when hearing an email.Example:“Did you say M-A-R-C at the rate BoostMyDeal dot com?” Use the phrase “at the rate” for @ and “dot” for . If the user provides only the username, infer a common domain (e.g., gmail.com, yahoo.com, hotmail.com).After the user spells the email, confirm it back letter by letter to avoid transcription errors.Ensure the email syntax is valid (must contain “at the rate” and “dot”) before storing or using it. **HOW TO END CALLS NATURALLY:** When the conversation has truly reached a natural conclusion (appointment scheduled, user satisfied, all questions answered), end the call by saying exactly: "Thank you Have a Great day! GoodBye" - the call will automatically end after this phrase. ONLY use this goodbye phrase when the conversation is genuinely complete and user seems ready to end. DO NOT use it if the user is still engaged, asking questions, or waiting for information.
            """

        # Variable substitution for initial message
        # Support multiple placeholder formats: {customer_name}, [Customer Name], {{customer_name}}, etc.
        agent_initial_message = agent_initial_message_start

        if agent_initial_message and customer_first_name:
            # Define all possible placeholder variations
            placeholder_variations = [
                "{customer_name}",
                "{Customer Name}",
                "{CUSTOMER_NAME}",
                "[customer_name]",
                "[Customer Name]",
                "[CUSTOMER_NAME]",
                "{{customer_name}}",
                "{{Customer Name}}",
                "{{CUSTOMER_NAME}}",
                "{customer name}",
                "[customer name]",
                "{{customer name}}",
            ]

            # Replace all variations with customer's FIRST NAME only
            for placeholder in placeholder_variations:
                if placeholder in agent_initial_message:
                    agent_initial_message = agent_initial_message.replace(
                        placeholder, customer_first_name)
                    logger.info(
                        f"✅ Replaced '{placeholder}' with first name '{customer_first_name}' in initial message"
                    )

        # Extract additional agent parameters first
        agent_temperature = data.get("temperature", 0.7)

        agent_speed = data.get("agent_speed", 1.0)

        tts_config = data.get("tts", {})
        tts_provider = tts_config.get("provider_name", "stream_elements")
        tts_api_key = tts_config.get("api_key")
        tts_voice = tts_config.get("voice_id")
        tts_model = tts_config.get("model_id")

        # Handle Model configuration - direct configuration without environment variables
        model_config = data.get("model", {})
        # agent_model_name = model_config.get("gpt-4o-mini")

        agent_model_name = "gpt-4o-mini"
        openai_api_key = model_config.get("api_key")

        # Use OpenAI key from JSON payload, fallback to environment if not provided
        openai_key = openai_api_key or os.environ.get("OPENAI_API_KEY")

        if openai_api_key:
            logger.info("🔑 OpenAI API key configured directly from JSON")
        elif openai_key:
            logger.info("🔑 Using OpenAI API key from environment fallback")

        logger.info(f"🤖 Model configuration: {agent_model_name}")

        # Smart TTS model selection: Select fastest model based on language
        optimized_tts_model = tts_model
        if tts_provider == "eleven_labs" and not tts_model and primary_language:
            # Language-specific model selection for optimal speed
            lang = primary_language.lower()
            if lang in ["en"]:
                optimized_tts_model = "eleven_flash_v2"  # Fastest for English

            else:
                optimized_tts_model = "eleven_multilingual_v2"
        elif tts_model:
            logger.info(f"🎛️ Using TTS model from JSON payload: {tts_model}")

        synth_config = _configure_tts_provider(tts_provider, tts_api_key or "",
                                               tts_voice or "",
                                               optimized_tts_model or "",
                                               primary_language, agent_speed)

        stt_config = data.get("stt", {})
        deepgram_api_key = stt_config.get("api_key")

        user_tags = data.get("user_tags", [])
        system_tags = data.get("system_tags", [])

        # Use Deepgram key from JSON payload, fallback to environment if not provided
        deepgram_key = deepgram_api_key or os.environ.get("DEEPGRAM_API_KEY")

        if deepgram_api_key:
            logger.info("✅ Deepgram API key configured directly from JSON")
        else:
            logger.info("✅ Using Deepgram API key from environment fallback")

        # Configure transcriber with language-specific endpoint detection
        if primary_language == "en":
            # English: Use time-based endpoint detection with longer pause tolerance
            # Increased to 1.5s to prevent interrupting users mid-sentence
            transcriber_config = DeepgramTranscriberConfig(
                api_key=deepgram_key,
                model="nova-2",
                language=primary_language,
                sampling_rate=8000,
                audio_encoding=AudioEncoding.MULAW,
                chunk_size=1024,
                endpointing_config=TimeEndpointingConfig(
                    time_cutoff_seconds=1.5))
            logger.info(
                "🎤 Transcriber: English with time-based endpoint detection (1.5s pause tolerance)"
            )
        else:
            # Non-English (French, Spanish, etc.): Use time-based endpoint detection
            # Increased to 1.5s to prevent interrupting users mid-sentence
            transcriber_config = DeepgramTranscriberConfig(
                api_key=deepgram_key,
                model="nova-2",
                language=primary_language,
                sampling_rate=8000,
                audio_encoding=AudioEncoding.MULAW,
                chunk_size=1024,
                endpointing_config=TimeEndpointingConfig(
                    time_cutoff_seconds=1.5))
            logger.info(
                f"🎤 Transcriber: {primary_language} with time-based endpoint detection (1.5s pause tolerance)"
            )

        voicemail_raw = data.get("voicemail", False)

        voicemail_message = data.get(
            "voicemail_message",
            "Hi please call us back at your earliest convenience.")

        recording_raw = data.get("recording", True)
        transfer_message = "I'll transfer you to a human agent right away. Please hold."
        # Create TwilioConfig
        account_sid = twilio_account_sid
        auth_token = twilio_auth_token

        # Configure recording based on JSON payload
        twilio_config = TwilioConfig(
            account_sid=account_sid,
            auth_token=auth_token,
            record=recording_raw  # Use recording setting from JSON
        )

        # Determine behavior based on voicemail setting
        if voicemail_raw and voicemail_message:
            on_no_human_answer = "speak_message_and_hangup"
            logger.info("📞 Voicemail enabled: Will speak message then hangup")
        else:
            on_no_human_answer = "hangup_immediately"
            logger.info(
                "📞 Voicemail disabled: Will hangup immediately on voicemail detection"
            )

        # Extract transfer configuration

        transfer_enabled = data.get("enable_call_transfer", False)
        transfer_number = data.get("transfer_phone_number", None)

        # Configure language-specific messages using LanguageConfig wrapper
        lang_config = LanguageConfig.configure_for_language(primary_language)

        enhanced_prompt = _build_enhanced_prompt(agent_prompt, voicemail_raw,
                                                 voicemail_message or "",
                                                 transfer_message or "",
                                                 primary_language)

        # PERFORMANCE OPTIMIZATION: Configure agent actions (simplified for stability)
        agent_actions = []
        if transfer_enabled:
            if transfer_enabled and transfer_number:
                # Create transfer action with the actual phone number
                transfer_call_config = TransferCallVocodeActionConfig(
                    phone_number=transfer_number)
                agent_actions.append(transfer_call_config)

        # Configure EndConversation action - triggers ONLY on specific goodbye phrase
        # This allows agent to naturally end calls when conversation is complete
        agent_actions.append(
            EndConversationVocodeActionConfig(
                action_trigger=PhraseBasedActionTrigger(
                    type="action_trigger_phrase_based",
                    config=PhraseBasedActionTriggerConfig(phrase_triggers=[
                        PhraseTrigger(
                            phrase="Thank you Have a Great day! GoodBye",
                            conditions=["phrase_condition_type_contains"]),
                    ]))))

        if (user_speak_first):
            agent_config_params = {
                "initial_message":
                BaseMessage(text=agent_initial_message),
                "prompt_preamble":
                enhanced_prompt,
                "model_name":
                agent_model_name,
                "max_tokens":
                130,
                "temperature":
                0.3,
                # Use temperature from JSON payload
                "actions":
                agent_actions if agent_actions else None,
                # Enable interruption handling for more natural conversation flow
                "interrupt_sensitivity":
                "high",  # Balanced interruption sensitivity
                "allow_agent_to_be_cut_off":
                True,
                # "use_backchannels": True,
                # "backchannel_probability": 0.7,
                "allowed_idle_time_seconds":
                15.0,
                "num_check_human_present_times":
                2,
                "end_conversation_on_goodbye":
                True,
                "goodbye_phrases":
                lang_config[
                    "goodbye_phrases"],  # Language-specific goodbye detection
                "send_filler_audio":
                FillerAudioConfig(
                    silence_threshold_seconds=
                    0.1,  # Play filler after 0.5s of silence
                    use_typing_noise=False  # Keyboard typing sounds disabled
                ),
                "initial_message_delay":
                2.0,

                # Check if user is still there
            }

        else:
            agent_config_params = {
                "initial_message":
                BaseMessage(text=agent_initial_message),
                "prompt_preamble":
                enhanced_prompt,
                "model_name":
                agent_model_name,
                "max_tokens":
                130,
                "temperature":
                0.3,
                "cut_off_response":
                CutOffResponse(messages=[
                    # If the agent says any of these EXACT phrases, Vocode will immediately trigger the EndConversation action.
                    # This is a technical override that guarantees the hangup.
                    BaseMessage(
                        text="Thank you for your time, and have a great day!"),
                    BaseMessage(text="I understand. Thank you for your time!"),
                    BaseMessage(text="Thank you for your time!"),
                    BaseMessage(text="Have a great day!")
                ]),
                # Use temperature from JSON payload
                "actions":
                agent_actions if agent_actions else None,
                # Enable interruption handling for more natural conversation flow
                "interrupt_sensitivity":
                "high",  # Balanced interruption sensitivity
                "allow_agent_to_be_cut_off":
                True,
                # "use_backchannels": True,
                # "backchannel_probability": 0.7,
                "allowed_idle_time_seconds":
                15.0,
                "num_check_human_present_times":
                2,
                "end_conversation_on_goodbye":
                True,
                "goodbye_phrases":
                lang_config[
                    "goodbye_phrases"],  # Language-specific goodbye detection

                # With this:
                "send_filler_audio":
                FillerAudioConfig(
                    silence_threshold_seconds=
                    0.1,  # Play filler after 0.5s of silence
                    use_typing_noise=False  # Keyboard typing sounds disabled
                ),
            }

        # Add OpenAI API key directly to agent configuration if available
        if openai_key:
            agent_config_params["api_key"] = openai_key

        # Only configure vector database if all required environment variables are set
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pinecone_index = os.getenv("PINECONE_INDEX_NAME")
        pinecone_env = os.getenv("PINECONE_ENVIRONMENT")

        if pinecone_api_key and pinecone_index and pinecone_env:
            agent_config_params["vector_db_config"] = PineconeConfig(
                api_key=pinecone_api_key,
                index=pinecone_index,
                api_environment=pinecone_env,
                top_k=3)
            logger.info("=" * 60)
            logger.info("📚 VECTOR DATABASE (RAG) ENABLED")
            logger.info(f"  - Provider: Pinecone")
            logger.info(f"  - Index: {pinecone_index}")
            logger.info(f"  - Environment: {pinecone_env}")
            logger.info(f"  - Top K Results: 3")
            logger.info(f"  - Agent will ONLY answer from knowledge base")
            logger.info("=" * 60)
        else:
            logger.info(
                "📚 Vector database disabled - Pinecone environment variables not set"
            )
        # Set language in factory BEFORE creating agent for SSML processing
        custom_agent_factory.set_language(primary_language)
        logger.info(f"🌍 Language set for SSML processing: {primary_language}")

        agent_config = ChatGPTAgentConfig(**agent_config_params)

        # Use provided base_url or fallback to current BASE_URL with default
        effective_base_url = base_url or BASE_URL or "localhost:3000"

        # Start the outbound call
        conversation_id = await start_dynamic_outbound_call(
            to_phone=to_phone,
            from_phone=from_phone,
            base_url=effective_base_url,
            telephony_config=twilio_config,
            agent_config=agent_config,
            synthesizer_config=synth_config,
            transcriber_config=transcriber_config,
            on_no_human_answer=on_no_human_answer,
            recording_enabled=recording_raw)

        logger.info(
            f"Outbound call started with conversation ID: {conversation_id}")

        # Store phone numbers and Twilio credentials in webhook system for Call SID lookup
        try:
            logger.info(
                f"🔍 Attempting to store call data for conversation {conversation_id}"
            )
            logger.info(
                f"📋 EVENTS_MANAGER available: {EVENTS_MANAGER is not None}")
            logger.info(
                f"📋 Has call_phone_numbers: {hasattr(EVENTS_MANAGER, 'call_phone_numbers')}"
            )
            logger.info(f"📋 to_phone value: {to_phone}")

            if hasattr(EVENTS_MANAGER, 'call_phone_numbers') and to_phone:
                call_start_time = datetime.now().isoformat()
                call_data = {
                    "from_phone": from_phone or "",
                    "to_phone": to_phone,
                    "call_start_time": call_start_time,
                    "twilio_account_sid": twilio_account_sid,
                    "twilio_auth_token": twilio_auth_token
                }
                EVENTS_MANAGER.call_phone_numbers[conversation_id] = call_data
                logger.info(
                    f"✅ Successfully stored call data for conversation {conversation_id}: from={from_phone} to={to_phone}"
                )
                logger.info(
                    f"🔑 Stored Twilio credentials for call: SID={twilio_account_sid[:8] if twilio_account_sid else 'None'}..."
                )
                logger.info(
                    f"🗂️ Total stored call data entries: {len(EVENTS_MANAGER.call_phone_numbers)}"
                )

                # Verify storage worked
                verification = EVENTS_MANAGER.call_phone_numbers.get(
                    conversation_id)
                if verification:
                    logger.info(
                        f"✅ Storage verification successful for {conversation_id}"
                    )
                else:
                    logger.error(
                        f"❌ Storage verification failed for {conversation_id}")
            else:
                logger.error(
                    f"❌ Cannot store call data - EVENTS_MANAGER has call_phone_numbers: {hasattr(EVENTS_MANAGER, 'call_phone_numbers')}, to_phone: {to_phone}"
                )
        except Exception as e:
            logger.error(
                f"❌ Exception storing call data for {conversation_id}: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")

        cost_calculator.start_call_tracking(conversation_id,
                                            transcription_provider="deepgram",
                                            synthesis_provider=tts_provider,
                                            llm_provider="openai")

        # Initialize detailed usage tracking
        transcription_model = "nova-2"
        synthesis_model = tts_model
        llm_model = agent_model_name

        usage_tracker.start_call_tracking(
            conversation_id,
            transcription_provider="deepgram",
            transcription_model=transcription_model,
            synthesis_provider=tts_provider,
            synthesis_model=optimized_tts_model or synthesis_model,
            llm_provider="openai",
            llm_model=llm_model)

        # Register conversation mapping for real-time usage tracking
        vocode_usage_hook.register_call(conversation_id, conversation_id)

        logger.info(f"📊 Usage tracking initialized for call {conversation_id}")

        # Store tags in EventsManager for later use during transcript evaluation
        if user_tags or system_tags:
            EVENTS_MANAGER.store_call_tags(conversation_id, user_tags,
                                           system_tags)

        # Store complete voicemail configuration in EventsManager
        EVENTS_MANAGER.store_voicemail_config(conversation_id, voicemail_raw,
                                              voicemail_message, recording_raw)

        # Store transfer configuration in EventsManager
        if transfer_enabled:
            EVENTS_MANAGER.store_transfer_config(conversation_id,
                                                 transfer_enabled,
                                                 transfer_number,
                                                 transfer_message)

        return {
            "status": "success",
            "message": "Outbound call initiated",
            "call_id": conversation_id,
            "to_phone": to_phone,
            "from_phone": from_phone
        }

    except Exception as e:
        logger.error(f"Error in /start_outbound_call: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to initiate call: {str(e)}"
        }


def initialize_configuration():
    """Initialize server configuration - simplified to use JSON payload -> Environment fallback only."""
    logger.info("🔧 Initializing server configuration...")
    logger.info(
        "📋 Configuration Priority: JSON payload → Environment variables")
    logger.info(
        "✅ Configuration system ready - APIs will be loaded directly from JSON payloads"
    )


if __name__ == "__main__":
    # Initialize configuration at server startup
    initialize_configuration()

    logger.info("🚀 Starting VOcode Telephony Server with Action Triggers...")
    logger.info(f"🌐 Application accessible at: https://{BASE_URL}")
    logger.info(f"📡 API endpoint: https://{BASE_URL}/start_outbound_call")
    logger.info(
        "⚡ EventsManager integration enabled for automatic webhook forwarding")

    uvicorn.run(app, host="0.0.0.0", port=3000)
