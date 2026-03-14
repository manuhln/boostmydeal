"""
Factory for creating Speech-to-Text provider instances.

Usage:
    from lib.providers import STTFactory
    stt = STTFactory.create(call_config.stt, language="fr",
                            fallback_openai_key=call_config.model.api_key)

Adding a new provider:
    1. Write a ``_create_<name>`` classmethod that returns the STT instance.
    2. Register the provider name(s) in ``_PROVIDER_MAP``.
"""

import logging
import os

from livekit.plugins import openai, deepgram

from src.models import STTConfig

logger = logging.getLogger(__name__)


class STTFactory:
    """Creates the right STT instance based on provider configuration."""

    _PROVIDER_MAP: dict[str, str] = {
        "openai": "_create_openai",
        "deepgram": "_create_deepgram",
    }

    @classmethod
    def create(cls, config: STTConfig, language: str, fallback_openai_key: str = ""):
        """Return a configured STT instance.

        Parameters
        ----------
        config:
            ``STTConfig`` from the call configuration.
        language:
            Resolved two-letter language code.
        fallback_openai_key:
            OpenAI API key to reuse for the OpenAI provider when the STT
            config doesn't carry its own key.
        """
        # Set environment keys so the LiveKit plugins can find them
        if config.provider_name.lower() == "openai":
            os.environ["OPENAI_API_KEY"] = config.api_key or fallback_openai_key
        elif config.provider_name.lower() == "deepgram":
            os.environ["DEEPGRAM_API_KEY"] = config.api_key

        provider = config.provider_name.lower().replace("-", "_")
        method_name = cls._PROVIDER_MAP.get(provider)

        if method_name is not None:
            factory_method = getattr(cls, method_name)
            return factory_method(config, language)

        # Unknown provider → fall back to Deepgram
        return cls._create_fallback(config, language)

    # ------------------------------------------------------------------
    # Provider-specific constructors
    # ------------------------------------------------------------------

    @classmethod
    def _create_openai(cls, config: STTConfig, language: str):
        model = (
            config.model
            if config.model not in ("nova-2", "nova", "deepgram")
            else "gpt-4o-transcribe"
        )
        logger.info(f"Using OpenAI STT with model: {model}, language: {language}")
        return openai.STT(model=model, language=language)

    @classmethod
    def _create_deepgram(cls, config: STTConfig, language: str):
        logger.info(
            f"Using Deepgram STT with model: {config.model}, language: {language}"
        )
        return deepgram.STT(
            model=config.model,
            api_key=config.api_key,
            language=language,
        )

    @classmethod
    def _create_fallback(cls, config: STTConfig, language: str):
        logger.warning(
            f"Unknown STT provider '{config.provider_name}', falling back to Deepgram"
        )
        deepgram_key = os.getenv("DEEPGRAM_API_KEY")
        if not deepgram_key:
            raise ValueError(
                f"Unknown STT provider '{config.provider_name}' "
                f"and no DEEPGRAM_API_KEY found for fallback"
            )

        logger.info(f"Using Deepgram STT (fallback) with model: nova-2, language: {language}")
        return deepgram.STT(
            model="nova-2",
            api_key=deepgram_key,
            language=language,
        )
