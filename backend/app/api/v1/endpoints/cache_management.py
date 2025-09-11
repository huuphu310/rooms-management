"""
Cache management endpoints for administrative tasks
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Optional
from app.api.deps import (
    get_current_active_user,
    require_admin,
    CurrentUserDep,
    CurrentAdminDep
)
from app.core.redis_client import cache_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cache-management"])

@router.post("/invalidate/permissions/all", 
    summary="Invalidate all permission caches",
    description="Clear all cached permissions. Use when roles or permissions are modified."
)
async def invalidate_all_permissions(
    current_user: CurrentAdminDep
) -> Dict:
    """
    Invalidate all cached permissions
    Only admins can perform this action
    """
    try:
        await cache_service.invalidate_all_permissions()
        logger.info(f"Admin {current_user['id']} invalidated all permission caches")
        
        return {
            "status": "success",
            "message": "All permission caches have been invalidated",
            "performed_by": current_user['id']
        }
    except Exception as e:
        logger.error(f"Failed to invalidate permission caches: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "CACHE_INVALIDATION_FAILED",
                    "message": "Failed to invalidate permission caches",
                    "details": {"error": str(e)}
                }
            }
        )

@router.post("/invalidate/permissions/user/{user_id}",
    summary="Invalidate specific user's permission cache",
    description="Clear cached permissions for a specific user."
)
async def invalidate_user_permissions(
    user_id: str,
    current_user: CurrentAdminDep
) -> Dict:
    """
    Invalidate cached permissions for a specific user
    Only admins can perform this action
    """
    try:
        await cache_service.invalidate_user_permissions(user_id)
        logger.info(f"Admin {current_user['id']} invalidated permission cache for user {user_id}")
        
        return {
            "status": "success",
            "message": f"Permission cache for user {user_id} has been invalidated",
            "performed_by": current_user['id']
        }
    except Exception as e:
        logger.error(f"Failed to invalidate user permission cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "CACHE_INVALIDATION_FAILED",
                    "message": f"Failed to invalidate permission cache for user {user_id}",
                    "details": {"error": str(e)}
                }
            }
        )

@router.post("/invalidate/permissions/role/{role_id}",
    summary="Invalidate permission cache for all users with a role",
    description="Clear cached permissions for all users with a specific role."
)
async def invalidate_role_permissions(
    role_id: str,
    current_user: CurrentAdminDep
) -> Dict:
    """
    Invalidate cached permissions for all users with a specific role
    Only admins can perform this action
    """
    try:
        await cache_service.invalidate_role_permissions(role_id)
        logger.info(f"Admin {current_user['id']} invalidated permission cache for role {role_id}")
        
        return {
            "status": "success",
            "message": f"Permission cache for all users with role {role_id} has been invalidated",
            "performed_by": current_user['id']
        }
    except Exception as e:
        logger.error(f"Failed to invalidate role permission cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "CACHE_INVALIDATION_FAILED",
                    "message": f"Failed to invalidate permission cache for role {role_id}",
                    "details": {"error": str(e)}
                }
            }
        )

@router.post("/invalidate/all",
    summary="Invalidate all caches",
    description="Clear all Redis caches. Use with caution."
)
async def invalidate_all_caches(
    current_user: CurrentAdminDep
) -> Dict:
    """
    Invalidate all caches (not just permissions)
    Only admins can perform this action
    """
    try:
        # Delete all cache keys
        await cache_service.delete_pattern("*")
        logger.info(f"Admin {current_user['id']} invalidated all caches")
        
        return {
            "status": "success",
            "message": "All caches have been invalidated",
            "performed_by": current_user['id']
        }
    except Exception as e:
        logger.error(f"Failed to invalidate all caches: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "CACHE_INVALIDATION_FAILED",
                    "message": "Failed to invalidate all caches",
                    "details": {"error": str(e)}
                }
            }
        )

@router.get("/stats",
    summary="Get cache statistics",
    description="Get information about the cache status and usage."
)
async def get_cache_stats(
    current_user: CurrentAdminDep
) -> Dict:
    """
    Get cache statistics
    Only admins can view cache stats
    """
    try:
        # Check if Redis is connected
        if not cache_service.redis:
            await cache_service.connect()
        
        # Get Redis info
        info = await cache_service.redis.info()
        
        # Count permission cache keys
        permission_keys = []
        async for key in cache_service.redis.scan_iter(match="permissions:*"):
            permission_keys.append(key)
        
        return {
            "status": "connected",
            "redis_version": info.get("redis_version", "unknown"),
            "used_memory": info.get("used_memory_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
            "total_keys": await cache_service.redis.dbsize(),
            "permission_cache_keys": len(permission_keys),
            "uptime_seconds": info.get("uptime_in_seconds", 0)
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {str(e)}")
        return {
            "status": "disconnected",
            "error": str(e)
        }