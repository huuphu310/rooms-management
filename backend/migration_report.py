#!/usr/bin/env python3
"""
POS Migration Status Report
"""
import sys
from supabase import create_client
from app.core.config import settings

def generate_migration_report():
    """Generate a comprehensive migration status report"""
    
    supabase = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY
    )
    
    print("POS SYSTEM MIGRATION STATUS REPORT")
    print("="*60)
    print(f"Supabase Project: {settings.SUPABASE_URL}")
    print(f"Report Generated: {sys.version}")
    print("="*60)
    
    # Check database connectivity
    print("\n1. DATABASE CONNECTIVITY")
    print("-"*30)
    try:
        result = supabase.table("rooms").select("id").limit(1).execute()
        print("✓ Database connection successful")
        connection_ok = True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        connection_ok = False
    
    if not connection_ok:
        return False
    
    # Check existing tables
    print("\n2. EXISTING POS TABLES")
    print("-"*30)
    
    required_tables = {
        "pos_categories": "Product categories for organization",
        "pos_product_modifiers": "Size, extras, and customizations",
        "pos_shifts": "Work sessions and daily operations", 
        "pos_transactions": "Sales transactions",
        "pos_transaction_items": "Individual items in transactions",
        "pos_payments": "Payment details and methods",
        "pos_receipt_templates": "Receipt formatting templates"
    }
    
    existing_tables = []
    missing_tables = []
    
    for table_name, description in required_tables.items():
        try:
            result = supabase.table(table_name).select("*").limit(1).execute()
            print(f"✓ {table_name}: exists")
            existing_tables.append(table_name)
        except Exception as e:
            if "does not exist" in str(e) or "PGRST205" in str(e):
                print(f"✗ {table_name}: missing")
                missing_tables.append(table_name)
            else:
                print(f"? {table_name}: error - {str(e)}")
                missing_tables.append(table_name)
    
    # Migration status summary
    print(f"\n3. MIGRATION STATUS")
    print("-"*30)
    total_tables = len(required_tables)
    existing_count = len(existing_tables)
    missing_count = len(missing_tables)
    
    completion_percentage = (existing_count / total_tables) * 100
    print(f"Tables existing: {existing_count}/{total_tables} ({completion_percentage:.1f}%)")
    print(f"Tables missing: {missing_count}")
    
    if missing_count == 0:
        print("🎉 Migration is COMPLETE!")
        status = "COMPLETE"
    elif existing_count > 0:
        print("⚠️  Migration is PARTIAL")
        status = "PARTIAL"
    else:
        print("❌ Migration is PENDING")
        status = "PENDING"
    
    # Show what needs to be done
    if missing_count > 0:
        print(f"\n4. REQUIRED ACTIONS")
        print("-"*30)
        print("The following tables need to be created:")
        for table_name in missing_tables:
            print(f"  • {table_name}: {required_tables[table_name]}")
        
        print(f"\nTo complete the migration:")
        print("1. Open Supabase Dashboard SQL Editor:")
        project_ref = settings.SUPABASE_URL.split('//')[1].split('.')[0]
        print(f"   https://app.supabase.com/project/{project_ref}")
        print("2. Execute the migration file:")
        print("   /Users/huuphu/Development/room_booking/backend/migration_chunks.sql")
        print("3. Verify completion:")
        print("   python3 migration_report.py")
    
    # Migration file details
    print(f"\n5. MIGRATION FILES")
    print("-"*30)
    migration_files = [
        ("007_pos_system.sql", "Original migration file (390 lines)"),
        ("migration_chunks.sql", "Chunked version for manual execution"),
        ("migrate_pos_rest.py", "Python verification script"),
        ("migration_report.py", "This status report script")
    ]
    
    for filename, description in migration_files:
        filepath = f"/Users/huuphu/Development/room_booking/backend/{filename}"
        print(f"  • {filename}: {description}")
    
    # Next steps
    print(f"\n6. NEXT STEPS")
    print("-"*30)
    if status == "COMPLETE":
        print("✓ Migration is complete!")
        print("✓ All POS tables are ready for use")
        print("✓ You can now implement POS functionality in your application")
    elif status == "PARTIAL":
        print("1. Complete the remaining table creation using Supabase SQL Editor")
        print("2. Re-run this report to verify completion")
        print("3. Test POS functionality")
    else:
        print("1. Execute the migration_chunks.sql file in Supabase SQL Editor")
        print("2. Re-run this report to verify completion") 
        print("3. Test database connectivity and table access")
    
    print(f"\n{'='*60}")
    return status == "COMPLETE"

def main():
    success = generate_migration_report()
    
    if success:
        print("🎉 All migration tasks completed successfully!")
        sys.exit(0)
    else:
        print("⚠️  Migration requires manual completion.")
        sys.exit(1)

if __name__ == "__main__":
    main()