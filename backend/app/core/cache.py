import time
import asyncio
from typing import Any, Optional
from abc import ABC, abstractmethod
from app.core.config import settings

class BaseCacheProvider(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        pass

class MemoryCacheProvider(BaseCacheProvider):
    """
    轻量级进程内内存缓存，支持 TTL 自动淘汰与并发安全锁
    适合本地极简开发，零外部 Redis 依赖
    """
    def __init__(self):
        self._store = {}
        self._expire = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._expire and time.time() > self._expire[key]:
                del self._store[key]
                del self._expire[key]
                return None
            return self._store.get(key)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        async with self._lock:
            self._store[key] = value
            if ttl is not None and ttl > 0:
                self._expire[key] = time.time() + ttl
            elif key in self._expire:
                del self._expire[key]
            return True

    async def delete(self, key: str) -> bool:
        async with self._lock:
            self._store.pop(key, None)
            self._expire.pop(key, None)
            return True

    async def exists(self, key: str) -> bool:
        async with self._lock:
            if key in self._expire and time.time() > self._expire[key]:
                del self._store[key]
                del self._expire[key]
                return False
            return key in self._store

class RedisCacheProvider(BaseCacheProvider):
    """
    生产级 Redis 缓存适配器
    """
    def __init__(self, redis_url: str):
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(redis_url, decode_responses=True)
        except ImportError:
            self._redis = None

    async def get(self, key: str) -> Optional[Any]:
        if not self._redis:
            return None
        return await self._redis.get(key)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        if not self._redis:
            return False
        if ttl:
            await self._redis.setex(key, ttl, value)
        else:
            await self._redis.set(key, value)
        return True

    async def delete(self, key: str) -> bool:
        if not self._redis:
            return False
        await self._redis.delete(key)
        return True

    async def exists(self, key: str) -> bool:
        if not self._redis:
            return False
        return bool(await self._redis.exists(key))

def get_cache_provider() -> BaseCacheProvider:
    if settings.CACHE_DRIVER.lower() == "redis":
        return RedisCacheProvider(settings.REDIS_URL)
    return MemoryCacheProvider()

cache_client = get_cache_provider()
