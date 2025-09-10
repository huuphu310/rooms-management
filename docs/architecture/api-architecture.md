# API Architecture

## Overview

The Room Booking System API follows RESTful principles with a modern, scalable architecture built on FastAPI. The API provides a unified interface for all client applications while maintaining security, performance, and developer experience.

## API Design Principles

### 1. RESTful Architecture
- **Resource-based URLs**: `/api/v1/bookings`, `/api/v1/rooms`
- **HTTP methods**: GET, POST, PUT, PATCH, DELETE
- **Stateless communication**: No server-side session storage
- **Standard HTTP status codes**: 200, 201, 400, 401, 403, 404, 500

### 2. API First Development
- OpenAPI 3.0 specification
- Schema-driven development
- Auto-generated documentation
- Contract testing

### 3. Consistency
- Uniform response structure
- Consistent naming conventions
- Predictable behavior
- Standard error handling

## API Structure

### URL Structure
```
https://api.domain.com/api/{version}/{resource}/{id}/{action}

Examples:
GET    /api/v1/bookings                 # List bookings
GET    /api/v1/bookings/123             # Get specific booking
POST   /api/v1/bookings                 # Create booking
PUT    /api/v1/bookings/123             # Update booking
DELETE /api/v1/bookings/123             # Delete booking
POST   /api/v1/bookings/123/check-in    # Perform action
```

### API Versioning
```python
# Version in URL path
app = FastAPI(title="Room Booking API", version="1.0.0")

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

app.include_router(v1_router)
app.include_router(v2_router)
```

## Request/Response Design

### Standard Request Structure
```json
{
  "data": {
    "type": "booking",
    "attributes": {
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "room_id": "456e7890-e89b-12d3-a456-426614174000",
      "check_in_date": "2025-08-25",
      "check_out_date": "2025-08-27",
      "guests": 2
    }
  }
}
```

### Standard Response Structure
```json
{
  "status": "success",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174000",
    "type": "booking",
    "attributes": {
      "booking_code": "BK202508250001",
      "status": "confirmed",
      "total_amount": 250.00
    },
    "relationships": {
      "customer": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "type": "customer"
      },
      "room": {
        "id": "456e7890-e89b-12d3-a456-426614174000",
        "type": "room"
      }
    }
  },
  "meta": {
    "timestamp": "2025-08-23T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Structure
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "check_in_date",
        "message": "Check-in date must be in the future",
        "code": "FUTURE_DATE_REQUIRED"
      }
    ],
    "trace_id": "abc123-def456-ghi789",
    "timestamp": "2025-08-23T10:00:00Z"
  }
}
```

### Pagination Structure
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_pages": 5,
    "total_items": 100,
    "has_next": true,
    "has_previous": false
  },
  "links": {
    "self": "/api/v1/bookings?page=1&per_page=20",
    "first": "/api/v1/bookings?page=1&per_page=20",
    "last": "/api/v1/bookings?page=5&per_page=20",
    "next": "/api/v1/bookings?page=2&per_page=20",
    "previous": null
  }
}
```

## Authentication & Authorization

### JWT Authentication Flow
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │─────>│   API    │─────>│   Auth   │
│          │      │ Gateway  │      │ Service  │
│          │<─────│          │<─────│          │
└──────────┘      └──────────┘      └──────────┘
     │                  │                 │
     │   1. Login       │                 │
     │─────────────────>│   2. Validate   │
     │                  │────────────────>│
     │                  │<────────────────│
     │   3. JWT Token   │                 │
     │<─────────────────│                 │
     │                  │                 │
     │   4. Request     │                 │
     │   + Bearer Token │                 │
     │─────────────────>│   5. Verify     │
     │                  │────────────────>│
     │                  │<────────────────│
     │   6. Response    │                 │
     │<─────────────────│                 │
```

### Token Structure
```python
# JWT Payload
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["read", "write", "delete"],
  "exp": 1735689600,
  "iat": 1735686000,
  "jti": "unique_token_id"
}
```

### Authorization Middleware
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# Role-based access control
def require_role(role: str):
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        if current_user.get("role") != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
```

## API Gateway Pattern

### Gateway Responsibilities
```python
class APIGateway:
    """
    Central entry point for all API requests
    """
    
    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.cache = CacheService()
        self.logger = Logger()
    
    async def process_request(self, request: Request) -> Response:
        # 1. Rate limiting
        await self.rate_limiter.check(request)
        
        # 2. Authentication
        user = await authenticate(request)
        
        # 3. Authorization
        await authorize(user, request.path, request.method)
        
        # 4. Request validation
        await validate_request(request)
        
        # 5. Cache check
        cached = await self.cache.get(request)
        if cached:
            return cached
        
        # 6. Route to service
        response = await route_request(request)
        
        # 7. Cache response
        await self.cache.set(request, response)
        
        # 8. Log request
        await self.logger.log(request, response)
        
        return response
