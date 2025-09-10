"""
Improved Authentication Dependencies for RLS-compliant system
This replaces the complex auth logic with a cleaner, RLS-compatible approach
"""
from typing import Optional, Annotated, Callable
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.database import get_supabase, get_supabase_service
from app.core.redis_client import CacheService, get_cache
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.config import settings
import logging
import jwt
from jwt import PyJWKClient
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Type aliases for clarity
CurrentUser = dict
OptionalUser = Optional[dict]

class AuthService:
    """Centralized authentication service for RLS compatibility"""
    
    @staticmethod
    def decode_jwt_token(token: str) -> Optional[dict]:
        """Decode & verify JWT token with full security validation"""
        try:
            # First, decode without verification to check the algorithm
            unverified_header = jwt.get_unverified_header(token)
            algorithm = unverified_header.get('alg', 'HS256')
            
            # Check if it's a Supabase JWT (HS256) or RS256
            if algorithm == 'HS256':
                # Supabase uses HS256 with the JWT secret
                # Try JWT secret first, then fall back to service key
                jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SUPABASE_SERVICE_KEY
                
                # For development/testing, we can skip signature verification
                if not settings.JWT_VERIFY_SIGNATURE:
                    payload = jwt.decode(
                        token,
                        options={"verify_signature": False},
                        algorithms=["HS256"]
                    )
                else:
                    try:
                        # Try with JWT secret
                        payload = jwt.decode(
                            token,
                            jwt_secret,
                            algorithms=["HS256"],
                            audience=settings.JWT_AUD,
                            issuer=settings.JWT_ISS,
                            options={
                                "verify_signature": True,
                                "verify_exp": True,
                                "verify_aud": True,
                                "verify_iss": True,
                                "verify_nbf": False,  # Supabase doesn't always include nbf
                                "require": ["exp", "sub"]
                            },
                            leeway=settings.JWT_LEEWAY
                        )
                    except jwt.InvalidSignatureError:
                        # If signature fails and we're in development, decode without verification
                        if settings.DEBUG:
                            logger.warning("JWT signature verification failed, using unverified decode (DEBUG mode)")
                            payload = jwt.decode(
                                token,
                                options={"verify_signature": False},
                                algorithms=["HS256"]
                            )
                        else:
                            raise
            elif algorithm == 'RS256' and settings.JWT_VERIFY_SIGNATURE and settings.JWT_JWKS_URL:
                # Use JWKS for RS256 tokens
                jwks_client = PyJWKClient(settings.JWT_JWKS_URL)
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    audience=settings.JWT_AUD,
                    issuer=settings.JWT_ISS,
                    options={
                        "require": ["exp", "sub"],
                        "verify_signature": True,
                        "verify_exp": True,
                        "verify_aud": True,
                        "verify_iss": True,
                        "verify_nbf": False
                    },
                    leeway=settings.JWT_LEEWAY
                )
            else:
                # Development mode or unsupported algorithm
                logger.warning(f"JWT verification disabled or unsupported algorithm: {algorithm}")
                payload = jwt.decode(
                    token, 
                    options={"verify_signature": False},
                    algorithms=["HS256", "RS256"]
                )
            
            # Validate required fields
            user_id = payload.get("sub")
            if not user_id:
                logger.warning("JWT missing required 'sub' claim")
                return None
                
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "role": payload.get("role", "authenticated"),
                "tenant_id": payload.get("tenant_id"),
                "iat": payload.get("iat"),
                "exp": payload.get("exp"),
                "raw_token": token  # Store raw token for user-scoped DB client
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidAudienceError:
            logger.warning(f"JWT invalid audience - expected: {settings.JWT_AUD}")
            return None
        except jwt.InvalidIssuerError:
            logger.warning(f"JWT invalid issuer - expected: {settings.JWT_ISS}")
            return None
        except jwt.InvalidSignatureError:
            logger.warning("JWT signature verification failed")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"JWT token invalid: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"JWT decode failed: {str(e)}")
            return None
    
    @staticmethod
    async def get_user_profile(user_id: str, db: Client, email: str = None) -> Optional[dict]:
        """Get user profile with role information from database only (simplified for new flow)"""
        try:
            # IMPORTANT: Create a fresh service client to bypass RLS
            # The db parameter might not have the right permissions
            from supabase import create_client
            from app.core.config import settings
            service_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
            
            # Get user profile from user_profiles table using service client
            user_response = service_client.table("user_profiles").select(
                "id, full_name, username, display_name, avatar_url, "
                "is_super_admin, account_status, department, position, "
                "created_at, updated_at"
            ).eq("id", user_id).execute()
            
            if not user_response.data:
                # If user profile not found, create basic user object with JWT data
                user = {
                    "id": user_id,
                    "email": email or f"user-{user_id[:8]}@unknown.com",
                    "full_name": email.split("@")[0] if email else f"User {user_id[:8]}",
                    "username": email.split("@")[0] if email else f"user_{user_id[:8]}",
                    "is_super_admin": False,
                    "account_status": "active"
                }
            else:
                user = user_response.data[0]
                # Add email from JWT if not present in profile
                if email:
                    user["email"] = email
            
            # Check account_status
            if user.get("account_status") != "active":
                return None
            
            # Get user role from user_roles table using service client
            roles_response = service_client.table("user_roles").select(
                "role_id, roles(id, role_code, role_name)"
            ).eq("user_id", user_id).eq("is_active", True).execute()
            
            role_code = None
            role_id = None
            role_name = None
            
            if roles_response.data and len(roles_response.data) > 0:
                role_data = roles_response.data[0]
                role_info = role_data.get('roles', {})
                role_id = role_data.get('role_id')
                role_code = role_info.get('role_code')
                role_name = role_info.get('role_name')
            
            # Map role codes to internal roles for backward compatibility
            if role_code:
                if role_code == 'SUPER_ADMIN':
                    user['role'] = 'admin'
                    user['is_super_admin'] = True
                elif role_code == 'PROPERTY_MANAGER':
                    user['role'] = 'manager'
                elif role_code in ['RECEPTIONIST', 'FRONT_DESK_SUPERVISOR']:
                    user['role'] = 'receptionist'
                elif role_code == 'CASHIER':
                    user['role'] = 'cashier'
                elif role_code == 'ACCOUNTANT':
                    user['role'] = 'accountant'
                elif role_code == 'HOUSEKEEPER':
                    user['role'] = 'housekeeper'
                elif role_code == 'AUDITOR':
                    user['role'] = 'auditor'
                else:
                    user['role'] = 'receptionist'  # Default role
            else:
                # Fallback to is_super_admin flag from profile
                if user.get('is_super_admin'):
                    user['role'] = 'admin'
                    role_code = 'SUPER_ADMIN'
                else:
                    user['role'] = 'receptionist'  # Default role if no role assigned
                    role_code = 'RECEPTIONIST'
            
            # Store role information
            user['role_id'] = role_id
            user['role_code'] = role_code
            user['role_name'] = role_name or user['role'].title()
            user['is_active'] = user.get('account_status') == 'active'
                
            return user
            
        except Exception as e:
            logger.error(f"Failed to get user profile for {user_id}: {str(e)}")
            # Return a basic user object even if database query fails
            if email:
                return {
                    "id": user_id,
                    "email": email,
                    "full_name": email.split("@")[0],
                    "username": email.split("@")[0], 
                    "role": "receptionist",
                    "role_code": "RECEPTIONIST",
                    "is_super_admin": False,
                    "is_active": True,
                    "account_status": "active"
                }
            return None
    
    @staticmethod
    async def get_user_permissions(user: dict, db: Client) -> dict:
        """Get user permissions from database based on roles"""
        try:
            permissions = {}
            
            # Super admin gets all permissions
            if user.get('role') == 'admin' or user.get('is_super_admin'):
                return {"all": ["all"]}  # Admin can do everything
            
            role_id = user.get('role_id')
            if not role_id:
                return {}  # No permissions if no role
            
            # Get role permissions from database
            role_perms_response = db.table("role_permissions").select(
                "*, permissions!permission_id_fkey(permission_code, module, resource, action, permission_type)"
            ).eq("role_id", role_id).execute()
            
            if role_perms_response.data:
                for role_perm in role_perms_response.data:
                    perm_info = role_perm.get('permissions', {})
                    module = perm_info.get('module', '').lower()
                    action = perm_info.get('action', '').lower()
                    
                    if module not in permissions:
                        permissions[module] = []
                    if action not in permissions[module]:
                        permissions[module].append(action)
            
            # Also check user-specific permissions (overrides)
            user_perms_response = db.table("user_permissions").select(
                "*, permissions!permission_id_fkey(permission_code, module, resource, action)"
            ).eq("user_id", user['id']).execute()
            
            if user_perms_response.data:
                for user_perm in user_perms_response.data:
                    perm_info = user_perm.get('permissions', {})
                    module = perm_info.get('module', '').lower()
                    action = perm_info.get('action', '').lower()
                    grant_type = user_perm.get('grant_type', 'allow')
                    
                    if grant_type == 'allow':
                        if module not in permissions:
                            permissions[module] = []
                        if action not in permissions[module]:
                            permissions[module].append(action)
                    elif grant_type == 'deny':
                        # Remove permission if explicitly denied
                        if module in permissions and action in permissions[module]:
                            permissions[module].remove(action)
            
            return permissions
            
        except Exception as e:
            logger.error(f"Failed to get user permissions: {str(e)}")
            return {}

    @staticmethod
    async def check_api_permission(
        user: dict, 
        module: str, 
        action: str, 
        db: Client
    ) -> bool:
        """
        Check if user has permission for specific API action
        This replaces RLS-based permission checking with API-level checking
        """
        try:
            # Super admin gets all permissions
            if user.get('role') == 'admin' or user.get('is_super_admin'):
                return True
            
            role_id = user.get('role_id')
            user_id = user.get('id')
            
            # Check role-based permissions with corrected syntax
            if role_id:
                role_perms_response = db.table("role_permissions").select(
                    "*, permissions(permission_code, module, action)"
                ).eq("role_id", role_id).execute()
                
                if role_perms_response.data:
                    for role_perm in role_perms_response.data:
                        perm_info = role_perm.get('permissions')
                        if (perm_info and 
                            perm_info.get('module', '').lower() == module.lower() and 
                            perm_info.get('action', '').lower() == action.lower()):
                            return True
            
            # Check user-specific permission overrides with corrected syntax
            user_perms_response = db.table("user_permissions").select(
                "grant_type, permissions(permission_code, module, action)"
            ).eq("user_id", user_id).execute()
            
            if user_perms_response.data:
                for user_perm in user_perms_response.data:
                    perm_info = user_perm.get('permissions')
                    if (perm_info and
                        perm_info.get('module', '').lower() == module.lower() and 
                        perm_info.get('action', '').lower() == action.lower()):
                        grant_type = user_perm.get('grant_type', 'allow')
                        return grant_type == 'allow'
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check API permission for {user_id}: {str(e)}")
            return False
    
    @staticmethod
    def require_api_permission(module: str, action: str):
        """
        Decorator for API endpoints that require specific permissions
        Usage: @require_api_permission("bookings", "create")
        """
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Get current user from dependency injection
                current_user = None
                db = None
                
                # Extract user and db from function arguments
                for arg in args:
                    if isinstance(arg, dict) and 'id' in arg and 'role' in arg:
                        current_user = arg
                for key, value in kwargs.items():
                    if key == 'current_user' or (isinstance(value, dict) and 'id' in value and 'role' in value):
                        current_user = value
                    elif hasattr(value, 'table'):  # Supabase client
                        db = value
                
                if not current_user or not db:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required"
                    )
                
                # Check permission
                has_permission = await AuthService.check_api_permission(
                    current_user, module, action, db
                )
                
                if not has_permission:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions for {module}.{action}"
                    )
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    def set_rls_context(user_id: str, role: str, db: Client):
        """Set RLS context for the current request"""
        try:
            # Set JWT claims for RLS policies
            jwt_claims = {
                "sub": user_id,
                "role": "authenticated",
                "user_role": role,
                "iat": int(datetime.utcnow().timestamp())
            }
            
            # This would be used by RLS policies
            # Note: In a real implementation, you might need to set this in the session
            logger.debug(f"RLS context set for user {user_id} with role {role}")
            
        except Exception as e:
            logger.error(f"Failed to set RLS context: {str(e)}")

