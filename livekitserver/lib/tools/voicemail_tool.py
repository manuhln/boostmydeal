"""Voicemail detection function tool."""

import logging

from livekit.agents.llm import function_tool

from src.models import CallConfig
from lib.i18n import Translator

logger = logging.getLogger(__name__)


def create_voicemail_tool(config: CallConfig, translator: Translator):
    """Return a ``@function_tool`` that signals voicemail was detected."""

    voicemail_msg = config.voicemail_message or translator.get("voicemail_default")

    @function_tool()
    async def detected_answering_machine() -> str:
        """Call this function if you detect an answering machine or voicemail system.
        Listen for phrases like 'leave a message', 'at the tone', 'not available', beep sounds, or automated greetings."""
        return f"Voicemail detected. Say exactly: {voicemail_msg}"

    logger.info(f"Voicemail detection enabled with message: {voicemail_msg[:50]}...")
    return detected_answering_machine
