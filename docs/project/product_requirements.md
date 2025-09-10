# HOMESTAY/SMALL HOTEL MANAGEMENT SYSTEM
## PRODUCT REQUIREMENT DOCUMENT (PRD)

### 1. PROJECT OVERVIEW

#### 1.1 Purpose
Build a comprehensive management system for small homestays/hotels (5-30 rooms) to optimize operations, manage bookings, services, and finances professionally. This PRD is designed for implementation using Claude Code.

#### 1.2 Tech Stack
**Backend:**
- Python (FastAPI/Django)
- Supabase Cloud (Database & Authentication)
- Redis (Caching & Session Management)
- Docker (Containerization)

**Frontend:**
- React 18+
- Shadcn/ui (Component Library)
- TanStack Query (Data Fetching)
- Zustand (State Management)

**Infrastructure:**
- Cloudflare R2 (Image Storage)
- Cloudflare Workers (Frontend Deployment)
- SMTP Service (Email Delivery)

#### 1.3 System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                       │
│                    (React + Shadcn/ui)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│                    API Gateway (Python)                      │
│                         FastAPI                              │
└──────┬───────────────────────────────────┬──────────────────┘
       │                                   │
┌──────▼────────┐                   ┌─────▼──────┐
│   Supabase    │                   │    Redis    │
│   PostgreSQL  │                   │    Cache    │
│     Auth      │                   └─────────────┘
└───────────────┘
       │
┌──────▼────────┐
│ Cloudflare R2 │
│  (Images)     │
└───────────────┘
```

---

### 2. FUNCTIONAL REQUIREMENTS

## 2.1 ROOM MANAGEMENT MODULE

### 2.1.1 Room Types Management

#### Database Schema
```sql
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    weekend_price DECIMAL(10,2),
    max_occupancy INTEGER NOT NULL,
    min_occupancy INTEGER DEFAULT 1,
    extra_person_charge DECIMAL(10,2) DEFAULT 0,
    amenities JSONB, -- ["wifi", "ac", "minibar", "tv"]
    size_sqm DECIMAL(6,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### API Functions

##### `GET /api/room-types`
**Description:** Retrieve all room types with optional filtering and pagination  
**Parameters:**
- `page` (integer, optional): Page number for pagination, default 1
- `limit` (integer, optional): Number of items per page, default 20
- `sort_by` (string, optional): Sort field (name, base_price, created_at)
- `order` (string, optional): Sort order (asc, desc), default asc

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Deluxe Room",
      "base_price": 1500000,
      "weekend_price": 1800000,
      "max_occupancy": 3,
      "min_occupancy": 1,
      "extra_person_charge": 300000,
      "amenities": ["wifi", "ac", "minibar", "tv"],
      "size_sqm": 35.5,
      "description": "Spacious room with sea view"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

##### `POST /api/room-types`
**Description:** Create a new room type  
**Request Body:**
```json
{
  "name": "Deluxe Room",
  "base_price": 1500000,
  "weekend_price": 1800000,
  "max_occupancy": 3,
  "min_occupancy": 1,
  "extra_person_charge": 300000,
  "amenities": ["wifi", "ac", "minibar", "tv"],
  "size_sqm": 35.5,
  "description": "Spacious room with sea view"
}
```
**Validation Rules:**
- `name`: Required, max 100 characters, must be unique
- `base_price`: Required, must be positive number
- `weekend_price`: Optional, if provided must be >= base_price
- `max_occupancy`: Required, must be between 1-10
- `min_occupancy`: Optional, must be <= max_occupancy

##### `PUT /api/room-types/{id}`
**Description:** Update an existing room type  
**Parameters:**
- `id` (UUID, required): Room type ID
**Request Body:** Same as POST  
**Note:** Updates will affect future bookings only, not existing ones

##### `DELETE /api/room-types/{id}`
**Description:** Soft delete a room type  
**Parameters:**
- `id` (UUID, required): Room type ID
**Business Logic:**
- Cannot delete if there are active rooms using this type
- Sets `is_active = false` instead of hard delete
- Existing bookings remain unaffected

### 2.1.2 Room Management

#### Database Schema
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type_id UUID REFERENCES room_types(id),
    floor INTEGER,
    view_type VARCHAR(50), -- 'sea', 'mountain', 'city', 'garden'
    status VARCHAR(20) DEFAULT 'available', 
    -- 'available', 'booked', 'occupied', 'cleaning', 'maintenance', 'blocked'
    images JSONB, -- ["url1", "url2", "url3"]
    is_active BOOLEAN DEFAULT true,
    last_cleaned_at TIMESTAMP,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);
```

#### API Functions

##### `GET /api/rooms`
**Description:** List all rooms with advanced filtering  
**Parameters:**
- `status` (string, optional): Filter by room status
- `floor` (integer, optional): Filter by floor number
- `room_type_id` (UUID, optional): Filter by room type
- `view_type` (string, optional): Filter by view type
- `available_from` (date, optional): Check availability from date
- `available_to` (date, optional): Check availability to date

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "room_number": "101",
      "room_type": {
        "id": "uuid",
        "name": "Deluxe Room",
        "base_price": 1500000
      },
      "floor": 1,
      "view_type": "sea",
      "status": "available",
      "images": ["https://r2.url/image1.jpg"],
      "last_cleaned_at": "2024-01-15T10:30:00Z",
      "is_available_today": true
    }
  ]
}
```

##### `POST /api/rooms/{id}/status`
**Description:** Update room status with validation  
**Parameters:**
- `id` (UUID, required): Room ID
**Request Body:**
```json
{
  "status": "cleaning",
  "notes": "Deep cleaning required",
  "estimated_ready_time": "2024-01-15T14:00:00Z"
}
```
**Business Logic:**
- `available` → `maintenance`: Allowed only if no future bookings
- `occupied` → `cleaning`: Automatic after checkout
- `cleaning` → `available`: Updates last_cleaned_at timestamp
- `maintenance` → `available`: Requires maintenance completion note

##### `POST /api/rooms/{id}/images`
**Description:** Upload room images to Cloudflare R2  
**Parameters:**
- `id` (UUID, required): Room ID
**Request:** Multipart form data with image files
**Process:**
1. Validate image format (jpg, png, webp only)
2. Resize images (max 1920x1080, thumbnail 400x300)
3. Upload to R2 with naming convention: `rooms/{room_id}/{timestamp}_{size}.{ext}`
4. Update room record with image URLs
**Response:**
```json
{
  "images": [
    {
      "original": "https://r2.url/rooms/uuid/1234567890_original.jpg",
      "thumbnail": "https://r2.url/rooms/uuid/1234567890_thumb.jpg"
    }
  ]
}
```

