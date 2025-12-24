-- =========================================
-- Supabase SQL Schema: burned_transactions
-- =========================================
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE burned_transactions (
    signature TEXT PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    amount_burned NUMERIC NOT NULL,
    burned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by user wallet
CREATE INDEX idx_burned_transactions_wallet ON burned_transactions(user_wallet);

-- Index for faster lookups by timestamp
CREATE INDEX idx_burned_transactions_date ON burned_transactions(burned_at);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE burned_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own transactions
CREATE POLICY "Users can view own burns" ON burned_transactions
    FOR SELECT USING (true);

-- Policy: Allow inserts (for recording burns)
CREATE POLICY "Allow insert burns" ON burned_transactions
    FOR INSERT WITH CHECK (true);

-- =========================================
-- Example Queries:
-- =========================================

-- Check if a signature has been used:
-- SELECT EXISTS(SELECT 1 FROM burned_transactions WHERE signature = 'YOUR_TX_SIGNATURE');

-- Get all burns for a user:
-- SELECT * FROM burned_transactions WHERE user_wallet = 'USER_WALLET_ADDRESS' ORDER BY burned_at DESC;

-- Get total burned by a user:
-- SELECT SUM(amount_burned) as total_burned FROM burned_transactions WHERE user_wallet = 'USER_WALLET_ADDRESS';
