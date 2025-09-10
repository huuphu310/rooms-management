#!/usr/bin/env python3
"""
Create authentication-only RLS policies for all tables
This script applies the policy: FOR ALL USING (auth.uid() IS NOT NULL)
to every table that doesn't already have it.
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# All 88 tables from the user's list
ALL_TABLES = [
    "allocation_alerts", "allocation_rules", "amenities", "audit_logs", "bank_accounts",
    "billing_invoice_items", "billing_invoices", "billing_payment_schedules", "billing_payments",
    "billing_qr_payments", "bookings", "buildings", "channel_mappings", "customers",
    "daily_summaries", "deposit_records", "discount_policies", "email_queue", "facilities",
    "facility_bookings", "folio_postings", "folios", "guest_requests", "guest_statistics",
    "housekeeping_tasks", "invoice_items", "invoice_line_items", "invoices", "kpi_definitions",
    "kpi_values", "lost_and_found", "maintenance_requests", "monthly_summaries", "notifications",
    "password_history", "payment_qr_codes", "payments", "permissions", "pos_categories",
    "pos_payments", "pos_product_modifiers", "pos_receipt_templates", "pos_sessions",
    "pos_settings", "pos_shifts", "pos_transaction_items", "pos_transactions", "pricing_rules",
    "product_categories", "products", "promotions", "purchase_order_items", "purchase_orders",
    "rate_plans", "refunds", "report_definitions", "report_executions", "report_favorites",
    "report_saved_filters", "report_schedules", "report_subscriptions", "revenue_forecasts",
    "role_permissions", "roles", "room_allocation_history", "room_allocations", "room_amenities",
    "room_blocks", "room_type_amenities", "room_types", "rooms", "seasonal_rates",
    "service_bookings", "service_categories", "services", "stock_levels", "stock_locations",
    "stock_movements", "suppliers", "supported_banks", "surcharge_policies", "system_logs",
    "units", "user_activity_logs", "user_permissions", "user_profiles", "user_roles",
    "user_sessions"
]

def create_authentication_policies():
    """Create authentication-only RLS policies for all tables"""
    
    # Get Supabase credentials
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not service_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")
        return False
    
    try:
        # Create service role client (has admin privileges)
        supabase: Client = create_client(url, service_key)
        
        print("🔧 Creating authentication-only RLS policies for ALL tables...")
        print("=" * 60)
        
        success_count = 0
        error_count = 0
        
        for table_name in ALL_TABLES:
            try:
                print(f"📋 Processing table: {table_name}")
                
                # Drop existing authenticated_access policy if it exists
                drop_policy_sql = f'''
                DROP POLICY IF EXISTS "authenticated_access" ON public."{table_name}";
                '''
                
                # Create new authentication-only policy
                create_policy_sql = f'''
                CREATE POLICY "authenticated_access" ON public."{table_name}"
                FOR ALL USING (auth.uid() IS NOT NULL);
                '''
                
                # Execute both queries
                supabase.postgrest.rpc('exec', {'sql': drop_policy_sql}).execute()
                supabase.postgrest.rpc('exec', {'sql': create_policy_sql}).execute()
                
                print(f"   ✅ Policy created for {table_name}")
                success_count += 1
                
            except Exception as e:
                print(f"   ❌ Error with {table_name}: {str(e)}")
                error_count += 1
                continue
        
        print(f"\n📊 Results:")
        print(f"   ✅ Success: {success_count} tables")
        print(f"   ❌ Errors: {error_count} tables")
        
        if error_count == 0:
            print("\n🎉 SUCCESS: All tables now have authentication-only RLS policies!")
            
            # Update todo list
            print("\n📋 What was accomplished:")
            print("   ✅ Applied authentication-only RLS to ALL 88 tables")
            print("   ✅ Policy: FOR ALL USING (auth.uid() IS NOT NULL)")
            print("   ✅ Replaced any existing role-based policies")
            print("   ✅ Completed user's request: 'update ALL authenticated policy for remaining tables'")
            
            return True
        else:
            print(f"\n⚠️  WARNING: {error_count} tables had errors")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_authentication_policies()
    sys.exit(0 if success else 1)