-- ============================================================================
-- REWARDS PAYOUT SYSTEM - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- =============================================================================
-- STEP 1: Add rewards tracking columns to player_data
-- =============================================================================

-- Add total_earned lifetime earnings tracker
ALTER TABLE public.player_data 
ADD COLUMN IF NOT EXISTS total_earned NUMERIC DEFAULT 0;

-- Add last_claim_at for cooldown enforcement (NULL = first claim allowed immediately)
ALTER TABLE public.player_data 
ADD COLUMN IF NOT EXISTS last_claim_at TIMESTAMPTZ;

-- =============================================================================
-- STEP 2: Ensure payout_logs table exists for audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payout_logs (
    id SERIAL PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    tx_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payout_logs_wallet ON public.payout_logs(wallet_id);

-- Enable RLS
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view payouts
DROP POLICY IF EXISTS "Allow public read payout_logs" ON public.payout_logs;
CREATE POLICY "Allow public read payout_logs" ON public.payout_logs
    FOR SELECT USING (true);

-- Allow service role to insert
DROP POLICY IF EXISTS "Service can insert payout_logs" ON public.payout_logs;
CREATE POLICY "Service can insert payout_logs" ON public.payout_logs
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- STEP 3: Update item_mappings with complete yield_weight values
-- =============================================================================

-- Engines (5 levels)
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'eng_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'eng_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'eng_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'eng_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'eng_lv5';

-- Turbos (5 levels)
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'turbo_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'turbo_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'turbo_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'turbo_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'turbo_lv5';

-- Suspensions (5 levels) - Note: using susp_ prefix from marketplaceItems.js
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'susp_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'susp_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'susp_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'susp_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'susp_lv5';

-- Also update old sus_ prefix if exists
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'sus_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'sus_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'sus_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'sus_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'sus_lv5';

-- Wheels (5 levels) - Note: using wheel_ prefix from marketplaceItems.js
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'wheel_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'wheel_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'wheel_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'wheel_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'wheel_lv5';

-- Also update old wheels_ prefix if exists
UPDATE public.item_mappings SET yield_weight = 1 WHERE item_id = 'wheels_lv1';
UPDATE public.item_mappings SET yield_weight = 2 WHERE item_id = 'wheels_lv2';
UPDATE public.item_mappings SET yield_weight = 4 WHERE item_id = 'wheels_lv3';
UPDATE public.item_mappings SET yield_weight = 8 WHERE item_id = 'wheels_lv4';
UPDATE public.item_mappings SET yield_weight = 16 WHERE item_id = 'wheels_lv5';

-- Special Items (33 points each)
UPDATE public.item_mappings SET yield_weight = 33 WHERE item_id = 'special_seat';
UPDATE public.item_mappings SET yield_weight = 33 WHERE item_id = 'special_brakes';
UPDATE public.item_mappings SET yield_weight = 33 WHERE item_id = 'special_nitro';

-- Cars (20 points each)
UPDATE public.item_mappings SET yield_weight = 20 WHERE item_id = 'vw_golf_gti_mk2';
UPDATE public.item_mappings SET yield_weight = 20 WHERE item_id = 'audi_sport_quattro';
UPDATE public.item_mappings SET yield_weight = 20 WHERE item_id = 'mazda_mx5_na';
UPDATE public.item_mappings SET yield_weight = 20 WHERE item_id = 'ferrari_f40';
UPDATE public.item_mappings SET yield_weight = 20 WHERE item_id = 'lamborghini_huracan_2015';

-- =============================================================================
-- STEP 4: Insert missing items if they don't exist
-- =============================================================================

INSERT INTO public.item_mappings (item_id, yield_weight) VALUES
    ('eng_lv1', 1), ('eng_lv2', 2), ('eng_lv3', 4), ('eng_lv4', 8), ('eng_lv5', 16),
    ('turbo_lv1', 1), ('turbo_lv2', 2), ('turbo_lv3', 4), ('turbo_lv4', 8), ('turbo_lv5', 16),
    ('susp_lv1', 1), ('susp_lv2', 2), ('susp_lv3', 4), ('susp_lv4', 8), ('susp_lv5', 16),
    ('wheel_lv1', 1), ('wheel_lv2', 2), ('wheel_lv3', 4), ('wheel_lv4', 8), ('wheel_lv5', 16),
    ('special_seat', 33), ('special_brakes', 33), ('special_nitro', 33),
    ('vw_golf_gti_mk2', 20), ('audi_sport_quattro', 20), ('mazda_mx5_na', 20),
    ('ferrari_f40', 20), ('lamborghini_huracan_2015', 20)
ON CONFLICT (item_id) DO UPDATE SET yield_weight = EXCLUDED.yield_weight;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT item_id, yield_weight FROM item_mappings WHERE yield_weight > 0 ORDER BY yield_weight DESC;