---

## 2.2 BOOKING MANAGEMENT MODULE

### 2.2.1 Booking Core Functions

#### Database Schema
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    room_id UUID REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    actual_check_in TIMESTAMP,
    actual_check_out TIMESTAMP,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER DEFAULT 0,
    total_nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    room_rate DECIMAL(10,2) NOT NULL,
    total_room_charge DECIMAL(10,2) NOT NULL,
    extra_charges DECIMAL(10,2) DEFAULT 0,
    discounts DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
    source VARCHAR(50), -- 'walk_in', 'phone', 'website', 'booking.com', 'agoda'
    commission_rate DECIMAL(5,2) DEFAULT 0, -- For OTA bookings
    special_requests TEXT,
    internal_notes JSONB, -- {"reception": "", "housekeeping": "", "f&b": ""}
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

#### API Functions

##### `POST /api/bookings`
**Description:** Create a new booking with availability validation  
**Request Body:**
```json
{
  "customer_id": "uuid",
  "room_id": "uuid",
  "check_in_date": "2024-01-20",
  "check_out_date": "2024-01-25",
  "adults": 2,
  "children": 1,
  "source": "website",
  "special_requests": "Late check-in after 10 PM",
  "internal_notes": {
    "reception": "VIP customer",
    "housekeeping": "Extra towels needed"
  }
}
```
**Business Logic:**
1. Validate room availability for the date range
2. Calculate room charges based on:
   - Base rate for weekdays
   - Weekend rate for Fri-Sat
   - Extra person charges if adults > min_occupancy
3. Generate unique booking code (format: `BK{YYYYMMDD}{XXXX}`)
4. Set initial status as 'pending'
5. Send confirmation email if customer email exists
6. Update room status to 'booked' for the dates

**Response:**
```json
{
  "booking_id": "uuid",
  "booking_code": "BK202401201234",
  "total_amount": 7500000,
  "deposit_required": 1500000,
  "confirmation_sent": true
}
```

##### `GET /api/bookings/calendar`
**Description:** Get bookings in calendar format for room planning  
**Parameters:**
- `start_date` (date, required): Calendar start date
- `end_date` (date, required): Calendar end date
- `room_ids` (array, optional): Filter specific rooms

**Response:**
```json
{
  "rooms": [
    {
      "id": "uuid",
      "room_number": "101",
      "room_type": "Deluxe"
    }
  ],
  "bookings": [
    {
      "id": "uuid",
      "room_id": "uuid",
      "customer_name": "John Doe",
      "start": "2024-01-20",
      "end": "2024-01-25",
      "status": "confirmed",
      "color": "#4CAF50",
      "nights": 5,
      "adults": 2,
      "children": 1
    }
  ],
  "availability_summary": {
    "2024-01-20": {
      "total_rooms": 20,
      "occupied": 15,
      "available": 5,
      "occupancy_rate": 75
    }
  }
}
```

##### `POST /api/bookings/{id}/check-in`
**Description:** Process guest check-in with validation  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "id_verification": {
    "type": "passport",
    "number": "A12345678",
    "verified": true
  },
  "room_condition_checked": true,
  "key_card_numbers": ["101-A", "101-B"],
  "welcome_drink_served": true,
  "deposit_collected": 1500000,
  "payment_method": "cash"
}
```
**Business Logic:**
1. Verify booking status is 'confirmed'
2. Validate check-in date (allow early check-in with note)
3. Update room status to 'occupied'
4. Record actual check-in time
5. Process deposit if not already paid
6. Generate and print registration card
7. Send welcome message to guest

##### `POST /api/bookings/{id}/check-out`
**Description:** Process guest checkout with final billing  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "room_condition": "good",
  "minibar_charges": 150000,
  "damage_charges": 0,
  "late_checkout_charge": 0,
  "payment_method": "credit_card",
  "invoice_required": true
}
```
**Business Logic:**
1. Calculate final bill including all charges
2. Deduct deposit from total
3. Process final payment
4. Update room status to 'cleaning'
5. Record actual checkout time
6. Generate final invoice if requested
7. Send thank you email with invoice
8. Update customer stay history

### 2.2.2 Booking Modifications

##### `PUT /api/bookings/{id}/extend`
**Description:** Extend stay for existing booking  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "new_check_out_date": "2024-01-27",
  "maintain_same_room": true
}
```
**Business Logic:**
1. Check room availability for extended dates
2. If room not available and maintain_same_room is false, find alternative
3. Calculate additional charges
4. Update booking dates and total amount
5. Send confirmation of extension

##### `POST /api/bookings/{id}/cancel`
**Description:** Cancel booking with refund calculation  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "reason": "Change of travel plans",
  "refund_amount": 1000000,
  "refund_method": "bank_transfer"
}
```
**Business Logic:**
1. Check cancellation policy based on days before check-in
2. Calculate refund amount:
   - > 7 days: 100% refund
   - 3-7 days: 50% refund
   - < 3 days: No refund
3. Process refund if applicable
4. Update room availability
5. Send cancellation confirmation

### 2.2.3 Booking Deposits

#### Database Schema
```sql
CREATE TABLE booking_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    received_date TIMESTAMP DEFAULT NOW(),
    received_by UUID REFERENCES users(id),
    refunded BOOLEAN DEFAULT false,
    refund_amount DECIMAL(10,2),
    refund_date TIMESTAMP,
    refund_ref VARCHAR(100),
    notes TEXT
);
```

##### `POST /api/bookings/{id}/deposit`
**Description:** Record deposit payment for booking  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "amount": 1500000,
  "payment_method": "bank_transfer",
  "transaction_ref": "TRX123456789",
  "notes": "50% advance payment"
}
```
**Business Logic:**
1. Validate amount doesn't exceed total booking amount
2. Record deposit transaction
3. Update booking deposit_amount and status to 'confirmed'
4. Generate deposit receipt
5. Send confirmation email with receipt

---

## 2.3 CUSTOMER MANAGEMENT MODULE

### 2.3.1 Customer Profile Management

#### Database Schema
```sql
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
    id_type VARCHAR(50), -- 'passport', 'national_id', 'driver_license'
    id_number VARCHAR(100),
    id_issue_date DATE,
    id_expiry_date DATE,
    id_images JSONB, -- ["front_url", "back_url"]
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    company_name VARCHAR(200),
    tax_id VARCHAR(50),
    customer_type VARCHAR(20), -- 'individual', 'corporate', 'vip', 'blacklist'
    vip_level INTEGER DEFAULT 0, -- 0-5 scale
    preferences JSONB, 
    -- {
    --   "room_preference": ["high_floor", "quiet"],
    --   "bed_type": "king",
    --   "pillow_type": "soft",
    --   "newspaper": "NYT",
    --   "allergies": ["peanuts", "shellfish"],
    --   "dietary": ["vegetarian"],
    --   "special_needs": "wheelchair_access"
    -- }
    tags TEXT[], -- ['returning', 'vip', 'business', 'long_stay']
    total_stays INTEGER DEFAULT 0,
    total_nights INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_spent DECIMAL(10,2) DEFAULT 0,
    last_stay_date DATE,
    loyalty_points INTEGER DEFAULT 0,
    marketing_consent BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    blacklisted_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for search performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(full_name);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_type ON customers(customer_type);
