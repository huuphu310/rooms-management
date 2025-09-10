# Room Management Module Specification

## 1. Overview

The Room Management module is designed with a clear separation between **Room Types** (templates) and **Rooms** (specific instances). This architecture allows for standardization while maintaining flexibility for individual room customization.

### Key Principles:
- **Room Types** define standard attributes shared by multiple rooms
- **Rooms** are specific instances with unique characteristics
- Pricing can be inherited from room type or customized per room
- Seasonal and dynamic pricing rules apply at the room type level

---

## 2. Database Schema

### 2.1 Room Types Table

Room types serve as templates that define common attributes for groups of rooms.

```sql
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- 'Standard', 'Deluxe', 'Suite'
    code VARCHAR(20) UNIQUE, -- 'STD', 'DLX', 'STE'
    
    -- Pricing (Standard pricing for room type)
    base_price DECIMAL(10,2) NOT NULL,
    weekend_price DECIMAL(10,2),
    holiday_price DECIMAL(10,2),
    extra_person_charge DECIMAL(10,2) DEFAULT 0,
    
    -- Capacity (Standard occupancy settings)
    standard_occupancy INTEGER DEFAULT 2, -- Standard number of guests
    max_occupancy INTEGER NOT NULL, -- Maximum guests allowed
    min_occupancy INTEGER DEFAULT 1, -- Minimum guests required
    max_adults INTEGER,
    max_children INTEGER,
    
    -- Physical specifications (Common physical attributes)
    size_sqm_from DECIMAL(6,2), -- Size range from
    size_sqm_to DECIMAL(6,2), -- Size range to
    
    -- Amenities & Features (Standard amenities)
    standard_amenities JSONB, -- ["wifi", "ac", "tv", "minibar"]
    bed_configuration TEXT, -- '1 King' or '2 Queens'
    bathroom_type VARCHAR(50), -- 'ensuite', 'shared'
    
    -- Display & Marketing
    description TEXT,
    short_description VARCHAR(500),
    features TEXT[],
    highlights TEXT[], -- Key selling points
    images JSONB, -- Sample images for room type
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- Policies
    cancellation_policy_id UUID,
    min_stay_nights INTEGER DEFAULT 1,
    max_stay_nights INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_room_types_active ON room_types(is_active);
CREATE INDEX idx_room_types_code ON room_types(code);
```

### 2.2 Rooms Table

Individual rooms with specific attributes that may override or extend room type settings.

```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL, -- '101', '102', 'A01'
    room_type_id UUID REFERENCES room_types(id) NOT NULL,
    
    -- Location specifics
    floor INTEGER,
    building VARCHAR(50), -- For multi-building properties
    wing VARCHAR(50), -- Wing/Section
    zone VARCHAR(50), -- Zone/Area
    view_type VARCHAR(50), -- 'sea', 'mountain', 'garden', 'city', 'pool'
    position VARCHAR(50), -- 'corner', 'center', 'end'
    
    -- Physical attributes (Actual measurements)
    actual_size_sqm DECIMAL(6,2), -- Actual size of this specific room
    ceiling_height_m DECIMAL(4,2),
    
    -- Room-specific features
    additional_amenities JSONB, -- Extra amenities beyond standard
    missing_amenities JSONB, -- Standard amenities not available
    special_features TEXT[], -- ['Balcony', 'Connecting door', 'Private entrance']
    connecting_room_id UUID REFERENCES rooms(id), -- For connecting rooms
    
    -- Accessibility & Preferences
    is_smoking BOOLEAN DEFAULT false,
    is_accessible BOOLEAN DEFAULT false, -- Wheelchair accessible
    is_pet_friendly BOOLEAN DEFAULT false,
    noise_level VARCHAR(20), -- 'quiet', 'moderate', 'street_facing'
    
    -- Override pricing (Optional custom pricing)
    custom_base_price DECIMAL(10,2), -- Overrides room type price
    price_modifier DECIMAL(5,2), -- Percentage modifier (+10%, -5%)
    price_modifier_reason TEXT, -- Explanation for price difference
    
    -- Status & Availability
    status VARCHAR(20) DEFAULT 'available',
    -- 'available', 'occupied', 'reserved', 'maintenance', 'cleaning', 'blocked'
    status_reason TEXT,
    status_until TIMESTAMP,
    long_term_status VARCHAR(20), -- 'active', 'renovation', 'out_of_service'
    
    -- Maintenance & Quality
    condition_score INTEGER CHECK (condition_score BETWEEN 1 AND 10),
    last_renovated_date DATE,
    last_deep_cleaned_date DATE,
    last_inspected_date DATE,
    next_maintenance_date DATE,
    maintenance_notes TEXT,
    
    -- Images (Room-specific photos)
    room_images JSONB,
    /* 
    [
        {
            "url": "https://...",
            "thumbnail": "https://...",
            "caption": "Sea view from balcony",
            "order": 1,
            "is_primary": true
        }
    ]
    */
    virtual_tour_url TEXT,
    
    -- Housekeeping
    housekeeping_notes TEXT,
    cleaning_duration_minutes INTEGER DEFAULT 30,
    cleaning_priority INTEGER DEFAULT 5,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);
CREATE INDEX idx_rooms_building ON rooms(building);
CREATE INDEX idx_rooms_view ON rooms(view_type);
CREATE INDEX idx_rooms_active ON rooms(is_active);
```

### 2.3 Seasonal Pricing

Dynamic pricing based on seasons and special periods.

