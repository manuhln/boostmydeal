#!/usr/bin/env python3
"""
Test script to make a call using the Voxsun trunk
"""
import requests
import json
import os

# Test call configuration
test_call = {
    "to_phone": "+918504088123",
    "from_phone": "+14384760245",  # Voxsun number
    "contact_name": "Test User",
    "agent_initial_message": "Hello! This is a test call from your AI assistant. How can I help you today?",
    "agent_prompt_preamble": "You are a helpful AI assistant making a test call. Be polite and professional.",
    "voicemail_message": "Hello, this was a test call. Please call back if needed.",
    "user_speak_first": False,
    "webhook_url": None,
    "previous_call_summary": None,
    "current_date": None,
    "current_time": None,
    "enable_call_transfer": False,
    "transfer_phone_number": None,
    "language": "en",
    "agent_speed": 1.0,
    "recording": False,
    "knowledge_base_enabled": False,
    "knowledge_base_index_name": None,
    "knowledge_base_top_k": 3,
    "tts": {
        "provider_name": "eleven_labs",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "model_id": "eleven_turbo_v2_5",
        "api_key": os.getenv("ELEVEN_API_KEY", "")
    },
    "stt": {
        "provider_name": "deepgram",
        "model": "nova-2",
        "api_key": os.getenv("DEEPGRAM_API_KEY", "")
    },
    "model": {
        "name": "gpt-4o-mini",
        "api_key": os.getenv("OPENAI_API_KEY", "")
    },
    "twilio_account_sid": "not_needed_for_livekit",
    "twilio_auth_token": "not_needed_for_livekit"
}

# Update environment to use Voxsun trunk
os.environ["LIVEKIT_SIP_TRUNK_ID"] = "ST_yKBcCX3ekUZy"

print("🔧 Test Call Configuration:")
print(f"📞 Calling: {test_call['to_phone']}")
print(f"📱 From: {test_call['from_phone']} (Voxsun)")
print(f"🎯 SIP Trunk ID: ST_yKBcCX3ekUZy")
print(f"👤 User speaks first: {test_call['user_speak_first']}")
print("\n" + "="*60)

# Make the API call
try:
    response = requests.post(
        "http://0.0.0.0:5000/start_outbound_call",
        json=test_call,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ Call initiated successfully!")
        print(f"📋 Room: {result.get('room_name')}")
        print(f"📞 Call SID: {result.get('call_sid')}")
        print(f"✨ Status: {result.get('status')}")
        print("\n💡 The call is now connecting to +918504088123 via Voxsun trunk...")
        print("   The agent will greet the user when they answer.")
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(f"Response: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("\n❌ Error: Could not connect to server")
    print("   Make sure the FastAPI server is running on port 8000")
except Exception as e:
    print(f"\n❌ Error making call: {e}")
    import traceback
    traceback.print_exc()