```

## Rate Limiting

### Implementation
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute", "1000 per hour"]
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/v1/bookings")
@limiter.limit("50 per minute")
async def get_bookings():
    return {"bookings": []}
```

### Rate Limit Headers
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735689600
X-RateLimit-Reset-After: 45
```

## API Documentation

### OpenAPI Specification
```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI()

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Room Booking API",
        version="1.0.0",
        description="API for hotel room booking management",
        routes=app.routes,
    )
    
    # Custom modifications
    openapi_schema["info"]["x-logo"] = {
        "url": "https://example.com/logo.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### Interactive Documentation
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    docs_url="/api/docs",      # Swagger UI
    redoc_url="/api/redoc",    # ReDoc
)

# Custom documentation
app.mount("/api/docs/assets", StaticFiles(directory="docs"), name="docs")
```

## Data Validation

### Request Validation with Pydantic
```python
from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional

class BookingCreate(BaseModel):
    customer_id: UUID
    room_id: UUID
    check_in_date: date = Field(..., description="Check-in date")
    check_out_date: date = Field(..., description="Check-out date")
    adults: int = Field(1, ge=1, le=4)
    children: int = Field(0, ge=0, le=3)
    special_requests: Optional[str] = None
    
    @validator('check_out_date')
    def validate_dates(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out must be after check-in')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "customer_id": "123e4567-e89b-12d3-a456-426614174000",
                "room_id": "456e7890-e89b-12d3-a456-426614174000",
                "check_in_date": "2025-08-25",
                "check_out_date": "2025-08-27",
                "adults": 2,
                "children": 0
            }
        }
```

### Response Validation
```python
class BookingResponse(BaseModel):
    id: UUID
    booking_code: str
    status: BookingStatus
    total_amount: Decimal
    created_at: datetime
    
    class Config:
        orm_mode = True  # Enable ORM mode for SQLAlchemy
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }
```

## Caching Strategy

### Cache Implementation
```python
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost", encoding="utf8")
    FastAPICache.init(RedisBackend(redis), prefix="api-cache:")

@app.get("/api/v1/rooms/availability")
@cache(expire=300)  # Cache for 5 minutes
async def get_room_availability(
    check_in: date,
    check_out: date
):
    return await calculate_availability(check_in, check_out)
```

### Cache Invalidation
```python
async def invalidate_cache(pattern: str):
    """Invalidate cache entries matching pattern"""
    redis = get_redis_client()
    keys = await redis.keys(f"api-cache:{pattern}*")
    if keys:
        await redis.delete(*keys)

# Invalidate on update
@app.put("/api/v1/rooms/{room_id}")
async def update_room(room_id: UUID, room_data: RoomUpdate):
    result = await update_room_in_db(room_id, room_data)
    await invalidate_cache(f"rooms:{room_id}")
    await invalidate_cache("rooms:availability")
    return result
```

## Error Handling

### Global Exception Handler
```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(ValidationError)
async def validation_exception_handler(
    request: Request,
    exc: ValidationError
):
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid input data",
                "details": exc.errors(),
                "trace_id": generate_trace_id()
            }
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException
):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": exc.detail.get("code", "HTTP_ERROR"),
                "message": exc.detail.get("message", str(exc.detail)),
                "trace_id": generate_trace_id()
            }
        }
    )
```

### Custom Exception Classes
```python
class BusinessException(Exception):
    """Base exception for business logic errors"""
    def __init__(self, message: str, code: str = "BUSINESS_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

class RoomNotAvailableException(BusinessException):
    """Raised when room is not available for booking"""
    def __init__(self, room_id: str, dates: tuple):
        super().__init__(
            f"Room {room_id} not available from {dates[0]} to {dates[1]}",
            "ROOM_NOT_AVAILABLE"
        )

class InsufficientPaymentException(BusinessException):
    """Raised when payment amount is insufficient"""
    def __init__(self, required: Decimal, provided: Decimal):
        super().__init__(
            f"Insufficient payment: required {required}, provided {provided}",
            "INSUFFICIENT_PAYMENT"
        )
```

## API Testing

### Unit Tests
```python
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)

