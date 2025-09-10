#!/usr/bin/env python3
"""
Insert Sample Booking Data for August 23-30, 2025
This script inserts sample booking data into Supabase database
"""

import os
import sys
from datetime import datetime, date
from decimal import Decimal
import json
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY must be set")
    sys.exit(1)

supabase: Client = create_client(url, key)

def insert_room_types():
    """Insert sample room types"""
    room_types = [
        {
            'id': 'a1111111-1111-1111-1111-111111111111',
            'name': 'Standard Single',
            'code': 'STD-S',
            'base_price': 500000,
            'weekend_price': 600000,
            'max_occupancy': 2,
            'min_occupancy': 1,
            'extra_person_charge': 150000,
            'amenities': ["wifi", "ac", "tv", "minibar"],
            'size_sqm': 20,
            'description': 'Cozy single room with city view',
            'is_active': True
        },
        {
            'id': 'a2222222-2222-2222-2222-222222222222',
            'name': 'Deluxe Double',
            'code': 'DLX-D',
            'base_price': 800000,
            'weekend_price': 950000,
            'max_occupancy': 3,
            'min_occupancy': 1,
            'extra_person_charge': 200000,
            'amenities': ["wifi", "ac", "tv", "minibar", "bathtub", "workspace"],
            'size_sqm': 30,
            'description': 'Spacious double room with garden view',
            'is_active': True
        },
        {
            'id': 'a3333333-3333-3333-3333-333333333333',
            'name': 'Superior Twin',
            'code': 'SUP-T',
            'base_price': 900000,
            'weekend_price': 1100000,
            'max_occupancy': 4,
            'min_occupancy': 2,
            'extra_person_charge': 250000,
            'amenities': ["wifi", "ac", "tv", "minibar", "bathtub", "balcony"],
            'size_sqm': 35,
            'description': 'Twin beds with pool view',
            'is_active': True
        },
        {
            'id': 'a4444444-4444-4444-4444-444444444444',
            'name': 'Family Suite',
            'code': 'FAM-S',
            'base_price': 1500000,
            'weekend_price': 1800000,
            'max_occupancy': 6,
            'min_occupancy': 2,
            'extra_person_charge': 300000,
            'amenities': ["wifi", "ac", "tv", "minibar", "bathtub", "kitchen", "livingroom"],
            'size_sqm': 55,
            'description': 'Large suite perfect for families',
            'is_active': True
        },
        {
            'id': 'a5555555-5555-5555-5555-555555555555',
            'name': 'Executive Suite',
            'code': 'EXE-S',
            'base_price': 2000000,
            'weekend_price': 2400000,
            'max_occupancy': 4,
            'min_occupancy': 1,
            'extra_person_charge': 400000,
            'amenities': ["wifi", "ac", "tv", "minibar", "bathtub", "kitchen", "workspace", "balcony"],
            'size_sqm': 65,
            'description': 'Luxury suite with panoramic view',
            'is_active': True
        }
    ]
    
    for room_type in room_types:
        try:
            result = supabase.table('room_types').upsert(room_type).execute()
            print(f"✓ Room type created: {room_type['name']}")
        except Exception as e:
            print(f"✗ Error creating room type {room_type['name']}: {e}")

