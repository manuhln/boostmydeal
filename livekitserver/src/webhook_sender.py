import aiohttp
import asyncio
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


async def send_webhook(webhook_url: str, payload: dict):
    """Send webhook event to the configured URL"""
    # Always log webhook to console
    print(f"\n{'='*60}")
    print(f"📡 WEBHOOK EVENT: {payload.get('type')}")
    print(f"{'='*60}")
    for key, value in payload.items():
        print(f"  {key}: {value}")
    print(f"{'='*60}\n")
    
    if not webhook_url:
        print("ℹ️  No webhook URL configured - event logged only\n")
        return
    
    print(f"📤 Sending to: {webhook_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                response_text = await response.text()
                if response.status != 200:
                    logger.warning(f"Webhook returned status {response.status}")
                    print(f"⚠️  Webhook failed with status {response.status}")
                    print(f"   Response: {response_text}\n")
                else:
                    logger.info(f"Webhook sent successfully: {payload.get('type')}")
                    print(f"✅ Webhook sent successfully!")
                    print(f"   Server response: {response_text}\n")
    except asyncio.TimeoutError:
        logger.error(f"Webhook timeout after 10 seconds")
        print(f"❌ Webhook timeout - server took too long to respond\n")
    except Exception as e:
        logger.error(f"Failed to send webhook: {e}")
        print(f"❌ Webhook error: {e}\n")


async def send_call_connected(webhook_url: str, call_id: str, call_start_time: datetime):
    """Send PHONE_CALL_CONNECTED webhook"""
    payload = {
        "type": "PHONE_CALL_CONNECTED",
        "call_id": call_id,
        "call_start_time": call_start_time.isoformat()
    }
    await send_webhook(webhook_url, payload)


async def send_live_transcript(
    webhook_url: str,
    call_id: str,
    text: str,
    sender: str,
    is_partial: bool = False
):
    """Send LIVE_TRANSCRIPT webhook"""
    payload = {
        "type": "LIVE_TRANSCRIPT",
        "call_id": call_id,
        "text": text,
        "sender": sender,
        "timestamp": datetime.utcnow().isoformat(),
        "is_partial": is_partial
    }
    await send_webhook(webhook_url, payload)


async def send_call_ended(
    webhook_url: str,
    call_id: str,
    duration_seconds: int,
    call_start_time: datetime,
    call_end_time: datetime,
    is_voicemail: bool = False,
    is_rejected: bool = False,
    call_outcome: str = "completed",
    end_reason: str = "unknown",
    recording_url: Optional[str] = None
):
    """Send PHONE_CALL_ENDED webhook with optional recording URL"""
    payload = {
        "type": "PHONE_CALL_ENDED",
        "call_id": call_id,
        "duration_seconds": duration_seconds,
        "call_end_time": call_end_time.isoformat(),
        "call_start_time": call_start_time.isoformat(),
        "is_voicemail": is_voicemail,
        "is_rejected": is_rejected,
        "call_outcome": call_outcome,
        "end_reason": end_reason
    }
    
    # Add recording URL if available
    if recording_url:
        payload["recording_url"] = recording_url
        logger.info(f"Including recording URL in webhook: {recording_url}")
    
    await send_webhook(webhook_url, payload)


async def send_transcript_complete(
    webhook_url: str,
    call_id: str,
    full_transcript: str,
    recording_urls: list,
    user_tags_found: Optional[list] = None,
    system_tags_found: Optional[list] = None,
    callback_requested: bool = False,
    callback_time: Optional[datetime] = None,
    cost_breakdown: Optional[dict] = None
):
    """Send TRANSCRIPT_COMPLETE webhook with full transcript, recording URLs, detected tags, callback info, and cost breakdown"""
    payload = {
        "type": "TRANSCRIPT_COMPLETE",
        "call_id": call_id,
        "full_transcript": full_transcript,
        "recording_urls": recording_urls,
        "user_tags_found": user_tags_found if user_tags_found is not None else [],
        "system_tags_found": system_tags_found if system_tags_found is not None else [],
        "callback_requested": callback_requested,
        "callback_time": callback_time.isoformat() if callback_time else None
    }
    
    # Add cost breakdown if available
    if cost_breakdown:
        payload["cost_breakdown"] = cost_breakdown
        logger.info(f"💰 Including cost breakdown in webhook: Total=${cost_breakdown.get('total_cost', 0):.4f}")
    
    await send_webhook(webhook_url, payload)
