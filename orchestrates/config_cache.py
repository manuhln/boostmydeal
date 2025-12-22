"""
PERFORMANCE OPTIMIZATION MODULE
High-performance configuration caching system to reduce latency in telephony operations.
"""

from functools import lru_cache
from typing import Dict, Any, Optional, Tuple
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

class ConfigCache:
    """
    High-performance configuration cache for telephony settings.
    Reduces repeated parsing and object creation overhead.
    """
    
    def __init__(self, max_size: int = 256):
        self._cache = {}
        self._max_size = max_size
        self._hit_count = 0
        self._miss_count = 0
    
    def _generate_key(self, config_data: Dict[str, Any]) -> str:
        """Generate cache key from configuration data."""
        config_str = json.dumps(config_data, sort_keys=True)
        return hashlib.md5(config_str.encode()).hexdigest()
    
    def get_transcriber_config(self, stt_config: Dict[str, Any], language: str) -> Optional[Any]:
        """Get cached transcriber configuration."""
        cache_key = f"transcriber_{self._generate_key({**stt_config, 'language': language})}"
        
        if cache_key in self._cache:
            self._hit_count += 1
            return self._cache[cache_key]
        
        self._miss_count += 1
        return None
    
    def set_transcriber_config(self, stt_config: Dict[str, Any], language: str, config_obj: Any) -> None:
        """Cache transcriber configuration."""
        cache_key = f"transcriber_{self._generate_key({**stt_config, 'language': language})}"
        
        if len(self._cache) >= self._max_size:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
        
        self._cache[cache_key] = config_obj
    
    def get_agent_config_hash(self, agent_data: Dict[str, Any]) -> str:
        """Get hash for agent configuration to enable caching."""
        return self._generate_key(agent_data)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        total_requests = self._hit_count + self._miss_count
        hit_rate = (self._hit_count / total_requests * 100.0) if total_requests > 0 else 0.0
        
        return {
            'hits': self._hit_count,
            'misses': self._miss_count,
            'hit_rate': float(round(hit_rate * 100) / 100),
            'cache_size': len(self._cache)
        }

# Global cache instance
config_cache = ConfigCache()

@lru_cache(maxsize=128)
def get_optimized_transcriber_config(api_key: str, language: str, tier: str = "nova") -> Any:
    """
    Cached transcriber configuration builder.
    Reduces object creation overhead for repeated configurations.
    """
    from vocode.streaming.models.transcriber import DeepgramTranscriberConfig, TimeEndpointingConfig
    from vocode.streaming.models.synthesizer import AudioEncoding
    
    return DeepgramTranscriberConfig(
        sampling_rate=8000,
        chunk_size=8000,  # Add required chunk_size parameter
        audio_encoding=AudioEncoding.MULAW,
        api_key=api_key,
        tier=tier,
        version="latest",
        model="nova",
        language=language if isinstance(language, str) else language[0] if language else "en",
        endpointing_config=TimeEndpointingConfig(time_cutoff_seconds=1.0)  # Reduced sensitivity to prevent premature silence detection
    )

@lru_cache(maxsize=64)  
def get_optimized_agent_actions(transfer_enabled: bool, transfer_number: Optional[str] = None) -> Tuple:
    """
    Cached agent actions configuration.
    Returns tuple for hashability in LRU cache.
    """
    from vocode.streaming.action.end_conversation import EndConversationVocodeActionConfig
    from vocode.streaming.action.transfer_call import TransferCallVocodeActionConfig
    
    actions = []
    
    if transfer_enabled and transfer_number:
        actions.append(TransferCallVocodeActionConfig(phone_number=transfer_number))
    
    actions.append(EndConversationVocodeActionConfig())
    
    return tuple(actions)

def log_cache_stats():
    """Log cache performance statistics."""
    stats = config_cache.get_stats()
    logger.info(f"⚡ Config cache stats: {stats['hit_rate']}% hit rate, {stats['cache_size']} entries")