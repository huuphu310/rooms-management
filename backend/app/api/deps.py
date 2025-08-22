from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.database import get_supabase, get_supabase_service, get_db
from app.core.redis_client import CacheService, get_cache
from app.core.security import SecurityService, check_permission
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Client = Depends(get_supabase_service)
) -> Optional[dict]:
    """Get current authenticated user - returns None if no auth provided"""
    if not credentials:
        return None
        
    token = credentials.credentials
    
    try:
        # Try to get user from Supabase auth
        service_client = db
        auth_response = service_client.auth.get_user(token)
        
        if not auth_response or not auth_response.user:
            # If Supabase auth fails, try our own JWT validation
            try:
                payload = SecurityService.verify_token(token, "access")
                user_id = payload.get("sub")
            except:
                return None  # Return None instead of raising for optional auth
        else:
            # Use Supabase user ID
            user_id = auth_response.user.id
        
        if not user_id:
            return None  # Return None instead of raising for optional auth
        
        # Get user from database
        response = db.table("user_profiles").select("*").eq("id", user_id).single().execute()
        
        if not response.data:
            # Create default admin user if it doesn't exist and email matches
            if auth_response and auth_response.user and auth_response.user.email == "admin@homestay.com":
                user_data = {
                    "id": user_id,
                    "email": "admin@homestay.com",
                    "full_name": "System Administrator",
                    "role": "admin",
                    "is_active": True
                }
                response = db.table("user_profiles").insert(user_data).execute()
                if response.data:
                    user = response.data[0]
                else:
                    return None  # Return None instead of raising for optional auth
            else:
                # For any other user, create a default profile
                if auth_response and auth_response.user:
                    user_data = {
                        "id": user_id,
                        "email": auth_response.user.email,
                        "full_name": auth_response.user.email.split('@')[0],
                        "role": "receptionist",  # Default role
                        "is_active": True
                    }
                    response = db.table("user_profiles").insert(user_data).execute()
                    if response.data:
                        user = response.data[0]
                    else:
                        return None
                else:
                    return None
        else:
            user = response.data
        
        # Check if user is active
        if not user.get("is_active", False):
            return None  # Return None instead of raising for optional auth
        
        return user
        
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        return None

async def get_current_active_user(
    current_user: Optional[dict] = Depends(get_current_user)
) -> dict:
    """Ensure user is active and authenticated"""
    if not current_user:
        raise UnauthorizedException("Authentication required")
    if not current_user.get("is_active", False):
        raise ForbiddenException("Inactive user")
    return current_user

def require_permission(module: str, action: str):
    """Decorator to check user permissions"""
    async def permission_checker(
        current_user: dict = Depends(get_current_active_user)
    ):
        role = current_user.get("role")
        if not role:
            raise ForbiddenException("User role not defined")
        
        if not check_permission(role, module, action):
            raise ForbiddenException(
                f"Permission denied: {action} on {module}"
            )
        
        return current_user
    
    return permission_checker

def require_admin():
    """Require admin role"""
    async def admin_checker(
        current_user: dict = Depends(get_current_active_user)
    ):
        if current_user.get("role") != "admin":
            raise ForbiddenException("Admin access required")
        return current_user
    
    return admin_checker

def require_manager():
    """Require manager or admin role"""
    async def manager_checker(
        current_user: dict = Depends(get_current_active_user)
    ):
        if current_user.get("role") not in ["admin", "manager"]:
            raise ForbiddenException("Manager access required")
        return current_user
    
    return manager_checker

class PaginationParams:
    """Common pagination parameters"""
    def __init__(
        self,
        page: int = 1,
        limit: int = settings.DEFAULT_PAGE_SIZE,
        sort_by: Optional[str] = None,
        order: str = "asc"
    ):
        if page < 1:
            page = 1
        if limit < 1:
            limit = 1
        if limit > settings.MAX_PAGE_SIZE:
            limit = settings.MAX_PAGE_SIZE
        
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit
        self.sort_by = sort_by
        self.order = order.lower() if order.lower() in ["asc", "desc"] else "asc"

async def get_request_id(
    x_request_id: Annotated[Optional[str], Header()] = None
) -> str:
    """Get or generate request ID"""
    import uuid
    return x_request_id or str(uuid.uuid4())

# Type aliases for dependency injection
CurrentUser = Annotated[dict, Depends(get_current_active_user)]
OptionalUser = Annotated[Optional[dict], Depends(get_current_user)]
CurrentAdmin = Annotated[dict, Depends(require_admin())]
CurrentManager = Annotated[dict, Depends(require_manager())]
SupabaseClient = Annotated[Client, Depends(get_supabase)]
SupabaseService = Annotated[Client, Depends(get_supabase_service)]
Cache = Annotated[CacheService, Depends(get_cache)]
Pagination = Annotated[PaginationParams, Depends()]
RequestId = Annotated[str, Depends(get_request_id)]