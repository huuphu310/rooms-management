# Database Migrations

This directory contains SQL migrations for the Room Booking System's Supabase database.

## Migration Files

1. **001_initial_schema.sql** - Core tables for rooms, bookings, customers, and users
2. **002_inventory_and_pos.sql** - Inventory management, POS, invoicing, and payment tables
3. **003_services_and_amenities.sql** - Services, maintenance, housekeeping, and facilities
4. **004_reports_and_analytics.sql** - Reporting, analytics, audit logs, and system tables

## How to Apply Migrations

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the content of each migration file in order
4. Paste and run in the SQL Editor
5. Verify each migration completes successfully before proceeding to the next

### Method 2: Using Combined Migration File

1. Generate the combined migration file:
   ```bash
   python migrations/migrate.py --combine
   ```

2. Open `combined_migration.sql` in the migrations folder
3. Copy the entire content
4. Paste into Supabase SQL Editor and run

### Method 3: Using Migration Script (Requires Setup)

1. Set up environment variables in `.env`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_key
   ```

2. Install Python dependencies:
   ```bash
   pip install supabase python-dotenv
   ```

3. Run migrations:
   ```bash
   python migrations/migrate.py
   ```

4. To force re-run all migrations:
   ```bash
   python migrations/migrate.py --force
   ```

## Migration Guidelines

### Creating New Migrations

1. Name files with sequential numbers: `005_feature_name.sql`
2. Include descriptive comments in the migration
3. Always include:
   - Table creation with proper constraints
   - Indexes for foreign keys and frequently queried fields
   - Update triggers for `updated_at` columns
   - Row Level Security (RLS) policies
   - Proper ENUM types where applicable

### Best Practices

1. **Idempotency**: Use `IF NOT EXISTS` clauses where possible
2. **Transactions**: Group related changes together
3. **Comments**: Document complex logic and business rules
4. **Testing**: Test migrations on a development database first
5. **Rollback Plan**: Keep rollback scripts for critical changes

## Database Schema Overview

### Core Modules

- **Room Management**: rooms, room_types, room_amenities
- **Booking System**: bookings, booking status tracking
- **Customer Management**: customers, preferences, loyalty
- **User Management**: user_profiles (extends Supabase auth)

### Operations Modules

- **Inventory**: products, stock_levels, stock_movements
- **Purchasing**: purchase_orders, suppliers
- **POS**: pos_transactions, pos_sessions
- **Billing**: invoices, payments, refunds

### Service Modules

- **Services**: services, service_bookings
- **Maintenance**: maintenance_requests, housekeeping_tasks
- **Facilities**: facilities, facility_bookings
- **Guest Services**: guest_requests, lost_and_found

### Analytics & System

- **Reporting**: daily_summaries, monthly_summaries
- **Analytics**: guest_statistics, revenue_forecasts
- **Audit**: audit_logs, system_logs
- **Communication**: email_queue, notifications
- **Pricing**: rate_plans, promotions

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure you're using the service key, not the anon key
2. **Type Already Exists**: Drop the type first or use `CREATE TYPE IF NOT EXISTS` (PostgreSQL 9.5+)
3. **RLS Policy Conflicts**: Check for duplicate policy names
4. **Foreign Key Violations**: Ensure referenced tables are created first

### Verifying Migrations

After running migrations, verify:

1. All tables are created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. All indexes are created:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

3. RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

## Support

For issues or questions about migrations:
1. Check the Supabase logs in the dashboard
2. Review the SQL syntax for PostgreSQL compatibility
3. Ensure all environment variables are correctly set