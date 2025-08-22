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