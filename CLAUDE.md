# CLAUDE.md

**Quick reference guide for coding agents working on this Room Booking System.**

## ⚡ TL;DR - Most Important Rules

1. **Use Supabase syntax**, NOT SQLAlchemy
2. **Decode JWT directly** - Supabase auth.get_user() hangs!
3. **API pattern**: `/api/v1/{module}/{action}` (no duplicate /api)
4. **All IDs are UUID**, dates are ISO 8601, money is Decimal(2)
5. **Error format is sacred** - never change it
6. **80% test coverage minimum**
7. **Update docs BEFORE refactoring**

## Project Overview

Homestay/Small Hotel Management System for 5-30 room establishments. Manages bookings, services, and finances.

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
## Critical Rules (MUST FOLLOW)

### 1. Documentation
- **BEFORE refactoring**: Update existing docs in `./docs`
- **AFTER features**: Add new docs (no duplicates) to `./docs`
- **MCP Tools**:
  - `context7`: Package/plugin docs
  - `serena`: Semantic code search/edit
  - `supabase`: Database operations

### 2. Code Quality
- Functionality > Perfect formatting
- Readability > Strict linting
- Allow minor style variations for clarity


### 3. Common Errors to Avoid (Based on Production Issues)

#### Authentication and Database Operations
- Follow document in `./docs/development/AUTHENTICATION_AND_DATABASE_GUIDE.md`


#### API Endpoints
```javascript
// ❌ WRONG: Duplicate /api prefix
await api.post('/api/pos/shifts/open')  // Results in /api/v1/api/pos/...

// ✅ CORRECT: Clean URL
await api.post('/pos/shifts/open')  // Results in /api/v1/pos/...
```

#### TypeScript Imports
```typescript
// ❌ WRONG: Type-only import for runtime enum
import type { CustomerType } from '@/types/pos';

// ✅ CORRECT: Separate runtime from types
import { CustomerType, PaymentMethod } from '@/types/pos';  // Runtime enums
import type { Transaction, Shift } from '@/types/pos';      // Types only
```


## Mandatory Conventions

### API Structure
```python
# URL Pattern (ALWAYS use this)
"/api/v1/{module}/{action}"

# IDs (ALWAYS UUID)
uuid.uuid4()

# Query Parameters
"?page=1&limit=20"         # Pagination
"?sort_by=field&order=asc" # Sorting

# Dates (ALWAYS ISO 8601)
"2025-08-23"  # YYYY-MM-DD

# Money (ALWAYS Decimal with 2 places)
Decimal("100.00")
```

### Error Format (NEVER deviate)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Security (NON-NEGOTIABLE)
- JWT auth on all endpoints (except public)
- Rate limit: 100 req/min per IP
- Parameterized queries ONLY (no string concat)
- Input validation & sanitization
- Encrypt sensitive data

### Testing (REQUIRED)
- Minimum 80% coverage
- pytest (backend), Jest (frontend)
- Test error scenarios

### Performance (IMPLEMENT)
- Redis cache: room availability, rate calculations
- Pagination on ALL list endpoints
- Database indexes on queried fields
- TanStack Query (frontend caching)

## Quick Debugging Guide

### If Authentication Fails
1. Check if Supabase auth is hanging → Use JWT decode directly
2. Verify user_profiles table has the user
3. Check role mappings are correct

### If Database Operations Fail
1. Verify using Supabase syntax, NOT SQLAlchemy
2. Check ALL required fields are included
3. Verify table relationships are correct
4. Use `.execute()` at the end of queries

### If API Returns 404
1. Check for duplicate `/api` in URL
2. Verify route registration in FastAPI
3. Check CORS middleware is configured

### If TypeScript Import Errors
1. Separate runtime enums from type-only imports
2. Check if value is needed at runtime vs compile-time

## Commands to Remember

```bash
# Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest tests/ --cov=app --cov-report=html

# Frontend  
npm run dev
npm run build
npm run type-check

# Database
# Check table structure
python3 -c "from supabase import create_client; ..."

# Testing endpoints
curl -X GET "http://localhost:8000/api/v1/endpoint" \
  -H "Authorization: Bearer <token>"
```

## When Stuck

1. Check `./docs/troubleshooting/error_fixes_summary.md` for similar issues
2. Verify you're following the conventions above
3. Test with minimal example first
4. Check logs for actual error (not just symptoms)

## When changing database architecture
- always create database update script in `./docs/database/` folder, and execute that script, do not update directly.
- Always update changes with script name and detailed instructions in `./docs/database/track_change.md`
- ./CLAUDE.md