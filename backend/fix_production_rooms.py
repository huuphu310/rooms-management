#!/usr/bin/env python3
"""
Fix production rooms to be active so they appear in Room Allocation Grid
"""
from supabase import create_client
from app.core.config import settings
import os

# Use production environment variables if available
SUPABASE_URL = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", settings.SUPABASE_SERVICE_KEY)

print("Room Activation Fix for Production")
print("=" * 60)
print(f"Database URL: {SUPABASE_URL}")
print("=" * 60)

# Create service client (bypasses RLS)
db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 1. Check current room status
print("\n1. Checking current room status...")
rooms_result = db.table("rooms").select("id, room_number, is_active").execute()
rooms = rooms_result.data

total_rooms = len(rooms)
active_rooms = [r for r in rooms if r.get('is_active') == True]
inactive_rooms = [r for r in rooms if r.get('is_active') != True]

print(f"   Total rooms: {total_rooms}")
print(f"   Active rooms: {len(active_rooms)}")
print(f"   Inactive/NULL rooms: {len(inactive_rooms)}")

if inactive_rooms:
    print(f"\n   Inactive rooms found:")
    for room in inactive_rooms[:10]:  # Show first 10
        print(f"      - Room {room['room_number']}: is_active = {room.get('is_active')}")
    if len(inactive_rooms) > 10:
        print(f"      ... and {len(inactive_rooms) - 10} more")

# 2. Fix inactive rooms
if inactive_rooms:
    print("\n2. Fixing inactive rooms...")
    
    # Update all rooms to be active
    update_result = db.table("rooms").update({
        "is_active": True
    }).is_("is_active", "null").execute()
    
    # Also update any that are explicitly false
    update_result2 = db.table("rooms").update({
        "is_active": True
    }).eq("is_active", False).execute()
    
    print(f"   ✅ Updated rooms with NULL is_active")
    print(f"   ✅ Updated rooms with is_active = false")
    
    # Verify the fix
    print("\n3. Verifying the fix...")
    rooms_after = db.table("rooms").select("id, room_number, is_active").execute()
    active_after = [r for r in rooms_after.data if r.get('is_active') == True]
    
    print(f"   Active rooms after fix: {len(active_after)}")
    
    if len(active_after) == total_rooms:
        print("\n✅ SUCCESS: All rooms are now active!")
        print("   The Room Allocation Grid should now display all rooms.")
    else:
        still_inactive = total_rooms - len(active_after)
        print(f"\n⚠️  WARNING: {still_inactive} rooms are still inactive")
        print("   Please check the database directly.")
else:
    print("\n✅ All rooms are already active. No fix needed.")
    print("   If the grid is still empty, check:")
    print("   1. Room types are properly linked")
    print("   2. The month parameter matches existing data")
    print("   3. API authentication is working correctly")

# 4. Test the monthly grid API to verify it returns rooms
print("\n4. Testing monthly grid API...")
try:
    # Get rooms with room types for grid
    test_rooms = db.table("rooms").select("""
        id, room_number, room_type_id, floor, status, is_active,
        room_types(name)
    """).eq("is_active", True).limit(5).execute()
    
    if test_rooms.data:
        print(f"   ✅ API query returns {len(test_rooms.data)} active rooms")
        for room in test_rooms.data[:3]:
            room_type_name = "Unknown"
            if room.get('room_types'):
                room_type_name = room['room_types'].get('name', 'Unknown')
            print(f"      - Room {room['room_number']} ({room_type_name})")
    else:
        print("   ❌ API query returns no rooms - check the query")
except Exception as e:
    print(f"   ❌ Error testing API: {str(e)}")

print("\n" + "=" * 60)
print("Fix complete! Please refresh the Room Allocation page.")
print("URL: /room-allocation (not /rooms)")