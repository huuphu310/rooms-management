-- Enhanced Billing System Migration
-- This migration creates tables for the enhanced billing system with multi-invoice support,
-- payment schedules, QR payments, and automated reconciliation

-- Enhanced Billing Invoices Table
CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('deposit', 'partial', 'final', 'additional')),
    
    -- Financial details
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL,
    
    -- Status and dates
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Deposit-specific fields
    deposit_percentage DECIMAL(5,2),
    
    -- Additional information
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        total_amount >= 0 AND 
        paid_amount >= 0 AND 
        balance_due >= 0 AND
        subtotal >= 0 AND
        tax_amount >= 0 AND
        service_charge >= 0 AND
        discount_amount >= 0
    ),
    CONSTRAINT valid_deposit_percentage CHECK (deposit_percentage IS NULL OR (deposit_percentage >= 0 AND deposit_percentage <= 100))
);

-- Invoice Items Table
CREATE TABLE IF NOT EXISTS billing_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'service' CHECK (item_type IN ('service', 'room', 'product', 'fee', 'tax', 'discount', 'custom')),
    
    -- Pricing
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'item',
    unit_price DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- References
    booking_id UUID REFERENCES bookings(id),
    product_id UUID, -- References to inventory items
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_item_amounts CHECK (
        quantity > 0 AND 
        unit_price >= 0 AND 
        tax_amount >= 0 AND 
        total_amount >= 0
    )
);

-- Enhanced Payment Records Table
CREATE TABLE IF NOT EXISTS billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing_invoices(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'e_wallet', 'qr_code', 'check')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Payment references
    transaction_reference VARCHAR(100),
    bank_transaction_id VARCHAR(100),
    qr_payment_id UUID,
    
    -- Status and verification
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional information
    notes TEXT,
    processed_by UUID, -- Staff member who processed the payment
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- Payment Schedules for Installments
CREATE TABLE IF NOT EXISTS billing_payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Schedule details
    installment_number INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    scheduled_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date DATE,
    
    -- Automated reminders
    reminder_sent_count INTEGER NOT NULL DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    
    -- Additional information
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_schedule_amounts CHECK (
        scheduled_amount > 0 AND 
        paid_amount >= 0 AND
        installment_number > 0 AND
        total_installments > 0
    ),
    CONSTRAINT valid_installment_number CHECK (installment_number <= total_installments)
);

-- QR Payment Codes for Bank Transfers
CREATE TABLE IF NOT EXISTS billing_qr_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing_invoices(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- QR Code details
    qr_code TEXT NOT NULL, -- Base64 encoded QR code image
    qr_content TEXT NOT NULL, -- VietQR format string
    expected_amount DECIMAL(10,2) NOT NULL,
    
    -- Bank details
    bank_code VARCHAR(10) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    transfer_content VARCHAR(500) NOT NULL, -- Unique identifier for matching
    
    -- Status and tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Payment matching
    matched_payment_id UUID REFERENCES billing_payments(id),
    matched_at TIMESTAMP WITH TIME ZONE,
    bank_transaction_reference VARCHAR(100),
    
    -- SEAPay webhook integration
    seapay_webhook_id VARCHAR(100),
    webhook_attempts INTEGER NOT NULL DEFAULT 0,
    last_webhook_attempt TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_qr_amount CHECK (expected_amount > 0),
    CONSTRAINT future_expiry CHECK (expires_at > created_at)
);

-- Refund Records
CREATE TABLE IF NOT EXISTS billing_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES billing_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    
    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT NOT NULL,
    refund_method VARCHAR(20) NOT NULL CHECK (refund_method IN ('cash', 'card', 'bank_transfer', 'original_method')),
    
    -- Status and processing
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'cancelled')),
    approved_by UUID, -- Staff member who approved
    processed_by UUID, -- Staff member who processed
    
    -- Dates
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_date DATE,
    processed_date DATE,
    
    -- Additional information
    notes TEXT,
    transaction_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_refund_amount CHECK (refund_amount > 0)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_billing_invoices_booking_id ON billing_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_invoice_type ON billing_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON billing_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created_at ON billing_invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_invoice_id ON billing_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_item_type ON billing_invoice_items(item_type);

CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice_id ON billing_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_booking_id ON billing_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_payment_method ON billing_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_billing_payments_payment_date ON billing_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_payments_status ON billing_payments(status);

CREATE INDEX IF NOT EXISTS idx_billing_payment_schedules_invoice_id ON billing_payment_schedules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payment_schedules_due_date ON billing_payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_payment_schedules_status ON billing_payment_schedules(status);