```

#### API Functions

##### `POST /api/customers`
**Description:** Create new customer profile with duplicate check  
**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+84901234567",
  "date_of_birth": "1990-01-15",
  "nationality": "USA",
  "id_type": "passport",
  "id_number": "A12345678",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA",
  "preferences": {
    "room_preference": ["high_floor", "quiet"],
    "allergies": ["peanuts"]
  },
  "customer_type": "individual",
  "marketing_consent": true
}
```
**Business Logic:**
1. Check for duplicates by email/phone
2. Generate customer code (format: `C{YYYY}{XXXXX}`)
3. Validate email format and phone number
4. If corporate customer, require tax_id
5. Set initial VIP level based on rules
6. Send welcome email if marketing_consent is true

##### `GET /api/customers/search`
**Description:** Advanced customer search with multiple criteria  
**Parameters:**
- `q` (string, optional): Search in name, email, phone, customer_code
- `customer_type` (string, optional): Filter by type
- `vip_only` (boolean, optional): Show only VIP customers
- `has_stayed_after` (date, optional): Customers who stayed after date
- `min_spent` (decimal, optional): Minimum total spent
- `tags` (array, optional): Filter by tags

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "customer_code": "C20240001",
      "full_name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+84901234567",
      "customer_type": "vip",
      "vip_level": 3,
      "total_stays": 15,
      "total_spent": 45000000,
      "last_stay_date": "2024-01-10",
      "tags": ["returning", "vip", "business"]
    }
  ]
}
```

##### `GET /api/customers/{id}/history`
**Description:** Get complete customer stay history  
**Parameters:**
- `id` (UUID, required): Customer ID
- `include_cancelled` (boolean, optional): Include cancelled bookings

**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "full_name": "John Doe",
    "total_stays": 15,
    "total_spent": 45000000,
    "loyalty_points": 4500
  },
  "stays": [
    {
      "booking_id": "uuid",
      "booking_code": "BK202401201234",
      "check_in": "2024-01-10",
      "check_out": "2024-01-15",
      "room": "101",
      "total_amount": 7500000,
      "feedback_score": 4.5,
      "feedback_comment": "Great stay!"
    }
  ],
  "preferences_analysis": {
    "preferred_room_type": "Deluxe",
    "average_stay_length": 5,
    "preferred_season": "winter",
    "common_requests": ["late_checkout", "airport_transfer"]
  }
}
```

##### `POST /api/customers/{id}/documents`
**Description:** Upload customer identification documents  
**Parameters:**
- `id` (UUID, required): Customer ID
**Request:** Multipart form data with document images
**Process:**
1. Validate file types (jpg, png, pdf)
2. Extract text from ID using OCR (optional)
3. Upload to R2: `customers/{customer_id}/documents/{type}_{timestamp}.{ext}`
4. Encrypt sensitive documents
5. Update customer record with document URLs

##### `PUT /api/customers/{id}/preferences`
**Description:** Update customer preferences and special requirements  
**Parameters:**
- `id` (UUID, required): Customer ID
**Request Body:**
```json
{
  "preferences": {
    "room_preference": ["high_floor", "away_from_elevator"],
    "bed_type": "twin",
    "wake_up_call": "07:00",
    "do_not_disturb": ["14:00-16:00"],
    "minibar_preferences": ["no_alcohol"],
    "allergies": ["seafood", "dairy"],
    "special_occasions": [
      {
        "date": "01-15",
        "occasion": "birthday"
      }
    ]
  }
}
```

---

## 2.4 INVENTORY & SERVICES MODULE

### 2.4.1 Product and Service Management

#### Database Schema
```sql
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- 'product', 'service'
    parent_id UUID REFERENCES product_categories(id),
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    product_type VARCHAR(20), -- 'goods', 'service'
    unit VARCHAR(50), -- 'piece', 'bottle', 'hour', 'day', 'kg', 'gram'
    selling_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    wholesale_price DECIMAL(10,2),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_included BOOLEAN DEFAULT false,
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    reorder_point INTEGER,
    track_inventory BOOLEAN DEFAULT true,
    allow_negative_stock BOOLEAN DEFAULT false,
    image_url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    can_be_purchased BOOLEAN DEFAULT true, -- for POS
    can_be_sold_separately BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100), -- 'NET30', 'COD', 'NET15'
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_suppliers (
    product_id UUID REFERENCES products(id),
    supplier_id UUID REFERENCES suppliers(id),
    supplier_sku VARCHAR(100),
    cost_price DECIMAL(10,2),
    lead_time_days INTEGER,
    min_order_quantity INTEGER,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (product_id, supplier_id)
);
```

#### API Functions

##### `POST /api/products`
**Description:** Create new product/service with inventory initialization  
**Request Body:**
```json
{
  "sku": "BEV-001",
  "name": "Coca Cola 330ml",
  "category_id": "uuid",
  "product_type": "goods",
  "unit": "bottle",
  "selling_price": 25000,
  "cost_price": 15000,
  "tax_rate": 10,
  "track_inventory": true,
  "min_stock": 20,
  "reorder_point": 30,
  "initial_stock": 100,
  "supplier_id": "uuid"
}
```
**Business Logic:**
1. Generate SKU if not provided
2. Validate pricing (selling_price > cost_price)
3. Create initial inventory transaction if initial_stock > 0
4. Set up supplier relationship
5. Calculate profit margin
6. Upload product image to R2 if provided

##### `GET /api/products/low-stock`
**Description:** Get products below reorder point  
**Response:**
```json
{
  "critical": [ // Below min_stock
    {
      "id": "uuid",
      "sku": "BEV-001",
      "name": "Coca Cola 330ml",
      "current_stock": 5,
      "min_stock": 20,
      "suggested_order": 100,
      "primary_supplier": "ABC Distributors"
    }
  ],
  "warning": [ // Below reorder_point
    {
      "id": "uuid",
      "sku": "SNK-001",
      "name": "Pringles Original",
      "current_stock": 25,
      "reorder_point": 30,
      "suggested_order": 50
    }
  ]
}
```

