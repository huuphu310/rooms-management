# Inventory Management Module - Phần tiếp theo

## 3. Purchase Orders và Receiving

### 3.1 Purchase Orders

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Dates
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Financial
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Payment
    payment_terms VARCHAR(50),
    payment_due_date DATE,
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'partial', 'paid', 'overdue'
    paid_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Delivery
    delivery_location_id UUID REFERENCES inventory_locations(id),
    delivery_address TEXT,
    delivery_instructions TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'submitted', 'approved', 'partial_received', 'received', 'completed', 'cancelled'
    
    -- Approval
    requires_approval BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Receiving
    received_by UUID REFERENCES users(id),
    received_at TIMESTAMP,
    receiving_notes TEXT,
    
    -- Documents
    attachments JSONB,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Quantities
    ordered_quantity DECIMAL(12,3) NOT NULL,
    received_quantity DECIMAL(12,3) DEFAULT 0,
    rejected_quantity DECIMAL(12,3) DEFAULT 0,
    
    -- Units
    unit VARCHAR(50),
    units_per_package INTEGER DEFAULT 1,
    
    -- Pricing
    unit_cost DECIMAL(10,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL,
    
    -- Specifications
    product_name VARCHAR(200), -- For reference
    product_sku VARCHAR(100),
    supplier_sku VARCHAR(100),
    specifications TEXT,
    
    -- Receiving
    receiving_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'partial', 'complete', 'rejected'
    
    -- Quality Check
    quality_check_required BOOLEAN DEFAULT false,
    quality_check_status VARCHAR(20),
    quality_check_notes TEXT,
    
    -- Notes
    notes TEXT
);
```

### 3.2 Receiving Process

```sql
CREATE TABLE receiving_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id),
    
    -- Supplier
    supplier_id UUID REFERENCES suppliers(id),
    supplier_invoice_number VARCHAR(100),
    
    -- Dates
    received_date DATE NOT NULL,
    invoice_date DATE,
    
    -- Location
    location_id UUID REFERENCES inventory_locations(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'in_progress', 'completed', 'cancelled'
    
    -- Quality Check
    quality_check_status VARCHAR(20),
    -- 'pending', 'passed', 'failed', 'partial'
    quality_check_by UUID REFERENCES users(id),
    quality_check_date TIMESTAMP,
    
    -- Documents
    delivery_note VARCHAR(100),
    attachments JSONB,
    
    -- Metadata
    received_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES receiving_orders(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id),
    product_id UUID REFERENCES products(id),
    
    -- Quantities
    expected_quantity DECIMAL(12,3),
    received_quantity DECIMAL(12,3) NOT NULL,
    accepted_quantity DECIMAL(12,3),
    rejected_quantity DECIMAL(12,3) DEFAULT 0,
    
    -- Batch Information
    batch_number VARCHAR(50),
    lot_number VARCHAR(50),
    serial_numbers TEXT[],
    manufacture_date DATE,
    expiry_date DATE,
    
    -- Cost
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(12,2),
    
    -- Quality
    quality_status VARCHAR(20),
    -- 'pending', 'passed', 'failed'
    rejection_reason VARCHAR(200),
    quality_notes TEXT,
    
    -- Storage
    location_id UUID REFERENCES inventory_locations(id),
    bin_location VARCHAR(50),
    
    -- Notes
    notes TEXT
);
```

## 4. Recipe và Bill of Materials (BOM)

### 4.1 Recipe Management

```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    
    -- Type
    recipe_type VARCHAR(50) NOT NULL,
    -- 'food', 'beverage', 'cocktail', 'bundle'
    
    -- Product Link
    finished_product_id UUID REFERENCES products(id),
    
    -- Yield
    yield_quantity DECIMAL(10,3) NOT NULL,
    yield_unit VARCHAR(50),
    portion_size DECIMAL(10,3),
    portion_unit VARCHAR(50),
    number_of_portions INTEGER,
    
    -- Cost
    total_cost DECIMAL(10,2),
    cost_per_portion DECIMAL(10,2),
    target_cost_percentage DECIMAL(5,2),
    
    -- Pricing
    selling_price DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    
    -- Preparation
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    difficulty_level VARCHAR(20),
    -- 'easy', 'medium', 'hard', 'expert'
    
    -- Instructions
    preparation_instructions TEXT,
    cooking_instructions TEXT,
    plating_instructions TEXT,
    
    -- Allergens and Dietary
    allergens TEXT[],
    dietary_tags TEXT[],
    -- 'vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'
    
    -- Images
    image_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_seasonal BOOLEAN DEFAULT false,
    season_start_date DATE,
    season_end_date DATE,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Quantity
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(50),
    
    -- Cost
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    
    -- Preparation
    preparation_method VARCHAR(100),
    -- 'chopped', 'diced', 'sliced', 'minced', 'whole'
    
    -- Waste
    waste_percentage DECIMAL(5,2) DEFAULT 0,
    net_quantity DECIMAL(10,4),
    
    -- Alternatives
    is_optional BOOLEAN DEFAULT false,
    can_substitute BOOLEAN DEFAULT false,
    substitute_product_ids UUID[],
    
    -- Notes
    notes TEXT,
    
    -- Order
    sequence_order INTEGER
);

