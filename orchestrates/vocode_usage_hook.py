"""
Vocode Usage Integration Hook
This module provides hooks to capture real-time usage from Vocode operations
"""
import logging
from unified_cost_tracker import unified_cost_tracker as usage_tracker
from typing import Any, Dict
import inspect

logger = logging.getLogger(__name__)

class VocodeUsageHook:
    """Hook into Vocode operations to track real-time usage"""
    
    def __init__(self):
        self.conversation_to_call_id = {}
    
    def register_call(self, conversation_id: str, call_id: str):
        """Register mapping between Vocode conversation_id and our call_id"""
        self.conversation_to_call_id[conversation_id] = call_id
        logger.info(f"🔗 Registered conversation {conversation_id} -> call {call_id}")
    
    def track_transcription_from_vocode(self, conversation_id: str, audio_duration: float, context: str = "live_transcription"):
        """Called when Vocode processes transcription"""
        call_id = self.conversation_to_call_id.get(conversation_id)
        if call_id:
            usage_tracker.add_transcription_usage(call_id, audio_duration, context)
            logger.debug(f"🎤 Tracked real-time transcription: {audio_duration:.1f}s for call {call_id}")
    
    def track_synthesis_from_vocode(self, conversation_id: str, text_length: int, context: str = "live_synthesis"):
        """Called when Vocode generates speech"""
        call_id = self.conversation_to_call_id.get(conversation_id)
        if call_id:
            usage_tracker.add_synthesis_usage(call_id, text_length, context)
            logger.debug(f"🗣️ Tracked real-time synthesis: {text_length} chars for call {call_id}")
    
    def track_llm_from_vocode(self, conversation_id: str, input_tokens: int, output_tokens: int, context: str = "live_agent_response"):
        """Called when Vocode uses LLM for agent response"""
        call_id = self.conversation_to_call_id.get(conversation_id)
        if call_id:
            usage_tracker.add_llm_usage(call_id, input_tokens, output_tokens, context)
            logger.debug(f"🤖 Tracked real-time LLM: {input_tokens}/{output_tokens} tokens for call {call_id}")
    
    def cleanup_conversation(self, conversation_id: str):
        """Clean up conversation mapping"""
        self.conversation_to_call_id.pop(conversation_id, None)

# Global usage hook instance
vocode_usage_hook = VocodeUsageHook()

# Monkey patch Vocode components to track usage (optional enhancement)
def patch_vocode_usage_tracking():
    """
    Optional: Monkey patch Vocode components to automatically track usage
    This is an advanced integration that hooks into Vocode's internal operations
    """
    try:
        # This would require deeper integration with Vocode's internal APIs
        # For now, we'll rely on estimation from transcripts and manual tracking
        logger.info("🐒 Vocode usage tracking patches would be applied here")
        return True
    except Exception as e:
        logger.warning(f"Could not patch Vocode usage tracking: {e}")
        return False