### 2.4.2 Inventory Transactions

#### Database Schema
```sql
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, 
    -- 'purchase', 'sale', 'adjustment', 'transfer', 'damage', 'return', 'consumption'
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL, -- positive for IN, negative for OUT
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    balance_before INTEGER,
    balance_after INTEGER,
    reference_type VARCHAR(50), 
    -- 'purchase_order', 'invoice', 'booking', 'pos_sale', 'stock_take'
    reference_id UUID,
    supplier_id UUID REFERENCES suppliers(id),
    batch_number VARCHAR(50),
    expiry_date DATE,
    location VARCHAR(100), -- storage location
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'sent', 'partial', 'received', 'cancelled'
    received_date TIMESTAMP,
    invoice_number VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    notes TEXT
);
```

#### API Functions

##### `POST /api/inventory/purchase`
**Description:** Record inventory purchase/stock in  
**Request Body:**
```json
{
  "supplier_id": "uuid",
  "invoice_number": "INV-2024-001",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 100,
      "unit_price": 15000,
      "batch_number": "BATCH-001",
      "expiry_date": "2024-12-31"
    }
  ],
  "payment_method": "bank_transfer",
  "notes": "Monthly stock replenishment"
}
```
**Business Logic:**
1. Create purchase order record
2. For each item:
   - Create inventory transaction (type: 'purchase')
   - Update product current_stock
   - Update cost_price with weighted average
   - Record batch information for tracking
3. Update supplier transaction history
4. Create accounts payable entry if not paid immediately

##### `POST /api/inventory/adjustment`
**Description:** Adjust inventory after physical count  
**Request Body:**
```json
{
  "adjustment_date": "2024-01-15",
  "reason": "monthly_stock_take",
  "items": [
    {
      "product_id": "uuid",
      "system_quantity": 100,
      "actual_quantity": 95,
      "reason": "damage",
      "notes": "5 bottles broken"
    }
  ]
}
```
**Business Logic:**
1. Calculate variance for each item
2. Create adjustment transactions
3. Update product stock levels
4. Generate variance report
5. Notify if variance exceeds threshold (e.g., 5%)

##### `GET /api/inventory/valuation`
**Description:** Get current inventory valuation report  
**Parameters:**
- `category_id` (UUID, optional): Filter by category
- `method` (string, optional): Valuation method (FIFO, weighted_average)

**Response:**
```json
{
  "summary": {
    "total_items": 150,
    "total_quantity": 5000,
    "total_cost_value": 75000000,
    "total_retail_value": 125000000,
    "potential_profit": 50000000
  },
  "by_category": [
    {
      "category": "Beverages",
      "items": 50,
      "quantity": 2000,
      "cost_value": 30000000,
      "retail_value": 50000000
    }
  ],
  "items": [
    {
      "sku": "BEV-001",
      "name": "Coca Cola 330ml",
      "quantity": 100,
      "unit_cost": 15000,
      "total_cost": 1500000,
      "retail_price": 25000,
      "total_retail": 2500000
    }
  ]
}
```

---

## 2.5 BILLING & PAYMENT MODULE

### 2.5.1 Invoice Management

#### Database Schema
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(20), -- 'room', 'service', 'pos', 'combined'
    booking_id UUID REFERENCES bookings(id),
    customer_id UUID REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE,
    currency VARCHAR(3) DEFAULT 'VND',
    exchange_rate DECIMAL(10,4) DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    service_charge DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT,
    rounding_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'
    payment_terms VARCHAR(100),
    notes TEXT,
    internal_notes TEXT,
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(20), -- 'room', 'product', 'service', 'custom'
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    service_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    payment_method VARCHAR(50),
    -- 'cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'voucher'
    payment_details JSONB,
    -- {
    --   "card_last_4": "1234",
    --   "card_type": "visa",
    --   "bank_name": "VCB",
    --   "reference": "TRX123456"
    -- }
    reference_number VARCHAR(100),
    payment_date TIMESTAMP DEFAULT NOW(),
    received_by UUID REFERENCES users(id),
    notes TEXT,
    is_deposit BOOLEAN DEFAULT false,
    is_refund BOOLEAN DEFAULT false,
    refund_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### API Functions

