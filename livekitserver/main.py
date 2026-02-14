from fastapi import FastAPI, HTTPException, Request, Depends, Security
from fastapi.responses import Response
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from livekit import api
from livekit.protocol import sip as proto_sip
from src.models import CallConfig
import logging
import os
import uvicorn
import traceback
from typing import Dict, Optional, List
import secrets
import json
import time
from collections import defaultdict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Suppress DEBUG logs from third-party libraries
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CreateSIPTrunkRequest(BaseModel):
    """Request model for creating a Voxsun SIP trunk"""
    phone_number: str = Field(..., description="The phone number to register (e.g., '+1 (438) 476-0245')")
    voxsun_username: str = Field(..., description="Voxsun SIP username")
    voxsun_password: str = Field(..., description="Voxsun SIP password")
    voxsun_domain: str = Field(default="voxsun.net", description="Voxsun SIP domain")
    voxsun_port: int = Field(default=5060, description="Voxsun SIP port")

    class Config:
        json_schema_extra = {
            "example": {
                "phone_number": "+14384760245",
                "voxsun_username": "VoxSunai@voxsun.com",
                "voxsun_password": "password123",
                "voxsun_domain": "voxsun.net",
                "voxsun_port": 5060
            }
        }


class CreateSIPTrunkResponse(BaseModel):
    """Response model for SIP trunk creation"""
    status: str
    sip_trunk_id: str
    message: str
    trunk_name: str
    registered_number: str
    sip_address: str


class ValidateVoxsunCredentialsRequest(BaseModel):
    """Request model for validating Voxsun credentials"""
    voxsun_username: str = Field(..., description="Voxsun SIP username (e.g., VoxSunai@voxsun.com)")
    voxsun_password: str = Field(..., description="Voxsun SIP password")
    voxsun_domain: str = Field(default="voxsun.net", description="Voxsun SIP domain")
    voxsun_port: int = Field(default=5060, description="Voxsun SIP port")
    
    class Config:
        json_schema_extra = {
            "example": {
                "voxsun_username": "VoxSunai@voxsun.com",
                "voxsun_password": "password123",
                "voxsun_domain": "voxsun.net",
                "voxsun_port": 5060
            }
        }


class ValidateVoxsunCredentialsResponse(BaseModel):
    """Response model for credential validation"""
    status: str  # "valid", "invalid", or "error"
    message: str
    details: Optional[dict] = None


class StartSIPCallRequest(BaseModel):
    """Request model for starting a SIP call to an existing room"""
    room: str = Field(..., description="LiveKit room name (conversation_id)")
    to_phone: str = Field(..., description="Destination phone number in E.164 format")
    from_phone: str = Field(..., description="Caller phone number in E.164 format")
    livekit_sip_trunk_id: str = Field(..., description="LiveKit SIP trunk ID")
    contact_name: str = Field(default="Customer", description="Name of the person being called")
    user_speak_first: bool = Field(default=False, description="If true, user speaks first")
    # Optional: Agent configuration (if provided, will be saved for agent worker)
    agent_initial_message: Optional[str] = Field(None, description="Initial greeting from agent")
    agent_prompt_preamble: Optional[str] = Field(None, description="System prompt for agent")
    tts_provider: Optional[str] = Field(None, description="TTS provider (eleven_labs, openai, etc.)")
    tts_voice_id: Optional[str] = Field(None, description="TTS voice ID")
    stt_provider: Optional[str] = Field(None, description="STT provider (deepgram, openai, etc.)")
    stt_model: Optional[str] = Field(None, description="STT model")
    llm_model: Optional[str] = Field(None, description="LLM model name")
    llm_api_key: Optional[str] = Field(None, description="LLM API key")
    voicemail_detection: Optional[bool] = Field(None, description="Enable voicemail detection")
    voicemail_message: Optional[str] = Field(None, description="Message to leave on voicemail")
    recording: Optional[bool] = Field(None, description="Enable call recording")

    class Config:
        json_schema_extra = {
            "example": {
                "room": "voxsun-+15146676791-360a1b17",
                "to_phone": "+15146676791",
                "from_phone": "+14384760245",
                "livekit_sip_trunk_id": "ST_jcjARCs8wgzw",
                "contact_name": "John Doe",
                "user_speak_first": False,
                "agent_initial_message": "Hello, how can I help you today?",
                "agent_prompt_preamble": "You are a helpful customer service assistant.",
                "tts_provider": "eleven_labs",
                "tts_voice_id": "EXAVITQu4vr4xnSDxMaL",
                "stt_provider": "deepgram",
                "stt_model": "nova-2",
                "llm_model": "gpt-4o-mini",
                "voicemail_detection": False,
                "recording": True
            }
        }

    class Config:
        json_schema_extra = {
            "example": {
                "room": "voxsun-+14384760245-a1b2c3d4",
                "to_phone": "+14384760245",
                "from_phone": "+1555123456",
                "livekit_sip_trunk_id": "voxsun_trunk_12345",
                "contact_name": "John Doe",
                "user_speak_first": False
            }
        }


