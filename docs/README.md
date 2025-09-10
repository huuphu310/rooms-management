# Room Booking System Documentation

Welcome to the comprehensive documentation for the Room Booking System - a full-featured homestay/small hotel management platform.

## 📚 Documentation Structure

### 📋 [Project Documentation](./project/)
Core project information and requirements.

- **[Product Requirements](./project/product_requirements.md)** - Complete product specification and business requirements

### 🔧 [Module Documentation](./modules/)
Detailed documentation for each system module.

- **[Bookings Module](./modules/bookings.md)** - Reservation management and booking lifecycle
- **[Rooms Module](./modules/rooms.md)** - Room inventory and status management
- **[Customers Module](./modules/customers.md)** - Guest profiles and customer management
- **[Inventory Module](./modules/inventory.md)** - Stock management and procurement
- **[Billing Module](./modules/billing.md)** - Invoicing and payment processing
- **[POS Module](./modules/pos.md)** - Point of Sale operations
- **[Room Allocation](./modules/room_allocation.md)** - Room assignment and optimization
- **[User Management](./modules/user_management.md)** - Staff accounts and permissions
- **[Reports Module](./modules/reports.md)** - Analytics and reporting

### 💻 [Development Documentation](./development/)
Development progress and implementation details.

- **[Development Progress](./development/development_progress.md)** - Current development status
- **[Task Breakdown](./development/task_breakdown.md)** - Development tasks and milestones
- **[Room Management Implementation](./development/room_management_implementation.md)** - Implementation details

### 🔍 [Troubleshooting](./troubleshooting/)
Solutions to common issues and setup guides.

- **[Error Fixes Summary](./troubleshooting/error_fixes_summary.md)** - Documented errors and their solutions
- **[Setup Completed](./troubleshooting/setup_completed.md)** - Setup completion checklist

### 🚀 [API Documentation](./api/)
API specifications and endpoints documentation.
*(To be added)*

## 🏗️ System Architecture

### Technology Stack

**Backend:**
- Python 3.11+ with FastAPI
- Supabase (PostgreSQL + Auth)
- Redis for caching
- JWT authentication

**Frontend:**
- React 18 with TypeScript
- Shadcn/UI components
- TanStack Query
- Zustand state management
- Vite build tool

**Infrastructure:**
- Docker containerization
- Cloudflare R2 storage
- SMTP email service

## 🚀 Quick Start

1. **Setup Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Configure your .env file
   uvicorn app.main:app --reload
   ```

2. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Configure your .env file
   npm run dev
   ```

3. **Database Setup:**
   - Create a Supabase project
   - Run migrations from `/backend/migrations`
   - Seed initial data

## 📖 Module Overview

### Core Modules

1. **Bookings Management**
   - Online & walk-in reservations
   - Booking lifecycle management
   - Deposit handling
   - Cancellation policies

2. **Room Operations**
   - Room inventory
   - Status tracking
   - Housekeeping integration
   - Maintenance scheduling

3. **Financial Management**
   - Guest folios
   - Payment processing
   - Invoice generation
   - Financial reporting

4. **Guest Services**
   - Customer profiles
   - Preference tracking
   - Loyalty programs
   - Communication logs

5. **Point of Sale**
   - Restaurant/cafe operations
   - Room service
   - Additional services
   - Inventory integration

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting
- Data encryption
- Audit logging
- Input validation & sanitization

## 📊 Key Features

- **Multi-property support**
- **Real-time availability**
- **Dynamic pricing**
- **Automated room assignment**
- **Integrated POS system**
- **Comprehensive reporting**
- **Mobile responsive**
- **Multi-language support**

## 🤝 Contributing

Please refer to the [Development Documentation](./development/) for:
- Code style guidelines
- Git workflow
- Testing requirements
- Pull request process

## 📝 Recent Updates

- ✅ User management system implemented
- ✅ POS system fully functional
- ✅ Room allocation optimized
- ✅ Authentication issues resolved
- ✅ Database migrations completed

## 🆘 Support

For issues and troubleshooting:
1. Check [Troubleshooting Guide](./troubleshooting/)
2. Review [Error Fixes Summary](./troubleshooting/error_fixes_summary.md)
3. Contact development team

## 📄 License

This project is proprietary software. All rights reserved.

---

*Last Updated: 2025-08-23*