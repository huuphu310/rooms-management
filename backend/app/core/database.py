from supabase import create_client, Client
from typing import Optional
from .config import settings
import logging
from sqlalchemy.ext.declarative import declarative_base

# SQLAlchemy Base for model definitions (even though we use Supabase)
Base = declarative_base()

logger = logging.getLogger(__name__)

class SupabaseDB:
    _client: Optional[Client] = None
    _service_client: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Get Supabase client with anon key for regular operations"""
        if cls._client is None:
            cls._client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_KEY
            )
            logger.info("Supabase client initialized")
        return cls._client
    
    @classmethod
    def get_service_client(cls) -> Client:
        """Get Supabase client with service key for admin operations"""
        if cls._service_client is None:
            cls._service_client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_SERVICE_KEY
            )
            logger.info("Supabase service client initialized")
        return cls._service_client
    
    @classmethod
    def close(cls):
        """Close database connections"""
        cls._client = None
        cls._service_client = None

def get_supabase() -> Client:
    """Dependency to get Supabase client"""
    return SupabaseDB.get_client()

def get_supabase_service() -> Client:
    """Dependency to get Supabase service client"""
    return SupabaseDB.get_service_client()

# Alias for backward compatibility
get_db = get_supabase

async def init_database():
    """Initialize database on startup"""
    try:
        client = SupabaseDB.get_client()
        # Test connection
        response = client.table("rooms").select("id").limit(1).execute()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise

async def close_database():
    """Close database connections on shutdown"""
    SupabaseDB.close()
    logger.info("Database connections closed")