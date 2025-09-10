Here’s a concise, copy-ready requirements brief for your devs to implement the Backend-Only Gateway approach (use service_key on BE, keep FE away from data), while maintaining strong security.

⸻

Backend-Only Data Access (Service Key) — Technical Requirements

0) Scope & Goal
	•	Scope: All data access (PostgREST/SQL/Storage) is performed only by the Backend using service_key. Frontend uses Supabase Auth only.
	•	Goal: Prevent any direct client access to data; enforce all authorization and tenancy rules in Backend.

⸻

1) Architecture Constraints (Must)
	1.	No direct FE → Supabase Data
	•	Frontend must not call /rest/v1, Realtime, RPC, or Storage directly.
	•	Frontend may use Supabase Auth only (sign in/out, session refresh).
	2.	Single gateway
	•	All data operations go through our Backend API. No pass-through/proxy endpoints to PostgREST.
	3.	RLS posture
	•	Keep RLS enabled at DB level, but do not create policies for anon / authenticated that allow data. (Defense in depth if someone leaks an anon key.)
	•	Backend will use service_role and therefore bypass RLS; Backend must enforce authorization.

⸻

2) Secrets & Configuration (Must)
	•	Store secrets in server-side secure config (env/secret manager):
	•	SUPABASE_URL
	•	SUPABASE_SERVICE_KEY (rotate regularly; never log)
	•	JWT_ISS, JWT_AUD, JWT_JWKS_URL
	•	Environments separated: dev / staging / prod.
	•	Never expose service_key to client; do not send in responses or logs.

⸻

3) Authentication (Must)
	•	Backend verifies the client’s Supabase access_token on every request:
	•	Use JWKS; validate iss, aud, alg, exp, nbf, iat with leeway ≈ 120s.
	•	On verification failure → 401 Unauthorized.
	•	Extract and attach request context:
	•	user_id = sub, email, tenant_id, roles (if present).
	•	Put into request.state.ctx (or equivalent).

⸻

4) Authorization (Must)
	•	Implement a permission gate at the API layer:
	•	require_permission(resource, action) (e.g., customers.view, bookings.edit).
	•	Super-admin bypass allowed only if explicitly flagged (is_super_admin in our profiles table).
	•	Tenancy/ownership enforcement:
	•	Never trust tenant_id from request body/query.
	•	All DAL queries must apply WHERE tenant_id = :ctx.tenant_id (and ownership checks where applicable).
	•	Return 403 Forbidden when permission/tenancy checks fail.

⸻

5) Data Access Layer (Must)
	•	Create a whitelisted DAL (no arbitrary SQL from FE).
	•	Parameter binding only; no string concatenation.
	•	Every DAL function accepts ctx and injects tenant filters automatically:

-- Example pattern in SQL:
... WHERE tenant_id = :tenant_id


	•	CRUD functions follow this pattern; no route should bypass the DAL.

⸻

6) Network Controls (Strongly recommended)
	•	ensure roles anon/authenticated have no grants on tables/ RPCs.

⸻

7) Storage Access (Must)
	•	Disable public Storage access for sensitive buckets.
	•	Generate short-lived signed URLs by Backend when FE needs to view/download.
	•	Uploads: Backend issues a short upload token or handles upload server-side.

⸻

8) Logging, Rate-limiting, Audit (Must)
	•	Add middleware:
	•	Generate request_id; return X-Request-ID header.
	•	Log: request_id, user_id, tenant_id, route, method, decision (allow/deny), affected rows (if applicable).
	•	Apply rate-limit to sensitive routes (auth, export, bulk update).
	•	Maintain an audit table for admin/destructive actions.

⸻

9) Error Handling & Responses (Must)
	•	Standardize errors: 401 (auth failure), 403 (permission/tenant), 422 (validation), 429 (rate limit).
	•	Do not leak secrets or internal SQL in error bodies.

⸻

10) Minimal API Contract (Example)
	•	GET /api/customers?search=… → requires customers.view; returns only tenant-scoped rows.
	•	POST /api/customers → requires customers.create; server sets tenant_id = ctx.tenant_id.
	•	PATCH /api/customers/:id → requires customers.edit; verify row’s tenant_id before update.
	•	DELETE /api/customers/:id → requires customers.delete; verify tenant_id.

⸻

11) Testing (Must)
	•	Auth tests: valid token / wrong signature / wrong iss / wrong aud / expired / nbf.
	•	Permission tests: user lacking X.action → 403.
	•	Tenancy tests: user A cannot read/write tenant B rows; attempts must return 403.
	•	No direct data access: confirm FE build has no code calling /rest/v1 or Storage directly.
	•	E2E smoke: create-read-update-delete flows under one tenant; confirm constraints enforced.

⸻

12) Rollout Plan (Recommended)
	1.	Remove/disable any FE calls to Supabase data APIs (search & delete).
	2.	Confirm DB policies: RLS enabled; no policies that give anon/authenticated access.
	3.	Ship Backend DAL for top 3 resources (e.g., customers, bookings, orders) with tenant filters.
	4.	Add permission map and protect routes with require_permission.
	5.	Enable logs, audit, and rate-limit.
	6.	Run tests; rotate service_key on prod after deploy.

⸻

13) Do / Don’t
	•	Do
	•	Verify JWT strictly (JWKS + claims).
	•	Force tenant filters in every query.
	•	Keep service_key server-side only; rotate keys.
	•	Don’t
	•	Don’t proxy PostgREST/SQL from FE.
	•	Don’t accept tenant_id from client input to scope data.
	•	Don’t log tokens or service keys.

⸻

14) Reference Snippets (Minimal)

JWT verify (Python / PyJWT)

payload = jwt.decode(
    token,
    signing_key.key,                 # from PyJWKClient(JWKS_URL)
    algorithms=["RS256"],
    audience=settings.JWT_AUD,
    issuer=settings.JWT_ISS,
    options={
        "require": ["exp","iat","nbf"],
        "verify_exp": True,
        "verify_iss": True,
        "verify_aud": True,
        "verify_nbf": True,
    },
    leeway=120,
)

Permission gate & DAL usage (pseudo)

@router.get("/customers")
async def list_customers(q: str|None = None, ctx=Depends(require_permission("customers","view"))):
    return dal.customers.list(ctx, q=q)

# DAL pattern
def list(ctx, q=None, page=1, size=20):
    sql = """
      select id, name, email from customers
      where tenant_id = :tenant_id
        and (:q is null or name ilike '%'||:q||'%')
      order by created_at desc
      limit :limit offset :offset
    """
    return db.fetch_all(sql, {
        "tenant_id": ctx["tenant_id"], "q": q,
        "limit": size, "offset": (page-1)*size
    })


⸻

Acceptance Criteria
	•	No FE calls to Supabase data endpoints (verified via code search and runtime checks).
	•	Backend rejects invalid tokens and enforces permission/tenant checks.
	•	All DAL queries include tenant scoping; no string-built SQL.
	•	Sensitive routes have rate-limit and audit entries.
	•	RLS enabled with no permissive policies for anon/authenticated.
	•	Storage access gated by Backend (signed URLs only).
	•	Test suite passes: auth, permission, tenancy, and E2E CRUD.

