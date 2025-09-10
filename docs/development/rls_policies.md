Great idea 👍 — you can give your team a policies.md that documents how to design and use RLS policies in Supabase. Below is a full draft you can drop into your repo:

⸻

Database Row-Level Security (RLS) Policies

This document defines our standards and best practices for implementing Row-Level Security (RLS) in our Supabase (Postgres) database. All developers must follow these guidelines when creating or modifying RLS policies.

⸻

1. General Principles
	•	Enable RLS on all tables containing user or tenant data.
	•	Policies must be self-contained: base conditions only on the table itself (auth.uid(), project_id, org_id, etc.).
	•	Avoid direct JOINs in policies to prevent infinite recursion. Use helper functions with SECURITY DEFINER when cross-table checks are required.
	•	Always define both:
	•	USING → rows a user can SELECT/DELETE.
	•	WITH CHECK → rows a user can INSERT/UPDATE.
	•	Keep USING = WITH CHECK whenever possible to avoid situations where rows can be written but not read.
	•	Restrict access roles:
	•	Use TO authenticated for logged-in users.
	•	Use TO public only for data that is intentionally visible to everyone.
	•	Never rely only on application-side checks. All data restrictions must exist in database policies.

⸻

2. Policy Patterns

2.1 Per-User Access

Users can only access rows tied to their own user_id.

CREATE POLICY user_profiles_select
ON public.user_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY user_profiles_update
ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


⸻

2.2 Multi-Tenant (Organization Scoped)

All rows must match the user’s organization ID stored in JWT claims.

CREATE POLICY org_read
ON public.any_table
FOR SELECT TO authenticated
USING (org_id = (auth.jwt()->>'org_id')::uuid);

CREATE POLICY org_write
ON public.any_table
FOR INSERT, UPDATE TO authenticated
USING (org_id = (auth.jwt()->>'org_id')::uuid)
WITH CHECK (org_id = (auth.jwt()->>'org_id')::uuid);


⸻

2.3 Role-Based Access

Roles are stored in user_roles / roles. Instead of JOINs inside policies, we use a helper function.

-- Function to check if current user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(role_codes text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.role_code = ANY(role_codes)
  );
$$;

REVOKE ALL ON FUNCTION public.has_any_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated;

-- Example policy using the helper
CREATE POLICY folios_finance_access
ON public.folios
FOR ALL TO authenticated
USING ( public.has_any_role(ARRAY['SUPER_ADMIN','ACCOUNTANT','RECEPTIONIST','PROPERTY_MANAGER']) )
WITH CHECK ( public.has_any_role(ARRAY['SUPER_ADMIN','ACCOUNTANT','RECEPTIONIST','PROPERTY_MANAGER']) );


⸻

2.4 Project Membership Access

Used for tables linked to a project.

CREATE OR REPLACE FUNCTION public.can_access_project(p_project uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project
      AND ( p.owner_id = auth.uid()
         OR EXISTS (
              SELECT 1
              FROM public.project_members m
              WHERE m.project_id = p_project
              AND m.user_id = auth.uid()
         )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;

-- Example policy
CREATE POLICY folios_by_project
ON public.folios
FOR ALL TO authenticated
USING ( public.can_access_project(project_id) )
WITH CHECK ( public.can_access_project(project_id) );


⸻

2.5 Public Read / Restricted Write

Example for catalog or reference tables.

-- Everyone can read
CREATE POLICY room_types_read
ON public.room_types
FOR SELECT TO public
USING (is_active = true);

-- Only authenticated users can write
CREATE POLICY room_types_write
ON public.room_types
FOR INSERT, UPDATE, DELETE TO authenticated
USING (true)
WITH CHECK (true);


⸻

3. Testing & Debugging
	•	Enable JWT simulation in SQL editor:

SELECT set_config('request.jwt.claims',
  '{"sub":"<user-uuid>","role":"authenticated","org_id":"<org-uuid>"}', true);


	•	Check current policies:

SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;


	•	Debugging symptoms:
	•	Query returns no rows → USING blocked.
	•	Insert/Update silently rejected → WITH CHECK blocked.
	•	Infinite recursion errors → policies are JOINing into other tables with RLS. Refactor using helper functions.

⸻

4. Do’s and Don’ts

✅ Do:
	•	Keep policies simple and self-contained.
	•	Use SECURITY DEFINER functions to encapsulate complex checks.
	•	Ensure consistency between USING and WITH CHECK.
	•	Add explicit comments to policies explaining who and why.

❌ Don’t:
	•	Don’t JOIN multiple RLS-protected tables inside a policy.
	•	Don’t grant broad access with TO public unless intentional.
	•	Don’t bypass RLS with service_role from the client (only backend services).

⸻

5. Migration Workflow
	1.	Write new helper functions if needed.
	2.	Create new policies under different names.
	3.	Test with JWT simulation or API calls.
	4.	Drop old policies once validated.
	5.	Commit migration scripts to Git repo.

⸻

6. Summary
	•	RLS is our primary security boundary in Supabase.
	•	All developers must apply the above patterns.
	•	When in doubt:
	•	Prefer helper functions over inline JOINs.
	•	Prefer authenticated role over public.
	•	Keep policy logic as close to the row as possible.

