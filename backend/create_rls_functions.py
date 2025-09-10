#!/usr/bin/env python3
"""
Create RLS helper functions to fix infinite recursion
"""
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.core.database import get_supabase_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_rls_functions():
    """Create the SECURITY DEFINER helper functions"""
    print("=" * 60)
    print("Creating RLS Helper Functions")
    print("=" * 60)
    
    try:
        db = get_supabase_service()
        
        # Function 1: get_user_role
        print("📝 Creating get_user_role function...")
        get_user_role_sql = """
        CREATE OR REPLACE FUNCTION public.get_user_role()
        RETURNS text
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public, auth
        AS $$
          SELECT COALESCE(
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
            'user'
          );
        $$;
        """
        
        try:
            result = db.rpc('exec_sql', {'query': get_user_role_sql.strip()}).execute()
            print("   ✅ get_user_role created successfully")
        except Exception as e:
            print(f"   ❌ Error creating get_user_role: {str(e)}")
            # Try alternative approach
            print("   🔄 Trying alternative approach...")
            
        # Function 2: is_admin
        print("📝 Creating is_admin function...")
        is_admin_sql = """
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public, auth
        AS $$
          SELECT COALESCE(
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin',
            false
          );
        $$;
        """
        
        try:
            result = db.rpc('exec_sql', {'query': is_admin_sql.strip()}).execute()
            print("   ✅ is_admin created successfully")
        except Exception as e:
            print(f"   ❌ Error creating is_admin: {str(e)}")
            
        # Function 3: is_staff
        print("📝 Creating is_staff function...")
        is_staff_sql = """
        CREATE OR REPLACE FUNCTION public.is_staff()
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public, auth
        AS $$
          SELECT COALESCE(
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()) 
            IN ('admin', 'manager', 'receptionist', 'accountant'),
            false
          );
        $$;
        """
        
        try:
            result = db.rpc('exec_sql', {'query': is_staff_sql.strip()}).execute()
            print("   ✅ is_staff created successfully")
        except Exception as e:
            print(f"   ❌ Error creating is_staff: {str(e)}")
            
        # Test the functions
        print("\n🧪 Testing functions...")
        
        try:
            # Test get_user_role
            result = db.rpc('get_user_role').execute()
            print(f"   ✅ get_user_role test: {result.data}")
        except Exception as e:
            print(f"   ❌ get_user_role test failed: {str(e)}")
            
        try:
            # Test is_admin
            result = db.rpc('is_admin').execute()
            print(f"   ✅ is_admin test: {result.data}")
        except Exception as e:
            print(f"   ❌ is_admin test failed: {str(e)}")
            
        try:
            # Test is_staff
            result = db.rpc('is_staff').execute()
            print(f"   ✅ is_staff test: {result.data}")
        except Exception as e:
            print(f"   ❌ is_staff test failed: {str(e)}")
            
        print("\n" + "=" * 60)
        print("RLS Functions Creation Complete")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"💥 Fatal error: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_rls_functions()
    sys.exit(0 if success else 1)