-- =====================================================
-- REVENUE DISTRIBUTION SCHEMA
-- Solana Racing Game - Fee Distribution System
-- =====================================================

-- 1. ITEMS TABLE (The Car Parts)
-- Stores all car part tokens with their rarity and weight
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contract_address TEXT UNIQUE NOT NULL,  -- SPL Token Contract Address
    rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'God')),
    total_supply BIGINT NOT NULL DEFAULT 0,
    rarity_weight FLOAT NOT NULL DEFAULT 1.0,  -- Multiplier (God = 5.0, Common = 1.0)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by contract address
CREATE INDEX IF NOT EXISTS idx_items_contract_address ON items(contract_address);

-- 2. USER_HOLDINGS TABLE (The Ledger)
-- Tracks how many of each token each user holds
CREATE TABLE IF NOT EXISTS user_holdings (
    user_wallet TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite primary key: one entry per user per item
    PRIMARY KEY (user_wallet, item_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_holdings_wallet ON user_holdings(user_wallet);
CREATE INDEX IF NOT EXISTS idx_user_holdings_item ON user_holdings(item_id);

-- 3. USER_REWARDS TABLE (The Wallet)
-- Accumulated claimable rewards per user
CREATE TABLE IF NOT EXISTS user_rewards (
    user_wallet TEXT PRIMARY KEY,
    claimable_sol NUMERIC NOT NULL DEFAULT 0 CHECK (claimable_sol >= 0),
    lifetime_earnings NUMERIC NOT NULL DEFAULT 0 CHECK (lifetime_earnings >= 0),
    last_claim_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DISTRIBUTION_LOGS TABLE (Audit Trail)
-- Logs each distribution event for transparency
CREATE TABLE IF NOT EXISTS distribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_fee_amount NUMERIC NOT NULL,
    total_system_score NUMERIC NOT NULL,
    users_affected INTEGER NOT NULL DEFAULT 0,
    distributed_at TIMESTAMPTZ DEFAULT NOW(),
    admin_wallet TEXT,
    notes TEXT
);

-- 5. CLAIM_LOGS TABLE (Claim History)
-- Logs each claim transaction
CREATE TABLE IF NOT EXISTS claim_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet TEXT NOT NULL,
    amount_claimed NUMERIC NOT NULL,
    transaction_signature TEXT,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_claim_logs_wallet ON claim_logs(user_wallet);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rewards_updated_at
    BEFORE UPDATE ON user_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_logs ENABLE ROW LEVEL SECURITY;

-- Items: Public read, Admin write
CREATE POLICY "Items are viewable by everyone" ON items
    FOR SELECT USING (true);

-- User Holdings: Users can view their own holdings
CREATE POLICY "Users can view own holdings" ON user_holdings
    FOR SELECT USING (true);  -- Or restrict: auth.jwt() ->> 'wallet' = user_wallet

-- User Rewards: Users can view their own rewards
CREATE POLICY "Users can view own rewards" ON user_rewards
    FOR SELECT USING (true);  -- Or restrict: auth.jwt() ->> 'wallet' = user_wallet

-- Distribution Logs: Public read for transparency
CREATE POLICY "Distribution logs are public" ON distribution_logs
    FOR SELECT USING (true);

-- Claim Logs: Users can view their own claims
CREATE POLICY "Users can view own claims" ON claim_logs
    FOR SELECT USING (true);  -- Or restrict: user_wallet = auth.jwt() ->> 'wallet'

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample items:
/*
INSERT INTO items (name, contract_address, rarity, total_supply, rarity_weight) VALUES
    ('Basic Engine', 'SPL_CONTRACT_1', 'Common', 10000, 1.0),
    ('Turbo Boost', 'SPL_CONTRACT_2', 'Rare', 5000, 2.0),
    ('Nitro System', 'SPL_CONTRACT_3', 'Epic', 2500, 3.0),
    ('Quantum Drive', 'SPL_CONTRACT_4', 'Legendary', 1000, 4.0),
    ('God Tier Engine', 'SPL_CONTRACT_5', 'God', 100, 5.0);
*/
