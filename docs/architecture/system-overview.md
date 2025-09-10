# System Architecture Overview

## Executive Summary

The Room Booking Management System is designed as a modern, scalable web application following a three-tier architecture pattern with a focus on modularity, performance, and maintainability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   React SPA  │  │  Mobile PWA  │  │  Admin Panel │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         └──────────────────┴──────────────────┘                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Nginx    │  │ Rate Limiter │  │   CORS       │           │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘           │
│        └─────────────────┴──────────────────┘                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    FastAPI Application                     │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │ │ Bookings │ │  Rooms   │ │ Billing  │ │   POS    │     │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │ │Customers │ │Inventory │ │ Reports  │ │  Users   │     │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Service Layer                           │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  Business Logic │ Validation │ Authorization │ Caching   │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │    Redis     │  │ Cloudflare R2│         │
│  │  (Supabase)  │  │   (Cache)    │  │  (Storage)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Presentation Layer

#### React Single Page Application (SPA)
```typescript
// Component Structure
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Shadcn)
│   └── shared/        # Shared business components
├── features/          # Feature-based modules
│   ├── bookings/
│   ├── rooms/
│   ├── billing/
│   └── pos/
├── hooks/             # Custom React hooks
├── stores/            # Zustand state stores
├── lib/               # Utilities and helpers
└── pages/             # Route components
```

**Key Technologies:**
- React 18 with Concurrent Features
- TypeScript for type safety
- Zustand for state management
- TanStack Query for server state
- Shadcn/ui for component library
- Tailwind CSS for styling

#### Mobile Progressive Web App (PWA)
- Responsive design
- Offline capability
- Push notifications
- App-like experience

### 2. API Gateway Layer

**Responsibilities:**
- Request routing
- Load balancing
- SSL termination
- Rate limiting
- Request/response transformation
- API versioning

**Implementation:**
```python
# FastAPI middleware stack
app.add_middleware(CORSMiddleware, allow_origins=["*"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
```

### 3. Application Layer

#### FastAPI Application Structure
```python
app/
├── api/
│   └── v1/
│       └── endpoints/     # API endpoints
├── core/                  # Core functionality
│   ├── config.py         # Configuration
│   ├── database.py       # Database setup
│   ├── security.py       # Security utilities
│   └── exceptions.py     # Custom exceptions
├── models/               # Database models
├── schemas/              # Pydantic schemas
├── services/             # Business logic
└── utils/                # Utility functions
```

#### Module Architecture

Each module follows a consistent pattern:

```python
# Module Structure Example: Bookings
bookings/
├── router.py         # API endpoints
├── service.py        # Business logic
├── schemas.py        # Data models
├── validators.py     # Input validation
└── exceptions.py     # Module exceptions
```

**Service Layer Pattern:**
```python
class BookingService:
    def __init__(self, db: Database, cache: Cache):
        self.db = db
        self.cache = cache
    
    async def create_booking(self, data: BookingCreate) -> Booking:
        # Business logic
        # Validation
        # Database operations
        # Cache invalidation
        # Event emission
        return booking
```

### 4. Data Layer

#### PostgreSQL (Primary Database)
```sql
-- Database Schema Organization
├── Tables
│   ├── Core Business
│   │   ├── rooms
│   │   ├── bookings
│   │   ├── customers
│   │   └── invoices
│   ├── Support
│   │   ├── room_types
│   │   ├── rate_plans
│   │   └── amenities
│   └── System
│       ├── users
│       ├── roles
│       └── audit_logs
├── Views
│   ├── room_availability
│   ├── booking_summary
│   └── revenue_reports
└── Functions
    ├── calculate_room_rate()
    ├── check_availability()
    └── generate_invoice()
```

#### Redis (Caching Layer)
```python
# Cache Strategy
cache_keys = {
    "room:availability:{date}": 300,  # 5 minutes
    "user:session:{token}": 900,      # 15 minutes
    "report:daily:{date}": 3600,      # 1 hour
    "config:settings": 86400,          # 24 hours
}
```