```sql
CREATE TABLE room_type_seasonal_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES room_types(id),
    season_name VARCHAR(100), -- 'Summer Peak', 'Christmas', 'Tet Holiday'
    season_type VARCHAR(50), -- 'high', 'low', 'special_event'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Pricing adjustments
    rate_type VARCHAR(20), -- 'multiplier', 'fixed', 'addition'
    rate_multiplier DECIMAL(4,2), -- 1.5 = +50%, 0.8 = -20%
    fixed_rate DECIMAL(10,2), -- Absolute price
    rate_addition DECIMAL(10,2), -- Add to base price
    
    -- Constraints
    min_stay_nights INTEGER DEFAULT 1,
    max_stay_nights INTEGER,
    booking_window_start DATE, -- Can book from this date
    booking_window_end DATE, -- Can book until this date
    
    -- Days of week applicable
    applicable_days VARCHAR(7) DEFAULT '1111111', -- Binary for Mon-Sun
    
    priority INTEGER DEFAULT 0, -- Higher priority overrides lower
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_seasonal_rates_dates ON room_type_seasonal_rates(start_date, end_date);
CREATE INDEX idx_seasonal_rates_type ON room_type_seasonal_rates(room_type_id);
```

### 2.4 Dynamic Pricing Rules

Flexible pricing rules based on various conditions.

```sql
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scope VARCHAR(20), -- 'global', 'room_type', 'room'
    room_type_id UUID REFERENCES room_types(id), -- NULL for global rules
    room_id UUID REFERENCES rooms(id), -- NULL for non-room specific
    
    rule_type VARCHAR(50), 
    -- 'early_bird', 'last_minute', 'long_stay', 'occupancy_based', 'group_booking'
    
    -- Conditions (JSON for flexibility)
    conditions JSONB NOT NULL,
    /*
    {
        "booking_advance_days": {"min": 30, "max": 90},
        "stay_nights": {"min": 3, "max": 7},
        "occupancy_percentage": {"min": 80},
        "guest_count": {"min": 5},
        "applicable_days": ["mon", "tue", "wed", "thu"],
        "applicable_months": [1, 2, 11, 12],
        "customer_type": ["returning", "vip"],
        "booking_source": ["direct", "website"]
    }
    */
    
    -- Discount/Surcharge
    adjustment_type VARCHAR(20), -- 'discount', 'surcharge'
    adjustment_method VARCHAR(20), -- 'percentage', 'fixed_amount'
    adjustment_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2), -- Cap for percentage discounts
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    usage_limit INTEGER, -- Total times this rule can be used
    usage_count INTEGER DEFAULT 0,
    usage_per_customer INTEGER, -- Times per customer
    
    -- Stacking rules
    can_combine BOOLEAN DEFAULT false,
    exclude_rules UUID[], -- Array of rule IDs that cannot combine
    priority INTEGER DEFAULT 0,
    
    -- Status
    requires_code BOOLEAN DEFAULT false,
    promo_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_dates ON pricing_rules(valid_from, valid_to);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(room_type_id);
CREATE INDEX idx_pricing_rules_promo ON pricing_rules(promo_code);
```

### 2.5 Room Amenities Catalog

Master list of all possible amenities.

```sql
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 'basic', 'comfort', 'entertainment', 'business'
    icon VARCHAR(50), -- Icon class or name
    description TEXT,
    is_premium BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Many-to-many relationship for room type amenities
CREATE TABLE room_type_amenities (
    room_type_id UUID REFERENCES room_types(id),
    amenity_id UUID REFERENCES amenities(id),
    is_standard BOOLEAN DEFAULT true,
    is_paid BOOLEAN DEFAULT false,
    charge_amount DECIMAL(10,2),
    PRIMARY KEY (room_type_id, amenity_id)
);

-- Room-specific amenity overrides
CREATE TABLE room_amenities (
    room_id UUID REFERENCES rooms(id),
    amenity_id UUID REFERENCES amenities(id),
    is_available BOOLEAN DEFAULT true,
    is_working BOOLEAN DEFAULT true,
    notes TEXT,
    PRIMARY KEY (room_id, amenity_id)
);
```

---

## 3. API Endpoints

### 3.1 Room Types Management

#### GET /api/room-types
Retrieve all room types with filtering and pagination.

**Query Parameters:**
- `page` (integer): Page number for pagination
- `limit` (integer): Items per page (default: 20)
- `sort_by` (string): Sort field (name, base_price, created_at)
- `order` (string): Sort order (asc, desc)
- `is_active` (boolean): Filter by active status
- `min_price` (decimal): Minimum base price
- `max_price` (decimal): Maximum base price
- `min_capacity` (integer): Minimum occupancy

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Deluxe Ocean View",
      "code": "DLX-OV",
      "base_price": 2500000,
      "weekend_price": 3000000,
      "standard_occupancy": 2,
      "max_occupancy": 3,
      "size_sqm_from": 35,
      "size_sqm_to": 40,
      "standard_amenities": ["wifi", "ac", "tv", "minibar", "safe"],
      "bed_configuration": "1 King or 2 Queens",
      "available_rooms_count": 8,
      "occupied_rooms_count": 2,
      "images": [
        {
          "url": "https://r2.example.com/room-types/dlx-ov-1.jpg",
          "thumbnail": "https://r2.example.com/room-types/dlx-ov-1-thumb.jpg"
        }
      ]
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

#### POST /api/room-types
Create a new room type.

