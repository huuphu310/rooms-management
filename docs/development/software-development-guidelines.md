# Software Development Guidelines

## Purpose

These guidelines are established based on real-world errors encountered during development and project-specific conventions defined in CLAUDE.md to prevent similar issues and maintain high code quality standards.

## Table of Contents

1. [Project-Specific Conventions (CLAUDE.md)](#project-specific-conventions-claudemd)
2. [Authentication & Authorization Guidelines](#authentication--authorization-guidelines)
3. [Database Development Guidelines](#database-development-guidelines)
4. [API Development Guidelines](#api-development-guidelines)
5. [Frontend Development Guidelines](#frontend-development-guidelines)
6. [Error Handling Guidelines](#error-handling-guidelines)
7. [Testing Guidelines](#testing-guidelines)
8. [Code Review Checklist](#code-review-checklist)
9. [Performance Guidelines](#performance-guidelines)
10. [Security Guidelines](#security-guidelines)
11. [Documentation Standards](#documentation-standards)
12. [Development Tools & MCP Usage](#development-tools--mcp-usage)

---

## 1. Project-Specific Conventions (CLAUDE.md)

### Core Development Rules

#### 1.1 Documentation Workflow
```markdown
# IMPORTANT: Documentation must be maintained
1. BEFORE refactoring: Update existing docs in ./docs directory
2. AFTER new features: Add new docs (avoid duplication)
3. Use appropriate tools:
   - context7 MCP: For plugin/package documentation
   - serena MCP: For semantic retrieval and editing
   - supabase MCP: For Supabase operations
```

#### 1.2 Code Quality Philosophy
- **Pragmatic Approach**: Don't be overly strict with linting
- **Readability First**: Prioritize clarity over rigid style rules
- **Developer Productivity**: Allow minor style variations that improve code clarity
- **Functional Focus**: Working code > Perfect formatting

#### 1.3 API Conventions (Mandatory)
```python
# URL Pattern
"/api/v1/{module}/{action}"  # Always follow this pattern

# ID Format
uuid.uuid4()  # All entities use UUID

# Query Parameters
"?page=1&limit=20"           # Pagination
"?sort_by=field&order=asc"   # Sorting
"?filter_field=value"        # Filtering

# Date Format
"2025-08-23"  # ISO 8601 (YYYY-MM-DD)

# Money Values
Decimal("100.00")  # Store as decimal, 2 decimal places
```

#### 1.4 Error Response Format (Mandatory)
```python
# All errors MUST follow this format
{
    "error": {
        "code": "ERROR_CODE",        # Uppercase with underscores
        "message": "Human readable",  # Clear, actionable message
        "details": {}                 # Optional additional info
    }
}
```

#### 1.5 Testing Requirements
- **Coverage Target**: Minimum 80%
- **Backend**: pytest
- **Frontend**: Jest/React Testing Library
- **Test Types Required**:
  - Unit tests for services
  - Integration tests for APIs
  - E2E tests for critical flows

#### 1.6 Security Requirements (Non-negotiable)
```python
# Rate Limiting
RATE_LIMIT = "100 requests/minute per IP"

# Authentication
"All endpoints require JWT except public ones"

# Data Protection
- Parameterized queries (NO string concatenation)
- Input validation and sanitization
- Encrypted sensitive data storage
- Audit logging for all modifications
- OWASP best practices
```

#### 1.7 Performance Requirements
```python
# Caching Strategy (Redis)
CACHE_TARGETS = [
    "room_availability",     # Complex queries
    "rate_calculations",     # Expensive computations
    "reference_data"         # Frequently accessed
]

# Database Optimization
- Index frequently queried fields
- Pagination for all list endpoints
- Use TanStack Query for frontend caching
- Lazy load images from Cloudflare R2
```

---

## 2. Authentication & Authorization Guidelines

### Lessons Learned
- **Issue**: Supabase auth hanging causing timeouts
- **Issue**: Missing user profiles causing authentication failures

### Best Practices

#### 1.1 Always Implement Timeout Handling
```python
# ❌ BAD: No timeout handling
response = auth.get_user(token)

# ✅ GOOD: Timeout with fallback
try:
    response = await asyncio.wait_for(
        auth.get_user(token),
        timeout=5.0
    )
except asyncio.TimeoutError:
    # Fallback to JWT decode
    payload = jwt.decode(token, options={"verify_signature": False})
```

#### 1.2 User Profile Verification
```python
# Always verify user profile exists
def get_current_user(token: str):
    # 1. Decode token
    user_data = decode_token(token)
    
    # 2. Check profile exists
    profile = db.table("user_profiles").select("*").eq("id", user_data["id"]).execute()
    
    # 3. Handle missing profile gracefully
    if not profile.data:
        # Create default profile or return specific error
        return create_default_profile(user_data)
    
    return profile.data[0]
```

#### 1.3 Permission Checks
```python
# ❌ BAD: Hardcoded permission strings
@require_permission("admin.users.create")

# ✅ GOOD: Consistent permission format
@require_permission("users", "create")  # module, action
```

#### 1.4 Role Mapping
```python
# Maintain a centralized role mapping
ROLE_MAPPINGS = {
    'SUPER_ADMIN': 'admin',
    'PROPERTY_MANAGER': 'manager',
    'RECEPTIONIST': 'receptionist',
    'FRONT_DESK_SUPERVISOR': 'receptionist',
    'CASHIER': 'pos_operator',
    'ACCOUNTANT': 'accountant',
    'HOUSEKEEPER': 'housekeeper'
}

# Use consistent role checking
def map_user_role(role_code: str) -> str:
    return ROLE_MAPPINGS.get(role_code, 'receptionist')  # Default role
```

---

## 2. Database Development Guidelines

### Lessons Learned
- **Issue**: Column name mismatches (transaction_code vs transaction_number)
- **Issue**: Missing required fields causing constraint violations
- **Issue**: Incorrect table relationships in queries

### Best Practices

#### 2.1 Schema Verification
```python
# Always verify schema before operations
async def verify_schema():
    """Run on application startup"""
    required_columns = {
        "bookings": ["id", "booking_code", "customer_id", "room_id"],
        "pos_shifts": ["id", "shift_code", "shift_date", "opened_by"],
        "pos_transactions": ["id", "transaction_number", "transaction_date"]
    }
    
    for table, columns in required_columns.items():
        result = db.table(table).select("*").limit(1).execute()
        if result.data:
            actual_columns = list(result.data[0].keys())
            missing = set(columns) - set(actual_columns)
            if missing:
                logger.error(f"Missing columns in {table}: {missing}")
```

#### 2.2 Database Operations
```python
# ❌ BAD: SQLAlchemy syntax with Supabase
shift = db.query(POSShift).filter(POSShift.opened_by == user_id).first()

# ✅ GOOD: Proper Supabase client syntax
result = db.table("pos_shifts") \
    .select("*") \
    .eq("opened_by", str(user_id)) \
    .eq("status", "open") \
    .order("opened_at", desc=True) \
    .limit(1) \
    .execute()

shift = result.data[0] if result.data else None
```

#### 2.3 Required Fields
```python
# Always include all required fields
def create_shift(user_id: UUID):
    shift_data = {
        "shift_code": generate_shift_code(),
        "shift_date": date.today().isoformat(),  # Don't forget date fields!
        "opened_by": str(user_id),
        "opened_at": datetime.utcnow().isoformat(),
        "status": "open",
        # Include all non-nullable fields
    }
    return db.table("pos_shifts").insert(shift_data).execute()
```

#### 2.4 Relationship Queries
```python
# ❌ BAD: Incorrect relationship
db.table("bookings").select("*, room_types(name)")  # Wrong if no direct relationship

# ✅ GOOD: Correct relationship path
db.table("bookings").select("""
    *,
    customers(full_name),
    rooms(room_number, room_types(name))
""")  # Follow actual foreign key relationships
```

---

## 3. API Development Guidelines

### Lessons Learned
- **Issue**: Duplicate API prefixes in URLs
- **Issue**: Missing CORS headers
- **Issue**: 404 errors from incorrect routing

### Best Practices

#### 3.1 URL Construction
```javascript
// ❌ BAD: Hardcoded duplicate prefixes
const response = await api.post('/api/pos/shifts/open');
// Results in: /api/v1/api/pos/shifts/open

// ✅ GOOD: Clean URL construction
const response = await api.post('/pos/shifts/open');
// Results in: /api/v1/pos/shifts/open
```

#### 3.2 API Client Configuration
```javascript
// Centralized API client
class APIClient {
    constructor() {
        this.baseURL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    // Ensure no double slashes or prefixes
    request(method, endpoint, data) {
        // Clean the endpoint
        endpoint = endpoint.replace(/^\/+/, '');  // Remove leading slashes
        endpoint = endpoint.replace(/^api\//, ''); // Remove 'api/' prefix
        
        return this.client[method](endpoint, data);
    }
}
```

#### 3.3 CORS Configuration
```python
# Backend CORS setup
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
```

#### 3.4 Route Registration
```python
# ✅ GOOD: Clear route registration
from fastapi import APIRouter

router = APIRouter(prefix="/pos", tags=["POS"])

# Don't add /api prefix here - it's added at app level
app.include_router(router, prefix="/api/v1")
```

---

## 4. Frontend Development Guidelines

### Lessons Learned
- **Issue**: TypeScript import errors with enums vs types
- **Issue**: Runtime errors from missing enum values

### Best Practices

#### 4.1 TypeScript Imports
```typescript
// ❌ BAD: Mixing runtime and type imports
import type { CustomerType, PaymentMethod, Transaction } from '@/types/pos';

// ✅ GOOD: Separate runtime enums from type-only imports
import { CustomerType, PaymentMethod } from '@/types/pos';  // Runtime values
import type { Transaction, Shift, POSCategory } from '@/types/pos';  // Types only
```

#### 4.2 Enum Exports
```typescript
// types/pos.ts
// Export enums as const for runtime use
export const CustomerType = {
    WALK_IN: 'walk_in',
    GUEST: 'guest',
    STAFF: 'staff',
    EXTERNAL: 'external'
} as const;

export type CustomerType = typeof CustomerType[keyof typeof CustomerType];

// Export interfaces as type-only
export interface Transaction {
    id: string;
    customer_type: CustomerType;
    // ...
}
```

#### 4.3 Component Error Boundaries
```typescript
// Always wrap components that might fail
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}) {
    return (
        <div className="error-boundary">
            <h2>Something went wrong:</h2>
            <pre>{error.message}</pre>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <POSTerminal />
        </ErrorBoundary>
    );
}
```

---

## 5. Error Handling Guidelines

### Best Practices

#### 5.1 Consistent Error Response Format
```python
# Backend error handling
class APIException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

#### 5.2 Frontend Error Handling
```typescript
// Centralized error handling
class ErrorHandler {
    static handle(error: any): string {
        // API errors
        if (error.response?.data?.error) {
            return error.response.data.error.message;
        }
        
        // Network errors
        if (error.code === 'ECONNABORTED') {
            return 'Request timeout - please try again';
        }
        
        // Default
        return 'An unexpected error occurred';
    }
}

// Usage in components
try {
    const data = await api.createBooking(bookingData);
} catch (error) {
    const message = ErrorHandler.handle(error);
    showNotification({ type: 'error', message });
}
```

---

## 6. Testing Guidelines

### Best Practices

#### 6.1 Test Database Operations
```python
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock_db = Mock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = []
    return mock_db

def test_get_user_profile(mock_supabase):
    # Test with existing profile
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "123", "username": "testuser"}
    ]
    
    profile = get_user_profile("123", mock_supabase)
    assert profile["username"] == "testuser"
    
    # Test with missing profile
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    profile = get_user_profile("456", mock_supabase)
    assert profile is None
```

#### 6.2 Test API Endpoints
```python
from fastapi.testclient import TestClient

def test_endpoint_permissions():
    client = TestClient(app)
    
    # Test without auth
    response = client.get("/api/v1/room-allocation/available-rooms")
    assert response.status_code == 401
    
    # Test with auth
    headers = {"Authorization": "Bearer valid_token"}
    response = client.get("/api/v1/room-allocation/available-rooms", headers=headers)
    assert response.status_code == 200
```

#### 6.3 Frontend Component Testing
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { POSTerminal } from './POSTerminal';

describe('POSTerminal', () => {
    it('should import CustomerType enum correctly', () => {
        expect(CustomerType.WALK_IN).toBe('walk_in');
    });
    
    it('should render without crashing', () => {
        render(<POSTerminal />);
        expect(screen.getByText(/POS Terminal/i)).toBeInTheDocument();
    });
});
```

---

## 7. Code Review Checklist

### Before Submitting PR

#### Backend Checklist
- [ ] All database operations use correct Supabase syntax
- [ ] Required fields are included in all insert/update operations
- [ ] Error handling returns consistent format
- [ ] Authentication/authorization properly implemented
- [ ] No hardcoded credentials or secrets
- [ ] API endpoints follow RESTful conventions
- [ ] Database migrations included if schema changed
- [ ] Unit tests cover new functionality
- [ ] Performance impact considered (N+1 queries avoided)

#### Frontend Checklist
- [ ] TypeScript types properly defined
- [ ] Runtime enums separated from type-only imports
- [ ] Error boundaries implemented for risky components
- [ ] API calls use centralized client
- [ ] Loading and error states handled
- [ ] Responsive design implemented
- [ ] Accessibility requirements met
- [ ] Component tests written
- [ ] No console.log statements in production code

#### General Checklist
- [ ] Code follows project style guide
- [ ] Documentation updated
- [ ] No commented-out code
- [ ] Meaningful commit messages
- [ ] PR description clearly explains changes
- [ ] Breaking changes documented
- [ ] Dependencies updated if needed
- [ ] Security implications considered

---

## 8. Performance Guidelines

### Best Practices

#### 8.1 Database Query Optimization
```python
# ❌ BAD: Multiple queries (N+1 problem)
bookings = db.table("bookings").select("*").execute()
for booking in bookings.data:
    customer = db.table("customers").select("*").eq("id", booking["customer_id"]).execute()

# ✅ GOOD: Single query with joins
bookings = db.table("bookings").select("""
    *,
    customers(*),
    rooms(*)
""").execute()
```

#### 8.2 Caching Strategy
```python
from functools import lru_cache
import redis

redis_client = redis.Redis()

def cached(expire_time=300):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Check cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            redis_client.setex(cache_key, expire_time, json.dumps(result))
            
            return result
        return wrapper
    return decorator

@cached(expire_time=600)
async def get_room_availability(date: str):
    # Expensive query cached for 10 minutes
    return db.table("rooms").select("*").execute()
```

#### 8.3 Frontend Optimization
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
    // Component logic
}, (prevProps, nextProps) => {
    return prevProps.data.id === nextProps.data.id;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
    return calculateExpensiveValue(data);
}, [data]);

// Use lazy loading for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

---

## 9. Security Guidelines

### Best Practices

#### 9.1 Input Validation
```python
from pydantic import BaseModel, validator

class BookingCreate(BaseModel):
    check_in_date: date
    check_out_date: date
    guest_count: int
    
    @validator('check_out_date')
    def validate_dates(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out must be after check-in')
        return v
    
    @validator('guest_count')
    def validate_guest_count(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Guest count must be between 1 and 10')
        return v
```

#### 9.2 SQL Injection Prevention
```python
# ❌ BAD: String concatenation
query = f"SELECT * FROM users WHERE email = '{email}'"

# ✅ GOOD: Parameterized queries
db.table("users").select("*").eq("email", email).execute()
```

#### 9.3 Authentication Tokens
```python
# Use short-lived access tokens
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Implement token refresh mechanism
async def refresh_access_token(refresh_token: str):
    payload = verify_refresh_token(refresh_token)
    new_access_token = create_access_token(payload["sub"])
    return {"access_token": new_access_token}
```

---

## 10. Documentation Standards

### Best Practices

#### 10.1 Code Documentation
```python
def calculate_room_rate(
    room_type_id: UUID,
    check_in: date,
    check_out: date,
    guest_count: int = 2
) -> Decimal:
    """
    Calculate total room rate for a booking period.
    
    Args:
        room_type_id: UUID of the room type
        check_in: Check-in date
        check_out: Check-out date
        guest_count: Number of guests (default: 2)
    
    Returns:
        Decimal: Total room rate for the period
    
    Raises:
        RoomTypeNotFound: If room type doesn't exist
        InvalidDateRange: If check-out is before check-in
    
    Example:
        >>> rate = calculate_room_rate(
        ...     room_type_id=UUID("123..."),
        ...     check_in=date(2025, 8, 25),
        ...     check_out=date(2025, 8, 27),
        ...     guest_count=2
        ... )
        >>> print(rate)
        Decimal('500.00')
    """
    # Implementation
```

#### 10.2 API Documentation
```python
@router.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new booking",
    description="Create a new room booking with customer and payment details",
    responses={
        201: {"description": "Booking created successfully"},
        400: {"description": "Invalid input data"},
        409: {"description": "Room not available for selected dates"}
    }
)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user)
) -> BookingResponse:
    """
    Create a new booking.
    
    - **customer_id**: UUID of the customer
    - **room_id**: UUID of the room to book
    - **check_in_date**: Check-in date (YYYY-MM-DD)
    - **check_out_date**: Check-out date (YYYY-MM-DD)
    """
    # Implementation
```

#### 10.3 README Templates
```markdown
# Module Name

## Overview
Brief description of what this module does.

## Installation
```bash
pip install -r requirements.txt
```

## Usage
```python
from module import ClassName

instance = ClassName()
result = instance.method()
```

## API Reference
Document all public methods and their parameters.

## Configuration
List all environment variables and configuration options.

## Testing
```bash
pytest tests/
```

## Common Issues
Document known issues and their solutions.
```

---

## Continuous Improvement

### Regular Reviews

1. **Weekly Code Reviews**
   - Review recent commits for guideline violations
   - Update guidelines based on new issues discovered

2. **Monthly Architecture Review**
   - Assess technical debt
   - Plan refactoring efforts
   - Update documentation

3. **Quarterly Security Audit**
   - Review security practices
   - Update dependencies
   - Penetration testing

### Metrics to Track

```python
# Code quality metrics
metrics = {
    "code_coverage": "Target: >80%",
    "technical_debt_ratio": "Target: <5%",
    "cyclomatic_complexity": "Target: <10",
    "duplicate_code": "Target: <3%",
    "security_vulnerabilities": "Target: 0 critical, <5 low",
    "api_response_time": "Target: <200ms p95",
    "error_rate": "Target: <1%",
    "deployment_frequency": "Target: Daily",
    "mean_time_to_recovery": "Target: <1 hour"
}
```

---

## 12. Development Tools & MCP Usage

### MCP (Model Context Protocol) Tools

#### 12.1 Context7 MCP
Use for documentation of external packages and plugins:
```bash
# When adding new packages
1. Use context7 to fetch latest documentation
2. Verify compatibility with project requirements
3. Document integration approach in ./docs
```

#### 12.2 Serena MCP
Use for semantic code retrieval and editing:
```bash
# For code navigation
- Semantic search across codebase
- Symbol-based editing
- Intelligent code refactoring
- Cross-reference analysis
```

#### 12.3 Supabase MCP
Use for all Supabase operations:
```bash
# Database operations
- Schema management
- Migration execution
- Data queries
- Performance monitoring
```

### Development Workflow

#### 12.4 Pre-Development Checklist
```markdown
- [ ] Read CLAUDE.md for project conventions
- [ ] Check ./docs for existing documentation
- [ ] Review recent error fixes in troubleshooting/
- [ ] Verify local environment setup
- [ ] Pull latest changes from main branch
```

#### 12.5 During Development
```markdown
- [ ] Follow API conventions (/api/v1/{module}/{action})
- [ ] Use UUID for all entity IDs
- [ ] Implement proper error handling format
- [ ] Add appropriate caching where needed
- [ ] Write tests alongside code
```

#### 12.6 Post-Development Checklist
```markdown
- [ ] Run linter (with pragmatic approach)
- [ ] Execute test suite (>80% coverage)
- [ ] Update documentation in ./docs
- [ ] Verify no hardcoded credentials
- [ ] Check for N+1 queries
- [ ] Test error scenarios
```

---

## Conclusion

These guidelines are living documents that should be updated as new issues are discovered and resolved. Following these practices will help prevent common errors and maintain high code quality standards.

### Key Takeaways from Errors & CLAUDE.md

1. **Always verify external service responses** and implement timeouts
2. **Use proper database client syntax** for your ORM/database (Supabase, not SQLAlchemy)
3. **Separate TypeScript runtime values from types** to avoid import errors
4. **Maintain consistent error handling** using the mandated format
5. **Follow API conventions strictly** (/api/v1/{module}/{action})
6. **Document before refactoring**, add docs after features
7. **Use MCP tools appropriately** (context7, serena, supabase)
8. **Test with minimum 80% coverage** using pytest/Jest
9. **Implement caching strategically** for performance
10. **Keep security non-negotiable** with rate limiting and encryption

### Quick Reference

```python
# Error Format (ALWAYS use this)
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": {}
    }
}

# API Pattern (ALWAYS follow)
"/api/v1/{module}/{action}"

# Testing (ALWAYS achieve)
coverage >= 80%

# Security (NEVER compromise)
- JWT authentication
- Rate limiting: 100 req/min
- Parameterized queries
- Input validation
```

---

*Last Updated: 2025-08-23*
*Version: 1.1.0*
*Incorporates: CLAUDE.md conventions + Error fixes from production*