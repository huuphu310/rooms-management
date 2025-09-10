"""
Security and Audit Middleware for Request Logging and User Tracking
"""
from typing import Optional, Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
import logging
import uuid
import time
import json

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for comprehensive request logging and audit trails
    Tracks user identity, request details, and response status for security monitoring
    """
    
    def __init__(self, app, log_body: bool = False, log_sensitive_paths: bool = True):
        super().__init__(app)
        self.log_body = log_body
        self.log_sensitive_paths = log_sensitive_paths
        
        # Define sensitive paths that require extra logging
        self.sensitive_paths = {
            "/api/v1/auth/",
            "/api/v1/billing/",
            "/api/v1/pos/",
            "/api/v1/users/",
            "/api/v1/roles/"
        }
        
        # Define paths that should not be logged (health checks, etc.)
        self.skip_paths = {
            "/health",
            "/ping", 
            "/metrics",
            "/favicon.ico"
        }
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Skip logging for certain paths
        if any(request.url.path.startswith(skip_path) for skip_path in self.skip_paths):
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        
        # Extract user information if available
        user_info = await self._extract_user_info(request)
        
        # Determine if this is a sensitive operation
        is_sensitive = any(request.url.path.startswith(path) for path in self.sensitive_paths)
        
        # Log request start
        await self._log_request_start(request, request_id, user_info, is_sensitive)
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log request completion
            await self._log_request_complete(
                request, response, request_id, user_info, 
                process_time, is_sensitive
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Log request error
            process_time = time.time() - start_time
            await self._log_request_error(
                request, request_id, user_info, str(e), process_time, is_sensitive
            )
            raise
    
    async def _extract_user_info(self, request: Request) -> Dict[str, Any]:
        """Extract user information from request if available"""
        user_info = {
            "user_id": None,
            "email": None,
            "role": None,
            "tenant_id": None,
            "ip_address": self._get_client_ip(request)
        }
        
        # Try to get user from request state (set by auth middleware)
        if hasattr(request.state, "user") and request.state.user:
            user = request.state.user
            user_info.update({
                "user_id": user.get("user_id"),
                "email": user.get("email"),
                "role": user.get("role"),
                "tenant_id": user.get("tenant_id")
            })
        
        # Alternative: extract from Authorization header (less reliable)
        elif auth_header := request.headers.get("authorization"):
            try:
                from app.api.deps import AuthService
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    token_data = AuthService.decode_jwt_token(token)
                    if token_data:
                        user_info.update({
                            "user_id": token_data.get("user_id"),
                            "email": token_data.get("email"),
                            "role": token_data.get("role"),
                            "tenant_id": token_data.get("tenant_id")
                        })
            except Exception:
                pass  # Continue without user info if extraction fails
        
        return user_info
    
    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP address"""
        # Check for forwarded headers (load balancer/proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        return request.client.host if request.client else "unknown"
    
    async def _log_request_start(
        self, 
        request: Request, 
        request_id: str, 
        user_info: Dict[str, Any], 
        is_sensitive: bool
    ):
        """Log request initiation"""
        log_data = {
            "event": "request_start",
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params) if request.query_params else None,
            "user_agent": request.headers.get("user-agent"),
            "content_type": request.headers.get("content-type"),
            "is_sensitive": is_sensitive,
            **user_info
        }
        
        # Add request body for sensitive operations (be careful with PII)
        if self.log_body and is_sensitive and request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body and len(body) < 10000:  # Limit body size
                    log_data["request_body"] = body.decode("utf-8")[:1000] + "..." if len(body) > 1000 else body.decode("utf-8")
            except Exception:
                log_data["request_body"] = "Failed to decode body"
        
        if is_sensitive:
            logger.warning(f"Sensitive request: {json.dumps(log_data, default=str)}")
        else:
            logger.info(f"Request start: {json.dumps(log_data, default=str)}")
    
    async def _log_request_complete(
        self,
        request: Request,
        response: Response,
        request_id: str,
        user_info: Dict[str, Any],
        process_time: float,
        is_sensitive: bool
    ):
        """Log successful request completion"""
        log_data = {
            "event": "request_complete",
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "process_time": round(process_time, 3),
            "is_sensitive": is_sensitive,
            **user_info
        }
        
        # Log level based on status code and sensitivity
        if response.status_code >= 400:
            logger.warning(f"Request error: {json.dumps(log_data, default=str)}")
        elif is_sensitive:
            logger.warning(f"Sensitive request complete: {json.dumps(log_data, default=str)}")
        else:
            logger.info(f"Request complete: {json.dumps(log_data, default=str)}")
    
    async def _log_request_error(
        self,
        request: Request,
        request_id: str,
        user_info: Dict[str, Any],
        error: str,
        process_time: float,
        is_sensitive: bool
    ):
        """Log request errors and exceptions"""
        log_data = {
            "event": "request_error",
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "error": error,
            "process_time": round(process_time, 3),
            "is_sensitive": is_sensitive,
            **user_info
        }
        
        logger.error(f"Request exception: {json.dumps(log_data, default=str)}")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """
    
    async def dispatch(self, request: Request, call_next):
        # Auto-clear cache when accessing docs (for development/debugging)
        if request.url.path in ["/api/v1/docs", "/docs"]:
            from app.core.cache_manager import CacheManager
            CacheManager.clear_all_caches()
            logger.info("Cache cleared automatically when accessing docs")
        
        response = await call_next(request)
        
        # Security headers
        # Skip CSP for documentation endpoints
        if request.url.path in ["/api/v1/docs", "/api/v1/redoc", "/docs", "/redoc"]:
            csp_policy = (
                "default-src 'self' https:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob:; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "img-src 'self' https://fastapi.tiangolo.com data: blob:; "
                "connect-src 'self' https:; "
                "worker-src 'self' blob:; "
                "child-src 'self' blob:;"
            )
        else:
            csp_policy = "default-src 'self'"
        
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": csp_policy,
        }
        
        # Add security headers
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response


# Audit log data model
class AuditLogEntry:
    """Structured audit log entry for database storage"""
    
    def __init__(
        self,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str],
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        self.user_id = user_id
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.details = details or {}
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.request_id = request_id
        self.timestamp = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "request_id": self.request_id,
            "timestamp": self.timestamp
        }


async def create_audit_log(entry: AuditLogEntry):
    """Create audit log entry in database"""
    try:
        from app.core.database import get_supabase_service
        
        # Get service client for audit logging
        db = await get_supabase_service()
        
        # Insert audit log
        result = db.table("audit_logs").insert({
            "user_id": entry.user_id,
            "action": entry.action,
            "resource_type": entry.resource_type,
            "resource_id": entry.resource_id,
            "details": entry.details,
            "ip_address": entry.ip_address,
            "user_agent": entry.user_agent,
            "request_id": entry.request_id,
            "created_at": entry.timestamp
        }).execute()
        
        if result.data:
            logger.info(f"Audit log created: {entry.request_id}")
        
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")


# Convenience function to log high-value actions
async def audit_action(
    request: Request,
    user: Dict[str, Any],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log high-value actions to audit trail"""
    
    audit_entry = AuditLogEntry(
        user_id=user.get("user_id"),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.headers.get("X-Forwarded-For", request.client.host if request.client else None),
        user_agent=request.headers.get("user-agent"),
        request_id=request.headers.get("X-Request-ID")
    )
    
    await create_audit_log(audit_entry)