def insert_rooms():
    """Insert sample rooms"""
    rooms = [
        # Floor 1
        {'id': 'r1111111-1111-1111-1111-111111111111', 'room_number': '101', 'room_type_id': 'a1111111-1111-1111-1111-111111111111', 'floor': 1, 'view_type': 'garden', 'status': 'available', 'is_active': True},
        {'id': 'r1111111-1111-1111-1111-111111111112', 'room_number': '102', 'room_type_id': 'a1111111-1111-1111-1111-111111111111', 'floor': 1, 'view_type': 'garden', 'status': 'available', 'is_active': True},
        {'id': 'r1111111-1111-1111-1111-111111111113', 'room_number': '103', 'room_type_id': 'a2222222-2222-2222-2222-222222222222', 'floor': 1, 'view_type': 'pool', 'status': 'available', 'is_active': True},
        {'id': 'r1111111-1111-1111-1111-111111111114', 'room_number': '104', 'room_type_id': 'a2222222-2222-2222-2222-222222222222', 'floor': 1, 'view_type': 'pool', 'status': 'available', 'is_active': True},
        {'id': 'r1111111-1111-1111-1111-111111111115', 'room_number': '105', 'room_type_id': 'a3333333-3333-3333-3333-333333333333', 'floor': 1, 'view_type': 'garden', 'status': 'available', 'is_active': True},
        
        # Floor 2
        {'id': 'r2222222-2222-2222-2222-222222222221', 'room_number': '201', 'room_type_id': 'a1111111-1111-1111-1111-111111111111', 'floor': 2, 'view_type': 'city', 'status': 'available', 'is_active': True},
        {'id': 'r2222222-2222-2222-2222-222222222222', 'room_number': '202', 'room_type_id': 'a2222222-2222-2222-2222-222222222222', 'floor': 2, 'view_type': 'city', 'status': 'available', 'is_active': True},
        {'id': 'r2222222-2222-2222-2222-222222222223', 'room_number': '203', 'room_type_id': 'a3333333-3333-3333-3333-333333333333', 'floor': 2, 'view_type': 'pool', 'status': 'available', 'is_active': True},
        {'id': 'r2222222-2222-2222-2222-222222222224', 'room_number': '204', 'room_type_id': 'a3333333-3333-3333-3333-333333333333', 'floor': 2, 'view_type': 'pool', 'status': 'available', 'is_active': True},
        {'id': 'r2222222-2222-2222-2222-222222222225', 'room_number': '205', 'room_type_id': 'a4444444-4444-4444-4444-444444444444', 'floor': 2, 'view_type': 'city', 'status': 'available', 'is_active': True},
        
        # Floor 3
        {'id': 'r3333333-3333-3333-3333-333333333331', 'room_number': '301', 'room_type_id': 'a2222222-2222-2222-2222-222222222222', 'floor': 3, 'view_type': 'city', 'status': 'available', 'is_active': True},
        {'id': 'r3333333-3333-3333-3333-333333333332', 'room_number': '302', 'room_type_id': 'a3333333-3333-3333-3333-333333333333', 'floor': 3, 'view_type': 'mountain', 'status': 'available', 'is_active': True},
        {'id': 'r3333333-3333-3333-3333-333333333333', 'room_number': '303', 'room_type_id': 'a4444444-4444-4444-4444-444444444444', 'floor': 3, 'view_type': 'mountain', 'status': 'available', 'is_active': True},
        {'id': 'r3333333-3333-3333-3333-333333333334', 'room_number': '304', 'room_type_id': 'a4444444-4444-4444-4444-444444444444', 'floor': 3, 'view_type': 'city', 'status': 'available', 'is_active': True},
        {'id': 'r3333333-3333-3333-3333-333333333335', 'room_number': '305', 'room_type_id': 'a5555555-5555-5555-5555-555555555555', 'floor': 3, 'view_type': 'mountain', 'status': 'available', 'is_active': True}
    ]
    
    for room in rooms:
        try:
            result = supabase.table('rooms').upsert(room).execute()
            print(f"✓ Room created: {room['room_number']}")
        except Exception as e:
            print(f"✗ Error creating room {room['room_number']}: {e}")

