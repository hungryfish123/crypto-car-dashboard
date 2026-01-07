-- ============================================================================
-- REVERT SCHEMA MIGRATION (FIXED ORDER)
-- Purpose: Restore the database to its previous state (Separate tables).
-- ============================================================================

-- 1. Drop the View FIRST (fixes dependency error)
DROP VIEW IF EXISTS public.leaderboard_view;

-- 2. Drop the new unified table
DROP TABLE IF EXISTS public.player_data CASCADE; 
-- (Added CASCADE just in case, but dropping view first is the main fix)

-- 3. Restore old tables by renaming them back
ALTER TABLE IF EXISTS public.burned_transactions_backup RENAME TO burned_transactions;
ALTER TABLE IF EXISTS public.user_holdings_backup RENAME TO user_holdings;
ALTER TABLE IF EXISTS public.item_mappings_backup RENAME TO item_mappings;
ALTER TABLE IF EXISTS public.items_backup RENAME TO items;
ALTER TABLE IF EXISTS public.payout_logs_backup RENAME TO payout_logs;
ALTER TABLE IF EXISTS public.system_cache_backup RENAME TO system_cache;

-- 4. Recreate the Leaderboard View based on the ORIGINAL tables
-- (Assuming the view existed before. If not, this step can be skipped or adjusted.
--  Based on previous context, this view might have been custom created during dev.)
CREATE OR REPLACE VIEW leaderboard_view AS
 SELECT 
    pd.username,
    pd.net_worth,
    pd.wallet_id
   FROM player_data pd -- Assuming player_data existed as a base table before too?
   ORDER BY pd.net_worth DESC;
