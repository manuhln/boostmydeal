"""End-call function tool."""

import asyncio
import logging
import os

from livekit import api
from livekit.agents.llm import function_tool

from lib.i18n import Translator

logger = logging.getLogger(__name__)

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


def create_end_call_tool(
    translator: Translator,
    room_name: str,
    end_call_flag_ref: dict,
):
    """Return a ``@function_tool`` that gracefully ends the call.

    ``end_call_flag_ref`` is a dict ``{"scheduled": False}`` used as an
    idempotent guard so the room-deletion fires only once.
    """
    goodbye_msg = translator.get("goodbye")

    @function_tool()
    async def end_call() -> str:
        """End the call gracefully when the conversation has naturally concluded.
        Use this when the user says goodbye, thanks, that's all, or when the objective is achieved and no further help is needed."""
        if end_call_flag_ref.get("scheduled"):
            logger.info("end_call already scheduled, skipping duplicate request")
            return goodbye_msg

        try:
            logger.info("end_call invoked - scheduling room deletion after final message")
            end_call_flag_ref["scheduled"] = True

            async def _delete_room_after_delay():
                await asyncio.sleep(3.0)
                try:
                    lk = api.LiveKitAPI(
                        url=LIVEKIT_URL,
                        api_key=LIVEKIT_API_KEY,
                        api_secret=LIVEKIT_API_SECRET,
                    )
                    await lk.room.delete_room(api.DeleteRoomRequest(room=room_name))
                    await lk.aclose()
                    logger.info(f"Room {room_name} deleted successfully")
                except Exception as e:
                    logger.error(f"Error deleting room: {e}")

            asyncio.create_task(_delete_room_after_delay())

        except Exception as e:
            logger.error(f"Error during end_call: {e}")

        return goodbye_msg

    return end_call
