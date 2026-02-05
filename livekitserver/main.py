from fastapi import FastAPI, HTTPException, Request, Depends, Security
from fastapi.responses import Response
from fastapi.security import APIKeyHeader
from livekit import api
from src.models import CallConfig
import logging
import os
import uvicorn
from typing import Dict, Optional
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
