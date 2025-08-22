-- Combined Migration File
-- Generated: 2025-08-21T13:29:34.039360
-- Apply this file directly in Supabase SQL Editor
------------------------------------------------------------

-- Migration: 001_initial_schema.sql
------------------------------------------------------------
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


-- Migration: 002_inventory_and_pos.sql
------------------------------------------------------------
-- Inventory Management Tables

-- Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units of Measurement
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    type VARCHAR(50), -- weight, volume, count, etc.
    conversion_factor DECIMAL(10,6) DEFAULT 1,
    base_unit_id UUID REFERENCES units(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products/Items
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL, -- consumable, durable, service
    is_sellable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT true,
    is_stockable BOOLEAN DEFAULT true,
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    images JSONB,
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Locations/Warehouses
CREATE TABLE stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50), -- warehouse, storage, display
    address TEXT,
    manager_id UUID REFERENCES user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock by Location
CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES stock_locations(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- Stock Movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type VARCHAR(50) NOT NULL, -- in, out, transfer, adjustment, damage, return
    reference_type VARCHAR(50), -- purchase_order, sales_order, adjustment, transfer
    reference_id UUID,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    from_location_id UUID REFERENCES stock_locations(id),
    to_location_id UUID REFERENCES stock_locations(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    reason TEXT,
    performed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, partial, received, cancelled
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    other_costs DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Configuration
CREATE TABLE pos_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id VARCHAR(50) UNIQUE NOT NULL,
    terminal_name VARCHAR(100) NOT NULL,
    location_id UUID REFERENCES stock_locations(id),
    receipt_header TEXT,
    receipt_footer TEXT,
    tax_included BOOLEAN DEFAULT false,
    default_tax_rate DECIMAL(5,2) DEFAULT 0,
    print_receipt_default BOOLEAN DEFAULT true,
    allow_negative_stock BOOLEAN DEFAULT false,
    require_customer BOOLEAN DEFAULT false,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Sessions
CREATE TABLE pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id UUID REFERENCES pos_settings(id),
    cashier_id UUID REFERENCES user_profiles(id),
    opening_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closing_date TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(10,2) DEFAULT 0,
    closing_balance DECIMAL(10,2),
    expected_balance DECIMAL(10,2),
    difference DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'open', -- open, closed, suspended
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Transactions
CREATE TABLE pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    session_id UUID REFERENCES pos_sessions(id),
    customer_id UUID REFERENCES customers(id),
    booking_id UUID REFERENCES bookings(id),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    payment_method payment_method,
    payment_reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, voided, refunded
    notes TEXT,
    voided_by UUID REFERENCES user_profiles(id),
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Transaction Items
CREATE TABLE pos_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(50) NOT NULL, -- booking, pos, service, other
    reference_type VARCHAR(50), -- booking, pos_transaction, service_order
    reference_id UUID,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, partial, paid, overdue, cancelled
    payment_terms VARCHAR(100),
    notes TEXT,
    internal_notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES user_profiles(id),
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50), -- room, product, service, other
    item_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(50), -- invoice, booking_deposit, refund
    reference_type VARCHAR(50), -- invoice, booking, pos_transaction
    reference_id UUID,
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_reference VARCHAR(200),
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed, refunded
    processed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number VARCHAR(50) UNIQUE NOT NULL,
    original_payment_id UUID REFERENCES payments(id),
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(12,2) NOT NULL,
    refund_method payment_method NOT NULL,
    refund_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, completed, rejected
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES user_profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX idx_pos_transactions_customer ON pos_transactions(customer_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(transaction_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);

-- Apply update triggers
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_locations_updated_at BEFORE UPDATE ON stock_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_settings_updated_at BEFORE UPDATE ON pos_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can manage inventory" ON products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage product categories" ON product_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage units" ON units
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage suppliers" ON suppliers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock" ON stock_locations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view stock levels" ON stock_levels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock movements" ON stock_movements
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage purchase orders" ON purchase_orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage purchase order items" ON purchase_order_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage POS settings" ON pos_settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage POS sessions" ON pos_sessions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage POS transactions" ON pos_transactions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage POS transaction items" ON pos_transaction_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage invoices" ON invoices
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage invoice items" ON invoice_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payments" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage refunds" ON refunds
    FOR ALL USING (auth.role() = 'authenticated');


-- Migration: 003_services_and_amenities.sql
------------------------------------------------------------
-- Services and Amenities Management

-- Service Categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services (Spa, Laundry, Transportation, etc.)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    description TEXT,
    duration_minutes INTEGER,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    requires_booking BOOLEAN DEFAULT false,
    max_advance_booking_days INTEGER DEFAULT 30,
    min_advance_booking_hours INTEGER DEFAULT 1,
    capacity_per_slot INTEGER DEFAULT 1,
    images JSONB,
    terms_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Bookings
CREATE TABLE service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id), -- Optional link to room booking
    service_date DATE NOT NULL,
    service_time TIME NOT NULL,
    duration_minutes INTEGER,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
    staff_id UUID REFERENCES user_profiles(id),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES user_profiles(id),
    cancellation_reason TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room Amenities Tracking
CREATE TABLE room_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor, broken
    last_checked_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, amenity_name)
);