##### `POST /api/bookings/{id}/charges`
**Description:** Add service charges to guest folio  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 50000,
      "service_date": "2024-01-21",
      "charge_type": "immediate", // or "on_checkout"
      "notes": "Room service - Breakfast"
    }
  ],
  "payment_method": "room_charge", // or specific payment method
  "authorization": {
    "authorized_by": "John Smith",
    "authorization_code": "AUTH123"
  }
}
```
**Business Logic:**
1. Validate booking is checked-in
2. Check product availability if inventory tracked
3. Calculate item totals with tax
4. If charge_type is 'immediate', create payment record
5. If charge_type is 'on_checkout', add to folio
6. Update inventory if product tracked
7. Log transaction with timestamp and user

##### `GET /api/bookings/{id}/folio`
**Description:** Get complete guest folio with all charges  
**Parameters:**
- `id` (UUID, required): Booking ID

**Response:**
```json
{
  "booking": {
    "id": "uuid",
    "booking_code": "BK202401201234",
    "guest_name": "John Doe",
    "room": "101",
    "check_in": "2024-01-20",
    "check_out": "2024-01-25"
  },
  "charges": {
    "room_charges": [
      {
        "date": "2024-01-20",
        "description": "Deluxe Room",
        "amount": 1500000
      }
    ],
    "service_charges": [
      {
        "date": "2024-01-21",
        "description": "Laundry Service",
        "quantity": 1,
        "amount": 100000
      }
    ],
    "minibar_charges": [
      {
        "date": "2024-01-21",
        "description": "Coca Cola 330ml",
        "quantity": 2,
        "amount": 50000
      }
    ]
  },
  "payments": [
    {
      "date": "2024-01-20",
      "description": "Deposit",
      "amount": 1500000,
      "method": "cash"
    }
  ],
  "summary": {
    "total_room_charges": 7500000,
    "total_service_charges": 250000,
    "total_charges": 7750000,
    "total_payments": 1500000,
    "balance_due": 6250000
  }
}
```

##### `POST /api/bookings/{id}/checkout`
**Description:** Process complete checkout with final payment  
**Parameters:**
- `id` (UUID, required): Booking ID
**Request Body:**
```json
{
  "final_charges": [
    {
      "description": "Late checkout fee",
      "amount": 500000
    }
  ],
  "payment": {
    "method": "credit_card",
    "amount": 6750000,
    "card_details": {
      "last_4": "1234",
      "card_type": "visa",
      "authorization_code": "AUTH789"
    }
  },
  "invoice_details": {
    "company_name": "ABC Corp",
    "tax_id": "0123456789",
    "email": "finance@abc.com",
    "send_invoice": true
  }
}
```
**Business Logic:**
1. Lock folio for modifications
2. Add any final charges
3. Calculate final total
4. Process payment with payment gateway
5. Generate invoice with sequential number
6. Update room status to 'cleaning'
7. Update booking status to 'checked_out'
8. Send invoice via email if requested
9. Update customer loyalty points
10. Trigger housekeeping notification

### 2.5.2 Payment Processing

##### `POST /api/payments/process`
**Description:** Process payment with multiple payment methods  
**Request Body:**
```json
{
  "invoice_id": "uuid",
  "payments": [
    {
      "method": "cash",
      "amount": 3000000
    },
    {
      "method": "credit_card",
      "amount": 4000000,
      "card_details": {
        "number": "4111111111111111",
        "expiry": "12/25",
        "cvv": "123",
        "name": "John Doe"
      }
    }
  ],
  "send_receipt": true
}
```
**Business Logic:**
1. Validate total payment equals invoice balance
2. For credit card:
   - Process with payment gateway
   - Store transaction ID
   - Handle declined transactions
3. For cash:
   - Check cash drawer is open
   - Calculate change if needed
4. Update invoice status
5. Generate receipt
6. Send receipt via email/SMS if requested

##### `POST /api/payments/{id}/refund`
**Description:** Process payment refund  
**Parameters:**
- `id` (UUID, required): Payment ID
**Request Body:**
```json
{
  "refund_amount": 1000000,
  "reason": "Service not satisfactory",
  "refund_method": "original", // or specify different method
  "approval": {
    "approved_by": "Manager Name",
    "approval_code": "MGR123"
  }
}
```
**Business Logic:**
1. Validate refund amount <= original payment
2. Check manager approval for refunds > threshold
3. Process refund based on original payment method
4. Create refund transaction record
5. Update invoice balance
6. Send refund confirmation
7. Log in audit trail

---

## 2.6 POINT OF SALE (POS) MODULE

### 2.6.1 POS Operations

#### Database Schema
```sql
CREATE TABLE pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    terminal_id VARCHAR(50),
    user_id UUID REFERENCES users(id),
    opening_balance DECIMAL(10,2) NOT NULL,
    closing_balance DECIMAL(10,2),
    expected_balance DECIMAL(10,2),
    difference DECIMAL(10,2),
    cash_sales DECIMAL(10,2) DEFAULT 0,
    card_sales DECIMAL(10,2) DEFAULT 0,
    other_sales DECIMAL(10,2) DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    opened_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'suspended'
    notes TEXT
);

CREATE TABLE pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    session_id UUID REFERENCES pos_sessions(id),
    customer_id UUID REFERENCES customers(id),
    transaction_type VARCHAR(20), -- 'sale', 'refund', 'void'
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_details JSONB,
    change_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    voided BOOLEAN DEFAULT false,
    void_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id),
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT
);
```

#### API Functions

##### `POST /api/pos/sessions/open`
**Description:** Open new POS session for cash management  
**Request Body:**
```json
{
  "terminal_id": "POS-01",
  "opening_balance": 500000,
  "notes": "Morning shift"
}
```
**Business Logic:**
1. Check no active session for terminal
2. Create session with unique number
3. Record opening timestamp
4. Set user from authentication
5. Initialize cash drawer

##### `POST /api/pos/transactions`
**Description:** Process POS sale transaction  
**Request Body:**
```json
{
  "customer_id": "uuid", // optional
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "discount_percent": 10
    }
  ],
  "payment": {
    "method": "cash",
    "received_amount": 100000,
    "change_amount": 25000
  }
}
```
**Business Logic:**
1. Validate session is open
2. Check product availability
3. Calculate totals with tax
4. Apply discounts
5. Process payment
6. Update inventory
7. Generate receipt number
8. Print/email receipt
9. Update session totals

##### `POST /api/pos/transactions/{id}/void`
**Description:** Void a completed transaction  
**Parameters:**
- `id` (UUID, required): Transaction ID
**Request Body:**
```json
{
  "reason": "Customer changed mind",
  "supervisor_code": "SUP123"
}
```
**Business Logic:**
1. Verify supervisor authorization
2. Check transaction can be voided (same day)
3. Reverse inventory changes
4. Create void record
5. Update session totals
6. Process refund if payment was made

##### `POST /api/pos/sessions/{id}/close`
**Description:** Close POS session with reconciliation  
**Parameters:**
- `id` (UUID, required): Session ID
**Request Body:**
```json
{
  "counted_cash": 3500000,
  "card_receipts": 2000000,
  "notes": "Short 50000 - investigating"
}
```
**Business Logic:**
1. Calculate expected balance
2. Record actual counted amounts
3. Calculate variance
4. Generate session report
5. Create cash reconciliation record
6. Alert if variance exceeds threshold

---

## 2.7 REPORTING & ANALYTICS MODULE

### 2.7.1 Report Generation

#### API Functions

##### `GET /api/reports/daily-summary`
**Description:** Get comprehensive daily operations summary  
**Parameters:**
- `date` (date, required): Report date

**Response:**
```json
{
  "date": "2024-01-21",
  "occupancy": {
    "total_rooms": 20,
    "occupied": 15,
    "rate": 75,
    "arrivals": 5,
    "departures": 3,
    "in_house": 12,
    "no_shows": 0
  },
  "revenue": {
    "room_revenue": 22500000,
    "service_revenue": 3500000,
    "pos_revenue": 1500000,
    "total": 27500000,
    "compared_to_yesterday": "+15%",
    "compared_to_last_week": "+8%"
  },
  "operations": {
    "rooms_to_clean": 8,
    "maintenance_issues": 2,
    "pending_checkouts": 3,
    "vip_guests": 2
  },
  "top_services": [
    {
      "name": "Laundry",
      "count": 8,
      "revenue": 800000
    }
  ]
}
```

##### `GET /api/reports/revenue`
**Description:** Detailed revenue analysis report  
**Parameters:**
- `start_date` (date, required): Start date
- `end_date` (date, required): End date
- `group_by` (string, optional): 'day', 'week', 'month'
- `breakdown` (boolean, optional): Include category breakdown

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "total_revenue": 825000000,
    "room_revenue": 650000000,
    "service_revenue": 125000000,
    "pos_revenue": 50000000,
    "average_daily_rate": 1650000,
    "revenue_per_available_room": 1237500
  },
  "breakdown": {
    "by_room_type": [
      {
        "type": "Deluxe",
        "revenue": 400000000,
        "percentage": 61.5,
        "nights_sold": 250
      }
    ],
    "by_source": [
      {
        "source": "Direct",
        "revenue": 500000000,
        "percentage": 60.6,
        "bookings": 120
      }
    ]
  },
  "trend": [
    {
      "date": "2024-01-01",
      "room": 21000000,
      "service": 4000000,
      "pos": 1500000,
      "total": 26500000
    }
  ]
}
```

