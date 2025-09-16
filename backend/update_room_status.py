#!/usr/bin/env python3

from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Create Supabase client
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

# Update room 111 to cleaning status
room_id = '48053896-e20a-4de0-b76f-e740964272b1'

try:
    result = supabase.table('rooms').update({
        'status': 'cleaning',
        'status_reason': 'Guest checked out - cleaning in progress',
        'cleaning_started_at': datetime.now().isoformat(),
        'current_booking_id': None,
        'updated_at': datetime.now().isoformat()
    }).eq('id', room_id).execute()
    
    if result.data:
        print(f"Successfully updated room {result.data[0].get('room_number')} to cleaning status")
        print(f"Status: {result.data[0].get('status')}")
        print(f"Reason: {result.data[0].get('status_reason')}")
    else:
        print("No data returned from update")
        
except Exception as e:
    print(f"Error updating room: {e}")