#!/usr/bin/env python3
"""
POS Migration using Supabase REST API with SQL execution
"""
import requests
import json
import sys
from app.core.config import settings

def read_migration_file():
    """Read the POS migration SQL file"""
    migration_file = "/Users/huuphu/Development/room_booking/backend/migrations/007_pos_system.sql"
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        return f.read()

def execute_sql_via_supabase_api(sql_statement):
    """Execute SQL using Supabase REST API"""
    url = f"{settings.SUPABASE_URL}/rest/v1/rpc/exec"
    
    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    payload = {
        "sql": sql_statement
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        return response.status_code == 200, response.text
    except Exception as e:
        return False, str(e)

def apply_migration_manually():
    """Show manual instructions for applying the migration"""
    
    print("POS System Migration - Manual Application Required")
    print("="*60)
    print()
    
    # Read the migration file to show its contents
    sql_content = read_migration_file()
    
    print("Since direct SQL execution through API isn't available,")
    print("please apply the migration manually using one of these methods:")
    print()
    
    print("METHOD 1: Supabase Dashboard SQL Editor")
    print("-"*40)
    print("1. Open your Supabase Dashboard:")
    print(f"   https://app.supabase.com/project/{settings.SUPABASE_URL.split('//')[1].split('.')[0]}")
    print()
    print("2. Go to 'SQL Editor' in the left sidebar")
    print()
    print("3. Create a new query and paste the following SQL:")
    print("   (Migration file: /Users/huuphu/Development/room_booking/backend/migrations/007_pos_system.sql)")
    print()
    
    print("METHOD 2: Use psql command line (if you have database credentials)")
    print("-"*40)
    print("If you have the direct database connection string:")
    print("psql 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres' -f migrations/007_pos_system.sql")
    print()
    
    print("METHOD 3: Copy-paste individual table creation statements")
    print("-"*40)
    print("Execute these SQL statements one by one in Supabase SQL Editor:")
    print()
    
    # Split the migration into logical chunks for manual execution
    lines = sql_content.split('\n')
    current_statement = ""
    statement_count = 0
    
    for line in lines:
        if line.strip().startswith('--') and 'TABLE' in line:
            if current_statement.strip():
                statement_count += 1
                print(f"-- STATEMENT {statement_count}:")
                print(current_statement.strip())
                print()
                current_statement = ""
        
        if not line.strip().startswith('--') or 'CREATE' in line:
            current_statement += line + '\n'
            
            if line.strip().endswith(');') and 'CREATE TABLE' in current_statement:
                statement_count += 1
                print(f"-- STATEMENT {statement_count}:")
                print(current_statement.strip())
                print()
                current_statement = ""
    
    print("\n" + "="*60)
    print("After applying the migration, run verification:")
    print(f"python3 {__file__} --verify")
    print("="*60)

def verify_migration():
    """Verify migration by checking if tables exist using Supabase client"""
    from supabase import create_client
    
    supabase = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY
    )
    
    tables_to_check = [
        "pos_categories",
        "pos_product_modifiers", 
        "pos_shifts",
        "pos_transactions",
        "pos_transaction_items",
        "pos_payments",
        "pos_receipt_templates"
    ]
    
    print("Verifying POS migration...")
    print("="*40)
    
    success_count = 0
    
    for table_name in tables_to_check:
        try:
            # Try to query the table
            result = supabase.table(table_name).select("*").limit(1).execute()
            print(f"✓ {table_name}: exists and accessible")
            success_count += 1
        except Exception as e:
            error_msg = str(e)
            if "does not exist" in error_msg or "relation" in error_msg:
                print(f"✗ {table_name}: does not exist")
            else:
                print(f"✗ {table_name}: error - {error_msg}")
    
    print(f"\nVerification result: {success_count}/{len(tables_to_check)} tables found")
    
    if success_count == len(tables_to_check):
        print("🎉 All POS tables are present!")
        return True
    else:
        missing_count = len(tables_to_check) - success_count
        print(f"⚠️  {missing_count} tables are missing. Please apply the migration.")
        return False

def show_migration_summary():
    """Show what the migration includes"""
    print("\nPOS MIGRATION SUMMARY")
    print("="*40)
    print("This migration creates the following tables:")
    print("• pos_categories - Product categories for organization")
    print("• pos_product_modifiers - Size, extras, and customizations")  
    print("• pos_shifts - Work sessions and daily operations")
    print("• pos_transactions - Sales transactions")
    print("• pos_transaction_items - Individual items in transactions")
    print("• pos_payments - Payment details and methods")
    print("• pos_receipt_templates - Receipt formatting templates")
    print()
    print("It also includes:")
    print("• Database indexes for performance")
    print("• Triggers for automatic code generation")
    print("• Functions for updating shift summaries")
    print("• Default receipt template")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        success = verify_migration()
        if success:
            show_migration_summary()
    else:
        apply_migration_manually()
        print("\nChecking current table status...")
        verify_migration()

if __name__ == "__main__":
    main()