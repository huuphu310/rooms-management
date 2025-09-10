-- ============================================================================
-- Fix RLS Policies - Remove Infinite Recursion and Implement Proper RBAC
-- ============================================================================

-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Authenticated users can manage room types" ON room_types;
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON bookings;

-- ============================================================================
-- 1. Create SECURITY DEFINER helper functions to avoid recursion
-- ============================================================================

-- Function to get current user's role (without recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role 
  FROM public.user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(role_names text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = ANY(role_names),
    false
  );
$$;

-- Function to check if user is admin
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

-- Function to check if user is staff (admin, manager, or receptionist)
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

-- Revoke public access and grant only to authenticated users
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ============================================================================
-- 2. Redesigned RLS Policies
-- ============================================================================

-- USER PROFILES: Self-access + Admin management
CREATE POLICY "user_profiles_self_select" 
ON user_profiles FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_profiles_self_update" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "user_profiles_admin_all" 
ON user_profiles FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ROOM TYPES: Public read, staff write
CREATE POLICY "room_types_public_read" 
ON room_types FOR SELECT 
TO public
USING (is_active = true);

CREATE POLICY "room_types_staff_write" 
ON room_types FOR INSERT, UPDATE, DELETE 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- ROOMS: Public read, staff write
CREATE POLICY "rooms_public_read" 
ON rooms FOR SELECT 
TO public
USING (is_active = true);

CREATE POLICY "rooms_staff_write" 
ON rooms FOR INSERT, UPDATE, DELETE 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- CUSTOMERS: Staff access only
CREATE POLICY "customers_staff_all" 
ON customers FOR ALL 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- BOOKINGS: Staff access only
CREATE POLICY "bookings_staff_all" 
ON bookings FOR ALL 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- ============================================================================
-- 3. Additional tables that may need RLS (if they exist)
-- ============================================================================

-- Enable RLS on additional tables that might exist
DO $$
DECLARE
    table_name text;
    tables_to_secure text[] := ARRAY[
        'folios', 'folio_postings', 'billing_invoices', 'billing_invoice_items',
        'pos_shifts', 'pos_transactions', 'inventory_items', 'inventory_transactions',
        'room_allocation_rules', 'room_blocks', 'surcharge_policies', 'discount_policies'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_secure
    LOOP
        -- Check if table exists and enable RLS
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' AND table_name = table_name) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
            
            -- Create staff-only policies for these tables
            EXECUTE format('
                CREATE POLICY "%s_staff_all" 
                ON %I FOR ALL 
                TO authenticated
                USING (public.is_staff())
                WITH CHECK (public.is_staff());
            ', table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 4. Grant necessary permissions for the application
-- ============================================================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on sequences (for auto-generated IDs)
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT USAGE ON SEQUENCE %I TO authenticated;', seq_name);
    END LOOP;
END $$;

-- ============================================================================
-- 5. Comments and documentation
-- ============================================================================

COMMENT ON FUNCTION public.get_user_role() IS 'Get current authenticated user role without RLS recursion';
COMMENT ON FUNCTION public.has_any_role(text[]) IS 'Check if current user has any of the specified roles';
COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is an admin';
COMMENT ON FUNCTION public.is_staff() IS 'Check if current user is staff (admin/manager/receptionist/accountant)';

-- ============================================================================
-- 6. Verification queries (run these after applying migration)
-- ============================================================================

-- These queries can be used to test the policies:
/*
-- Set test user context (replace with actual user UUID)
SELECT set_config('request.jwt.claims', 
  '{"sub":"test-user-uuid","role":"authenticated"}', true);

-- Test queries
SELECT public.get_user_role();
SELECT public.is_admin();
SELECT public.is_staff();

-- Check which policies are active
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
*/