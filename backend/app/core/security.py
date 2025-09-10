from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from .config import settings
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityService:
    """Service for handling authentication and security"""
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            return payload
        except JWTError as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_tokens(user_id: str, email: str, role: str) -> Dict[str, str]:
        """Create both access and refresh tokens"""
        token_data = {
            "sub": user_id,
            "email": email,
            "role": role
        }
        
        return {
            "access_token": SecurityService.create_access_token(token_data),
            "refresh_token": SecurityService.create_refresh_token(token_data),
            "token_type": "bearer"
        }

# Permissions configuration
ROLE_PERMISSIONS = {
    "admin": {
        "rooms": ["view", "create", "edit", "delete"],
        "bookings": ["view", "create", "edit", "delete", "cancel"],
        "customers": ["view", "create", "edit", "delete"],
        "inventory": ["view", "create", "edit", "delete"],
        "billing": ["view", "create", "edit", "delete", "refund"],
        "pos": ["view", "create", "edit", "delete", "void"],
        "reports": ["view", "export"],
        "settings": ["view", "edit"],
        "users": ["view", "create", "edit", "delete"],
        "pricing": ["view", "create", "update", "delete"],
        "amenities": ["view", "create", "update", "delete"],
        "room_allocation": ["view", "create", "edit", "delete", "auto_assign"]
    },
    "manager": {
        "rooms": ["view", "create", "edit"],
        "bookings": ["view", "create", "edit", "cancel"],
        "customers": ["view", "create", "edit"],
        "inventory": ["view", "create", "edit"],
        "billing": ["view", "create", "edit", "refund"],
        "pos": ["view", "create", "void"],
        "reports": ["view", "export"],
        "settings": ["view"],
        "users": ["view"],
        "pricing": ["view", "create", "update"],
        "amenities": ["view", "create", "update"],
        "room_allocation": ["view", "create", "edit", "auto_assign"]
    },
    "receptionist": {
        "rooms": ["view"],
        "bookings": ["view", "create", "edit"],
        "customers": ["view", "create", "edit"],
        "inventory": ["view"],
        "billing": ["view", "create"],
        "pos": ["view", "create"],
        "reports": ["view"],
        "settings": [],
        "users": [],
        "pricing": ["view"],
        "amenities": ["view"],
        "room_allocation": ["view", "create"]
    },
    "accountant": {
        "rooms": ["view"],
        "bookings": ["view"],
        "customers": ["view"],
        "inventory": ["view", "edit"],
        "billing": ["view", "create", "edit"],
        "pos": ["view"],
        "reports": ["view", "export"],
        "settings": [],
        "users": [],
        "pricing": ["view"],
        "amenities": ["view"]
    },
    "housekeeper": {
        "rooms": ["view", "edit"],
        "bookings": ["view"],
        "customers": [],
        "inventory": ["view"],
        "billing": [],
        "pos": [],
        "reports": [],
        "settings": [],
        "users": [],
        "pricing": [],
        "amenities": ["view"]
    },
    "pos_operator": {
        "rooms": [],
        "bookings": [],
        "customers": ["view"],
        "inventory": ["view"],
        "billing": ["view"],
        "pos": ["view", "create"],
        "reports": [],
        "settings": [],
        "users": [],
        "pricing": [],
        "amenities": []
    }
}

def check_permission(role: str, module: str, action: str) -> bool:
    """Check if a role has permission for a specific action on a module"""
    if role not in ROLE_PERMISSIONS:
        return False
    
    # Map common action aliases
    action_mapping = {
        "read": "view",
        "update": "edit",
        "delete": "delete",
        "create": "create",
        "admin": "edit"  # admin actions map to edit
    }
    
    # Use mapped action if available, otherwise use original
    mapped_action = action_mapping.get(action, action)
    
    module_permissions = ROLE_PERMISSIONS[role].get(module, [])
    return mapped_action in module_permissions