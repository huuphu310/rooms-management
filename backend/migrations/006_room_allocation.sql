-- Room Allocation & Management System Migration
-- This migration creates tables for comprehensive room allocation management
-- with auto-assignment, conflict resolution, and visual grid management

-- Room allocation table
CREATE TABLE IF NOT EXISTS room_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    room_id UUID REFERENCES rooms(id) NOT NULL,
    
    -- Assignment details
    assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'guest_request', 'upgrade', 'downgrade')),
    assignment_status VARCHAR(20) NOT NULL CHECK (assignment_status IN ('pre_assigned', 'assigned', 'locked', 'cancelled')),
    
    -- Date range for this allocation
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights_count INTEGER GENERATED ALWAYS AS 
        (check_out_date - check_in_date) STORED,
    
    -- Price adjustments if room different from original booking
    original_room_type_id UUID REFERENCES room_types(id),
    original_rate DECIMAL(12,2),
    allocated_rate DECIMAL(12,2),
    rate_difference DECIMAL(12,2) GENERATED ALWAYS AS 
        (allocated_rate - original_rate) STORED,
    
    -- Assignment tracking
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID, -- References users(id) 
    assignment_reason TEXT,
    
    -- Change history
    previous_room_id UUID REFERENCES rooms(id),
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID, -- References users(id)
    change_reason TEXT,
    
    -- Preferences and notes
    guest_preferences JSONB DEFAULT '{}',
    internal_notes TEXT,
    
    -- Status flags
    is_vip BOOLEAN DEFAULT false,
    is_guaranteed BOOLEAN DEFAULT false, -- Cannot be moved
    requires_inspection BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT positive_rates CHECK (original_rate >= 0 AND allocated_rate >= 0)
);

-- Exclusion constraint to prevent double booking
-- Note: This requires the btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE room_allocations ADD CONSTRAINT no_double_booking
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    ) WHERE (assignment_status NOT IN ('cancelled'));

-- Room allocation history
CREATE TABLE IF NOT EXISTS room_allocation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID REFERENCES room_allocations(id),
    booking_id UUID REFERENCES bookings(id),
    
    -- Change details
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'room_changed', 'date_changed', 'status_changed', 'cancelled')),
    
    -- Before and after states
    previous_room_id UUID REFERENCES rooms(id),
    new_room_id UUID REFERENCES rooms(id),
    previous_dates DATERANGE,
    new_dates DATERANGE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Price impact
    price_adjustment DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    changed_by UUID, -- References users(id)
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room blocking (for maintenance, VIP, etc.)
CREATE TABLE IF NOT EXISTS room_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    
    -- Block period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Block details
    block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('maintenance', 'renovation', 'vip_hold', 'long_stay', 'staff', 'inspection', 'deep_clean')),
    block_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    can_override BOOLEAN DEFAULT false,
    override_level VARCHAR(20) CHECK (override_level IN ('supervisor', 'manager', 'admin')),
    
    -- Metadata
    created_by UUID, -- References users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE,
    released_by UUID, -- References users(id)
    
    -- Constraints
    CONSTRAINT valid_block_dates CHECK (end_date >= start_date)
);

