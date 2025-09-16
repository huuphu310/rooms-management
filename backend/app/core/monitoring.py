"""
New Relic monitoring integration for API performance tracking.
Only activates when NEW_RELIC_LICENSE_KEY is set in environment.
"""

import os
import logging
import functools
import time
from typing import Any, Callable, Optional, Dict
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Check if New Relic is configured
NEW_RELIC_ENABLED = bool(os.getenv('NEW_RELIC_LICENSE_KEY'))
NEW_RELIC_APP_NAME = os.getenv('NEW_RELIC_APP_NAME', 'Room Booking System')
NEW_RELIC_ENVIRONMENT = os.getenv('NEW_RELIC_ENVIRONMENT', 'development')

# Try to import New Relic only if configured
newrelic_agent = None
if NEW_RELIC_ENABLED:
    try:
        import newrelic.agent as newrelic_agent
        logger.info("New Relic monitoring enabled")
    except ImportError:
        logger.warning("New Relic package not installed, monitoring disabled")
        NEW_RELIC_ENABLED = False
else:
    logger.info("New Relic monitoring not configured (NEW_RELIC_LICENSE_KEY not set)")


class MonitoringService:
    """Service for handling application monitoring and metrics."""
    
    def __init__(self):
        self.enabled = NEW_RELIC_ENABLED
        self.app_name = NEW_RELIC_APP_NAME
        self.environment = NEW_RELIC_ENVIRONMENT
        
    def initialize(self):
        """Initialize New Relic agent if enabled."""
        if not self.enabled or not newrelic_agent:
            return
            
        try:
            # Initialize the New Relic agent
            config_file = os.getenv('NEW_RELIC_CONFIG_FILE')
            if config_file and os.path.exists(config_file):
                newrelic_agent.initialize(config_file, self.environment)
            else:
                # Initialize with environment variables
                newrelic_agent.initialize()
            logger.info(f"New Relic agent initialized for {self.app_name}")
        except Exception as e:
            logger.error(f"Failed to initialize New Relic: {e}")
            self.enabled = False
    
    @contextmanager
    def background_task(self, name: str, group: Optional[str] = None):
        """Context manager for monitoring background tasks."""
        if self.enabled and newrelic_agent:
            with newrelic_agent.BackgroundTask(
                newrelic_agent.application(),
                name=name,
                group=group
            ):
                yield
        else:
            yield
    
    def record_custom_metric(self, name: str, value: float):
        """Record a custom metric."""
        if self.enabled and newrelic_agent:
            try:
                newrelic_agent.record_custom_metric(f"Custom/{name}", value)
            except Exception as e:
                logger.error(f"Failed to record custom metric {name}: {e}")
    
    def record_custom_event(self, event_type: str, params: Dict[str, Any]):
        """Record a custom event."""
        if self.enabled and newrelic_agent:
            try:
                newrelic_agent.record_custom_event(event_type, params)
            except Exception as e:
                logger.error(f"Failed to record custom event {event_type}: {e}")
    
    def notice_error(self, error: Exception, params: Optional[Dict[str, Any]] = None):
        """Record an error with New Relic."""
        if self.enabled and newrelic_agent:
            try:
                newrelic_agent.notice_error(attributes=params)
            except Exception as e:
                logger.error(f"Failed to notice error: {e}")
    
    def add_custom_parameter(self, key: str, value: Any):
        """Add a custom parameter to the current transaction."""
        if self.enabled and newrelic_agent:
            try:
                newrelic_agent.add_custom_parameter(key, value)
            except Exception as e:
                logger.error(f"Failed to add custom parameter {key}: {e}")


# Global monitoring service instance
monitoring = MonitoringService()


def monitor_performance(name: Optional[str] = None, category: str = "endpoint"):
    """
    Decorator to monitor function performance.
    
    Args:
        name: Optional custom name for the transaction
        category: Category of the operation (endpoint, service, database, etc.)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            transaction_name = name or f"{func.__module__}.{func.__name__}"
            start_time = time.time()
            
            try:
                # Add transaction context if New Relic is enabled
                if monitoring.enabled and newrelic_agent:
                    with newrelic_agent.FunctionTrace(transaction_name):
                        result = await func(*args, **kwargs)
                else:
                    result = await func(*args, **kwargs)
                
                # Record success metric
                duration = time.time() - start_time
                monitoring.record_custom_metric(f"{category}/{transaction_name}/duration", duration)
                monitoring.record_custom_metric(f"{category}/{transaction_name}/success", 1)
                
                return result
                
            except Exception as e:
                # Record error metric
                duration = time.time() - start_time
                monitoring.record_custom_metric(f"{category}/{transaction_name}/duration", duration)
                monitoring.record_custom_metric(f"{category}/{transaction_name}/error", 1)
                monitoring.notice_error(e, {"function": transaction_name, "category": category})
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            transaction_name = name or f"{func.__module__}.{func.__name__}"
            start_time = time.time()
            
            try:
                # Add transaction context if New Relic is enabled
                if monitoring.enabled and newrelic_agent:
                    with newrelic_agent.FunctionTrace(transaction_name):
                        result = func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Record success metric
                duration = time.time() - start_time
                monitoring.record_custom_metric(f"{category}/{transaction_name}/duration", duration)
                monitoring.record_custom_metric(f"{category}/{transaction_name}/success", 1)
                
                return result
                
            except Exception as e:
                # Record error metric
                duration = time.time() - start_time
                monitoring.record_custom_metric(f"{category}/{transaction_name}/duration", duration)
                monitoring.record_custom_metric(f"{category}/{transaction_name}/error", 1)
                monitoring.notice_error(e, {"function": transaction_name, "category": category})
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def monitor_database_operation(operation: str):
    """
    Decorator specifically for database operations.
    
    Args:
        operation: Name of the database operation (e.g., "select", "insert", "update")
    """
    return monitor_performance(name=operation, category="database")


def monitor_external_service(service: str):
    """
    Decorator for external service calls.
    
    Args:
        service: Name of the external service (e.g., "supabase", "redis", "smtp")
    """
    return monitor_performance(category=f"external/{service}")


class PerformanceTimer:
    """Context manager for timing code blocks."""
    
    def __init__(self, name: str, record_metric: bool = True):
        self.name = name
        self.record_metric = record_metric
        self.start_time = None
        self.duration = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.time() - self.start_time
        
        if self.record_metric:
            monitoring.record_custom_metric(f"Timer/{self.name}", self.duration)
        
        # Log slow operations
        if self.duration > 1.0:  # Log operations taking more than 1 second
            logger.warning(f"Slow operation detected: {self.name} took {self.duration:.2f}s")