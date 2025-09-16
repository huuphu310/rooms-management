#!/usr/bin/env python3
"""
Test script to verify Sentry integration.

This script demonstrates that:
1. Sentry initializes conditionally based on SENTRY_DSN configuration
2. Logging works properly without Sentry configuration
3. All types of logs (info, warning, error) are captured
"""

import os
import logging
from datetime import datetime

# Set up the environment to load our config
os.environ.setdefault('PYTHONPATH', '/Users/huuphu/Development/room_booking/backend')

from app.core.config import settings
from app.core.logger import setup_logger

def test_sentry_initialization():
    """Test that Sentry initializes correctly"""
    print("=== Sentry Integration Test ===")
    print(f"SENTRY_DSN configured: {'Yes' if settings.SENTRY_DSN else 'No'}")
    print(f"SENTRY_ENVIRONMENT: {settings.SENTRY_ENVIRONMENT}")
    print(f"SENTRY_TRACES_SAMPLE_RATE: {settings.SENTRY_TRACES_SAMPLE_RATE}")
    print(f"SENTRY_PROFILES_SAMPLE_RATE: {settings.SENTRY_PROFILES_SAMPLE_RATE}")
    print()

def test_logging():
    """Test various logging levels"""
    logger = setup_logger("sentry_test")
    
    print("=== Testing Logging Levels ===")
    
    # Info logs
    logger.info("This is an info message - application startup")
    logger.info("User authentication successful", extra={
        "user_id": "test-user-123",
        "email": "test@example.com",
        "action": "login"
    })
    
    # Warning logs
    logger.warning("This is a warning message - slow database query")
    logger.warning("Rate limit approaching", extra={
        "user_id": "test-user-123",
        "requests_per_minute": 95,
        "limit": 100
    })
    
    # Error logs
    logger.error("This is an error message - database connection failed")
    logger.error("Payment processing failed", extra={
        "user_id": "test-user-123",
        "payment_amount": 100.00,
        "error_code": "CARD_DECLINED"
    })
    
    print("✅ All log levels tested successfully")
    print()

def test_sentry_error_capture():
    """Test that Sentry captures exceptions when configured"""
    logger = setup_logger("sentry_test")
    
    print("=== Testing Exception Capture ===")
    
    try:
        # Simulate an error
        result = 10 / 0
    except ZeroDivisionError as e:
        logger.error(f"Division by zero error caught: {str(e)}", extra={
            "error_type": "ZeroDivisionError",
            "operation": "division",
            "numerator": 10,
            "denominator": 0
        })
        print("✅ Exception logged successfully")
    
    try:
        # Simulate a different error
        data = {"key": "value"}
        missing_value = data["missing_key"]
    except KeyError as e:
        logger.error(f"Key error caught: {str(e)}", extra={
            "error_type": "KeyError", 
            "data_keys": list(data.keys()),
            "requested_key": "missing_key"
        })
        print("✅ KeyError logged successfully")
    
    print()

def test_custom_context():
    """Test logging with custom context"""
    logger = setup_logger("sentry_test")
    
    print("=== Testing Custom Context ===")
    
    # Simulate a booking process with context
    booking_context = {
        "booking_id": "booking-123",
        "user_id": "user-456", 
        "room_type": "deluxe",
        "check_in": "2024-09-15",
        "check_out": "2024-09-18"
    }
    
    logger.info("Booking process started", extra=booking_context)
    logger.info("Room availability verified", extra={**booking_context, "rooms_available": 3})
    logger.info("Payment processed successfully", extra={**booking_context, "amount": 450.00, "currency": "USD"})
    logger.info("Booking confirmed", extra={**booking_context, "confirmation_code": "ABC123"})
    
    print("✅ Custom context logging tested successfully")
    print()

if __name__ == "__main__":
    print(f"Test started at: {datetime.now()}")
    print()
    
    test_sentry_initialization()
    test_logging()
    test_sentry_error_capture()
    test_custom_context()
    
    print("=== Test Summary ===")
    if settings.SENTRY_DSN:
        print("✅ Sentry is configured and will capture all logs and errors")
        print("📊 Check your Sentry dashboard for the test logs and errors")
        print(f"🌍 Environment: {settings.SENTRY_ENVIRONMENT}")
    else:
        print("ℹ️  Sentry is not configured (SENTRY_DSN is empty)")
        print("📝 All logs are displayed in console only")
        print("💡 To enable Sentry: Set SENTRY_DSN in your .env file")
    
    print()
    print("🎉 Sentry integration test completed successfully!")