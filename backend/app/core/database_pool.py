"""
Database connection pool for Supabase clients
Prevents creating new clients on every request
"""
from supabase import Client, create_client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabasePool:
    """Singleton pattern for Supabase clients to avoid recreating them"""
    _service_client: Client = None
    _anon_client: Client = None
    
    @classmethod
    def get_service_client(cls) -> Client:
        """Get or create service role client (bypasses RLS)"""
        if cls._service_client is None:
            logger.info("Creating new service client for pool")
            cls._service_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return cls._service_client
    
    @classmethod
    def get_anon_client(cls) -> Client:
        """Get or create anonymous client (respects RLS)"""
        if cls._anon_client is None:
            logger.info("Creating new anon client for pool")
            cls._anon_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
        return cls._anon_client
    
    @classmethod
    def reset(cls):
        """Reset all clients (useful for testing or reconnection)"""
        cls._service_client = None
        cls._anon_client = None
        logger.info("Database pool reset")

# Global instance
db_pool = DatabasePool()