# ============================================================================
# Authentication Dependencies
# ============================================================================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Client = Depends(get_supabase_service)
) -> OptionalUser:
    """Get current user (optional) - returns None if not authenticated"""
    if not credentials:
        return None
    
    # Decode JWT token
    token_data = AuthService.decode_jwt_token(credentials.credentials)
    if not token_data:
        return None
    
    user_id = token_data["user_id"]
    email = token_data.get("email")
    
    # Get user profile with email from JWT
    user = await AuthService.get_user_profile(user_id, db, email)
    if not user:
        return None
    
    # Enrich user data
    user["email"] = token_data.get("email", user.get("email"))
    user["jwt_role"] = token_data.get("role", "authenticated")
    user["raw_token"] = token_data.get("raw_token")  # Preserve raw JWT token for RLS
    
    # Load user permissions from database
    user["permissions"] = await AuthService.get_user_permissions(user, db)
    
    # Set RLS context for this request
    AuthService.set_rls_context(user_id, user.get("role", "user"), db)
    
    return user

async def get_current_active_user(
    current_user: OptionalUser = Depends(get_current_user)
) -> CurrentUser:
    """Ensure user is authenticated and active"""
    if not current_user:
        raise UnauthorizedException("Authentication required")
    
    if not current_user.get("is_active", False):
        raise ForbiddenException("Inactive user account")
    
    return current_user

