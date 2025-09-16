-- Add cleaning duration and cleaning started fields to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS cleaning_duration_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN rooms.cleaning_duration_hours IS 'Duration in hours required for cleaning this room';
COMMENT ON COLUMN rooms.cleaning_started_at IS 'Timestamp when cleaning started after checkout';

-- Update room status enum if needed (add being_cleaned status)
-- Note: In PostgreSQL, we need to check if the value exists in the enum type
DO $$ 
BEGIN
    -- Check if 'being_cleaned' is not in the enum and add it
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'being_cleaned' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'room_status'
        )
    ) THEN
        ALTER TYPE room_status ADD VALUE 'being_cleaned' AFTER 'occupied';
    END IF;
END $$;