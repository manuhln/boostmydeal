"""
Pronunciation Normalization Module

Handles text preprocessing before TTS synthesis to ensure correct pronunciation
of brand names, technical terms, and commonly mispronounced words.
"""

import re
from typing import Dict, Optional

PRONUNCIATION_OVERRIDES: Dict[str, Dict[str, str]] = {
    "gmail": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈdʒiːmeɪl">Gmail</phoneme>',
        "text": "G-mail",
    },
    "iphone": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈaɪfoʊn">iPhone</phoneme>',
        "text": "eye-phone",
    },
    "ios": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈaɪoʊɛs">iOS</phoneme>',
        "text": "eye-O-S",
    },
    "api": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˌeɪpiːˈaɪ">API</phoneme>',
        "text": "A-P-I",
    },
    "url": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˌjuːɑːrˈɛl">URL</phoneme>',
        "text": "U-R-L",
    },
    "sql": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˌɛskjuːˈɛl">SQL</phoneme>',
        "text": "S-Q-L",
    },
    "wifi": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈwaɪfaɪ">WiFi</phoneme>',
        "text": "why-fye",
    },
    "linkedin": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈlɪŋktɪn">LinkedIn</phoneme>',
        "text": "Linked-In",
    },
    "youtube": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈjuːtuːb">YouTube</phoneme>',
        "text": "You-Tube",
    },
    "whatsapp": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈwɒtsæp">WhatsApp</phoneme>',
        "text": "Whats-App",
    },
    "livekit": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈlaɪvkɪt">LiveKit</phoneme>',
        "text": "Live-Kit",
    },
    "twilio": {
        "elevenlabs_ssml": '<phoneme alphabet="ipa" ph="ˈtwɪlioʊ">Twilio</phoneme>',
        "text": "Twil-ee-oh",
    },
}


def normalize_pronunciation(text: str, provider: str = "text", use_ssml: bool = False) -> str:
    """
    Normalize text for correct pronunciation before TTS synthesis.
    
    Args:
        text: The text to normalize
        provider: TTS provider name ("elevenlabs", "openai", "smallestai", "text")
        use_ssml: Whether to use SSML markup (only for ElevenLabs with SSML enabled)
    
    Returns:
        Normalized text with pronunciation corrections applied
    """
    if not text:
        return text
    
    result = text
    
    for term, replacements in PRONUNCIATION_OVERRIDES.items():
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        
        if use_ssml and provider.lower() == "elevenlabs" and "elevenlabs_ssml" in replacements:
            replacement = replacements["elevenlabs_ssml"]
        else:
            replacement = replacements.get("text", term)
        
        def replace_match(match):
            original = match.group(0)
            if use_ssml and provider.lower() == "elevenlabs":
                return replacement
            else:
                if original.isupper():
                    return replacement.upper()
                elif original[0].isupper():
                    return replacement.capitalize() if not replacement[0].isupper() else replacement
                else:
                    return replacement.lower()
        
        result = pattern.sub(replace_match, result)
    
    return result


def add_pronunciation_override(term: str, text_replacement: str, ssml_replacement: Optional[str] = None) -> None:
    """
    Add a custom pronunciation override at runtime.
    
    Args:
        term: The term to override (case-insensitive matching)
        text_replacement: Plain text replacement for non-SSML providers
        ssml_replacement: Optional SSML replacement for ElevenLabs
    """
    override = {"text": text_replacement}
    if ssml_replacement:
        override["elevenlabs_ssml"] = ssml_replacement
    
    PRONUNCIATION_OVERRIDES[term.lower()] = override


def get_pronunciation_overrides() -> Dict[str, Dict[str, str]]:
    """
    Get the current pronunciation overrides dictionary.
    
    Returns:
        Dictionary of pronunciation overrides
    """
    return PRONUNCIATION_OVERRIDES.copy()