##### `GET /api/reports/occupancy`
**Description:** Room occupancy analysis  
**Parameters:**
- `year` (integer, required): Year
- `month` (integer, optional): Specific month

**Response:**
```json
{
  "monthly_stats": [
    {
      "month": "2024-01",
      "occupancy_rate": 75.5,
      "adr": 1650000, // Average Daily Rate
      "revpar": 1245750, // Revenue Per Available Room
      "total_nights_sold": 465,
      "total_nights_available": 620
    }
  ],
  "by_day_of_week": {
    "monday": 65.2,
    "tuesday": 68.5,
    "wednesday": 70.1,
    "thursday": 72.8,
    "friday": 85.5,
    "saturday": 92.3,
    "sunday": 88.7
  },
  "forecast": {
    "next_30_days": 78.5,
    "next_60_days": 76.2,
    "next_90_days": 74.8
  }
}
```

##### `GET /api/reports/export`
**Description:** Export report to Excel format  
**Parameters:**
- `report_type` (string, required): Type of report
- `format` (string, optional): 'excel', 'csv', 'pdf'
- Additional parameters based on report type

**Process:**
1. Generate report data
2. Format according to requested type
3. Create Excel/CSV with proper formatting
4. Return file download URL

### 2.7.2 Dashboard Real-time Data

##### `GET /api/dashboard/live`
**Description:** Get real-time dashboard data  
**Response:**
```json
{
  "current_time": "2024-01-21T14:30:00Z",
  "live_occupancy": {
    "occupied": 15,
    "total": 20,
    "percentage": 75
  },
  "today_activities": {
    "expected_arrivals": [
      {
        "booking_id": "uuid",
        "guest_name": "John Doe",
        "room": "101",
        "eta": "15:00",
        "status": "on_time"
      }
    ],
    "expected_departures": [
      {
        "booking_id": "uuid",
        "guest_name": "Jane Smith",
        "room": "205",
        "checkout_time": "12:00",
        "status": "checked_out"
      }
    ],
    "in_house_guests": 32
  },
  "alerts": [
    {
      "type": "late_arrival",
      "message": "Guest John Doe expected at 14:00, not arrived yet",
      "severity": "warning"
    },
    {
      "type": "low_stock",
      "message": "Coca Cola stock below minimum",
      "severity": "info"
    }
  ],
  "quick_stats": {
    "today_revenue": 27500000,
    "pending_payments": 3500000,
    "rooms_to_clean": 5,
    "maintenance_requests": 2
  }
}
```

---

## 2.8 USER MANAGEMENT & AUTHORIZATION MODULE

### 2.8.1 User and Role Management

#### Database Schema (Supabase)
```sql
-- Extend Supabase auth.users
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    employee_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    -- 'admin', 'manager', 'receptionist', 'accountant', 'housekeeper', 'pos_operator'
    permissions JSONB,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    -- 'rooms', 'bookings', 'customers', 'inventory', 'billing', 'pos', 'reports', 'settings'
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    custom_permissions JSONB,
    UNIQUE(role, module)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    -- 'create', 'update', 'delete', 'view', 'export', 'login', 'logout'
    module VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security Policies
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON user_profiles FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Users can access based on permissions"
ON bookings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN role_permissions rp ON up.role = rp.role
        WHERE up.id = auth.uid()
        AND rp.module = 'bookings'
        AND rp.can_view = true
    )
);
```

#### API Functions

##### `POST /api/users`
**Description:** Create new system user  
**Request Body:**
```json
{
  "email": "user@hotel.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "employee_id": "EMP001",
  "role": "receptionist",
  "department": "Front Office",
  "position": "Front Desk Agent",
  "phone": "+84901234567"
}
```
**Business Logic:**
1. Create Supabase auth user
2. Create user profile with role
3. Assign default permissions based on role
4. Send welcome email with credentials
5. Log user creation in audit

##### `PUT /api/users/{id}/permissions`
**Description:** Update user permissions  
**Parameters:**
- `id` (UUID, required): User ID
**Request Body:**
```json
{
  "role": "manager",
  "custom_permissions": {
    "can_approve_refunds": true,
    "max_discount_percent": 20,
    "can_void_transactions": true,
    "can_access_reports": ["daily", "occupancy"],
    "restricted_modules": ["settings"]
  }
}
```

