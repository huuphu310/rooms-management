# Database Architecture

## Overview

The Room Booking System uses PostgreSQL as the primary database, managed through Supabase, with Redis for caching. The database design follows normalization principles while maintaining query performance through strategic denormalization and indexing.

## Database Schema Design

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customers  │────<│   Bookings   │>────│    Rooms     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Invoices   │     │   Payments   │     │  Room_Types  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Transactions │     │     Users    │     │   Amenities  │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Core Tables

### 1. Rooms Table
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type_id UUID REFERENCES room_types(id),
    floor INTEGER NOT NULL,
    status room_status_enum DEFAULT 'available',
    max_occupancy INTEGER DEFAULT 2,
    base_rate DECIMAL(10,2),
    features JSONB DEFAULT '[]',
    is_accessible BOOLEAN DEFAULT FALSE,
    last_cleaned TIMESTAMP,
    maintenance_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_rooms_status (status),
    INDEX idx_rooms_type (room_type_id),
    INDEX idx_rooms_floor (floor)
);

-- Room status enum
CREATE TYPE room_status_enum AS ENUM (
    'available',
    'occupied',
    'maintenance',
    'cleaning',
    'blocked',
    'reserved'
);
```

### 2. Bookings Table
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    room_id UUID REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    check_in_time TIME DEFAULT '14:00',
    check_out_time TIME DEFAULT '12:00',
    actual_check_in TIMESTAMP,
    actual_check_out TIMESTAMP,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    total_nights INTEGER GENERATED ALWAYS AS 
        (check_out_date - check_in_date) STORED,
    room_rate DECIMAL(10,2) NOT NULL,
    total_room_charge DECIMAL(10,2),
    extra_charges DECIMAL(10,2) DEFAULT 0,
    discounts DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status booking_status_enum DEFAULT 'pending',
    source booking_source_enum DEFAULT 'direct',
    commission_rate DECIMAL(5,2) DEFAULT 0,
    special_requests TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT check_occupancy CHECK (adults >= 1),
    
    -- Indexes
    INDEX idx_bookings_customer (customer_id),
    INDEX idx_bookings_room (room_id),
    INDEX idx_bookings_dates (check_in_date, check_out_date),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_code (booking_code)
);

-- Booking status enum
CREATE TYPE booking_status_enum AS ENUM (
    'pending',
    'confirmed',
    'guaranteed',
    'checked_in',
    'checked_out',
    'cancelled',
    'no_show'
);

-- Booking source enum
CREATE TYPE booking_source_enum AS ENUM (
    'direct',
    'website',
    'phone',
    'walk_in',
    'ota',
    'corporate',
    'group'
);
```

### 3. Customers Table
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    nationality VARCHAR(50),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_expiry DATE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    company_name VARCHAR(255),
    tax_id VARCHAR(50),
    preferences JSONB DEFAULT '{}',
    tags TEXT[],
    vip_status BOOLEAN DEFAULT FALSE,
    blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    total_stays INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_stay_date DATE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_customers_email (email),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_name (full_name),
    INDEX idx_customers_vip (vip_status)
);
```

### 4. Invoices Table
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    customer_id UUID REFERENCES customers(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) GENERATED ALWAYS AS 
        (total_amount - paid_amount) STORED,
    status invoice_status_enum DEFAULT 'draft',
    payment_terms VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_invoices_booking (booking_id),
    INDEX idx_invoices_customer (customer_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_number (invoice_number)
);

-- Invoice status enum
CREATE TYPE invoice_status_enum AS ENUM (
    'draft',
    'sent',
    'paid',
    'partial',
    'overdue',
    'cancelled',
    'refunded'
);
```

### 5. Room Types Table
```sql
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    base_rate DECIMAL(10,2) NOT NULL,
    weekend_rate DECIMAL(10,2),
    max_occupancy INTEGER DEFAULT 2,
    extra_bed_rate DECIMAL(10,2) DEFAULT 0,
    amenities JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    size_sqm DECIMAL(8,2),
    bed_configuration VARCHAR(100),
    view_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_room_types_active (is_active),
    INDEX idx_room_types_code (code)
);
```

## Supporting Tables

