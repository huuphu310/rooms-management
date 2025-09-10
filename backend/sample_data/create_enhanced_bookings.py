#!/usr/bin/env python3
"""
Create Enhanced Sample Bookings for August 23-30, 2025
Complete booking data template with all required fields
"""

import os
import sys
from datetime import datetime, date, timedelta
import random
import uuid
from pathlib import Path
from decimal import Decimal

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

def clear_existing_bookings():
    """Clear existing bookings with codes starting with BK2025"""
    try:
        # Get existing bookings
        existing = supabase.table('bookings').select('id, booking_code').like('booking_code', 'BK2025%').execute()
        
        if existing.data:
            print(f"Found {len(existing.data)} existing test bookings to clear...")
            for booking in existing.data:
                supabase.table('bookings').delete().eq('id', booking['id']).execute()
                print(f"  • Deleted {booking['booking_code']}")
            print("✓ Cleared existing test bookings")
    except Exception as e:
        print(f"✗ Error clearing bookings: {e}")

def create_comprehensive_bookings():
    """Create comprehensive booking data for various scenarios"""
    
    # Get customers and rooms
    customers_response = supabase.table('customers').select('*').limit(10).execute()
    rooms_response = supabase.table('rooms').select('*').limit(15).execute()
    
    if not customers_response.data or not rooms_response.data:
        print("Error: No customers or rooms found")
        return []
    
    customers = customers_response.data
    rooms = rooms_response.data
    
    bookings = []
    booking_counter = 1
    
    def generate_booking_code():
        nonlocal booking_counter
        code = f"BK2025{booking_counter:05d}"
        booking_counter += 1
        return code
    
    # Define booking scenarios for Aug 23-30, 2025
    booking_scenarios = [
        # Currently Staying (checked_in) - 4 bookings
        {
            'description': 'Regular guest - checked in Aug 21',
            'customer_index': 0,
            'room_index': 2,
            'check_in_date': '2025-08-21',
            'check_out_date': '2025-08-24',
            'check_in_time': '15:30:00',
            'check_out_time': '11:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,
            'nights': 3,
            'paid_percentage': 1.0,
            'status': 'checked_in',
            'source': 'direct',
            'special_requests': 'Late check-out if possible. Regular customer.',
            'actual_check_in': '2025-08-21T15:30:00'
        },
        {
            'description': 'VIP guest - checked in Aug 22',
            'customer_index': 1,
            'room_index': 14,
            'check_in_date': '2025-08-22',
            'check_out_date': '2025-08-26',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 2000000,
            'nights': 4,
            'paid_percentage': 1.0,
            'status': 'checked_in',
            'source': 'website',
            'special_requests': 'Extra pillows. VIP customer. Champagne on arrival.',
            'actual_check_in': '2025-08-22T14:00:00'
        },
        {
            'description': 'International guest - checked in Aug 20',
            'customer_index': 2,
            'room_index': 6,
            'check_in_date': '2025-08-20',
            'check_out_date': '2025-08-25',
            'check_in_time': '13:00:00',
            'check_out_time': '12:00:00',
            'adults': 1,
            'children': 0,
            'room_rate': 800000,
            'nights': 5,
            'paid_percentage': 1.0,
            'status': 'checked_in',
            'source': 'ota',
            'special_requests': 'Quiet room. Business traveler.',
            'actual_check_in': '2025-08-20T13:00:00'
        },
        {
            'description': 'Japanese VIP - checked in Aug 23',
            'customer_index': 5,
            'room_index': 13,
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-28',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 1500000,
            'nights': 5,
            'paid_percentage': 1.0,
            'status': 'checked_in',
            'source': 'direct',
            'special_requests': 'Japanese newspaper. Green tea. High floor.',
            'actual_check_in': '2025-08-23T14:00:00'
        },
        
        # Arriving Today Aug 23 (confirmed) - 2 bookings
        {
            'description': 'British guest arriving today',
            'customer_index': 3,
            'room_index': 1,
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-27',
            'check_in_time': '18:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 500000,
            'nights': 4,
            'paid_percentage': 0.5,
            'status': 'confirmed',
            'source': 'phone',
            'special_requests': 'Arriving evening flight. Airport pickup requested.'
        },
        {
            'description': 'Chinese guest arriving today',
            'customer_index': 4,
            'room_index': 7,
            'check_in_date': '2025-08-23',
            'check_out_date': '2025-08-26',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 1,
            'room_rate': 900000,
            'nights': 3,
            'paid_percentage': 1.0,
            'status': 'confirmed',
            'source': 'ota',
            'special_requests': 'Extra bed for child. Chinese breakfast preference.'
        },
        
        # Future Arrivals (confirmed/pending) - 6 bookings
        {
            'description': 'Vietnamese couple - Aug 24',
            'customer_index': 0,
            'room_index': 3,
            'check_in_date': '2025-08-24',
            'check_out_date': '2025-08-27',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,
            'nights': 3,
            'paid_percentage': 0.5,
            'status': 'confirmed',
            'source': 'email',
            'special_requests': 'Anniversary celebration. Room decoration requested.'
        },
        {
            'description': 'Walk-in reservation - Aug 25',
            'customer_index': 1,
            'room_index': 4,
            'check_in_date': '2025-08-25',
            'check_out_date': '2025-08-29',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 1,
            'room_rate': 900000,
            'nights': 4,
            'paid_percentage': 0,
            'status': 'pending',
            'source': 'walk_in',
            'special_requests': 'City view preferred. Awaiting payment confirmation.'
        },
        {
            'description': 'Business traveler - Aug 26',
            'customer_index': 3,
            'room_index': 9,
            'check_in_date': '2025-08-26',
            'check_out_date': '2025-08-30',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 1,
            'children': 0,
            'room_rate': 900000,
            'nights': 4,
            'paid_percentage': 1.0,
            'status': 'confirmed',
            'source': 'website',
            'special_requests': 'Business center access. Early breakfast.'
        },
        {
            'description': 'Korean guest - Aug 27',
            'customer_index': 2,
            'room_index': 10,
            'check_in_date': '2025-08-27',
            'check_out_date': '2025-08-30',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,
            'nights': 3,
            'paid_percentage': 0.5,
            'status': 'confirmed',
            'source': 'ota',
            'special_requests': 'Korean TV channels. Late check-out.'
        },
        {
            'description': 'Family group - Aug 28',
            'customer_index': 0,
            'room_index': 12,
            'check_in_date': '2025-08-28',
            'check_out_date': '2025-08-31',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 2,
            'room_rate': 1500000,
            'nights': 3,
            'paid_percentage': 0.5,
            'status': 'confirmed',
            'source': 'direct',
            'special_requests': 'Family suite. Extra beds for children.'
        },
        {
            'description': 'Last minute booking - Aug 29',
            'customer_index': 1,
            'room_index': 0,
            'check_in_date': '2025-08-29',
            'check_out_date': '2025-08-31',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 600000,
            'nights': 2,
            'paid_percentage': 1.0,
            'status': 'confirmed',
            'source': 'phone',
            'special_requests': 'Ground floor preferred.'
        },
        
        # Past Bookings (checked_out) - 2 bookings
        {
            'description': 'Completed stay - Aug 19-22',
            'customer_index': 4,
            'room_index': 5,
            'check_in_date': '2025-08-19',
            'check_out_date': '2025-08-22',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 800000,
            'nights': 3,
            'paid_percentage': 1.0,
            'status': 'checked_out',
            'source': 'website',
            'special_requests': 'Honeymoon couple.',
            'actual_check_in': '2025-08-19T14:30:00',
            'actual_check_out': '2025-08-22T11:30:00'
        },
        {
            'description': 'Early checkout - Aug 18-21',
            'customer_index': 5,
            'room_index': 8,
            'check_in_date': '2025-08-18',
            'check_out_date': '2025-08-21',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 1,
            'children': 0,
            'room_rate': 900000,
            'nights': 3,
            'paid_percentage': 1.0,
            'status': 'checked_out',
            'source': 'direct',
            'special_requests': 'Business trip.',
            'actual_check_in': '2025-08-18T15:00:00',
            'actual_check_out': '2025-08-21T10:00:00'
        },
        
        # Cancelled booking - 1
        {
            'description': 'Cancelled due to flight issue',
            'customer_index': 3,
            'room_index': 11,
            'check_in_date': '2025-08-25',
            'check_out_date': '2025-08-28',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 2,
            'children': 0,
            'room_rate': 1500000,
            'nights': 3,
            'paid_percentage': 0,
            'status': 'cancelled',
            'source': 'ota',
            'special_requests': 'Flight cancelled.',
            'cancellation_date': '2025-08-23T10:00:00'
        },
        
        # No show - 1
        {
            'description': 'No show guest',
            'customer_index': 2,
            'room_index': 5,
            'check_in_date': '2025-08-22',
            'check_out_date': '2025-08-24',
            'check_in_time': '14:00:00',
            'check_out_time': '12:00:00',
            'adults': 1,
            'children': 0,
            'room_rate': 800000,
            'nights': 2,
            'paid_percentage': 0.5,
            'status': 'no_show',
            'source': 'phone',
            'special_requests': 'Guest did not arrive.'
        }
    ]
    
    # Create bookings
    created_count = 0
    for scenario in booking_scenarios:
        try:
            customer = customers[scenario['customer_index'] % len(customers)]
            room = rooms[scenario['room_index'] % len(rooms)]
            
            total_room_charge = scenario['room_rate'] * scenario['nights']
            paid_amount = int(total_room_charge * scenario['paid_percentage'])
            
            booking_data = {
                'booking_code': generate_booking_code(),
                'customer_id': customer['id'],
                'room_id': room['id'],
                'check_in_date': scenario['check_in_date'],
                'check_out_date': scenario['check_out_date'],
                'check_in_time': scenario['check_in_time'],
                'check_out_time': scenario['check_out_time'],
                'adults': scenario['adults'],
                'children': scenario['children'],
                'nights': scenario['nights'],
                'room_rate': scenario['room_rate'],
                'total_room_charge': total_room_charge,
                'total_amount': total_room_charge,
                'paid_amount': paid_amount,
                'status': scenario['status'],
                'source': scenario['source'],
                'special_requests': scenario['special_requests']
            }
            
            # Add optional fields if present
            if 'actual_check_in' in scenario:
                booking_data['actual_check_in'] = scenario['actual_check_in']
            if 'actual_check_out' in scenario:
                booking_data['actual_check_out'] = scenario['actual_check_out']
            if 'cancellation_date' in scenario:
                booking_data['cancellation_date'] = scenario['cancellation_date']
            
            result = supabase.table('bookings').insert(booking_data).execute()
            created_count += 1
            print(f"✓ Created: {booking_data['booking_code']} - {scenario['description']}")
            bookings.append(result.data[0])
            
        except Exception as e:
            print(f"✗ Error creating booking: {scenario['description']}")
            print(f"  Error: {e}")
    
    print(f"\n✓ Successfully created {created_count}/{len(booking_scenarios)} bookings")
    return bookings

