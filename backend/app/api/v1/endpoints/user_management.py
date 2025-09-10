from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse

from app.api.deps import (
    get_current_user,
    require_permission,
    UserScopedDbDep,
    AuthenticatedDbDep
)
from app.services.user_management_service import UserManagementService
from app.schemas.user_management import (
    UserProfileCreate, UserProfileUpdate, UserProfileResponse,
    UserBlockRequest, UserPasswordResetRequest, UserDeleteRequest,
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse,
    UserRoleAssignRequest, UserRoleResponse,
    UserPermissionGrantRequest, UserPermissionResponse,
    RolePermissionAssignRequest, RolePermissionResponse,
    UserListResponse, RoleListResponse, PermissionListResponse,
    UserPermissionsResponse, RolePermissionsResponse,
    ActivityLogResponse, BulkUserStatusUpdate, BulkRoleAssignment,
    MFAEnableRequest, MFAEnableResponse, MFAVerifyRequest, MFADisableRequest
)

router = APIRouter()

# ================================
# USER MANAGEMENT
# ================================

@router.post("/users/create", response_model=UserProfileResponse)
async def create_user(
    user_data: UserProfileCreate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "create"))
):
    """
    Create new user account
    
    Required Permission: admin.users.create
    """
    service = UserManagementService(db)
    return await service.create_user(user_data, UUID(current_user["id"]))

@router.get("/users", response_model=UserListResponse)
async def list_users(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    role_id: Optional[UUID] = None,
    search: Optional[str] = None
):
    """
    List all users with pagination and filters
    
    Required Permission: admin.users.view
    """
    query = db.table("user_profiles").select(
        "id, full_name, username, display_name, avatar_url, "
        "is_super_admin, account_status, department, position, "
        "created_at, updated_at"
    )
    
    if status:
        query = query.eq("account_status", status)
    
    if search:
        query = query.or_(f"username.ilike.%{search}%,full_name.ilike.%{search}%,email.ilike.%{search}%")
    
    # Count total
    count_result = query.execute()
    total = len(count_result.data) if count_result.data else 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)
    
    result = query.execute()
    
    users = []
    for user_data in result.data:
        # Fetch user roles separately
        roles = []
        user_roles_response = db.table("user_roles").select("*, roles(*)").eq("user_id", user_data["id"]).eq("is_active", True).execute()
        if user_roles_response.data:
            for ur in user_roles_response.data:
                if ur.get("roles"):
                    roles.append(ur["roles"])
        
        user_data["roles"] = roles
        users.append(UserProfileResponse(**user_data))
    
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/users/{user_id}", response_model=UserProfileResponse)
async def get_user(
    user_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view"))
):
    """
    Get user details by ID
    
    Required Permission: admin.users.view
    """
    result = db.table("user_profiles").select(
        "id, full_name, username, display_name, avatar_url, "
        "is_super_admin, account_status, department, position, "
        "created_at, updated_at, "
        "user_roles(user_id, role_id, is_active, created_at, roles(id, role_name, role_code, permissions))"
    ).eq("id", str(user_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    user_data = result.data[0]
    
    # Extract roles
    roles = []
    if user_data.get("user_roles"):
        for ur in user_data["user_roles"]:
            if ur.get("roles") and ur["is_active"]:
                roles.append(ur["roles"])
    
    user_data["roles"] = roles
    
    return UserProfileResponse(**user_data)

@router.put("/users/{user_id}/update", response_model=UserProfileResponse)
async def update_user(
    user_id: UUID,
    user_data: UserProfileUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Update user information
    
    Required Permission: admin.users.update
    """
    service = UserManagementService(db)
    return await service.update_user(user_id, user_data, UUID(current_user["id"]))

@router.post("/users/{user_id}/block", response_model=UserProfileResponse)
async def block_user(
    user_id: UUID,
    request: UserBlockRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Block user account
    
    Required Permission: admin.users.block
    """
    service = UserManagementService(db)
    return await service.block_user(user_id, request, UUID(current_user["id"]))

@router.post("/users/{user_id}/unblock", response_model=UserProfileResponse)
async def unblock_user(
    user_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Unblock user account
    
    Required Permission: admin.users.block
    """
    result = db.table("user_profiles").update({
        "account_status": "active",
        "status_reason": None,
        "locked_until": None,
        "login_attempts": 0
    }).eq("id", str(user_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    return UserProfileResponse(**result.data[0])

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: UUID,
    request: UserPasswordResetRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Reset user password
    
    Required Permission: admin.users.reset_password
    """
    service = UserManagementService(db)
    return await service.reset_user_password(user_id, request, UUID(current_user["id"]))

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    request: UserDeleteRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "delete"))
):
    """
    Soft delete user account
    
    Required Permission: admin.users.delete
    """
    service = UserManagementService(db)
    return await service.delete_user(user_id, request, UUID(current_user["id"]))

# ================================
# ROLE MANAGEMENT
# ================================

@router.post("/roles/create", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "create"))
):
    """
    Create new role
    
    Required Permission: admin.roles.create
    """
    service = UserManagementService(db)
    return await service.create_role(role_data)

