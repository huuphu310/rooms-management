#!/usr/bin/env python3
"""
Create Sample Bookings for August 23-30, 2025
Simplified version that works with actual database schema
"""

import os
import sys
from datetime import datetime, date, timedelta
import random
import uuid
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

def create_sample_customers():
    """Create sample customers for bookings"""
    customers = [
        {
            'full_name': 'Nguyen Van An',
            'email': 'nguyen.an@example.com',
            'phone': '0901234567',
            'nationality': 'Vietnamese',
            'id_type': 'cccd',
            'id_number': '001234567890',
            'address': '123 Le Loi, District 1',
            'city': 'Ho Chi Minh City',
            'country': 'Vietnam',
            'date_of_birth': '1985-05-15'
        },
        {
            'full_name': 'Tran Thi Mai',
            'email': 'tran.mai@example.com',
            'phone': '0912345678',
            'nationality': 'Vietnamese',
            'id_type': 'cccd',
            'id_number': '001234567891',
            'address': '456 Nguyen Hue, District 1',
            'city': 'Ho Chi Minh City',
            'country': 'Vietnam',
            'date_of_birth': '1990-08-20'
        },
        {
            'full_name': 'John Smith',
            'email': 'john.smith@example.com',
            'phone': '+14155552671',
            'nationality': 'American',
            'id_type': 'passport',
            'id_number': 'US1234567',
            'address': '123 Main St',
            'city': 'San Francisco',
            'country': 'USA',
            'date_of_birth': '1980-07-04'
        },
        {
            'full_name': 'Emma Johnson',
            'email': 'emma.j@example.com',
            'phone': '+442071234567',
            'nationality': 'British',
            'id_type': 'passport',
            'id_number': 'UK7654321',
            'address': '10 Oxford Street',
            'city': 'London',
            'country': 'UK',
            'date_of_birth': '1995-02-14'
        },
        {
            'full_name': 'Liu Wei',
            'email': 'liu.wei@example.cn',
            'phone': '+8613812345678',
            'nationality': 'Chinese',
            'id_type': 'passport',
            'id_number': 'CN9876543',
            'address': '88 Beijing Road',
            'city': 'Shanghai',
            'country': 'China',
            'date_of_birth': '1987-09-30'
        },
        {
            'full_name': 'Tanaka Yuki',
            'email': 'tanaka@example.jp',
            'phone': '+81312345678',
            'nationality': 'Japanese',
            'id_type': 'passport',
            'id_number': 'JP1122334',
            'address': '5-1 Shibuya',
            'city': 'Tokyo',
            'country': 'Japan',
            'date_of_birth': '1983-06-15'
        }
    ]
    
    created_customers = []
    for customer in customers:
        try:
            # Check if customer already exists
            existing = supabase.table('customers').select('*').eq('email', customer['email']).execute()
            if existing.data:
                created_customers.append(existing.data[0])
                print(f"✓ Customer already exists: {customer['full_name']}")
            else:
                result = supabase.table('customers').insert(customer).execute()
                created_customers.append(result.data[0])
                print(f"✓ Customer created: {customer['full_name']}")
        except Exception as e:
            print(f"✗ Error with customer {customer['full_name']}: {e}")
    
    return created_customers

