"""
Request context for Backend-Only Gateway approach
All data access goes through Backend with service_key, enforcing tenant scoping
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel


class RequestContext(BaseModel):
    """Request context containing user and tenant information"""
    user_id: str
    email: Optional[str] = None
    tenant_id: Optional[str] = None
    roles: list[str] = []
    is_super_admin: bool = False
    raw_token: Optional[str] = None
    
    def model_dump(self) -> Dict[str, Any]:
        """Convert to dict for logging and debugging"""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "tenant_id": self.tenant_id,
            "roles": self.roles,
            "is_super_admin": self.is_super_admin
        }