**Request Body:**
```json
{
  "name": "Deluxe Ocean View",
  "code": "DLX-OV",
  "base_price": 2500000,
  "weekend_price": 3000000,
  "holiday_price": 3500000,
  "extra_person_charge": 500000,
  "standard_occupancy": 2,
  "max_occupancy": 3,
  "min_occupancy": 1,
  "size_sqm_from": 35,
  "size_sqm_to": 40,
  "standard_amenities": ["wifi", "ac", "tv", "minibar", "safe"],
  "bed_configuration": "1 King or 2 Queens",
  "bathroom_type": "ensuite",
  "description": "Spacious room with stunning ocean views",
  "features": ["Ocean view", "Balcony", "Work desk", "Sitting area"]
}
```

**Validation Rules:**
- `name`: Required, max 100 characters
- `code`: Required, unique, max 20 characters
- `base_price`: Required, must be positive
- `max_occupancy`: Required, must be between 1-10
- `standard_occupancy`: Must be <= max_occupancy

#### PUT /api/room-types/{id}
Update an existing room type.

**Parameters:**
- `id` (UUID): Room type ID

**Request Body:** Same as POST

**Business Logic:**
- Updates affect future bookings only
- Existing bookings maintain their original pricing
- If rooms exist with this type, validate compatibility

#### DELETE /api/room-types/{id}
Soft delete a room type.

**Parameters:**
- `id` (UUID): Room type ID

**Business Logic:**
- Cannot delete if active rooms exist
- Sets `is_active = false`
- Existing bookings remain unaffected

### 3.2 Rooms Management

#### GET /api/rooms
List all rooms with advanced filtering.

**Query Parameters:**
- `status` (string): Filter by room status
- `floor` (integer): Filter by floor number
- `building` (string): Filter by building
- `room_type_id` (UUID): Filter by room type
- `view_type` (string): Filter by view type
- `is_accessible` (boolean): Wheelchair accessible rooms
- `is_smoking` (boolean): Smoking rooms
- `available_from` (date): Check availability from date
- `available_to` (date): Check availability to date
- `min_size` (decimal): Minimum room size
- `max_size` (decimal): Maximum room size

