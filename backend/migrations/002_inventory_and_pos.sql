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