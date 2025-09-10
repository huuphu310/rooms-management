from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.redis_client import RedisClient
from app.core.logger import setup_logger, LoggingMiddleware
from app.core.exceptions import BaseAPIException
from app.core.websocket import websocket_manager
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.api.v1.api import api_router

# Setup logger
logger = setup_logger("app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting up application...")
    try:
        await init_database()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await close_database()
    await RedisClient.close()
    logger.info("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API Documentation - Cache is automatically cleared when accessing /docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
    # Disable automatic redirect from /path to /path/
    redirect_slashes=False
)

# Add ProxyHeaders middleware to handle HTTPS behind proxy (Cloudflare)
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    """Handle proxy headers to preserve HTTPS scheme"""
    async def dispatch(self, request: Request, call_next):
        # Check for proxy headers
        x_forwarded_proto = request.headers.get("x-forwarded-proto")
        x_forwarded_host = request.headers.get("x-forwarded-host")
        
        # Update scheme if behind HTTPS proxy
        if x_forwarded_proto:
            request.scope["scheme"] = x_forwarded_proto
        
        # Update host if provided by proxy
        if x_forwarded_host:
            request.scope["server"] = (x_forwarded_host, 443 if x_forwarded_proto == "https" else 80)
        
        response = await call_next(request)
        return response

# Add proxy headers middleware first (before CORS)
app.add_middleware(ProxyHeadersMiddleware)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add security middleware (order matters - security headers first)
app.add_middleware(SecurityHeadersMiddleware)

# Add request logging and audit middleware
app.add_middleware(
    RequestLoggingMiddleware,
    log_body=False,  # Set to True for debugging (careful with PII)
    log_sensitive_paths=True
)

# Add existing logging middleware
app.middleware("http")(LoggingMiddleware(app))

# Exception handlers
@app.exception_handler(BaseAPIException)
async def api_exception_handler(request: Request, exc: BaseAPIException):
    """Handle custom API exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "details": {}
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {}
            }
        }
    )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket endpoint
from fastapi import WebSocket, WebSocketDisconnect
import uuid
import json

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    connection_id = str(uuid.uuid4())
    
    try:
        await websocket_manager.connection_manager.connect(websocket, connection_id)
        
        while True:
            # Wait for client messages
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get('type')
                
                if message_type == 'join_invoice':
                    invoice_code = message.get('invoice_code')
                    if invoice_code:
                        websocket_manager.connection_manager.join_invoice_room(connection_id, invoice_code)
                        await websocket_manager.connection_manager.send_personal_message({
                            'type': 'joined_invoice',
                            'invoice_code': invoice_code
                        }, websocket)
                
                elif message_type == 'leave_invoice':
                    invoice_code = message.get('invoice_code')
                    if invoice_code:
                        websocket_manager.connection_manager.leave_invoice_room(connection_id, invoice_code)
                        await websocket_manager.connection_manager.send_personal_message({
                            'type': 'left_invoice',
                            'invoice_code': invoice_code
                        }, websocket)
                
                elif message_type == 'ping':
                    await websocket_manager.connection_manager.send_personal_message({
                        'type': 'pong'
                    }, websocket)
                
            except json.JSONDecodeError:
                await websocket_manager.connection_manager.send_personal_message({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                }, websocket)
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await websocket_manager.connection_manager.send_personal_message({
                    'type': 'error', 
                    'message': 'Message processing error'
                }, websocket)
                
    except WebSocketDisconnect:
        websocket_manager.connection_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        websocket_manager.connection_manager.disconnect(connection_id)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy",
        "docs": f"{settings.API_V1_STR}/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )