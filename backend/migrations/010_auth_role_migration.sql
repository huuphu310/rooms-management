-- ============================================================================
-- Migration: Update Auth Schema for Role-Based Authentication
-- Purpose: Add role_id to auth.users and simplify RLS to API-level permission checking
-- ============================================================================

-- ============================================================================
-- 1. Add role_id to auth.users table (using raw_app_meta_data for storage)
-- ============================================================================

-- Create a function to update user metadata with role information
CREATE OR REPLACE FUNCTION public.update_user_role_metadata(
    user_id UUID,
    role_id UUID,
    role_code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the user's raw_app_meta_data to include role information
    UPDATE auth.users 
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'role_id', role_id,
            'role_code', role_code,
            'updated_at', NOW()
        )
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

-- Create a function to get user role from auth.users metadata
CREATE OR REPLACE FUNCTION public.get_user_role_from_auth(user_id UUID)
RETURNS TABLE(role_id UUID, role_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (raw_app_meta_data->>'role_id')::UUID as role_id,
        raw_app_meta_data->>'role_code' as role_code
    FROM auth.users
    WHERE id = user_id;
END;
$$;

-- ============================================================================
-- 2. Update existing users with role information in auth.users
-- ============================================================================

-- Update all existing users to have their role information in auth.users metadata
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    COALESCE(
        (SELECT jsonb_build_object(
            'role_id', ur.role_id,
            'role_code', r.role_code,
            'role_name', r.role_name,
            'updated_at', NOW()
        )
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.users.id 
        AND ur.is_active = true
        LIMIT 1),
        jsonb_build_object(
            'role_id', NULL,
            'role_code', 'RECEPTIONIST',
            'role_name', 'Receptionist',
            'updated_at', NOW()
        )
    )
WHERE EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.users.id);

-- ============================================================================
-- 3. Drop existing RLS policies and replace with authentication-only policies
-- ============================================================================

-- Drop all existing role-based RLS policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies in the public schema
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
END $$;

-- Drop the helper functions that were used for RLS
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.has_any_role(text[]);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_staff();

-- ============================================================================
-- 4. Create simplified authentication-only RLS policies
-- ============================================================================

-- USER PROFILES: Authenticated users can access (API will handle permissions)
CREATE POLICY "user_profiles_authenticated_access" 
ON user_profiles FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ROOM TYPES: Authenticated access only (internal admin data)
CREATE POLICY "room_types_authenticated_access" 
ON room_types FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ROOMS: Authenticated access only (internal admin data)
CREATE POLICY "rooms_authenticated_access" 
ON rooms FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- CUSTOMERS: Authenticated access only
CREATE POLICY "customers_authenticated_access" 
ON customers FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- BOOKINGS: Authenticated access only
CREATE POLICY "bookings_authenticated_access" 
ON bookings FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ROLES: Authenticated access only
CREATE POLICY "roles_authenticated_access" 
ON roles FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- USER_ROLES: Authenticated access only
CREATE POLICY "user_roles_authenticated_access" 
ON user_roles FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- PERMISSIONS: Authenticated access only
CREATE POLICY "permissions_authenticated_access" 
ON permissions FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ROLE_PERMISSIONS: Authenticated access only
CREATE POLICY "role_permissions_authenticated_access" 
ON role_permissions FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- USER_PERMISSIONS: Authenticated access only
CREATE POLICY "user_permissions_authenticated_access" 
ON user_permissions FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. Apply authentication-only policies to all other tables
-- ============================================================================

DO $$
DECLARE
    table_names text[] := ARRAY[
        'folios', 'folio_postings', 'billing_invoices', 'billing_invoice_items',
        'pos_shifts', 'pos_transactions', 'inventory_items', 'inventory_transactions',
        'room_allocation_rules', 'room_blocks', 'surcharge_policies', 'discount_policies',
        'services', 'amenities', 'room_amenities', 'booking_services',
        'seasonal_rates', 'special_rates', 'rate_plans'
    ];
    tbl_name text;
BEGIN
    -- Apply authentication-only policies to existing tables
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables t
                  WHERE t.table_schema = 'public' AND t.table_name = tbl_name) THEN
            
            -- Enable RLS if not already enabled
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl_name);
            
            -- Create authentication-only policy
            EXECUTE format('
                CREATE POLICY "%s_authenticated_access" 
                ON %I FOR ALL 
                TO authenticated
                USING (true)
                WITH CHECK (true);
            ', tbl_name, tbl_name);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 6. Create trigger to sync role changes to auth.users metadata
-- ============================================================================

-- Function to sync role changes to auth.users
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    role_info RECORD;
BEGIN
    -- Get role information
    SELECT r.id, r.role_code, r.role_name
    INTO role_info
    FROM public.roles r
    WHERE r.id = COALESCE(NEW.role_id, OLD.role_id);
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update auth.users metadata when user role is assigned/updated
        IF NEW.is_active = true THEN
            PERFORM public.update_user_role_metadata(
                NEW.user_id,
                role_info.id,
                role_info.role_code
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Clear role information when role is removed
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'role_id', NULL,
                'role_code', 'RECEPTIONIST',
                'role_name', 'Receptionist',
                'updated_at', NOW()
            )
        WHERE id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS sync_user_role_to_auth_trigger ON user_roles;
CREATE TRIGGER sync_user_role_to_auth_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_role_to_auth();

-- ============================================================================
-- 7. Grant necessary permissions
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.update_user_role_metadata(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_from_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_role_to_auth() TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- ============================================================================
-- 8. Comments and documentation
-- ============================================================================

COMMENT ON FUNCTION public.update_user_role_metadata(UUID, UUID, TEXT) IS 'Update user role information in auth.users raw_app_meta_data';
COMMENT ON FUNCTION public.get_user_role_from_auth(UUID) IS 'Get user role information from auth.users metadata';
COMMENT ON FUNCTION public.sync_user_role_to_auth() IS 'Trigger function to sync role changes to auth.users metadata';

-- ============================================================================
-- 9. Verification queries
-- ============================================================================

-- These queries can be used to verify the migration worked correctly:
/*
-- Check that role information is stored in auth.users metadata
SELECT 
    id,
    email,
    raw_app_meta_data->>'role_id' as role_id,
    raw_app_meta_data->>'role_code' as role_code,
    raw_app_meta_data->>'role_name' as role_name
FROM auth.users
LIMIT 5;

-- Check RLS policies are authentication-only
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Test role metadata function
SELECT * FROM public.get_user_role_from_auth('your-user-id');
*/