def test_create_booking(client, mock_db):
    response = client.post(
        "/api/v1/bookings",
        json={
            "customer_id": "123e4567-e89b-12d3-a456-426614174000",
            "room_id": "456e7890-e89b-12d3-a456-426614174000",
            "check_in_date": "2025-08-25",
            "check_out_date": "2025-08-27"
        },
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code == 201
    assert response.json()["data"]["type"] == "booking"
```

### Integration Tests
```python
@pytest.mark.integration
async def test_booking_workflow():
    # 1. Create customer
    customer = await create_test_customer()
    
    # 2. Check room availability
    available_rooms = await get_available_rooms("2025-08-25", "2025-08-27")
    assert len(available_rooms) > 0
    
    # 3. Create booking
    booking = await create_booking(customer.id, available_rooms[0].id)
    assert booking.status == "confirmed"
    
    # 4. Process payment
    payment = await process_payment(booking.id, booking.total_amount)
    assert payment.status == "completed"
    
    # 5. Check in
    check_in_result = await check_in_guest(booking.id)
    assert check_in_result.status == "checked_in"
```

### Contract Testing
```python
from pact import Consumer, Provider

pact = Consumer('Frontend').has_pact_with(Provider('API'))

@pact.given('A room exists')
@pact.upon_receiving('A request for room details')
@pact.with_request('GET', '/api/v1/rooms/123')
@pact.will_respond_with(200, body={
    'data': {
        'id': '123',
        'room_number': '101',
        'status': 'available'
    }
})
def test_get_room():
    # Test implementation
    pass
```

## Performance Optimization

### Async Operations
```python
import asyncio
from typing import List

async def get_booking_details(booking_id: UUID):
    # Parallel data fetching
    booking_task = get_booking(booking_id)
    customer_task = get_customer(booking.customer_id)
    room_task = get_room(booking.room_id)
    payments_task = get_payments(booking_id)
    
    booking, customer, room, payments = await asyncio.gather(
        booking_task,
        customer_task,
        room_task,
        payments_task
    )
    
    return {
        "booking": booking,
        "customer": customer,
        "room": room,
        "payments": payments
    }
```

### Database Query Optimization
```python
from sqlalchemy import select, join
from sqlalchemy.orm import selectinload

# Eager loading to prevent N+1 queries
async def get_bookings_with_details():
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.customer),
            selectinload(Booking.room),
            selectinload(Booking.payments)
        )
        .where(Booking.status == "confirmed")
    )
    result = await db.execute(stmt)
    return result.scalars().all()
```

### Response Compression
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

## API Monitoring

### Logging
```python
import logging
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logging.info(f"Request: {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logging.info(
        f"Response: {response.status_code} "
        f"Process time: {process_time:.3f}s"
    )
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

### Metrics Collection
```python
from prometheus_client import Counter, Histogram, generate_latest

# Define metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

@app.get("/metrics")
async def get_metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Health Checks
```python
from fastapi import status

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@app.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness probe for Kubernetes"""
    try:
        # Check database connection
        await db.execute("SELECT 1")
        # Check Redis connection
        await redis.ping()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not ready", "error": str(e)}
        )
```

## API Security

### Input Sanitization
```python
from bleach import clean
import re

def sanitize_input(value: str) -> str:
    """Sanitize user input to prevent XSS"""
    # Remove HTML tags
    cleaned = clean(value, tags=[], strip=True)
    # Remove special characters
    cleaned = re.sub(r'[<>\"\'%;()&+]', '', cleaned)
    return cleaned

class SecureBookingCreate(BookingCreate):
    @validator('special_requests')
    def sanitize_special_requests(cls, v):
        if v:
            return sanitize_input(v)
        return v
```

### SQL Injection Prevention
```python
from sqlalchemy import text

# Bad - vulnerable to SQL injection
async def get_booking_unsafe(booking_code: str):
    query = f"SELECT * FROM bookings WHERE booking_code = '{booking_code}'"
    return await db.execute(query)

# Good - parameterized query
async def get_booking_safe(booking_code: str):
    query = text("SELECT * FROM bookings WHERE booking_code = :code")
    return await db.execute(query, {"code": booking_code})
```

### API Key Management
```python
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def validate_api_key(api_key: str = Depends(api_key_header)):
    if api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return api_key
```

## Conclusion

This API architecture provides:
- **Scalability**: Async operations, caching, and efficient queries
- **Security**: Multiple layers of protection
- **Maintainability**: Clean structure and comprehensive documentation
- **Performance**: Optimized for speed and efficiency
- **Developer Experience**: Auto-documentation and testing tools