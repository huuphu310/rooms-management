#!/usr/bin/env python3
"""
Test to verify if Sentry automatically captures logging events from the application.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from datetime import datetime

# Set up the environment to load our config
os.environ.setdefault('PYTHONPATH', '/Users/huuphu/Development/room_booking/backend')

from app.core.config import settings
from app.core.logger import setup_logger

def test_sentry_logging_integration():
    """Test if Sentry captures logging events"""
    print("=== Sentry Logging Integration Test ===")
    print(f"SENTRY_DSN configured: {'Yes' if settings.SENTRY_DSN else 'No'}")
    
    if not settings.SENTRY_DSN:
        print("❌ Sentry DSN not configured")
        return
    
    # Re-initialize Sentry with logging integration to capture logs
    print("🔄 Re-initializing Sentry with logging integration...")
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        send_default_pii=True,
        release=f"{settings.PROJECT_NAME}@{settings.VERSION}",
        integrations=[
            LoggingIntegration(
                level=None,  # Capture all log levels
                event_level=None  # Send all logs as events to Sentry
            ),
        ],
    )
    
    # Get the application logger
    logger = setup_logger("sentry_logging_test")
    
    # Test different log levels
    print("📤 Sending INFO log...")
    logger.info("Test INFO log message for Sentry", extra={
        "test_type": "logging_integration",
        "user_id": "test-user-456"
    })
    
    print("📤 Sending WARNING log...")
    logger.warning("Test WARNING log message for Sentry", extra={
        "test_type": "logging_integration", 
        "alert_level": "medium"
    })
    
    print("📤 Sending ERROR log...")
    logger.error("Test ERROR log message for Sentry", extra={
        "test_type": "logging_integration",
        "error_code": "TEST_001"
    })
    
    # Test with an actual exception
    print("📤 Logging an exception...")
    try:
        result = 1 / 0
    except ZeroDivisionError as e:
        logger.error("Division by zero in logging test", exc_info=True, extra={
            "test_type": "logging_integration",
            "operation": "division",
            "numerator": 1,
            "denominator": 0
        })
    
    # Force flush to ensure events are sent
    print("📤 Flushing Sentry events...")
    sentry_sdk.flush(timeout=5)
    
    print("✅ Logging integration test completed!")
    print("🔍 Check your Sentry dashboard for log events")

if __name__ == "__main__":
    print(f"Test started at: {datetime.now()}")
    print()
    
    test_sentry_logging_integration()
    
    print()
    print("🎉 Sentry logging integration test completed!")