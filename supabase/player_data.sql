-- =========================================
-- Supabase SQL Schema: player_data
-- =========================================
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE player_data (
    wallet_id TEXT PRIMARY KEY,
    car_color TEXT DEFAULT '#FF0000',
    inventory JSONB DEFAULT '[]'::jsonb,
    equipped_parts JSONB DEFAULT '{}'::jsonb,
    cash NUMERIC DEFAULT 50000,
    net_worth NUMERIC DEFAULT 0,
    referral_code TEXT UNIQUE,
    referral_earnings NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by referral code
CREATE INDEX idx_player_data_referral ON player_data(referral_code);

-- Enable Row Level Security
ALTER TABLE player_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read (for leaderboards, etc.)
CREATE POLICY "Allow public read" ON player_data
    FOR SELECT USING (true);

-- Policy: Allow anyone to insert (for new user registration)
CREATE POLICY "Allow public insert" ON player_data
    FOR INSERT WITH CHECK (true);

-- Policy: Allow anyone to update (for saving progress)
CREATE POLICY "Allow public update" ON player_data
    FOR UPDATE USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update timestamp on changes
CREATE TRIGGER update_player_data_updated_at
    BEFORE UPDATE ON player_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Example Queries:
-- =========================================

-- Get player data:
-- SELECT * FROM player_data WHERE wallet_id = 'YOUR_WALLET_ADDRESS';

-- Update car color:
-- UPDATE player_data SET car_color = '#00FF00' WHERE wallet_id = 'YOUR_WALLET_ADDRESS';
