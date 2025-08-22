-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE room_status AS ENUM (
    'available', 'booked', 'occupied', 
    'cleaning', 'maintenance', 'blocked'
);

CREATE TYPE room_view AS ENUM (
    'sea', 'mountain', 'city', 'garden', 'pool', 'none'
);

CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'checked_in', 
    'checked_out', 'cancelled', 'no_show'
);

CREATE TYPE payment_method AS ENUM (
    'cash', 'bank_transfer', 'credit_card', 
    'debit_card', 'e_wallet', 'voucher'
);

CREATE TYPE customer_type AS ENUM (
    'individual', 'corporate', 'vip', 'blacklist'
);

-- Room Types Table
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
    weekend_price DECIMAL(10,2) CHECK (weekend_price >= base_price),
    max_occupancy INTEGER NOT NULL CHECK (max_occupancy BETWEEN 1 AND 10),
    min_occupancy INTEGER DEFAULT 1 CHECK (min_occupancy >= 1),
    extra_person_charge DECIMAL(10,2) DEFAULT 0 CHECK (extra_person_charge >= 0),
    amenities JSONB,
    size_sqm DECIMAL(6,2) CHECK (size_sqm > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_occupancy CHECK (min_occupancy <= max_occupancy)
);

-- Rooms Table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type_id UUID REFERENCES room_types(id) ON DELETE RESTRICT,
    floor INTEGER CHECK (floor >= 0),
    view_type room_view DEFAULT 'none',
    status room_status DEFAULT 'available',
    images JSONB,
    is_active BOOLEAN DEFAULT true,
    last_cleaned_at TIMESTAMP WITH TIME ZONE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    alternative_phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    nationality VARCHAR(100),
    language_preference VARCHAR(10) DEFAULT 'en',
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_issue_date DATE,
    id_expiry_date DATE,
    id_images JSONB,
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    company_name VARCHAR(200),
    tax_id VARCHAR(50),
    customer_type customer_type DEFAULT 'individual',
    vip_level INTEGER DEFAULT 0 CHECK (vip_level BETWEEN 0 AND 5),
    preferences JSONB,
    tags TEXT[],
    total_stays INTEGER DEFAULT 0,
    total_nights INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_spent DECIMAL(10,2) DEFAULT 0,
    last_stay_date DATE,
    loyalty_points INTEGER DEFAULT 0,
    marketing_consent BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    blacklisted_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    actual_check_in TIMESTAMP WITH TIME ZONE,
    actual_check_out TIMESTAMP WITH TIME ZONE,
    adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
    children INTEGER DEFAULT 0 CHECK (children >= 0),
    total_nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    room_rate DECIMAL(10,2) NOT NULL,
    total_room_charge DECIMAL(10,2) NOT NULL,
    extra_charges DECIMAL(10,2) DEFAULT 0,
    discounts DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status booking_status DEFAULT 'pending',
    source VARCHAR(50),
    commission_rate DECIMAL(5,2) DEFAULT 0 CHECK (commission_rate BETWEEN 0 AND 100),
    special_requests TEXT,
    internal_notes JSONB,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    permissions JSONB,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_rooms_status ON rooms(status) WHERE is_active = true;
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(full_name);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_type ON customers(customer_type);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for room types and rooms (for availability checking)
CREATE POLICY "Room types are viewable by everyone" ON room_types
    FOR SELECT USING (is_active = true);

CREATE POLICY "Rooms are viewable by everyone" ON rooms
    FOR SELECT USING (is_active = true);

-- Authenticated users can manage data based on their role
CREATE POLICY "Authenticated users can manage room types" ON room_types
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage rooms" ON rooms
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage customers" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage bookings" ON bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- User profiles are managed by admins or the user themselves
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );