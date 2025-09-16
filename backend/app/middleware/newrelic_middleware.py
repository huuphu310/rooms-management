"""
New Relic middleware for FastAPI application.
Provides automatic transaction tracking and performance monitoring.
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.monitoring import monitoring, NEW_RELIC_ENABLED

logger = logging.getLogger(__name__)

# Try to import New Relic if monitoring is enabled
newrelic_agent = None
if NEW_RELIC_ENABLED:
    try:
        import newrelic.agent as newrelic_agent
    except ImportError:
        pass


class NewRelicMiddleware(BaseHTTPMiddleware):
    """
    Middleware to integrate New Relic monitoring with FastAPI.
    Only active when NEW_RELIC_LICENSE_KEY is set in environment.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.monitoring = monitoring
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process each request with monitoring if enabled."""
        
        # If monitoring is not enabled, just pass through
        if not self.monitoring.enabled:
            return await call_next(request)
        
        # Start timing the request
        start_time = time.time()
        
        # Extract request details
        path = request.url.path
        method = request.method
        transaction_name = f"{method} {path}"
        
        try:
            # Add custom parameters to the transaction
            self.monitoring.add_custom_parameter("http.method", method)
            self.monitoring.add_custom_parameter("http.path", path)
            self.monitoring.add_custom_parameter("http.url", str(request.url))
            
            # Add user information if available
            if hasattr(request.state, "user_id"):
                self.monitoring.add_custom_parameter("user.id", request.state.user_id)
            
            # Process the request
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Record metrics
            self.monitoring.record_custom_metric(f"HTTP/{method}/duration", duration)
            self.monitoring.record_custom_metric(f"HTTP/{response.status_code}/count", 1)
            
            # Record custom event for the request
            self.monitoring.record_custom_event("HTTPRequest", {
                "path": path,
                "method": method,
                "status_code": response.status_code,
                "duration": duration,
                "environment": self.monitoring.environment
            })
            
            # Log slow requests
            if duration > 1.0:
                logger.warning(f"Slow request: {transaction_name} took {duration:.2f}s")
                self.monitoring.record_custom_event("SlowRequest", {
                    "path": path,
                    "method": method,
                    "duration": duration
                })
            
            return response
            
        except Exception as e:
            # Record the error
            duration = time.time() - start_time
            self.monitoring.notice_error(e, {
                "path": path,
                "method": method,
                "duration": duration
            })
            self.monitoring.record_custom_metric(f"HTTP/Error/count", 1)
            
            # Re-raise the exception
            raise


class NewRelicASGIMiddleware:
    """
    ASGI middleware for New Relic that wraps the entire application.
    This ensures proper transaction naming and context.
    """
    
    def __init__(self, app: ASGIApp):
        self.app = app
        self.monitoring = monitoring
        
        # Wrap the app with New Relic ASGI wrapper if available
        if NEW_RELIC_ENABLED and newrelic_agent:
            try:
                self.app = newrelic_agent.ASGIApplicationWrapper(app)
                logger.info("New Relic ASGI wrapper applied")
            except Exception as e:
                logger.error(f"Failed to apply New Relic ASGI wrapper: {e}")
    
    async def __call__(self, scope, receive, send):
        """Handle ASGI requests."""
        
        # Set transaction name based on the route
        if scope["type"] == "http" and self.monitoring.enabled:
            path = scope.get("path", "/")
            method = scope.get("method", "GET")
            
            # Set the transaction name for New Relic
            if newrelic_agent:
                try:
                    transaction = newrelic_agent.current_transaction()
                    if transaction:
                        newrelic_agent.set_transaction_name(f"{method} {path}")
                except Exception as e:
                    logger.debug(f"Could not set transaction name: {e}")
        
        await self.app(scope, receive, send)


def add_newrelic_middleware(app):
    """
    Add New Relic middleware to the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    if not NEW_RELIC_ENABLED:
        logger.info("New Relic middleware not added (monitoring disabled)")
        return
    
    try:
        # Add the middleware
        app.add_middleware(NewRelicMiddleware)
        
        # Also wrap with ASGI middleware for complete coverage
        if newrelic_agent:
            original_app = app
            app = newrelic_agent.ASGIApplicationWrapper(original_app)
            logger.info("New Relic middleware added successfully")
            
    except Exception as e:
        logger.error(f"Failed to add New Relic middleware: {e}")