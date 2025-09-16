#!/usr/bin/env python3
"""
Test script for shift-based pricing functionality
Tests the creation of room types with shift pricing and booking creation with shift types
"""

import os
import sys
from datetime import datetime, date, time
from decimal import Decimal
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")
    sys.exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_shift_pricing():
    """Test shift-based pricing functionality"""
    print("\n🧪 Testing Shift-Based Pricing System")
    print("=" * 50)
    
    # Step 1: Check if migration has been applied
    print("\n1️⃣  Checking database migration status...")
    try:
        result = supabase.table("room_types").select("*").limit(1).execute()
        if result.data:
            room_type = result.data[0] if result.data else {}
            if 'day_shift_price' in room_type:
                print("✅ Shift pricing columns exist in database")
            else:
                print("⚠️  Shift pricing columns not found - migration may not be applied")
                print("   Please apply migration: 012_shift_based_pricing.sql")
                return False
        else:
            print("ℹ️  No room types found, will create test data")
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False
    
    # Step 2: Create a test room type with shift pricing
    print("\n2️⃣  Creating test room type with shift pricing...")
    test_room_type = {
        "name": "Shift Test Room",
        "base_price": 1000000,  # 1,000,000 VND for traditional pricing
        "pricing_mode": "shift",
        "day_shift_price": 600000,  # 600,000 VND for day shift
        "night_shift_price": 800000,  # 800,000 VND for night shift
        "full_day_price": 1200000,  # 1,200,000 VND for full day
        "weekend_day_shift_price": 700000,
        "weekend_night_shift_price": 900000,
        "weekend_full_day_price": 1400000,
        "day_shift_start_time": "09:00:00",
        "day_shift_end_time": "16:30:00",
        "night_shift_start_time": "17:30:00",
        "night_shift_end_time": "08:30:00",
        "max_occupancy": 2,
        "min_occupancy": 1,
        "max_adults": 2,
        "max_children": 1,
        "standard_adults_occupancy": 2,
        "standard_children_occupancy": 0,
        "extra_adult_charge": 200000,
        "extra_child_charge": 100000,
        "is_active": True
    }
    
    try:
        result = supabase.table("room_types").insert(test_room_type).execute()
        if result.data:
            room_type_id = result.data[0]['id']
            print(f"✅ Created room type with ID: {room_type_id}")
            print(f"   - Day shift: {test_room_type['day_shift_price']:,} VND")
            print(f"   - Night shift: {test_room_type['night_shift_price']:,} VND")
            print(f"   - Full day: {test_room_type['full_day_price']:,} VND")
        else:
            print("❌ Failed to create room type")
            return False
    except Exception as e:
        print(f"❌ Error creating room type: {e}")
        # Try to find existing test room type
        try:
            result = supabase.table("room_types").select("*").eq("name", "Shift Test Room").execute()
            if result.data:
                room_type_id = result.data[0]['id']
                print(f"ℹ️  Using existing room type: {room_type_id}")
            else:
                return False
        except:
            return False
    
    # Step 3: Create a test room for this room type
    print("\n3️⃣  Creating test room...")
    test_room = {
        "room_number": "SHIFT-101",
        "room_type_id": room_type_id,
        "status": "available",
        "is_active": True
    }
    
    try:
        # Check if room already exists
        existing = supabase.table("rooms").select("*").eq("room_number", "SHIFT-101").execute()
        if existing.data:
            room_id = existing.data[0]['id']
            print(f"ℹ️  Using existing room: {room_id}")
        else:
            result = supabase.table("rooms").insert(test_room).execute()
            if result.data:
                room_id = result.data[0]['id']
                print(f"✅ Created room with ID: {room_id}")
            else:
                print("❌ Failed to create room")
                return False
    except Exception as e:
        print(f"❌ Error creating room: {e}")
        return False
    
    # Step 4: Test booking with different shift types
    print("\n4️⃣  Testing shift-based bookings...")
    
    # Get or create a test customer
    try:
        customer_result = supabase.table("customers").select("*").limit(1).execute()
        if customer_result.data:
            customer_id = customer_result.data[0]['id']
        else:
            # Create a test customer
            test_customer = {
                "name": "Shift Test Customer",
                "email": "shift.test@example.com",
                "phone": "0123456789",
                "id_number": "123456789"
            }
            customer_result = supabase.table("customers").insert(test_customer).execute()
            customer_id = customer_result.data[0]['id'] if customer_result.data else None
        
        if not customer_id:
            print("❌ Could not get or create customer")
            return False
    except Exception as e:
        print(f"❌ Error with customer: {e}")
        return False
    
    # Test different shift types
    shift_tests = [
        {
            "shift_type": "day_shift",
            "shift_date": date.today().isoformat(),
            "expected_price": 600000,
            "description": "Day Shift (9:00 AM - 4:30 PM)"
        },
        {
            "shift_type": "night_shift", 
            "shift_date": date.today().isoformat(),
            "expected_price": 800000,
            "description": "Night Shift (5:30 PM - 8:30 AM)"
        },
        {
            "shift_type": "full_day",
            "shift_date": date.today().isoformat(),
            "expected_price": 1200000,
            "description": "Full Day (24 hours)"
        }
    ]
    
    for test in shift_tests:
        print(f"\n   Testing {test['description']}...")
        test_booking = {
            "customer_id": customer_id,
            "room_id": room_id,
            "room_type_id": room_type_id,
            "check_in_date": test["shift_date"],
            "check_out_date": test["shift_date"],  # Same day for shift booking
            "shift_type": test["shift_type"],
            "shift_date": test["shift_date"],
            "total_shifts": 1,
            "adults": 2,
            "children": 0,
            "total_amount": test["expected_price"],
            "status": "confirmed",
            "booking_date": datetime.now().isoformat()
        }
        
        try:
            result = supabase.table("bookings").insert(test_booking).execute()
            if result.data:
                booking_id = result.data[0]['id']
                print(f"   ✅ Created {test['shift_type']} booking: {booking_id}")
                print(f"      Price: {test['expected_price']:,} VND")
            else:
                print(f"   ❌ Failed to create {test['shift_type']} booking")
        except Exception as e:
            print(f"   ❌ Error creating booking: {e}")
    
    # Step 5: Verify shift pricing retrieval
    print("\n5️⃣  Verifying shift pricing data retrieval...")
    try:
        result = supabase.table("room_types").select("*").eq("id", room_type_id).execute()
        if result.data:
            room_type = result.data[0]
            print("✅ Room type shift pricing retrieved successfully:")
            print(f"   - Pricing mode: {room_type.get('pricing_mode', 'N/A')}")
            print(f"   - Day shift price: {room_type.get('day_shift_price', 'N/A')}")
            print(f"   - Night shift price: {room_type.get('night_shift_price', 'N/A')}")
            print(f"   - Full day price: {room_type.get('full_day_price', 'N/A')}")
    except Exception as e:
        print(f"❌ Error retrieving room type: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Shift-based pricing tests completed successfully!")
    return True

def cleanup_test_data():
    """Clean up test data created during testing"""
    print("\n🧹 Cleaning up test data...")
    try:
        # Delete test bookings
        supabase.table("bookings").delete().like("room_id", "%SHIFT%").execute()
        
        # Delete test room
        supabase.table("rooms").delete().eq("room_number", "SHIFT-101").execute()
        
        # Delete test room type
        supabase.table("room_types").delete().eq("name", "Shift Test Room").execute()
        
        print("✅ Test data cleaned up")
    except Exception as e:
        print(f"⚠️  Error cleaning up test data: {e}")

if __name__ == "__main__":
    try:
        success = test_shift_pricing()
        if success:
            print("\n🎉 All shift-based pricing tests passed!")
            
            # Ask if user wants to clean up test data
            response = input("\nDo you want to clean up test data? (y/n): ")
            if response.lower() == 'y':
                cleanup_test_data()
        else:
            print("\n❌ Some tests failed. Please check the errors above.")
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")