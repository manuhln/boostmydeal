#!/usr/bin/env python3
"""
Script to create a SIP outbound trunk in LiveKit
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
            address="Node10@voxsun.net",
            numbers=["+14384760245"],
            auth_username="VoxSunai@voxsun.com",
            auth_password="Azertyuiop@2025"
        )
        
        # Create the request
        request = proto_sip.CreateSIPOutboundTrunkRequest(trunk=trunk)
        
        # Send the request
        result = await lkapi.sip.create_sip_outbound_trunk(request)
        
        print("✅ Trunk created successfully!")
        print(f"📋 Trunk ID: {result.sip_trunk_id}")
        print(f"📝 Trunk Name: {result.name}")
        print(f"📍 Address: {result.address}")
        print(f"📞 Numbers: {', '.join(result.numbers)}")
        print("\n💡 To use this trunk, set the following environment variable:")
        print(f"   LIVEKIT_SIP_TRUNK_ID={result.sip_trunk_id}")
        
    except Exception as e:
        print(f"❌ Error creating trunk: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await lkapi.aclose()


async def list_existing_trunks():
    """List all existing SIP trunks"""
    
    # Get LiveKit credentials from environment
    livekit_url = os.getenv("LIVEKIT_URL", "")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY", "")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET", "")
    
    if not all([livekit_url, livekit_api_key, livekit_api_secret]):
        print("❌ Error: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set")
        return
    
    lkapi = api.LiveKitAPI(
        url=livekit_url,
        api_key=livekit_api_key,
        api_secret=livekit_api_secret
    )
    
    try:
        print("\n📋 Listing existing SIP trunks...")
        
        # List outbound trunks
        request = proto_sip.ListSIPOutboundTrunkRequest()
        result = await lkapi.sip.list_sip_outbound_trunk(request)
        
        if result.items:
            print(f"\nFound {len(result.items)} outbound trunk(s):")
            for trunk in result.items:
                print(f"\n  🔹 {trunk.name}")
                print(f"     ID: {trunk.sip_trunk_id}")
                print(f"     Address: {trunk.address}")
                print(f"     Numbers: {', '.join(trunk.numbers)}")
        else:
            print("No outbound trunks found")
            
    except Exception as e:
        print(f"❌ Error listing trunks: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await lkapi.aclose()


async def main():
    """Main function"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        await list_existing_trunks()
    else:
        # First list existing trunks
        await list_existing_trunks()
        
        # Ask for confirmation
        print("\n" + "="*60)
        response = input("\n🤔 Do you want to create the Voxsun trunk? (yes/no): ")
        
        if response.lower() in ['yes', 'y']:
            await create_voxsun_trunk()
        else:
            print("❌ Operation cancelled")


if __name__ == "__main__":
    asyncio.run(main())
