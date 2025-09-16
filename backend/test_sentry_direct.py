#!/usr/bin/env python3
"""
Direct Sentry test to verify events are being sent to dashboard.
"""

import os
import sentry_sdk
from datetime import datetime

# Set up the environment to load our config
os.environ.setdefault('PYTHONPATH', '/Users/huuphu/Development/room_booking/backend')

from app.core.config import settings

def test_sentry_direct_integration():
    """Test Sentry integration by directly sending events"""
    print("=== Direct Sentry Integration Test ===")
    print(f"SENTRY_DSN configured: {'Yes' if settings.SENTRY_DSN else 'No'}")
    
    if not settings.SENTRY_DSN:
        print("❌ Sentry DSN not configured")
        return
    
    # Send a direct message to Sentry
    print("📤 Sending direct message to Sentry...")
    sentry_sdk.capture_message("Direct Sentry test message from backend", level="info")
    
    # Send an exception
    print("📤 Sending exception to Sentry...")
    try:
        raise ValueError("Test exception for Sentry verification")
    except Exception as e:
        sentry_sdk.capture_exception(e)
    
    # Send a message with context
    print("📤 Sending message with context to Sentry...")
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("test_type", "direct_integration")
        scope.set_user({"id": "test-user", "email": "test@example.com"})
        scope.set_context("app_info", {
            "environment": settings.SENTRY_ENVIRONMENT,
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION
        })
        sentry_sdk.capture_message("Test message with context", level="warning")
    
    # Force flush to ensure events are sent
    print("📤 Flushing Sentry events...")
    sentry_sdk.flush(timeout=5)
    
    print("✅ Direct Sentry test completed!")
    print("🔍 Check your Sentry dashboard in the next few minutes")
    print(f"   Dashboard URL should be at: https://sentry.io/")
    print(f"   Project environment: {settings.SENTRY_ENVIRONMENT}")

if __name__ == "__main__":
    print(f"Test started at: {datetime.now()}")
    print()
    
    test_sentry_direct_integration()
    
    print()
    print("🎉 Direct Sentry test completed - check your dashboard!")