##### `GET /api/users/{id}/activity`
**Description:** Get user activity log  
**Parameters:**
- `id` (UUID, required): User ID
- `start_date` (date, optional): Filter from date
- `end_date` (date, optional): Filter to date

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "role": "receptionist",
    "last_login": "2024-01-21T08:00:00Z"
  },
  "activities": [
    {
      "timestamp": "2024-01-21T10:30:00Z",
      "action": "create",
      "module": "bookings",
      "description": "Created booking BK202401211234",
      "entity_id": "uuid",
      "ip_address": "192.168.1.100"
    }
  ],
  "statistics": {
    "total_actions": 150,
    "bookings_created": 45,
    "check_ins_processed": 38,
    "reports_generated": 12
  }
}
```

### 2.8.2 Authentication & Session Management

##### `POST /api/auth/login`
**Description:** User login with session creation  
**Request Body:**
```json
{
  "email": "user@hotel.com",
  "password": "SecurePass123!",
  "remember_me": true
}
```
**Business Logic:**
1. Authenticate with Supabase
2. Check user is_active status
3. Create session in Redis
4. Log login activity
5. Return JWT token and refresh token

##### `POST /api/auth/refresh`
**Description:** Refresh authentication token  
**Request Body:**
```json
{
  "refresh_token": "refresh_token_string"
}
```

##### `POST /api/auth/logout`
**Description:** Logout and invalidate session  
**Business Logic:**
1. Invalidate JWT token
2. Remove Redis session
3. Log logout activity

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance Requirements
- **Response Time:** API responses < 500ms for 95% of requests
- **Concurrent Users:** Support minimum 50 concurrent users
- **Database:** Connection pooling with max 20 connections
- **Caching:** Redis caching for frequently accessed data (room availability, rates)
- **Page Load:** Initial page load < 2 seconds, subsequent < 1 second
- **File Upload:** Support files up to 10MB for images, 50MB for documents

### 3.2 Security Requirements
- **Authentication:** JWT-based with 15-minute access token, 7-day refresh token
- **Authorization:** Role-based access control (RBAC) with granular permissions
- **Encryption:** AES-256 for sensitive data at rest, TLS 1.3 for data in transit
- **Password Policy:** Minimum 8 characters, uppercase, lowercase, number, special character
- **Session Management:** Automatic logout after 30 minutes of inactivity
- **API Security:** Rate limiting (100 requests/minute per IP), CORS configuration
- **Audit Trail:** Log all data modifications and sensitive operations
- **PCI Compliance:** For credit card processing
- **GDPR Compliance:** Data anonymization, right to deletion

### 3.3 Reliability & Availability
- **Uptime:** 99.9% availability (maximum 8.76 hours downtime/year)
- **Backup:** Automated daily backups, 30-day retention
- **Disaster Recovery:** RPO < 1 hour, RTO < 4 hours
- **Error Handling:** Graceful degradation, user-friendly error messages
- **Monitoring:** Real-time monitoring with alerts for critical issues

### 3.4 Scalability
- **Horizontal Scaling:** Microservices architecture ready
- **Database:** Supabase auto-scaling capabilities
- **Load Balancing:** Cloudflare Workers for distributed load
- **Caching Strategy:** Multi-layer caching (Redis, CDN, browser)
- **API Design:** RESTful with pagination, filtering, and selective field returns

### 3.5 Usability Requirements
- **Responsive Design:** Mobile, tablet, and desktop support
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Accessibility:** WCAG 2.1 Level AA compliance
- **Localization:** Support for Vietnamese and English
- **Offline Mode:** Critical functions available offline with sync
- **Keyboard Navigation:** Full keyboard support for power users

### 3.6 Development & Deployment
- **Version Control:** Git with GitFlow branching strategy
- **CI/CD:** Automated testing and deployment pipeline
- **Environment:** Development, Staging, Production
- **Documentation:** API documentation with OpenAPI/Swagger
- **Code Quality:** ESLint, Prettier, Python Black formatting
- **Testing Coverage:** Minimum 80% code coverage

---

## 4. TECHNICAL IMPLEMENTATION DETAILS

### 4.1 Backend Architecture (Python/FastAPI)

#### 4.1.1 Project Structure
```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── rooms.py
│   │   │   │   ├── bookings.py
│   │   │   │   ├── customers.py
│   │   │   │   ├── inventory.py
│   │   │   │   ├── billing.py
│   │   │   │   ├── pos.py
│   │   │   │   ├── reports.py
│   │   │   │   └── users.py
│   │   │   └── api.py
│   │   └── deps.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── database.py
│   │   └── redis.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── room.py
│   │   ├── booking.py
│   │   ├── customer.py
│   │   ├── product.py
│   │   ├── invoice.py
│   │   └── user.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── room.py
│   │   ├── booking.py
│   │   └── ...
│   ├── services/
│   │   ├── room_service.py
│   │   ├── booking_service.py
│   │   ├── email_service.py
│   │   ├── pdf_service.py
│   │   └── payment_service.py
│   ├── utils/
│   │   ├── validators.py
│   │   ├── formatters.py
│   │   └── calculations.py
│   └── main.py
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── requirements.txt
├── .env.example
└── Dockerfile
```

#### 4.1.2 Core Configuration
```python
# app/core/config.py
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Homestay Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Cloudflare R2
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY: str
    R2_SECRET_KEY: str
    R2_BUCKET_NAME: str
    
    # SMTP
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM: str
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 4.1.3 Database Connection
```python
# app/core/database.py
from supabase import create_client, Client
from .config import settings

def get_supabase() -> Client:
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )

# Redis connection
import redis
from .config import settings

redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)
```

#### 4.1.4 Authentication Middleware
```python
# app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

def require_permission(module: str, action: str):
    async def permission_checker(
        user_id: str = Depends(get_current_user)
    ):
        # Check user permissions from database
        # Implementation here
        pass
    return permission_checker
```

### 4.2 Frontend Architecture (React + Shadcn/ui)

