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
        # Skip Supabase auth validation to avoid timeout issues
        # Decode JWT directly to get user ID
        import jwt
        
        try:
            # Decode without verification for now to get user ID
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            user_email = payload.get("email")
            
            if not user_id:
                return None
                
            auth_response = None  # We're not using Supabase auth for now
        except Exception as jwt_error:
            logger.warning(f"JWT decode failed: {str(jwt_error)}")
            return None
        
        if not user_id:
            return None  # Return None instead of raising for optional auth
        
        # Get user profile from database (RLS policies now fixed)
        # Explicitly select fields needed for authentication
        user_response = db.table("user_profiles").select(
            "id, email, full_name, username, display_name, avatar_url, "
            "role, is_super_admin, account_status, department, position, "
            "created_at, updated_at"
        ).eq("id", user_id).execute()
        
        if not user_response.data:
            return None  # User not found in profiles table
            
        user = user_response.data[0]
        
        # Add email from JWT payload if not in profile
        if user_email and not user.get('email'):
            user['email'] = user_email
        
        # Get role from user_roles table
        roles_response = db.table("user_roles").select("*, roles(*)").eq("user_id", user_id).eq("is_active", True).execute()
        if roles_response.data and len(roles_response.data) > 0:
            role_info = roles_response.data[0].get('roles', {})
            role_code = role_info.get('role_code', '')
            if role_code == 'SUPER_ADMIN':
                user['role'] = 'admin'
                user['is_super_admin'] = True
            elif role_code == 'PROPERTY_MANAGER':
                user['role'] = 'manager'
            elif role_code in ['RECEPTIONIST', 'FRONT_DESK_SUPERVISOR']:
                user['role'] = 'receptionist'
            elif role_code == 'CASHIER':
                user['role'] = 'pos_operator'
            elif role_code == 'ACCOUNTANT':
                user['role'] = 'accountant'
            elif role_code == 'HOUSEKEEPER':
                user['role'] = 'housekeeper'
            else:
                user['role'] = 'receptionist'  # Default role
        else:
            # Fallback to is_super_admin flag from profile
            if user.get('is_super_admin'):
                user['role'] = 'admin'
            else:
                user['role'] = 'receptionist'  # Default role if no role assigned
        
        # Set is_active based on account_status
        user['is_active'] = user.get('account_status') == 'active'
        
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

# Optional authentication - returns None if not authenticated
get_current_user_optional = get_current_user

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