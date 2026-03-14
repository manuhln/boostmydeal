"""
Lightweight translator that looks up pre-defined messages by key and language.

Usage:
    t = Translator("es")
    t.get("goodbye")                          # → "Entendido. Gracias por tu tiempo. ¡Adiós!"
    t.get("context_date", date="Nov 3")       # → "- Fecha de hoy: Nov 3\n"
"""

import logging

from .messages import MESSAGES, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)


class Translator:
    """Looks up translated strings by key, falling back to English."""

    def __init__(self, language: str = "en") -> None:
        self.language = self._resolve(language)

    def get(self, key: str, **kwargs: str) -> str:
        """Return the translated message for *key*.

        Any extra keyword arguments are passed to ``str.format()``
        so placeholders like ``{name}`` are replaced.

        Falls back to English when the key or language is missing.
        """
        translations = MESSAGES.get(key)
        if translations is None:
            logger.warning(f"Missing translation key: '{key}'")
            return key

        text = translations.get(self.language, translations.get("en", key))

        if kwargs:
            try:
                text = text.format(**kwargs)
            except KeyError as exc:
                logger.warning(
                    f"Missing placeholder {exc} in message '{key}' for language '{self.language}'"
                )
        return text

    @staticmethod
    def _resolve(language: str) -> str:
        lang = language.lower().strip()
        if lang in SUPPORTED_LANGUAGES:
            return lang
        logger.warning(f"Unsupported language '{lang}', falling back to 'en'")
        return "en"