-- Recipe variations
CREATE TABLE recipe_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_recipe_id UUID REFERENCES recipes(id),
    variation_name VARCHAR(200) NOT NULL,
    variation_type VARCHAR(50),
    -- 'size', 'flavor', 'dietary', 'seasonal'
    
    -- Changes
    ingredient_changes JSONB,
    instruction_changes TEXT,
    
    -- Yield
    yield_quantity DECIMAL(10,3),
    yield_unit VARCHAR(50),
    
    -- Cost and Price
    total_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true
);
```

## 5. Inventory Valuation và Cost Analysis

### 5.1 Cost Tracking

```sql
CREATE TABLE inventory_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_date DATE NOT NULL,
    valuation_method VARCHAR(20) NOT NULL,
    -- 'FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC'
    
    -- Total Values
    total_quantity DECIMAL(15,3),
    total_value DECIMAL(15,2),
    
    -- By Category
    category_breakdown JSONB,
    
    -- By Location
    location_breakdown JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'finalized', 'adjusted'
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_valuation_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_id UUID REFERENCES inventory_valuations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES inventory_locations(id),
    
    -- Quantities
    quantity DECIMAL(12,3),
    
    -- Cost Methods
    fifo_cost DECIMAL(10,4),
    lifo_cost DECIMAL(10,4),
    average_cost DECIMAL(10,4),
    specific_cost DECIMAL(10,4),
    
    -- Selected Method
    selected_method VARCHAR(20),
    unit_cost DECIMAL(10,4),
    total_value DECIMAL(12,2),
    
    -- Batch Details
    batch_details JSONB
);

-- Cost History
CREATE TABLE product_cost_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    
    -- Cost Information
    cost_date DATE NOT NULL,
    cost_type VARCHAR(50),
    -- 'purchase', 'average', 'standard', 'last'
    
    -- Values
    previous_cost DECIMAL(10,4),
    new_cost DECIMAL(10,4),
    cost_change DECIMAL(10,4),
    change_percentage DECIMAL(5,2),
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(50),
    
    -- Impact
    affected_quantity DECIMAL(12,3),
    value_impact DECIMAL(12,2),
    
    -- Metadata
    reason VARCHAR(200),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 6. Integration Points

### 6.1 POS Integration

```sql
CREATE TABLE pos_inventory_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,
    -- 'sale', 'void', 'return', 'waste'
    
    -- Reference
    pos_transaction_id VARCHAR(100),
    pos_terminal_id VARCHAR(50),
    transaction_date TIMESTAMP,
    
    -- Items
    items JSONB NOT NULL,
    /* Structure:
    {
        "product_id": "uuid",
        "quantity": 2,
        "unit_price": 50000,
        "recipe_id": "uuid",
        "ingredients_deducted": []
    }
    */
    
    -- Status
    sync_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    
    -- Processing
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Room Service Integration

```sql
CREATE TABLE minibar_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    
    -- Configuration
    minibar_template_id UUID,
    last_restocked_date TIMESTAMP,
    next_restock_date DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    
    -- Responsible
    attendant_id UUID REFERENCES users(id),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE minibar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minibar_id UUID REFERENCES minibar_inventory(id),
    product_id UUID REFERENCES products(id),
    
    -- Stock
    standard_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL,
    consumed_quantity INTEGER DEFAULT 0,
    
    -- Pricing
    minibar_price DECIMAL(10,2) NOT NULL,
    
    -- Last Check
    last_checked_date TIMESTAMP,
    last_checked_by UUID REFERENCES users(id)
);

CREATE TABLE minibar_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    guest_id UUID REFERENCES guests(id),
    
    -- Items Consumed
    items JSONB NOT NULL,
    
    -- Billing
    total_amount DECIMAL(10,2),
    posted_to_folio BOOLEAN DEFAULT false,
    folio_id UUID,
    
    -- Verification
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMP,
    
    -- Metadata
    consumption_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 7. Reports và Analytics

### 7.1 Standard Reports

