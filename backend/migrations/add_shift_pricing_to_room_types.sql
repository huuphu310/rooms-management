-- Add shift-based pricing fields to room_types table

-- Add pricing mode column
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT 'traditional' CHECK (pricing_mode IN ('traditional', 'shift'));

-- Add shift pricing columns
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS day_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS night_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS full_day_price DECIMAL(10, 2);

-- Add weekend shift pricing overrides
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS weekend_day_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekend_night_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekend_full_day_price DECIMAL(10, 2);

-- Add holiday shift pricing overrides
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS holiday_day_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS holiday_night_shift_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS holiday_full_day_price DECIMAL(10, 2);

-- Add shift time configuration
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS day_shift_start_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS day_shift_end_time TIME DEFAULT '16:30:00',
ADD COLUMN IF NOT EXISTS night_shift_start_time TIME DEFAULT '17:30:00',
ADD COLUMN IF NOT EXISTS night_shift_end_time TIME DEFAULT '08:30:00';

-- Add cleaning time configuration
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS cleaning_time_minutes INTEGER DEFAULT 30 CHECK (cleaning_time_minutes >= 0 AND cleaning_time_minutes <= 240);

-- Add separate occupancy fields if they don't exist
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS standard_adults_occupancy INTEGER DEFAULT 2 CHECK (standard_adults_occupancy >= 1 AND standard_adults_occupancy <= 10),
ADD COLUMN IF NOT EXISTS standard_children_occupancy INTEGER DEFAULT 0 CHECK (standard_children_occupancy >= 0 AND standard_children_occupancy <= 10);

-- Update a sample room type to use shift-based pricing for testing
-- This is optional and can be commented out if not needed
UPDATE room_types 
SET 
    pricing_mode = 'shift',
    day_shift_price = base_price * 0.6,  -- 60% of base price for day shift
    night_shift_price = base_price * 0.8, -- 80% of base price for night shift
    full_day_price = base_price * 1.2    -- 120% of base price for full day
WHERE name LIKE '%Standard%' 
LIMIT 1;