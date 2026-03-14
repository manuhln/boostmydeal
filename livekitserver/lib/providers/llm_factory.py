"""
Factory for creating LLM provider instances.

Usage:
    from lib.providers import LLMFactory
    result = LLMFactory.create(
        call_config.model,
        instructions=full_prompt,
        temperature=call_config.temperature,
        tools=tools,
        language=language,
    )
    # result.is_realtime is True when a RealtimeModel was created (Gemini Live)
    # result.instance is the LLM or RealtimeModel

Adding a new provider:
    1. Write a ``_create_<name>`` classmethod that returns an (instance, is_realtime) tuple.
    2. Register the provider name(s) in ``_PROVIDER_MAP``.
"""

import logging
import os
from dataclasses import dataclass
from typing import Any

from livekit.agents import llm as agents_llm
from livekit.plugins import openai

from src.models import ModelConfig

logger = logging.getLogger(__name__)


@dataclass
class LLMResult:
    """Result from LLMFactory.create() — holds the instance and a flag."""

    instance: Any
    """The created LLM or RealtimeModel instance."""

    is_realtime: bool
    """True when instance is a RealtimeModel (e.g., Gemini Live)."""


class LLMFactory:
    """Creates the right LLM instance based on provider configuration."""

    _PROVIDER_MAP: dict[str, str] = {
        "openai": "_create_openai",
        "open_ai": "_create_openai",
        "gemini_live": "_create_gemini_live",
        "gemini-live": "_create_gemini_live",
        "google": "_create_gemini_live",
    }

    @classmethod
    def create(
        cls,
        config: ModelConfig,
        *,
        instructions: str,
        temperature: float = 0.7,
        tools: list | None = None,
        language: str = "en",
    ) -> LLMResult:
        """Return a configured LLM or RealtimeModel wrapped in LLMResult.

        Parameters
        ----------
        config:
            ``ModelConfig`` from the call configuration.
        instructions:
            System prompt / instructions string.
        temperature:
            Sampling temperature (provider-dependent support).
        tools:
            List of LiveKit tool callables to expose to the model.
        language:
            BCP-47 language code (used by Gemini Live for input language).
        """
        provider = config.provider.lower().replace("-", "_")
        method_name = cls._PROVIDER_MAP.get(provider)

        if method_name is None:
            logger.warning(
                f"Unknown LLM provider '{config.provider}', falling back to OpenAI"
            )
            method_name = "_create_openai"

        factory_method = getattr(cls, method_name)
        return factory_method(
            config,
            instructions=instructions,
            temperature=temperature,
            tools=tools or [],
            language=language,
        )

    # ------------------------------------------------------------------
    # Provider-specific constructors
    # ------------------------------------------------------------------

    @classmethod
    def _create_openai(
        cls,
        config: ModelConfig,
        *,
        instructions: str,
        temperature: float,
        tools: list,
        language: str,
    ) -> LLMResult:
        os.environ["OPENAI_API_KEY"] = config.api_key
        logger.info(f"Using OpenAI LLM with model: {config.name}, temperature: {temperature}")
        instance = openai.LLM(
            model=config.name,
            temperature=temperature,
        )
        return LLMResult(instance=instance, is_realtime=False)

    @classmethod
    def _create_gemini_live(
        cls,
        config: ModelConfig,
        *,
        instructions: str,
        temperature: float,
        tools: list,
        language: str,
    ) -> LLMResult:
        from livekit.plugins.google.realtime import RealtimeModel

        os.environ["GOOGLE_API_KEY"] = config.api_key

        model_name = config.name or "gemini-2.5-flash-native-audio-preview-12-2025"
        voice = config.voice or "Puck"

        logger.info(
            f"Using Gemini Live RealtimeModel: model={model_name}, "
            f"voice={voice}, language={language}"
        )

        instance = RealtimeModel(
            model=model_name,
            api_key=config.api_key,
            voice=voice,
            language=language,
            instructions=instructions,
            temperature=temperature,
        )
        return LLMResult(instance=instance, is_realtime=True)
