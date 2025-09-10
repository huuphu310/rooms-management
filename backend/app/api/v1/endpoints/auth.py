from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import (
    get_current_active_user,
    get_authenticated_db,
    UserScopedDbDep,
    AuthenticatedDbDep,
    SupabaseServiceDep
)
from app.core.database import get_supabase_service
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    LogoutRequest
)
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: SupabaseServiceDep):
    """Login with email and password"""
    try:
        # Debug: Check if we're using service client
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Auth endpoint - client type: {type(db)}")
        logger.info(f"Auth endpoint - has service role: {'service_role' in str(getattr(db, 'supabase_key', ''))}")
        result = await AuthService.login_with_email_password(
            login_data.email, 
            login_data.password,
            db
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.get("error", "Login failed")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(refresh_data: RefreshTokenRequest, db: SupabaseServiceDep):
    """Refresh access token using refresh token"""
    try:
        result = await AuthService.refresh_token(refresh_data.refresh_token, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/logout")
async def logout(logout_data: LogoutRequest, db: SupabaseServiceDep):
    """Logout user and invalidate token"""
    try:
        result = await AuthService.logout(logout_data.access_token, db)
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}"
        )

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile"""
    # Return user profile information for frontend
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name"),
        "username": current_user.get("username"),
        "role": current_user.get("role", "receptionist"),  # Default role
        "department": current_user.get("department"),
        "position": current_user.get("position"),
        "is_super_admin": current_user.get("is_super_admin", False),
        "account_status": current_user.get("account_status", "active"),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at")
    }

@router.get("/debug-permissions")
async def debug_all_permissions(db: AuthenticatedDbDep):
    """Debug endpoint to see all roles and permissions - PUBLIC for debugging"""
    try:
        
        result = {"debug": True}
        
        # Get all roles
        roles_result = db.table("roles").select("id, role_name").execute()
        result["roles"] = roles_result.data or []
        
        # Get all users and their roles (use public profile view)
        users_result = db.table("v_user_public_profiles").select("id, username, display_name, full_name, avatar_url").limit(5).execute()
        result["users"] = users_result.data or []
        
        # Get role assignments
        assignments_result = db.table("user_roles").select("user_id, role_id, is_active").limit(10).execute()
        result["role_assignments"] = assignments_result.data or []
        
        # Get permissions for Receptionist role specifically
        receptionist_role = None
        for role in roles_result.data:
            if role["role_name"].lower() == "receptionist":
                receptionist_role = role
                break
        
        if receptionist_role:
            perms_result = db.table("role_permissions").select(
                "permissions(permission_code, permission_name)"
            ).eq("role_id", receptionist_role["id"]).execute()
            
            result["receptionist_permissions"] = []
            if perms_result.data:
                for perm in perms_result.data:
                    if perm.get("permissions"):
                        result["receptionist_permissions"].append(perm["permissions"]["permission_code"])
        
        return result
        
    except Exception as e:
        return {"error": str(e), "debug": True}

@router.get("/permissions")
async def get_user_permissions(
    db: SupabaseServiceDep,
    current_user: dict = Depends(get_current_active_user)
):
    """Get current user's effective permissions"""
    try:
        user_id = current_user.get("id")
        
        if not user_id:
            return {
                "user_id": None,
                "effective_permissions": [],
                "debug": "No user_id found"
            }
        
        # Get user's actual permissions from the database
        effective_permissions = []
        
        # Super admin has all permissions
        if current_user.get("is_super_admin"):
            # Return all possible permissions for super admin
            effective_permissions = [
                "dashboard.read",
                "rooms.read", "rooms.create", "rooms.update", "rooms.delete",
                "bookings.read", "bookings.create", "bookings.update", "bookings.delete", 
                "customers.read", "customers.create", "customers.update", "customers.delete",
                "billing.read", "billing.create", "billing.update", "billing.delete",
                "pos.read", "pos.create", "pos.update", "pos.delete",
                "inventory.read", "inventory.create", "inventory.update", "inventory.delete",
                "reports.read", "reports.create", "reports.update", "reports.delete",
                "user_management.read", "user_management.create", "user_management.update", "user_management.delete",
                "buildings.read", "buildings.create", "buildings.update", "buildings.delete",
                "room_allocation.read", "room_allocation.create", "room_allocation.update", "room_allocation.delete"
            ]
        else:
            try:
                # Get user's roles from user_roles table
                user_roles_response = db.table("user_roles").select(
                    "roles(id, role_name)"
                ).eq("user_id", user_id).eq("is_active", True).execute()
                
                if not user_roles_response.data:
                    # No roles assigned, return empty permissions
                    effective_permissions = []
                else:
                    # Get permissions for all user's roles
                    effective_permissions = []
                    
                    for user_role in user_roles_response.data:
                        if user_role.get("roles"):
                            role_id = user_role["roles"]["id"]
                            
                            # Get permissions for this role through role_permissions table
                            permissions_response = db.table("role_permissions").select(
                                "permissions(permission_code)"
                            ).eq("role_id", role_id).execute()
                            
                            if permissions_response.data:
                                for perm in permissions_response.data:
                                    if perm.get("permissions") and perm["permissions"].get("permission_code"):
                                        perm_code = perm["permissions"]["permission_code"]
                                        effective_permissions.append(perm_code)
                                        
                                        # Add frontend-compatible aliases
                                        # Map database permission codes to frontend expectations
                                        frontend_mappings = {
                                            # Billing mappings
                                            "billing.view": "billing.read",
                                            
                                            # Room mappings (database has 'room.view' but frontend expects 'rooms.read')
                                            "room.view": "rooms.read",
                                            "rooms.view": "rooms.read", 
                                            
                                            # Booking mappings (database has 'booking.view' but frontend expects 'bookings.read')
                                            "booking.view": "bookings.read",
                                            "bookings.view": "bookings.read",
                                            
                                            # Customer mappings (database has 'customer.view' but frontend expects 'customers.read')
                                            "customer.view": "customers.read",
                                            "customers.view": "customers.read",
                                            
                                            # Other mappings
                                            "pos.view": "pos.read",
                                            "inventory.view": "inventory.read",
                                            "reports.view": "reports.read",
                                            "buildings.view": "buildings.read",
                                            "room_allocation.view": "room_allocation.read",
                                            "user_management.view": "user_management.read"
                                        }
                                        
                                        if perm_code in frontend_mappings:
                                            effective_permissions.append(frontend_mappings[perm_code])
                
                # Remove duplicates
                effective_permissions = list(set(effective_permissions))
                
                # If no permissions found, don't provide fallback - user truly has no access
                if not effective_permissions:
                    effective_permissions = []
                    
            except Exception as perm_error:
                # If permission query fails, return empty permissions
                effective_permissions = []
                print(f"Permission query error: {perm_error}")
        
        return {
            "user_id": user_id,
            "effective_permissions": effective_permissions,
            "debug": f"User role: {current_user.get('role')}, Is super admin: {current_user.get('is_super_admin')}, Permission count: {len(effective_permissions)}"
        }
        
    except Exception as e:
        return {
            "user_id": current_user.get("id"),
            "effective_permissions": [],
            "error": str(e),
            "debug": "Exception occurred"
        }
