#!/usr/bin/env python3
"""
Apply POS System Migration to Supabase
This script creates the missing POS tables in your Supabase database.
"""

import sys
import os
sys.path.append('.')

from app.core.database import get_supabase_service
from datetime import datetime

def apply_migration():
    """Apply POS migration by creating tables via Supabase API"""
    
    print("=" * 60)
    print("POS SYSTEM MIGRATION")
    print("=" * 60)
    
    # Get Supabase client
    db = get_supabase_service()
    print("✅ Connected to Supabase")
    
    # Since we can't execute raw SQL, we'll create the tables by inserting dummy data
    # and then deleting it. This will force Supabase to create the tables.
    
    tables_to_create = []
    
    # 1. Check and create pos_categories
    print("\n📋 Checking pos_categories table...")
    try:
        result = db.table('pos_categories').select('*').limit(1).execute()
        print("✅ pos_categories table already exists")
    except:
        print("❌ pos_categories table missing - Manual creation required")
        tables_to_create.append('pos_categories')
    
    # 2. Check and create pos_product_modifiers
    print("\n📋 Checking pos_product_modifiers table...")
    try:
        result = db.table('pos_product_modifiers').select('*').limit(1).execute()
        print("✅ pos_product_modifiers table already exists")
    except:
        print("❌ pos_product_modifiers table missing - Manual creation required")
        tables_to_create.append('pos_product_modifiers')
    
    # 3. Check and create pos_shifts
    print("\n📋 Checking pos_shifts table...")
    try:
        result = db.table('pos_shifts').select('*').limit(1).execute()
        print("✅ pos_shifts table already exists")
    except:
        print("❌ pos_shifts table missing - Manual creation required")
        tables_to_create.append('pos_shifts')
    
    # 4. Check and create pos_payments
    print("\n📋 Checking pos_payments table...")
    try:
        result = db.table('pos_payments').select('*').limit(1).execute()
        print("✅ pos_payments table already exists")
    except:
        print("❌ pos_payments table missing - Manual creation required")
        tables_to_create.append('pos_payments')
    
    # 5. Check and create pos_receipt_templates
    print("\n📋 Checking pos_receipt_templates table...")
    try:
        result = db.table('pos_receipt_templates').select('*').limit(1).execute()
        print("✅ pos_receipt_templates table already exists")
    except:
        print("❌ pos_receipt_templates table missing - Manual creation required")
        tables_to_create.append('pos_receipt_templates')
    
    # Summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    
    if tables_to_create:
        print(f"\n⚠️  {len(tables_to_create)} tables need to be created manually:")
        for table in tables_to_create:
            print(f"   - {table}")
        
        print("\n📝 INSTRUCTIONS TO COMPLETE MIGRATION:")
        print("1. Go to your Supabase Dashboard:")
        print("   https://app.supabase.com/project/dbifsitavfvrzmmayxlz")
        print("\n2. Navigate to 'SQL Editor' in the left sidebar")
        print("\n3. Copy the SQL from this file:")
        print(f"   {os.path.abspath('migration_chunks.sql')}")
        print("\n4. Paste and run the SQL in the SQL Editor")
        print("\n5. Run this script again to verify: python3 apply_pos_migration.py")
        
        # Create a simplified SQL file with just the missing tables
        create_missing_tables_sql(tables_to_create)
        
    else:
        print("\n✅ All POS tables are present in the database!")
        print("The POS system is ready to use.")

