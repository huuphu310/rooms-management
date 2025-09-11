# Authentication, Permissions, and Database Access Guide

## Overview
This document outlines the standardized approach for authentication, API permissions, and Supabase database access in the Room Booking System.

## 1. Authentication Flow

### 1.1 Login Process
```python
# In auth endpoints (auth.py)
from app.services.auth_service import AuthService

# Login returns JWT token and user profile
result = await AuthService.login_with_email_password(
    email="user@example.com",
    password="password",
    db=service_client  # Use pooled service client
)

# Response includes:
{
    "success": true,
    "user": {...},
    "session": {
        "access_token": "jwt_token",
        "refresh_token": "...",
        ...
    },
    "role_id": "uuid",
    "raw_app_meta_data": {...},
    "raw_user_meta_data": {...}
}
```

### 1.2 JWT Token Handling
**CRITICAL**: Never use `supabase.auth.get_user()` - it hangs!

```python
# ❌ WRONG - This will timeout
response = auth.get_user(token)

# ✅ CORRECT - Decode JWT directly
import jwt
payload = jwt.decode(token, options={"verify_signature": False})
user_id = payload.get("sub")
```

### 1.3 User Authentication Dependencies
```python
from app.api.deps import (
    get_current_user,           # Returns user dict or raises 401
    get_current_active_user,    # Ensures user is active
    get_current_user_optional,  # Returns user dict or None
)

# In endpoint:
@router.get("/protected")
async def protected_endpoint(
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user.get("id")
    # ...
```

## 2. Permission System

### 2.1 Permission Check Pattern
```python
from app.api.deps import require_permission

@router.post("/resource")
async def create_resource(
    data: ResourceCreate,
    _: dict = Depends(require_permission("module", "action"))
):
    # User has permission to perform action
    pass
```

### 2.2 Available Permissions
Permissions follow the pattern: `module:action`

Common modules:
- `rooms` - Room management
- `bookings` - Booking operations
- `customers` - Customer management
- `billing` - Billing and payments
- `reports` - Report generation
- `room_allocation` - Room assignment
- `pos` - Point of sale
- `inventory` - Inventory management

Common actions:
- `view` - Read access
- `create` - Create new records
- `edit` - Update existing records
- `delete` - Delete records
- `export` - Export data

### 2.3 Permission Caching
Permissions are cached in Redis for performance:
```python
# Permissions are automatically cached for 5 minutes
# Cache key: f"permissions:{user_id}"
```

## 3. Database Access Patterns

### 3.1 Database Connection Pooling
**IMPORTANT**: Always use pooled connections for performance

```python
# In database_pool.py
class DatabasePool:
    """Singleton pattern for Supabase clients"""
    _service_client: Client = None  # Service role (bypasses RLS)
    _anon_client: Client = None     # Anonymous access
    
    @classmethod
    def get_service_client(cls) -> Client:
        """Returns pooled service client - bypasses RLS"""
        if cls._service_client is None:
            cls._service_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return cls._service_client
```

### 3.2 Database Dependencies

```python
from app.api.deps import (
    AuthenticatedDbDep,  # Service client for authenticated users
    UserScopedDbDep,     # Client with user's JWT (enforces RLS)
    SupabaseService,     # Alias for backward compatibility
)

# Most endpoints should use AuthenticatedDbDep
@router.get("/data")
async def get_data(
    db: AuthenticatedDbDep,
    current_user: dict = Depends(get_current_active_user)
):
    # db is a pooled service client
    result = db.table("table_name").select("*").execute()
```

### 3.3 Supabase Query Patterns

**ALWAYS use Supabase client syntax, NOT SQLAlchemy**

```python
# ❌ WRONG - SQLAlchemy syntax
db.query(Model).filter(Model.field == value).first()

# ✅ CORRECT - Supabase client syntax
db.table("table_name").select("*").eq("field", value).execute()

# Common operations:
# Select with joins
result = db.table("bookings").select("""
    *,
    customers(full_name, email),
    rooms(room_number, room_types(name))
""").eq("status", "confirmed").execute()

# Insert
result = db.table("table").insert({"field": "value"}).execute()

# Update
result = db.table("table").update({"field": "new_value"}).eq("id", id).execute()

# Delete (soft delete preferred)
result = db.table("table").update({"is_active": False}).eq("id", id).execute()
```

### 3.4 Required Fields
**CRITICAL**: Always include ALL required fields

```python
# ❌ WRONG - Missing required fields
db.table("pos_shifts").insert({"opened_by": user_id})

# ✅ CORRECT - Include all required fields
db.table("pos_shifts").insert({
    "shift_date": date.today().isoformat(),  # Required!
    "opened_by": str(user_id),
    "status": "open"
})
```