### 6. Users Table
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role_enum NOT NULL,
    department VARCHAR(50),
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    account_status account_status_enum DEFAULT 'active',
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
);
```

### 7. Payments Table
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_reference VARCHAR(100),
    card_last_four VARCHAR(4),
    card_type VARCHAR(20),
    bank_name VARCHAR(100),
    status payment_status_enum DEFAULT 'pending',
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_payments_invoice (invoice_id),
    INDEX idx_payments_booking (booking_id),
    INDEX idx_payments_date (payment_date),
    INDEX idx_payments_status (status)
);
```

## Audit and History Tables

### 8. Audit Log Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at)
);
```

## Views

### 1. Room Availability View
```sql
CREATE VIEW room_availability AS
SELECT 
    r.id,
    r.room_number,
    r.status,
    rt.name as room_type,
    rt.base_rate,
    CASE 
        WHEN b.id IS NOT NULL THEN 'occupied'
        ELSE 'available'
    END as availability_status,
    b.check_in_date,
    b.check_out_date,
    c.full_name as guest_name
FROM rooms r
LEFT JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN bookings b ON r.id = b.room_id 
    AND b.status IN ('confirmed', 'checked_in')
    AND CURRENT_DATE BETWEEN b.check_in_date AND b.check_out_date
LEFT JOIN customers c ON b.customer_id = c.id;
```

### 2. Booking Summary View
```sql
CREATE VIEW booking_summary AS
SELECT 
    b.id,
    b.booking_code,
    c.full_name as guest_name,
    c.email,
    c.phone,
    r.room_number,
    rt.name as room_type,
    b.check_in_date,
    b.check_out_date,
    b.total_nights,
    b.total_amount,
    b.paid_amount,
    b.status,
    b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN room_types rt ON r.room_type_id = rt.id;
```

### 3. Daily Revenue View
```sql
CREATE VIEW daily_revenue AS
SELECT 
    DATE(p.payment_date) as date,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT p.id) as total_payments,
    SUM(p.amount) as total_revenue,
    AVG(p.amount) as average_payment,
    STRING_AGG(DISTINCT p.payment_method, ', ') as payment_methods
FROM payments p
JOIN bookings b ON p.booking_id = b.id
WHERE p.status = 'completed'
GROUP BY DATE(p.payment_date);
```

## Database Functions

### 1. Calculate Room Rate
```sql
CREATE OR REPLACE FUNCTION calculate_room_rate(
    p_room_type_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_guests INTEGER DEFAULT 2
) RETURNS DECIMAL AS $$
DECLARE
    v_base_rate DECIMAL;
    v_weekend_rate DECIMAL;
    v_total_rate DECIMAL := 0;
    v_current_date DATE;
BEGIN
    -- Get room type rates
    SELECT base_rate, weekend_rate 
    INTO v_base_rate, v_weekend_rate
    FROM room_types
    WHERE id = p_room_type_id;
    
    -- Calculate rate for each night
    v_current_date := p_check_in;
    WHILE v_current_date < p_check_out LOOP
        IF EXTRACT(DOW FROM v_current_date) IN (0, 6) THEN
            -- Weekend
            v_total_rate := v_total_rate + COALESCE(v_weekend_rate, v_base_rate);
        ELSE
            -- Weekday
            v_total_rate := v_total_rate + v_base_rate;
        END IF;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_total_rate;
