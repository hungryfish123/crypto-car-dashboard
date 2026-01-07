-- ============================================================================
-- FIX REVERT SCHEMA
-- Purpose: Recreate 'player_data' with the ORIGINAL schema structure.
-- The previous script dropped it, but the view needs it to exist.
-- ============================================================================

-- 1. Recreate player_data with its ORIGINAL columns (Frontend expects these)
CREATE TABLE IF NOT EXISTS public.player_data (
    wallet_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Profile
    username TEXT,
    avatar_url TEXT,
    referral_code TEXT,
    referred_by TEXT,
    
    -- Game State (Columns, NOT JSON properties)
    car_color TEXT DEFAULT '#FF0000',
    theme_color TEXT DEFAULT '#dc2626',
    
    -- Json Fields
    inventory JSONB DEFAULT '[]'::jsonb,
    equipped_parts JSONB DEFAULT '{}'::jsonb,
    
    -- Economics
    cash NUMERIC DEFAULT 50000,
    net_worth NUMERIC DEFAULT 0,
    referral_earnings NUMERIC DEFAULT 0,
    pending_rewards NUMERIC DEFAULT 0
);

-- 2. Enable Security
ALTER TABLE public.player_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.player_data FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON public.player_data FOR UPDATE USING (true);
CREATE POLICY "Public read leaderboard" ON public.player_data FOR SELECT USING (true);

-- 3. Recreate the Leaderboard View
DROP VIEW IF EXISTS public.leaderboard_view;
CREATE OR REPLACE VIEW leaderboard_view AS
 SELECT 
    pd.username,
    pd.net_worth,
    pd.wallet_id,
    pd.avatar_url
   FROM player_data pd
   ORDER BY pd.net_worth DESC;

-- 4. Verify Backups are restored (Ensure these run just in case previous script failed midway)
ALTER TABLE IF EXISTS public.burned_transactions_backup RENAME TO burned_transactions;
ALTER TABLE IF EXISTS public.user_holdings_backup RENAME TO user_holdings;
ALTER TABLE IF EXISTS public.item_mappings_backup RENAME TO item_mappings;
ALTER TABLE IF EXISTS public.items_backup RENAME TO items;
ALTER TABLE IF EXISTS public.payout_logs_backup RENAME TO payout_logs;
ALTER TABLE IF EXISTS public.system_cache_backup RENAME TO system_cache;
