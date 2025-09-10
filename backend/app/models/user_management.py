from sqlalchemy import Column, String, Boolean, Date, DateTime, Integer, ForeignKey, JSON, DECIMAL, Text, UniqueConstraint, ARRAY
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    display_name = Column(String(100))
    avatar_url = Column(Text)
    phone = Column(String(20), unique=True)
    date_of_birth = Column(Date)
    gender = Column(String(10))
    
    # Employment information
    employee_id = Column(String(50), unique=True)
    department = Column(String(100))
    position = Column(String(100))
    hire_date = Column(Date)
    
    # Access control
    is_super_admin = Column(Boolean, default=False)
    can_access_all_properties = Column(Boolean, default=False)
    default_property_id = Column(UUID(as_uuid=True))
    
    # Account status
    account_status = Column(String(20), default='active')
    status_reason = Column(Text)
    
    # Session management
    last_login_at = Column(DateTime(timezone=True))
    last_login_ip = Column(INET)
    last_activity_at = Column(DateTime(timezone=True))
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True))
    
    # Multi-factor authentication
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255))
    mfa_backup_codes = Column(ARRAY(Text))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    user_permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("UserActivityLog", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_code = Column(String(50), unique=True, nullable=False)
    role_name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Role hierarchy
    parent_role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'))
    level = Column(Integer, default=0)
    
    # Role type
    role_type = Column(String(20), default='custom')
    
    # Status
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent_role = relationship("Role", remote_side=[id])
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    permission_code = Column(String(100), unique=True, nullable=False)
    permission_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Permission categorization
    module = Column(String(50), nullable=False)
    resource = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    
    # Permission type
    permission_type = Column(String(20), default='api')
    
    # UI mapping
    screen_id = Column(String(100))
    api_endpoint = Column(String(255))
    
    # Risk level
    risk_level = Column(String(20), default='low')
    
    # Status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    user_permissions = relationship("UserPermission", back_populates="permission", cascade="all, delete-orphan")


class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('user_profiles.id', ondelete="CASCADE"))
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id', ondelete="CASCADE"))
    
    # Assignment scope
    property_id = Column(UUID(as_uuid=True))
    department = Column(String(100))
    
    # Validity period
    valid_from = Column(Date, default=datetime.utcnow)
    valid_to = Column(Date)
    
    # Assignment details
    assigned_by = Column(UUID(as_uuid=True))
    assigned_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    assignment_reason = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("UserProfile", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'property_id', name='_user_role_property_uc'),
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id', ondelete="CASCADE"))
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id', ondelete="CASCADE"))
    
    # Permission modifiers
    can_grant = Column(Boolean, default=False)
    has_approval_limit = Column(Boolean, default=False)
    approval_limit = Column(DECIMAL(12, 2))
    
    # Conditions
    conditions = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='_role_permission_uc'),
    )


class UserPermission(Base):
    __tablename__ = "user_permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('user_profiles.id', ondelete="CASCADE"))
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id', ondelete="CASCADE"))
    
    # Permission grant type
    grant_type = Column(String(20), default='allow')
    
    # Temporary permission
    valid_from = Column(DateTime(timezone=True), default=datetime.utcnow)
    valid_to = Column(DateTime(timezone=True))
    
    # Grant details
    granted_by = Column(UUID(as_uuid=True))
    granted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    grant_reason = Column(Text)
    
    # Relationships
    user = relationship("UserProfile", back_populates="user_permissions")
    permission = relationship("Permission", back_populates="user_permissions")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'permission_id', name='_user_permission_uc'),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('user_profiles.id', ondelete="CASCADE"))
    
    # Session details
    session_token = Column(String(255), unique=True, nullable=False)
    refresh_token = Column(String(255), unique=True)
    
    # Device information
    device_id = Column(String(100))
    device_type = Column(String(50))
    device_name = Column(String(100))
    browser = Column(String(100))
    os = Column(String(100))
    
    # Network information
    ip_address = Column(INET)
    user_agent = Column(Text)
    
    # Session validity
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Session status
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime(timezone=True))
    revoked_by = Column(UUID(as_uuid=True))
    revoke_reason = Column(String(100))
    
    # Relationships
    user = relationship("UserProfile", back_populates="sessions")


class PasswordHistory(Base):
    __tablename__ = "password_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('user_profiles.id', ondelete="CASCADE"))
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('user_profiles.id'))
    
    # Activity details
    activity_type = Column(String(50), nullable=False)
    activity_description = Column(Text)
    
    # Context
    module = Column(String(50))
    resource = Column(String(100))
    resource_id = Column(UUID(as_uuid=True))
    action = Column(String(50))
    
    # Request details
    ip_address = Column(INET)
    user_agent = Column(Text)
    request_method = Column(String(10))
    request_path = Column(String(255))
    request_body = Column(JSONB)
    response_status = Column(Integer)
    
    # Result
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("UserProfile", back_populates="activity_logs")