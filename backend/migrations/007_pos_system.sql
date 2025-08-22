-- POS System Tables
-- Point of Sale module for restaurant/shop operations

-- POS categories for product organization
CREATE TABLE pos_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES pos_categories(id),
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color
    
    -- Quick access
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS product modifiers (size, extras, etc.)
CREATE TABLE pos_product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    
    modifier_group VARCHAR(100), -- 'Size', 'Temperature', 'Extras'
    modifier_name VARCHAR(100),  -- 'Large', 'Hot', 'Extra shot'
    price_adjustment DECIMAL(12,2) DEFAULT 0,
    
    is_default BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POS shifts (work sessions)
CREATE TABLE pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    terminal_id VARCHAR(50),
    
    -- Shift timing
    shift_date DATE NOT NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,
    
    -- Staff information
    opened_by UUID REFERENCES user_profiles(id) NOT NULL,
    closed_by UUID REFERENCES user_profiles(id),
    
    -- Opening amounts
    opening_cash DECIMAL(12,2) DEFAULT 0,
    opening_notes TEXT,
    
    -- Closing amounts
    expected_cash DECIMAL(12,2),
    actual_cash DECIMAL(12,2),
    cash_difference DECIMAL(12,2) GENERATED ALWAYS AS 
        (actual_cash - expected_cash) STORED,
    
    -- Transaction summary
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_refunds DECIMAL(12,2) DEFAULT 0,
    total_discounts DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    net_sales DECIMAL(12,2) DEFAULT 0,
    
    -- Payment method breakdown
    cash_sales DECIMAL(12,2) DEFAULT 0,
    card_sales DECIMAL(12,2) DEFAULT 0,
    transfer_sales DECIMAL(12,2) DEFAULT 0,
    room_charge_sales DECIMAL(12,2) DEFAULT 0,
    
    -- Transaction counts
    transaction_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open',
    -- 'open', 'closed', 'suspended', 'reconciled'
    
    -- Closing notes
    closing_notes TEXT,
    discrepancy_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS transactions table
CREATE TABLE pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    -- 'immediate', 'room_charge', 'temp_bill'
    
    -- Session information
    shift_id UUID REFERENCES pos_shifts(id),
    terminal_id VARCHAR(50),
    cashier_id UUID REFERENCES user_profiles(id) NOT NULL,
    
    -- Customer information
    customer_type VARCHAR(20) NOT NULL,
    -- 'walk_in', 'guest', 'staff', 'external'
    booking_id UUID REFERENCES bookings(id), -- If room charge
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    room_number VARCHAR(10), -- For quick reference
    
    -- Transaction amounts
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type VARCHAR(20), -- 'percentage', 'fixed', 'voucher'
    discount_reason TEXT,
    tax_rate DECIMAL(5,2) DEFAULT 10,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    service_charge DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Payment information
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'partial', 'completed', 'void'
    payment_method VARCHAR(50),
    -- 'cash', 'bank_transfer', 'credit_card', 'room_charge', 'qr_code'
    
    -- QR payment tracking
    qr_code_id VARCHAR(50) UNIQUE,
    qr_code_url TEXT,
    qr_generated_at TIMESTAMP,
    qr_paid_at TIMESTAMP,
    
    -- Receipt information
    receipt_number VARCHAR(50) UNIQUE,
    receipt_printed BOOLEAN DEFAULT false,
    receipt_printed_at TIMESTAMP,
    receipt_print_count INTEGER DEFAULT 0,
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'active',
    -- 'active', 'completed', 'void', 'refunded'
    void_reason TEXT,
    void_by UUID REFERENCES user_profiles(id),
    void_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- POS transaction items
CREATE TABLE pos_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id) ON DELETE CASCADE,
    
    -- Product information
    product_id UUID REFERENCES products(id),
    product_code VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    
    -- Quantity and pricing
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Additional info
    notes TEXT,
    modifiers JSONB, -- For customizations
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- POS payments table
CREATE TABLE pos_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Payment details
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    
    -- Method-specific details
    payment_details JSONB,
    -- For cash: {"tendered": 100000, "change": 20000}
    -- For bank_transfer: {"reference": "TRX123", "bank": "VCB"}
    -- For credit_card: {"last_4": "1234", "card_type": "visa"}
    
    -- QR payment specific
    qr_payment_id UUID REFERENCES billing_qr_payments(id),
    bank_transaction_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed',
    -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Metadata
    processed_by UUID REFERENCES user_profiles(id),
    processed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Receipt templates