#### 4.2.1 Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── common/
│   │       ├── DataTable.tsx
│   │       ├── Calendar.tsx
│   │       └── Charts.tsx
│   ├── features/
│   │   ├── rooms/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── types/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── billing/
│   │   ├── pos/
│   │   └── reports/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useWebSocket.ts
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/
│   ├── stores/
│   │   ├── auth.store.ts
│   │   └── app.store.ts
│   ├── styles/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml
```

#### 4.2.2 API Client Setup
```typescript
// src/lib/api-client.ts
import axios from 'axios';
import { getAuthToken, refreshToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await refreshToken();
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 4.2.3 TanStack Query Setup
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Example hook
// src/features/rooms/hooks/useRooms.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, createRoom, updateRoom } from '../api/roomsApi';

export const useRooms = (filters?: RoomFilters) => {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => getRooms(filters),
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};
```

#### 4.2.4 Zustand Store Example
```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      login: (user) => set({ user, isAuthenticated: true }),
      
      logout: () => set({ user: null, isAuthenticated: false }),
      
      hasPermission: (module, action) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions.includes(`${module}:${action}`);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### 4.3 Deployment Configuration

#### 4.3.1 Docker Configuration
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4.3.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - REDIS_URL=redis://redis:6379
      - R2_ACCESS_KEY=${R2_ACCESS_KEY}
      - R2_SECRET_KEY=${R2_SECRET_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### 4.3.3 Cloudflare Workers Configuration
```toml
# frontend/wrangler.toml
name = "homestay-frontend"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[env.production]
vars = { API_URL = "https://api.farmstay.space" }

[env.staging]
vars = { API_URL = "https://staging-api.farmstay.space" }
```

### 4.4 Database Migrations

#### 4.4.1 Initial Schema Migration
```sql
-- migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE room_status AS ENUM (
    'available', 'booked', 'occupied', 
    'cleaning', 'maintenance', 'blocked'
);

CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'checked_in', 
    'checked_out', 'cancelled', 'no_show'
);

CREATE TYPE payment_method AS ENUM (
    'cash', 'bank_transfer', 'credit_card', 
    'debit_card', 'e_wallet', 'voucher'
);

-- Create tables (as defined in sections above)
-- ... (all CREATE TABLE statements from previous sections)

-- Create indexes for performance
CREATE INDEX idx_bookings_date_range ON bookings 
    USING BTREE (check_in_date, check_out_date);
CREATE INDEX idx_customers_search ON customers 
    USING GIN (to_tsvector('english', full_name || ' ' || email || ' ' || phone));
CREATE INDEX idx_products_sku ON products USING BTREE (sku);
CREATE INDEX idx_invoices_status ON invoices USING BTREE (status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... (repeat for other tables)
```

### 4.5 Testing Strategy

#### 4.5.1 Backend Testing
```python
# tests/unit/test_booking_service.py
import pytest
from datetime import date, timedelta
from app.services.booking_service import BookingService

class TestBookingService:
    @pytest.fixture
    def booking_service(self):
        return BookingService()
    
    def test_calculate_room_charges(self, booking_service):
        check_in = date.today()
        check_out = check_in + timedelta(days=3)
        base_rate = 1500000
        
        charges = booking_service.calculate_room_charges(
            check_in, check_out, base_rate
        )
        
        assert charges['total_nights'] == 3
        assert charges['total_amount'] == base_rate * 3
    
    def test_check_availability(self, booking_service):
        room_id = "test-room-id"
        check_in = date.today() + timedelta(days=1)
        check_out = check_in + timedelta(days=2)
        
        is_available = booking_service.check_availability(
            room_id, check_in, check_out
        )
        
        assert isinstance(is_available, bool)
```

#### 4.5.2 Frontend Testing
```typescript
// tests/components/RoomCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RoomCard } from '@/features/rooms/components/RoomCard';

describe('RoomCard', () => {
  it('renders room information correctly', () => {
    const room = {
      id: '1',
      room_number: '101',
      room_type: 'Deluxe',
      status: 'available',
      floor: 1,
      base_price: 1500000,
    };
    
    render(<RoomCard room={room} />);
    
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('Deluxe')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
```

### 4.6 Monitoring and Logging

#### 4.6.1 Application Logging
```python
# app/core/logger.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        if hasattr(record, 'user_id'):
            log_obj['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_obj['request_id'] = record.request_id
        return json.dumps(log_obj)

# Configure logger
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

#### 4.6.2 Performance Monitoring
```python
# app/middleware/monitoring.py
import time
from fastapi import Request
from app.core.logger import logger

async def log_requests(request: Request, call_next):
    start_time = time.time()
    request_id = request.headers.get('X-Request-ID', '')
    
    # Log request
    logger.info(
        "API Request",
        extra={
            'request_id': request_id,
            'method': request.method,
            'path': request.url.path,
            'client_ip': request.client.host,
        }
    )
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    logger.info(
        "API Response",
        extra={
            'request_id': request_id,
            'status_code': response.status_code,
            'duration': duration,
        }
    )
    
    return response
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Foundation 
**Week 1-2: Project Setup**
- [ ] Initialize repositories and CI/CD pipeline
- [ ] Set up Supabase project and authentication
- [ ] Configure Redis and Cloudflare R2
- [ ] Create base project structure
- [ ] Set up development environment

**Week 3-4: Core Modules**
- [ ] Implement Room Management APIs
- [ ] Create Room UI components
- [ ] Basic booking creation and listing
- [ ] Customer management CRUD
- [ ] Authentication and authorization

### Phase 2: Booking Operations
**Week 5-6: Booking Management**
- [ ] Calendar view implementation
- [ ] Booking modification features
- [ ] Check-in/check-out processes
- [ ] Room availability engine
- [ ] Deposit management

**Week 7-8: Communications**
- [ ] Email notification system
- [ ] PDF generation for confirmations
- [ ] Booking confirmation workflow
- [ ] Guest communication features

### Phase 3: Financial Features
**Week 9-10: Inventory & Services**
- [ ] Product/service management
- [ ] Inventory tracking system
- [ ] Purchase order management
- [ ] Stock alerts and reports

**Week 11-12: Billing & POS**
- [ ] Guest folio management
- [ ] POS interface and operations
- [ ] Payment processing
- [ ] Invoice generation
- [ ] Receipt printing

### Phase 4: Analytics & Reporting
**Week 13: Reports**
- [ ] Daily operations summary
- [ ] Revenue reports
- [ ] Occupancy analytics
- [ ] Financial reports
- [ ] Export functionality

**Week 14: Dashboard**
- [ ] Real-time dashboard
- [ ] Performance metrics
- [ ] Alert system
- [ ] Data visualization

### Phase 5: Optimization & Launch
**Week 15: Testing & Optimization**
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Bug fixes
- [ ] UI/UX improvements

**Week 16: Deployment & Training**
- [ ] Production deployment
- [ ] User training materials
- [ ] Documentation completion
- [ ] System handover
- [ ] Go-live support

---

## 6. SUCCESS METRICS

### 6.1 Technical Metrics
- API response time < 500ms (95th percentile)
- System uptime > 99.9%
- Zero critical security vulnerabilities
- Test coverage > 80%
- Page load time < 2 seconds

### 6.2 Business Metrics
- Reduce check-in time by 50%
- Reduce billing errors by 90%
- Increase occupancy rate by 15%
- Improve guest satisfaction score by 20%
- Achieve ROI within 8 months

### 6.3 User Adoption Metrics
- 100% staff trained within 2 weeks
- 90% feature adoption within 1 month
- User satisfaction score > 4.5/5
- Support tickets < 5 per week after 1 month

---

## 7. RISK MITIGATION

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Staff resistance to new system | High | High | Comprehensive training, phased rollout, champion users |
| Data migration issues | Medium | High | Thorough testing, parallel run, data validation |
| Integration failures | Low | High | API versioning, fallback mechanisms, monitoring |
| Performance degradation | Medium | Medium | Load testing, caching strategy, auto-scaling |
| Security breach | Low | Very High | Security audit, penetration testing, encryption |
| Internet connectivity issues | Medium | High | Offline mode, local caching, automatic sync |

---

## 8. APPENDICES

### Appendix A: API Documentation Template
```yaml
openapi: 3.0.0
info:
  title: Homestay Management API
  version: 1.0.0
  description: API for managing small hotels and homestays
servers:
  - url: https://api.farmstay.space/v1
paths:
  /rooms:
    get:
      summary: List all rooms
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [available, occupied, maintenance]
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Room'
```

### Appendix B: Database Backup Strategy
- **Frequency:** Daily automated backups at 2 AM
- **Retention:** 30 days for daily, 12 months for monthly
- **Storage:** Cloudflare R2 with encryption
- **Testing:** Monthly restore tests
- **Recovery:** Documented procedures with RTO < 4 hours

### Appendix C: Security Checklist
- [ ] HTTPS enforcement
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Secure password storage (bcrypt)
- [ ] Session management
- [ ] Audit logging
- [ ] Regular security updates
