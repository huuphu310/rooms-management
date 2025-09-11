# API Endpoints Summary

## Access Swagger Documentation
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## Available API Modules

### 1. **Authentication** (`/api/v1/auth`)
- User login and JWT token management
- Token refresh and validation
- Password reset functionality

### 2. **Rooms** (`/api/v1/rooms`)
- Room inventory management
- Room types and categories
- Availability checking
- Seasonal pricing

### 3. **Bookings** (`/api/v1/bookings`)
- Create, update, and cancel bookings
- Check-in/check-out operations
- Booking status management
- Guest preferences

### 4. **Customers** (`/api/v1/customers`)
- Guest profile management
- Booking history
- Customer preferences
- Loyalty programs

### 5. **User Management** (`/api/v1/user-management`)
- User accounts CRUD operations
- Role-based access control
- Permission management
- Activity logging
- MFA settings

### 6. **Buildings** (`/api/v1/buildings`)
- Building and floor management
- Room location tracking
- Facility management

### 7. **Reports** (`/api/v1/reports`)
- Revenue reports
- Occupancy analytics
- Performance metrics
- Custom report generation

### 8. **Pricing** (`/api/v1/pricing`)
- Dynamic pricing rules
- Seasonal rates
- Special offers
- Package deals

### 9. **Admin** (`/api/v1/admin`)
- System administration
- Database maintenance
- Cache management
- System health checks

### 10. **Room Allocation** (`/api/v1/room-allocation`)
- Automatic room assignment
- Manual allocation
- Room blocks management
- Allocation rules

### 11. **Inventory Enhanced** (`/api/v1/inventory-enhanced`)
- Advanced inventory tracking
- Stock management
- Supply chain integration
- Automated reordering

### 12. **Billing Enhanced** (`/api/v1/billing-enhanced`)
- Invoice generation
- Payment schedules
- Tax calculations
- Multi-currency billing
- QR payment integration

### 13. **Payment Integration** (`/api/v1/payment-integration`)
- Payment gateway integration
- Transaction processing
- Refund management
- Payment method management

### 14. **Folio** (`/api/v1/folio`)
- Guest folio management
- Charge posting
- Split billing
- Folio transfers

### 15. **POS** (`/api/v1/pos`)
- Point of Sale operations
- Service charges
- Product sales
- Shift management

### 16. **Currency** (`/api/v1/currency`)
- Exchange rate management
- Multi-currency support
- Automatic rate updates
- Currency conversion

### 17. **Cache Management** (`/api/v1/cache`)
- Permission cache invalidation
- Cache statistics
- Manual cache clearing
- Performance monitoring

## Authentication Requirements

All endpoints require JWT Bearer token authentication except:
- `/api/v1/auth/login`
- `/api/v1/auth/register` (if enabled)
- `/health`
- `/`

Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting
- 100 requests per minute per IP address
- Cached responses for improved performance

## Cache Management Endpoints

### Permission Cache Invalidation
- `POST /api/v1/cache/invalidate/permissions/all` - Clear all permission caches
- `POST /api/v1/cache/invalidate/permissions/user/{user_id}` - Clear specific user's cache
- `POST /api/v1/cache/invalidate/permissions/role/{role_id}` - Clear cache for role
- `POST /api/v1/cache/invalidate/all` - Clear all caches
- `GET /api/v1/cache/stats` - View cache statistics

## Performance Features
- Redis caching for permissions (10-minute TTL)
- Database connection pooling
- Async request handling
- Optimized query patterns

## Security Features
- JWT authentication
- Role-based access control (RBAC)
- Row-level security (RLS)
- Input validation and sanitization
- SQL injection prevention
- Rate limiting
- Security headers middleware

## WebSocket Support
- Real-time updates at `ws://localhost:8000/ws`
- Invoice payment status updates
- Booking notifications
- Room status changes

## Health Checks
- `GET /` - Root endpoint with API info
- `GET /health` - Health check endpoint

## Testing the API

### Using curl:
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use the token for authenticated requests
curl -X GET http://localhost:8000/api/v1/rooms \
  -H "Authorization: Bearer <token>"
```

### Using Swagger UI:
1. Navigate to http://localhost:8000/api/v1/docs
2. Click "Authorize" button
3. Enter your JWT token
4. Test endpoints interactively

## Development Notes
- All endpoints return standardized error responses
- Pagination is supported on list endpoints
- Filtering and sorting available on most GET endpoints
- Bulk operations supported where applicable