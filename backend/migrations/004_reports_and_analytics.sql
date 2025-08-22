-- Reports and Analytics Tables

-- Daily Operations Summary
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE NOT NULL UNIQUE,
    total_rooms INTEGER,
    occupied_rooms INTEGER,
    available_rooms INTEGER,
    maintenance_rooms INTEGER,
    occupancy_rate DECIMAL(5,2),
    total_check_ins INTEGER DEFAULT 0,
    total_check_outs INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_cancellations INTEGER DEFAULT 0,
    room_revenue DECIMAL(12,2) DEFAULT 0,
    service_revenue DECIMAL(12,2) DEFAULT 0,
    pos_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_guests INTEGER DEFAULT 0,
    average_room_rate DECIMAL(10,2),
    revpar DECIMAL(10,2), -- Revenue per available room
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Financial Summary
CREATE TABLE monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_room_nights_sold INTEGER DEFAULT 0,
    total_room_nights_available INTEGER,
    average_occupancy_rate DECIMAL(5,2),
    average_daily_rate DECIMAL(10,2),
    room_revenue DECIMAL(12,2) DEFAULT 0,
    service_revenue DECIMAL(12,2) DEFAULT 0,
    pos_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    room_costs DECIMAL(12,2) DEFAULT 0,
    service_costs DECIMAL(12,2) DEFAULT 0,
    inventory_costs DECIMAL(12,2) DEFAULT 0,
    staff_costs DECIMAL(12,2) DEFAULT 0,
    utility_costs DECIMAL(12,2) DEFAULT 0,
    maintenance_costs DECIMAL(12,2) DEFAULT 0,
    other_costs DECIMAL(12,2) DEFAULT 0,
    total_costs DECIMAL(12,2) DEFAULT 0,
    gross_profit DECIMAL(12,2) GENERATED ALWAYS AS (total_revenue - total_costs) STORED,
    gross_margin DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month)
);

-- Guest Statistics
CREATE TABLE guest_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    period_date DATE NOT NULL,
    year INTEGER,
    month INTEGER,
    week INTEGER,
    new_guests INTEGER DEFAULT 0,
    returning_guests INTEGER DEFAULT 0,
    total_guests INTEGER DEFAULT 0,
    domestic_guests INTEGER DEFAULT 0,
    international_guests INTEGER DEFAULT 0,
    average_stay_length DECIMAL(5,2),
    average_lead_time DECIMAL(5,2), -- Days between booking and check-in
    top_nationalities JSONB,
    top_sources JSONB,
    age_distribution JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Forecast
CREATE TABLE revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE NOT NULL,
    forecast_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    expected_occupancy_rate DECIMAL(5,2),
    expected_adr DECIMAL(10,2), -- Average daily rate
    expected_room_revenue DECIMAL(12,2),
    expected_service_revenue DECIMAL(12,2),
    expected_total_revenue DECIMAL(12,2),
    confidence_level DECIMAL(5,2), -- Percentage confidence
    actual_revenue DECIMAL(12,2), -- Filled after the period
    variance DECIMAL(12,2), -- Difference between forecast and actual
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- insert, update, delete
    user_id UUID REFERENCES user_profiles(id),
    user_email VARCHAR(200),
    changes JSONB, -- Old and new values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level VARCHAR(20) NOT NULL, -- debug, info, warning, error, critical
    module VARCHAR(100),
    action VARCHAR(200),
    message TEXT,
    details JSONB,
    user_id UUID REFERENCES user_profiles(id),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Queue
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(200) NOT NULL,
    cc_email VARCHAR(500),
    bcc_email VARCHAR(500),
    from_email VARCHAR(200),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(50) DEFAULT 'pending', -- pending, sending, sent, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    type VARCHAR(50) NOT NULL, -- booking, payment, maintenance, alert, info
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    channels TEXT[], -- email, sms, push, in_app
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Plans (for dynamic pricing)
CREATE TABLE rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    min_stay_nights INTEGER DEFAULT 1,
    max_stay_nights INTEGER,
    base_rate DECIMAL(10,2) NOT NULL,
    monday_rate DECIMAL(10,2),
    tuesday_rate DECIMAL(10,2),
    wednesday_rate DECIMAL(10,2),
    thursday_rate DECIMAL(10,2),
    friday_rate DECIMAL(10,2),
    saturday_rate DECIMAL(10,2),
    sunday_rate DECIMAL(10,2),
    extra_person_rate DECIMAL(10,2) DEFAULT 0,
    meal_plan VARCHAR(50), -- room_only, breakfast, half_board, full_board
    cancellation_policy VARCHAR(50), -- flexible, moderate, strict
    advance_booking_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_rate_dates CHECK (end_date >= start_date)
);

-- Promotions and Discounts
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    min_booking_amount DECIMAL(10,2),
    min_nights INTEGER,
    applicable_room_types UUID[],
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Manager Integration
CREATE TABLE channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name VARCHAR(100) NOT NULL, -- Booking.com, Agoda, Expedia, etc.
    channel_id VARCHAR(100),
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    channel_room_id VARCHAR(100),
    channel_room_name VARCHAR(200),
    rate_multiplier DECIMAL(5,3) DEFAULT 1.000,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_name, channel_room_id)
);

-- Create indexes
CREATE INDEX idx_daily_summaries_date ON daily_summaries(summary_date);
CREATE INDEX idx_monthly_summaries_period ON monthly_summaries(year, month);
CREATE INDEX idx_guest_statistics_period ON guest_statistics(period_type, period_date);
CREATE INDEX idx_revenue_forecasts_period ON revenue_forecasts(period_start, period_end);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_rate_plans_room_type ON rate_plans(room_type_id);
CREATE INDEX idx_rate_plans_dates ON rate_plans(start_date, end_date);
CREATE INDEX idx_promotions_code ON promotions(promo_code);
CREATE INDEX idx_promotions_dates ON promotions(valid_from, valid_to);

-- Apply update triggers
CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_summaries_updated_at BEFORE UPDATE ON monthly_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_forecasts_updated_at BEFORE UPDATE ON revenue_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_plans_updated_at BEFORE UPDATE ON rate_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_mappings_updated_at BEFORE UPDATE ON channel_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view summaries" ON daily_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage daily summaries" ON daily_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Authenticated users can view monthly summaries" ON monthly_summaries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage monthly summaries" ON monthly_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Authenticated users can view statistics" ON guest_statistics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage forecasts" ON revenue_forecasts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view system logs" ON system_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert system logs" ON system_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email queue" ON email_queue
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage rate plans" ON rate_plans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage promotions" ON promotions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage channel mappings" ON channel_mappings
    FOR ALL USING (auth.role() = 'authenticated');