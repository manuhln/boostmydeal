"""
Factory for creating Text-to-Speech provider instances.

Usage:
    from lib.providers import TTSFactory
    tts = TTSFactory.create(call_config.tts, language="es")

Adding a new provider:
    1. Write a ``_create_<name>`` classmethod that returns the TTS instance.
    2. Register the provider name(s) in ``_PROVIDER_MAP``.
"""

import logging
import os

from livekit.plugins import openai, elevenlabs, smallestai

from src.models import TTSConfig

logger = logging.getLogger(__name__)

# Languages that need the multilingual ElevenLabs model
_MULTILINGUAL_LANGUAGES = {"es", "fr", "hi", "ar"}


class TTSFactory:
    """Creates the right TTS instance based on provider configuration."""

    # Maps normalised provider names → factory method name
    _PROVIDER_MAP: dict[str, str] = {
        "openai": "_create_openai",
        "open_ai": "_create_openai",
        "smallest": "_create_smallest",
        "smallest_ai": "_create_smallest",
        "smallestai": "_create_smallest",
        # Everything else falls through to ElevenLabs (the default)
    }

    @classmethod
    def create(cls, config: TTSConfig, language: str):
        """Return a configured TTS instance.

        Parameters
        ----------
        config:
            ``TTSConfig`` from the call configuration.
        language:
            Resolved two-letter language code (``"en"``, ``"es"``, …).
        """
        os.environ["ELEVEN_API_KEY"] = config.api_key

        provider = config.provider_name.lower().replace("-", "_")
        method_name = cls._PROVIDER_MAP.get(provider)

        if method_name is not None:
            factory_method = getattr(cls, method_name)
            return factory_method(config, language)

        # Default: ElevenLabs
        return cls._create_elevenlabs(config, language)

    # ------------------------------------------------------------------
    # Provider-specific constructors
    # ------------------------------------------------------------------

    @classmethod
    def _create_openai(cls, config: TTSConfig, language: str):
        logger.info("Using OpenAI TTS")
        return openai.TTS(voice="alloy")

    @classmethod
    def _create_smallest(cls, config: TTSConfig, language: str):
        os.environ["SMALLEST_API_KEY"] = config.api_key

        model = config.model_id or "lightning-large"
        voice = config.voice_id or "irisha"

        logger.info(
            f"Using Smallest.ai TTS with model: {model}, "
            f"voice_id: {voice}, sample_rate: 24000"
        )
        return smallestai.TTS(
            model=model,
            voice_id=voice,
            api_key=config.api_key,
            sample_rate=24000,
            speed=1.0,
            consistency=0.5,
            similarity=0.7,
            enhancement=0.0,
        )

    @classmethod
    def _create_elevenlabs(cls, config: TTSConfig, language: str):
        if language in _MULTILINGUAL_LANGUAGES:
            model = "eleven_multilingual_v2"
        else:
            model = "eleven_turbo_v2_5"

        if config.model_id and config.model_id != model:
            logger.info(
                f"User provided model '{config.model_id}' but using "
                f"'{model}' based on language '{language}'"
            )

        logger.info(
            f"Using ElevenLabs TTS with model: {model} (language: {language}), "
            f"voice_id: {config.voice_id}"
        )
        return elevenlabs.TTS(
            voice_id=config.voice_id,
            model=model,
            api_key=config.api_key,
            streaming_latency=2,
            chunk_length_schedule=[120, 160, 250, 290],
            enable_ssml_parsing=False,
        )
