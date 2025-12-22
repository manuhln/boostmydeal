"""
Cost calculation module for AI voice calling system.

Tracks and calculates costs for:
- Calling provider (Twilio/Voxsun)
- Text-to-Speech (ElevenLabs, Smallest.ai, OpenAI)
- Speech-to-Text (Deepgram, OpenAI)
- LLM (OpenAI)
"""

from typing import Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class CostBreakdown:
    """Detailed cost breakdown for a call"""
    calling_provider_cost: float = 0.0
    tts_cost: float = 0.0
    stt_cost: float = 0.0
    llm_cost: float = 0.0
    total_cost: float = 0.0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for webhook"""
        return {
            "calling_provider_cost": round(self.calling_provider_cost, 4),
            "tts_cost": round(self.tts_cost, 4),
            "stt_cost": round(self.stt_cost, 4),
            "llm_cost": round(self.llm_cost, 4),
            "total_cost": round(self.total_cost, 4),
            "currency": "USD"
        }


class CostCalculator:
    """Calculate costs for AI voice calls"""
    
    # Calling provider pricing (per minute)
    CALLING_RATES = {
        "twilio": 0.0457,
        "voxsun": 0.0457,  # Same as Twilio
    }
    
    # TTS pricing (per 1,000 characters)
    TTS_RATES = {
        "eleven_labs": {
            "default": 0.20,  # Standard voices
            "turbo": 0.15,    # Turbo models (average)
        },
        "smallest_ai": 0.05,  # All models
        "openai": 0.015,      # TTS models (standard)
    }
    
    # STT pricing (per minute)
    STT_RATES = {
        "deepgram": {
            "nova-2": 0.0043,
            "nova": 0.0048,
            "enhanced": 0.0055,
        },
        "openai": {
            "gpt-4o-mini-transcribe": 0.003,
            "gpt-4o-transcribe": 0.006,
            "whisper-1": 0.006,
        }
    }
    
    # LLM pricing (per 1M tokens) - GPT-4o-mini as default
    LLM_RATES = {
        "gpt-4o-mini": {
            "input": 0.150,   # $0.150 per 1M input tokens
            "output": 0.600,  # $0.600 per 1M output tokens
        },
        "gpt-4o": {
            "input": 2.50,
            "output": 10.00,
        },
        "gpt-4-turbo": {
            "input": 10.00,
            "output": 30.00,
        }
    }
    
    def __init__(self):
        self.tts_chars_sent = 0
        self.stt_minutes = 0.0
        self.llm_input_tokens = 0
        self.llm_output_tokens = 0
    
    def track_tts(self, text: str):
        """Track TTS character usage"""
        self.tts_chars_sent += len(text)
    
    def track_stt(self, duration_seconds: float):
        """Track STT usage in minutes"""
        self.stt_minutes += duration_seconds / 60.0
    
    def track_llm(self, input_tokens: int, output_tokens: int):
        """Track LLM token usage"""
        self.llm_input_tokens += input_tokens
        self.llm_output_tokens += output_tokens
    
    def calculate_calling_cost(
        self,
        duration_minutes: float,
        provider: str = "voxsun"
    ) -> float:
        """Calculate calling provider cost"""
        provider_lower = provider.lower()
        rate = self.CALLING_RATES.get(provider_lower, self.CALLING_RATES["voxsun"])
        return duration_minutes * rate
    
    def calculate_tts_cost(
        self,
        characters: int,
        provider: str,
        model_id: str = ""
    ) -> float:
        """Calculate TTS cost based on characters sent"""
        provider_lower = provider.lower()
        
        if provider_lower == "eleven_labs":
            # Check if it's a turbo model
            if "turbo" in model_id.lower():
                rate = self.TTS_RATES["eleven_labs"]["turbo"]
            else:
                rate = self.TTS_RATES["eleven_labs"]["default"]
        elif provider_lower == "smallest_ai":
            rate = self.TTS_RATES["smallest_ai"]
        elif provider_lower == "openai":
            rate = self.TTS_RATES["openai"]
        else:
            logger.warning(f"Unknown TTS provider: {provider}, using ElevenLabs rate")
            rate = self.TTS_RATES["eleven_labs"]["default"]
        
        # Cost = (characters / 1000) * rate_per_1000_chars
        cost = (characters / 1000.0) * rate
        return cost
    
    def calculate_stt_cost(
        self,
        duration_minutes: float,
        provider: str,
        model: str
    ) -> float:
        """Calculate STT cost based on audio duration"""
        provider_lower = provider.lower()
        
        if provider_lower == "deepgram":
            rate = self.STT_RATES["deepgram"].get(model, self.STT_RATES["deepgram"]["nova-2"])
        elif provider_lower in ["openai", "gpt-4o-mini-transcribe"]:
            rate = self.STT_RATES["openai"].get(model, self.STT_RATES["openai"]["gpt-4o-mini-transcribe"])
        else:
            logger.warning(f"Unknown STT provider: {provider}, using Deepgram rate")
            rate = self.STT_RATES["deepgram"]["nova-2"]
        
        cost = duration_minutes * rate
        return cost
    
    def calculate_llm_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model_name: str = "gpt-4o-mini"
    ) -> float:
        """Calculate LLM cost based on token usage"""
        # Extract base model name
        model_lower = model_name.lower()
        
        if "gpt-4o-mini" in model_lower:
            rates = self.LLM_RATES["gpt-4o-mini"]
        elif "gpt-4o" in model_lower:
            rates = self.LLM_RATES["gpt-4o"]
        elif "gpt-4-turbo" in model_lower or "gpt-4-1106" in model_lower:
            rates = self.LLM_RATES["gpt-4-turbo"]
        else:
            logger.warning(f"Unknown LLM model: {model_name}, using gpt-4o-mini rate")
            rates = self.LLM_RATES["gpt-4o-mini"]
        
        # Cost = (tokens / 1M) * rate_per_1M_tokens
        input_cost = (input_tokens / 1_000_000) * rates["input"]
        output_cost = (output_tokens / 1_000_000) * rates["output"]
        
        return input_cost + output_cost
    
    def calculate_total_cost(
        self,
        call_duration_seconds: int,
        tts_provider: str,
        tts_model_id: str,
        stt_provider: str,
        stt_model: str,
        llm_model: str,
        calling_provider: str = "voxsun"
    ) -> CostBreakdown:
        """
        Calculate total cost for a call
        
        Args:
            call_duration_seconds: Total call duration
            tts_provider: TTS provider name
            tts_model_id: TTS model ID
            stt_provider: STT provider name
            stt_model: STT model name
            llm_model: LLM model name
            calling_provider: Calling provider (twilio/voxsun)
        
        Returns:
            CostBreakdown with detailed costs
        """
        duration_minutes = call_duration_seconds / 60.0
        
        # Calculate individual costs
        calling_cost = self.calculate_calling_cost(duration_minutes, calling_provider)
        tts_cost = self.calculate_tts_cost(self.tts_chars_sent, tts_provider, tts_model_id)
        stt_cost = self.calculate_stt_cost(duration_minutes, stt_provider, stt_model)
        llm_cost = self.calculate_llm_cost(self.llm_input_tokens, self.llm_output_tokens, llm_model)
        
        total = calling_cost + tts_cost + stt_cost + llm_cost
        
        breakdown = CostBreakdown(
            calling_provider_cost=calling_cost,
            tts_cost=tts_cost,
            stt_cost=stt_cost,
            llm_cost=llm_cost,
            total_cost=total
        )
        
        logger.info(f"💰 Cost breakdown: Calling=${calling_cost:.4f}, TTS=${tts_cost:.4f}, "
                   f"STT=${stt_cost:.4f}, LLM=${llm_cost:.4f}, Total=${total:.4f}")
        
        return breakdown
    
    def get_usage_stats(self) -> Dict:
        """Get current usage statistics"""
        return {
            "tts_characters": self.tts_chars_sent,
            "stt_minutes": round(self.stt_minutes, 2),
            "llm_input_tokens": self.llm_input_tokens,
            "llm_output_tokens": self.llm_output_tokens
        }