def insert_customers():
    """Insert sample customers"""
    customers = [
        # Vietnamese Customers
        {
            'id': 'c1111111-1111-1111-1111-111111111111',
            'full_name': 'Nguyen Van An',
            'email': 'nguyen.an@email.com',
            'phone': '0901234567',
            'nationality': 'Vietnamese',
            'id_type': 'cccd',
            'id_number': '001234567890',
            'address': '123 Le Loi',
            'city': 'Ho Chi Minh City',
            'country': 'Vietnam',
            'date_of_birth': '1985-05-15',
            'preferences': {"room_preference": "high_floor", "dietary": "none"},
            'status': 'active',
            'loyalty_points': 1500,
            'total_bookings': 5,
            'total_spent': 7500000
        },
        {
            'id': 'c2222222-2222-2222-2222-222222222222',
            'full_name': 'Tran Thi Bich',
            'email': 'tran.bich@email.com',
            'phone': '0912345678',
            'nationality': 'Vietnamese',
            'id_type': 'cccd',
            'id_number': '001234567891',
            'address': '456 Nguyen Hue',
            'city': 'Ho Chi Minh City',
            'country': 'Vietnam',
            'date_of_birth': '1990-08-20',
            'preferences': {"room_preference": "quiet", "dietary": "vegetarian"},
            'status': 'vip',
            'loyalty_points': 3000,
            'total_bookings': 12,
            'total_spent': 25000000
        },
        {
            'id': 'c3333333-3333-3333-3333-333333333333',
            'full_name': 'Le Hoang Duc',
            'email': 'le.duc@email.com',
            'phone': '0923456789',
            'nationality': 'Vietnamese',
            'id_type': 'passport',
            'id_number': 'B1234567',
            'address': '789 Tran Hung Dao',
            'city': 'Hanoi',
            'country': 'Vietnam',
            'date_of_birth': '1988-03-10',
            'preferences': {"room_preference": "pool_view", "dietary": "none"},
            'status': 'active',
            'loyalty_points': 800,
            'total_bookings': 3,
            'total_spent': 4500000
        },
        # International Customers
        {
            'id': 'c5555555-5555-5555-5555-555555555555',
            'full_name': 'John Smith',
            'email': 'john.smith@email.com',
            'phone': '+14155552671',
            'nationality': 'American',
            'id_type': 'passport',
            'id_number': 'US1234567',
            'address': '123 Main St',
            'city': 'San Francisco',
            'country': 'USA',
            'date_of_birth': '1980-07-04',
            'preferences': {"room_preference": "high_floor", "dietary": "none"},
            'status': 'active',
            'loyalty_points': 200,
            'total_bookings': 1,
            'total_spent': 2000000
        },
        {
            'id': 'c8888888-8888-8888-8888-888888888888',
            'full_name': 'Tanaka Yuki',
            'email': 'tanaka@email.jp',
            'phone': '+81312345678',
            'nationality': 'Japanese',
            'id_type': 'passport',
            'id_number': 'JP1122334',
            'address': '5-1 Shibuya',
            'city': 'Tokyo',
            'country': 'Japan',
            'date_of_birth': '1983-06-15',
            'preferences': {"room_preference": "quiet", "dietary": "seafood_allergy"},
            'status': 'vip',
            'loyalty_points': 2500,
            'total_bookings': 8,
            'total_spent': 18000000
        }
    ]
    
    # Add more customers...
    for customer in customers:
        try:
            result = supabase.table('customers').upsert(customer).execute()
            print(f"✓ Customer created: {customer['full_name']}")
        except Exception as e:
            print(f"✗ Error creating customer {customer['full_name']}: {e}")

def insert_bookings():
    """Insert sample bookings for Aug 23-30"""
    bookings = [
        # Currently Staying (Checked In)
        {
            'id': 'b0001111-1111-1111-1111-111111111111',
            'booking_code': 'BK202308001',
            'customer_id': 'c1111111-1111-1111-1111-111111111111',
            'room_id': 'r1111111-1111-1111-1111-111111111113',
            'check_in_date': '2025-08-21',
            'check_out_date': '2025-08-24',
            'adults': 2,
            'children': 0,
            'total_amount': 2400000,
            'paid_amount': 2400000,
            'status': 'checked_in',
            'booking_source': 'direct',
            'special_requests': 'Late check-out if possible',
            'notes': 'Regular customer, prefers room on lower floor'
        },
        {
            'id': 'b0002222-2222-2222-2222-222222222222',
            'booking_code': 'BK202308002',
            'customer_id': 'c2222222-2222-2222-2222-222222222222',
            'room_id': 'r3333333-3333-3333-3333-333333333335',
            'check_in_date': '2025-08-22',
            'check_out_date': '2025-08-26',
            'adults': 2,
            'children': 0,
            'total_amount': 8000000,
            'paid_amount': 8000000,
            'status': 'checked_in',
            'booking_source': 'website',
            'special_requests': 'Vegetarian meals, Extra pillows',
            'notes': 'VIP customer - provide complimentary fruit basket'
        },
        {
            'id': 'b0003333-3333-3333-3333-333333333333',
            'booking_code': 'BK202308003',
            'customer_id': 'c5555555-5555-5555-5555-555555555555',
            'room_id': 'r2222222-2222-2222-2222-222222222222',
            'check_in_date': '2025-08-20',
            'check_out_date': '2025-08-25',
            'adults': 1,
            'children': 0,
            'total_amount': 4000000,
            'paid_amount': 4000000,
            'status': 'checked_in',
            'booking_source': 'booking.com',
            'special_requests': 'High floor, away from elevator',
            'notes': 'Business traveler, requested invoice'
        },
        {
            'id': 'b0004444-4444-4444-4444-444444444444',
            'booking_code': 'BK202308004',
            'customer_id': 'c8888888-8888-8888-8888-888888888888',
            'room_id': 'r3333333-3333-3333-3333-333333333334',
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-28',
            'adults': 2,
            'children': 1,
            'total_amount': 7500000,
            'paid_amount': 7500000,
            'status': 'checked_in',
            'booking_source': 'agoda',
            'special_requests': 'No seafood, Japanese newspaper',
            'notes': 'VIP customer - allergic to seafood'
        },
        # Arriving Today (Aug 23) - Confirmed
        {
            'id': 'b0005555-5555-5555-5555-555555555555',
            'booking_code': 'BK202308005',
            'customer_id': 'c3333333-3333-3333-3333-333333333333',
            'room_id': 'r1111111-1111-1111-1111-111111111112',
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-27',
            'adults': 1,
            'children': 0,
            'total_amount': 2000000,
            'paid_amount': 1000000,
            'status': 'confirmed',
            'booking_source': 'direct',
            'special_requests': 'Gluten-free options for breakfast',
            'notes': 'First time guest, arriving on evening flight'
        },
        # Future Arrivals
        {
            'id': 'b0007777-7777-7777-7777-777777777777',
            'booking_code': 'BK202308007',
            'customer_id': 'c3333333-3333-3333-3333-333333333333',
            'room_id': 'r1111111-1111-1111-1111-111111111114',
            'check_in_date': '2025-08-24',
            'check_out_date': '2025-08-27',
            'adults': 2,
            'children': 0,
            'total_amount': 2400000,
            'paid_amount': 1200000,
            'status': 'confirmed',
            'booking_source': 'direct',
            'special_requests': 'Pool view room',
            'notes': 'Celebrating anniversary'
        }
    ]
    
    for booking in bookings:
        try:
            result = supabase.table('bookings').upsert(booking).execute()
            print(f"✓ Booking created: {booking['booking_code']} - {booking['status']}")
        except Exception as e:
            print(f"✗ Error creating booking {booking['booking_code']}: {e}")

