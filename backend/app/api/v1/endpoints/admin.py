"""
Admin utilities endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_active_user
from app.core.cache_manager import CacheManager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/clear-cache")
async def clear_cache(
    user: dict = Depends(get_current_active_user)
):
    """
    Clear all application caches
    Only super admins can clear cache
    """
    # Check if user is super admin
    if not user.get("is_super_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can clear cache"
        )
    
    try:
        # Get current cache status
        before_status = CacheManager.get_cache_status()
        
        # Clear all caches
        CacheManager.clear_all_caches()
        
        # Get new cache status
        after_status = CacheManager.get_cache_status()
        
        logger.info(f"Cache cleared by user {user.get('email')}")
        
        return {
            "success": True,
            "message": "All caches cleared successfully",
            "cache_status": {
                "before": before_status,
                "after": after_status
            }
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )

@router.get("/cache-status")
async def get_cache_status(
    user: dict = Depends(get_current_active_user)
):
    """
    Get current cache status
    Only super admins can view cache status
    """
    # Check if user is super admin
    if not user.get("is_super_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view cache status"
        )
    
    try:
        status = CacheManager.get_cache_status()
        return {
            "success": True,
            "cache_status": status
        }
    except Exception as e:
        logger.error(f"Error getting cache status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache status: {str(e)}"
        )