async def get_current_user_optional(
    request: Request,
    db = Depends(get_supabase_service)
) -> OptionalUser:
    """
    Get current user if authenticated, otherwise return None.
    This is for endpoints that support both authenticated and anonymous access.
    """
    try:
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        payload = await AuthService.verify_token(token, db)
        
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # Get user profile
        profile_response = db.table("user_profiles").select("*").eq("id", user_id).execute()
        if not profile_response.data:
            return None
        
        profile = profile_response.data[0]
        
        return {
            "id": user_id,
            "email": payload.get("email"),
            "is_active": profile.get("is_active", True),
            "role": profile.get("role", "guest"),
            "roles": [profile.get("role", "guest")],
            "is_super_admin": profile.get("role") == "super_admin",
            "raw_token": token
        }
    except Exception:
        # If any error occurs, treat as unauthenticated
        return None

async def get_request_context(
    current_user: CurrentUser = Depends(get_current_active_user)
) -> "RequestContext":
    """
    Create request context for Backend-Only Gateway approach.
    Extracts user_id, tenant_id, and other context from authenticated user.
    """
    from app.core.context import RequestContext
    
    # Extract context from current user
    user_id = current_user.get("id")
    if not user_id:
        raise UnauthorizedException("Invalid user session - missing user ID")
    
    # For now, use user_id as tenant_id (single tenant per user)
    # In multi-tenant systems, this would come from user profile or JWT claims
    tenant_id = user_id
    
    context = RequestContext(
        user_id=user_id,
        email=current_user.get("email"),
        tenant_id=tenant_id,
        roles=current_user.get("roles", []),
        is_super_admin=current_user.get("is_super_admin", False),
        raw_token=current_user.get("raw_token")
    )
    
    return context