**Response:**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "room_number": "201",
      "room_type": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Deluxe Ocean View",
        "base_price": 2500000
      },
      "floor": 2,
      "building": "Main",
      "view_type": "sea",
      "actual_size_sqm": 38.5,
      "status": "available",
      "special_features": ["Balcony", "Corner room"],
      "custom_base_price": null,
      "price_modifier": 10,
      "effective_price": 2750000,
      "is_smoking": false,
      "is_accessible": false,
      "condition_score": 9,
      "last_cleaned_date": "2024-01-20T14:30:00Z",
      "images": [
        {
          "url": "https://r2.example.com/rooms/201/main.jpg",
          "thumbnail": "https://r2.example.com/rooms/201/main-thumb.jpg",
          "caption": "Ocean view from room 201"
        }
      ]
    }
  ],
  "summary": {
    "total_rooms": 20,
    "available": 15,
    "occupied": 3,
    "maintenance": 2
  }
}
```

#### POST /api/rooms
Create a new room.

**Request Body:**
```json
{
  "room_number": "201",
  "room_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "floor": 2,
  "building": "Main",
  "wing": "East",
  "view_type": "sea",
  "actual_size_sqm": 38.5,
  "special_features": ["Balcony", "Corner room"],
  "additional_amenities": ["coffee_machine", "bathrobes"],
  "is_smoking": false,
  "is_accessible": false,
  "price_modifier": 10,
  "price_modifier_reason": "Corner room with extra windows and better view"
}
```

**Validation Rules:**
- `room_number`: Required, unique
- `room_type_id`: Required, must exist
- `floor`: Required if building has multiple floors
- `actual_size_sqm`: If provided, should be within room type range

#### PUT /api/rooms/{id}
Update room details.

**Parameters:**
- `id` (UUID): Room ID

**Request Body:** Same as POST

#### POST /api/rooms/{id}/status
Update room status.

**Parameters:**
- `id` (UUID): Room ID

**Request Body:**
```json
{
  "status": "maintenance",
  "status_reason": "Air conditioner repair",
  "status_until": "2024-01-22T18:00:00Z",
  "notes": "Technician scheduled for tomorrow morning"
}
```

**Business Logic:**
- `available` → `maintenance`: Check for future bookings
- `occupied` → `cleaning`: Automatic after checkout
- `cleaning` → `available`: Update last_cleaned_date
- `maintenance` → `available`: Require completion note

**Status Transition Rules:**
```
available ←→ maintenance
available → reserved → occupied → cleaning → available
available → blocked → available
```

#### POST /api/rooms/{id}/images
Upload room images.

**Parameters:**
- `id` (UUID): Room ID

**Request:** Multipart form data
- `images[]`: Multiple image files
- `captions[]`: Image captions
- `is_primary`: Index of primary image

**Process:**
1. Validate image formats (jpg, png, webp)
2. Generate multiple sizes:
   - Original (max 1920x1080)
   - Thumbnail (400x300)
   - Mobile (800x600)
3. Upload to R2: `rooms/{room_id}/{timestamp}_{size}.{ext}`
4. Update room record with URLs

**Response:**
```json
{
  "uploaded": [
    {
      "original": "https://r2.example.com/rooms/201/1234567890_original.jpg",
      "thumbnail": "https://r2.example.com/rooms/201/1234567890_thumb.jpg",
      "mobile": "https://r2.example.com/rooms/201/1234567890_mobile.jpg",
      "caption": "Ocean view from balcony"
    }
  ]
}
```

### 3.3 Pricing Management

#### GET /api/room-types/{id}/pricing
Get comprehensive pricing for a room type.

**Parameters:**
- `id` (UUID): Room type ID
- `start_date` (date): Period start
- `end_date` (date): Period end

**Response:**
```json
{
  "base_pricing": {
    "base_price": 2500000,
    "weekend_price": 3000000,
    "extra_person_charge": 500000
  },
  "seasonal_rates": [
    {
      "season_name": "Summer Peak",
      "start_date": "2024-06-01",
      "end_date": "2024-08-31",
      "rate_multiplier": 1.3
    }
  ],
  "active_rules": [
    {
      "name": "Early Bird Discount",
      "rule_type": "early_bird",
      "adjustment_value": -15,
      "conditions": {
        "booking_advance_days": {"min": 30}
      }
    }
  ],
  "calculated_prices": [
    {
      "date": "2024-01-21",
      "base_price": 2500000,
      "final_price": 2500000,
      "applied_rules": []
    },
    {
      "date": "2024-06-15",
      "base_price": 2500000,
      "final_price": 3250000,
      "applied_rules": ["Summer Peak"]
    }
  ]
}
```

#### POST /api/room-types/{id}/seasonal-rates
Create seasonal pricing.

**Parameters:**
- `id` (UUID): Room type ID

**Request Body:**
```json
{
  "season_name": "Tet Holiday 2024",
  "season_type": "special_event",
  "start_date": "2024-02-08",
  "end_date": "2024-02-14",
  "rate_type": "multiplier",
  "rate_multiplier": 2.0,
  "min_stay_nights": 3
}
```

#### POST /api/pricing-rules
Create dynamic pricing rule.

**Request Body:**
```json
{
  "name": "Long Stay Discount",
  "scope": "room_type",
  "room_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "rule_type": "long_stay",
  "conditions": {
    "stay_nights": {"min": 7, "max": 14}
  },
  "adjustment_type": "discount",
  "adjustment_method": "percentage",
  "adjustment_value": 20,
  "can_combine": false,
  "valid_from": "2024-01-01",
  "valid_to": "2024-12-31"
}
```

### 3.4 Availability Management

#### GET /api/rooms/availability
Check room availability for a date range.

**Query Parameters:**
- `check_in` (date, required): Check-in date
- `check_out` (date, required): Check-out date
- `guests` (integer, required): Number of guests
- `room_type_id` (UUID, optional): Specific room type
- `building` (string, optional): Specific building
- `view_type` (string, optional): Preferred view

**Response:**
```json
{
  "available_room_types": [
    {
      "room_type": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Deluxe Ocean View",
        "max_occupancy": 3
      },
      "available_rooms": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "room_number": "201",
          "floor": 2,
          "view_type": "sea",
          "special_features": ["Balcony"],
          "total_price": 7500000,
          "average_night_price": 2500000,
          "applied_rates": ["Standard"]
        }
      ],
      "min_price": 7500000,
      "max_price": 8250000
    }
  ],
  "summary": {
    "total_available_rooms": 8,
    "check_in": "2024-02-01",
    "check_out": "2024-02-04",
    "nights": 3,
    "guests": 2
  }
}
```

#### POST /api/rooms/availability/block
Block rooms from availability.

**Request Body:**
```json
{
  "room_ids": ["660e8400-e29b-41d4-a716-446655440000"],
  "start_date": "2024-02-01",
  "end_date": "2024-02-05",
  "reason": "Maintenance",
  "notes": "Annual deep cleaning"
}
```

---

## 4. Business Logic

### 4.1 Price Calculation Algorithm

```python
def calculate_room_price(room_id, check_in_date, check_out_date, guests, promo_code=None):
    """
    Calculate total price for a room booking.
    
    Process:
    1. Get base price from room type
    2. Apply room-specific modifiers
    3. Apply seasonal rates
    4. Apply dynamic pricing rules
    5. Add extra person charges
    6. Calculate totals per night
    """
    
    room = get_room(room_id)
    room_type = get_room_type(room.room_type_id)
    
    total_price = 0
    nights = (check_out_date - check_in_date).days
    
    for date in date_range(check_in_date, check_out_date):
        # 1. Base price
        if date.weekday() in [5, 6] and room_type.weekend_price:
            base_price = room_type.weekend_price
        else:
            base_price = room_type.base_price
        
        # 2. Room-specific pricing
        if room.custom_base_price:
            base_price = room.custom_base_price
        elif room.price_modifier:
            base_price = base_price * (1 + room.price_modifier / 100)
        
        # 3. Seasonal rates
        seasonal_rate = get_active_seasonal_rate(room_type.id, date)
        if seasonal_rate:
            if seasonal_rate.rate_type == 'multiplier':
                base_price = base_price * seasonal_rate.rate_multiplier
            elif seasonal_rate.rate_type == 'fixed':
                base_price = seasonal_rate.fixed_rate
            elif seasonal_rate.rate_type == 'addition':
                base_price = base_price + seasonal_rate.rate_addition
        
        # 4. Dynamic pricing rules
        applicable_rules = get_applicable_pricing_rules(
            room_type_id=room_type.id,
            booking_date=datetime.now(),
            check_in_date=date,
            nights=nights,
            guests=guests,
            promo_code=promo_code
        )
        
        for rule in sorted(applicable_rules, key=lambda x: x.priority):
            if rule.adjustment_method == 'percentage':
                adjustment = base_price * (rule.adjustment_value / 100)
                if rule.max_discount_amount and adjustment > rule.max_discount_amount:
                    adjustment = rule.max_discount_amount
            else:
                adjustment = rule.adjustment_value
            
            if rule.adjustment_type == 'discount':
                base_price -= adjustment
            else:
                base_price += adjustment
            
            if not rule.can_combine:
                break  # Stop after first non-combinable rule
        
        # 5. Extra person charges
        if guests > room_type.standard_occupancy:
            extra_persons = min(
                guests - room_type.standard_occupancy,
                room_type.max_occupancy - room_type.standard_occupancy
            )
            base_price += extra_persons * room_type.extra_person_charge
        
        total_price += base_price
    
    return {
        'total_price': total_price,
        'average_night_price': total_price / nights,
        'nights': nights,
        'applied_rules': [rule.name for rule in applicable_rules],
        'breakdown': night_breakdown  # Detailed price per night
    }
