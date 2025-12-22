from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from livekit import api
import logging
import os

logger = logging.getLogger(__name__)


class TwilioHandler:
    """Handles Twilio SIP integration for outbound calls"""
    
    def __init__(self, account_sid: str, auth_token: str, livekit_url: str, livekit_api_key: str, livekit_api_secret: str):
        self.client = Client(account_sid, auth_token)
        self.account_sid = account_sid
        self.livekit_url = livekit_url
        self.livekit_api_key = livekit_api_key
        self.livekit_api_secret = livekit_api_secret
    
    async def create_livekit_room(self, room_name: str) -> str:
        """Create a LiveKit room for the call"""
        livekit_api = api.LiveKitAPI(
            url=self.livekit_url,
            api_key=self.livekit_api_key,
            api_secret=self.livekit_api_secret,
        )
        
        try:
            room = await livekit_api.room.create_room(
                api.CreateRoomRequest(name=room_name)
            )
            logger.info(f"Created LiveKit room: {room.name}")
            return room.name
        except Exception as e:
            logger.error(f"Error creating LiveKit room: {e}")
            raise
    
    async def initiate_call(self, from_phone: str, to_phone: str, room_name: str, callback_url: str):
        """Initiate an outbound call via Twilio"""
        try:
            call = self.client.calls.create(
                to=to_phone,
                from_=from_phone,
                url=callback_url,
                status_callback=f"{callback_url}/status",
                status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
                machine_detection='DetectMessageEnd',
                async_amd=True,
                async_amd_status_callback=f"{callback_url}/amd",
                timeout=60,
            )
            
            logger.info(f"Call initiated: {call.sid} to {to_phone}")
            return call.sid
        except Exception as e:
            logger.error(f"Error initiating call: {e}")
            raise
    
    def generate_twiml_response(self, room_name: str, livekit_token: str) -> str:
        """Generate TwiML response to connect call to LiveKit"""
        response = VoiceResponse()
        connect = Connect()
        stream = connect.stream(
            url=f"wss://{self.livekit_url}/ws?access_token={livekit_token}"
        )
        response.append(connect)
        return str(response)