def update_room_occupancy(bookings):
    """Update room status based on checked-in bookings"""
    checked_in_count = 0
    for booking in bookings:
        if booking['status'] == 'checked_in':
            try:
                supabase.table('rooms').update({'status': 'occupied'}).eq('id', booking['room_id']).execute()
                checked_in_count += 1
            except Exception as e:
                print(f"✗ Error updating room status: {e}")
    
    print(f"✓ Updated {checked_in_count} rooms to occupied status")

def print_summary(bookings):
    """Print comprehensive summary of created bookings"""
    
    if not bookings:
        print("\nNo bookings to summarize")
        return
    
    print("\n" + "="*60)
    print("BOOKING SUMMARY FOR AUGUST 23-30, 2025")
    print("="*60)
    
    # Status breakdown
    status_count = {}
    for booking in bookings:
        status = booking['status']
        status_count[status] = status_count.get(status, 0) + 1
    
    print("\n📊 Booking Status:")
    for status, count in sorted(status_count.items()):
        percentage = (count / len(bookings)) * 100
        print(f"  • {status:12s}: {count:2d} ({percentage:.1f}%)")
    
    # Source breakdown
    source_count = {}
    for booking in bookings:
        source = booking.get('source', 'unknown')
        source_count[source] = source_count.get(source, 0) + 1
    
    print("\n📍 Booking Sources:")
    for source, count in sorted(source_count.items()):
        percentage = (count / len(bookings)) * 100
        print(f"  • {source:8s}: {count:2d} ({percentage:.1f}%)")
    
    # Financial summary
    total_revenue = sum(float(b.get('total_amount', 0)) for b in bookings)
    total_paid = sum(float(b.get('paid_amount', 0)) for b in bookings)
    total_pending = total_revenue - total_paid
    
    print("\n💰 Financial Summary:")
    print(f"  • Total Revenue:  ₫{total_revenue:,.0f}")
    print(f"  • Amount Paid:    ₫{total_paid:,.0f}")
    print(f"  • Pending Amount: ₫{total_pending:,.0f}")
    print(f"  • Payment Rate:   {(total_paid/total_revenue*100):.1f}%")
    
    # Guest statistics
    total_adults = sum(b.get('adults', 0) for b in bookings)
    total_children = sum(b.get('children', 0) for b in bookings)
    
    print("\n👥 Guest Statistics:")
    print(f"  • Total Adults:   {total_adults}")
    print(f"  • Total Children: {total_children}")
    print(f"  • Total Guests:   {total_adults + total_children}")
    
    # Date analysis for current period
    today = date(2025, 8, 23)  # Simulated current date
    arriving_today = [b for b in bookings if b['check_in_date'] == '2025-08-23' and b['status'] == 'confirmed']
    departing_today = [b for b in bookings if b['check_out_date'] == '2025-08-23' and b['status'] == 'checked_in']
    currently_staying = [b for b in bookings if b['status'] == 'checked_in']
    
    print("\n📅 Today's Activity (Aug 23):")
    print(f"  • Arrivals:        {len(arriving_today)}")
    print(f"  • Departures:      {len(departing_today)}")
    print(f"  • Currently In:    {len(currently_staying)}")
    
    print("\n✅ Booking data template successfully created!")
    print("="*60)

def main():
    print("="*60)
    print("CREATING ENHANCED BOOKING TEMPLATE")
    print("Date Range: August 23-30, 2025")
    print("="*60)
    
    # Clear existing test bookings
    print("\n1. Clearing existing test bookings...")
    clear_existing_bookings()
    
    # Create comprehensive bookings
    print("\n2. Creating comprehensive booking scenarios...")
    bookings = create_comprehensive_bookings()
    
    # Update room occupancy
    if bookings:
        print("\n3. Updating room occupancy...")
        update_room_occupancy(bookings)
        
        # Print summary
        print_summary(bookings)
    else:
        print("\n⚠️ No bookings were created")
    
    print("\n" + "="*60)
    print("Process completed!")
    print("="*60)

if __name__ == "__main__":
    main()