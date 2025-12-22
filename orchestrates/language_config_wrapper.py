"""
Language Configuration Wrapper for Vocode
This wrapper configures language-specific messages for vocode's telephony system.
"""
from typing import List, Dict
from vocode.streaming import constants
from loguru import logger


class LanguageConfig:
    """Configuration for language-specific messages in vocode conversations."""
    
    # Language-specific "Are you still there?" messages
    IDLE_CHECK_MESSAGES: Dict[str, List[str]] = {
        "en": [
            "Are you still there?",
            "Hello? Can you hear me?",
            "Are you there?",
            "Hi, are you there?"
        ],
        "es": [
            "¿Sigue ahí?",
            "¿Hola? ¿Me escucha?",
            "¿Está ahí?",
            "¿Me puede escuchar?"
        ],
        "fr": [
            "Vous êtes toujours là ?",
            "Bonjour ? Vous m'entendez ?",
            "Êtes-vous là ?",
            "Allô ? Vous êtes là ?"
        ],
        "hi": [
            "क्या आप अभी भी हैं?",
            "हैलो? क्या आप मुझे सुन सकते हैं?",
            "क्या आप वहां हैं?"
        ],
        "de": [
            "Sind Sie noch da?",
            "Hallo? Können Sie mich hören?",
            "Sind Sie da?"
        ],
        "it": [
            "Sei ancora lì?",
            "Pronto? Mi senti?",
            "Ci sei?"
        ],
        "pt": [
            "Você ainda está aí?",
            "Alô? Você me ouve?",
            "Está aí?"
        ]
    }
    
    # Language-specific goodbye messages (for agent prompts)
    GOODBYE_MESSAGES: Dict[str, str] = {
        "en": "Thank you, goodbye",
        "es": "Gracias, adiós",
        "fr": "Merci, au revoir",
        "hi": "धन्यवाद, अलविदा",
        "de": "Danke, auf Wiedersehen",
        "it": "Grazie, arrivederci",
        "pt": "Obrigado, tchau"
    }
    
    # Single goodbye word (for voicemail detection)
    GOODBYE_WORD: Dict[str, str] = {
        "en": "Goodbye",
        "es": "Adiós",
        "fr": "Au revoir",
        "hi": "अलविदा",
        "de": "Auf Wiedersehen",
        "it": "Arrivederci",
        "pt": "Tchau"
    }
    
    # Goodbye detection phrases (for vocode's is_goodbye_simple function)
    GOODBYE_PHRASES: Dict[str, List[str]] = {
        "en": ["bye", "goodbye", "good bye", "see you"],
        "es": ["adiós", "adios", "chao", "hasta luego"],
        "fr": ["au revoir", "salut", "à bientôt", "bye"],
        "hi": ["अलविदा", "bye"],
        "de": ["auf wiedersehen", "tschüss", "bye"],
        "it": ["ciao", "arrivederci", "addio"],
        "pt": ["tchau", "adeus", "até logo"]
    }
    
    @classmethod
    def configure_for_language(cls, language: str) -> Dict:
        """
        Configure vocode constants and return language-specific messages for the given language.
        
        Args:
            language: Language code (e.g., 'en', 'es', 'fr', 'hi')
            
        Returns:
            Dictionary containing:
                - idle_messages: List of idle check messages
                - goodbye_message: Full goodbye message
                - goodbye_word: Single goodbye word
                - goodbye_phrases: List of phrases to detect goodbye
        """
        lang = language.lower()
        
        # Set vocode's CHECK_HUMAN_PRESENT_MESSAGE_CHOICES constant
        # IMPORTANT: Modify the list IN-PLACE to ensure vocode's imported reference is updated
        idle_messages = cls.IDLE_CHECK_MESSAGES.get(lang, cls.IDLE_CHECK_MESSAGES["en"])
        constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES.clear()  # Clear existing items
        constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES.extend(idle_messages)  # Add new items
        
        # Get other language-specific messages
        goodbye_message = cls.GOODBYE_MESSAGES.get(lang, cls.GOODBYE_MESSAGES["en"])
        goodbye_word = cls.GOODBYE_WORD.get(lang, cls.GOODBYE_WORD["en"])
        goodbye_phrases = cls.GOODBYE_PHRASES.get(lang, cls.GOODBYE_PHRASES["en"])
        
        # Log configuration
        language_emoji = {
            "en": "🇬🇧",
            "es": "🇪🇸",
            "fr": "🇫🇷",
            "hi": "🇮🇳",
            "de": "🇩🇪",
            "it": "🇮🇹",
            "pt": "🇧🇷"
        }
        emoji = language_emoji.get(lang, "🌍")
        
        logger.info(f"{emoji} Language configured: {lang.upper()}")
        logger.info(f"  - Idle check messages: {idle_messages}")
        logger.info(f"  - Goodbye message: '{goodbye_message}'")
        logger.info(f"  - Goodbye detection phrases: {goodbye_phrases}")
        
        return {
            "idle_messages": idle_messages,
            "goodbye_message": goodbye_message,
            "goodbye_word": goodbye_word,
            "goodbye_phrases": goodbye_phrases
        }
    
    @classmethod
    def get_goodbye_message(cls, language: str) -> str:
        """Get the goodbye message for the specified language."""
        return cls.GOODBYE_MESSAGES.get(language.lower(), cls.GOODBYE_MESSAGES["en"])
    
    @classmethod
    def get_goodbye_word(cls, language: str) -> str:
        """Get the goodbye word for the specified language."""
        return cls.GOODBYE_WORD.get(language.lower(), cls.GOODBYE_WORD["en"])
    
    @classmethod
    def get_goodbye_phrases(cls, language: str) -> List[str]:
        """Get the goodbye detection phrases for the specified language."""
        return cls.GOODBYE_PHRASES.get(language.lower(), cls.GOODBYE_PHRASES["en"])
