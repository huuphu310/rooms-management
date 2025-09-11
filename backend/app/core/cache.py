"""
Cache service for managing Redis caching operations
"""
import json
import redis
from typing import Optional, Any, Dict, List
from datetime import timedelta
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Service for managing cache operations with Redis"""
    
    def __init__(self):
        self.redis_client = None
        self.default_ttl = 300  # 5 minutes default TTL
        self.permission_ttl = 600  # 10 minutes for permissions
        self._connect()
    
    def _connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Cache will be disabled.")
            self.redis_client = None
    
    def _is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._is_connected():
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        if not self._is_connected():
            return False
        
        try:
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self._is_connected():
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self._is_connected():
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    # Permission-specific methods
    def get_user_permissions(self, user_id: str) -> Optional[Dict]:
        """Get cached user permissions"""
        key = f"permissions:user:{user_id}"
        return self.get(key)
    
    def set_user_permissions(self, user_id: str, permissions: Dict) -> bool:
        """Cache user permissions"""
        key = f"permissions:user:{user_id}"
        return self.set(key, permissions, self.permission_ttl)
    
    def invalidate_user_permissions(self, user_id: str) -> bool:
        """Invalidate cached permissions for a specific user"""
        key = f"permissions:user:{user_id}"
        return self.delete(key)
    
    def invalidate_all_permissions(self) -> int:
        """Invalidate all cached permissions (use when roles/permissions change)"""
        return self.delete_pattern("permissions:*")
    
    # Role-specific methods
    def get_role_permissions(self, role_id: str) -> Optional[List]:
        """Get cached permissions for a role"""
        key = f"permissions:role:{role_id}"
        return self.get(key)
    
    def set_role_permissions(self, role_id: str, permissions: List) -> bool:
        """Cache permissions for a role"""
        key = f"permissions:role:{role_id}"
        return self.set(key, permissions, self.permission_ttl)
    
    def invalidate_role_permissions(self, role_id: str) -> bool:
        """Invalidate cached permissions for a role"""
        # Delete the role's permissions
        self.delete(f"permissions:role:{role_id}")
        # Also invalidate all users with this role
        return self.delete_pattern("permissions:user:*") > 0

# Global cache instance
cache_service = CacheService()