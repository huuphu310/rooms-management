import redis.asyncio as redis
from typing import Optional
from .config import settings
import json
import logging
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger(__name__)

class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle UUID and other types"""
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

class RedisClient:
    _redis: Optional[redis.Redis] = None
    
    @classmethod
    async def get_redis(cls) -> redis.Redis:
        """Get Redis client instance"""
        if cls._redis is None:
            cls._redis = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Redis client initialized")
        return cls._redis
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._redis:
            await cls._redis.close()
            cls._redis = None
            logger.info("Redis connection closed")

class CacheService:
    """Service for caching operations"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        self.redis = await RedisClient.get_redis()
    
    async def get(self, key: str) -> Optional[any]:
        """Get value from cache"""
        if not self.redis:
            await self.connect()
        
        value = await self.redis.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None
    
    async def set(self, key: str, value: any, expire: int = 300):
        """Set value in cache with expiration (default 5 minutes)"""
        if not self.redis:
            await self.connect()
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value, cls=JSONEncoder)
        
        await self.redis.setex(key, expire, value)
    
    async def delete(self, key: str):
        """Delete key from cache"""
        if not self.redis:
            await self.connect()
        
        await self.redis.delete(key)
    
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        if not self.redis:
            await self.connect()
        
        async for key in self.redis.scan_iter(match=pattern):
            await self.redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis:
            await self.connect()
        
        return await self.redis.exists(key) > 0
    
    # Permission-specific methods
    async def get_user_permissions(self, user_id: str) -> Optional[dict]:
        """Get cached user permissions"""
        key = f"permissions:user:{user_id}"
        return await self.get(key)
    
    async def set_user_permissions(self, user_id: str, permissions: dict, expire: int = 600):
        """Cache user permissions (default 10 minutes)"""
        key = f"permissions:user:{user_id}"
        await self.set(key, permissions, expire)
    
    async def invalidate_user_permissions(self, user_id: str):
        """Invalidate cached permissions for a specific user"""
        key = f"permissions:user:{user_id}"
        await self.delete(key)
    
    async def invalidate_all_permissions(self):
        """Invalidate all cached permissions (use when roles/permissions change)"""
        await self.delete_pattern("permissions:*")
    
    async def invalidate_role_permissions(self, role_id: str):
        """Invalidate cached permissions for all users with a specific role"""
        # For now, invalidate all user permissions
        # In future, could track which users have which roles
        await self.delete_pattern("permissions:user:*")

# Global cache service instance
cache_service = CacheService()

async def get_cache() -> CacheService:
    """Dependency to get cache service"""
    return cache_service