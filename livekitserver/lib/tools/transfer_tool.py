"""Call-transfer function tool."""

import asyncio
import logging
import os

from livekit import api
from livekit.protocol import sip as proto_sip
from livekit.agents.llm import function_tool

from src.models import CallConfig
from lib.i18n import Translator

logger = logging.getLogger(__name__)

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


async def _execute_transfer(
    room_name: str,
    participant_identity: str,
    transfer_number: str,
    session,
    translator: Translator,
) -> None:
    """Perform the actual SIP transfer and handle errors."""
    try:
        if not transfer_number:
            raise ValueError("Transfer phone number not configured")

        if not transfer_number.startswith("+"):
            transfer_number = f"+{transfer_number}"

        logger.info(f"Transferring call to {transfer_number}")
        await session.say(
            translator.get("transfer_hold"), allow_interruptions=False
        )

        livekit_api_client = api.LiveKitAPI(
            url=LIVEKIT_URL,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )

        transfer_request = proto_sip.TransferSIPParticipantRequest(
            room_name=room_name,
            participant_identity=participant_identity,
            transfer_to=f"tel:{transfer_number}",
            play_dialtone=False,
        )
        await livekit_api_client.sip.transfer_sip_participant(transfer_request)
        logger.info(f"Transfer request sent successfully to {transfer_number}")

        await asyncio.sleep(2)
        os._exit(0)

    except Exception as e:
        logger.error(f"Error transferring call: {e}")
        await session.say(
            translator.get("transfer_error"), allow_interruptions=True
        )


def create_transfer_tool(
    config: CallConfig,
    translator: Translator,
    room_name: str,
    participant_identity: str,
    session_ref,
):
    """Return a ``@function_tool`` that transfers the call to a human agent.

    ``session_ref`` must be a dict with key ``"session"`` pointing to the
    active ``AgentSession`` (set after the session starts).
    """
    transfer_number = config.transfer_phone_number
    confirmation_msg = translator.get("transfer_confirmation")

    @function_tool()
    async def transfer_to_human(
        reason: str = "User requested to speak with a human agent",
    ) -> str:
        """Transfer the call to a human agent when the user requests to speak with a real person or needs human assistance.
        Use this when the user explicitly asks to talk to someone, speak to a human, or get transferred to support."""
        session = session_ref.get("session")
        if not session:
            return translator.get("transfer_unavailable")

        await _execute_transfer(
            room_name, participant_identity, transfer_number, session, translator
        )
        return confirmation_msg

    return transfer_to_human
