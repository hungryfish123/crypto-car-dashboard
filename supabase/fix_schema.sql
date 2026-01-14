-- ===========================================
-- DATABASE FIX SCRIPT
-- Run this in Supabase SQL Editor to fix the white screen crashes
-- ===========================================

-- 1. Fix player_data (Missing column causing crash)
ALTER TABLE public.player_data 
ADD COLUMN IF NOT EXISTS total_sol_earned NUMERIC DEFAULT 0;

-- 2. Create user_unlocks (Missing table causing 404)
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    car_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_wallet, car_id)
);

-- 3. Enable Access (RLS)
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- Allow public access (to match existing insecure pattern for quick fix)
-- Ideally update this to auth.uid() later
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_unlocks' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON public.user_unlocks FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

SELECT 'Database schema fixed successfully' as status;
