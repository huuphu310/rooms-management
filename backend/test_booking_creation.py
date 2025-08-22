#!/usr/bin/env python3

import asyncio
import json
from datetime import date, time, timedelta
from decimal import Decimal
import httpx

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_DATA = {
    "booking_type": "individual",
    "guest_name": "Test Guest",
    "guest_email": "test@example.com",
    "guest_phone": "+84901234567",
    "guest_country": "Vietnam",
    "room_type_id": "550e8400-e29b-41d4-a716-446655440001",  # Replace with actual room type ID
    "check_in_date": str(date.today() + timedelta(days=1)),
    "check_out_date": str(date.today() + timedelta(days=3)),
    "check_in_time": "14:00:00",
    "check_out_time": "12:00:00",
    "adults": 2,
    "children": 0,
    "infants": 0,
    "room_rate": "950000",
    "source": "direct",
    "special_requests": "Late check-in requested"
}

async def test_booking_creation():
    """Test booking creation end-to-end"""
    async with httpx.AsyncClient() as client:
        try:
            # First, get room types to use a valid ID
            print("1. Fetching room types...")
            response = await client.get(f"{BASE_URL}/rooms/types")
            if response.status_code == 200:
                room_types_response = response.json()
                room_types = room_types_response.get('data', [])
                if room_types and len(room_types) > 0:
                    TEST_DATA["room_type_id"] = room_types[0]["id"]
                    print(f"   Using room type: {room_types[0]['name']} (ID: {room_types[0]['id']})")
                else:
                    print("   No room types found. Please create room types first.")
                    return
            else:
                print(f"   Failed to fetch room types: {response.status_code}")
                return
            
            # Test booking creation
            print("\n2. Creating booking...")
            print(f"   Check-in: {TEST_DATA['check_in_date']}")
            print(f"   Check-out: {TEST_DATA['check_out_date']}")
            
            response = await client.post(
                f"{BASE_URL}/bookings/",
                json=TEST_DATA,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Response status: {response.status_code}")
            
            if response.status_code == 201 or response.status_code == 200:
                booking = response.json()
                print(f"   ✓ Booking created successfully!")
                print(f"   Booking code: {booking.get('booking_code', 'N/A')}")
                print(f"   Total amount: {booking.get('total_amount', 'N/A')}")
                print(f"   Balance due: {booking.get('balance_due', 'N/A')}")
                return booking
            else:
                print(f"   ✗ Failed to create booking")
                print(f"   Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"Error during test: {str(e)}")
            return None

async def test_pricing_calculation():
    """Test pricing calculation"""
    async with httpx.AsyncClient() as client:
        try:
            print("\n3. Testing pricing calculation...")
            
            # Get room types first
            response = await client.get(f"{BASE_URL}/rooms/types")
            if response.status_code != 200:
                print("   Failed to fetch room types for pricing test")
                return
            
            room_types_response = response.json()
            room_types = room_types_response.get('data', [])
            if not room_types:
                print("   No room types available for testing")
                return
            
            room_type = room_types[0]
            
            # Test availability and pricing
            availability_data = {
                "check_in_date": str(date.today() + timedelta(days=1)),
                "check_out_date": str(date.today() + timedelta(days=3)),
                "room_type_id": room_type["id"],
                "adults": 2,
                "children": 0
            }
            
            response = await client.post(
                f"{BASE_URL}/bookings/availability",
                json=availability_data
            )
            
            if response.status_code == 200:
                availability = response.json()
                print(f"   ✓ Pricing calculation successful")
                print(f"   Available: {availability.get('available', False)}")
                print(f"   Total nights: {availability.get('total_nights', 0)}")
                if availability.get('room_types'):
                    for rt in availability['room_types']:
                        print(f"   Room type: {rt.get('room_type_name', 'N/A')}")
                        print(f"   Base rate: {rt.get('base_rate', 0)}")
                        print(f"   Seasonal rate: {rt.get('rate_with_seasonal', 0)}")
            else:
                print(f"   ✗ Failed to calculate pricing: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"Error during pricing test: {str(e)}")

async def main():
    print("=" * 60)
    print("BOOKING CREATION END-TO-END TEST")
    print("=" * 60)
    
    # Test booking creation
    booking = await test_booking_creation()
    
    # Test pricing calculation
    await test_pricing_calculation()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())