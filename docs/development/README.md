# Development Documentation

This directory contains development-related documentation, progress tracking, and implementation details.

## Contents

- **[Development Progress](./development_progress.md)** - Current status and completed features
- **[Task Breakdown](./task_breakdown.md)** - Detailed task list and milestones
- **[Room Management Implementation](./room_management_implementation.md)** - Specific implementation details

## Development Workflow

### 1. Local Development Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### 2. Git Workflow
- Feature branches: `feature/module-name`
- Bug fixes: `fix/issue-description`
- Hotfixes: `hotfix/critical-issue`

### 3. Code Standards
- Python: Follow PEP 8
- TypeScript: ESLint configuration
- Commits: Conventional commits format

### 4. Testing Requirements
- Unit tests for services
- Integration tests for API endpoints
- Minimum 80% code coverage

## Current Sprint Focus

- ✅ Core modules implementation
- ✅ Authentication system
- ✅ POS integration
- ✅ Room allocation optimization
- 🔄 Frontend development
- 📋 Testing and QA

## Architecture Decisions

### Backend
- FastAPI for async performance
- Supabase for managed database
- Service layer pattern
- Dependency injection

### Frontend
- Component-based architecture
- Custom hooks for logic
- Zustand for state management
- React Query for server state

## Performance Targets

- API response time: < 200ms
- Page load time: < 3s
- Database query optimization
- Redis caching strategy