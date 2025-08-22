import logging
import json
from datetime import datetime
from pythonjsonlogger import jsonlogger
from .config import settings

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for structured logging"""
    
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add custom fields if present
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        if hasattr(record, 'method'):
            log_record['method'] = record.method
        if hasattr(record, 'path'):
            log_record['path'] = record.path
        if hasattr(record, 'status_code'):
            log_record['status_code'] = record.status_code
        if hasattr(record, 'duration'):
            log_record['duration'] = record.duration

def setup_logger(name: str = None) -> logging.Logger:
    """Setup logger with JSON formatting"""
    logger = logging.getLogger(name or __name__)
    
    # Clear existing handlers
    logger.handlers = []
    
    # Create console handler
    handler = logging.StreamHandler()
    
    # Set formatter
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    # Set log level from settings
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    return logger

# Create default logger
logger = setup_logger("app")

class LoggingMiddleware:
    """Middleware for request/response logging"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request, call_next):
        import time
        import uuid
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Log request
        start_time = time.time()
        logger.info(
            "API Request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None
            }
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "API Response",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration": round(duration, 3)
            }
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response

def log_error(error: Exception, context: dict = None):
    """Log error with context"""
    error_data = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": None
    }
    
    if context:
        error_data.update(context)
    
    # Get traceback if available
    import traceback
    if hasattr(error, '__traceback__'):
        error_data["traceback"] = traceback.format_tb(error.__traceback__)
    
    logger.error("Error occurred", extra=error_data)

def log_audit(action: str, user_id: str, module: str, entity_id: str = None, details: dict = None):
    """Log audit trail"""
    audit_data = {
        "action": action,
        "user_id": user_id,
        "module": module,
        "entity_id": entity_id,
        "details": details or {}
    }
    
    logger.info(f"Audit: {action}", extra=audit_data)