CREATE TABLE pos_receipt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) NOT NULL,
    -- 'sale', 'refund', 'shift_report', 'qr_payment'
    
    -- Template sections (80mm thermal printer format)
    header_template TEXT NOT NULL,
    -- Company name, address, tax ID, phone
    body_template TEXT, -- Item listing format
    footer_template TEXT NOT NULL,
    -- Thank you message, return policy, signatures
    
    -- Formatting options
    formatting JSONB,
    -- {
    --   "width": 48,  // Characters per line for 80mm
    --   "font_size": "normal",
    --   "alignment": "center",
    --   "logo_enabled": true,
    --   "qr_code_position": "bottom"
    -- }
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pos_transactions_shift ON pos_transactions(shift_id);
CREATE INDEX idx_pos_transactions_booking ON pos_transactions(booking_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(created_at);
CREATE INDEX idx_pos_transactions_status ON pos_transactions(status);
CREATE INDEX idx_pos_transactions_payment_status ON pos_transactions(payment_status);
CREATE INDEX idx_pos_transaction_items_transaction ON pos_transaction_items(transaction_id);
CREATE INDEX idx_pos_transaction_items_product ON pos_transaction_items(product_id);
CREATE INDEX idx_pos_payments_transaction ON pos_payments(transaction_id);
CREATE INDEX idx_pos_payments_qr ON pos_payments(qr_payment_id);
CREATE INDEX idx_pos_shifts_date ON pos_shifts(shift_date);
CREATE INDEX idx_pos_shifts_status ON pos_shifts(status);
CREATE INDEX idx_pos_categories_active ON pos_categories(is_active);
CREATE INDEX idx_pos_product_modifiers_product ON pos_product_modifiers(product_id);

-- Functions and triggers

-- Function to generate transaction code
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TRIGGER AS $$
DECLARE
    v_date_str VARCHAR(8);
    v_counter INTEGER;
    v_code VARCHAR(50);
BEGIN
    v_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO v_counter
    FROM pos_transactions
    WHERE DATE(created_at) = CURRENT_DATE;
    
    v_code := 'POS-' || v_date_str || '-' || LPAD(v_counter::TEXT, 4, '0');
    NEW.transaction_code := v_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_transaction_code
    BEFORE INSERT ON pos_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_code IS NULL)
    EXECUTE FUNCTION generate_transaction_code();

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    v_date_str VARCHAR(8);
    v_counter INTEGER;
    v_number VARCHAR(50);
BEGIN
    v_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO v_counter
    FROM pos_transactions
    WHERE DATE(created_at) = CURRENT_DATE
    AND receipt_number IS NOT NULL;
    
    v_number := 'RCP-' || v_date_str || '-' || LPAD(v_counter::TEXT, 4, '0');
    NEW.receipt_number := v_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_receipt_number
    BEFORE UPDATE ON pos_transactions
    FOR EACH ROW
    WHEN (OLD.receipt_number IS NULL AND NEW.receipt_printed = true)
    EXECUTE FUNCTION generate_receipt_number();

-- Function to update shift summary when transaction is completed
CREATE OR REPLACE FUNCTION update_shift_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        UPDATE pos_shifts
        SET 
            total_sales = total_sales + NEW.total_amount,
            total_discounts = total_discounts + NEW.discount_amount,
            total_tax = total_tax + NEW.tax_amount,
            transaction_count = transaction_count + 1,
            cash_sales = CASE 
                WHEN NEW.payment_method = 'cash' 
                THEN cash_sales + NEW.total_amount 
                ELSE cash_sales 
            END,
            card_sales = CASE 
                WHEN NEW.payment_method = 'credit_card' 
                THEN card_sales + NEW.total_amount 
                ELSE card_sales 
            END,
            transfer_sales = CASE 
                WHEN NEW.payment_method IN ('bank_transfer', 'qr_code') 
                THEN transfer_sales + NEW.total_amount 
                ELSE transfer_sales 
            END,
            room_charge_sales = CASE 
                WHEN NEW.payment_method = 'room_charge' 
                THEN room_charge_sales + NEW.total_amount 
                ELSE room_charge_sales 
            END,
            net_sales = total_sales - total_refunds - total_discounts,
            updated_at = NOW()
        WHERE id = NEW.shift_id;
    END IF;
    
    -- Handle void transactions
    IF NEW.status = 'void' AND OLD.status != 'void' THEN
        UPDATE pos_shifts
        SET 
            void_count = void_count + 1,
            updated_at = NOW()
        WHERE id = NEW.shift_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shift_summary
    AFTER UPDATE ON pos_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_shift_summary();

-- Default receipt template
INSERT INTO pos_receipt_templates (
    template_name,
    template_type,
    header_template,
    body_template,
    footer_template,
    formatting,
    is_default
) VALUES (
    'Default Sales Receipt',
    'sale',
    E'{{center}}{{company_name}}{{/center}}\n{{center}}{{address}}{{/center}}\n{{center}}Tel: {{phone}} | Tax ID: {{tax_id}}{{/center}}\n{{separator}}',
    E'{{items}}',
    E'{{separator}}\n{{center}}Thank you for your visit!{{/center}}\n{{center}}Please come again{{/center}}\n{{center}}{{website}}{{/center}}',
    '{"width": 48, "font_size": "normal", "alignment": "center", "separator_char": "-"}',
    true
);