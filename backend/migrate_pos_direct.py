#!/usr/bin/env python3
"""
Direct PostgreSQL migration script for POS system
"""
import psycopg2
import sys
from app.core.config import settings

def get_database_url():
    """Construct the database URL for Supabase"""
    # Extract project ref from Supabase URL
    supabase_url = settings.SUPABASE_URL
    project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')
    
    # Use service key as password (this is the correct approach for direct DB access)
    db_password = settings.SUPABASE_SERVICE_KEY
    
    # Construct PostgreSQL connection string
    return f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

def read_migration_file():
    """Read the POS migration SQL file"""
    migration_file = "/Users/huuphu/Development/room_booking/backend/migrations/007_pos_system.sql"
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        return f.read()

def split_sql_statements(sql_content):
    """Split SQL content into individual executable statements"""
    statements = []
    current_statement = ""
    in_function = False
    brace_count = 0
    
    lines = sql_content.split('\n')
    
    for line in lines:
        stripped_line = line.strip()
        
        # Skip empty lines and standalone comments
        if not stripped_line or (stripped_line.startswith('--') and not current_statement.strip()):
            continue
        
        current_statement += line + '\n'
        
        # Track function definitions
        if any(keyword in stripped_line.upper() for keyword in ['CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION']):
            in_function = True
        elif in_function and ('$$ LANGUAGE plpgsql;' in stripped_line or stripped_line.endswith('$$;')):
            in_function = False
            statements.append(current_statement.strip())
            current_statement = ""
        elif not in_function and stripped_line.endswith(';'):
            statements.append(current_statement.strip())
            current_statement = ""
    
    # Add any remaining statement
    if current_statement.strip():
        statements.append(current_statement.strip())
    
    return [stmt for stmt in statements if stmt.strip()]

def apply_migration():
    """Apply the POS migration to Supabase database"""
    
    print("Connecting to Supabase PostgreSQL database...")
    
    try:
        # Connect to database
        database_url = get_database_url()
        conn = psycopg2.connect(database_url)
        conn.autocommit = True  # Auto-commit each statement
        cursor = conn.cursor()
        
        print("✓ Connected successfully")
        
        # Read migration file
        sql_content = read_migration_file()
        print("✓ Migration file loaded")
        
        # Split into statements
        statements = split_sql_statements(sql_content)
        print(f"✓ Found {len(statements)} SQL statements")
        
        # Execute each statement
        success_count = 0
        failed_statements = []
        
        for i, statement in enumerate(statements, 1):
            try:
                print(f"\n[{i}/{len(statements)}] Executing: {statement[:60]}{'...' if len(statement) > 60 else ''}")
                
                cursor.execute(statement)
                
                print(f"✓ Statement {i} executed successfully")
                success_count += 1
                
            except Exception as e:
                error_msg = str(e)
                print(f"✗ Statement {i} failed: {error_msg}")
                
                # Check if it's just a "relation already exists" error
                if "already exists" in error_msg.lower():
                    print(f"  → Skipping (object already exists)")
                    success_count += 1
                else:
                    failed_statements.append((i, statement[:100], error_msg))
        
        # Close connection
        cursor.close()
        conn.close()
        
        # Report results
        print(f"\n{'='*60}")
        print("MIGRATION RESULTS")
        print(f"{'='*60}")
        print(f"✓ Successfully executed: {success_count}/{len(statements)} statements")
        
        if failed_statements:
            print(f"✗ Failed statements: {len(failed_statements)}")
            for i, stmt_preview, error in failed_statements:
                print(f"  [{i}] {stmt_preview}...")
                print(f"      Error: {error}")
        
        print(f"\n{'='*60}")
        
        if len(failed_statements) == 0:
            print("🎉 Migration completed successfully!")
            return True
        else:
            print("⚠️  Migration completed with some errors")
            return False
            
    except Exception as e:
        print(f"✗ Connection error: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Check your Supabase service key is correct")
        print("2. Ensure your IP is allowed in Supabase project settings")
        print("3. Verify the project reference in the database URL")
        return False

def verify_tables():
    """Verify that POS tables were created successfully"""
    
    tables_to_check = [
        "pos_categories",
        "pos_product_modifiers", 
        "pos_shifts",
        "pos_transactions",
        "pos_transaction_items",
        "pos_payments",
        "pos_receipt_templates"
    ]
    
    try:
        database_url = get_database_url()
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print(f"\n{'='*60}")
        print("VERIFICATION")
        print(f"{'='*60}")
        
        success_count = 0
        
        for table_name in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = %s", (table_name,))
                exists = cursor.fetchone()[0] > 0
                
                if exists:
                    # Check if we can query the table
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    print(f"✓ {table_name}: exists, {count} rows")
                    success_count += 1
                else:
                    print(f"✗ {table_name}: does not exist")
                    
            except Exception as e:
                print(f"✗ {table_name}: error checking - {str(e)}")
        
        cursor.close()
        conn.close()
        
        print(f"\nVerification: {success_count}/{len(tables_to_check)} tables confirmed")
        return success_count == len(tables_to_check)
        
    except Exception as e:
        print(f"Verification failed: {str(e)}")
        return False

def main():
    print("POS System Migration - Direct PostgreSQL Connection")
    print("="*60)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--verify-only":
        success = verify_tables()
    else:
        success = apply_migration()
        if success:
            print("\nRunning verification...")
            verify_tables()
    
    if success:
        print("\n🎉 All operations completed successfully!")
    else:
        print("\n⚠️  Some operations failed. Check the output above.")

if __name__ == "__main__":
    main()