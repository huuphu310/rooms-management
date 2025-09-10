from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    success: bool
    user: Optional[Dict[str, Any]] = None
    session: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    code: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    success: bool
    session: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    code: Optional[str] = None

class LogoutRequest(BaseModel):
    access_token: str

class LogoutResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    code: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_super_admin: bool = False
    account_status: str = "active"
    department: Optional[str] = None
    position: Optional[str] = None
    roles: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[Dict[str, Any]] = None