```

### 4.2 Availability Check Algorithm

```python
def check_room_availability(room_id, check_in, check_out):
    """
    Check if a room is available for the given date range.
    
    Checks:
    1. No confirmed bookings overlap
    2. Room status is not blocked/maintenance
    3. No blackout dates
    """
    
    # Check for booking conflicts
    conflicting_bookings = query("""
        SELECT COUNT(*) as conflicts
        FROM bookings
        WHERE room_id = :room_id
        AND status IN ('confirmed', 'checked_in')
        AND NOT (
            check_out_date <= :check_in OR
            check_in_date >= :check_out
        )
    """, room_id=room_id, check_in=check_in, check_out=check_out)
    
    if conflicting_bookings.conflicts > 0:
        return False
    
    # Check room status
    room = get_room(room_id)
    if room.status in ['maintenance', 'blocked']:
        if room.status_until and room.status_until > check_in:
            return False
    
    # Check blackout dates
    blackout_dates = query("""
        SELECT COUNT(*) as blackouts
        FROM room_blackout_dates
        WHERE room_id = :room_id
        AND blackout_date BETWEEN :check_in AND :check_out
    """, room_id=room_id, check_in=check_in, check_out=check_out)
    
    if blackout_dates.blackouts > 0:
        return False
    
    return True
```

### 4.3 Room Assignment Algorithm

```python
def auto_assign_room(booking_id):
    """
    Automatically assign the best available room for a booking.
    
    Priority:
    1. Guest preferences (if returning guest)
    2. Requested features (view, floor, etc.)
    3. Room condition score
    4. Room that's been empty longest
    """
    
    booking = get_booking(booking_id)
    customer = get_customer(booking.customer_id)
    
    # Get available rooms of the requested type
    available_rooms = get_available_rooms(
        room_type_id=booking.room_type_id,
        check_in=booking.check_in_date,
        check_out=booking.check_out_date,
        guests=booking.total_guests
    )
    
    if not available_rooms:
        raise NoRoomAvailableError()
    
    # Score each room
    scored_rooms = []
    for room in available_rooms:
        score = 0
        
        # Previous stay in same room (highest priority)
        if customer and has_stayed_in_room(customer.id, room.id):
            score += 100
        
        # Match requested features
        if booking.preferences:
            if booking.preferences.get('view_type') == room.view_type:
                score += 50
            if booking.preferences.get('floor') == room.floor:
                score += 30
            if booking.preferences.get('is_smoking') == room.is_smoking:
                score += 20
        
        # Room condition
        score += room.condition_score * 5
        
        # Days since last occupied (prefer recently cleaned)
        days_empty = (datetime.now() - room.last_occupied_date).days
        if days_empty <= 1:
            score += 10
        elif days_empty > 7:
            score -= 5
        
        scored_rooms.append((room, score))
    
    # Sort by score and assign best room
    best_room = max(scored_rooms, key=lambda x: x[1])[0]
    
    assign_room_to_booking(booking_id, best_room.id)
    
    return best_room
```

---

## 5. Frontend Components

### 5.1 TypeScript Interfaces

```typescript
// Room type interface
interface RoomType {
  id: string;
  name: string;
  code: string;
  basePrice: number;
  weekendPrice?: number;
  holidayPrice?: number;
  extraPersonCharge: number;
  standardOccupancy: number;
  maxOccupancy: number;
  minOccupancy: number;
  sizeSqmFrom?: number;
  sizeSqmTo?: number;
  standardAmenities: string[];
  bedConfiguration: string;
  bathroomType: string;
  description?: string;
  features: string[];
  images: RoomImage[];
  isActive: boolean;
  availableRoomsCount?: number;
}

// Individual room interface
interface Room {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  building?: string;
  wing?: string;
  viewType?: string;
  actualSizeSqm?: number;
  specialFeatures: string[];
  additionalAmenities?: string[];
  status: RoomStatus;
  isSmoking: boolean;
  isAccessible: boolean;
  isPetFriendly: boolean;
  customBasePrice?: number;
  priceModifier?: number;
  effectivePrice?: number;
  conditionScore?: number;
  images: RoomImage[];
  lastCleanedDate?: Date;
}

// Room status enum
enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  BLOCKED = 'blocked'
}

// Room image interface
interface RoomImage {
  url: string;
  thumbnail: string;
  mobile?: string;
  caption?: string;
  order: number;
  isPrimary: boolean;
}