@router.get("/roles", response_model=RoleListResponse)
async def list_roles(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view")),
    include_inactive: bool = Query(False)
):
    """
    List all roles
    
    Required Permission: admin.roles.view
    """
    query = db.table("roles").select("id, role_name, role_code, description, permissions, is_active, created_at, updated_at")
    
    if not include_inactive:
        query = query.eq("is_active", True)
    
    result = query.order("role_name").execute()
    
    roles = [RoleResponse(**role) for role in result.data]
    
    # Add permissions count
    for role in roles:
        perm_count = db.table("role_permissions").select("count").eq("role_id", str(role.id)).execute()
        role.permissions_count = perm_count.data[0]["count"] if perm_count.data else 0
    
    return RoleListResponse(roles=roles, total=len(roles))

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view"))
):
    """
    Get role details by ID
    
    Required Permission: admin.roles.view
    """
    result = db.table("roles").select("id, role_name, role_code, description, permissions, is_active, created_at, updated_at").eq("id", str(role_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role {role_id} not found"
        )
    
    return RoleResponse(**result.data[0])

@router.put("/roles/{role_id}/update", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    role_data: RoleUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Update role information
    
    Required Permission: admin.roles.update
    """
    service = UserManagementService(db)
    return await service.update_role(role_id, role_data)

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "delete"))
):
    """
    Delete role
    
    Required Permission: admin.roles.delete
    """
    service = UserManagementService(db)
    return await service.delete_role(role_id)

@router.get("/roles/{role_id}/permissions", response_model=RolePermissionsResponse)
async def get_role_permissions(
    role_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view"))
):
    """
    Get all permissions for a role
    
    Required Permission: admin.roles.view
    """
    service = UserManagementService(db)
    return await service.get_role_permissions(role_id)

@router.post("/roles/{role_id}/permissions", response_model=List[RolePermissionResponse])
async def assign_permissions_to_role(
    role_id: UUID,
    request: RolePermissionAssignRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Assign permissions to role
    
    Required Permission: admin.roles.update
    """
    service = UserManagementService(db)
    return await service.assign_permissions_to_role(role_id, request)

@router.put("/roles/{role_id}/permissions", response_model=List[RolePermissionResponse])
async def update_role_permissions(
    role_id: UUID,
    request: RolePermissionAssignRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Update permissions for a role (replaces all existing permissions)
    
    Required Permission: admin.roles.update
    """
    service = UserManagementService(db)
    return await service.assign_permissions_to_role(role_id, request)

# ================================
# PERMISSION MANAGEMENT
# ================================

@router.get("/permissions", response_model=PermissionListResponse)
async def list_permissions(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view")),
    module: Optional[str] = None,
    group_by_module: bool = Query(False)
):
    """
    List all permissions
    
    Required Permission: admin.roles.view
    """
    query = db.table("permissions").select("*")
    
    if module:
        query = query.eq("module", module)
    
    result = query.order("module").execute()
    
    permissions = [PermissionResponse(**perm) for perm in result.data]
    
    grouped = None
    if group_by_module:
        grouped = {}
        for perm in permissions:
            if perm.module not in grouped:
                grouped[perm.module] = []
            grouped[perm.module].append(perm)
    
    return PermissionListResponse(
        permissions=permissions,
        total=len(permissions),
        grouped_by_module=grouped
    )

# ================================
# USER ROLE ASSIGNMENT
# ================================

@router.post("/users/{user_id}/assign-role", response_model=UserRoleResponse)
async def assign_role_to_user(
    user_id: UUID,
    request: UserRoleAssignRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Assign role to user
    
    Required Permission: admin.users.assign_role
    """
    service = UserManagementService(db)
    return await service.assign_role_to_user(
        user_id,
        request.role_id,
        request.property_id,
        request.reason or "Role assigned by administrator",
        UUID(current_user["id"])
    )

@router.delete("/users/{user_id}/roles/{role_id}")
async def remove_role_from_user(
    user_id: UUID,
    role_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Remove role from user
    
    Required Permission: admin.users.assign_role
    """
    service = UserManagementService(db)
    return await service.remove_role_from_user(user_id, role_id, UUID(current_user["id"]))

# ================================
# USER PERMISSIONS
# ================================

@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view"))
):
    """
    Get all permissions for a user
    
    Required Permission: admin.users.view
    """
    service = UserManagementService(db)
    return await service.get_user_permissions(user_id)

@router.post("/users/{user_id}/grant-permission", response_model=UserPermissionResponse)
async def grant_permission_to_user(
    user_id: UUID,
    request: UserPermissionGrantRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Grant direct permission to user
    
    Required Permission: admin.users.grant_permission
    """
    service = UserManagementService(db)
    return await service.grant_permission_to_user(user_id, request, UUID(current_user["id"]))

# ================================
# USER ACTIVITY
# ================================

@router.get("/users/{user_id}/activity-log", response_model=List[ActivityLogResponse])
async def get_user_activity_log(
    user_id: UUID,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "view")),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Get user activity history
    
    Required Permission: admin.users.view_activity
    """
    service = UserManagementService(db)
    return await service.get_user_activity_log(user_id, limit)

# ================================
# MFA MANAGEMENT
# ================================

@router.post("/users/{user_id}/mfa/enable", response_model=MFAEnableResponse)
async def enable_mfa(
    user_id: UUID,
    request: MFAEnableRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """
    Enable MFA for user (user can only enable for themselves)
    """
    if str(user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only enable MFA for your own account"
        )
    
    service = UserManagementService(db)
    return await service.enable_mfa(user_id, request.password)

@router.post("/users/{user_id}/mfa/verify")
async def verify_mfa(
    user_id: UUID,
    request: MFAVerifyRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify MFA code
    """
    if str(user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only verify MFA for your own account"
        )
    
    service = UserManagementService(db)
    is_valid = await service.verify_mfa(user_id, request.code)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )
    
    return {"success": True, "message": "MFA code verified"}

@router.post("/users/{user_id}/mfa/disable")
async def disable_mfa(
    user_id: UUID,
    request: MFADisableRequest,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_user)
):
    """
    Disable MFA for user
    """
    if str(user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only disable MFA for your own account"
        )
    
    # Verify MFA code first
    service = UserManagementService(db)
    is_valid = await service.verify_mfa(user_id, request.code)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )
    
    # Disable MFA
    result = db.table("user_profiles").update({
        "mfa_enabled": False,
        "mfa_secret": None,
        "mfa_backup_codes": None
    }).eq("id", str(user_id)).execute()
    
    return {"success": True, "message": "MFA disabled"}

