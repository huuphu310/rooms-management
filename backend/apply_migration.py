#!/usr/bin/env python3
"""
Script to apply database migrations to Supabase using direct PostgreSQL connection
"""
import os
import sys
import psycopg2
import re
from urllib.parse import urlparse
from app.core.config import settings

def read_migration_file(file_path: str) -> str:
    """Read the migration SQL file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def get_postgres_connection():
    """Get direct PostgreSQL connection to Supabase"""
    # Parse Supabase URL to get PostgreSQL connection details
    # Supabase URLs are typically https://xxxxx.supabase.co
    # The PostgreSQL connection is db.xxxxx.supabase.co:5432
    
    supabase_url = settings.SUPABASE_URL
    if supabase_url.startswith('https://'):
        project_id = supabase_url.replace('https://', '').replace('.supabase.co', '')
        
        # For direct database access, we need the database URL format
        # This is typically available as DATABASE_URL in Supabase project settings
        # For now, we'll try to construct it
        db_host = f"db.{project_id}.supabase.co"
        db_port = 5432
        db_name = "postgres"
        
        # Try to get password from service key (not ideal but may work for some cases)
        # In production, you should use the actual DATABASE_URL
        db_password = settings.SUPABASE_SERVICE_KEY
        
        connection_string = f"postgresql://postgres:{db_password}@{db_host}:{db_port}/{db_name}"
        
        print(f"Attempting to connect to: {db_host}:{db_port}")
        return psycopg2.connect(connection_string)
    else:
        raise ValueError("Invalid Supabase URL format")

def split_sql_statements(sql_content: str):
    """Split SQL content into individual statements"""
    statements = []
    current_statement = ""
    in_function = False
    function_depth = 0
    
    lines = sql_content.split('\n')
    
    for line in lines:
        stripped_line = line.strip()
        
        # Skip empty lines and comments
        if not stripped_line or stripped_line.startswith('--'):
            if current_statement.strip():
                current_statement += line + '\n'
            continue
            
        current_statement += line + '\n'
        
        # Handle function definitions
        if 'CREATE OR REPLACE FUNCTION' in stripped_line or 'CREATE FUNCTION' in stripped_line:
            in_function = True
            function_depth = 1
        elif in_function:
            if '$$ LANGUAGE plpgsql;' in stripped_line or '$$;' in stripped_line:
                function_depth -= 1
                if function_depth == 0:
                    in_function = False
                    statements.append(current_statement.strip())
                    current_statement = ""
        elif stripped_line.endswith(';') and not in_function:
            statements.append(current_statement.strip())
            current_statement = ""
    
    # Add any remaining statement
    if current_statement.strip():
        statements.append(current_statement.strip())
    
    return [stmt for stmt in statements if stmt.strip()]

def apply_migration(sql_content: str):
    """Apply migration SQL to Supabase using direct PostgreSQL connection"""
    try:
        conn = get_postgres_connection()
        cursor = conn.cursor()
        
        statements = split_sql_statements(sql_content)
        print(f"Found {len(statements)} SQL statements to execute")
        
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            if not statement.strip():
                continue
                
            try:
                print(f"Executing statement {i}/{len(statements)}...")
                print(f"Statement preview: {statement[:100]}{'...' if len(statement) > 100 else ''}")
                
                cursor.execute(statement)
                conn.commit()
                
                print(f"✓ Statement {i} executed successfully")
                success_count += 1
                
            except Exception as e:
                print(f"✗ Error executing statement {i}: {str(e)}")
                error_count += 1
                conn.rollback()
                # Continue with next statement
        
        cursor.close()
        conn.close()
        
        print(f"\nMigration completed: {success_count} successful, {error_count} failed")
        return error_count == 0
        
    except Exception as e:
        print(f"Connection error: {str(e)}")
        print("Note: Direct PostgreSQL connection requires DATABASE_URL or proper connection details")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python apply_migration.py <migration_file_path>")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    
    if not os.path.exists(migration_file):
        print(f"Error: Migration file '{migration_file}' not found")
        sys.exit(1)
    
    print(f"Applying migration: {migration_file}")
    
    try:
        sql_content = read_migration_file(migration_file)
        success = apply_migration(sql_content)
        
        if success:
            print("Migration applied successfully!")
            sys.exit(0)
        else:
            print("Migration completed with errors!")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()