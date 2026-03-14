import asyncio
import json
import logging
import os
import sys
from typing import Optional
from datetime import datetime

# Add workspace to Python path for direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from livekit.agents import (
    Agent,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.plugins import openai, silero

from src.models import CallConfig, TTSConfig, STTConfig, ModelConfig
from src.knowledge_base import KnowledgeBase

from lib.i18n import Translator
from lib.prompts import PromptBuilder
from lib.providers import TTSFactory, STTFactory
from lib.tools import ToolBuilder

logging.basicConfig(level=logging.INFO)

# Suppress DEBUG logs from third-party libraries
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.INFO)

logger = logging.getLogger(__name__)

CONFIG_FILE = "/tmp/call_configs.json"


def load_call_config(room_name: str) -> Optional[CallConfig]:
    """Load call configuration from the shared JSON file."""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r") as f:
                configs = json.load(f)
                if room_name in configs:
                    return CallConfig(**configs[room_name])
    except Exception as e:
        logger.error(f"Error loading config: {e}")
    return None


class VoiceAssistant(Agent):
    """Voice Assistant Agent for handling phone calls.
    """

    def __init__(
        self,
        call_config: CallConfig,
        room_name: str = "",
        participant_identity: str = "",
        *,
        session_ref: Optional[dict] = None,
        end_call_flag: Optional[dict] = None,
        bg_audio_ref: Optional[dict] = None,
    ) -> None:
        self.call_config = call_config
        self.room_name = room_name
        self.participant_identity = participant_identity

        # Mutable refs shared with tools
        self._session_ref = session_ref or {"session": None}
        self._end_call_flag = end_call_flag or {"scheduled": False}
        self._bg_audio_ref = bg_audio_ref or {"player": None, "started": False}

        # Resolve language
        self.language = Translator._resolve(call_config.language)
        self.translator = Translator(self.language)

        # Set provider API keys in environment
        os.environ["OPENAI_API_KEY"] = call_config.model.api_key
        os.environ["ELEVEN_API_KEY"] = call_config.tts.api_key

        # Prompt
        customer_first_name = (
            call_config.contact_name.split()[0]
            if call_config.contact_name
            else "Customer"
        )
        full_prompt = PromptBuilder(self.language).build(
            customer_name=customer_first_name,
            agent_instructions=call_config.agent_prompt_preamble,
            current_date=call_config.current_date,
            current_time=call_config.current_time,
            previous_call_summary=call_config.previous_call_summary,
            voicemail_enabled=call_config.voicemail,
        )

        # TTS / STT
        tts_instance = TTSFactory.create(call_config.tts, self.language)
        stt_instance = STTFactory.create(
            call_config.stt,
            self.language,
            fallback_openai_key=call_config.model.api_key,
        )

        #Knowledge base
        self.kb = None
        if call_config.use_knowledge_base:
            self.kb = KnowledgeBase(openai_api_key=call_config.model.api_key)
            if self.kb.enabled:
                logger.info("Knowledge base enabled for this call")

        # Tools
        tools = (
            ToolBuilder(call_config, self.language)
            .with_voicemail()
            .with_knowledge_base(self.kb, self._bg_audio_ref)
            .with_call_transfer(room_name, participant_identity, self._session_ref)
            .with_end_call(room_name, self._end_call_flag)
            .with_vad_email(self._session_ref)
            .build()
        )

        logger.info(
            f"Agent initialized for customer: {customer_first_name}, "
            f"language: {self.language}"
        )

        super().__init__(
            instructions=full_prompt,
            stt=stt_instance,
            llm=openai.LLM(
                model=call_config.model.name,
                temperature=call_config.temperature,
            ),
            tts=tts_instance,
            tools=tools,
        )


def prewarm(proc: JobProcess):
    """Prewarm function to load VAD model"""
    proc.userdata["vad"] = silero.VAD.load()


