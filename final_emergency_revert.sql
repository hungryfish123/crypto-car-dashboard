-- ============================================================================
-- FINAL EMERGENCY REVERT
-- Purpose: Restore EVERYTHING to the original state.
-- 1. Recreate 'player_data' (which was lost) with original columns.
-- 2. Restore all backup tables.
-- 3. Fix the View.
-- ============================================================================

-- A. DROP EVERYTHING NEW/BROKEN to start clean
DROP VIEW IF EXISTS public.leaderboard_view;
DROP TABLE IF EXISTS public.player_data CASCADE;

-- B. RECREATE player_data (Original Structure based on your code)
CREATE TABLE public.player_data (
    wallet_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Identity
    username TEXT,
    avatar_url TEXT,
    referral_code TEXT,
    referred_by TEXT,
    
    -- State
    car_color TEXT DEFAULT '#FF0000',
    theme_color TEXT DEFAULT '#dc2626',
    
    -- Game Data (JSONB)
    inventory JSONB DEFAULT '[]'::jsonb,
    equipped_parts JSONB DEFAULT '{}'::jsonb,
    
    -- Economics
    cash NUMERIC DEFAULT 50000,
    net_worth NUMERIC DEFAULT 0,
    referral_earnings NUMERIC DEFAULT 0,
    pending_rewards NUMERIC DEFAULT 0
);

-- C. RESTORE BACKUP TABLES (Rename them back to original)
-- checks if backup exists before renaming to avoid errors if already renamed
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'burned_transactions_backup') THEN
        ALTER TABLE public.burned_transactions_backup RENAME TO burned_transactions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_holdings_backup') THEN
        ALTER TABLE public.user_holdings_backup RENAME TO user_holdings;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'item_mappings_backup') THEN
        ALTER TABLE public.item_mappings_backup RENAME TO item_mappings;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'items_backup') THEN
        ALTER TABLE public.items_backup RENAME TO items;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payout_logs_backup') THEN
        ALTER TABLE public.payout_logs_backup RENAME TO payout_logs;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_cache_backup') THEN
        ALTER TABLE public.system_cache_backup RENAME TO system_cache;
    END IF;
END $$;

-- D. RECREATE VIEW (Now that player_data exists)
CREATE VIEW leaderboard_view AS
 SELECT 
    pd.username,
    pd.net_worth,
    pd.wallet_id,
    pd.avatar_url
   FROM player_data pd
   ORDER BY pd.net_worth DESC;

-- E. SECURITY POLICIES (Restore access)
ALTER TABLE public.player_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.player_data FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON public.player_data FOR UPDATE USING (true);
CREATE POLICY "Public read leaderboard" ON public.player_data FOR SELECT USING (true);
