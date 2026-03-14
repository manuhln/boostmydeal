import logging
from typing import Optional

from src.models import CallConfig
from lib.i18n import Translator

logger = logging.getLogger(__name__)


class ToolBuilder:
    """Fluent builder that assembles agent function tools."""

    def __init__(self, config: CallConfig, language: str) -> None:
        self._config = config
        self._language = language
        self._translator = Translator(language)
        self._tools: list = []

    def with_voicemail(self) -> "ToolBuilder":
        """Add voicemail detection tool if enabled in config."""
        if not self._config.voicemail:
            return self

        from .voicemail_tool import create_voicemail_tool

        tool = create_voicemail_tool(self._config, self._translator)
        self._tools.append(tool)
        logger.info("Voicemail detection tool enabled")
        return self

    def with_knowledge_base(self, kb, background_audio_ref) -> "ToolBuilder":
        """Add RAG knowledge-base search tool if KB is enabled."""
        if kb is None or not kb.enabled:
            return self

        from .rag_tool import create_rag_tool

        tool = create_rag_tool(kb, self._config, background_audio_ref)
        self._tools.append(tool)
        logger.info("RAG function tool enabled for knowledge base queries")
        return self

    def with_call_transfer(
        self,
        room_name: str,
        participant_identity: str,
        session_ref,
    ) -> "ToolBuilder":
        """Add call-transfer tool if enabled in config."""
        if not self._config.enable_call_transfer:
            return self

        if not self._config.transfer_phone_number:
            logger.warning(
                "Call transfer enabled but no transfer_phone_number configured"
            )
            return self

        from .transfer_tool import create_transfer_tool

        tool = create_transfer_tool(
            config=self._config,
            translator=self._translator,
            room_name=room_name,
            participant_identity=participant_identity,
            session_ref=session_ref,
        )
        self._tools.append(tool)
        logger.info(f"Call transfer enabled to {self._config.transfer_phone_number}")
        return self

    def with_end_call(
        self,
        room_name: str,
        end_call_flag_ref,
    ) -> "ToolBuilder":
        """Add end-call tool (always present)."""
        from .end_call_tool import create_end_call_tool

        tool = create_end_call_tool(
            translator=self._translator,
            room_name=room_name,
            end_call_flag_ref=end_call_flag_ref,
        )
        self._tools.append(tool)
        logger.info("Natural call ending tool (end_call) enabled")
        return self

    def with_vad_email(self, session_ref) -> "ToolBuilder":
        """Add VAD-adjustment tool for email input (always present)."""
        from .vad_tool import create_vad_tool

        tool = create_vad_tool(session_ref)
        self._tools.append(tool)
        logger.info("Dynamic VAD tool (prepare_for_email_input) enabled")
        return self

    # ------------------------------------------------------------------
    # Terminal operation
    # ------------------------------------------------------------------

    def build(self) -> list:
        """Return the assembled list of tools."""
        return self._tools
