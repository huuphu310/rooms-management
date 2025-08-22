# Hotel Management System

A comprehensive Homestay/Small Hotel Management System designed for establishments with 5-30 rooms. This system provides complete operational management including bookings, room management, customer tracking, inventory, billing, POS, and detailed reporting.

## 🚀 Project Status: 100% Complete ✅

## 📋 Features

### Core Modules Implemented

#### Backend (100% Complete)
- **Room Management**: Complete CRUD operations, availability checking, status tracking
- **Booking Management**: Reservation system with check-in/out, pricing calculation, calendar view
- **Customer Management**: Guest profiles, loyalty points, duplicate detection, merge functionality
- **Inventory & Services**: Product catalog, stock tracking, purchase orders, supplier management
- **Billing & Payments**: Invoice generation, multiple payment methods, refund handling
- **POS System**: Transaction processing, session management, daily reports
- **Reports & Analytics**: Comprehensive reporting with occupancy, revenue, and performance metrics
- **User Management**: Role-based access control, authentication, permissions

#### Frontend (100% Complete)
- **Authentication System**: Secure login with Supabase Auth integration
- **Dashboard**: Real-time statistics and quick actions
- **Room Management UI**: Visual room cards with status indicators
- **Booking Interface**: Table view with filtering and search
- **Customer Portal**: Customer list with loyalty tracking
- **Responsive Design**: Modern UI with Tailwind CSS and Shadcn/ui

## 🛠 Tech Stack

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL (Supabase Cloud)
- **Authentication**: Supabase Auth with JWT
- **Caching**: Redis
- **Containerization**: Docker

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/ui with Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router v6

### Infrastructure
- **Database**: Supabase Cloud (PostgreSQL)
- **File Storage**: Cloudflare R2
- **Email**: SMTP Service
- **Deployment**: Docker-ready

## 📁 Project Structure

```
room_booking/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # API endpoints
│   │   ├── core/               # Core configurations
│   │   ├── models/             # Database models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   ├── migrations/             # Database migrations
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Page components
│   │   ├── stores/            # Zustand stores
│   │   ├── lib/               # Utilities
│   │   └── App.tsx            # Main app component
│   └── package.json           # Node dependencies
├── docs/                      # Documentation
└── docker-compose.yml         # Docker configuration
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (via Supabase)
- Redis

### Backend Setup

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
Create `.env` file in backend directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
REDIS_URL=redis://localhost:6379
SECRET_KEY=your_secret_key
```

4. Run the backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure Supabase:
Update `src/lib/supabase.ts` with your Supabase credentials.

3. Run the frontend:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Using Docker

```bash
docker-compose up
```

## 📊 Database Schema

The system uses 40+ tables including:
- **rooms**: Physical room inventory
- **room_types**: Room categories and pricing
- **bookings**: Reservation management
- **customers**: Guest profiles
- **products**: Inventory items
- **services**: Hotel services
- **invoices**: Billing records
- **pos_transactions**: Point of sale
- **user_profiles**: Staff accounts

## 🔐 Authentication

The system uses Supabase Auth with:
- JWT-based authentication
- Role-based access control (RBAC)
- Multiple user roles: Super Admin, Admin, Manager, Receptionist, Staff
- Session management with refresh tokens

## 📈 Key Features

### Room Management
- Real-time availability tracking
- Dynamic pricing (weekday/weekend rates)
- Multiple room statuses (available, occupied, cleaning, maintenance)
- Visual room cards with quick actions

### Booking System
- Online reservation management
- Check-in/check-out processing
- Automatic booking code generation
- Calendar view with occupancy rates
- Deposit and payment tracking

### Customer Management
- Guest profile management
- Loyalty points system with VIP status
- Duplicate detection and merge
- Customer history and analytics
- Contact management

### Inventory & Services
- Product catalog with SKU tracking
- Stock level monitoring
- Low stock alerts
- Purchase order management
- Supplier database
- Service booking system

### Financial Management
- Invoice generation
- Multiple payment methods
- Refund processing
- Tax calculations
- Financial reporting
- Outstanding balance tracking

### POS System
- Quick transaction processing
- Session management
- Daily cash reconciliation
- Product and service sales
- Receipt generation

### Reports & Analytics
- Occupancy reports
- Revenue analytics
- Customer insights
- Operational dashboards
- Performance metrics
- Forecast reports

## 🎯 Use Cases

Perfect for:
- Small hotels (5-30 rooms)
- Homestays and B&Bs
- Boutique hotels
- Guest houses
- Vacation rentals

## 📝 API Documentation

The API follows RESTful principles with endpoints for all modules:

### Base URL
```
http://localhost:8000/api/v1
```

### Main Endpoints
- `/rooms` - Room management
- `/bookings` - Booking operations
- `/customers` - Customer management
- `/inventory` - Inventory control
- `/billing` - Invoice and payments
- `/pos` - Point of sale
- `/reports` - Analytics and reports
- `/auth` - Authentication

### Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

## 🧪 Testing

Run backend tests:
```bash
cd backend
pytest tests/
```

Run frontend tests:
```bash
cd frontend
npm test
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For contribution guidelines, please contact the development team.

## 📞 Support

For support and inquiries, please contact the development team.

---

**Development Status**: ✅ 100% Complete
**Last Updated**: 2025-01-21