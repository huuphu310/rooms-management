-- Create currency_config table
CREATE TABLE IF NOT EXISTS currency_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    rates JSONB DEFAULT '{}',
    auto_update BOOLEAN DEFAULT false,
    update_frequency VARCHAR(20) DEFAULT 'daily',
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a single row for the config (singleton pattern)
INSERT INTO currency_config (base_currency)
VALUES ('VND')
ON CONFLICT DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_currency_config_updated_at ON currency_config(updated_at);

-- Enable RLS
ALTER TABLE currency_config ENABLE ROW LEVEL SECURITY;

-- Create policies for currency_config
-- Everyone can read currency config
CREATE POLICY "Anyone can view currency config" ON currency_config
    FOR SELECT
    USING (true);

-- Only admins can update currency config
CREATE POLICY "Only admins can update currency config" ON currency_config
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role = 'admin'
        )
    );

-- Only admins can insert currency config
CREATE POLICY "Only admins can insert currency config" ON currency_config
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role = 'admin'
        )
    );