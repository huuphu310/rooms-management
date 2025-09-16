-- Add cleaning_time_minutes field to room_types table
-- This field defines the minimum time (in minutes) required between check-out and check-in for cleaning

ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS cleaning_time_minutes INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN room_types.cleaning_time_minutes IS 'Minimum time in minutes required for cleaning between shifts (default: 30 minutes)';

-- Update existing room types to have the default value if NULL
UPDATE room_types 
SET cleaning_time_minutes = 30 
WHERE cleaning_time_minutes IS NULL;