#### Cloudflare R2 (Object Storage)
- Guest documents
- Invoice PDFs
- Report exports
- System backups
- Static assets

## Communication Patterns

### 1. Synchronous Communication (REST)
```
Client → API Gateway → Application → Database
       ←              ←             ←
```

### 2. Asynchronous Communication (Events)
```python
# Event-driven architecture (future)
events = {
    "booking.created": ["send_confirmation", "update_availability"],
    "payment.received": ["update_invoice", "send_receipt"],
    "room.checked_in": ["update_status", "notify_housekeeping"],
}
```

### 3. Real-time Communication (WebSocket)
```javascript
// WebSocket for real-time updates
ws.on('room.status.changed', (data) => {
    updateRoomDisplay(data);
});
```

## Scalability Strategy

### Horizontal Scaling
```yaml
# Docker Compose scaling
services:
  api:
    image: room-booking-api
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
```

### Vertical Scaling
- Database: Upgrade Supabase plan
- Cache: Increase Redis memory
- Application: Increase container resources

### Performance Optimization
1. **Database Optimization**
   - Indexed columns
   - Query optimization
   - Connection pooling
   - Read replicas

2. **Caching Strategy**
   - Redis for session data
   - CDN for static assets
   - Application-level caching
   - Database query caching

3. **Code Optimization**
   - Async/await patterns
   - Lazy loading
   - Code splitting
   - Tree shaking

## Monitoring and Observability

### Metrics Collection
```python
# Prometheus metrics
metrics = {
    "http_requests_total": Counter,
    "http_request_duration": Histogram,
    "active_bookings": Gauge,
    "database_connections": Gauge,
}
```

### Logging Strategy
```python
# Structured logging
logger.info("Booking created", extra={
    "booking_id": booking.id,
    "customer_id": booking.customer_id,
    "amount": booking.total_amount,
    "timestamp": datetime.utcnow()
})
```

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": check_database(),
        "redis": check_redis(),
        "storage": check_storage(),
    }
```

## Security Layers

### 1. Network Security
- HTTPS/TLS encryption
- Firewall rules
- DDoS protection
- VPN access

### 2. Application Security
- JWT authentication
- Role-based access control
- Input validation
- SQL injection prevention

### 3. Data Security
- Encryption at rest
- Encryption in transit
- PII data masking
- Audit logging

## Deployment Architecture

### Development Environment
```bash
# Local development
docker-compose up -d
uvicorn app.main:app --reload
npm run dev
```

### Staging Environment
- Mirrors production
- Automated deployments
- Integration testing
- Performance testing

### Production Environment
```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: room-booking-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: room-booking-api
  template:
    spec:
      containers:
      - name: api
        image: room-booking-api:latest
        ports:
        - containerPort: 8000
```

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups
- **Files**: Incremental S3 backups
- **Configuration**: Git repository
- **Secrets**: Encrypted vault

### Recovery Procedures
1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 4 hours
3. **Backup retention**: 30 days
4. **Geographic redundancy**: Multi-region

## Future Architecture Evolution

### Phase 1: Current (Monolithic)
- Single application
- Shared database
- Simple deployment

### Phase 2: Service-Oriented (6 months)
- Service separation
- API gateway
- Message queue

### Phase 3: Microservices (12+ months)
- Independent services
- Service mesh
- Event sourcing
- CQRS pattern

## Architecture Governance

### Design Principles
1. **DRY** (Don't Repeat Yourself)
2. **SOLID** principles
3. **KISS** (Keep It Simple, Stupid)
4. **YAGNI** (You Aren't Gonna Need It)

### Code Standards
- PEP 8 for Python
- ESLint for TypeScript
- Prettier for formatting
- Pre-commit hooks

### Review Process
1. Architecture review board
2. Design documentation
3. Proof of concepts
4. Performance benchmarks

## Conclusion

This architecture provides a solid foundation for a scalable, maintainable, and secure room booking management system. The modular design allows for incremental improvements and easy adaptation to changing business requirements.