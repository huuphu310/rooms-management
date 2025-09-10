"""
Cache Management Utility
Provides mechanisms to clear various caches in the application
"""
import logging
from typing import Optional
from datetime import datetime
from app.core.database import SupabaseDB

logger = logging.getLogger(__name__)

class CacheManager:
    """Manages application caches"""
    
    _last_cleared: Optional[datetime] = None
    
    @classmethod
    def clear_database_cache(cls) -> None:
        """Clear Supabase client cache"""
        try:
            SupabaseDB._client = None
            SupabaseDB._service_client = None
            logger.info("Database client cache cleared")
        except Exception as e:
            logger.error(f"Error clearing database cache: {str(e)}")
    
    @classmethod
    def clear_all_caches(cls) -> None:
        """Clear all application caches"""
        cls.clear_database_cache()
        cls._last_cleared = datetime.now()
        # Add other cache clearing methods here as needed
        logger.info("All caches cleared")
    
    @classmethod
    def get_cache_status(cls) -> dict:
        """Get current cache status"""
        return {
            "database": {
                "client_cached": SupabaseDB._client is not None,
                "service_client_cached": SupabaseDB._service_client is not None
            },
            "last_cleared": cls._last_cleared.isoformat() if cls._last_cleared else None
        }