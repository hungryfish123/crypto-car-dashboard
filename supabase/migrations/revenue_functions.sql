-- =====================================================
-- HELPER FUNCTIONS FOR REVENUE DISTRIBUTION
-- Run this AFTER the main schema migration
-- =====================================================

-- Function to atomically increment claimable_sol
-- This prevents race conditions during batch updates
CREATE OR REPLACE FUNCTION increment_claimable_sol(
    wallet_address TEXT,
    amount_to_add NUMERIC
)
RETURNS VOID AS $$
BEGIN
    -- Insert if not exists, update if exists (atomic upsert with increment)
    INSERT INTO user_rewards (user_wallet, claimable_sol, lifetime_earnings)
    VALUES (wallet_address, amount_to_add, 0)
    ON CONFLICT (user_wallet) 
    DO UPDATE SET 
        claimable_sol = user_rewards.claimable_sol + amount_to_add,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user's total rewards info
CREATE OR REPLACE FUNCTION get_user_rewards_summary(wallet_address TEXT)
RETURNS TABLE (
    claimable NUMERIC,
    lifetime NUMERIC,
    last_claim TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(claimable_sol, 0) as claimable,
        COALESCE(lifetime_earnings, 0) as lifetime,
        last_claim_at as last_claim
    FROM user_rewards
    WHERE user_wallet = wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Function to get distribution statistics
CREATE OR REPLACE FUNCTION get_distribution_stats()
RETURNS TABLE (
    total_distributions BIGINT,
    total_sol_distributed NUMERIC,
    total_users_affected BIGINT,
    last_distribution TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_distributions,
        COALESCE(SUM(total_fee_amount), 0) as total_sol_distributed,
        COALESCE(SUM(users_affected), 0) as total_users_affected,
        MAX(distributed_at) as last_distribution
    FROM distribution_logs;
END;
$$ LANGUAGE plpgsql;

-- Function to sync user holdings from on-chain data
-- Call this to update a user's token balances
CREATE OR REPLACE FUNCTION sync_user_holding(
    wallet TEXT,
    item_uuid UUID,
    new_balance NUMERIC
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_holdings (user_wallet, item_id, balance, last_updated)
    VALUES (wallet, item_uuid, new_balance, NOW())
    ON CONFLICT (user_wallet, item_id)
    DO UPDATE SET 
        balance = new_balance,
        last_updated = NOW();
    
    -- Clean up if balance is 0
    DELETE FROM user_holdings 
    WHERE user_wallet = wallet 
      AND item_id = item_uuid 
      AND balance <= 0;
END;
$$ LANGUAGE plpgsql;