class StartSIPCallResponse(BaseModel):
    """Response model for SIP call initiation"""
    status: str
    message: str
    room: str
    to_phone: str
    from_phone: str
    participant_id: str
    call_id: str


app = FastAPI(title="LiveKit Telephonic Agent Server")

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================
API_KEY = os.getenv("API_KEY", "")  # Your secret API key
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

# Rate limiting configuration
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))  # Requests per window
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # Window in seconds
rate_limit_store: Dict[str, list] = defaultdict(list)


async def verify_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)) -> str:
    """
    Verify the API key from request header.
    Returns the API key if valid, raises HTTPException if invalid.
    """
    if not API_KEY:
        # If no API key is configured, log warning but allow (for development)
        logger.warning("⚠️ NO API_KEY configured! Server is UNSECURED. Set API_KEY environment variable.")
        return "no-auth"
    
    if not api_key:
        logger.warning("🚫 Request rejected: Missing X-API-Key header")
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Missing API Key",
                "message": "X-API-Key header is required",
                "hint": "Add 'X-API-Key: your-api-key' to request headers"
            }
        )
    
    if api_key != API_KEY:
        logger.warning(f"🚫 Request rejected: Invalid API key attempted")
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Invalid API Key",
                "message": "The provided API key is not valid"
            }
        )
    
    return api_key


