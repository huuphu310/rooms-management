# Homestay Management System - Backend

## Overview
FastAPI-based backend for managing small hotels and homestays (5-30 rooms).

## Tech Stack
- **Framework:** FastAPI (Python 3.11)
- **Database:** Supabase (PostgreSQL)
- **Cache:** Redis
- **Storage:** Cloudflare R2
- **Authentication:** JWT with Supabase Auth

## Setup

### 1. Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration script in Supabase SQL editor:
   - Navigate to SQL Editor in Supabase Dashboard
   - Copy contents from `migrations/001_initial_schema.sql`
   - Execute the script

### 4. Run Development Server
```bash
# With uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python -m app.main
```

### 5. Using Docker
```bash
# Build and run with docker-compose
docker-compose up --build

# Run in background
docker-compose up -d
```

## API Documentation
Once running, access the interactive API documentation:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## Project Structure
```
backend/
├── app/
│   ├── api/v1/         # API endpoints
│   ├── core/           # Core configurations
│   ├── models/         # Database models
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── migrations/         # Database migrations
├── tests/             # Test files
└── main.py           # Application entry point
```

## Available Modules
- **Rooms:** Room and room type management
- **Bookings:** Reservation handling
- **Customers:** Guest profiles
- **Inventory:** Product/service management
- **Billing:** Invoicing and payments
- **POS:** Point of sale operations
- **Reports:** Analytics and reporting

## Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/unit/test_room_service.py
```

## Development Guidelines
1. Follow PEP 8 style guide
2. Write tests for new features
3. Update API documentation
4. Use type hints
5. Handle errors gracefully

## Common Commands
```bash
# Format code
black app/

# Lint code
pylint app/

# Check types
mypy app/

# Generate requirements
pip freeze > requirements.txt
```

## Troubleshooting

### Redis Connection Error
Ensure Redis is running:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
redis-server
```

### Supabase Connection Error
- Verify your Supabase URL and keys in `.env`
- Check if the project is active in Supabase Dashboard
- Ensure migrations have been run

### CORS Issues
Add your frontend URL to `BACKEND_CORS_ORIGINS` in `.env`:
```
BACKEND_CORS_ORIGINS=["http://localhost:5173", "https://yourdomain.com"]
```