# RLS Architecture Redesign - Implementation Plan

## Overview

This document outlines the redesign of Row-Level Security (RLS) policies for the Room Booking System to eliminate infinite recursion issues and implement proper role-based access control.

## Current Issues Identified

### 1. Infinite Recursion Problem
```sql
-- PROBLEMATIC: This policy queries user_profiles within a user_profiles policy
CREATE POLICY "Admins can manage all profiles" ON user_profiles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles  -- ❌ Circular dependency!
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

### 2. Overly Broad Access
```sql
-- PROBLEMATIC: All authenticated users get full access
CREATE POLICY "Authenticated users can manage bookings" ON bookings
FOR ALL USING (auth.role() = 'authenticated');  -- ❌ Too permissive!
```

### 3. No Proper RBAC Structure
- Roles stored as text in `user_profiles.role` instead of proper role tables
- No permission matrix or fine-grained access control
- Direct table joins in policies causing recursion

## Solution Architecture

### 1. SECURITY DEFINER Helper Functions

These functions run with elevated privileges and avoid RLS recursion:

```sql
-- ✅ SOLUTION: Helper function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER  -- Runs with creator's privileges, bypasses RLS
SET search_path = public, auth
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin',
    false
  );
$$;
```

### 2. Redesigned RLS Policies

#### User Profiles (Self + Admin Access)
```sql
-- Users can view/edit their own profile
CREATE POLICY "user_profiles_self_select" 
ON user_profiles FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Admins can manage all profiles using helper function
CREATE POLICY "user_profiles_admin_all" 
ON user_profiles FOR ALL 
TO authenticated
USING (public.is_admin())    -- ✅ No recursion!
WITH CHECK (public.is_admin());
```

#### Room Types & Rooms (Public Read + Staff Write)
```sql
-- Anyone can view active rooms (for availability)
CREATE POLICY "room_types_public_read" 
ON room_types FOR SELECT 
TO public
USING (is_active = true);

-- Only staff can modify rooms
CREATE POLICY "room_types_staff_write" 
ON room_types FOR INSERT, UPDATE, DELETE 
TO authenticated
USING (public.is_staff())    -- ✅ Uses helper function
WITH CHECK (public.is_staff());
```

#### Business Data (Staff Only)
```sql
-- Only staff can access customer data
CREATE POLICY "customers_staff_all" 
ON customers FOR ALL 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Only staff can access booking data  
CREATE POLICY "bookings_staff_all" 
ON bookings FOR ALL 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
```

### 3. Role-Based Permission Matrix

```python
PERMISSION_MATRIX = {
    "admin": {
        "all": ["all"]  # Admin has all permissions
    },
    "manager": {
        "bookings": ["create", "read", "update", "delete", "check_in", "check_out"],
        "customers": ["create", "read", "update", "delete"],
        "rooms": ["create", "read", "update", "delete"],
        "billing": ["create", "read", "update", "delete"],
        "reports": ["read"]
    },
    "receptionist": {
        "bookings": ["create", "read", "update", "check_in", "check_out"],
        "customers": ["create", "read", "update"],
        "rooms": ["read", "update"],
        "billing": ["read", "create"]
    },
    "accountant": {
        "billing": ["create", "read", "update", "delete"],
        "bookings": ["read"],
        "customers": ["read"],
        "reports": ["read"]
    }
}
```

## Implementation Steps

### Step 1: Apply Database Migration
```bash
# Apply the new RLS policies
psql -f backend/migrations/008_fix_rls_policies.sql
```

### Step 2: Update Backend Authentication
- Replace `app/api/deps.py` with `app/api/deps_new.py` 
- Update all endpoint imports to use new auth dependencies
- Test all endpoints with new permission system

### Step 3: Testing & Validation
```bash
# Run RLS tests
python3 backend/test_rls_policies.py

# Test specific scenarios
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/bookings/
```

### Step 4: Monitor & Debug
- Check for any recursion errors in logs
- Verify permission denials work correctly
- Ensure public endpoints remain accessible

## Database Schema Changes

### New Helper Functions
- `public.get_user_role()` - Get current user's role safely
- `public.is_admin()` - Check if user is admin
- `public.is_staff()` - Check if user is staff member
- `public.has_any_role(text[])` - Check if user has any of specified roles

### Updated Policies
All tables now have proper RLS policies that:
- Use SECURITY DEFINER functions instead of direct table joins
- Implement least-privilege access (public read only where needed)
- Separate SELECT and INSERT/UPDATE/DELETE permissions appropriately
- Avoid circular dependencies

## Benefits of New Architecture

### 1. Security Improvements
- ✅ No infinite recursion issues  
- ✅ Proper role-based access control
- ✅ Least-privilege principle enforced
- ✅ Clear permission boundaries

### 2. Performance Benefits
- ✅ SECURITY DEFINER functions are cached
- ✅ No complex table joins in policies
- ✅ Faster policy evaluation

### 3. Maintainability
- ✅ Clear separation of concerns
- ✅ Centralized role checking logic
- ✅ Easy to add new roles/permissions
- ✅ Self-documenting policies

## Migration Strategy

### Phase 1: Development Testing
1. Apply migration to development database
2. Run comprehensive test suite
3. Verify all endpoints work correctly
4. Test edge cases and error scenarios

### Phase 2: Gradual Backend Update  
1. Create new auth dependencies alongside old ones
2. Update endpoints one module at a time
3. Test each module thoroughly before proceeding
4. Remove old dependencies once all updated

### Phase 3: Production Deployment
1. Apply database migration during maintenance window
2. Deploy backend changes
3. Monitor for any issues
4. Rollback plan ready if needed

## Rollback Plan

If issues occur:
```sql
-- Emergency rollback: restore original policies
DROP POLICY IF EXISTS "user_profiles_admin_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_self_select" ON user_profiles;
-- ... restore original policies from backup
```

## Testing Checklist

- [ ] Public endpoints work without authentication
- [ ] Admin users can access all resources
- [ ] Staff users can access appropriate resources
- [ ] Users can view/edit only their own profiles
- [ ] Permission denials return proper error codes
- [ ] No infinite recursion errors in logs
- [ ] JWT token validation works correctly
- [ ] All existing API tests pass

## Monitoring & Debugging

### Key Log Messages to Monitor
```
ERROR: infinite recursion detected in policy
WARN: Permission denied for role X on module Y
INFO: RLS context set for user [uuid] with role [role]
```

### Debug Queries
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE schemaname='public';

-- Test helper functions
SELECT public.get_user_role();
SELECT public.is_admin();
SELECT public.is_staff();

-- Simulate user context
SELECT set_config('request.jwt.claims', '{"sub":"user-uuid","role":"authenticated"}', true);
```

This architecture provides a robust, secure, and maintainable foundation for the Room Booking System's authorization layer.