```sql
-- View for Stock Status Report
CREATE VIEW v_stock_status AS
SELECT 
    p.id,
    p.sku,
    p.name,
    pc.name as category,
    p.current_stock,
    p.reorder_point,
    p.min_stock_level,
    p.max_stock_level,
    p.unit_cost,
    p.current_stock * p.unit_cost as stock_value,
    CASE 
        WHEN p.current_stock <= p.min_stock_level THEN 'Critical'
        WHEN p.current_stock <= p.reorder_point THEN 'Low'
        WHEN p.current_stock >= p.max_stock_level THEN 'Excess'
        ELSE 'Normal'
    END as stock_status
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.track_inventory = true;

-- View for Expiry Alert Report
CREATE VIEW v_expiry_alerts AS
SELECT 
    ib.batch_number,
    p.name as product_name,
    il.name as location_name,
    ib.current_quantity,
    ib.expiry_date,
    CASE 
        WHEN ib.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN ib.expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN 'Expiring Soon'
        WHEN ib.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Alert'
        ELSE 'OK'
    END as expiry_status
FROM inventory_batches ib
JOIN products p ON ib.product_id = p.id
JOIN inventory_locations il ON ib.location_id = il.id
WHERE ib.expiry_date IS NOT NULL
    AND ib.current_quantity > 0
    AND ib.status = 'active';

-- View for Purchase Analysis
CREATE VIEW v_purchase_analysis AS
SELECT 
    s.name as supplier_name,
    COUNT(DISTINCT po.id) as total_orders,
    SUM(po.total_amount) as total_purchased,
    AVG(po.total_amount) as avg_order_value,
    AVG(po.actual_delivery_date - po.order_date) as avg_lead_time,
    COUNT(CASE WHEN po.actual_delivery_date > po.expected_delivery_date 
          THEN 1 END)::FLOAT / COUNT(*) * 100 as late_delivery_percentage
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
WHERE po.status = 'completed'
    AND po.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY s.id, s.name;

-- View for Consumption Patterns
CREATE VIEW v_consumption_patterns AS
SELECT 
    p.name as product_name,
    DATE_TRUNC('month', it.transaction_date) as month,
    SUM(CASE WHEN it.transaction_type = 'sale' THEN it.quantity ELSE 0 END) as sales_quantity,
    SUM(CASE WHEN it.transaction_type = 'waste' THEN it.quantity ELSE 0 END) as waste_quantity,
    AVG(it.quantity) as avg_transaction_quantity,
    COUNT(*) as transaction_count
FROM inventory_transactions it
JOIN products p ON it.product_id = p.id
WHERE it.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY p.id, p.name, DATE_TRUNC('month', it.transaction_date);
```

### 7.2 Dashboard Metrics

```sql
-- Real-time Dashboard Queries
-- Total Inventory Value
SELECT 
    SUM(current_stock * unit_cost) as total_inventory_value
FROM products
WHERE track_inventory = true;

-- Low Stock Items Count
SELECT 
    COUNT(*) as low_stock_count
FROM products
WHERE track_inventory = true
    AND current_stock <= reorder_point;

-- Expiring Items Count
SELECT 
    COUNT(*) as expiring_items
FROM inventory_batches
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND current_quantity > 0;

-- Today's Transactions
SELECT 
    transaction_type,
    COUNT(*) as count,
    SUM(total_cost) as total_value
FROM inventory_transactions
WHERE DATE(transaction_date) = CURRENT_DATE
GROUP BY transaction_type;

-- Pending Purchase Orders
SELECT 
    COUNT(*) as pending_orders,
    SUM(total_amount) as pending_value
FROM purchase_orders
WHERE status IN ('submitted', 'approved')
    AND expected_delivery_date >= CURRENT_DATE;
```

## 8. API Endpoints

### 8.1 Product Management

```typescript
// Products
GET    /api/inventory/products
GET    /api/inventory/products/:id
POST   /api/inventory/products
PUT    /api/inventory/products/:id
DELETE /api/inventory/products/:id

// Stock Operations
POST   /api/inventory/products/:id/adjust-stock
POST   /api/inventory/products/:id/transfer
GET    /api/inventory/products/:id/transactions
GET    /api/inventory/products/:id/stock-levels

// Categories
GET    /api/inventory/categories
POST   /api/inventory/categories
PUT    /api/inventory/categories/:id
DELETE /api/inventory/categories/:id
```

### 8.2 Purchase Orders

```typescript
// Purchase Orders
GET    /api/inventory/purchase-orders
GET    /api/inventory/purchase-orders/:id
POST   /api/inventory/purchase-orders
PUT    /api/inventory/purchase-orders/:id
POST   /api/inventory/purchase-orders/:id/approve
POST   /api/inventory/purchase-orders/:id/receive
DELETE /api/inventory/purchase-orders/:id

// Suppliers
GET    /api/inventory/suppliers
GET    /api/inventory/suppliers/:id
POST   /api/inventory/suppliers
PUT    /api/inventory/suppliers/:id
GET    /api/inventory/suppliers/:id/products
GET    /api/inventory/suppliers/:id/orders
```

