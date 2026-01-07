-- ============================================================================
-- FIX X PROFILE (TWITTER) SAVING
-- Purpose: Add missing 'x_profile' column to player_data and update Leaderboard view.
-- ============================================================================

-- 1. Add the missing column to player_data
ALTER TABLE public.player_data 
ADD COLUMN IF NOT EXISTS x_profile TEXT;

-- 2. Update the Leaderboard View to include x_profile
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW leaderboard_view AS
 SELECT 
    pd.username,
    pd.net_worth,
    pd.wallet_id,
    pd.avatar_url,
    pd.x_profile,    -- Added this line
    pd.car_color     -- Added this just in case leaderboard needs it
   FROM player_data pd
   ORDER BY pd.net_worth DESC;

-- 3. Ensure Permissions are still correct (Just to be safe)
ALTER TABLE public.player_data ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.player_data TO authenticated;
GRANT ALL ON public.player_data TO service_role;
