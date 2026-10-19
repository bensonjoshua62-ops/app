from cachetools import TTLCache
from functools import wraps
import hashlib
import json

# Cache configuration
# TTLCache: Time-To-Live cache that expires items after specified seconds

# Different caches for different purposes
market_cache = TTLCache(maxsize=100, ttl=60)  # 1 minute TTL for market data
signals_cache = TTLCache(maxsize=50, ttl=300)  # 5 minute TTL for AI signals
user_cache = TTLCache(maxsize=200, ttl=600)  # 10 minute TTL for user data
general_cache = TTLCache(maxsize=500, ttl=120)  # 2 minute TTL for general data


def get_cache_key(*args, **kwargs):
    """Generate a unique cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()


def cached(cache_store, key_prefix=""):
    """Decorator to cache function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{get_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            if cache_key in cache_store:
                return cache_store[cache_key]
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache_store[cache_key] = result
            return result
        return wrapper
    return decorator


def clear_cache(cache_store=None):
    """Clear specified cache or all caches."""
    if cache_store:
        cache_store.clear()
    else:
        market_cache.clear()
        signals_cache.clear()
        user_cache.clear()
        general_cache.clear()


def get_cache_stats():
    """Get statistics about all caches."""
    return {
        "market_cache": {
            "size": len(market_cache),
            "maxsize": market_cache.maxsize,
            "ttl": market_cache.ttl
        },
        "signals_cache": {
            "size": len(signals_cache),
            "maxsize": signals_cache.maxsize,
            "ttl": signals_cache.ttl
        },
        "user_cache": {
            "size": len(user_cache),
            "maxsize": user_cache.maxsize,
            "ttl": user_cache.ttl
        },
        "general_cache": {
            "size": len(general_cache),
            "maxsize": general_cache.maxsize,
            "ttl": general_cache.ttl
        }
    }
