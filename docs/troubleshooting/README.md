# Troubleshooting Guide

This directory contains solutions to common issues and debugging guides.

## Contents

- **[Error Fixes Summary](./error_fixes_summary.md)** - Comprehensive list of resolved errors
- **[Setup Completed](./setup_completed.md)** - Setup verification checklist

## Common Issues & Solutions

### 1. Authentication Issues

**Problem**: 401 Unauthorized or token timeout
**Solution**: Check JWT token expiry, verify Supabase configuration
**Reference**: [Error Fixes Summary - Section 1](./error_fixes_summary.md#1-authentication-timeout-issues)

### 2. Database Connection

**Problem**: Cannot connect to Supabase
**Solution**: 
```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Test connection
python -c "from app.core.database import init_database; import asyncio; asyncio.run(init_database())"
```

### 3. CORS Errors

**Problem**: CORS policy blocking requests
**Solution**: Update FastAPI CORS middleware in `app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Import Errors

**Problem**: Module import failures
**Solution**: 
- Verify Python path: `export PYTHONPATH=$PYTHONPATH:./backend`
- Check virtual environment activation
- Reinstall dependencies: `pip install -r requirements.txt`

### 5. TypeScript Errors

**Problem**: Type mismatches in frontend
**Solution**:
- Run type check: `npm run type-check`
- Generate new types: `npm run generate-types`
- Clear cache: `rm -rf node_modules/.vite`

## Debugging Tools

### Backend Debugging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# FastAPI debug mode
uvicorn app.main:app --reload --log-level debug
```

### Database Queries
```python
# Enable query logging
from app.core.database import get_supabase
db = get_supabase()
# Check Supabase dashboard for query logs
```

### Frontend Debugging
```javascript
// Enable React Query devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Redux DevTools for Zustand
window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
```

## Performance Troubleshooting

### Slow API Responses
1. Check database query performance
2. Add pagination to large datasets
3. Implement Redis caching
4. Use database indexes

### Memory Issues
1. Check for memory leaks in async operations
2. Limit concurrent database connections
3. Implement connection pooling

## Error Reporting

When reporting issues, include:
1. Error message and stack trace
2. Steps to reproduce
3. Environment details (OS, Python version, Node version)
4. Recent changes made
5. Relevant log files

## Quick Fixes

### Reset Database
```bash
# Backup current data first!
# Then reset via Supabase dashboard
```

### Clear All Caches
```bash
# Redis
redis-cli FLUSHALL

# Frontend
rm -rf node_modules/.vite
rm -rf .next

# Python
find . -type d -name __pycache__ -exec rm -r {} +
```

### Reinstall Everything
```bash
# Backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

## Contact Support

If issues persist after trying these solutions:
1. Check existing [GitHub Issues](https://github.com/your-repo/issues)
2. Review [Error Fixes Summary](./error_fixes_summary.md)
3. Contact development team with error details