# ================================
# BULK OPERATIONS
# ================================

@router.post("/users/bulk/status-update")
async def bulk_update_user_status(
    request: BulkUserStatusUpdate,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Bulk update user status
    
    Required Permission: admin.users.update
    """
    user_ids = [str(uid) for uid in request.user_ids]
    
    result = db.table("user_profiles").update({
        "account_status": request.status,
        "status_reason": request.reason,
        "updated_by": current_user["id"],
        "updated_at": datetime.utcnow().isoformat()
    }).in_("id", user_ids).execute()
    
    return {
        "success": True,
        "updated_count": len(result.data) if result.data else 0,
        "message": f"Updated {len(result.data) if result.data else 0} users"
    }

@router.post("/users/bulk/assign-role")
async def bulk_assign_role(
    request: BulkRoleAssignment,
    db: AuthenticatedDbDep,
    current_user: dict = Depends(require_permission("users", "edit"))
):
    """
    Bulk assign role to users
    
    Required Permission: admin.users.assign_role
    """
    service = UserManagementService(db)
    
    success_count = 0
    for user_id in request.user_ids:
        try:
            await service.assign_role_to_user(
                user_id,
                request.role_id,
                request.property_id,
                request.reason or "Bulk role assignment",
                UUID(current_user["id"])
            )
            success_count += 1
        except Exception:
            continue
    
    return {
        "success": True,
        "assigned_count": success_count,
        "message": f"Assigned role to {success_count} users"
    }
