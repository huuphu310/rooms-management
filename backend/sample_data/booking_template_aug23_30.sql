-- =====================================================
-- BOOKING DATA TEMPLATE FOR AUGUST 23-30, 2025
-- =====================================================
-- This script creates sample booking data for testing
-- Including: rooms booked, currently staying, upcoming
-- Date range: August 23-30, 2025
-- =====================================================

-- First, ensure we have some rooms and room types
-- (Skip if already exists)

-- Sample Room Types (if not exists)
INSERT INTO room_types (id, name, code, base_price, weekend_price, max_occupancy, min_occupancy, extra_person_charge, amenities, size_sqm, description, is_active)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'Standard Single', 'STD-S', 500000, 600000, 2, 1, 150000, '["wifi", "ac", "tv", "minibar"]', 20, 'Cozy single room with city view', true),
    ('a2222222-2222-2222-2222-222222222222', 'Deluxe Double', 'DLX-D', 800000, 950000, 3, 1, 200000, '["wifi", "ac", "tv", "minibar", "bathtub", "workspace"]', 30, 'Spacious double room with garden view', true),
    ('a3333333-3333-3333-3333-333333333333', 'Superior Twin', 'SUP-T', 900000, 1100000, 4, 2, 250000, '["wifi", "ac", "tv", "minibar", "bathtub", "balcony"]', 35, 'Twin beds with pool view', true),
    ('a4444444-4444-4444-4444-444444444444', 'Family Suite', 'FAM-S', 1500000, 1800000, 6, 2, 300000, '["wifi", "ac", "tv", "minibar", "bathtub", "kitchen", "livingroom"]', 55, 'Large suite perfect for families', true),
    ('a5555555-5555-5555-5555-555555555555', 'Executive Suite', 'EXE-S', 2000000, 2400000, 4, 1, 400000, '["wifi", "ac", "tv", "minibar", "bathtub", "kitchen", "workspace", "balcony"]', 65, 'Luxury suite with panoramic view', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Rooms
INSERT INTO rooms (id, room_number, room_type_id, floor, view_type, status, is_active)
VALUES 
    -- Floor 1
    ('r1111111-1111-1111-1111-111111111111', '101', 'a1111111-1111-1111-1111-111111111111', 1, 'garden', 'available', true),
    ('r1111111-1111-1111-1111-111111111112', '102', 'a1111111-1111-1111-1111-111111111111', 1, 'garden', 'available', true),
    ('r1111111-1111-1111-1111-111111111113', '103', 'a2222222-2222-2222-2222-222222222222', 1, 'pool', 'available', true),
    ('r1111111-1111-1111-1111-111111111114', '104', 'a2222222-2222-2222-2222-222222222222', 1, 'pool', 'available', true),
    ('r1111111-1111-1111-1111-111111111115', '105', 'a3333333-3333-3333-3333-333333333333', 1, 'garden', 'available', true),
    
    -- Floor 2  
    ('r2222222-2222-2222-2222-222222222221', '201', 'a1111111-1111-1111-1111-111111111111', 2, 'city', 'available', true),
    ('r2222222-2222-2222-2222-222222222222', '202', 'a2222222-2222-2222-2222-222222222222', 2, 'city', 'available', true),
    ('r2222222-2222-2222-2222-222222222223', '203', 'a3333333-3333-3333-3333-333333333333', 2, 'pool', 'available', true),
    ('r2222222-2222-2222-2222-222222222224', '204', 'a3333333-3333-3333-3333-333333333333', 2, 'pool', 'available', true),
    ('r2222222-2222-2222-2222-222222222225', '205', 'a4444444-4444-4444-4444-444444444444', 2, 'city', 'available', true),
    
    -- Floor 3
    ('r3333333-3333-3333-3333-333333333331', '301', 'a2222222-2222-2222-2222-222222222222', 3, 'city', 'available', true),
    ('r3333333-3333-3333-3333-333333333332', '302', 'a3333333-3333-3333-3333-333333333333', 3, 'mountain', 'available', true),
    ('r3333333-3333-3333-3333-333333333333', '303', 'a4444444-4444-4444-4444-444444444444', 3, 'mountain', 'available', true),
    ('r3333333-3333-3333-3333-333333333334', '304', 'a4444444-4444-4444-4444-444444444444', 3, 'city', 'available', true),
    ('r3333333-3333-3333-3333-333333333335', '305', 'a5555555-5555-5555-5555-555555555555', 3, 'mountain', 'available', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Customers
INSERT INTO customers (id, full_name, email, phone, nationality, id_type, id_number, address, city, country, date_of_birth, preferences, status, loyalty_points, total_bookings, total_spent)
VALUES 
    -- Vietnamese Customers
    ('c1111111-1111-1111-1111-111111111111', 'Nguyen Van An', 'nguyen.an@email.com', '0901234567', 'Vietnamese', 'cccd', '001234567890', '123 Le Loi', 'Ho Chi Minh City', 'Vietnam', '1985-05-15', '{"room_preference": "high_floor", "dietary": "none"}', 'active', 1500, 5, 7500000),
    ('c2222222-2222-2222-2222-222222222222', 'Tran Thi Bich', 'tran.bich@email.com', '0912345678', 'Vietnamese', 'cccd', '001234567891', '456 Nguyen Hue', 'Ho Chi Minh City', 'Vietnam', '1990-08-20', '{"room_preference": "quiet", "dietary": "vegetarian"}', 'vip', 3000, 12, 25000000),
    ('c3333333-3333-3333-3333-333333333333', 'Le Hoang Duc', 'le.duc@email.com', '0923456789', 'Vietnamese', 'passport', 'B1234567', '789 Tran Hung Dao', 'Hanoi', 'Vietnam', '1988-03-10', '{"room_preference": "pool_view", "dietary": "none"}', 'active', 800, 3, 4500000),
    ('c4444444-4444-4444-4444-444444444444', 'Pham Thu Huong', 'pham.huong@email.com', '0934567890', 'Vietnamese', 'cccd', '001234567892', '321 Vo Van Tan', 'Da Nang', 'Vietnam', '1992-11-25', '{"room_preference": "garden_view", "dietary": "none"}', 'active', 500, 2, 3000000),
    
    -- International Customers
    ('c5555555-5555-5555-5555-555555555555', 'John Smith', 'john.smith@email.com', '+14155552671', 'American', 'passport', 'US1234567', '123 Main St', 'San Francisco', 'USA', '1980-07-04', '{"room_preference": "high_floor", "dietary": "none"}', 'active', 200, 1, 2000000),
    ('c6666666-6666-6666-6666-666666666666', 'Emma Johnson', 'emma.j@email.com', '+442071234567', 'British', 'passport', 'UK7654321', '10 Oxford Street', 'London', 'UK', '1995-02-14', '{"room_preference": "quiet", "dietary": "gluten_free"}', 'active', 0, 0, 0),
    ('c7777777-7777-7777-7777-777777777777', 'Liu Wei', 'liu.wei@email.cn', '+8613812345678', 'Chinese', 'passport', 'CN9876543', '88 Beijing Road', 'Shanghai', 'China', '1987-09-30', '{"room_preference": "city_view", "dietary": "none"}', 'active', 1000, 4, 6000000),
    ('c8888888-8888-8888-8888-888888888888', 'Tanaka Yuki', 'tanaka@email.jp', '+81312345678', 'Japanese', 'passport', 'JP1122334', '5-1 Shibuya', 'Tokyo', 'Japan', '1983-06-15', '{"room_preference": "quiet", "dietary": "seafood_allergy"}', 'vip', 2500, 8, 18000000),
    ('c9999999-9999-9999-9999-999999999999', 'Marie Dubois', 'marie.d@email.fr', '+33145678901', 'French', 'passport', 'FR5544332', '25 Rue de Rivoli', 'Paris', 'France', '1991-12-20', '{"room_preference": "garden_view", "dietary": "vegetarian"}', 'active', 600, 2, 3500000),
    ('c0000000-0000-0000-0000-000000000000', 'Kim Min-jun', 'kim.mj@email.kr', '+821012345678', 'Korean', 'passport', 'KR6677889', '123 Gangnam-gu', 'Seoul', 'South Korea', '1993-04-08', '{"room_preference": "high_floor", "dietary": "none"}', 'active', 400, 1, 1800000)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE BOOKINGS FOR AUGUST 23-30, 2025
-- =====================================================

INSERT INTO bookings (
    id, 
    booking_code, 
    customer_id, 
    room_id, 
    check_in_date, 
    check_out_date, 
    adults, 
    children, 
    total_amount, 
    paid_amount, 
    status, 
    booking_source, 
    special_requests,
    created_at,
    notes
) VALUES 

-- ===== CURRENTLY STAYING (Checked In) =====
-- These guests are currently in the hotel

-- Booking 1: Mr. Nguyen Van An - Checked in Aug 21, checking out Aug 24
('b0001111-1111-1111-1111-111111111111', 'BK202308001', 'c1111111-1111-1111-1111-111111111111', 
 'r1111111-1111-1111-1111-111111111113', '2025-08-21', '2025-08-24', 2, 0, 2400000, 2400000, 
 'checked_in', 'direct', 'Late check-out if possible', '2025-08-19 10:00:00', 
 'Regular customer, prefers room on lower floor'),

-- Booking 2: Ms. Tran Thi Bich (VIP) - Checked in Aug 22, checking out Aug 26
('b0002222-2222-2222-2222-222222222222', 'BK202308002', 'c2222222-2222-2222-2222-222222222222', 
 'r3333333-3333-3333-3333-333333333335', '2025-08-22', '2025-08-26', 2, 0, 8000000, 8000000, 
 'checked_in', 'website', 'Vegetarian meals, Extra pillows', '2025-08-20 14:30:00', 
 'VIP customer - provide complimentary fruit basket'),

-- Booking 3: Mr. John Smith - Checked in Aug 20, checking out Aug 25
('b0003333-3333-3333-3333-333333333333', 'BK202308003', 'c5555555-5555-5555-5555-555555555555', 
 'r2222222-2222-2222-2222-222222222222', '2025-08-20', '2025-08-25', 1, 0, 4000000, 4000000, 
 'checked_in', 'booking.com', 'High floor, away from elevator', '2025-08-18 09:00:00', 
 'Business traveler, requested invoice'),

-- Booking 4: Mr. Tanaka Yuki (VIP) - Checked in Aug 23, checking out Aug 28
('b0004444-4444-4444-4444-444444444444', 'BK202308004', 'c8888888-8888-8888-8888-888888888888', 
 'r3333333-3333-3333-3333-333333333334', '2025-08-23', '2025-08-28', 2, 1, 7500000, 7500000, 
 'checked_in', 'agoda', 'No seafood, Japanese newspaper', '2025-08-21 16:00:00', 
 'VIP customer - allergic to seafood'),

-- ===== ARRIVING TODAY (Aug 23) =====

-- Booking 5: Ms. Emma Johnson - Arriving today, staying until Aug 27
('b0005555-5555-5555-5555-555555555555', 'BK202308005', 'c6666666-6666-6666-6666-666666666666', 
 'r1111111-1111-1111-1111-111111111112', '2025-08-23', '2025-08-27', 1, 0, 2000000, 1000000, 
 'confirmed', 'direct', 'Gluten-free options for breakfast', '2025-08-22 11:00:00', 
 'First time guest, arriving on evening flight'),

-- Booking 6: Mr. Liu Wei - Arriving today, staying until Aug 26
('b0006666-6666-6666-6666-666666666666', 'BK202308006', 'c7777777-7777-7777-7777-777777777777', 
 'r2222222-2222-2222-2222-222222222223', '2025-08-23', '2025-08-26', 2, 0, 2700000, 2700000, 
 'confirmed', 'expedia', 'City view preferred', '2025-08-20 13:45:00', 
 'Requested early check-in at 11 AM'),

-- ===== FUTURE ARRIVALS (Aug 24-30) =====

-- Booking 7: Mr. Le Hoang Duc - Aug 24-27
('b0007777-7777-7777-7777-777777777777', 'BK202308007', 'c3333333-3333-3333-3333-333333333333', 
 'r1111111-1111-1111-1111-111111111114', '2025-08-24', '2025-08-27', 2, 0, 2400000, 1200000, 
 'confirmed', 'direct', 'Pool view room', '2025-08-22 08:30:00', 
 'Celebrating anniversary'),

-- Booking 8: Ms. Pham Thu Huong - Aug 25-29
('b0008888-8888-8888-8888-888888888888', 'BK202308008', 'c4444444-4444-4444-4444-444444444444', 
 'r1111111-1111-1111-1111-111111111115', '2025-08-25', '2025-08-29', 2, 1, 3600000, 0, 
 'pending', 'walk_in', 'Garden view, quiet room', '2025-08-23 15:20:00', 
 'Awaiting payment confirmation'),

-- Booking 9: Ms. Marie Dubois - Aug 26-30
('b0009999-9999-9999-9999-999999999999', 'BK202308009', 'c9999999-9999-9999-9999-999999999999', 
 'r2222222-2222-2222-2222-222222222224', '2025-08-26', '2025-08-30', 2, 0, 3600000, 3600000, 
 'confirmed', 'booking.com', 'Vegetarian meals, French speaking staff', '2025-08-21 10:00:00', 
 'Honeymoon couple - arrange room decoration'),

-- Booking 10: Mr. Kim Min-jun - Aug 27-30
('b0010000-0000-0000-0000-000000000000', 'BK202308010', 'c0000000-0000-0000-0000-000000000000', 
 'r3333333-3333-3333-3333-333333333331', '2025-08-27', '2025-08-30', 1, 0, 2400000, 1200000, 
 'confirmed', 'agoda', 'High floor, city view', '2025-08-23 12:00:00', 
 'Business trip - needs workspace'),

-- Booking 11: Family Suite - Aug 28-31 (extends past our range)
('b0011111-1111-1111-1111-111111111111', 'BK202308011', 'c1111111-1111-1111-1111-111111111111', 
 'r2222222-2222-2222-2222-222222222225', '2025-08-28', '2025-08-31', 2, 2, 4500000, 2250000, 
 'confirmed', 'direct', 'Family with small children, need crib', '2025-08-24 09:00:00', 
 'Return customer - family vacation'),

-- Booking 12: Weekend stay - Aug 29-31
('b0012222-2222-2222-2222-222222222222', 'BK202308012', 'c2222222-2222-2222-2222-222222222222', 
 'r1111111-1111-1111-1111-111111111111', '2025-08-29', '2025-08-31', 1, 0, 1200000, 1200000, 
 'confirmed', 'website', 'Quiet room for rest', '2025-08-25 14:00:00', 
 'Weekend getaway'),

-- ===== COMPLETED STAYS (Checked Out Recently) =====

-- Booking 13: Checked out Aug 22
('b0013333-3333-3333-3333-333333333333', 'BK202308013', 'c3333333-3333-3333-3333-333333333333', 
 'r3333333-3333-3333-3333-333333333332', '2025-08-19', '2025-08-22', 2, 0, 2700000, 2700000, 
 'checked_out', 'direct', 'Mountain view', '2025-08-17 10:00:00', 
 'Smooth stay, no issues'),

-- Booking 14: Checked out Aug 21
('b0014444-4444-4444-4444-444444444444', 'BK202308014', 'c7777777-7777-7777-7777-777777777777', 
 'r1111111-1111-1111-1111-111111111111', '2025-08-18', '2025-08-21', 1, 0, 1500000, 1500000, 
 'checked_out', 'walk_in', 'None', '2025-08-18 14:00:00', 
 'Extended stay by one day'),

-- ===== CANCELLED BOOKINGS =====

-- Booking 15: Cancelled - was for Aug 25-28
('b0015555-5555-5555-5555-555555555555', 'BK202308015', 'c5555555-5555-5555-5555-555555555555', 
 NULL, '2025-08-25', '2025-08-28', 2, 0, 2400000, 0, 
 'cancelled', 'expedia', 'High floor room', '2025-08-20 11:00:00', 
 'Cancelled due to flight cancellation - full refund'),

-- ===== NO SHOW =====

-- Booking 16: No show - was for Aug 22
('b0016666-6666-6666-6666-666666666666', 'BK202308016', 'c9999999-9999-9999-9999-999999999999', 
 NULL, '2025-08-22', '2025-08-24', 1, 0, 1600000, 800000, 
 'no_show', 'booking.com', 'Garden view', '2025-08-19 16:00:00', 
 'No show - charged first night')

ON CONFLICT (id) DO NOTHING;

-- Update room status based on bookings
UPDATE rooms SET status = 'occupied' 
WHERE id IN (
    SELECT room_id FROM bookings 
    WHERE status = 'checked_in' 
    AND check_out_date >= CURRENT_DATE
);

-- Summary Statistics
SELECT 
    'Booking Statistics for Aug 23-30' as report,
    COUNT(*) FILTER (WHERE status = 'checked_in') as currently_staying,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND check_in_date = '2025-08-23') as arriving_today,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND check_in_date > '2025-08-23') as future_arrivals,
    COUNT(*) FILTER (WHERE status = 'checked_out') as recently_checked_out,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    COUNT(*) as total_bookings
FROM bookings
WHERE created_at >= '2025-08-17';