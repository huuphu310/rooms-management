#!/usr/bin/env python3
"""
Create the bank_accounts table using Supabase service client
"""

import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SupabaseDB
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_bank_accounts_table():
    """Create the bank_accounts table using Supabase service client"""
    print("🚀 Creating bank_accounts table...")
    
    # Get the service client for admin operations
    db = SupabaseDB.get_service_client()
    
    # Create the basic bank_accounts table first
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id VARCHAR(50) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        bank_code VARCHAR(10) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_name VARCHAR(200) NOT NULL,
        is_seapay_integrated BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        api_key TEXT,
        webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        updated_by UUID
    );
    """
    
    try:
        # Create table directly using the table method
        result = db.table('bank_accounts').select('id').limit(1).execute()
        print("✅ Bank accounts table already exists!")
        return True
    except Exception as e:
        if "does not exist" in str(e) or "not found" in str(e):
            print("📝 Table doesn't exist, need to create it manually in Supabase dashboard")
            print("Please run this SQL in your Supabase SQL Editor:")
            print("=" * 60)
            print(create_table_sql)
            print("=" * 60)
            return False
        else:
            print(f"❌ Error checking table: {e}")
            return False

if __name__ == "__main__":
    success = create_bank_accounts_table()
    if not success:
        sys.exit(1)