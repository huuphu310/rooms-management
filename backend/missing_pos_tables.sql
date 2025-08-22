-- ===================================================================
-- MISSING POS TABLES - EXECUTE IN SUPABASE SQL EDITOR
-- ===================================================================
-- Generated at: 2025-08-22T07:57:08.738104
-- Copy and paste this SQL into your Supabase SQL Editor

-- POS_CATEGORIES
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES pos_categories(id),
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS_PRODUCT_MODIFIERS
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    modifier_group VARCHAR(100),
    modifier_name VARCHAR(100),
    price_adjustment DECIMAL(12,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POS_SHIFTS
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    terminal_id VARCHAR(50),
    shift_date DATE NOT NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,
    opened_by UUID REFERENCES user_profiles(id) NOT NULL,
    closed_by UUID REFERENCES user_profiles(id),
    opening_cash DECIMAL(12,2) DEFAULT 0,
    opening_notes TEXT,
    expected_cash DECIMAL(12,2),
    actual_cash DECIMAL(12,2),
    cash_difference DECIMAL(12,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_refunds DECIMAL(12,2) DEFAULT 0,
    total_discounts DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    net_sales DECIMAL(12,2) DEFAULT 0,
    cash_sales DECIMAL(12,2) DEFAULT 0,
    card_sales DECIMAL(12,2) DEFAULT 0,
    transfer_sales DECIMAL(12,2) DEFAULT 0,
    room_charge_sales DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    closing_notes TEXT,
    discrepancy_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS_PAYMENTS
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_id UUID REFERENCES pos_transactions(id) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(20) DEFAULT 'pending',
    reference_number VARCHAR(100),
    card_last_four VARCHAR(4),
    card_type VARCHAR(50),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    qr_code TEXT,
    qr_provider VARCHAR(50),
    room_id UUID REFERENCES rooms(id),
    booking_id UUID REFERENCES bookings(id),
    notes TEXT,
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS_RECEIPT_TEMPLATES
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_receipt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    show_qr BOOLEAN DEFAULT false,
    paper_width INTEGER DEFAULT 80,
    font_size INTEGER DEFAULT 12,
    template_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES FOR pos_categories
----------------------------------------------------------------------
CREATE INDEX idx_pos_categories_active ON pos_categories(is_active);
CREATE INDEX idx_pos_categories_featured ON pos_categories(is_featured);

-- INDEXES FOR pos_shifts
----------------------------------------------------------------------
CREATE INDEX idx_pos_shifts_date ON pos_shifts(shift_date);
CREATE INDEX idx_pos_shifts_status ON pos_shifts(status);
CREATE INDEX idx_pos_shifts_opened_by ON pos_shifts(opened_by);

-- INDEXES FOR pos_payments
----------------------------------------------------------------------
CREATE INDEX idx_pos_payments_transaction ON pos_payments(transaction_id);
CREATE INDEX idx_pos_payments_method ON pos_payments(payment_method);
CREATE INDEX idx_pos_payments_status ON pos_payments(status);

