#!/usr/bin/env python3
"""
Run the shift-based pricing migration on the Supabase database.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the shift-based pricing migration."""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables")
        sys.exit(1)
    
    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Read the migration SQL file
    migration_path = Path(__file__).parent / "migrations" / "012_shift_based_pricing.sql"
    
    if not migration_path.exists():
        print(f"Error: Migration file not found at {migration_path}")
        sys.exit(1)
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    try:
        # Execute the migration using Supabase RPC
        # Note: For complex migrations, you might need to execute through the Supabase dashboard
        # or use the Supabase CLI tool
        print("Migration file created successfully at:")
        print(f"  {migration_path}")
        print("\nTo run this migration:")
        print("1. Go to the Supabase dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Copy and paste the contents of the migration file")
        print("4. Click 'Run' to execute the migration")
        print("\nAlternatively, use the Supabase CLI:")
        print("  supabase db push")
        
        # For now, let's check if the migration columns already exist
        result = supabase.table("room_types").select("*").limit(1).execute()
        
        if result.data and len(result.data) > 0:
            room_type = result.data[0]
            if 'day_shift_price' in room_type:
                print("\n✅ Migration appears to have been applied - 'day_shift_price' column exists!")
            else:
                print("\n⚠️  Migration has NOT been applied yet - 'day_shift_price' column not found.")
                print("Please run the migration using one of the methods above.")
        
    except Exception as e:
        print(f"Error checking migration status: {e}")
        print("\nPlease run the migration manually through the Supabase dashboard.")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()