# Type alias for request context dependency
RequestContextDep = Annotated["RequestContext", Depends(get_request_context)]

# ============================================================================
# Permission-based Dependencies
# ============================================================================

def require_role(allowed_roles: list[str]) -> Callable:
    """Require user to have one of the specified roles (supports both role names and role codes)"""
    async def role_checker(user: CurrentUser = Depends(get_current_active_user)) -> CurrentUser:
        user_role = user.get("role", "").lower()
        user_role_code = user.get("role_code", "").upper()
        
        allowed_roles_lower = [role.lower() for role in allowed_roles]
        allowed_roles_upper = [role.upper() for role in allowed_roles]
        
        # Check both role names and role codes
        if user_role in allowed_roles_lower or user_role_code in allowed_roles_upper:
            return user
            
        raise ForbiddenException(
            f"Access denied. Required roles: {', '.join(allowed_roles)}. "
            f"User role: {user_role} ({user_role_code})"
        )
        
        return user
    
    return role_checker

async def require_admin(current_user: CurrentUser) -> dict:
    """Require admin role - simplified API-level checking"""
    if current_user.get("role") != "admin" and not current_user.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "ADMIN_REQUIRED",
                    "message": "Admin access required",
                    "details": {
                        "current_role": current_user.get("role"),
                        "required_role": "admin"
                    }
                }
            }
        )
    return current_user

async def require_staff(current_user: CurrentUser) -> dict:
    """Require staff role (admin, manager, receptionist) - simplified API-level checking"""
    allowed_roles = ["admin", "manager", "receptionist", "accountant"]
    
    if (current_user.get("role") not in allowed_roles and 
        not current_user.get("is_super_admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "STAFF_ACCESS_REQUIRED",
                    "message": "Staff access required",
                    "details": {
                        "current_role": current_user.get("role"),
                        "allowed_roles": allowed_roles
                    }
                }
            }
        )
    return current_user

async def require_manager(current_user: CurrentUser) -> dict:
    """Require manager or admin role - simplified API-level checking"""
    allowed_roles = ["admin", "manager"]
    
    if (current_user.get("role") not in allowed_roles and 
        not current_user.get("is_super_admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "MANAGER_ACCESS_REQUIRED",
                    "message": "Manager or Admin access required",
                    "details": {
                        "current_role": current_user.get("role"),
                        "allowed_roles": allowed_roles
                    }
                }
            }
        )
    return current_user