// Pricing interfaces
interface SeasonalRate {
  id: string;
  seasonName: string;
  startDate: Date;
  endDate: Date;
  rateMultiplier?: number;
  fixedRate?: number;
  minStayNights: number;
}

interface PricingRule {
  id: string;
  name: string;
  ruleType: string;
  conditions: any;
  adjustmentType: 'discount' | 'surcharge';
  adjustmentValue: number;
  canCombine: boolean;
  validFrom?: Date;
  validTo?: Date;
}

// Availability check interface
interface AvailabilityRequest {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  roomTypeId?: string;
  preferences?: {
    viewType?: string;
    floor?: number;
    building?: string;
    isSmoking?: boolean;
    isAccessible?: boolean;
  };
}

interface AvailabilityResponse {
  availableRoomTypes: {
    roomType: RoomType;
    availableRooms: AvailableRoom[];
    minPrice: number;
    maxPrice: number;
  }[];
  summary: {
    totalAvailableRooms: number;
    checkIn: Date;
    checkOut: Date;
    nights: number;
    guests: number;
  };
}

interface AvailableRoom extends Room {
  totalPrice: number;
  averageNightPrice: number;
  appliedRates: string[];
  priceBreakdown?: PriceBreakdown[];
}

interface PriceBreakdown {
  date: Date;
  basePrice: number;
  adjustments: {
    name: string;
    amount: number;
    type: 'discount' | 'surcharge';
  }[];
  finalPrice: number;
}
```

### 5.2 React Components

#### Room Type Management Component

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export function RoomTypeList() {
  const { data: roomTypes, isLoading } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: fetchRoomTypes
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roomTypes?.map((roomType) => (
        <RoomTypeCard key={roomType.id} roomType={roomType} />
      ))}
    </div>
  );
}

function RoomTypeCard({ roomType }: { roomType: RoomType }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{roomType.name}</CardTitle>
          <Badge variant={roomType.isActive ? 'default' : 'secondary'}>
            {roomType.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Code: {roomType.code}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Pricing */}
          <div>
            <p className="text-sm font-medium">Base Price</p>
            <p className="text-2xl font-bold">
              {formatCurrency(roomType.basePrice)}
            </p>
            {roomType.weekendPrice && (
              <p className="text-sm text-muted-foreground">
                Weekend: {formatCurrency(roomType.weekendPrice)}
              </p>
            )}
          </div>

          {/* Occupancy */}
          <div className="flex justify-between text-sm">
            <span>Capacity:</span>
            <span>
              {roomType.minOccupancy}-{roomType.maxOccupancy} guests
            </span>
          </div>

          {/* Size */}
          {roomType.sizeSqmFrom && (
            <div className="flex justify-between text-sm">
              <span>Size:</span>
              <span>
                {roomType.sizeSqmFrom}-{roomType.sizeSqmTo} m²
              </span>
            </div>
          )}

          {/* Amenities */}
          <div>
            <p className="text-sm font-medium mb-2">Standard Amenities</p>
            <div className="flex flex-wrap gap-1">
              {roomType.standardAmenities.map((amenity) => (
                <Badge key={amenity} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>

          {/* Room count */}
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Total Rooms:</span>
              <span>{roomType.availableRoomsCount || 0}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3">
            <Button variant="outline" size="sm" className="flex-1">
              Edit
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              View Rooms
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Room Grid Component

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface RoomGridProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
  selectedRoomId?: string;
}

export function RoomGrid({ rooms, onRoomClick, selectedRoomId }: RoomGridProps) {
  const groupedByFloor = rooms.reduce((acc, room) => {
    const floor = room.floor || 0;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const floors = Object.keys(groupedByFloor)
    .map(Number)
    .sort((a, b) => b - a); // Highest floor first

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <div key={floor}>
          <h3 className="text-lg font-semibold mb-3">
            Floor {floor === 0 ? 'G' : floor}
          </h3>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {groupedByFloor[floor]
              .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
              .map((room) => (
                <RoomTile
                  key={room.id}
                  room={room}
                  isSelected={room.id === selectedRoomId}
                  onClick={() => onRoomClick?.(room)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomTile({ 
  room, 
  isSelected, 
  onClick 
}: { 
  room: Room; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const statusColors = {
    available: 'bg-green-100 hover:bg-green-200 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    maintenance: 'bg-gray-100 text-gray-800',
    cleaning: 'bg-blue-100 text-blue-800',
    blocked: 'bg-gray-200 text-gray-600'
  };

  return (
    <button
      onClick={onClick}
      disabled={room.status === 'occupied'}
      className={cn(
        'p-3 rounded-lg border-2 transition-all',
        'flex flex-col items-center justify-center',
        'min-h-[80px] relative',
        statusColors[room.status],
        isSelected && 'border-primary ring-2 ring-primary ring-offset-2',
        !isSelected && 'border-transparent',
        room.status !== 'occupied' && 'cursor-pointer'
      )}
    >
      <span className="font-semibold text-lg">{room.roomNumber}</span>
      <span className="text-xs mt-1">{room.roomType.code}</span>
      
      {/* Special indicators */}
      <div className="absolute top-1 right-1 flex gap-1">
        {room.viewType === 'sea' && (
          <span className="text-xs" title="Sea view">🌊</span>
        )}
        {room.specialFeatures.includes('Balcony') && (
          <span className="text-xs" title="Balcony">🏛️</span>
        )}
        {room.isAccessible && (
          <span className="text-xs" title="Accessible">♿</span>
        )}
      </div>
    </button>
  );
}
```