def create_sample_bookings(customers, rooms):
    """Create sample bookings for Aug 23-30"""
    
    if not customers or not rooms:
        print("No customers or rooms available")
        return
    
    bookings = []
    booking_counter = 1
    
    # Helper to generate booking code
    def generate_booking_code():
        nonlocal booking_counter
        code = f"BK2025{booking_counter:05d}"
        booking_counter += 1
        return code
    
    # Currently staying (checked in) - Aug 21-24
    if len(customers) > 0 and len(rooms) > 0:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[0]['id'],
            'room_id': rooms[0]['id'],
            'check_in_date': '2025-08-21',
            'check_out_date': '2025-08-24',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,  # Daily rate
            'total_room_charge': 2400000,  # Total room charges
            'total_amount': 2400000,
            'paid_amount': 2400000,
            'status': 'checked_in',
            'source': 'direct',
            'special_requests': 'Late check-out if possible. Regular customer'
        })
    
    # Currently staying - Aug 22-26
    if len(customers) > 1 and len(rooms) > 1:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[1]['id'],
            'room_id': rooms[1]['id'],
            'check_in_date': '2025-08-22',
            'check_out_date': '2025-08-26',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,  # Daily rate
            'total_room_charge': 3200000,  # Total room charges
            'total_amount': 3200000,
            'paid_amount': 3200000,
            'status': 'checked_in',
            'source': 'website',
            'special_requests': 'Extra pillows. VIP customer'
        })
    
    # Arriving today (Aug 23)
    if len(customers) > 2 and len(rooms) > 2:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[2]['id'],
            'room_id': rooms[2]['id'],
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-27',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 1,
            'children': 0,
            'room_rate': 800000,  # Daily rate
            'total_room_charge': 3200000,  # Total room charges
            'total_amount': 3200000,
            'paid_amount': 1600000,
            'status': 'confirmed',
            'source': 'ota',
            'special_requests': 'High floor room. Arriving evening flight'
        })
    
    # Future arrival - Aug 24-27
    if len(customers) > 3 and len(rooms) > 3:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[3]['id'],
            'room_id': rooms[3]['id'],
            'check_in_date': '2025-08-24',
            'check_out_date': '2025-08-27',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,  # Daily rate
            'total_room_charge': 2400000,  # Total room charges
            'total_amount': 2400000,
            'paid_amount': 1200000,
            'status': 'confirmed',
            'source': 'phone',
            'special_requests': 'Quiet room. Anniversary celebration'
        })
    
    # Future arrival - Aug 25-29
    if len(customers) > 4 and len(rooms) > 4:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[4]['id'],
            'room_id': rooms[4]['id'],
            'check_in_date': '2025-08-25',
            'check_out_date': '2025-08-29',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 1,
            'room_rate': 900000,  # Daily rate
            'total_room_charge': 3600000,  # Total room charges
            'total_amount': 3600000,
            'paid_amount': 0,
            'status': 'pending',
            'source': 'email',
            'special_requests': 'City view. Awaiting payment'
        })
    
    # Future arrival - Aug 26-30
    if len(customers) > 5 and len(rooms) > 5:
        bookings.append({
            'booking_code': generate_booking_code(),
            'customer_id': customers[5]['id'],
            'room_id': rooms[5]['id'],
            'check_in_date': '2025-08-26',
            'check_out_date': '2025-08-30',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,  # Daily rate
            'total_room_charge': 3200000,  # Total room charges
            'total_amount': 3200000,
            'paid_amount': 3200000,
            'status': 'confirmed',
            'source': 'direct',
            'special_requests': 'Japanese newspaper. Business trip'
        })
    
    # Create bookings
    created_bookings = []
    for booking in bookings:
        try:
            result = supabase.table('bookings').insert(booking).execute()
            created_bookings.append(result.data[0])
            print(f"✓ Booking created: {booking['booking_code']} ({booking['status']}) - {booking['check_in_date']} to {booking['check_out_date']}")
        except Exception as e:
            print(f"✗ Error creating booking {booking['booking_code']}: {e}")
    
    return created_bookings

def update_room_status(bookings):
    """Update room status based on checked-in bookings"""
    for booking in bookings:
        if booking['status'] == 'checked_in' and booking.get('room_id'):
            try:
                supabase.table('rooms').update({'status': 'occupied'}).eq('id', booking['room_id']).execute()
                print(f"✓ Room status updated to occupied for booking {booking['booking_code']}")
            except Exception as e:
                print(f"✗ Error updating room status: {e}")

def main():
    print("="*60)
    print("CREATING SAMPLE BOOKINGS FOR AUGUST 23-30, 2025")
    print("="*60)
    
    # Get existing rooms
    print("\n1. Fetching existing rooms...")
    try:
        rooms_response = supabase.table('rooms').select('*').limit(10).execute()
        rooms = rooms_response.data
        print(f"✓ Found {len(rooms)} rooms")
    except Exception as e:
        print(f"✗ Error fetching rooms: {e}")
        rooms = []
    
    # Create customers
    print("\n2. Creating sample customers...")
    customers = create_sample_customers()
    
    # Create bookings
    if customers and rooms:
        print("\n3. Creating sample bookings...")
        bookings = create_sample_bookings(customers, rooms)
        
        # Update room status
        print("\n4. Updating room status...")
        update_room_status(bookings)
        
        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        
        # Count by status
        status_count = {}
        for booking in bookings:
            status = booking['status']
            status_count[status] = status_count.get(status, 0) + 1
        
        print("\nBookings Created:")
        for status, count in status_count.items():
            print(f"  • {status}: {count}")
        print(f"  • Total: {len(bookings)}")
        
        print("\n✅ Sample booking data successfully created!")
    else:
        print("\n⚠️  Could not create bookings - missing customers or rooms")
    
    print("="*60)

if __name__ == "__main__":
    main()