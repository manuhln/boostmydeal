import os
import socket

# Redis configuration for production deployments
# Default to port 6379 as required by Vocode documentation
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

def is_redis_available(host="localhost", port=6379):
    """Check if Redis is available and accessible."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

# Check Redis availability and initialize appropriate config manager
if is_redis_available():
    from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
    os.environ["REDIS_URL"] = REDIS_URL
    config_manager = RedisConfigManager()
    print(f"✅ Redis configuration manager initialized: {REDIS_URL}")
else:
    from vocode.streaming.telephony.config_manager.in_memory_config_manager import InMemoryConfigManager
    config_manager = InMemoryConfigManager()
    print("⚠️ Redis not available - using InMemory configuration for development")