-- Maintenance Requests
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    room_id UUID REFERENCES rooms(id),
    area VARCHAR(100), -- For non-room specific maintenance
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    category VARCHAR(50), -- electrical, plumbing, hvac, furniture, other
    issue_description TEXT NOT NULL,
    reported_by UUID REFERENCES user_profiles(id),
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    parts_used JSONB,
    resolution_notes TEXT,
    completed_date TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES user_profiles(id),
    images_before JSONB,
    images_after JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Housekeeping Tasks
CREATE TABLE housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_date DATE NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- daily_cleaning, deep_cleaning, turnover, inspection
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to UUID REFERENCES user_profiles(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    scheduled_time TIME,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    inspection_score INTEGER CHECK (inspection_score BETWEEN 1 AND 10),
    inspection_notes TEXT,
    inspected_by UUID REFERENCES user_profiles(id),
    supplies_used JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lost and Found
CREATE TABLE lost_and_found (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    item_description TEXT NOT NULL,
    category VARCHAR(50), -- electronics, clothing, documents, jewelry, other
    found_location VARCHAR(200),
    found_date DATE NOT NULL,
    found_by UUID REFERENCES user_profiles(id),
    room_id UUID REFERENCES rooms(id),
    booking_id UUID REFERENCES bookings(id),
    guest_name VARCHAR(200),
    guest_contact VARCHAR(200),
    storage_location VARCHAR(100),
    images JSONB,
    status VARCHAR(50) DEFAULT 'stored', -- stored, claimed, disposed, donated
    claimed_by VARCHAR(200),
    claimed_date DATE,
    claim_verified_by UUID REFERENCES user_profiles(id),
    disposal_date DATE,
    disposal_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Requests/Complaints
CREATE TABLE guest_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- request, complaint, feedback, inquiry
    customer_id UUID REFERENCES customers(id),
    booking_id UUID REFERENCES bookings(id),
    room_id UUID REFERENCES rooms(id),
    category VARCHAR(50), -- room, service, facility, staff, other
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID REFERENCES user_profiles(id),
    status VARCHAR(50) DEFAULT 'open', -- open, assigned, in_progress, resolved, closed
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id),
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facility Bookings (Meeting rooms, etc.)
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- meeting_room, conference_hall, pool, gym, etc.
    capacity INTEGER,
    hourly_rate DECIMAL(10,2),
    half_day_rate DECIMAL(10,2),
    full_day_rate DECIMAL(10,2),
    amenities JSONB,
    images JSONB,
    setup_time_minutes INTEGER DEFAULT 0,
    cleanup_time_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE facility_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id),
    booking_id UUID REFERENCES bookings(id), -- Optional link to room booking
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    setup_requirements TEXT,
    attendees INTEGER,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in_use, completed, cancelled
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_facility_times CHECK (end_time > start_time)
);