-- Allocation rules and preferences
CREATE TABLE IF NOT EXISTS allocation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('room_type', 'floor', 'feature', 'guest_type', 'booking_source', 'duration')),
    
    -- Conditions (JSONB for flexibility)
    conditions JSONB NOT NULL DEFAULT '{}',
    -- Example: {"guest_type": "vip", "min_nights": 3, "booking_source": "direct"}
    
    -- Actions (JSONB for flexibility)
    actions JSONB NOT NULL DEFAULT '{}',
    -- Example: {"preferred_floors": [2, 3], "required_features": ["sea_view"], "avoid_rooms": ["101"]}
    
    -- Priority and status
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID, -- References users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allocation alerts and notifications
CREATE TABLE IF NOT EXISTS allocation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    allocation_id UUID REFERENCES room_allocations(id),
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'unassigned_24h', 'unassigned_1h', 'unassigned_critical',
        'conflict_detected', 'upgrade_available', 'room_blocked',
        'assignment_failed', 'rate_change_required'
    )),
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    
    -- Alert context
    alert_context JSONB DEFAULT '{}',
    -- Example: {"hours_until_checkin": 2, "available_alternatives": ["301", "302"]}
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID, -- References users(id)
    resolution_notes TEXT,
    auto_resolved BOOLEAN DEFAULT false,
    
    -- Notifications
    notified_users UUID[] DEFAULT '{}',
    notification_channels VARCHAR(20)[] DEFAULT '{}', -- ['email', 'sms', 'push', 'slack']
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_attempts INTEGER DEFAULT 0,
    
    -- Escalation
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID, -- References users(id)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room preferences and guest history
CREATE TABLE IF NOT EXISTS guest_room_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    
    -- Room preferences
    preferred_room_types UUID[] DEFAULT '{}', -- References room_types(id)
    preferred_floors INTEGER[] DEFAULT '{}',
    preferred_features VARCHAR(50)[] DEFAULT '{}', -- ['sea_view', 'balcony', 'king_bed', 'quiet_zone']
    
    -- Avoidance preferences
    avoid_floors INTEGER[] DEFAULT '{}',
    avoid_features VARCHAR(50)[] DEFAULT '{}',
    avoid_rooms VARCHAR(20)[] DEFAULT '{}', -- Room numbers to avoid
    
    -- Special requirements
    accessibility_needs JSONB DEFAULT '{}',
    special_requests TEXT,
    
    -- Preference strength
    priority_level INTEGER DEFAULT 5, -- 1-10 scale
    
    -- History tracking
    last_stayed_room VARCHAR(20),
    total_stays INTEGER DEFAULT 0,
    satisfaction_score INTEGER, -- 1-5 stars from previous stays
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room utilization tracking
CREATE TABLE IF NOT EXISTS room_utilization_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Utilization metrics
    total_nights INTEGER NOT NULL DEFAULT 0,
    occupied_nights INTEGER NOT NULL DEFAULT 0,
    blocked_nights INTEGER NOT NULL DEFAULT 0,
    available_nights INTEGER GENERATED ALWAYS AS 
        (total_nights - occupied_nights - blocked_nights) STORED,
    occupancy_rate DECIMAL(5,2) GENERATED ALWAYS AS 
        (CASE WHEN total_nights > 0 THEN (occupied_nights::DECIMAL / total_nights * 100) ELSE 0 END) STORED,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_daily_rate DECIMAL(10,2) GENERATED ALWAYS AS 
        (CASE WHEN occupied_nights > 0 THEN (total_revenue / occupied_nights) ELSE 0 END) STORED,
    
    -- Guest metrics
    total_guests INTEGER DEFAULT 0,
    guest_satisfaction_avg DECIMAL(3,2) DEFAULT 0,
    
    -- Maintenance metrics
    maintenance_hours INTEGER DEFAULT 0,
    cleaning_time_avg INTEGER DEFAULT 0, -- minutes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_allocations_booking ON room_allocations(booking_id);
CREATE INDEX IF NOT EXISTS idx_room_allocations_room ON room_allocations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_allocations_dates ON room_allocations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_room_allocations_status ON room_allocations(assignment_status);
CREATE INDEX IF NOT EXISTS idx_room_allocations_checkin_pending ON room_allocations(check_in_date, assignment_status) 
    WHERE assignment_status IN ('pre_assigned', 'assigned');

CREATE INDEX IF NOT EXISTS idx_room_allocation_history_allocation ON room_allocation_history(allocation_id);
CREATE INDEX IF NOT EXISTS idx_room_allocation_history_booking ON room_allocation_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_room_allocation_history_changed_at ON room_allocation_history(changed_at);

CREATE INDEX IF NOT EXISTS idx_room_blocks_room ON room_blocks(room_id);
CREATE INDEX IF NOT EXISTS idx_room_blocks_dates ON room_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_room_blocks_active ON room_blocks(is_active, start_date, end_date) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_allocation_rules_type_active ON allocation_rules(rule_type, is_active) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_allocation_rules_priority ON allocation_rules(priority DESC) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_allocation_alerts_booking ON allocation_alerts(booking_id);
CREATE INDEX IF NOT EXISTS idx_allocation_alerts_unresolved ON allocation_alerts(is_resolved, severity, created_at) 
    WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_allocation_alerts_type_active ON allocation_alerts(alert_type, is_resolved) 
    WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_guest_room_preferences_customer ON guest_room_preferences(customer_id);

