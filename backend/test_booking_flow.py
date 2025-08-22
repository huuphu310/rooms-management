#!/usr/bin/env python3
"""Test script to verify the complete booking creation flow"""

import asyncio
import httpx
from datetime import date, timedelta
import json
from decimal import Decimal

BASE_URL = "http://localhost:8000/api/v1"

# Test booking data
test_booking = {
    "booking_type": "individual",
    "guest_name": "John Doe",
    "guest_email": "john.doe@example.com",
    "guest_phone": "+84 90 123 4567",
    "guest_country": "USA",
    "room_type_id": "21fa2612-4ec5-49f9-8f92-633ea37c701b",  # Deluxe Room ID
    "check_in_date": str(date.today() + timedelta(days=7)),
    "check_out_date": str(date.today() + timedelta(days=10)),
    "check_in_time": "14:00",
    "check_out_time": "12:00",
    "adults": 2,
    "children": 0,
    "infants": 0,
    "room_rate": 1200000,
    "extra_persons": 1,
    "extra_person_charge": 200000,
    "extra_beds": 0,
    "extra_bed_charge": 0,
    "service_charges": 0,
    "tax_percentage": 10,
    "tax_amount": 0,
    "discount_type": "percentage",
    "discount_value": 10,
    "discount_amount": 0,
    "discount_reason": "Early booking discount",
    "deposit_paid": 800000,
    "source": "direct",
    "channel": "",
    "special_requests": "Late check-out if possible"
}

async def test_booking_creation():
    """Test the complete booking creation flow"""
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("TESTING BOOKING CREATION FLOW")
        print("=" * 60)
        
        # Step 1: Calculate pricing
        print("\n1. Testing price calculation...")
        price_request = {
            "room_type_id": test_booking["room_type_id"],
            "check_in_date": test_booking["check_in_date"],
            "check_out_date": test_booking["check_out_date"],
            "adults": test_booking["adults"],
            "children": test_booking["children"],
            "extra_persons": test_booking["extra_persons"],
            "extra_beds": test_booking["extra_beds"]
        }
        
        try:
            response = await client.post(
                f"{BASE_URL}/pricing/calculate",
                json=price_request
            )
            if response.status_code == 200:
                price_data = response.json()
                print(f"✓ Price calculation successful:")
                print(f"  - Base total: {price_data.get('base_total', 0):,.0f}")
                print(f"  - Extra charges: {price_data.get('extra_charges', 0):,.0f}")
                print(f"  - Weekend surcharge: {price_data.get('weekend_surcharge', 0):,.0f}")
                print(f"  - Total price: {price_data.get('total_price', 0):,.0f}")
                
                # Update booking with calculated prices
                test_booking["room_rate"] = price_data.get("base_price", 1200000)
            else:
                print(f"✗ Price calculation failed: {response.status_code}")
                print(f"  Response: {response.text}")
        except Exception as e:
            print(f"✗ Price calculation error: {e}")
        
        # Step 2: Check availability
        print("\n2. Checking room availability...")
        availability_params = {
            "check_in_date": test_booking["check_in_date"],
            "check_out_date": test_booking["check_out_date"],
            "room_type_id": test_booking["room_type_id"],
            "adults": test_booking["adults"],
            "children": test_booking["children"]
        }
        
        try:
            response = await client.post(
                f"{BASE_URL}/bookings/availability",
                json=availability_params
            )
            if response.status_code == 200:
                availability = response.json()
                print(f"✓ Availability check successful:")
                print(f"  - Available: {availability.get('available', False)}")
                print(f"  - Available rooms: {availability.get('available_count', 0)}")
            else:
                print(f"✗ Availability check failed: {response.status_code}")
                print(f"  Response: {response.text}")
        except Exception as e:
            print(f"✗ Availability check error: {e}")
        
        # Step 3: Create booking
        print("\n3. Creating booking...")
        
        # Calculate amounts based on pricing
        nights = 3  # 3 nights
        room_charge = test_booking["room_rate"] * nights
        extra_person_total = test_booking["extra_persons"] * test_booking["extra_person_charge"] * nights
        subtotal = room_charge + extra_person_total
        
        # Apply discount
        if test_booking["discount_type"] == "percentage":
            test_booking["discount_amount"] = subtotal * test_booking["discount_value"] / 100
        else:
            test_booking["discount_amount"] = test_booking["discount_value"]
        
        # Calculate tax
        subtotal_after_discount = subtotal - test_booking["discount_amount"]
        test_booking["tax_amount"] = subtotal_after_discount * test_booking["tax_percentage"] / 100
        
        # Remove fields not in BookingCreate schema
        booking_data = {k: v for k, v in test_booking.items() 
                       if k not in ["tax_percentage", "discount_type", "discount_value", "extra_persons", "extra_beds"]}
        
        try:
            response = await client.post(
                f"{BASE_URL}/bookings/",
                json=booking_data
            )
            if response.status_code in [200, 201]:
                booking = response.json()
                print(f"✓ Booking created successfully!")
                print(f"  - Booking ID: {booking.get('id', 'N/A')}")
                print(f"  - Booking Code: {booking.get('booking_code', 'N/A')}")
                print(f"  - Status: {booking.get('status', 'N/A')}")
                print(f"  - Total Amount: {booking.get('total_amount', 0):,.0f}")
                print(f"  - Deposit Required: {booking.get('deposit_required', 0):,.0f}")
                
                return booking.get('id')
            else:
                print(f"✗ Booking creation failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return None
        except Exception as e:
            print(f"✗ Booking creation error: {e}")
            return None

async def main():
    """Run the test"""
    booking_id = await test_booking_creation()
    
    if booking_id:
        print("\n" + "=" * 60)
        print("✓ BOOKING FLOW TEST COMPLETED SUCCESSFULLY")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✗ BOOKING FLOW TEST FAILED")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())