def update_room_status():
    """Update room status based on current bookings"""
    try:
        # Get all checked-in bookings
        checked_in = supabase.table('bookings').select('room_id').eq('status', 'checked_in').execute()
        
        for booking in checked_in.data:
            if booking['room_id']:
                supabase.table('rooms').update({'status': 'occupied'}).eq('id', booking['room_id']).execute()
                print(f"✓ Room status updated to occupied: {booking['room_id']}")
                
    except Exception as e:
        print(f"✗ Error updating room status: {e}")

def show_summary():
    """Show summary of inserted data"""
    try:
        print("\n" + "="*50)
        print("BOOKING DATA SUMMARY (Aug 23-30, 2025)")
        print("="*50)
        
        # Get booking statistics
        bookings = supabase.table('bookings').select('status').execute()
        
        status_counts = {}
        for booking in bookings.data:
            status = booking['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print("\nBooking Status Summary:")
        print(f"  • Currently Staying (checked_in): {status_counts.get('checked_in', 0)}")
        print(f"  • Confirmed Arrivals: {status_counts.get('confirmed', 0)}")
        print(f"  • Pending Bookings: {status_counts.get('pending', 0)}")
        print(f"  • Checked Out: {status_counts.get('checked_out', 0)}")
        print(f"  • Cancelled: {status_counts.get('cancelled', 0)}")
        print(f"  • No Shows: {status_counts.get('no_show', 0)}")
        
        # Get room statistics
        rooms = supabase.table('rooms').select('status').execute()
        room_status = {}
        for room in rooms.data:
            status = room['status']
            room_status[status] = room_status.get(status, 0) + 1
        
        print("\nRoom Status Summary:")
        print(f"  • Available: {room_status.get('available', 0)}")
        print(f"  • Occupied: {room_status.get('occupied', 0)}")
        print(f"  • Total Rooms: {len(rooms.data)}")
        
        print("\n✅ Sample booking data successfully created!")
        print("="*50)
        
    except Exception as e:
        print(f"✗ Error showing summary: {e}")

def main():
    """Main function to insert all sample data"""
    print("="*50)
    print("INSERTING SAMPLE BOOKING DATA")
    print("Date Range: August 23-30, 2025")
    print("="*50)
    
    print("\n1. Creating Room Types...")
    insert_room_types()
    
    print("\n2. Creating Rooms...")
    insert_rooms()
    
    print("\n3. Creating Customers...")
    insert_customers()
    
    print("\n4. Creating Bookings...")
    insert_bookings()
    
    print("\n5. Updating Room Status...")
    update_room_status()
    
    print("\n6. Summary...")
    show_summary()

if __name__ == "__main__":
    main()