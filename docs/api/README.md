# API Documentation

RESTful API documentation for the Room Booking System.

## Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.yourdomain.com/api/v1
```

## Authentication

All API endpoints (except auth endpoints) require JWT authentication.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Get Token
```http
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

## API Modules

### 🏨 [Rooms API](./rooms.md)
- GET /rooms - List all rooms
- GET /rooms/{id} - Get room details
- POST /rooms - Create room
- PUT /rooms/{id} - Update room
- DELETE /rooms/{id} - Delete room

### 📅 [Bookings API](./bookings.md)
- GET /bookings - List bookings
- GET /bookings/{id} - Get booking
- POST /bookings - Create booking
- PUT /bookings/{id} - Update booking
- POST /bookings/{id}/check-in - Check in
- POST /bookings/{id}/check-out - Check out
- POST /bookings/{id}/cancel - Cancel booking

### 👥 [Customers API](./customers.md)
- GET /customers - List customers
- GET /customers/{id} - Get customer
- POST /customers - Create customer
- PUT /customers/{id} - Update customer

### 💰 [Billing API](./billing.md)
- GET /invoices - List invoices
- GET /invoices/{id} - Get invoice
- POST /invoices - Create invoice
- POST /payments - Process payment

### 🛒 [POS API](./pos.md)
- POST /pos/shifts/open - Open shift
- POST /pos/shifts/close - Close shift
- POST /pos/transactions/create - Create transaction
- POST /pos/transactions/{id}/payment - Process payment

### 🏠 [Room Allocation API](./room_allocation.md)
- GET /room-allocation/dashboard - Dashboard data
- GET /room-allocation/available-rooms - Available rooms
- POST /room-allocation/assign-room - Assign room
- POST /room-allocation/auto-assign - Auto assign rooms

### 📊 [Reports API](./reports.md)
- GET /reports/occupancy - Occupancy report
- GET /reports/revenue - Revenue report
- GET /reports/daily-summary - Daily summary

### 👤 [Users API](./users.md)
- GET /users - List users
- POST /users - Create user
- PUT /users/{id} - Update user
- PUT /users/{id}/password - Change password
- DELETE /users/{id} - Delete user

## Common Response Formats

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created
- **204 No Content** - Successful with no response body
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict
- **422 Unprocessable Entity** - Validation error
- **500 Internal Server Error** - Server error

## Rate Limiting

- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

Headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Versioning

API version is included in the URL path: `/api/v1/`

Deprecated endpoints include:
```http
X-API-Deprecation-Date: 2025-12-31
X-API-Deprecation-Info: Use /v2/endpoint instead
```

## Data Formats

### Dates
ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`

### Money
Decimal with 2 decimal places: `100.00`

### UUIDs
Standard UUID v4 format: `123e4567-e89b-12d3-a456-426614174000`

### Phone Numbers
International format: `+1234567890`

## Filtering

### Query Parameters
```
GET /bookings?status=confirmed&check_in_date=2025-08-23
GET /rooms?floor=1&status=available
```

### Operators
- `eq` - Equal
- `neq` - Not equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In list
- `like` - Pattern matching

Example:
```
GET /bookings?total_amount[gte]=100&status[in]=confirmed,guaranteed
```

## Sorting

Use `sort_by` and `order` parameters:
```
GET /bookings?sort_by=check_in_date&order=desc
GET /rooms?sort_by=room_number&order=asc
```

Multiple sorting:
```
GET /bookings?sort_by=status,check_in_date&order=asc,desc
```

## Searching

Full-text search using `q` parameter:
```
GET /customers?q=john
GET /bookings?q=B2024
```

## Webhooks

Configure webhooks for events:
- booking.created
- booking.confirmed
- booking.cancelled
- payment.received
- room.status_changed

Webhook payload:
```json
{
  "event": "booking.created",
  "timestamp": "2025-08-23T10:00:00Z",
  "data": {
    // Event data
  }
}
```

## Testing

### Test Environment
```
Base URL: http://localhost:8000/api/v1
Test API Key: test_key_123456
```

### Postman Collection
Import the Postman collection from `/docs/api/postman_collection.json`

### cURL Examples
```bash
# Get rooms
curl -X GET http://localhost:8000/api/v1/rooms \
  -H "Authorization: Bearer <token>"

# Create booking
curl -X POST http://localhost:8000/api/v1/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "123",
    "room_id": "456",
    "check_in_date": "2025-08-25",
    "check_out_date": "2025-08-27"
  }'
```

## SDK Support

### JavaScript/TypeScript
```javascript
import { RoomBookingAPI } from '@room-booking/sdk';

const api = new RoomBookingAPI({
  baseURL: 'http://localhost:8000/api/v1',
  token: 'your_jwt_token'
});

const rooms = await api.rooms.list();
```

### Python
```python
from room_booking_sdk import RoomBookingAPI

api = RoomBookingAPI(
    base_url='http://localhost:8000/api/v1',
    token='your_jwt_token'
)

rooms = api.rooms.list()
```

## Support

For API support:
- Email: api-support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com