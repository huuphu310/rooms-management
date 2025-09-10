
🔒 Technical Requirements & Recommendations for Authentication Tables

1. Scope

This document defines the security requirements for the following tables in Supabase:
	•	public.user_profiles
	•	public.user_roles
	•	public.roles

The objective is to enable Row Level Security (RLS), protect sensitive fields, and ensure safe access patterns while keeping the application functional.

⸻

2. General Principles
	1.	RLS must be enabled on all three tables.
	2.	Base tables are protected: direct SELECT * queries must be avoided.
	3.	Dedicated views should expose only the fields intended for broader use.
	4.	Service key remains the only mechanism to bypass RLS (used in backend only).
	5.	JWT claim standardization: adopt role: "admin" as the canonical way to identify admin users.

⸻

3. User Profiles (public.user_profiles)

3.1 Public View

A dedicated view (v_user_public_profiles) will expose only non-sensitive fields for authenticated users:
	•	id
	•	username
	•	display_name
	•	avatar_url
	•	full_name

Explicitly excluded:
	•	email, phone
	•	employee_id
	•	mfa_secret, mfa_backup_codes
	•	date_of_birth, gender
	•	last_login_at, last_login_ip
	•	locked_until, login_attempts
	•	position, department, hire_date (confirmed not public)

3.2 Access Rules
	•	Self-access: A user can view and update their own profile.
	•	Admin-access: Admins can read and modify all profiles.
	•	Authenticated users: Can only read the public view.

⸻

4. User Roles (public.user_roles)

4.1 Access Rules
	•	Self-access: A user can read their own role assignments.
	•	Admin-access: Admins can create, update, and delete role assignments for any user.
	•	No direct write access for normal authenticated users.

⸻

5. Roles (public.roles)

5.1 Access Rules
	•	Admin-only: Both read and write operations are restricted to admin users.
	•	Authenticated users: Do not have read access to role definitions.
	•	Service key: Can always access for backend functionality.

⸻

6. Authorization Flow
	•	JWT Claim: Standardize on role: "admin" for admin identification.
	•	Backend Service:
	•	Role assignment and management continue to use the service key.
	•	This ensures auditability and prevents client-side privilege escalation.

⸻

7. Development Requirements
	1.	Remove all SELECT * queries from the codebase. Explicitly select required fields.
	2.	Update frontend queries:
	•	Use v_user_public_profiles instead of querying user_profiles directly.
	•	Fetch only public fields listed above.
	3.	Restrict sensitive queries:
	•	Any need for email/phone or sensitive fields must go through backend endpoints with service key or admin privileges.
	4.	Implement policy testing:
	•	Simulate queries under roles: anon, authenticated, admin.
	•	Ensure expected allow/deny behavior.
	5.	Migration process:
	•	Enable RLS.
	•	Apply policies.
	•	Deploy the new view.
	•	Roll out code changes to switch queries from base tables to the view.

⸻

8. Testing Checklist
	•	Regular user: Can read/update their own profile, cannot see others.
	•	Regular user: Can read the public profile view.
	•	Admin: Can read/update all profiles and manage roles.
	•	Authenticated user: Cannot access the roles table.
	•	Anon user: No access to any of these resources.

⸻

9. Final Notes
	•	Keep sensitive profile fields strictly private.
	•	Ensure role-based logic is centralized at the database layer (RLS + policies).
	•	Maintain backend-only writes for roles and user_roles.
	•	Document and enforce query conventions (no SELECT *).

⸻

✅ With these requirements, the system will:
	•	Comply with Supabase best practices.
	•	Eliminate current Security Advisor warnings.
	•	Protect sensitive data without breaking business functionality.

⸻
