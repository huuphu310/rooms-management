#!/usr/bin/env python3
"""
Test script to simulate real application errors that should appear in Sentry dashboard.
"""

import os
import sys
from datetime import datetime

# Set up the environment to load our config
os.environ.setdefault('PYTHONPATH', '/Users/huuphu/Development/room_booking/backend')

from app.core.config import settings
from app.core.logger import setup_logger

def simulate_application_errors():
    """Simulate various application errors that should be captured by Sentry"""
    print("=== Simulating Application Errors for Sentry ===")
    print(f"SENTRY_DSN configured: {'Yes' if settings.SENTRY_DSN else 'No'}")
    
    if not settings.SENTRY_DSN:
        print("❌ Sentry DSN not configured")
        return
    
    # Get application logger (same as used in the actual app)
    logger = setup_logger("app")
    
    print("🚨 Simulating WARNING logs (these should appear in Sentry)...")
    
    # Simulate authentication warnings
    logger.warning("JWT signature verification failed, using unverified decode (DEBUG mode)", extra={
        "auth_module": "auth", 
        "user_id": "test-user-123",
        "ip_address": "127.0.0.1",
        "action": "login_attempt"
    })
    
    # Simulate database performance warning
    logger.warning("Slow database query detected", extra={
        "query_time": 2.5,
        "query": "SELECT * FROM rooms WHERE ...",
        "user_id": "test-user-456"
    })
    
    print("🔥 Simulating ERROR logs (these should definitely appear in Sentry)...")
    
    # Simulate database connection error
    logger.error("Database connection failed", extra={
        "error_type": "ConnectionError",
        "database": "postgresql",
        "retry_count": 3
    })
    
    # Simulate API error
    logger.error("Payment processing failed", extra={
        "user_id": "test-user-789",
        "booking_id": "booking-456",
        "amount": 250.00,
        "payment_method": "credit_card",
        "error_code": "PAYMENT_DECLINED"
    })
    
    # Simulate an actual exception (this should definitely trigger Sentry)
    try:
        # This will cause a division by zero error
        result = 100 / 0
    except Exception as e:
        logger.error("Critical calculation error in booking system", 
                    exc_info=True, 
                    extra={
                        "operation": "price_calculation",
                        "booking_id": "booking-789",
                        "room_type": "deluxe",
                        "nights": 3
                    })
    
    # Simulate another exception
    try:
        # This will cause a KeyError
        user_data = {"name": "John", "email": "john@example.com"}
        missing_field = user_data["missing_field"]
    except KeyError as e:
        logger.error("Missing required user data field", 
                    exc_info=True,
                    extra={
                        "missing_field": str(e),
                        "available_fields": list(user_data.keys()),
                        "user_id": "test-user-999"
                    })
    
    print("✅ Application error simulation completed!")
    print("🔍 These errors should now appear in your Sentry dashboard")
    print("   - 2 WARNING level logs")
    print("   - 4 ERROR level logs (including 2 with exceptions)")

if __name__ == "__main__":
    print(f"Application error simulation started at: {datetime.now()}")
    print()
    
    simulate_application_errors()
    
    print()
    print("🎯 Check your Sentry dashboard now - you should see real application errors!")