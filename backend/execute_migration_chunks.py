#!/usr/bin/env python3
"""
Execute POS migration chunks through Supabase
"""
import sys
import time
from supabase import create_client
from app.core.config import settings

def get_supabase_client():
    """Get Supabase client with service key"""
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY
    )

def execute_migration_chunks():
    """Execute migration in logical chunks"""
    
    supabase = get_supabase_client()
    
    print("Executing POS Migration Chunks")
    print("="*50)
    
    # Define chunks to execute
    chunks = [
        {
            "name": "pos_categories table",
            "sql": """
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
);
            """
        },
        {
            "name": "pos_product_modifiers table", 
            "sql": """
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
);
            """
        },
        {
            "name": "pos_shifts table",
            "sql": """
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
);
            """
        },
        {
            "name": "pos_payments table",
            "sql": """
CREATE TABLE IF NOT EXISTS pos_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_details JSONB,
    qr_payment_id UUID,
    bank_transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    processed_by UUID REFERENCES user_profiles(id),
    processed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
            """
        },
        {
            "name": "pos_receipt_templates table",
            "sql": """
CREATE TABLE IF NOT EXISTS pos_receipt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) NOT NULL,
    header_template TEXT NOT NULL,
    body_template TEXT,
    footer_template TEXT NOT NULL,
    formatting JSONB,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
            """
        }
    ]
    
    success_count = 0
    failed_chunks = []
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n[{i}/{len(chunks)}] Creating {chunk['name']}...")
        
        try:
            # For table creation, we can't use the standard table() methods
            # So we'll try using a custom function approach
            # This is a limitation of Supabase PostgREST - it doesn't support DDL directly
            
            print(f"✗ Cannot execute DDL through Supabase client API")
            print(f"   SQL needs to be executed manually in Supabase dashboard")
            failed_chunks.append(chunk['name'])
            
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
            failed_chunks.append(chunk['name'])
    
    print(f"\n{'='*50}")
    print("MIGRATION SUMMARY")
    print(f"{'='*50}")
    print(f"Tables that need manual creation: {len(failed_chunks)}")
    
    if failed_chunks:
        print("\nManual steps required:")
        print("1. Open Supabase Dashboard SQL Editor")
        print("2. Execute the migration_chunks.sql file")
        print("3. Run verification with: python3 migrate_pos_rest.py --verify")
    
    return len(failed_chunks) == 0

def show_dashboard_instructions():
    """Show step-by-step instructions for manual migration"""
    
    print("\n" + "="*60)
    print("MANUAL MIGRATION INSTRUCTIONS")
    print("="*60)
    
    project_ref = settings.SUPABASE_URL.split('//')[1].split('.')[0]
    dashboard_url = f"https://app.supabase.com/project/{project_ref}"
    
    print(f"\n1. Open your Supabase Dashboard:")
    print(f"   {dashboard_url}")
    
    print(f"\n2. Navigate to 'SQL Editor' in the left sidebar")
    
    print(f"\n3. Create a new query and execute the migration file:")
    print(f"   File: /Users/huuphu/Development/room_booking/backend/migration_chunks.sql")
    
    print(f"\n4. Copy the contents of migration_chunks.sql and paste into the SQL editor")
    
    print(f"\n5. Execute the SQL (click 'Run' button)")
    
    print(f"\n6. After completion, verify the migration:")
    print(f"   python3 migrate_pos_rest.py --verify")
    
    print(f"\n{'='*60}")

def main():
    print("POS System Migration Executor")
    print("="*40)
    
    # Try to execute chunks (will likely fail due to API limitations)
    success = execute_migration_chunks()
    
    if not success:
        show_dashboard_instructions()
    
    print("\nNext step: Run verification after manual execution")
    print("Command: python3 migrate_pos_rest.py --verify")

if __name__ == "__main__":
    main()