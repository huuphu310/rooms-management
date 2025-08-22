# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Homestay/Small Hotel Management System designed for establishments with 5-30 rooms. The system optimizes operations, manages bookings, services, and finances professionally.

## Tech Stack

**Backend:**
- Python with FastAPI framework
- Supabase Cloud (PostgreSQL database & authentication)
- Redis (caching & session management)
- Docker for containerization

**Frontend:**
- React 18+ with TypeScript
- Shadcn/ui component library
- TanStack Query for data fetching
- Zustand for state management
- Vite as build tool

**Infrastructure:**
- Cloudflare R2 for image storage
- Cloudflare Workers for frontend deployment
- SMTP service for email delivery

## Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/  # API endpoints for each module
│   ├── core/              # Core configurations (database, security, config)
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── migrations/            # Database migrations
└── tests/                # Unit, integration, and e2e tests

frontend/
├── src/
│   ├── components/ui/     # Shadcn UI components
│   ├── features/          # Feature modules (rooms, bookings, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # API client and utilities
│   ├── stores/            # Zustand stores
│   └── pages/             # Page components
└── wrangler.toml          # Cloudflare Workers config
```
## Development Rules

### General
- Update existing docs (Markdown files) in `./docs` directory before any code refactoring
- Add new docs (Markdown files) to `./docs` directory after new feature implementation (do not create duplicated docs)
- use `context7` mcp tools for docs of plugins/packages
- use `senera` mcp tools for semantic retrieval and editing capabilities
- uss `supabase` mcp tools for access supabase

### Code Quality Guidelines
- Don't be too harsh on code linting and formatting
- Prioritize functionality and readability over strict style enforcement
- Use reasonable code quality standards that enhance developer productivity
- Allow for minor style variations when they improve code clarity


## Key Commands

### Backend Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/

# Run with Docker
docker-compose up

# Database migrations (if using Alembic)
alembic upgrade head

# Format Python code
black app/

# Lint Python code
pylint app/
```

### Frontend Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy

# Run tests
npm test

# Type checking
npm run type-check

# Lint and format
npm run lint
npm run format
```

## Architecture Overview

### Database Schema
The system uses PostgreSQL (via Supabase) with the following core tables:
- **rooms**: Physical room inventory with status tracking
- **room_types**: Room categories with pricing
- **bookings**: Reservation management with full lifecycle tracking
- **customers**: Guest profiles with preferences and history
- **products**: Inventory items and services
- **invoices**: Billing and payment records
- **pos_transactions**: Point of sale operations
- **user_profiles**: Staff accounts with role-based permissions

### API Structure
The API follows RESTful principles with:
- JWT-based authentication via Supabase Auth
- Role-based access control (RBAC)
- Standardized response formats
- Comprehensive error handling
- Request validation using Pydantic schemas

### State Management
- **Backend**: Redis for session management and caching
- **Frontend**: Zustand for global state, TanStack Query for server state

### Key Business Logic

1. **Booking Flow**:
   - Availability checking with date range validation
   - Dynamic pricing (weekday/weekend rates)
   - Deposit management
   - Check-in/check-out processing
   - Room status transitions

2. **Inventory Management**:
   - Stock tracking with reorder points
   - Purchase order management
   - FIFO/weighted average valuation

3. **Financial Operations**:
   - Guest folio management
   - POS integration
   - Multiple payment methods
   - Invoice generation
   - Refund processing

## Environment Variables

Required environment variables (.env file):
```
# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Security
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## API Conventions

- All endpoints follow `/api/v1/{module}/{action}` pattern
- Use UUID for all entity IDs
- Pagination: `?page=1&limit=20`
- Sorting: `?sort_by=field&order=asc`
- Filtering: Module-specific query parameters
- Date format: ISO 8601 (YYYY-MM-DD)
- Money values: Store as decimal, display with proper formatting

## Testing Strategy

- Unit tests for business logic services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage target
- Use pytest for backend, Jest/React Testing Library for frontend

## Performance Considerations

- Implement Redis caching for:
  - Room availability queries
  - Rate calculations
  - Frequently accessed reference data
- Use database indexes on frequently queried fields
- Implement pagination for all list endpoints
- Use TanStack Query for frontend data caching
- Lazy load images from Cloudflare R2

## Security Requirements

- All API endpoints require authentication except public endpoints
- Implement rate limiting (100 requests/minute per IP)
- Validate and sanitize all inputs
- Use parameterized queries to prevent SQL injection
- Store sensitive data encrypted in database
- Implement audit logging for all data modifications
- Follow OWASP security best practices

## Error Handling

- Use consistent error response format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```
- Log all errors with context
- Return appropriate HTTP status codes
- Implement retry logic for transient failures