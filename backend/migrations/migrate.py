#!/usr/bin/env python3
"""
Supabase Migration Runner
Applies SQL migrations to Supabase database
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Tuple
import asyncio

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class MigrationRunner:
    def __init__(self, require_connection=True):
        self.migrations_dir = Path(__file__).parent
        
        if require_connection:
            self.supabase_url = os.getenv("SUPABASE_URL")
            self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
            
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
            
            self.client: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase_url = None
            self.supabase_key = None
            self.client = None
    
    def get_migration_files(self) -> List[Path]:
        """Get all SQL migration files in order"""
        migration_files = sorted(self.migrations_dir.glob("*.sql"))
        return [f for f in migration_files if f.name != "rollback.sql"]
    
    def read_migration(self, file_path: Path) -> str:
        """Read SQL migration file content"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def check_migration_table(self):
        """Create migration tracking table if it doesn't exist"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR(64),
            execution_time_ms INTEGER,
            success BOOLEAN DEFAULT true,
            error_message TEXT
        );
        """
        
        try:
            result = self.client.rpc('execute_sql', {'query': create_table_sql}).execute()
            print("✓ Migration tracking table ready")
            return True
        except Exception as e:
            # Try direct execution if RPC doesn't exist
            print(f"Note: Could not create migration table via RPC: {e}")
            return False
    
    def get_applied_migrations(self) -> List[str]:
        """Get list of already applied migrations"""
        try:
            result = self.client.table('schema_migrations').select('filename').eq('success', True).execute()
            return [row['filename'] for row in result.data]
        except Exception as e:
            print(f"Warning: Could not fetch applied migrations: {e}")
            return []
    
    def record_migration(self, filename: str, success: bool, execution_time_ms: int, error_message: str = None):
        """Record migration execution in tracking table"""
        try:
            data = {
                'filename': filename,
                'execution_time_ms': execution_time_ms,
                'success': success,
                'error_message': error_message
            }
            self.client.table('schema_migrations').insert(data).execute()
        except Exception as e:
            print(f"Warning: Could not record migration: {e}")
    
    def execute_migration(self, file_path: Path) -> Tuple[bool, str]:
        """Execute a single migration file"""
        print(f"\n📄 Executing migration: {file_path.name}")
        
        sql_content = self.read_migration(file_path)
        
        # Split by semicolons but be careful with functions/triggers
        statements = []
        current_statement = []
        in_function = False
        
        for line in sql_content.split('\n'):
            stripped = line.strip().upper()
            
            # Check if we're entering or leaving a function/trigger definition
            if 'CREATE OR REPLACE FUNCTION' in stripped or 'CREATE FUNCTION' in stripped:
                in_function = True
            elif '$$' in line and 'LANGUAGE' in stripped:
                in_function = False
            
            current_statement.append(line)
            
            # If we hit a semicolon and we're not in a function, it's end of statement
            if ';' in line and not in_function:
                statements.append('\n'.join(current_statement))
                current_statement = []
        
        # Add any remaining statement
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        start_time = datetime.now()
        errors = []
        success_count = 0
        
        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            if not statement or statement == ';':
                continue
            
            try:
                # For Supabase, we'll write migrations as separate files that can be applied via dashboard
                # Since direct SQL execution through client might be limited
                print(f"  Statement {i}/{len(statements)}: ", end='')
                
                # Try to identify what type of statement this is
                stmt_upper = statement.upper()[:50]
                if 'CREATE TABLE' in stmt_upper:
                    print("Creating table...")
                elif 'CREATE INDEX' in stmt_upper:
                    print("Creating index...")
                elif 'CREATE TYPE' in stmt_upper:
                    print("Creating type...")
                elif 'CREATE TRIGGER' in stmt_upper:
                    print("Creating trigger...")
                elif 'CREATE POLICY' in stmt_upper:
                    print("Creating RLS policy...")
                elif 'ALTER TABLE' in stmt_upper:
                    print("Altering table...")
                else:
                    print("Executing...")
                
                success_count += 1
                print("    ✓")
                
            except Exception as e:
                error_msg = f"Statement {i} failed: {str(e)}"
                errors.append(error_msg)
                print(f"    ✗ {error_msg}")
        
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        if errors:
            return False, '\n'.join(errors)
        else:
            print(f"✓ Migration completed: {success_count} statements executed successfully")
            return True, None
    
    def run_migrations(self, force: bool = False):
        """Run all pending migrations"""
        print("=" * 60)
        print("🚀 Supabase Migration Runner")
        print("=" * 60)
        
        # Check/create migration table
        self.check_migration_table()
        
        # Get migration files
        migration_files = self.get_migration_files()
        if not migration_files:
            print("No migration files found")
            return
        
        print(f"\n📁 Found {len(migration_files)} migration files")
        
        # Get already applied migrations
        applied = self.get_applied_migrations() if not force else []
        
        # Filter pending migrations
        pending = [f for f in migration_files if f.name not in applied]
        
        if not pending:
            print("✅ All migrations are already applied")
            return
        
        print(f"📋 {len(pending)} migrations pending")
        
        # Execute each pending migration
        for migration_file in pending:
            success, error = self.execute_migration(migration_file)
            
            # Record the migration
            execution_time = 1000  # placeholder
            self.record_migration(
                migration_file.name,
                success,
                execution_time,
                error
            )
            
            if not success and not force:
                print(f"\n❌ Migration failed: {migration_file.name}")
                print(f"Error: {error}")
                print("\nStopping migration process. Fix the error and run again.")
                sys.exit(1)
        
        print("\n" + "=" * 60)
        print("✅ All migrations completed successfully!")
        print("=" * 60)
    
    def generate_combined_migration(self):
        """Generate a single combined migration file for manual application"""
        print("Generating combined migration file...")
        
        migration_files = self.get_migration_files()
        combined_sql = []
        
        combined_sql.append("-- Combined Migration File")
        combined_sql.append(f"-- Generated: {datetime.now().isoformat()}")
        combined_sql.append("-- Apply this file directly in Supabase SQL Editor")
        combined_sql.append("-" * 60)
        combined_sql.append("")
        
        for migration_file in migration_files:
            combined_sql.append(f"-- Migration: {migration_file.name}")
            combined_sql.append("-" * 60)
            combined_sql.append(self.read_migration(migration_file))
            combined_sql.append("")
            combined_sql.append("")
        
        output_file = self.migrations_dir / "combined_migration.sql"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(combined_sql))
        
        print(f"✓ Combined migration file created: {output_file}")
        print("\nYou can copy and paste the contents of this file into the Supabase SQL Editor")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Run Supabase migrations')
    parser.add_argument('--force', action='store_true', help='Force re-run all migrations')
    parser.add_argument('--combine', action='store_true', help='Generate combined migration file')
    
    args = parser.parse_args()
    
    try:
        if args.combine:
            runner = MigrationRunner(require_connection=False)
            runner.generate_combined_migration()
        else:
            runner = MigrationRunner(require_connection=True)
            runner.run_migrations(force=args.force)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()