async def check_rate_limit(request: Request):
    """
    Simple rate limiting based on client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Clean old entries
    rate_limit_store[client_ip] = [
        t for t in rate_limit_store[client_ip] 
        if current_time - t < RATE_LIMIT_WINDOW
    ]
    
    # Check limit
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        logger.warning(f"🚫 Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate Limit Exceeded",
                "message": f"Too many requests. Limit: {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds",
                "retry_after": RATE_LIMIT_WINDOW
            }
        )
    
    # Record this request
    rate_limit_store[client_ip].append(current_time)


# ============================================================================
# LIVEKIT CONFIGURATION
# ============================================================================
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://your-livekit-server.com")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
SERVER_URL = os.getenv("SERVER_URL", "https://your-server.com")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
CONFIG_FILE = "/tmp/call_configs.json"

active_calls: Dict[str, CallConfig] = {}


def save_call_config(room_name: str, config: CallConfig):
    """Save call configuration to file for agent worker to read"""
    try:
        configs = {}
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                configs = json.load(f)
        configs[room_name] = config.dict()
        with open(CONFIG_FILE, 'w') as f:
            json.dump(configs, f)
    except Exception as e:
        logger.error(f"Error saving config: {e}")


async def validate_phone_on_trunk(call_config: CallConfig, livekit_api: api.LiveKitAPI) -> dict:
    """
    Validate that from_phone is registered on the LiveKit SIP trunk
    Returns: dict with 'valid' (bool) and 'message' (str) keys
    """
    try:
        trunk_id = call_config.livekit_sip_trunk_id
        
        # List all outbound trunks and find the one we're looking for
        try:
            trunk_list_response = await livekit_api.sip.list_sip_outbound_trunk(
                api.ListSIPOutboundTrunkRequest()
            )
            
            # Find the specific trunk by ID
            trunk_info = None
            for trunk in trunk_list_response.items:
                if trunk.sip_trunk_id == trunk_id:
                    trunk_info = trunk
                    break
            
            if not trunk_info:
                return {
                    "valid": False,
                    "code": "TRUNK_NOT_FOUND",
                    "message": f"LiveKit trunk {trunk_id} does not exist"
                }
            
            # Extract registered numbers from trunk info
            registered_numbers = list(trunk_info.numbers) if trunk_info.numbers else []
            
            logger.info(f"Registered numbers on trunk {trunk_id}: {registered_numbers}")
            
            # If trunk has no numbers configured (empty or wildcard), allow any number
            if not registered_numbers or registered_numbers == ["*"]:
                logger.info(f"✅ Trunk {trunk_id} allows all numbers (wildcard configuration)")
                return {
                    "valid": True,
                    "message": "Trunk configured for wildcard numbers"
                }
            
            # Check if from_phone exists
            if call_config.from_phone not in registered_numbers:
                return {
                    "valid": False,
                    "code": "NUMBER_NOT_REGISTERED",
                    "message": f"{call_config.from_phone} is not registered on trunk {trunk_id}. Registered numbers: {', '.join(registered_numbers)}"
                }
            
            logger.info(f"✅ Validation passed: {call_config.from_phone} is registered on trunk {trunk_id}")
            return {
                "valid": True,
                "message": "Phone number validated successfully"
            }
            
        except api.TwirpError as trunk_error:
            # API error
            error_str = str(trunk_error)
            logger.error(f"LiveKit API error: {error_str}")
            if "not found" in error_str.lower() or "does not exist" in error_str.lower():
                return {
                    "valid": False,
                    "code": "TRUNK_NOT_FOUND",
                    "message": f"LiveKit trunk {trunk_id} does not exist or is not accessible"
                }
            raise trunk_error
            
    except Exception as e:
        logger.error(f"Validation error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "valid": False,
            "code": "VALIDATION_FAILED",
            "message": f"Failed to validate trunk: {str(e)}"
        }


@app.get("/")
async def root():
    """Public endpoint - shows server info"""
    return {
        "service": "LiveKit Telephonic Agent Server",
        "status": "running",
        "version": "1.3.0",
        "security": "API Key Required for protected endpoints",
        "supported_tts_providers": ["eleven_labs", "openai", "smallest_ai"],
        "supported_stt_providers": ["deepgram", "openai"],
        "supported_stt_models": {
            "deepgram": ["nova-2", "nova", "enhanced"],
            "openai": ["gpt-4o-mini-transcribe"]
        },
        "features": ["real-time-webhooks", "call-recording", "knowledge-base-rag", "api-key-auth", "rate-limiting"],
        "endpoints": {
            "start_call": "/start_outbound_call (🔒 protected)",
            "health": "/health"
        },
        "authentication": {
            "header": "X-API-Key",
            "example": "curl -H 'X-API-Key: your-key' -X POST /start_outbound_call"
        }
    }


@app.get("/health")
@app.head("/health")
async def health():
    return {"status": "healthy"}


@app.post("/create_sip_trunk")
async def create_sip_trunk(
    request_data: CreateSIPTrunkRequest,
    api_key: str = Depends(verify_api_key),
    _rate_limit: None = Depends(check_rate_limit)
) -> CreateSIPTrunkResponse:
    """
    🔒 PROTECTED ENDPOINT - Requires X-API-Key header
    
    Create a Voxsun SIP outbound trunk in LiveKit
    
    Required headers:
    - X-API-Key: Your API key
    
    Returns:
    - sip_trunk_id: The LiveKit SIP trunk ID to use for calls
    """
    livekit_api_client = None
    try:
        logger.info("=" * 80)
        logger.info("📞 SIP TRUNK CREATION REQUEST RECEIVED")
        logger.info("=" * 80)
        logger.info(f"Creating SIP trunk for: {request_data.phone_number}")
        logger.info(f"Domain: {request_data.voxsun_domain}:{request_data.voxsun_port}")
        
        livekit_api_client = api.LiveKitAPI(
            url=LIVEKIT_URL,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        
        # Create the SIP trunk with port included in address
        # LiveKit requires address format: "host:port"
        sip_address = f"{request_data.voxsun_domain}:{request_data.voxsun_port}"
        logger.info(f"📡 SIP Address (with port): {sip_address}")
        logger.info(f"🔐 Auth Username: {request_data.voxsun_username}")
        logger.info(f"🔐 Auth Password: {'*' * 8}")  # Don't log actual password
        
        trunk = proto_sip.SIPOutboundTrunkInfo(
            name=f"Voxsun Trunk",
            address=sip_address,
            numbers=[request_data.phone_number],
            auth_username=request_data.voxsun_username,
            auth_password=request_data.voxsun_password,
        )
        
        create_req = proto_sip.CreateSIPOutboundTrunkRequest(trunk=trunk)
        result = await livekit_api_client.sip.create_outbound_trunk(create_req)
        
        logger.info("=" * 80)
        logger.info("✅ SIP TRUNK CREATED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"Trunk ID: {result.sip_trunk_id}")
        logger.info(f"Trunk Name: {result.name}")
        logger.info(f"SIP Address: {result.address}")
        logger.info(f"Registered Numbers: {', '.join(result.numbers)}")
        logger.info("=" * 80)
        
        return CreateSIPTrunkResponse(
            status="success",
            sip_trunk_id=result.sip_trunk_id,
            message=f"SIP trunk created successfully for {request_data.phone_number}",
            trunk_name=result.name,
            registered_number=request_data.phone_number,
            sip_address=result.address
        )
        
    except api.TwirpError as e:
        error_msg = f"LiveKit API error: {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "LiveKit API Error",
                "message": error_msg,
                "phone_number": request_data.phone_number
            }
        )
    
    except Exception as e:
        error_msg = f"Failed to create SIP trunk: {str(e)}"
        logger.error(f"❌ {error_msg}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                "error": "SIP Trunk Creation Failed",
                "message": error_msg,
                "phone_number": request_data.phone_number
            }
        )
    
    finally:
        if livekit_api_client:
            await livekit_api_client.aclose()

@app.post("/start_sip_call")
async def start_sip_call(
    request_data: StartSIPCallRequest,
    api_key: str = Depends(verify_api_key),
    _rate_limit: None = Depends(check_rate_limit)
):
    """
    🔒 PROTECTED ENDPOINT - Requires X-API-Key header
    
    Start a SIP call to an existing LiveKit room (for Voxsun integration).
    This is a simpler endpoint for SIP-only calls that don't require full Vocode setup.
    The room must already exist (typically created by orchestrates).
    """
    livekit_api_client = None
    try:
        logger.info("=" * 80)
        logger.info("📞 STARTING SIP CALL")
        logger.info("=" * 80)
        logger.info(f"Room: {request_data.room}")
        logger.info(f"To Phone: {request_data.to_phone}")
        logger.info(f"From Phone: {request_data.from_phone}")
        logger.info(f"Contact Name: {request_data.contact_name}")
        logger.info(f"SIP Trunk ID: {request_data.livekit_sip_trunk_id}")
        if request_data.agent_initial_message:
            logger.info(f"Agent Initial Message: {request_data.agent_initial_message[:50]}...")
        logger.info("=" * 80)
        
        livekit_api_client = api.LiveKitAPI(
            url=LIVEKIT_URL,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        
        # If agent config is provided, save it for the agent worker to use
        if request_data.agent_initial_message:
            try:
                logger.info(f"💾 Saving call configuration for room: {request_data.room}")
                
                # Create a minimal CallConfig with provided agent configuration
                from src.models import TTSConfig, STTConfig, ModelConfig
                
                # Use provided config or defaults
                tts_config = TTSConfig(
                    provider_name=request_data.tts_provider or "eleven_labs",
                    voice_id=request_data.tts_voice_id or "EXAVITQu4vr4xnSDxMaL",
                    api_key=os.getenv("ELEVENLABS_API_KEY", "")
                )
                
                stt_config = STTConfig(
                    provider_name=request_data.stt_provider or "deepgram",
                    model=request_data.stt_model or "nova-2",
                    api_key=os.getenv("DEEPGRAM_API_KEY", "")
                )
                
                model_config = ModelConfig(
                    name=request_data.llm_model or "gpt-4o-mini",
                    api_key=request_data.llm_api_key or os.getenv("OPENAI_API_KEY", "")
                )
                
                call_config = CallConfig(
                    to_phone=request_data.to_phone,
                    from_phone=request_data.from_phone,
                    twilio_account_sid="sip-only",
                    twilio_auth_token="sip-only",
                    contact_name=request_data.contact_name,
                    agent_initial_message=request_data.agent_initial_message,
                    user_speak_first=request_data.user_speak_first,
                    agent_prompt_preamble=request_data.agent_prompt_preamble or "You are a helpful assistant.",
                    agent_generate_responses=True,
                    tts=tts_config,
                    stt=stt_config,
                    model=model_config,
                    voicemail=request_data.voicemail_detection or False,
                    voicemail_message=request_data.voicemail_message,
                    temperature=0.7,
                    language="en",
                    agent_speed=1.0,
                    webhook_url="",
                    use_knowledge_base=False,
                    recording=request_data.recording or False,
                    livekit_sip_trunk_id=request_data.livekit_sip_trunk_id,
                    keyboard_sound=False
                )
                
                save_call_config(request_data.room, call_config)
                logger.info(f"✅ Call configuration saved for room: {request_data.room}")
            except Exception as e:
                logger.error(f"⚠️ Failed to save call config: {e}")
                # Continue anyway - agent worker will use fallback metadata
        
        # Step 1: Explicitly create the room FIRST
        # The room MUST exist before creating agent dispatch and SIP participant.
        # Without this, there's a race condition where the SIP participant tries
        # to join a room that doesn't exist yet.
        try:
            logger.info(f"🏗️ Creating room: {request_data.room}")
            room = await livekit_api_client.room.create_room(
                api.CreateRoomRequest(name=request_data.room)
            )
            logger.info(f"✅ Room created: {room.name}")
        except Exception as e:
            # Room might already exist (e.g., from a previous attempt) - that's OK
            logger.warning(f"⚠️ Room creation returned: {e} (may already exist, continuing)")
        
        # Step 2: Create agent dispatch with metadata
        metadata = json.dumps({
            "phone_number": request_data.to_phone,
            "contact_name": request_data.contact_name,
            "user_speak_first": request_data.user_speak_first,
        })
        
        try:
            logger.info(f"📤 Creating agent dispatch for room: {request_data.room}")
            await livekit_api_client.agent_dispatch.create_dispatch(
                api.CreateAgentDispatchRequest(
                    room=request_data.room,
                    agent_name="voice-assistant",
                    metadata=metadata,
                )
            )
            logger.info(f"✅ Agent dispatch created for room: {request_data.room}")
        except Exception as e:
            logger.error(f"⚠️ Failed to create agent dispatch: {e}")
            # Continue anyway - the SIP participant can still be created
        
        # Step 3: Create SIP participant that joins the room and dials the number
        try:
            logger.info("=" * 80)
            logger.info("📞 Creating SIP Participant with parameters:")
            logger.info(f"   Room: {request_data.room}")
            logger.info(f"   Trunk ID: {request_data.livekit_sip_trunk_id}")
            logger.info(f"   SIP Call To: {request_data.to_phone}")
            logger.info(f"   Participant Identity (From): {request_data.from_phone}")
            logger.info(f"   Participant Name: {request_data.contact_name}")
            logger.info(f"   wait_until_answered: True")
            logger.info("=" * 80)
            
            sip_participant = await livekit_api_client.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=request_data.room,
                    sip_trunk_id=request_data.livekit_sip_trunk_id,
                    sip_call_to=request_data.to_phone,
                    participant_identity=request_data.from_phone,
                    participant_name=request_data.contact_name,
                    dtmf="",
                    play_ringtone=True,
                    hide_phone_number=False,
                    # CRITICAL: Wait for the call to be answered before returning.
                    # Without this, the SIP participant is created and immediately
                    # disconnects because the API returns before the call is established.
                    # See: https://docs.livekit.io/sip/making-calls/
                    wait_until_answered=True,
                )
            )
            
            logger.info(f"✅ SIP Participant created & call answered!")
            logger.info(f"   Participant ID: {sip_participant.participant_identity}")
            logger.info(f"   SIP Call ID: {sip_participant.sip_call_id}")
            logger.info("=" * 80)
            
            return StartSIPCallResponse(
                status="success",
                message="SIP call initiated successfully",
                room=request_data.room,
                to_phone=request_data.to_phone,
                from_phone=request_data.from_phone,
                participant_id=sip_participant.participant_identity,
                call_id=sip_participant.sip_call_id,
            )
            
        except api.TwirpError as e:
            error_code = e.metadata.get("sip_status_code", "UNKNOWN") if hasattr(e, 'metadata') else "UNKNOWN"
            error_message = str(e)
            
            # Log detailed error information for debugging
            logger.error(f"❌ TwirpError received: {error_message}")
            logger.error(f"   Error Code: {error_code}")
            if hasattr(e, 'metadata'):
                logger.error(f"   Error Metadata: {e.metadata}")
            logger.error(f"   Error Type: {type(e).__name__}")
            
            # Check for specific error conditions
            if "auth" in error_message.lower() or "401" in str(error_code) or "403" in str(error_code):
                error_msg = f"❌ SIP Authentication Failed: Check Voxsun credentials (username/password/domain). SIP Status: {error_code}"
            elif "not found" in error_message.lower() or error_code in ["404", "480"]:
                error_msg = f"❌ Room or SIP Trunk not found. Verify trunk ID: {request_data.livekit_sip_trunk_id}"
            elif "trunk" in error_message.lower():
                error_msg = f"❌ SIP Trunk '{request_data.livekit_sip_trunk_id}' is invalid or unreachable"
            elif "retry" in error_message.lower():
                error_msg = f"❌ SIP Gateway Retry Limit Exceeded: {error_message}. This usually indicates authentication failure or unreachable gateway."
            else:
                error_msg = f"❌ SIP Error: {error_message} (Code: {error_code})"
            
            logger.error(f"{error_msg}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "SIP Call Failed",
                    "message": error_msg,
                    "sip_status": error_code,
                    "room": request_data.room,
                    "trunk_id": request_data.livekit_sip_trunk_id
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"❌ {error_msg}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "message": error_msg,
                "room": request_data.room
            }
        )
    
    finally:
        if livekit_api_client:
            await livekit_api_client.aclose()


@app.post("/start_outbound_call")
async def start_outbound_call(
    call_config: CallConfig,
    request: Request,
    api_key: str = Depends(verify_api_key),
    _rate_limit: None = Depends(check_rate_limit)
):
    """
    🔒 PROTECTED ENDPOINT - Requires X-API-Key header
    
    Initiate an outbound call with AI agent using LiveKit SIP
    """
    livekit_api_client = None
    try:
        # Log the complete JSON request
        logger.info("=" * 80)
        logger.info("📞 OUTBOUND CALL REQUEST RECEIVED")
        logger.info("=" * 80)
        logger.info(f"Full JSON Request:\n{json.dumps(call_config.dict(), indent=2)}")
        logger.info("=" * 80)
        
        logger.info(f"Initiating call to {call_config.to_phone}")
        
        room_name = f"call-{secrets.token_urlsafe(16)}"
        
        livekit_api_client = api.LiveKitAPI(
            url=LIVEKIT_URL,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        
        try:
            room = await livekit_api_client.room.create_room(
                api.CreateRoomRequest(name=room_name, empty_timeout=300)
            )
            logger.info(f"Created LiveKit room: {room.name}")
        except Exception as e:
            logger.error(f"Error creating room: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")
        
        # Use webhook URL from secrets if not provided in request
        if not call_config.webhook_url and WEBHOOK_URL:
            call_config.webhook_url = WEBHOOK_URL
        
        save_call_config(room_name, call_config)
        active_calls[room_name] = call_config
        
        metadata = json.dumps({
            "phone_number": call_config.to_phone,
            "contact_name": call_config.contact_name,
            "user_speak_first": call_config.user_speak_first,
        })
        
        try:
            await livekit_api_client.agent_dispatch.create_dispatch(
                api.CreateAgentDispatchRequest(
                    room=room_name,
                    agent_name="voice-assistant",
                    metadata=metadata,
                )
            )
            logger.info(f"Dispatched agent to room: {room_name}")
        except Exception as e:
            logger.error(f"Error dispatching agent: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to dispatch agent: {str(e)}")
        
        if not call_config.livekit_sip_trunk_id:
            raise HTTPException(
                status_code=400, 
                detail="livekit_sip_trunk_id is required. Please provide a valid SIP trunk ID in the request."
            )
        
        # PRE-FLIGHT VALIDATION: Check if from_phone is registered on the trunk
        logger.info(f"🔍 Validating {call_config.from_phone} on LiveKit trunk {call_config.livekit_sip_trunk_id}")
        validation_result = await validate_phone_on_trunk(call_config, livekit_api_client)
        
        if not validation_result.get("valid"):
            error_code = validation_result.get("code", "VALIDATION_FAILED")
            error_message = validation_result.get("message", "Validation failed")
            logger.error(f"❌ Validation failed: {error_message}")
            
            return {
                "status": "error",
                "code": error_code,
                "message": error_message,
                "from_phone": call_config.from_phone,
                "trunk_id": call_config.livekit_sip_trunk_id
            }
        
        logger.info(f"✅ Validation passed - proceeding with call")
        
        try:
            sip_participant = await livekit_api_client.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=room_name,
                    sip_trunk_id=call_config.livekit_sip_trunk_id,
                    sip_call_to=call_config.to_phone,
                    participant_identity=call_config.from_phone,
                    participant_name=call_config.contact_name,
                    dtmf="",
                    play_ringtone=True,
                    hide_phone_number=False,
                    wait_until_answered=True,
                )
            )
            
            logger.info(f"Created SIP participant: {sip_participant.participant_identity}")
            
            return {
                "status": "success",
                "message": "Call initiated successfully via LiveKit SIP",
                "room_name": room_name,
                "to_phone": call_config.to_phone,
                "from_number": call_config.from_phone,
                "participant_id": sip_participant.participant_identity,
                "call_id": sip_participant.sip_call_id,
            }
            
        except api.TwirpError as e:
            error_msg = (
                f"SIP error: {e.message}, "
                f"SIP status: {e.metadata.get('sip_status_code')} "
                f"{e.metadata.get('sip_status')}"
            )
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if livekit_api_client:
            await livekit_api_client.aclose()


@app.post("/twilio/callback/{room_name}/status")
async def twilio_status_callback(room_name: str, request: Request):
    """Handle call status updates (legacy endpoint for backward compatibility)"""
    try:
        form_data = await request.form()
        call_status = form_data.get("CallStatus")
        logger.info(f"Call status for {room_name}: {call_status}")
        
        if call_status in ["completed", "failed", "busy", "no-answer"]:
            if room_name in active_calls:
                del active_calls[room_name]
                logger.info(f"Removed call {room_name} from active calls")
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Error in status callback: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    logger.info("Starting LiveKit Telephonic Agent Server")
    logger.info("=" * 70)
    logger.info("🔒 SECURITY STATUS:")
    if API_KEY:
        logger.info("  ✅ API Key authentication ENABLED")
        logger.info(f"  ✅ Rate limiting: {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW}s")
    else:
        logger.warning("  ⚠️ API Key NOT SET - Server is UNSECURED!")
        logger.warning("  ⚠️ Set API_KEY environment variable to secure your server")
    logger.info("=" * 70)
    logger.info("IMPORTANT: This server uses LiveKit SIP integration")
    logger.info("You MUST configure:")
    logger.info("  1. Set API_KEY environment variable for security")
    logger.info("  2. Pass livekit_sip_trunk_id in JSON request")
    logger.info("  3. Run agent worker: python agent_worker.py dev")
    logger.info("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=5000)
