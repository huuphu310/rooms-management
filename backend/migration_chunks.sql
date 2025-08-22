-- ===================================================================
-- POS SYSTEM MIGRATION - EXECUTE IN SUPABASE SQL EDITOR
-- ===================================================================
-- Copy and execute these statements one by one in your Supabase SQL Editor
-- Dashboard: https://app.supabase.com/project/dbifsitavfvrzmmayxlz

-- CHUNK 1: pos_categories table
-- ===================================================================
CREATE TABLE IF NOT EXISTS pos_categories (
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

-- CHUNK 2: pos_product_modifiers table
-- ===================================================================
CREATE TABLE IF NOT EXISTS pos_product_modifiers (
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

-- CHUNK 3: pos_shifts table
-- ===================================================================
CREATE TABLE IF NOT EXISTS pos_shifts (
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

-- CHUNK 4: Update pos_transactions table (may already exist)
-- ===================================================================
-- Note: This table may already exist, so we'll add missing columns if needed
DO $$
BEGIN
    -- Add QR payment fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'qr_code_id') THEN
        ALTER TABLE pos_transactions ADD COLUMN qr_code_id VARCHAR(50) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'qr_code_url') THEN
        ALTER TABLE pos_transactions ADD COLUMN qr_code_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'qr_generated_at') THEN
        ALTER TABLE pos_transactions ADD COLUMN qr_generated_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'qr_paid_at') THEN
        ALTER TABLE pos_transactions ADD COLUMN qr_paid_at TIMESTAMP;
    END IF;
END $$;

-- CHUNK 5: pos_payments table
-- ===================================================================
CREATE TABLE IF NOT EXISTS pos_payments (
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
    qr_payment_id UUID, -- REFERENCES billing_qr_payments(id) - may not exist yet
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

-- CHUNK 6: pos_receipt_templates table
-- ===================================================================
CREATE TABLE IF NOT EXISTS pos_receipt_templates (
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

-- CHUNK 7: Create indexes for performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift ON pos_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_booking ON pos_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON pos_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_payment_status ON pos_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_transaction ON pos_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_product ON pos_transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_transaction ON pos_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_qr ON pos_payments(qr_payment_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_date ON pos_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status);
CREATE INDEX IF NOT EXISTS idx_pos_categories_active ON pos_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_product_modifiers_product ON pos_product_modifiers(product_id);

-- CHUNK 8: Create functions for auto-generated codes
-- ===================================================================
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

-- CHUNK 9: Create triggers
-- ===================================================================
DROP TRIGGER IF EXISTS trg_generate_transaction_code ON pos_transactions;
CREATE TRIGGER trg_generate_transaction_code
    BEFORE INSERT ON pos_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_code IS NULL)
    EXECUTE FUNCTION generate_transaction_code();

-- CHUNK 10: Insert default receipt template
-- ===================================================================
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
) ON CONFLICT DO NOTHING;

-- ===================================================================
-- MIGRATION COMPLETE!
-- Run verification: python3 migrate_pos_rest.py --verify
-- ===================================================================