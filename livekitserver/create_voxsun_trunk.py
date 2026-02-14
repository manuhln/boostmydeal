#!/usr/bin/env python3
"""
Script to create Voxsun SIP outbound trunk in LiveKit
"""
import asyncio
import os
from livekit import api
from livekit.protocol import sip as proto_sip


async def create_voxsun_trunk():
    """Create Voxsun SIP outbound trunk"""
    
    # Get LiveKit credentials from environment
    livekit_url = os.getenv("LIVEKIT_URL", "")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY", "")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET", "")
    
    if not all([livekit_url, livekit_api_key, livekit_api_secret]):
        print("❌ Error: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set")
        return
    
    print("🔧 Creating LiveKit API client...")
    lkapi = api.LiveKitAPI(
        url=livekit_url,
        api_key=livekit_api_key,
        api_secret=livekit_api_secret
    )
    
    try:
        print("📞 Creating Voxsun SIP outbound trunk...")
        
        # Create the trunk configuration
        trunk = proto_sip.SIPOutboundTrunkInfo(
            name="Voxsun Trunk",
            address="voxsun.net:5060",
            transport=proto_sip.SIP_TRANSPORT_UDP,  # VoxSun requires UDP
            numbers=["+14384760245"],
            auth_username="VoxSunai@voxsun.com",
            auth_password="Azertyuiop@2025"
        )
        
        # Create the request
        request = proto_sip.CreateSIPOutboundTrunkRequest(trunk=trunk)
        
        # Send the request
        result = await lkapi.sip.create_outbound_trunk(request)
        
        print("\n✅ Voxsun trunk created successfully!")
        print("="*60)
        print(f"📋 Trunk ID: {result.sip_trunk_id}")
        print(f"📝 Trunk Name: {result.name}")
        print(f"📍 Address: {result.address}")
        print(f"📞 Numbers: {', '.join(result.numbers)}")
        print("="*60)
        print("\n💡 To use this trunk for outbound calls, update your environment:")
        print(f"\n   LIVEKIT_SIP_TRUNK_ID={result.sip_trunk_id}")
        print("\n   This will replace the current Twilio trunk (ST_oFKahmfQr9wR)")
        
    except Exception as e:
        print(f"\n❌ Error creating trunk: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(create_voxsun_trunk())