-- Create indexes
CREATE INDEX idx_service_bookings_service ON service_bookings(service_id);
CREATE INDEX idx_service_bookings_customer ON service_bookings(customer_id);
CREATE INDEX idx_service_bookings_date ON service_bookings(service_date);
CREATE INDEX idx_service_bookings_status ON service_bookings(status);
CREATE INDEX idx_maintenance_requests_room ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_priority ON maintenance_requests(priority);
CREATE INDEX idx_housekeeping_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX idx_housekeeping_tasks_date ON housekeeping_tasks(task_date);
CREATE INDEX idx_housekeeping_tasks_status ON housekeeping_tasks(status);
CREATE INDEX idx_lost_and_found_status ON lost_and_found(status);
CREATE INDEX idx_lost_and_found_date ON lost_and_found(found_date);
CREATE INDEX idx_guest_requests_customer ON guest_requests(customer_id);
CREATE INDEX idx_guest_requests_booking ON guest_requests(booking_id);
CREATE INDEX idx_guest_requests_status ON guest_requests(status);
CREATE INDEX idx_facility_bookings_facility ON facility_bookings(facility_id);
CREATE INDEX idx_facility_bookings_date ON facility_bookings(booking_date);

-- Apply update triggers
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_bookings_updated_at BEFORE UPDATE ON service_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_amenities_updated_at BEFORE UPDATE ON room_amenities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_housekeeping_tasks_updated_at BEFORE UPDATE ON housekeeping_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lost_and_found_updated_at BEFORE UPDATE ON lost_and_found
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_requests_updated_at BEFORE UPDATE ON guest_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_bookings_updated_at BEFORE UPDATE ON facility_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage service categories" ON service_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage service bookings" ON service_bookings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage room amenities" ON room_amenities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage maintenance requests" ON maintenance_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage housekeeping tasks" ON housekeeping_tasks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage lost and found" ON lost_and_found
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage guest requests" ON guest_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage facilities" ON facilities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage facility bookings" ON facility_bookings
    FOR ALL USING (auth.role() = 'authenticated');


-- Migration: 004_reports_and_analytics.sql
------------------------------------------------------------
-- Reports and Analytics Tables

-- Daily Operations Summary
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE NOT NULL UNIQUE,
    total_rooms INTEGER,
    occupied_rooms INTEGER,
    available_rooms INTEGER,
    maintenance_rooms INTEGER,
    occupancy_rate DECIMAL(5,2),
    total_check_ins INTEGER DEFAULT 0,
    total_check_outs INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_cancellations INTEGER DEFAULT 0,
    room_revenue DECIMAL(12,2) DEFAULT 0,
    service_revenue DECIMAL(12,2) DEFAULT 0,
    pos_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_guests INTEGER DEFAULT 0,
    average_room_rate DECIMAL(10,2),
    revpar DECIMAL(10,2), -- Revenue per available room
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Financial Summary
CREATE TABLE monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_room_nights_sold INTEGER DEFAULT 0,
    total_room_nights_available INTEGER,
    average_occupancy_rate DECIMAL(5,2),
    average_daily_rate DECIMAL(10,2),
    room_revenue DECIMAL(12,2) DEFAULT 0,
    service_revenue DECIMAL(12,2) DEFAULT 0,
    pos_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    room_costs DECIMAL(12,2) DEFAULT 0,
    service_costs DECIMAL(12,2) DEFAULT 0,
    inventory_costs DECIMAL(12,2) DEFAULT 0,
    staff_costs DECIMAL(12,2) DEFAULT 0,
    utility_costs DECIMAL(12,2) DEFAULT 0,
    maintenance_costs DECIMAL(12,2) DEFAULT 0,
    other_costs DECIMAL(12,2) DEFAULT 0,
    total_costs DECIMAL(12,2) DEFAULT 0,
    gross_profit DECIMAL(12,2) GENERATED ALWAYS AS (total_revenue - total_costs) STORED,
    gross_margin DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month)
);

-- Guest Statistics
CREATE TABLE guest_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    period_date DATE NOT NULL,
    year INTEGER,
    month INTEGER,
    week INTEGER,
    new_guests INTEGER DEFAULT 0,
    returning_guests INTEGER DEFAULT 0,
    total_guests INTEGER DEFAULT 0,
    domestic_guests INTEGER DEFAULT 0,
    international_guests INTEGER DEFAULT 0,
    average_stay_length DECIMAL(5,2),
    average_lead_time DECIMAL(5,2), -- Days between booking and check-in
    top_nationalities JSONB,
    top_sources JSONB,
    age_distribution JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Forecast