#### Availability Calendar Component

```tsx
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';

interface AvailabilityCalendarProps {
  roomId?: string;
  roomTypeId?: string;
  onDateSelect?: (dates: { checkIn: Date; checkOut: Date }) => void;
}

export function AvailabilityCalendar({
  roomId,
  roomTypeId,
  onDateSelect
}: AvailabilityCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<{
    checkIn?: Date;
    checkOut?: Date;
  }>({});

  const { data: availability } = useQuery({
    queryKey: ['availability', roomId, roomTypeId],
    queryFn: () => fetchAvailability({ roomId, roomTypeId }),
    enabled: !!(roomId || roomTypeId)
  });

  const handleDateClick = (date: Date) => {
    if (!selectedDates.checkIn) {
      setSelectedDates({ checkIn: date });
    } else if (!selectedDates.checkOut) {
      if (date > selectedDates.checkIn) {
        const newDates = { 
          checkIn: selectedDates.checkIn, 
          checkOut: date 
        };
        setSelectedDates(newDates);
        onDateSelect?.(newDates);
      } else {
        setSelectedDates({ checkIn: date });
      }
    } else {
      setSelectedDates({ checkIn: date });
    }
  };

  const isDateAvailable = (date: Date) => {
    if (!availability) return true;
    return availability.availableDates.some(
      (d: string) => new Date(d).toDateString() === date.toDateString()
    );
  };

  const modifiers = {
    available: (date: Date) => isDateAvailable(date),
    unavailable: (date: Date) => !isDateAvailable(date),
    selected: (date: Date) => {
      if (selectedDates.checkIn?.toDateString() === date.toDateString()) return true;
      if (selectedDates.checkOut?.toDateString() === date.toDateString()) return true;
      if (selectedDates.checkIn && selectedDates.checkOut) {
        return date > selectedDates.checkIn && date < selectedDates.checkOut;
      }
      return false;
    }
  };

  const modifiersStyles = {
    available: {
      backgroundColor: '#bbf7d0',
      color: '#166534'
    },
    unavailable: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      textDecoration: 'line-through'
    },
    selected: {
      backgroundColor: '#3b82f6',
      color: 'white'
    }
  };

  return (
    <Card className="p-6">
      <Calendar
        mode="single"
        selected={selectedDates.checkIn}
        onSelect={handleDateClick}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        disabled={(date) => !isDateAvailable(date) || date < new Date()}
        className="rounded-md border"
      />
      
      {selectedDates.checkIn && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            Check-in: {selectedDates.checkIn.toLocaleDateString()}
          </p>
          {selectedDates.checkOut && (
            <p className="text-sm">
              Check-out: {selectedDates.checkOut.toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
```

---

## 6. Reports and Analytics

### 6.1 Room Utilization Report

```sql
-- Room utilization by type
SELECT 
    rt.name as room_type,
    COUNT(DISTINCT r.id) as total_rooms,
    COUNT(DISTINCT b.room_id) as occupied_rooms,
    ROUND(COUNT(DISTINCT b.room_id)::DECIMAL / COUNT(DISTINCT r.id) * 100, 2) as occupancy_rate,
    SUM(b.total_nights) as total_nights_sold,
    SUM(b.total_room_charge) as total_revenue,
    AVG(b.room_rate) as average_daily_rate
FROM room_types rt
LEFT JOIN rooms r ON rt.id = r.room_type_id
LEFT JOIN bookings b ON r.id = b.room_id 
    AND b.status IN ('checked_in', 'checked_out')
    AND b.check_in_date >= :start_date
    AND b.check_out_date <= :end_date
WHERE rt.is_active = true
GROUP BY rt.id, rt.name
ORDER BY occupancy_rate DESC;
```

### 6.2 Room Performance Metrics

```sql
-- Individual room performance
SELECT 
    r.room_number,
    rt.name as room_type,
    r.floor,
    r.view_type,
    COUNT(b.id) as total_bookings,
    SUM(b.total_nights) as nights_occupied,
    ROUND(SUM(b.total_nights)::DECIMAL / :total_days * 100, 2) as occupancy_rate,
    SUM(b.total_room_charge) as total_revenue,
    AVG(b.room_rate) as avg_rate,
    AVG(fb.rating) as avg_guest_rating,
    r.condition_score,
    r.last_renovated_date
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN bookings b ON r.id = b.room_id
    AND b.check_in_date >= :start_date
    AND b.check_out_date <= :end_date
LEFT JOIN feedback fb ON b.id = fb.booking_id
WHERE r.is_active = true
GROUP BY r.id, rt.name
ORDER BY total_revenue DESC;
```

---

## 7. Maintenance and Housekeeping Integration

### 7.1 Housekeeping Schedule

```sql
CREATE TABLE housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    task_type VARCHAR(50), -- 'daily_clean', 'deep_clean', 'turnover', 'inspection'
    priority INTEGER DEFAULT 5,
    scheduled_date DATE,
    scheduled_time TIME,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'in_progress', 'completed', 'skipped'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_minutes INTEGER,
    notes TEXT,
    inspection_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 Maintenance Tracking

```sql
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    issue_type VARCHAR(50),
    -- 'plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'other'
    severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
    description TEXT NOT NULL,
    reported_by UUID REFERENCES users(id),
    reported_date TIMESTAMP DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open',
    -- 'open', 'assigned', 'in_progress', 'completed', 'cancelled'
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    completion_date TIMESTAMP,
    requires_room_block BOOLEAN DEFAULT false,
    photos JSONB
);
```

---

## 8. Integration Points

### 8.1 Channel Manager Integration

```typescript
interface ChannelManagerSync {
  // Push room availability to OTAs
  pushAvailability(roomTypeId: string, dates: DateRange): Promise<void>;
  
