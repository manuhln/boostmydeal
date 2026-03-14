"""VAD (Voice Activity Detection) adjustment tool for email input."""

import logging

from livekit.agents.llm import function_tool

logger = logging.getLogger(__name__)


def create_vad_tool(session_ref: dict):
    """Return a ``@function_tool`` that widens the endpointing delay.

    ``session_ref`` is a dict with key ``"session"`` pointing to the
    active ``AgentSession``.
    """

    @function_tool()
    async def prepare_for_email_input() -> str:
        """MUST be called immediately BEFORE asking the user to spell their email address.
        This tool adjusts the audio sensors to allow for pauses between letters when spelling email.
        Call this BEFORE saying 'Can you spell your email' or 'Please provide your email address'."""
        session = session_ref.get("session")
        if session:
            session.options.min_endpointing_delay = 3.0
            logger.info("VAD sensitivity lowered to 3.0s: Ready for email spelling")
            return (
                "Audio sensors adjusted for email input. "
                "Now ask the user to spell their email letter by letter."
            )
        return "Session not active."

    return prepare_for_email_input