CREATE INDEX IF NOT EXISTS idx_room_utilization_room_period ON room_utilization_stats(room_id, period_type, period_start);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers
CREATE TRIGGER update_room_allocations_updated_at 
    BEFORE UPDATE ON room_allocations 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_allocation_rules_updated_at 
    BEFORE UPDATE ON allocation_rules 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_allocation_alerts_updated_at 
    BEFORE UPDATE ON allocation_alerts 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_guest_room_preferences_updated_at 
    BEFORE UPDATE ON guest_room_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Allocation history trigger
CREATE OR REPLACE FUNCTION log_allocation_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log room changes
    IF TG_OP = 'UPDATE' AND OLD.room_id != NEW.room_id THEN
        INSERT INTO room_allocation_history (
            allocation_id, booking_id, action,
            previous_room_id, new_room_id,
            previous_dates, new_dates,
            price_adjustment, changed_by, change_reason
        ) VALUES (
            NEW.id, NEW.booking_id, 'room_changed',
            OLD.room_id, NEW.room_id,
            daterange(OLD.check_in_date, OLD.check_out_date, '[)'),
            daterange(NEW.check_in_date, NEW.check_out_date, '[)'),
            NEW.rate_difference - OLD.rate_difference,
            NEW.changed_by, NEW.change_reason
        );
    END IF;
    
    -- Log date changes
    IF TG_OP = 'UPDATE' AND (OLD.check_in_date != NEW.check_in_date OR OLD.check_out_date != NEW.check_out_date) THEN
        INSERT INTO room_allocation_history (
            allocation_id, booking_id, action,
            previous_room_id, new_room_id,
            previous_dates, new_dates,
            changed_by, change_reason
        ) VALUES (
            NEW.id, NEW.booking_id, 'date_changed',
            NEW.room_id, NEW.room_id,
            daterange(OLD.check_in_date, OLD.check_out_date, '[)'),
            daterange(NEW.check_in_date, NEW.check_out_date, '[)'),
            NEW.changed_by, NEW.change_reason
        );
    END IF;
    
    -- Log status changes
    IF TG_OP = 'UPDATE' AND OLD.assignment_status != NEW.assignment_status THEN
        INSERT INTO room_allocation_history (
            allocation_id, booking_id, action,
            previous_room_id, new_room_id,
            previous_status, new_status,
            changed_by, change_reason
        ) VALUES (
            NEW.id, NEW.booking_id, 'status_changed',
            NEW.room_id, NEW.room_id,
            OLD.assignment_status, NEW.assignment_status,
            NEW.changed_by, NEW.change_reason
        );
    END IF;
    
    -- Log creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO room_allocation_history (
            allocation_id, booking_id, action,
            new_room_id, new_dates, new_status,
            changed_by, change_reason
        ) VALUES (
            NEW.id, NEW.booking_id, 'created',
            NEW.room_id, 
            daterange(NEW.check_in_date, NEW.check_out_date, '[)'),
            NEW.assignment_status,
            NEW.assigned_by, NEW.assignment_reason
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER log_allocation_changes_trigger
    AFTER INSERT OR UPDATE ON room_allocations
    FOR EACH ROW EXECUTE PROCEDURE log_allocation_changes();

-- Views for common queries

-- Available rooms view
CREATE OR REPLACE VIEW available_rooms AS
SELECT 
    r.id,
    r.room_number,
    r.room_type_id,
    rt.type_name,
    r.floor,
    r.status,
    r.features,
    r.is_accessible,
    COALESCE(rs.current_occupancy, 'available') as current_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM room_blocks rb 
            WHERE rb.room_id = r.id 
            AND rb.is_active = true 
            AND CURRENT_DATE BETWEEN rb.start_date AND rb.end_date
        ) THEN 'blocked'
        WHEN EXISTS (
            SELECT 1 FROM room_allocations ra 
            WHERE ra.room_id = r.id 
            AND ra.assignment_status IN ('assigned', 'locked')
            AND CURRENT_DATE BETWEEN ra.check_in_date AND ra.check_out_date - 1
        ) THEN 'occupied'
        ELSE 'available'
    END as availability_status
FROM rooms r
LEFT JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN room_status rs ON r.id = rs.room_id; -- Assuming room_status table exists