END;
$$ LANGUAGE plpgsql;
```

### 2. Check Room Availability
```sql
CREATE OR REPLACE FUNCTION check_room_availability(
    p_room_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_conflicts INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_conflicts
    FROM bookings
    WHERE room_id = p_room_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (
        (check_in_date < p_check_out AND check_out_date > p_check_in)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
    
    RETURN v_conflicts = 0;
END;
$$ LANGUAGE plpgsql;
```

## Triggers

### 1. Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### 2. Audit Log Trigger
```sql
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        current_setting('app.user_id', true)::UUID,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Booking Status Update Trigger
```sql
CREATE OR REPLACE FUNCTION update_room_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'checked_in' THEN
        UPDATE rooms 
        SET status = 'occupied' 
        WHERE id = NEW.room_id;
    ELSIF NEW.status = 'checked_out' THEN
        UPDATE rooms 
        SET status = 'cleaning' 
        WHERE id = NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_room_update
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_room_status_on_booking();
```

## Indexes Strategy

### Primary Indexes
```sql
-- Frequently queried columns
CREATE INDEX idx_bookings_date_range ON bookings 
    USING btree (check_in_date, check_out_date);

CREATE INDEX idx_rooms_availability ON rooms 
    USING btree (status) WHERE status = 'available';

CREATE INDEX idx_payments_date ON payments 
    USING btree (payment_date DESC);
```

### Composite Indexes
```sql
-- Multi-column searches
CREATE INDEX idx_bookings_customer_status ON bookings 
    (customer_id, status);

CREATE INDEX idx_invoices_booking_status ON invoices 
    (booking_id, status);
```

### Full-Text Search Indexes
```sql
-- Text search optimization
CREATE INDEX idx_customers_search ON customers 
    USING gin(to_tsvector('english', 
        full_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));
```

## Partitioning Strategy

### Partition Bookings by Year
```sql
-- Create partitioned table
CREATE TABLE bookings_partitioned (
    LIKE bookings INCLUDING ALL
) PARTITION BY RANGE (check_in_date);

-- Create partitions
CREATE TABLE bookings_2024 PARTITION OF bookings_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE bookings_2025 PARTITION OF bookings_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## Performance Optimization

### 1. Query Optimization
```sql
-- Use EXPLAIN ANALYZE for query planning
EXPLAIN ANALYZE
SELECT * FROM bookings 
WHERE check_in_date BETWEEN '2025-08-01' AND '2025-08-31'
AND status = 'confirmed';
```

### 2. Connection Pooling
```python
# Supabase connection pool configuration
DATABASE_URL = "postgresql://user:pass@host/db?pool_size=20&max_overflow=0"
```

### 3. Materialized Views
```sql
CREATE MATERIALIZED VIEW monthly_occupancy AS
SELECT 
    DATE_TRUNC('month', check_in_date) as month,
    COUNT(*) as total_bookings,
    AVG(total_nights) as avg_nights,
    SUM(total_amount) as revenue,
    COUNT(DISTINCT customer_id) as unique_guests
FROM bookings
WHERE status NOT IN ('cancelled', 'no_show')
GROUP BY DATE_TRUNC('month', check_in_date);

-- Refresh strategy
CREATE INDEX ON monthly_occupancy (month);
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_occupancy;
```

## Data Integrity Constraints

### Foreign Key Constraints
```sql
-- Cascade delete for related records
ALTER TABLE bookings
    ADD CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE RESTRICT;

-- Prevent orphaned records
ALTER TABLE payments
    ADD CONSTRAINT fk_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE;
```

### Check Constraints
```sql
-- Business rule validations
ALTER TABLE bookings
    ADD CONSTRAINT check_positive_amount
    CHECK (total_amount >= 0);

ALTER TABLE rooms
    ADD CONSTRAINT check_valid_floor
    CHECK (floor >= 0 AND floor <= 50);
```

## Backup and Recovery

### Backup Strategy
```bash
# Daily full backup
pg_dump -h localhost -U postgres -d room_booking > backup_$(date +%Y%m%d).sql

# Incremental backup with WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### Recovery Procedures
```bash
# Restore from backup
psql -h localhost -U postgres -d room_booking < backup_20250823.sql

# Point-in-time recovery
recovery_target_time = '2025-08-23 14:00:00'
```

## Security Measures

### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own bookings"
    ON bookings FOR SELECT
    USING (created_by = current_setting('app.user_id')::UUID);

CREATE POLICY "Admins can view all bookings"
    ON bookings FOR ALL
    USING (current_setting('app.user_role') = 'admin');
```

### Data Encryption
```sql
-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt credit card data
UPDATE payments 
SET card_number = pgp_sym_encrypt(card_number, 'encryption_key');
```

## Monitoring and Maintenance

### Performance Monitoring
```sql
-- Query performance stats
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Maintenance Tasks
```sql
-- Regular vacuum and analyze
VACUUM ANALYZE bookings;
REINDEX INDEX idx_bookings_dates;

-- Update statistics
ANALYZE bookings;
```

## Migration Strategy

### Version Control
```sql
-- Migration table
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Scripts
```bash
# Naming convention
migrations/
├── 001_create_rooms_table.sql
├── 002_create_bookings_table.sql
├── 003_add_indexes.sql
└── 004_create_views.sql
```

## Conclusion

This database architecture provides a robust, scalable foundation for the Room Booking System with:
- Normalized design with strategic denormalization
- Comprehensive indexing strategy
- Data integrity through constraints and triggers
- Performance optimization through views and functions
- Security through RLS and encryption
- Monitoring and maintenance procedures