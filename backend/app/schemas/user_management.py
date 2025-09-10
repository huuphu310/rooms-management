from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID
from enum import Enum


# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    RECEPTIONIST = "receptionist"
    ACCOUNTANT = "accountant"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class RoleType(str, Enum):
    SYSTEM = "system"
    PREDEFINED = "predefined"
    CUSTOM = "custom"


class PermissionType(str, Enum):
    API = "api"
    SCREEN = "screen"
    FEATURE = "feature"
    DATA = "data"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GrantType(str, Enum):
    ALLOW = "allow"
    DENY = "deny"


class ActivityType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PERMISSION_CHANGE = "permission_change"
    DATA_ACCESS = "data_access"
    DATA_MODIFY = "data_modify"
    FAILED_LOGIN = "failed_login"


# User Profile Schemas
class UserProfileBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=200)
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)
    
    # Employment information
    employee_id: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    hire_date: Optional[date] = None
    
    # Access control
    is_super_admin: bool = False
    can_access_all_properties: bool = False
    default_property_id: Optional[UUID] = None


class UserProfileCreate(UserProfileBase):
    email: EmailStr
    role: Optional[UUID] = None  # Role ID from roles table
    temporary_password: Optional[str] = None
    require_password_change: bool = True
    send_welcome_email: bool = True
    roles: Optional[List[Dict[str, Any]]] = []


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)


class UserProfileResponse(UserProfileBase):
    id: UUID
    email: Optional[EmailStr] = None
    account_status: AccountStatus
    status_reason: Optional[str] = None
    last_login_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    mfa_enabled: bool = False
    created_at: datetime
    updated_at: datetime
    roles: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True


class UserBlockRequest(BaseModel):
    reason: str
    duration_hours: Optional[int] = None
    notify_user: bool = True


class UserPasswordResetRequest(BaseModel):
    method: str = Field(..., description="admin_reset, email_link, or temporary")
    new_password: Optional[str] = None
    require_change: bool = True
    notify_user: bool = True


class UserDeleteRequest(BaseModel):
    reassign_data_to: Optional[UUID] = None
    confirmation: str = Field(..., description="Must match DELETE_USER_username")


# Role Schemas
class RoleBase(BaseModel):
    role_code: str = Field(..., min_length=1, max_length=50)
    role_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_role_id: Optional[UUID] = None
    level: int = 0


class RoleCreate(RoleBase):
    permissions: Optional[List[Dict[str, Any]]] = []


class RoleUpdate(BaseModel):
    role_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    id: UUID
    role_type: RoleType
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime
    permissions_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


# Permission Schemas
class PermissionBase(BaseModel):
    permission_code: str = Field(..., min_length=1, max_length=100)
    permission_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    module: str = Field(..., max_length=50)
    resource: str = Field(..., max_length=100)
    action: str = Field(..., max_length=50)
    permission_type: PermissionType = PermissionType.API
    screen_id: Optional[str] = Field(None, max_length=100)
    api_endpoint: Optional[str] = Field(None, max_length=255)
    risk_level: RiskLevel = RiskLevel.LOW


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    permission_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionResponse(PermissionBase):
    id: UUID
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# User Role Assignment
class UserRoleAssignRequest(BaseModel):
    role_id: UUID
    property_id: Optional[UUID] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    reason: Optional[str] = None


class UserRoleResponse(BaseModel):
    id: UUID
    user_id: UUID
    role_id: UUID
    role_name: str
    property_id: Optional[UUID] = None
    department: Optional[str] = None
    valid_from: date
    valid_to: Optional[date] = None
    is_active: bool
    assigned_at: datetime
    assigned_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


# User Permission Grant
class UserPermissionGrantRequest(BaseModel):
    permission_id: UUID
    grant_type: GrantType = GrantType.ALLOW
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    reason: str


class UserPermissionResponse(BaseModel):
    id: UUID
    user_id: UUID
    permission_id: UUID
    permission_code: str
    grant_type: GrantType
    valid_from: datetime
    valid_to: Optional[datetime] = None
    granted_at: datetime
    granted_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


# Role Permission Assignment
class RolePermissionAssignRequest(BaseModel):
    permission_ids: List[UUID]
    can_grant: bool = False
    has_approval_limit: bool = False
    approval_limit: Optional[float] = None
    conditions: Optional[Dict[str, Any]] = None


class RolePermissionResponse(BaseModel):
    id: UUID
    role_id: UUID
    permission_id: UUID
    permission_code: str
    permission_name: str
    can_grant: bool
    has_approval_limit: bool
    approval_limit: Optional[float] = None
    conditions: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


# Session Schemas
class SessionCreateRequest(BaseModel):
    username: str
    password: str
    device_id: Optional[str] = None
    remember_me: bool = False


class SessionResponse(BaseModel):
    user: UserProfileResponse
    session_token: str
    refresh_token: str
    expires_at: datetime
    permissions: List[str] = []


class SessionRefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    session_token: str
    logout_all_devices: bool = False


# Activity Log Schemas
class ActivityLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    activity_type: ActivityType
    activity_description: Optional[str] = None
    module: Optional[str] = None
    resource: Optional[str] = None
    resource_id: Optional[UUID] = None
    action: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Bulk Operations
class BulkUserStatusUpdate(BaseModel):
    user_ids: List[UUID]
    status: AccountStatus
    reason: Optional[str] = None


class BulkRoleAssignment(BaseModel):
    user_ids: List[UUID]
    role_id: UUID
    property_id: Optional[UUID] = None
    reason: Optional[str] = None


# Response Models
class UserListResponse(BaseModel):
    users: List[UserProfileResponse]
    total: int
    page: int
    page_size: int


class RoleListResponse(BaseModel):
    roles: List[RoleResponse]
    total: int


class PermissionListResponse(BaseModel):
    permissions: List[PermissionResponse]
    total: int
    grouped_by_module: Optional[Dict[str, List[PermissionResponse]]] = None


class UserPermissionsResponse(BaseModel):
    user_id: UUID
    username: str
    roles: List[RoleResponse]
    direct_permissions: List[UserPermissionResponse]
    effective_permissions: List[str]
    
    
class RolePermissionsResponse(BaseModel):
    role: RoleResponse
    permissions: Dict[str, Dict[str, List[Dict[str, Any]]]]
    assigned_permission_ids: List[str] = []
    
    
# MFA Schemas
class MFAEnableRequest(BaseModel):
    password: str


class MFAEnableResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]


class MFAVerifyRequest(BaseModel):
    code: str


class MFADisableRequest(BaseModel):
    password: str
    code: str