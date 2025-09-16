-- Migration: 012 - Shift-Based Pricing System
-- Description: Add shift-based accommodation pricing support
-- Date: 2025-01-21

BEGIN;

-- =====================================================
-- 1. Add shift pricing fields to room_types table
-- =====================================================

-- Add shift-based pricing fields
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS day_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS night_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS full_day_price DECIMAL(10, 2);

-- Add weekend shift pricing overrides
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS weekend_day_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS weekend_night_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS weekend_full_day_price DECIMAL(10, 2);

-- Add holiday shift pricing overrides
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS holiday_day_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS holiday_night_shift_price DECIMAL(10, 2);
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS holiday_full_day_price DECIMAL(10, 2);

-- Add shift time configuration
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS day_shift_start_time TIME DEFAULT '09:00:00';
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS day_shift_end_time TIME DEFAULT '16:30:00';
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS night_shift_start_time TIME DEFAULT '17:30:00';
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS night_shift_end_time TIME DEFAULT '08:30:00';

-- Add pricing mode column
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT 'traditional';

-- Add constraint for pricing mode
ALTER TABLE room_types ADD CONSTRAINT IF NOT EXISTS valid_pricing_mode 
    CHECK (pricing_mode IN ('traditional', 'shift'));

-- =====================================================
-- 2. Create shift type enum if not exists
-- =====================================================

-- Create shift_type enum type (PostgreSQL specific)
DO $$ BEGIN
    CREATE TYPE shift_type AS ENUM ('day_shift', 'night_shift', 'full_day', 'traditional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. Add shift-based booking fields to bookings table
-- =====================================================

-- Add shift type column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shift_type shift_type DEFAULT 'traditional';

-- Add shift date for specific shift bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shift_date DATE;

-- Add total shifts for multi-shift bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_shifts INTEGER DEFAULT 1;

-- =====================================================
-- 4. Update existing data with default values
-- =====================================================

-- Set default shift pricing based on base prices for existing room types
UPDATE room_types 
SET 
    day_shift_price = COALESCE(day_shift_price, base_price * 0.6),  -- 60% of base price for day shift
    night_shift_price = COALESCE(night_shift_price, base_price * 0.8), -- 80% of base price for night shift
    full_day_price = COALESCE(full_day_price, base_price),  -- Same as base price for full day
    pricing_mode = COALESCE(pricing_mode, 'traditional')
WHERE pricing_mode IS NULL OR day_shift_price IS NULL OR night_shift_price IS NULL OR full_day_price IS NULL;

-- Set shift_date for existing bookings to check_in_date
UPDATE bookings 
SET shift_date = check_in_date 
WHERE shift_date IS NULL;

-- =====================================================
-- 5. Add helpful comments
-- =====================================================

COMMENT ON COLUMN room_types.day_shift_price IS 'Price for day shift (9:00 AM - 4:30 PM)';
COMMENT ON COLUMN room_types.night_shift_price IS 'Price for night shift (5:30 PM - 8:30 AM next day)';
COMMENT ON COLUMN room_types.full_day_price IS 'Price for full day (both shifts combined)';
COMMENT ON COLUMN room_types.weekend_day_shift_price IS 'Weekend override price for day shift';
COMMENT ON COLUMN room_types.weekend_night_shift_price IS 'Weekend override price for night shift';
COMMENT ON COLUMN room_types.weekend_full_day_price IS 'Weekend override price for full day';
COMMENT ON COLUMN room_types.holiday_day_shift_price IS 'Holiday override price for day shift';
COMMENT ON COLUMN room_types.holiday_night_shift_price IS 'Holiday override price for night shift';
COMMENT ON COLUMN room_types.holiday_full_day_price IS 'Holiday override price for full day';
COMMENT ON COLUMN room_types.pricing_mode IS 'Pricing mode: traditional (per night) or shift (per shift)';
COMMENT ON COLUMN room_types.day_shift_start_time IS 'Default start time for day shift';
COMMENT ON COLUMN room_types.day_shift_end_time IS 'Default end time for day shift';
COMMENT ON COLUMN room_types.night_shift_start_time IS 'Default start time for night shift';
COMMENT ON COLUMN room_types.night_shift_end_time IS 'Default end time for night shift (next day)';

COMMENT ON COLUMN bookings.shift_type IS 'Type of shift booked: day_shift, night_shift, full_day, or traditional';
COMMENT ON COLUMN bookings.shift_date IS 'Specific date for the shift booking';
COMMENT ON COLUMN bookings.total_shifts IS 'Number of shifts booked (for multi-shift bookings)';

-- =====================================================
-- 6. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_room_types_pricing_mode ON room_types(pricing_mode);
CREATE INDEX IF NOT EXISTS idx_bookings_shift_type ON bookings(shift_type);
CREATE INDEX IF NOT EXISTS idx_bookings_shift_date ON bookings(shift_date);
CREATE INDEX IF NOT EXISTS idx_bookings_shift_type_date ON bookings(shift_type, shift_date);

COMMIT;