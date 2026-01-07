-- =========================================
-- Supabase SQL Schema: user_unlocks
-- =========================================
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS user_unlocks (
    user_wallet TEXT NOT NULL,
    car_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    burn_signature TEXT, -- Optional: store the burn tx signature for reference
    PRIMARY KEY (user_wallet, car_id)
);

-- Index for faster lookups by user wallet
CREATE INDEX IF NOT EXISTS idx_user_unlocks_wallet ON user_unlocks(user_wallet);

-- Index for faster lookups by car_id
CREATE INDEX IF NOT EXISTS idx_user_unlocks_car ON user_unlocks(car_id);

-- Enable Row Level Security
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all unlocks (needed for leaderboard, etc.)
CREATE POLICY "Users can view all unlocks" ON user_unlocks
    FOR SELECT USING (true);

-- Policy: Allow inserts from Edge Functions (service role)
CREATE POLICY "Allow insert unlocks" ON user_unlocks
    FOR INSERT WITH CHECK (true);

-- =========================================
-- Example Queries:
-- =========================================

-- Check if a user has unlocked a specific car:
-- SELECT EXISTS(SELECT 1 FROM user_unlocks WHERE user_wallet = 'WALLET' AND car_id = 'CAR_ID');

-- Get all unlocks for a user:
-- SELECT * FROM user_unlocks WHERE user_wallet = 'WALLET' ORDER BY unlocked_at DESC;

-- Get all users who unlocked a specific car:
-- SELECT * FROM user_unlocks WHERE car_id = 'CAR_ID' ORDER BY unlocked_at DESC;
