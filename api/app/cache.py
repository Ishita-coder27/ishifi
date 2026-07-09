"""Tier 6: Distributed caching layer with Redis fallback."""

import json
import hashlib
from datetime import timedelta
from cachetools import TTLCache
from functools import wraps

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Local in-memory cache fallback (for development)
local_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL
redis_client = None


def init_redis(redis_url: str = "redis://localhost:6379/0"):
    """Initialize Redis connection"""
    global redis_client
    if REDIS_AVAILABLE:
        try:
            redis_client = redis.from_url(redis_url, decode_responses=True)
            redis_client.ping()
            print("[Cache] Redis connected")
            return True
        except Exception as e:
            print(f"[Cache] Redis unavailable: {e}. Using in-memory cache.")
            redis_client = None
    return False


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from function args"""
    key_parts = list(args) + [f"{k}={v}" for k, v in sorted(kwargs.items())]
    key_str = "|".join(str(p) for p in key_parts)
    return hashlib.md5(key_str.encode()).hexdigest()


async def get_from_cache(key: str):
    """Get value from cache (Redis or local)"""
    if redis_client:
        try:
            val = redis_client.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            print(f"[Cache] Redis get failed: {e}")
    return local_cache.get(key)


async def set_in_cache(key: str, value, ttl: int = 3600):
    """Set value in cache with TTL"""
    try:
        val_str = json.dumps(value)
        if redis_client:
            redis_client.setex(key, ttl, val_str)
        else:
            local_cache[key] = value
    except Exception as e:
        print(f"[Cache] Set cache failed: {e}")


async def delete_from_cache(key: str):
    """Delete key from cache"""
    try:
        if redis_client:
            redis_client.delete(key)
        else:
            local_cache.pop(key, None)
    except Exception as e:
        print(f"[Cache] Delete cache failed: {e}")


async def flush_cache():
    """Clear all cache"""
    try:
        if redis_client:
            redis_client.flushdb()
        else:
            local_cache.clear()
    except Exception as e:
        print(f"[Cache] Flush cache failed: {e}")


def cached(ttl: int = 3600):
    """Decorator for caching async functions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{cache_key(*args, **kwargs)}"

            # Try to get from cache
            cached_val = await get_from_cache(key)
            if cached_val is not None:
                return cached_val

            # Call function and cache result
            result = await func(*args, **kwargs)
            await set_in_cache(key, result, ttl)
            return result

        return wrapper
    return decorator


# Cache invalidation helpers
async def invalidate_user_cache(user_id: int):
    """Invalidate all cache for a user"""
    if redis_client:
        try:
            # Delete all keys matching user_id pattern
            pattern = f"*user_id:{user_id}*"
            for key in redis_client.scan_iter(match=pattern):
                redis_client.delete(key)
        except Exception as e:
            print(f"[Cache] Invalidate user failed: {e}")


async def invalidate_user_transactions(user_id: int):
    """Invalidate transaction cache for user"""
    patterns = [
        f"*transactions*user_id:{user_id}*",
        f"*dashboard*user_id:{user_id}*",
        f"*analytics*user_id:{user_id}*",
    ]
    if redis_client:
        try:
            for pattern in patterns:
                for key in redis_client.scan_iter(match=pattern):
                    redis_client.delete(key)
        except Exception as e:
            print(f"[Cache] Invalidate transactions failed: {e}")