  // Push rates to OTAs
  pushRates(roomTypeId: string, rates: RateUpdate[]): Promise<void>;
  
  // Receive bookings from OTAs
  receiveBooking(booking: ExternalBooking): Promise<void>;
  
  // Update inventory across channels
  updateInventory(updates: InventoryUpdate[]): Promise<void>;
}
```

### 8.2 Property Management System Events

```typescript
// Event emitters for room status changes
enum RoomEvent {
  ROOM_CLEANED = 'room.cleaned',
  ROOM_OCCUPIED = 'room.occupied',
  ROOM_VACATED = 'room.vacated',
  ROOM_BLOCKED = 'room.blocked',
  ROOM_UNBLOCKED = 'room.unblocked',
  MAINTENANCE_REQUESTED = 'room.maintenance.requested',
  MAINTENANCE_COMPLETED = 'room.maintenance.completed'
}

// Event handlers
eventBus.on(RoomEvent.ROOM_VACATED, async (roomId: string) => {
  // Trigger cleaning task
  await createHousekeepingTask(roomId, 'turnover');
  
  // Update room status
  await updateRoomStatus(roomId, 'cleaning');
  
  // Notify housekeeping team
  await notifyHousekeeping(roomId);
});
```

---

## 9. Best Practices

### 9.1 Data Integrity
- Always use transactions for multi-table updates
- Implement soft deletes for audit trail
- Maintain referential integrity with foreign keys
- Use database triggers for updated_at timestamps

### 9.2 Performance Optimization
- Index frequently queried columns
- Use materialized views for complex reports
- Implement Redis caching for room availability
- Batch update operations where possible

### 9.3 Security
- Validate all input data
- Use parameterized queries to prevent SQL injection
- Implement row-level security for multi-tenant scenarios
- Audit log all critical operations

### 9.4 User Experience
- Real-time updates using WebSockets
- Optimistic UI updates with rollback on failure
- Progressive loading for large datasets
- Clear visual indicators for room status

---

## 10. Migration Guide

### 10.1 From Legacy System

```sql
-- Migration script example
BEGIN;

-- 1. Create new schema
CREATE SCHEMA new_pms;

-- 2. Create new tables
-- (All CREATE TABLE statements from above)

-- 3. Migrate room types
INSERT INTO new_pms.room_types (name, code, base_price, ...)
SELECT 
    room_category_name,
    room_category_code,
    standard_rate,
    ...
FROM legacy.room_categories;

-- 4. Migrate rooms
INSERT INTO new_pms.rooms (room_number, room_type_id, floor, ...)
SELECT 
    room_no,
    (SELECT id FROM new_pms.room_types WHERE code = rc.room_category_code),
    floor_no,
    ...
FROM legacy.rooms r
JOIN legacy.room_categories rc ON r.category_id = rc.id;

-- 5. Verify migration
-- (Validation queries)

COMMIT;
```

### 10.2 Data Validation

```python
def validate_migration():
    """
    Validate data integrity after migration.
    """
    checks = []
    
    # Check room count matches
    old_count = query("SELECT COUNT(*) FROM legacy.rooms")
    new_count = query("SELECT COUNT(*) FROM rooms")
    checks.append(('Room count', old_count == new_count))
    
    # Check no orphaned rooms
    orphaned = query("""
        SELECT COUNT(*) FROM rooms 
        WHERE room_type_id NOT IN (SELECT id FROM room_types)
    """)
    checks.append(('No orphaned rooms', orphaned == 0))
    
    # Check price integrity
    invalid_prices = query("""
        SELECT COUNT(*) FROM room_types 
        WHERE base_price <= 0 OR base_price IS NULL
    """)
    checks.append(('Valid prices', invalid_prices == 0))
    
    return all(check[1] for check in checks), checks
```

---

## Appendix A: Sample Data

```sql
-- Sample room types
INSERT INTO room_types (name, code, base_price, weekend_price, standard_occupancy, max_occupancy) VALUES
('Standard Room', 'STD', 1500000, 1800000, 2, 2),
('Deluxe Room', 'DLX', 2500000, 3000000, 2, 3),
('Suite', 'STE', 4000000, 4500000, 2, 4),
('Family Room', 'FAM', 3500000, 4000000, 4, 6),
('Penthouse', 'PNT', 8000000, 9000000, 2, 4);

-- Sample rooms
INSERT INTO rooms (room_number, room_type_id, floor, view_type, actual_size_sqm) VALUES
('101', (SELECT id FROM room_types WHERE code = 'STD'), 1, 'garden', 28),
('102', (SELECT id FROM room_types WHERE code = 'STD'), 1, 'garden', 28),
('201', (SELECT id FROM room_types WHERE code = 'DLX'), 2, 'sea', 38),
('202', (SELECT id FROM room_types WHERE code = 'DLX'), 2, 'sea', 40),
('301', (SELECT id FROM room_types WHERE code = 'STE'), 3, 'sea', 65),
('401', (SELECT id FROM room_types WHERE code = 'PNT'), 4, 'panoramic', 120);
```
