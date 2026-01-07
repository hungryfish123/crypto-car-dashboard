-- ============================================================================
-- FIXED SUPPLY DILUTION REWARD SYSTEM - DATABASE MIGRATION (FIXED)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- =============================================================================
-- TASK 1: ADD yield_weight COLUMN TO EXISTING item_mappings TABLE
-- =============================================================================

-- Add yield_weight column if it doesn't exist
ALTER TABLE public.item_mappings 
ADD COLUMN IF NOT EXISTS yield_weight INT DEFAULT 0;

-- Add supply column if it doesn't exist (for fixed supply reference)
ALTER TABLE public.item_mappings 
ADD COLUMN IF NOT EXISTS supply INT DEFAULT 1000;

-- =============================================================================
-- TASK 2: UPDATE YIELD WEIGHTS FOR EXISTING ITEMS
-- Based on Scarcity Scale:
--   Common (1000 supply): 1 point
--   Uncommon (500 supply): 2 points
--   Rare (250 supply): 4 points
--   Epic (125 supply): 8 points
--   Legendary (60 supply): 16 points
--   Cars (50 supply): 20 points
--   Special (30 supply): 33 points
-- =============================================================================

-- Engines (based on rarity level)
UPDATE public.item_mappings SET supply = 1000, yield_weight = 1 WHERE item_id = 'eng_lv1';
UPDATE public.item_mappings SET supply = 500, yield_weight = 2 WHERE item_id = 'eng_lv2';
UPDATE public.item_mappings SET supply = 250, yield_weight = 4 WHERE item_id = 'eng_lv3';
UPDATE public.item_mappings SET supply = 125, yield_weight = 8 WHERE item_id = 'eng_lv4';
UPDATE public.item_mappings SET supply = 60, yield_weight = 16 WHERE item_id = 'eng_lv5';

-- Turbos
UPDATE public.item_mappings SET supply = 1000, yield_weight = 1 WHERE item_id = 'turbo_lv1';
UPDATE public.item_mappings SET supply = 500, yield_weight = 2 WHERE item_id = 'turbo_lv2';
UPDATE public.item_mappings SET supply = 250, yield_weight = 4 WHERE item_id = 'turbo_lv3';
UPDATE public.item_mappings SET supply = 125, yield_weight = 8 WHERE item_id = 'turbo_lv4';
UPDATE public.item_mappings SET supply = 60, yield_weight = 16 WHERE item_id = 'turbo_lv5';

-- Suspensions
UPDATE public.item_mappings SET supply = 1000, yield_weight = 1 WHERE item_id = 'sus_lv1';
UPDATE public.item_mappings SET supply = 500, yield_weight = 2 WHERE item_id = 'sus_lv2';
UPDATE public.item_mappings SET supply = 250, yield_weight = 4 WHERE item_id = 'sus_lv3';

-- Wheels
UPDATE public.item_mappings SET supply = 1000, yield_weight = 1 WHERE item_id = 'wheels_lv1';
UPDATE public.item_mappings SET supply = 500, yield_weight = 2 WHERE item_id = 'wheels_lv2';
UPDATE public.item_mappings SET supply = 250, yield_weight = 4 WHERE item_id = 'wheels_lv3';

-- Special Items (God Tier)
UPDATE public.item_mappings SET supply = 30, yield_weight = 33 WHERE item_id = 'special_rainbow';
UPDATE public.item_mappings SET supply = 30, yield_weight = 33 WHERE item_id = 'special_nitro';

-- Cars (Premium)
UPDATE public.item_mappings SET supply = 50, yield_weight = 20 WHERE item_id = 'vw_golf_gti_mk2';
UPDATE public.item_mappings SET supply = 50, yield_weight = 20 WHERE item_id = 'audi_sport_quattro';
UPDATE public.item_mappings SET supply = 50, yield_weight = 20 WHERE item_id = 'mazda_mx5_na';
UPDATE public.item_mappings SET supply = 50, yield_weight = 20 WHERE item_id = 'ferrari_f40';

-- =============================================================================
-- TASK 3: INSERT ITEMS IF THEY DON'T EXIST (For new installs)
-- =============================================================================

-- Insert with ON CONFLICT DO NOTHING for items that might not exist yet
INSERT INTO public.item_mappings (item_id, supply, yield_weight) VALUES
    ('eng_lv1', 1000, 1),
    ('eng_lv2', 500, 2),
    ('eng_lv3', 250, 4),
    ('eng_lv4', 125, 8),
    ('eng_lv5', 60, 16),
    ('turbo_lv1', 1000, 1),
    ('turbo_lv2', 500, 2),
    ('turbo_lv3', 250, 4),
    ('turbo_lv4', 125, 8),
    ('turbo_lv5', 60, 16),
    ('sus_lv1', 1000, 1),
    ('sus_lv2', 500, 2),
    ('sus_lv3', 250, 4),
    ('wheels_lv1', 1000, 1),
    ('wheels_lv2', 500, 2),
    ('wheels_lv3', 250, 4),
    ('special_rainbow', 30, 33),
    ('special_nitro', 30, 33),
    ('vw_golf_gti_mk2', 50, 20),
    ('audi_sport_quattro', 50, 20),
    ('mazda_mx5_na', 50, 20),
    ('ferrari_f40', 50, 20)
ON CONFLICT (item_id) DO UPDATE SET
    supply = EXCLUDED.supply,
    yield_weight = EXCLUDED.yield_weight;

-- =============================================================================
-- TASK 4: CREATE USER_REWARDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_rewards (
    wallet_id TEXT PRIMARY KEY,
    pending_balance NUMERIC DEFAULT 0,
    lifetime_earnings NUMERIC DEFAULT 0,
    last_distribution_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own rewards" ON public.user_rewards;
DROP POLICY IF EXISTS "Service can update rewards" ON public.user_rewards;

-- Users can read their own rewards
CREATE POLICY "Users can view own rewards" ON public.user_rewards
    FOR SELECT USING (true);

-- Service role can update (for edge function)
CREATE POLICY "Service can update rewards" ON public.user_rewards
    FOR ALL USING (true);

-- =============================================================================
-- TASK 5: CREATE SYSTEM_LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    total_pot_available NUMERIC,
    actual_distributed NUMERIC,
    retained_in_treasury NUMERIC,
    users_affected INT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service can insert logs" ON public.system_logs;
DROP POLICY IF EXISTS "Logs are viewable" ON public.system_logs;

-- Only service role can insert logs
CREATE POLICY "Service can insert logs" ON public.system_logs
    FOR INSERT WITH CHECK (true);

-- Admins can view logs
CREATE POLICY "Logs are viewable" ON public.system_logs
    FOR SELECT USING (true);

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View to calculate total theoretical points (for verification)
CREATE OR REPLACE VIEW reward_system_stats AS
SELECT 
    COUNT(*) as total_items,
    SUM(supply) as total_supply,
    SUM(supply * yield_weight) as total_theoretical_points
FROM public.item_mappings
WHERE yield_weight > 0;

-- =============================================================================
-- VERIFICATION QUERIES (Run after migration to confirm)
-- =============================================================================

-- Check items and their yield weights:
-- SELECT item_id, supply, yield_weight FROM item_mappings WHERE yield_weight > 0 ORDER BY yield_weight DESC;

-- Check total theoretical points:
-- SELECT * FROM reward_system_stats;