def create_missing_tables_sql(missing_tables):
    """Create SQL file with only the missing tables"""
    
    sql_statements = {
        'pos_categories': """
CREATE TABLE IF NOT EXISTS pos_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES pos_categories(id),
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);""",
        'pos_product_modifiers': """
CREATE TABLE IF NOT EXISTS pos_product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    modifier_group VARCHAR(100),
    modifier_name VARCHAR(100),
    price_adjustment DECIMAL(12,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);""",
        'pos_shifts': """
CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    terminal_id VARCHAR(50),
    shift_date DATE NOT NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,
    opened_by UUID REFERENCES user_profiles(id) NOT NULL,
    closed_by UUID REFERENCES user_profiles(id),
    opening_cash DECIMAL(12,2) DEFAULT 0,
    opening_notes TEXT,
    expected_cash DECIMAL(12,2),
    actual_cash DECIMAL(12,2),
    cash_difference DECIMAL(12,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_refunds DECIMAL(12,2) DEFAULT 0,
    total_discounts DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    net_sales DECIMAL(12,2) DEFAULT 0,
    cash_sales DECIMAL(12,2) DEFAULT 0,
    card_sales DECIMAL(12,2) DEFAULT 0,
    transfer_sales DECIMAL(12,2) DEFAULT 0,
    room_charge_sales DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    closing_notes TEXT,
    discrepancy_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);""",
        'pos_payments': """
CREATE TABLE IF NOT EXISTS pos_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_id UUID REFERENCES pos_transactions(id) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(20) DEFAULT 'pending',
    reference_number VARCHAR(100),
    card_last_four VARCHAR(4),
    card_type VARCHAR(50),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    qr_code TEXT,
    qr_provider VARCHAR(50),
    room_id UUID REFERENCES rooms(id),
    booking_id UUID REFERENCES bookings(id),
    notes TEXT,
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);""",
        'pos_receipt_templates': """
CREATE TABLE IF NOT EXISTS pos_receipt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    show_qr BOOLEAN DEFAULT false,
    paper_width INTEGER DEFAULT 80,
    font_size INTEGER DEFAULT 12,
    template_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);"""
    }
    
    # Create SQL file with only missing tables
    with open('missing_pos_tables.sql', 'w') as f:
        f.write("-- ===================================================================\n")
        f.write("-- MISSING POS TABLES - EXECUTE IN SUPABASE SQL EDITOR\n")
        f.write("-- ===================================================================\n")
        f.write(f"-- Generated at: {datetime.now().isoformat()}\n")
        f.write("-- Copy and paste this SQL into your Supabase SQL Editor\n\n")
        
        for table in missing_tables:
            if table in sql_statements:
                f.write(f"-- {table.upper()}\n")
                f.write("-" * 70 + "\n")
                f.write(sql_statements[table])
                f.write("\n\n")
        
        # Add indexes
        if 'pos_categories' in missing_tables:
            f.write("-- INDEXES FOR pos_categories\n")
            f.write("-" * 70 + "\n")
            f.write("CREATE INDEX idx_pos_categories_active ON pos_categories(is_active);\n")
            f.write("CREATE INDEX idx_pos_categories_featured ON pos_categories(is_featured);\n\n")
        
        if 'pos_shifts' in missing_tables:
            f.write("-- INDEXES FOR pos_shifts\n")
            f.write("-" * 70 + "\n")
            f.write("CREATE INDEX idx_pos_shifts_date ON pos_shifts(shift_date);\n")
            f.write("CREATE INDEX idx_pos_shifts_status ON pos_shifts(status);\n")
            f.write("CREATE INDEX idx_pos_shifts_opened_by ON pos_shifts(opened_by);\n\n")
        
        if 'pos_payments' in missing_tables:
            f.write("-- INDEXES FOR pos_payments\n")
            f.write("-" * 70 + "\n")
            f.write("CREATE INDEX idx_pos_payments_transaction ON pos_payments(transaction_id);\n")
            f.write("CREATE INDEX idx_pos_payments_method ON pos_payments(payment_method);\n")
            f.write("CREATE INDEX idx_pos_payments_status ON pos_payments(status);\n\n")
    
    print(f"\n📄 Created simplified migration file: missing_pos_tables.sql")
    print(f"   This file contains ONLY the {len(missing_tables)} missing tables")

if __name__ == "__main__":
    apply_migration()