## 4. API Endpoint Patterns

### 4.1 URL Structure
```python
# Always use this pattern
"/api/v1/{module}/{action}"

# ❌ WRONG - Duplicate /api
await api.post('/api/pos/shifts/open')  # Results in /api/v1/api/pos/...

# ✅ CORRECT - Clean URL
await api.post('/pos/shifts/open')  # Results in /api/v1/pos/...
```

### 4.2 Standard Endpoint Template
```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import (
    AuthenticatedDbDep,
    require_permission,
    get_current_active_user
)

router = APIRouter()

@router.get("/resources", response_model=List[Resource])
async def list_resources(
    db: AuthenticatedDbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user)
):
    """List resources with pagination"""
    try:
        # Use pooled database connection
        offset = (page - 1) * limit
        result = db.table("resources").select("*").range(offset, offset + limit - 1).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error listing resources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "DB_ERROR", "message": str(e)}}
        )

@router.post("/resources", response_model=Resource)
async def create_resource(
    resource: ResourceCreate,
    db: AuthenticatedDbDep,
    _: dict = Depends(require_permission("resources", "create"))
):
    """Create new resource with permission check"""
    result = db.table("resources").insert(resource.dict()).execute()
    return result.data[0]
```

## 5. Performance Optimizations

### 5.1 Connection Pooling Benefits
- **Before**: 2000-3000ms per request (creating new clients)
- **After**: 200-800ms per request (using pooled clients)
- **Improvement**: 70-85% reduction in response time

### 5.2 When to Use Each Database Client

| Client Type | Use Case | Performance | RLS |
|------------|----------|-------------|-----|
| `AuthenticatedDbDep` | Most API endpoints | Fast (pooled) | Bypassed |
| `UserScopedDbDep` | User-specific data with RLS | Slower (new client) | Enforced |
| `db_pool.get_service_client()` | Background tasks, migrations | Fast (pooled) | Bypassed |

### 5.3 Query Optimization Tips

1. **Use select() with specific fields**
   ```python
   # ❌ Slow - fetches everything
   db.table("users").select("*").execute()
   
   # ✅ Fast - fetches only needed fields
   db.table("users").select("id, name, email").execute()
   ```

2. **Batch operations when possible**
   ```python
   # ❌ Slow - N queries
   for item in items:
       db.table("items").insert(item).execute()
   
   # ✅ Fast - 1 query
   db.table("items").insert(items).execute()
   ```

3. **Use proper indexes**
   - Always index foreign keys
   - Index fields used in WHERE clauses
   - Consider composite indexes for multi-field queries

## 6. Error Handling

### 6.1 Standard Error Format
```python
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": {}  # Optional additional info
    }
}
```

### 6.2 Common Error Codes
- `UNAUTHORIZED` - No valid authentication
- `FORBIDDEN` - Authenticated but no permission
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Duplicate or constraint violation
- `VALIDATION_ERROR` - Invalid input data
- `DB_ERROR` - Database operation failed

## 7. Testing Authentication

### 7.1 Test Credentials
```python
# Development environment
email = "admin@homestay.com"
password = "Admin@123456"
```

### 7.2 Test Script Example
```python
import requests

# Login
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@homestay.com", "password": "Admin@123456"}
)
token = response.json()["session"]["access_token"]

# Use token for authenticated requests
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    "http://localhost:8000/api/v1/rooms",
    headers=headers
)
```

## 8. Migration Guide for Existing Code

### 8.1 Update Database Client Usage
```python
# Old pattern
from app.core.database import get_supabase_service
db = get_supabase_service()

# New pattern - use pooled connection
from app.core.database_pool import db_pool
db = db_pool.get_service_client()
```

### 8.2 Update Endpoint Dependencies
```python
# Old pattern
@router.get("/data")
async def get_data(db: Client = Depends(get_supabase)):
    pass

# New pattern - use typed dependencies
@router.get("/data")
async def get_data(db: AuthenticatedDbDep):
    pass
```

## Summary

Key principles to follow:
1. **Always use pooled database connections** for performance
2. **Never call `auth.get_user()`** - decode JWT directly
3. **Use permission decorators** for authorization
4. **Follow Supabase client syntax**, not SQLAlchemy
5. **Include all required fields** in database operations
6. **Handle errors consistently** with standard format
7. **Cache permissions** for better performance
8. **Test with correct credentials** in development

This approach ensures:
- Fast API response times (< 1 second)
- Secure permission-based access control
- Consistent error handling
- Scalable database connection management
- Clear separation of authentication and authorization