### 8.3 Inventory Operations

```typescript
// Stock Adjustments
GET    /api/inventory/adjustments
POST   /api/inventory/adjustments
POST   /api/inventory/adjustments/:id/approve

// Stock Counts
GET    /api/inventory/counts
POST   /api/inventory/counts
PUT    /api/inventory/counts/:id
POST   /api/inventory/counts/:id/items

// Transfers
GET    /api/inventory/transfers
POST   /api/inventory/transfers
POST   /api/inventory/transfers/:id/complete

// Reports
GET    /api/inventory/reports/stock-status
GET    /api/inventory/reports/expiry-alerts
GET    /api/inventory/reports/valuation
GET    /api/inventory/reports/consumption
GET    /api/inventory/reports/purchase-analysis
```

## 9. Business Rules và Validations

### 9.1 Stock Management Rules

1. **Negative Stock Prevention**
   - Không cho phép stock âm trừ khi location cho phép
   - Validate trước khi deduct stock

2. **Reorder Point Automation**
   - Tự động tạo PO suggestion khi stock <= reorder point
   - Notify responsible person

3. **Expiry Management**
   - Alert 30 ngày trước expiry
   - Auto change status thành 'expired' khi hết hạn
   - Không cho phép sử dụng expired items

4. **Batch Tracking**
   - FIFO enforcement cho perishables
   - Maintain batch integrity trong transfers

### 9.2 Purchase Order Rules

1. **Approval Workflow**
   - PO > 10,000,000 VND cần approval
   - Cannot receive without approval

2. **Receiving Validation**
   - Quantity received không vượt quá ordered + 10%
   - Quality check required cho specific categories

3. **Payment Terms**
   - Auto calculate due date based on terms
   - Alert for overdue payments

### 9.3 Cost Control Rules

1. **Price Variance**
   - Alert nếu unit cost thay đổi > 20%
   - Require justification for manual cost adjustments

2. **Waste Management**
   - Track waste percentage by category
   - Alert if waste > threshold

3. **Recipe Costing**
   - Auto update recipe cost khi ingredient cost changes
   - Alert if food cost % exceeds target

## 10. Security và Permissions

### 10.1 Role-based Permissions

```sql
-- Inventory Roles
CREATE TABLE inventory_roles (
    role_name VARCHAR(50) PRIMARY KEY,
    permissions JSONB
);

INSERT INTO inventory_roles VALUES
('inventory_viewer', '{"view": true}'),
('inventory_clerk', '{"view": true, "create": true, "edit": true}'),
('inventory_manager', '{"view": true, "create": true, "edit": true, "delete": true, "approve": true}'),
('purchasing_officer', '{"purchase_orders": ["view", "create", "edit"]}'),
('purchasing_manager', '{"purchase_orders": ["view", "create", "edit", "approve", "delete"]}');
```

### 10.2 Audit Trail

```sql
CREATE TABLE inventory_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100),
    record_id UUID,
    action VARCHAR(20), -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Trigger for audit logging
CREATE OR REPLACE FUNCTION audit_inventory_changes() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory_audit_log (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        changed_by
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        current_setting('app.current_user_id')::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 11. Performance Optimization

### 11.1 Indexes Strategy

```sql
-- Frequently queried fields
CREATE INDEX idx_transactions_date_product 
    ON inventory_transactions(transaction_date, product_id);

CREATE INDEX idx_products_low_stock 
    ON products(current_stock) 
    WHERE track_inventory = true AND current_stock <= reorder_point;

-- Composite indexes for reports
CREATE INDEX idx_batches_expiry_status 
    ON inventory_batches(expiry_date, status, current_quantity);

-- Partial indexes for active records
CREATE INDEX idx_products_active 
    ON products(status) 
    WHERE status = 'active';
```

### 11.2 Caching Strategy

- Cache product catalog trong Redis (TTL: 1 hour)
- Cache stock levels (TTL: 5 minutes)
- Cache supplier information (TTL: 24 hours)
- Real-time updates for critical stock levels

## 12. Tích hợp với các Module khác

### 12.1 Integration với POS Module

- Real-time stock deduction khi bán hàng
- Recipe breakdown cho món ăn composite
- Void/return handling với stock reversal
- Daily reconciliation

### 12.2 Integration với Accounting Module

- Cost of Goods Sold (COGS) calculation
- Inventory valuation for balance sheet
- Purchase accruals
- Vendor payment tracking

### 12.3 Integration với Room Service Module

- Minibar inventory tracking
- Room service item availability
- Automatic billing to guest folio
- Housekeeping restock alerts

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Module:** Inventory Management  
**Status:** Implementation Ready