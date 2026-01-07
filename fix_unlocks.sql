-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    car_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_wallet, car_id)
);

-- Enable RLS
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access" ON public.user_unlocks;
DROP POLICY IF EXISTS "Allow public insert access" ON public.user_unlocks;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.user_unlocks;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.user_unlocks;

-- Create permissive policies for now (checking wallet on client/logic side)
-- Allow anyone to read unlocks (needed so we can see what cars a user has)
CREATE POLICY "Enable read access for all users" ON public.user_unlocks
    FOR SELECT USING (true);

-- Allow anyone to insert (needed for the simple unlock button)
CREATE POLICY "Enable insert access for all users" ON public.user_unlocks
    FOR INSERT WITH CHECK (true);

-- Allow users to update/delete if needed (optional)
CREATE POLICY "Enable all access for all users" ON public.user_unlocks
    FOR ALL USING (true);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.user_unlocks TO anon;
GRANT ALL ON public.user_unlocks TO authenticated;
GRANT ALL ON public.user_unlocks TO service_role;