CREATE INDEX IF NOT EXISTS idx_billing_qr_payments_invoice_id ON billing_qr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_qr_payments_status ON billing_qr_payments(status);
CREATE INDEX IF NOT EXISTS idx_billing_qr_payments_transfer_content ON billing_qr_payments(transfer_content);
CREATE INDEX IF NOT EXISTS idx_billing_qr_payments_expires_at ON billing_qr_payments(expires_at);

CREATE INDEX IF NOT EXISTS idx_billing_refunds_payment_id ON billing_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_refunds_invoice_id ON billing_refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_refunds_status ON billing_refunds(status);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON billing_invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_payments_updated_at BEFORE UPDATE ON billing_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_payment_schedules_updated_at BEFORE UPDATE ON billing_payment_schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_qr_payments_updated_at BEFORE UPDATE ON billing_qr_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_refunds_updated_at BEFORE UPDATE ON billing_refunds FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to automatically update invoice balance_due when payments change
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice with new totals
    UPDATE billing_invoices 
    SET 
        paid_amount = COALESCE((
            SELECT SUM(amount) 
            FROM billing_payments 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id) 
            AND status = 'completed'
        ), 0),
        balance_due = total_amount - COALESCE((
            SELECT SUM(amount) 
            FROM billing_payments 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id) 
            AND status = 'completed'
        ), 0),
        status = CASE 
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM billing_payments 
                WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id) 
                AND status = 'completed'
            ), 0) >= total_amount THEN 'paid'
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM billing_payments 
                WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id) 
                AND status = 'completed'
            ), 0) > 0 THEN 'partially_paid'
            WHEN due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_balance_on_payment_insert 
    AFTER INSERT ON billing_payments 
    FOR EACH ROW EXECUTE PROCEDURE update_invoice_balance();

CREATE TRIGGER update_invoice_balance_on_payment_update 
    AFTER UPDATE ON billing_payments 
    FOR EACH ROW EXECUTE PROCEDURE update_invoice_balance();

CREATE TRIGGER update_invoice_balance_on_payment_delete 
    AFTER DELETE ON billing_payments 
    FOR EACH ROW EXECUTE PROCEDURE update_invoice_balance();

-- Views for common queries

-- View for invoice summary with payment info
CREATE OR REPLACE VIEW billing_invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.booking_id,
    i.invoice_type,
    i.total_amount,
    i.paid_amount,
    i.balance_due,
    i.status,
    i.invoice_date,
    i.due_date,
    CASE 
        WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN TRUE 
        ELSE FALSE 
    END AS is_overdue,
    CASE 
        WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
        THEN CURRENT_DATE - i.due_date 
        ELSE 0 
    END AS days_overdue,
    COALESCE(payment_count.count, 0) AS payment_count,
    i.created_at,
    i.updated_at
FROM billing_invoices i
LEFT JOIN (
    SELECT invoice_id, COUNT(*) as count
    FROM billing_payments 
    WHERE status = 'completed'
    GROUP BY invoice_id
) payment_count ON i.id = payment_count.invoice_id;

-- View for payment summary by method
CREATE OR REPLACE VIEW billing_payment_method_summary AS
SELECT 
    payment_method,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount,
    DATE_TRUNC('day', payment_date) AS payment_day
FROM billing_payments
WHERE status = 'completed'
GROUP BY payment_method, DATE_TRUNC('day', payment_date)
ORDER BY payment_day DESC, payment_method;

-- Grant permissions (adjust based on your user roles)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO hotel_admin;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO hotel_staff;

-- Comments for documentation
COMMENT ON TABLE billing_invoices IS 'Enhanced billing invoices supporting multiple invoice types and comprehensive payment tracking';
COMMENT ON TABLE billing_invoice_items IS 'Line items for invoices with detailed pricing and categorization';
COMMENT ON TABLE billing_payments IS 'All payment transactions with multiple methods and verification support';
COMMENT ON TABLE billing_payment_schedules IS 'Payment installment schedules for spread payments';
COMMENT ON TABLE billing_qr_payments IS 'QR code payments for Vietnamese bank transfers with automatic reconciliation';
COMMENT ON TABLE billing_refunds IS 'Refund processing with approval workflow';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Billing System migration completed successfully!';
    RAISE NOTICE 'Tables created: billing_invoices, billing_invoice_items, billing_payments, billing_payment_schedules, billing_qr_payments, billing_refunds';
    RAISE NOTICE 'Views created: billing_invoice_summary, billing_payment_method_summary';
    RAISE NOTICE 'Triggers and indexes created for automatic updates and performance';
END $$;