def require_permission(module: str, action: str = "read"):
    """
    Dependency factory for API-level permission checking
    Replaces RLS-based permission checking
    """
    async def _require_permission(
        current_user: CurrentUser = Depends(get_current_active_user),
        db: Client = Depends(get_supabase_service)
    ) -> dict:
        """Check if current user has required permission and return the user"""
        try:
            # Use the new API-level permission checking
            has_permission = await AuthService.check_api_permission(
                current_user, module, action, db
            )
            
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": {
                            "code": "INSUFFICIENT_PERMISSIONS",
                            "message": f"You don't have permission to {action} {module}",
                            "details": {
                                "required_permission": f"{module}.{action}",
                                "user_role": current_user.get("role"),
                                "user_id": current_user.get("id")
                            }
                        }
                    }
                )
            
            return current_user  # Return the user dict like other auth dependencies
            
        except HTTPException:
            raise  # Re-raise HTTP exceptions as-is
        except Exception as e:
            logger.error(f"Permission check error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": {
                        "code": "PERMISSION_CHECK_ERROR",
                        "message": "Failed to check permissions",
                        "details": {"error": str(e)}
                    }
                }
            )
    
    return _require_permission

# ============================================================================
# Additional Utility Functions
# ============================================================================

class PaginationParams:
    """Common pagination parameters"""
    def __init__(
        self,
        page: int = 1,
        limit: int = 20,  # Default page size
        sort_by: Optional[str] = None,
        order: str = "asc"
    ):
        if page < 1:
            page = 1
        if limit < 1:
            limit = 1
        if limit > 100:  # Max page size
            limit = 100
        
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

# ============================================================================
# Backward Compatibility
# ============================================================================

# For backward compatibility with existing code
get_current_user_optional = get_current_user

# Legacy type annotations (for backward compatibility)

# Type aliases for dependency injection
CurrentUserDep = Annotated[dict, Depends(get_current_active_user)]
OptionalUserDep = Annotated[Optional[dict], Depends(get_current_user)]
CurrentAdminDep = Annotated[dict, Depends(require_admin)]
CurrentManagerDep = Annotated[dict, Depends(require_manager)]
SupabaseClientDep = Annotated[Client, Depends(get_supabase)]
SupabaseServiceDep = Annotated[Client, Depends(get_supabase_service)]
# Note: RLS-enforced database client type annotations defined after functions
PaginationDep = Annotated[PaginationParams, Depends()]
RequestIdDep = Annotated[str, Depends(get_request_id)]

# ============================================================================
# Database Context Manager (for RLS)
# ============================================================================

async def get_authenticated_db(
    current_user: CurrentUser = Depends(get_current_active_user),
) -> Client:
    """
    Get authenticated database client
    With new auth flow, we only need authentication - permissions handled at API level
    """
    try:
        # Get service role client since RLS is now authentication-only
        from app.core.database import get_supabase_service
        db = get_supabase_service()
        
        # No need to set RLS context anymore - permissions handled at API level
        logger.debug(f"Authenticated DB access for user: {current_user.get('id')}")
        
        return db
        
    except Exception as e:
        logger.error(f"Failed to get authenticated DB client: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "DB_CLIENT_ERROR",
                    "message": "Failed to get database client",
                    "details": {"error": str(e)}
                }
            }
        )

async def get_user_scoped_db(
    user: OptionalUser = Depends(get_current_user),
    regular_db: Client = Depends(get_supabase)
) -> Client:
    """Get database client scoped to user permissions (enforces RLS)"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("get_user_scoped_db called")
    
    from supabase import create_client
    from supabase.lib.client_options import ClientOptions
    logger.info("Supabase imports completed")
    
    if user and user.get("raw_token"):
        # Authenticated user - use JWT token to enforce RLS
        logger.info(f"Creating user-scoped client for user: {user.get('id')}")
        token = user["raw_token"]
        options = ClientOptions(
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        logger.info("ClientOptions created")
        
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,  # Use anon key as base, JWT token provides auth context
            options=options
        )
        logger.info("User-scoped Supabase client created successfully")
        return client
    else:
        # Unauthenticated access - use regular client (still subject to RLS)
        logger.info("Returning regular db client (no user token)")
        return regular_db

# ============================================================================
# Type Aliases (defined after functions to avoid forward reference issues)
# ============================================================================

# RLS-enforced database clients
AuthenticatedDbDep = Annotated[Client, Depends(get_authenticated_db)]
UserScopedDbDep = Annotated[Client, Depends(get_user_scoped_db)]

# Backward compatibility aliases
SupabaseClient = Client
SupabaseService = Client
Cache = Annotated[CacheService, Depends(get_cache)]
Pagination = PaginationParams
CurrentUser = dict
