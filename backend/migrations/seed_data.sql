-- Seed data for Homestay Management System
-- This file contains sample data for testing and development

-- Disable read-only mode
SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;

-- Insert sample room types
INSERT INTO room_types (name, base_price, weekend_price, max_occupancy, min_occupancy, extra_person_charge, size_sqm, description)
VALUES 
  ('Standard Single', 500000, 600000, 2, 1, 100000, 20, 'Cozy single room with basic amenities'),
  ('Standard Double', 700000, 850000, 3, 2, 150000, 25, 'Comfortable double room for couples'),
  ('Deluxe Room', 1000000, 1200000, 4, 2, 200000, 35, 'Spacious deluxe room with city view'),
  ('Suite', 1500000, 1800000, 5, 2, 250000, 50, 'Luxury suite with separate living area'),
  ('Family Room', 1200000, 1400000, 6, 3, 200000, 45, 'Large family room with multiple beds')
ON CONFLICT (name) DO NOTHING;

-- Insert sample rooms
WITH room_types_data AS (
  SELECT id, name FROM room_types
)
INSERT INTO rooms (room_number, room_type_id, floor, view_type, status)
SELECT 
  room_num,
  rt.id,
  floor_num,
  view_type,
  'available'
FROM (
  VALUES 
    ('101', 'Standard Single', 1, 'garden'),
    ('102', 'Standard Single', 1, 'garden'),
    ('103', 'Standard Double', 1, 'pool'),
    ('104', 'Standard Double', 1, 'pool'),
    ('201', 'Deluxe Room', 2, 'city'),
    ('202', 'Deluxe Room', 2, 'city'),
    ('203', 'Suite', 2, 'sea'),
    ('204', 'Family Room', 2, 'mountain'),
    ('301', 'Suite', 3, 'sea'),
    ('302', 'Deluxe Room', 3, 'mountain')
) AS room_data(room_num, room_type_name, floor_num, view_type)
JOIN room_types_data rt ON rt.name = room_type_name
ON CONFLICT (room_number) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (customer_code, full_name, email, phone, nationality, address, city, country, customer_type)
VALUES 
  ('CUST001', 'John Doe', 'john.doe@email.com', '+84901234567', 'USA', '123 Main St', 'New York', 'USA', 'individual'),
  ('CUST002', 'Jane Smith', 'jane.smith@email.com', '+84902345678', 'UK', '456 High St', 'London', 'UK', 'individual'),
  ('CUST003', 'Nguyen Van A', 'nguyenvana@email.com', '+84903456789', 'Vietnam', '789 Le Loi', 'Ho Chi Minh', 'Vietnam', 'vip'),
  ('CUST004', 'Company ABC', 'contact@abc.com', '+84904567890', 'Vietnam', '321 Nguyen Hue', 'Ho Chi Minh', 'Vietnam', 'corporate'),
  ('CUST005', 'Maria Garcia', 'maria.g@email.com', '+84905678901', 'Spain', '555 Gran Via', 'Madrid', 'Spain', 'individual')
ON CONFLICT (customer_code) DO NOTHING;

-- Insert sample user profiles (for testing authentication)
-- Note: In production, users should be created through Supabase Auth
-- This is just for reference and won't work without auth.users entries

-- Insert sample products for inventory
INSERT INTO product_categories (name, description, display_order)
VALUES 
  ('Beverages', 'Drinks and beverages', 1),
  ('Snacks', 'Snacks and light meals', 2),
  ('Toiletries', 'Personal care items', 3),
  ('Room Supplies', 'Room amenities and supplies', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert sample units
INSERT INTO units (name, abbreviation, type)
VALUES 
  ('Piece', 'pcs', 'count'),
  ('Bottle', 'btl', 'count'),
  ('Pack', 'pack', 'count'),
  ('Box', 'box', 'count'),
  ('Kilogram', 'kg', 'weight')
ON CONFLICT (abbreviation) DO NOTHING;

-- Insert sample services
INSERT INTO service_categories (name, description, display_order)
VALUES 
  ('Spa & Wellness', 'Massage and spa services', 1),
  ('Laundry', 'Laundry and dry cleaning', 2),
  ('Transportation', 'Airport and local transfers', 3),
  ('Tours', 'Sightseeing and tour packages', 4)
ON CONFLICT (name) DO NOTHING;

WITH service_cat AS (
  SELECT id, name FROM service_categories
)
INSERT INTO services (service_code, name, category_id, price, duration_minutes, description)
SELECT 
  service_code,
  service_name,
  sc.id,
  price,
  duration,
  description
FROM (
  VALUES 
    ('SPA001', 'Traditional Massage', 'Spa & Wellness', 500000, 60, 'Relaxing traditional Vietnamese massage'),
    ('SPA002', 'Hot Stone Therapy', 'Spa & Wellness', 700000, 90, 'Hot stone massage therapy'),
    ('LAUN001', 'Regular Laundry', 'Laundry', 50000, 1440, 'Standard laundry service (per kg)'),
    ('LAUN002', 'Express Laundry', 'Laundry', 100000, 240, 'Express laundry service (per kg)'),
    ('TRANS001', 'Airport Transfer', 'Transportation', 300000, 60, 'One-way airport transfer'),
    ('TOUR001', 'City Tour', 'Tours', 800000, 480, 'Full day city sightseeing tour')
) AS service_data(service_code, service_name, cat_name, price, duration, description)
JOIN service_cat sc ON sc.name = cat_name
ON CONFLICT (service_code) DO NOTHING;

-- Note: Bookings should be created through the API to ensure proper validation
-- Sample booking data would require actual customer and room IDs

COMMIT;