-- Unassigned bookings view
CREATE OR REPLACE VIEW unassigned_bookings AS
SELECT 
    b.id as booking_id,
    b.booking_code,
    b.customer_id,
    c.full_name as guest_name,
    c.phone,
    c.email,
    b.check_in_date,
    b.check_out_date,
    b.check_in_time,
    b.room_type_id,
    rt.type_name as room_type,
    b.status as booking_status,
    b.total_amount,
    b.paid_amount,
    b.is_vip,
    b.special_requests,
    EXTRACT(EPOCH FROM (
        (b.check_in_date + b.check_in_time) - NOW()
    )) / 3600 as hours_until_checkin,
    CASE 
        WHEN EXTRACT(EPOCH FROM ((b.check_in_date + b.check_in_time) - NOW())) / 3600 < 1 THEN 'critical'
        WHEN EXTRACT(EPOCH FROM ((b.check_in_date + b.check_in_time) - NOW())) / 3600 < 24 THEN 'warning'
        ELSE 'info'
    END as alert_level,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN room_types rt ON b.room_type_id = rt.id
WHERE b.status IN ('confirmed', 'guaranteed')
AND NOT EXISTS (
    SELECT 1 FROM room_allocations ra 
    WHERE ra.booking_id = b.id 
    AND ra.assignment_status IN ('pre_assigned', 'assigned', 'locked')
);

-- Room occupancy calendar view
CREATE OR REPLACE VIEW room_occupancy_calendar AS
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '90 days',
        INTERVAL '1 day'
    )::date as calendar_date
),
room_daily_status AS (
    SELECT 
        r.id as room_id,
        r.room_number,
        r.room_type_id,
        rt.type_name as room_type,
        r.floor,
        ds.calendar_date,
        CASE 
            -- Check for blocks first
            WHEN EXISTS (
                SELECT 1 FROM room_blocks rb 
                WHERE rb.room_id = r.id 
                AND rb.is_active = true 
                AND ds.calendar_date BETWEEN rb.start_date AND rb.end_date
            ) THEN 'blocked'
            -- Check for occupancy
            WHEN EXISTS (
                SELECT 1 FROM room_allocations ra 
                WHERE ra.room_id = r.id 
                AND ra.assignment_status IN ('assigned', 'locked')
                AND ds.calendar_date BETWEEN ra.check_in_date AND ra.check_out_date - 1
            ) THEN 'occupied'
            ELSE 'available'
        END as status,
        ra.booking_id,
        c.full_name as guest_name,
        ra.check_in_date = ds.calendar_date as is_arrival,
        ra.check_out_date = ds.calendar_date as is_departure
    FROM rooms r
    LEFT JOIN room_types rt ON r.room_type_id = rt.id
    CROSS JOIN date_series ds
    LEFT JOIN room_allocations ra ON ra.room_id = r.id 
        AND ra.assignment_status IN ('assigned', 'locked')
        AND ds.calendar_date BETWEEN ra.check_in_date AND ra.check_out_date - 1
    LEFT JOIN bookings b ON ra.booking_id = b.id
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE r.status = 'active'
)
SELECT * FROM room_daily_status
ORDER BY room_number, calendar_date;

-- Grant permissions (adjust based on your user roles)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO hotel_admin;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO hotel_staff;

-- Comments for documentation
COMMENT ON TABLE room_allocations IS 'Core room allocation management linking bookings to specific rooms';
COMMENT ON TABLE room_allocation_history IS 'Complete audit trail of all room allocation changes';
COMMENT ON TABLE room_blocks IS 'Room blocking for maintenance, VIP holds, and other purposes';
COMMENT ON TABLE allocation_rules IS 'Configurable rules for automatic room assignment';
COMMENT ON TABLE allocation_alerts IS 'Alert system for unassigned bookings and conflicts';
COMMENT ON TABLE guest_room_preferences IS 'Guest preferences for room assignment optimization';
COMMENT ON TABLE room_utilization_stats IS 'Performance metrics for room utilization analysis';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Room Allocation System migration completed successfully!';
    RAISE NOTICE 'Tables created: room_allocations, room_allocation_history, room_blocks, allocation_rules, allocation_alerts, guest_room_preferences, room_utilization_stats';
    RAISE NOTICE 'Views created: available_rooms, unassigned_bookings, room_occupancy_calendar';
    RAISE NOTICE 'Triggers and indexes created for automatic updates and performance';
    RAISE NOTICE 'Exclusion constraint added to prevent double booking';
END $$;