CREATE TABLE revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE NOT NULL,
    forecast_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    expected_occupancy_rate DECIMAL(5,2),
    expected_adr DECIMAL(10,2), -- Average daily rate
    expected_room_revenue DECIMAL(12,2),
    expected_service_revenue DECIMAL(12,2),
    expected_total_revenue DECIMAL(12,2),
    confidence_level DECIMAL(5,2), -- Percentage confidence
    actual_revenue DECIMAL(12,2), -- Filled after the period
    variance DECIMAL(12,2), -- Difference between forecast and actual
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- insert, update, delete
    user_id UUID REFERENCES user_profiles(id),
    user_email VARCHAR(200),
    changes JSONB, -- Old and new values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level VARCHAR(20) NOT NULL, -- debug, info, warning, error, critical
    module VARCHAR(100),
    action VARCHAR(200),
    message TEXT,
    details JSONB,
    user_id UUID REFERENCES user_profiles(id),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Queue
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(200) NOT NULL,
    cc_email VARCHAR(500),
    bcc_email VARCHAR(500),
    from_email VARCHAR(200),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(50) DEFAULT 'pending', -- pending, sending, sent, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    type VARCHAR(50) NOT NULL, -- booking, payment, maintenance, alert, info
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    channels TEXT[], -- email, sms, push, in_app
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Plans (for dynamic pricing)
CREATE TABLE rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    min_stay_nights INTEGER DEFAULT 1,
    max_stay_nights INTEGER,
    base_rate DECIMAL(10,2) NOT NULL,
    monday_rate DECIMAL(10,2),
    tuesday_rate DECIMAL(10,2),
    wednesday_rate DECIMAL(10,2),
    thursday_rate DECIMAL(10,2),
    friday_rate DECIMAL(10,2),
    saturday_rate DECIMAL(10,2),
    sunday_rate DECIMAL(10,2),
    extra_person_rate DECIMAL(10,2) DEFAULT 0,
    meal_plan VARCHAR(50), -- room_only, breakfast, half_board, full_board
    cancellation_policy VARCHAR(50), -- flexible, moderate, strict
    advance_booking_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_rate_dates CHECK (end_date >= start_date)
);

-- Promotions and Discounts
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    min_booking_amount DECIMAL(10,2),
    min_nights INTEGER,
    applicable_room_types UUID[],
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Manager Integration
CREATE TABLE channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name VARCHAR(100) NOT NULL, -- Booking.com, Agoda, Expedia, etc.
    channel_id VARCHAR(100),
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    channel_room_id VARCHAR(100),
    channel_room_name VARCHAR(200),
    rate_multiplier DECIMAL(5,3) DEFAULT 1.000,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_name, channel_room_id)
);

-- Create indexes
CREATE INDEX idx_daily_summaries_date ON daily_summaries(summary_date);
CREATE INDEX idx_monthly_summaries_period ON monthly_summaries(year, month);
CREATE INDEX idx_guest_statistics_period ON guest_statistics(period_type, period_date);
CREATE INDEX idx_revenue_forecasts_period ON revenue_forecasts(period_start, period_end);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_rate_plans_room_type ON rate_plans(room_type_id);
CREATE INDEX idx_rate_plans_dates ON rate_plans(start_date, end_date);
CREATE INDEX idx_promotions_code ON promotions(promo_code);
CREATE INDEX idx_promotions_dates ON promotions(valid_from, valid_to);

-- Apply update triggers
CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_summaries_updated_at BEFORE UPDATE ON monthly_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_forecasts_updated_at BEFORE UPDATE ON revenue_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_plans_updated_at BEFORE UPDATE ON rate_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_mappings_updated_at BEFORE UPDATE ON channel_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view summaries" ON daily_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage daily summaries" ON daily_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Authenticated users can view monthly summaries" ON monthly_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage monthly summaries" ON monthly_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Authenticated users can view statistics" ON guest_statistics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage forecasts" ON revenue_forecasts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view system logs" ON system_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert system logs" ON system_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email queue" ON email_queue
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage rate plans" ON rate_plans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage promotions" ON promotions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage channel mappings" ON channel_mappings
    FOR ALL USING (auth.role() = 'authenticated');

