"""
Assembles the full agent prompt from its parts.

Usage:
    from lib.prompts import PromptBuilder

    prompt = PromptBuilder(language="es").build(
        customer_name="Carlos",
        agent_instructions="You sell solar panels.",
        current_date="2025-11-03",
        current_time="14:36",
        previous_call_summary="Customer was interested in pricing.",
        voicemail_enabled=True,
    )
"""

import logging
from typing import Optional

from lib.i18n import Translator
from .base_prompts import BASE_PROMPTS

logger = logging.getLogger(__name__)


class PromptBuilder:
    """Builds the complete system prompt for a voice agent call."""

    def __init__(self, language: str = "en") -> None:
        self._translator = Translator(language)
        self._language = self._translator.language  # resolved language

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(
        self,
        customer_name: str,
        agent_instructions: str,
        current_date: Optional[str] = None,
        current_time: Optional[str] = None,
        previous_call_summary: Optional[str] = None,
        voicemail_enabled: bool = False,
    ) -> str:
        """Return the fully assembled prompt string."""

        context_info = self._build_context(current_date, current_time)
        previous_call_context = self._build_previous_call(
            customer_name, previous_call_summary
        )
        voicemail_instructions = (
            self._translator.get("voicemail_instructions") if voicemail_enabled else ""
        )
        base_prompt = BASE_PROMPTS.get(self._language, BASE_PROMPTS["en"])

        return self._translator.get(
            "prompt_wrapper",
            customer_name=customer_name,
            context_info=context_info,
            base_prompt=base_prompt,
            agent_instructions=agent_instructions,
            previous_call_context=previous_call_context,
            voicemail_instructions=voicemail_instructions,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_context(
        self, current_date: Optional[str], current_time: Optional[str]
    ) -> str:
        if not current_date and not current_time:
            return ""

        parts = [self._translator.get("context_header")]
        if current_date:
            parts.append(self._translator.get("context_date", date=current_date))
        if current_time:
            parts.append(self._translator.get("context_time", time=current_time))
        return "".join(parts)

    def _build_previous_call(
        self, customer_name: str, summary: Optional[str]
    ) -> str:
        if not summary:
            return ""
        return self._translator.get(
            "previous_call_header", name=customer_name, summary=summary
        )
