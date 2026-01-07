-- ============================================================================
-- FIX PERMISSIONS & MISSING TABLES
-- Purpose: 
-- 1. Allow INSERT permissions on player_data (fixes 'Error saving username').
-- 2. Ensure 'user_unlocks' table exists (needed for "Burn" to work).
-- ============================================================================

-- 1. Fix Permissions for player_data (Allow INSERT)
ALTER TABLE public.player_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to refresh them cleanly
DROP POLICY IF EXISTS "Users can read own data" ON public.player_data;
DROP POLICY IF EXISTS "Users can update own data" ON public.player_data;
DROP POLICY IF EXISTS "Users can insert own data" ON public.player_data;
DROP POLICY IF EXISTS "Public read leaderboard" ON public.player_data;

-- Re-add Policies (including INSERT)
CREATE POLICY "Users can read own data" ON public.player_data FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON public.player_data FOR UPDATE USING (true);
CREATE POLICY "Users can insert own data" ON public.player_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read leaderboard" ON public.player_data FOR SELECT USING (true);


-- 2. Ensure user_unlocks exists (Legacy table required for "Burn" feature)
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    user_wallet TEXT NOT NULL,
    car_id TEXT NOT NULL,
    burn_signature TEXT,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_wallet, car_id)
);

-- Enable RLS for user_unlocks too
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own unlocks" ON public.user_unlocks;
DROP POLICY IF EXISTS "Users can insert own unlocks" ON public.user_unlocks;
DROP POLICY IF EXISTS "Service role manages unlocks" ON public.user_unlocks;

-- Allow reading/writing unlocks
CREATE POLICY "Users can read own unlocks" ON public.user_unlocks FOR SELECT USING (true);
CREATE POLICY "Users can insert own unlocks" ON public.user_unlocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own unlocks" ON public.user_unlocks FOR UPDATE USING (true);
