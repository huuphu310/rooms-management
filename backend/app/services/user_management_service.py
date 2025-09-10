from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, date
import secrets
import hashlib
import base64
from io import BytesIO
import qrcode
import pyotp

from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException, BusinessRuleException
from app.core.security import SecurityService
from app.schemas.user_management import (
    UserProfileCreate, UserProfileUpdate, UserProfileResponse,
    UserBlockRequest, UserPasswordResetRequest, UserDeleteRequest,
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse,
    UserRoleAssignRequest, UserRoleResponse,
    UserPermissionGrantRequest, UserPermissionResponse,
    RolePermissionAssignRequest, RolePermissionResponse,
    SessionCreateRequest, SessionResponse, SessionRefreshRequest,
    ActivityLogResponse, AccountStatus, ActivityType,
    MFAEnableResponse, MFAVerifyRequest,
    UserPermissionsResponse, RolePermissionsResponse
)


class UserManagementService:
    def __init__(self, db):
        self.db = db
        
    # User Management
    async def create_user(self, user_data: UserProfileCreate, created_by: UUID) -> UserProfileResponse:
        """Create new user account"""
        try:
            # Check if username already exists
            existing_username = self.db.table("user_profiles").select("id, username").eq("username", user_data.username).execute()
            if existing_username.data:
                raise BusinessRuleException(f"Username {user_data.username} is already taken")
            
            # Create auth user first using Supabase admin client
            password = user_data.temporary_password or self._generate_secure_password()
            
            auth_user_response = self.db.auth.admin.create_user({
                "email": user_data.email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": user_data.full_name
                }
            })
            
            if not auth_user_response or not auth_user_response.user:
                raise BusinessRuleException("Failed to create auth user")
            
            auth_user_id = auth_user_response.user.id
            
            # Create user profile
            profile_data = user_data.dict(exclude={"email", "temporary_password", "require_password_change", "send_welcome_email", "roles", "role"})
            profile_data["id"] = auth_user_id
            profile_data["account_status"] = "active"  # Set default status
            profile_data["created_by"] = str(created_by)
            profile_data["updated_by"] = str(created_by)
            
            profile_result = self.db.table("user_profiles").insert(profile_data).execute()
            
            if not profile_result.data:
                # Rollback auth user creation
                self.db.auth.admin.delete_user(auth_user_id)
                raise BusinessRuleException("Failed to create user profile")
            
            # Assign role (if provided)
            if user_data.role:
                await self.assign_role_to_user(
                    auth_user_id,
                    user_data.role,
                    None,  # property_id
                    "Initial role assignment",
                    created_by
                )
            
            # Assign additional roles (if provided)
            for role_assignment in user_data.roles:
                await self.assign_role_to_user(
                    auth_user_id,
                    role_assignment["role_id"],
                    role_assignment.get("property_id"),
                    role_assignment.get("reason", "Additional role assignment"),
                    created_by
                )
            
            # Log activity
            await self._log_activity(
                created_by,
                ActivityType.DATA_MODIFY,
                f"Created user {user_data.username}",
                "admin",
                "users",
                auth_user_id,
                "create"
            )
            
            return UserProfileResponse(**profile_result.data[0])
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to create user: {str(e)}")
    
    async def update_user(self, user_id: UUID, user_data: UserProfileUpdate, updated_by: UUID) -> UserProfileResponse:
        """Update user information"""
        try:
            # Check if user exists
            existing = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not existing.data:
                raise NotFoundException(f"User {user_id} not found")
            
            # Update user profile
            update_data = user_data.dict(exclude_unset=True)
            update_data["updated_by"] = str(updated_by)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.db.table("user_profiles").update(update_data).eq("id", str(user_id)).execute()
            
            if not result.data:
                raise BusinessRuleException("Failed to update user")
            
            # Log activity
            await self._log_activity(
                updated_by,
                ActivityType.DATA_MODIFY,
                f"Updated user profile",
                "admin",
                "users",
                user_id,
                "update"
            )
            
            return UserProfileResponse(**result.data[0])
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to update user: {str(e)}")
    
    async def block_user(self, user_id: UUID, request: UserBlockRequest, blocked_by: UUID) -> UserProfileResponse:
        """Block user account"""
        try:
            # Update user status
            update_data = {
                "account_status": AccountStatus.BLOCKED,
                "status_reason": request.reason,
                "updated_by": str(blocked_by),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if request.duration_hours:
                update_data["locked_until"] = (datetime.utcnow() + timedelta(hours=request.duration_hours)).isoformat()
            
            result = self.db.table("user_profiles").update(update_data).eq("id", str(user_id)).execute()
            
            if not result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            # Revoke all active sessions
            self.db.table("user_sessions").update({
                "is_active": False,
                "revoked_at": datetime.utcnow().isoformat(),
                "revoked_by": str(blocked_by),
                "revoke_reason": "User blocked"
            }).eq("user_id", str(user_id)).eq("is_active", True).execute()
            
            # Log activity
            await self._log_activity(
                blocked_by,
                ActivityType.DATA_MODIFY,
                f"Blocked user account: {request.reason}",
                "admin",
                "users",
                user_id,
                "block"
            )
            
            return UserProfileResponse(**result.data[0])
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to block user: {str(e)}")
    
    async def reset_user_password(self, user_id: UUID, request: UserPasswordResetRequest, reset_by: UUID) -> Dict[str, Any]:
        """Reset user password"""
        try:
            # Get user
            user_result = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not user_result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            user = user_result.data[0]
            
            # Generate new password if not provided
            new_password = request.new_password or self._generate_secure_password()
            
            # Update password in auth.users
            self.db.auth.admin.update_user_by_id(
                str(user_id),
                {"password": new_password}
            )
            
            # Log activity
            await self._log_activity(
                reset_by,
                ActivityType.PASSWORD_CHANGE,
                f"Password reset via {request.method}",
                "admin",
                "users",
                user_id,
                "reset_password"
            )
            
            return {
                "success": True,
                "temporary_password": new_password if request.method == "temporary" else None,
                "message": "Password reset successfully"
            }
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to reset password: {str(e)}")
    
    async def delete_user(self, user_id: UUID, request: UserDeleteRequest, deleted_by: UUID) -> Dict[str, Any]:
        """Soft delete user account"""
        try:
            # Get user
            user_result = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not user_result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            user = user_result.data[0]
            
            # Validate confirmation
            expected_confirmation = f"DELETE_USER_{user['username']}"
            if request.confirmation != expected_confirmation:
                raise BadRequestException("Invalid confirmation code")
            
            # Soft delete by updating status
            result = self.db.table("user_profiles").update({
                "account_status": AccountStatus.DELETED,
                "status_reason": f"Deleted by {deleted_by}",
                "updated_by": str(deleted_by),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", str(user_id)).execute()
            
            # Revoke all sessions
            self.db.table("user_sessions").update({
                "is_active": False,
                "revoked_at": datetime.utcnow().isoformat(),
                "revoked_by": str(deleted_by),
                "revoke_reason": "User deleted"
            }).eq("user_id", str(user_id)).execute()
            
            # Log activity
            await self._log_activity(
                deleted_by,
                ActivityType.DATA_MODIFY,
                f"Deleted user account",
                "admin",
                "users",
                user_id,
                "delete"
            )
            
            return {"success": True, "message": "User deleted successfully"}
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to delete user: {str(e)}")
    
    # Role Management
    async def create_role(self, role_data: RoleCreate) -> RoleResponse:
        """Create new role"""
        try:
            # Check if role code exists
            existing = self.db.table("roles").select("*").eq("role_code", role_data.role_code).execute()
            if existing.data:
                raise BusinessRuleException(f"Role with code {role_data.role_code} already exists")
            
            # Create role
            role_dict = role_data.dict(exclude={"permissions"})
            result = self.db.table("roles").insert(role_dict).execute()
            
            if not result.data:
                raise BusinessRuleException("Failed to create role")
            
            role_id = result.data[0]["id"]
            
            # Assign permissions
            if role_data.permissions:
                for perm in role_data.permissions:
                    self.db.table("role_permissions").insert({
                        "role_id": role_id,
                        "permission_id": perm["permission_id"],
                        "conditions": perm.get("conditions")
                    }).execute()
            
            return RoleResponse(**result.data[0])
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to create role: {str(e)}")
    
    async def update_role(self, role_id: UUID, role_data: RoleUpdate) -> RoleResponse:
        """Update role information"""
        try:
            # Check if role exists
            existing = self.db.table("roles").select("*").eq("id", str(role_id)).execute()
            if not existing.data:
                raise NotFoundException(f"Role {role_id} not found")
            
            # Check if system role
            if existing.data[0]["is_system"]:
                raise ForbiddenException("Cannot modify system roles")
            
            # Update role
            update_data = role_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.db.table("roles").update(update_data).eq("id", str(role_id)).execute()
            
            return RoleResponse(**result.data[0])
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to update role: {str(e)}")
    
    async def delete_role(self, role_id: UUID) -> Dict[str, Any]:
        """Delete role"""
        try:
            # Check if role exists
            existing = self.db.table("roles").select("*").eq("id", str(role_id)).execute()
            if not existing.data:
                raise NotFoundException(f"Role {role_id} not found")
            
            # Check if system role
            if existing.data[0]["is_system"]:
                raise ForbiddenException("Cannot delete system roles")
            
            # Check if role is assigned to users
            assignments = self.db.table("user_roles").select("count").eq("role_id", str(role_id)).execute()
            if assignments.data and assignments.data[0]["count"] > 0:
                raise BusinessRuleException("Cannot delete role that is assigned to users")
            
            # Delete role (cascades to role_permissions)
            self.db.table("roles").delete().eq("id", str(role_id)).execute()
            
            return {"success": True, "message": "Role deleted successfully"}
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to delete role: {str(e)}")
    
    # Permission Management
    async def get_role_permissions(self, role_id: UUID) -> RolePermissionsResponse:
        """Get all permissions for a role"""
        try:
            # Get role
            role_result = self.db.table("roles").select("*").eq("id", str(role_id)).execute()
            if not role_result.data:
                raise NotFoundException(f"Role {role_id} not found")
            
            # Get permissions assigned to this role
            perms_result = self.db.table("role_permissions").select(
                "*, permissions(*)"
            ).eq("role_id", str(role_id)).execute()
            
            # Extract permission IDs for easy frontend comparison
            assigned_permission_ids = []
            permissions_by_module = {}
            
            for perm in perms_result.data:
                permission = perm["permissions"]
                permission_id = permission["id"]
                module = permission["module"]
                perm_type = permission["permission_type"]
                
                # Add to assigned permission IDs list
                assigned_permission_ids.append(permission_id)
                
                # Organize permissions by module and type for detailed view
                if module not in permissions_by_module:
                    permissions_by_module[module] = {"screen_access": [], "api_access": []}
                
                if perm_type == "screen":
                    permissions_by_module[module]["screen_access"].append({
                        "screen": permission.get("screen_id", permission["permission_code"]),
                        "actions": [permission["action"]],
                        "permission_id": permission_id,
                        "permission_name": permission["permission_name"]
                    })
                else:
                    permissions_by_module[module]["api_access"].append({
                        "endpoint": permission.get("api_endpoint", permission["permission_code"]),
                        "methods": [permission["action"].upper()],
                        "permission_id": permission_id,
                        "permission_name": permission["permission_name"]
                    })
            
            # Add assigned_permission_ids to the response for easy frontend use
            return RolePermissionsResponse(
                role=RoleResponse(**role_result.data[0]),
                permissions=permissions_by_module,
                assigned_permission_ids=assigned_permission_ids
            )
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to get role permissions: {str(e)}")
    
    async def assign_permissions_to_role(self, role_id: UUID, request: RolePermissionAssignRequest) -> List[RolePermissionResponse]:
        """Assign permissions to role"""
        try:
            # Check if role exists
            role_result = self.db.table("roles").select("*").eq("id", str(role_id)).execute()
            if not role_result.data:
                raise NotFoundException(f"Role {role_id} not found")
            
            # First, remove all existing permissions for this role
            self.db.table("role_permissions").delete().eq("role_id", str(role_id)).execute()
            
            results = []
            for permission_id in request.permission_ids:
                # Check if permission exists
                perm_result = self.db.table("permissions").select("*").eq("id", str(permission_id)).execute()
                if not perm_result.data:
                    continue
                
                # Insert role permission
                role_perm_data = {
                    "role_id": str(role_id),
                    "permission_id": str(permission_id),
                    "can_grant": request.can_grant,
                    "has_approval_limit": request.has_approval_limit,
                    "approval_limit": request.approval_limit,
                    "conditions": request.conditions
                }
                
                result = self.db.table("role_permissions").insert(role_perm_data).execute()
                if result.data:
                    results.append(RolePermissionResponse(
                        **result.data[0],
                        permission_code=perm_result.data[0]["permission_code"],
                        permission_name=perm_result.data[0]["permission_name"]
                    ))
            
            return results
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to assign permissions: {str(e)}")
    
    # User Role Assignment
    async def assign_role_to_user(self, user_id: UUID, role_id: UUID, property_id: Optional[UUID], reason: str, assigned_by: UUID) -> UserRoleResponse:
        """Assign role to user"""
        try:
            # Check if user exists
            user_result = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not user_result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            # Check if role exists
            role_result = self.db.table("roles").select("*").eq("id", str(role_id)).execute()
            if not role_result.data:
                raise NotFoundException(f"Role {role_id} not found")
            
            # Create user role assignment
            user_role_data = {
                "user_id": str(user_id),
                "role_id": str(role_id),
                "property_id": str(property_id) if property_id else None,
                "assigned_by": str(assigned_by),
                "assignment_reason": reason
            }
            
            result = self.db.table("user_roles").insert(user_role_data).execute()
            
            if not result.data:
                raise BusinessRuleException("Failed to assign role")
            
            # Log activity
            await self._log_activity(
                assigned_by,
                ActivityType.PERMISSION_CHANGE,
                f"Assigned role {role_result.data[0]['role_name']} to user",
                "admin",
                "user_roles",
                user_id,
                "assign"
            )
            
            return UserRoleResponse(
                **result.data[0],
                role_name=role_result.data[0]["role_name"]
            )
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to assign role: {str(e)}")
    
    async def remove_role_from_user(self, user_id: UUID, role_id: UUID, removed_by: UUID) -> Dict[str, Any]:
        """Remove role from user"""
        try:
            # Deactivate user role (remove updated_at since column doesn't exist)
            result = self.db.table("user_roles").update({
                "is_active": False
            }).eq("user_id", str(user_id)).eq("role_id", str(role_id)).execute()
            
            if not result.data:
                raise NotFoundException("User role assignment not found")
            
            # Log activity
            await self._log_activity(
                removed_by,
                ActivityType.PERMISSION_CHANGE,
                f"Removed role from user",
                "admin",
                "user_roles",
                user_id,
                "remove"
            )
            
            return {"success": True, "message": "Role removed successfully"}
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to remove role: {str(e)}")
    
    # User Permissions
    async def get_user_permissions(self, user_id: UUID) -> UserPermissionsResponse:
        """Get all permissions for a user"""
        try:
            # Get user
            user_result = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not user_result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            user = user_result.data[0]
            
            # Get user roles
            roles_result = self.db.table("user_roles").select(
                "*, roles(*)"
            ).eq("user_id", str(user_id)).eq("is_active", True).execute()
            
            roles = [RoleResponse(**r["roles"]) for r in roles_result.data]
            
            # Get direct permissions
            direct_perms_result = self.db.table("user_permissions").select(
                "*, permissions(*)"
            ).eq("user_id", str(user_id)).execute()
            
            direct_permissions = []
            for dp in direct_perms_result.data:
                direct_permissions.append(UserPermissionResponse(
                    **dp,
                    permission_code=dp["permissions"]["permission_code"]
                ))
            
            # Calculate effective permissions
            effective_permissions = set()
            
            # Add permissions from roles
            for role in roles_result.data:
                role_perms = self.db.table("role_permissions").select(
                    "permissions(permission_code)"
                ).eq("role_id", role["role_id"]).execute()
                
                for rp in role_perms.data:
                    if rp["permissions"]:
                        effective_permissions.add(rp["permissions"]["permission_code"])
            
            # Add/remove direct permissions
            for dp in direct_permissions:
                if dp.grant_type == "allow":
                    effective_permissions.add(dp.permission_code)
                else:  # deny
                    effective_permissions.discard(dp.permission_code)
            
            # Super admin has all permissions
            if user["is_super_admin"]:
                all_perms = self.db.table("permissions").select("permission_code").execute()
                effective_permissions = {p["permission_code"] for p in all_perms.data}
            
            return UserPermissionsResponse(
                user_id=user_id,
                username=user["username"],
                roles=roles,
                direct_permissions=direct_permissions,
                effective_permissions=list(effective_permissions)
            )
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to get user permissions: {str(e)}")
    
    async def grant_permission_to_user(self, user_id: UUID, request: UserPermissionGrantRequest, granted_by: UUID) -> UserPermissionResponse:
        """Grant direct permission to user"""
        try:
            # Check if user exists
            user_result = self.db.table("user_profiles").select("id, full_name, username, display_name, avatar_url, is_super_admin, account_status, department, position, created_at, updated_at").eq("id", str(user_id)).execute()
            if not user_result.data:
                raise NotFoundException(f"User {user_id} not found")
            
            # Check if permission exists
            perm_result = self.db.table("permissions").select("*").eq("id", str(request.permission_id)).execute()
            if not perm_result.data:
                raise NotFoundException(f"Permission {request.permission_id} not found")
            
            # Create user permission
            user_perm_data = {
                "user_id": str(user_id),
                "permission_id": str(request.permission_id),
                "grant_type": request.grant_type,
                "valid_from": request.valid_from.isoformat() if request.valid_from else datetime.utcnow().isoformat(),
                "valid_to": request.valid_to.isoformat() if request.valid_to else None,
                "granted_by": str(granted_by),
                "grant_reason": request.reason
            }
            
            result = self.db.table("user_permissions").upsert(user_perm_data).execute()
            
            if not result.data:
                raise BusinessRuleException("Failed to grant permission")
            
            # Log activity
            await self._log_activity(
                granted_by,
                ActivityType.PERMISSION_CHANGE,
                f"Granted permission {perm_result.data[0]['permission_code']} to user",
                "admin",
                "user_permissions",
                user_id,
                "grant"
            )
            
            return UserPermissionResponse(
                **result.data[0],
                permission_code=perm_result.data[0]["permission_code"]
            )
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to grant permission: {str(e)}")
    
    # MFA Management
    async def enable_mfa(self, user_id: UUID, password: str) -> MFAEnableResponse:
        """Enable MFA for user"""
        try:
            # Verify password first
            # Note: In production, verify against auth.users password
            
            # Generate secret
            secret = pyotp.random_base32()
            
            # Generate backup codes
            backup_codes = [secrets.token_hex(4) for _ in range(10)]
            
            # Update user profile
            self.db.table("user_profiles").update({
                "mfa_enabled": True,
                "mfa_secret": secret,
                "mfa_backup_codes": backup_codes
            }).eq("id", str(user_id)).execute()
            
            # Generate QR code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=str(user_id),
                issuer_name='Homestay System'
            )
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buf = BytesIO()
            img.save(buf, format='PNG')
            qr_code_base64 = base64.b64encode(buf.getvalue()).decode()
            
            return MFAEnableResponse(
                secret=secret,
                qr_code=f"data:image/png;base64,{qr_code_base64}",
                backup_codes=backup_codes
            )
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to enable MFA: {str(e)}")
    
    async def verify_mfa(self, user_id: UUID, code: str) -> bool:
        """Verify MFA code"""
        try:
            # Get user MFA settings
            user_result = self.db.table("user_profiles").select(
                "mfa_enabled, mfa_secret, mfa_backup_codes"
            ).eq("id", str(user_id)).execute()
            
            if not user_result.data:
                return False
            
            user = user_result.data[0]
            
            if not user["mfa_enabled"]:
                return False
            
            # Check TOTP code
            totp = pyotp.TOTP(user["mfa_secret"])
            if totp.verify(code, valid_window=1):
                return True
            
            # Check backup codes
            if code in user["mfa_backup_codes"]:
                # Remove used backup code
                backup_codes = user["mfa_backup_codes"]
                backup_codes.remove(code)
                self.db.table("user_profiles").update({
                    "mfa_backup_codes": backup_codes
                }).eq("id", str(user_id)).execute()
                return True
            
            return False
            
        except Exception as e:
            return False
    
    # Activity Logging
    async def _log_activity(
        self,
        user_id: UUID,
        activity_type: ActivityType,
        description: str,
        module: Optional[str] = None,
        resource: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        action: Optional[str] = None
    ):
        """Log user activity"""
        try:
            activity_data = {
                "user_id": str(user_id),
                "activity_type": activity_type,
                "activity_description": description,
                "module": module,
                "resource": resource,
                "resource_id": str(resource_id) if resource_id else None,
                "action": action,
                "success": True
            }
            
            self.db.table("user_activity_logs").insert(activity_data).execute()
            
        except Exception:
            pass  # Don't fail operations due to logging errors
    
    async def get_user_activity_log(self, user_id: UUID, limit: int = 100) -> List[ActivityLogResponse]:
        """Get user activity history"""
        try:
            result = self.db.table("user_activity_logs").select("*").eq(
                "user_id", str(user_id)
            ).order("created_at", desc=True).limit(limit).execute()
            
            return [ActivityLogResponse(**log) for log in result.data]
            
        except Exception as e:
            raise BusinessRuleException(f"Failed to get activity log: {str(e)}")
    
    # Helper methods
    def _generate_secure_password(self) -> str:
        """Generate a secure random password"""
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
        return ''.join(secrets.choice(chars) for _ in range(12))
    
    def _hash_password(self, password: str) -> str:
        """Hash password"""
        return hashlib.sha256(password.encode()).hexdigest()