async def analyze_tags_with_llm(
        full_transcript: str, user_tags: list[str], system_tags: list[str],
        call_duration_seconds: int, openai_api_key: str, current_utc_time: str
) -> tuple[list[str], list[str], bool, str | None]:
    """
    Use LLM to analyze which tags match the conversation content and detect callback requests
    
    Args:
        full_transcript: Full conversation transcript
        user_tags: List of user-defined tags to check
        system_tags: List of system-defined tags to check
        call_duration_seconds: Call duration in seconds
        openai_api_key: OpenAI API key
        current_utc_time: Current UTC time for callback time calculation
    
    Returns:
        Tuple of (user_tags_found, system_tags_found, callback_requested, callback_time)
    """
    # Skip if no tags to analyze
    if not user_tags and not system_tags:
        return [], [], False, None

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=openai_api_key)

        # Build analysis prompt
        prompt = f"""You are analyzing a phone conversation transcript to determine which tags are relevant and if a callback was requested.

Current UTC Time: {current_utc_time}
Call Duration: {call_duration_seconds} seconds ({call_duration_seconds // 60} minutes {call_duration_seconds % 60} seconds)

Transcript:
{full_transcript}

User Tags (check if the conversation topic/context matches):
{json.dumps(user_tags, indent=2)}

System Tags (check if the condition described in the tag is met):
{json.dumps(system_tags, indent=2)}

Analyze the transcript and determine:
1. Which tags apply (for user tags check conversation topics, for system tags check conditions)
2. Please make sure that user has asked for callback from agent that is user is busy or if he says to give a call afterwards only then callback_requested should be true not for the agents services.
3. If callback requested, extract the preferred time and round to nearest 15-minute interval (:00, :15, :30, or :45). Also make sure to ask which time zone is user talking about and then convert that time zone to UTC and then send UTC time zone in callback_time.

Respond with ONLY a JSON object in this exact format:
{{
  "user_tags_found": ["tag1", "tag2"],
  "system_tags_found": ["tag3"],
  "callback_requested": true,
  "callback_time": "2025-11-05T14:30:00Z"
}}

IMPORTANT:
- callback_time must be in UTC ISO format (YYYY-MM-DDTHH:MM:SSZ) with minutes at :00, :15, :30, or :45 only
- If no specific time mentioned, ask for timing or if no time he gives then suggest him reasonable time (e.g., next business day at 10:00 AM UTC)
- If no callback requested, set callback_requested to false and callback_time to null"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role":
                "system",
                "content":
                "You are a precise conversation analyst. Respond only with valid JSON."
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=0.1,
            max_tokens=500)

        # Parse response with proper None checking
        message_content = response.choices[0].message.content
        if not message_content:
            logger.error("❌ OpenAI returned empty content for tag analysis")
            return [], [], False, None

        result_text = message_content.strip()

        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split(
                "```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()

        result = json.loads(result_text)

        user_tags_found = result.get("user_tags_found", [])
        system_tags_found = result.get("system_tags_found", [])
        callback_requested = result.get("callback_requested", False)
        callback_time = result.get("callback_time", None)

        logger.info(
            f"🏷️  Tag analysis: user={user_tags_found}, system={system_tags_found}, callback={callback_requested}, time={callback_time}"
        )

        return user_tags_found, system_tags_found, callback_requested, callback_time

    except Exception as e:
        logger.error(f"❌ Failed to analyze tags with LLM: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return [], [], False, None


async def entrypoint(ctx: JobContext):
    """Agent entrypoint — delegates to CallSession for the full lifecycle."""
    logger.info(f"Agent starting for room: {ctx.room.name}")

    call_config = load_call_config(ctx.room.name)
    if not call_config:
        call_config = _build_fallback_config(ctx)

    from lib.session import CallSession
    session = CallSession(ctx, call_config)
    await session.run()


def _build_fallback_config(ctx: JobContext) -> CallConfig:
    """Create a sensible default CallConfig from job metadata."""
    logger.warning(f"No config found for room {ctx.room.name}")
    try:
        metadata = json.loads(ctx.job.metadata) if ctx.job.metadata else {}
        phone_number = metadata.get("phone_number")
        contact_name = metadata.get("contact_name", "User")
        user_speak_first = metadata.get("user_speak_first", True)

        return CallConfig(
            to_phone=phone_number or "+1234567890",
            from_phone="+0987654321",
            twilio_account_sid="default",
            twilio_auth_token="default",
            contact_name=contact_name,
            agent_initial_message=f"Hello {contact_name}! How can I help you today?",
            agent_prompt_preamble="You are a helpful assistant.",
            voicemail_message="Please call back",
            user_speak_first=user_speak_first,
            webhook_url=None,
            previous_call_summary=None,
            current_date=None,
            current_time=None,
            enable_call_transfer=False,
            transfer_phone_number=None,
            livekit_sip_trunk_id=os.getenv("LIVEKIT_SIP_TRUNK_ID", ""),
            tts=TTSConfig(
                provider_name="eleven_labs",
                voice_id="21m00Tcm4TlvDq8ikWAM",
                model_id="eleven_turbo_v2_5",
                api_key=os.getenv("ELEVEN_API_KEY", ""),
            ),
            stt=STTConfig(
                provider_name="deepgram",
                model="nova-2",
                api_key=os.getenv("DEEPGRAM_API_KEY", ""),
            ),
            model=ModelConfig(
                name="gpt-4o-mini",
                api_key=os.getenv("OPENAI_API_KEY", ""),
            ),
        )
    except Exception as e:
        logger.error(f"Error parsing metadata: {e}")
        raise


# Register shutdown callback to send webhooks before process exits

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ), )
