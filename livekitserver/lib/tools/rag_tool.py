"""Knowledge-base (RAG) search function tool."""

import logging

from livekit.agents.llm import function_tool
from livekit.agents import AudioConfig, BuiltinAudioClip

from src.models import CallConfig

logger = logging.getLogger(__name__)


def create_rag_tool(kb, config: CallConfig, background_audio_ref):
    """Return a ``@function_tool`` that searches the knowledge base.

    Parameters
    ----------
    kb:
        ``KnowledgeBase`` instance (must have ``.enabled`` and ``.search()``).
    config:
        Call configuration (used for ``knowledge_base_top_k``).
    background_audio_ref:
        A dict-like object with ``"player"`` and ``"started"`` keys so we can
        play a typing sound while searching.  Pass ``None`` to skip sounds.
    """
    top_k = config.knowledge_base_top_k

    @function_tool()
    async def search_knowledge_base(query: str) -> str:
        """Search the company knowledge base for relevant information based on the user's question.
        Use this tool when the user asks questions about company information, products, services, or policies."""
        # Play typing sound while searching (if enabled)
        if background_audio_ref and background_audio_ref.get("started"):
            player = background_audio_ref.get("player")
            if player:
                try:
                    player.play(
                        AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.5)
                    )
                    logger.info("Playing typing sound - searching knowledge base")
                except Exception as e:
                    logger.debug(f"Failed to play typing sound: {e}")

        return await kb.search(query, top_k=top_k)

    return search_knowledge_base
