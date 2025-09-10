# Module Documentation

This directory contains detailed documentation for each functional module of the Room Booking System.

## Available Modules

### Core Operations
- **[Bookings](./bookings.md)** - Complete booking lifecycle management
- **[Rooms](./rooms.md)** - Room inventory and status management
- **[Room Allocation](./room_allocation.md)** - Intelligent room assignment system

### Guest Management
- **[Customers](./customers.md)** - Guest profiles and CRM functionality

### Financial Systems
- **[Billing](./billing.md)** - Invoice generation and payment processing
- **[POS](./pos.md)** - Point of Sale for additional services

### Operations Support
- **[Inventory](./inventory.md)** - Stock management and procurement
- **[Reports](./reports.md)** - Analytics and business intelligence

### System Administration
- **[User Management](./user_management.md)** - Staff accounts and access control

## Module Integration

All modules are designed to work seamlessly together:
- Bookings integrate with Rooms for availability
- POS transactions link to guest folios in Billing
- Inventory tracks supplies used by Rooms and POS
- Reports aggregate data from all modules

## API Endpoints

Each module exposes RESTful API endpoints under `/api/v1/{module}/`

## Database Design

Modules share a unified PostgreSQL database with proper foreign key relationships and data integrity constraints.

## Security

All modules implement:
- JWT authentication
- Role-based access control
- Input validation
- Audit logging