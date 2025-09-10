-- Migration 011: Complete Authentication-Only RLS for All Tables
-- This migration ensures ALL tables have authentication-only RLS policies
-- as requested: "check again and update ALL authenticated policy for the remaining tables"

BEGIN;

-- Function to enable RLS and create authentication-only policy for any table
CREATE OR REPLACE FUNCTION enable_auth_rls_for_table(table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop existing policies if any
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_access" ON public.%I', table_name);
    
    -- Create authentication-only policy
    EXECUTE format('CREATE POLICY "authenticated_access" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL)', table_name);
    
    RAISE NOTICE 'Enabled authentication-only RLS for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Get all user tables and apply authentication-only RLS
DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Apply to all user tables in public schema
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    LOOP
        -- Enable authentication-only RLS for each table
        PERFORM enable_auth_rls_for_table(tbl.table_name);
    END LOOP;
END $$;

-- Specifically ensure core tables have proper RLS (in case they were missed)
-- These are the critical tables mentioned in the codebase

-- User management tables
SELECT enable_auth_rls_for_table('user_profiles');
SELECT enable_auth_rls_for_table('user_roles');
SELECT enable_auth_rls_for_table('roles');
SELECT enable_auth_rls_for_table('permissions');
SELECT enable_auth_rls_for_table('role_permissions');

-- Room management tables
SELECT enable_auth_rls_for_table('rooms');
SELECT enable_auth_rls_for_table('room_types');
SELECT enable_auth_rls_for_table('room_amenities');
SELECT enable_auth_rls_for_table('room_type_amenities');

-- Booking related tables
SELECT enable_auth_rls_for_table('bookings');
SELECT enable_auth_rls_for_table('booking_services');
SELECT enable_auth_rls_for_table('booking_payments');
SELECT enable_auth_rls_for_table('booking_room_assignments');

-- Customer tables
SELECT enable_auth_rls_for_table('customers');
SELECT enable_auth_rls_for_table('customer_documents');

-- Billing and financial tables
SELECT enable_auth_rls_for_table('invoices');
SELECT enable_auth_rls_for_table('invoice_items');
SELECT enable_auth_rls_for_table('payments');
SELECT enable_auth_rls_for_table('payment_methods');
SELECT enable_auth_rls_for_table('bank_accounts');

-- Inventory and POS tables
SELECT enable_auth_rls_for_table('inventory_items');
SELECT enable_auth_rls_for_table('inventory_transactions');
SELECT enable_auth_rls_for_table('pos_shifts');
SELECT enable_auth_rls_for_table('pos_transactions');
SELECT enable_auth_rls_for_table('pos_transaction_items');

-- Room allocation tables
SELECT enable_auth_rls_for_table('room_blocks');
SELECT enable_auth_rls_for_table('room_allocation_rules');

-- Building management
SELECT enable_auth_rls_for_table('buildings');
SELECT enable_auth_rls_for_table('floors');

-- Services and amenities
SELECT enable_auth_rls_for_table('services');
SELECT enable_auth_rls_for_table('amenities');

-- Audit and logging tables (if they exist)
SELECT enable_auth_rls_for_table('audit_logs');
SELECT enable_auth_rls_for_table('system_logs');

-- Exchange rates and currency
SELECT enable_auth_rls_for_table('exchange_rates');
SELECT enable_auth_rls_for_table('currencies');

-- Any additional tables that might exist
-- The DO block above should catch them all, but these are explicit for safety

-- Clean up the helper function
DROP FUNCTION enable_auth_rls_for_table(TEXT);

-- Verify RLS is enabled on all tables
-- This query will show tables without RLS enabled (should be empty after this migration)
DO $$
DECLARE
    tbl RECORD;
    no_rls_count INTEGER := 0;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = tablename 
            AND relrowsecurity = true
        )
    LOOP
        RAISE WARNING 'Table without RLS: %.%', tbl.schemaname, tbl.tablename;
        no_rls_count := no_rls_count + 1;
    END LOOP;
    
    IF no_rls_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All tables now have RLS enabled';
    ELSE
        RAISE WARNING 'WARNING: % tables still missing RLS', no_rls_count;
    END IF;
END $$;

-- Final verification: List all RLS policies created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname = 'authenticated_access';
    
    RAISE NOTICE 'Total authentication-only policies created: %', policy_count;
END $$;

COMMIT;

-- Summary of what this migration accomplishes:
-- 1. Enables RLS on ALL tables in the public schema
-- 2. Creates "authenticated_access" policy for ALL tables: FOR ALL USING (auth.uid() IS NOT NULL)
-- 3. Explicitly handles all known core tables from the application
-- 4. Provides verification that RLS is properly enabled
-- 5. Reports the total number of policies created
--
-- This ensures that "ALL authenticated policy for the remaining tables" as requested by user