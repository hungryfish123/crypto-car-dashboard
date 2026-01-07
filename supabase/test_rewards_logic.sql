-- ============================================================================
-- SQL SIMULATION: REWARD DISTRIBUTION
-- Run this in Supabase SQL Editor to verify the logic/math without deploying code.
-- ============================================================================

WITH configuration AS (
    SELECT 10.0 AS hourly_reward_pot  -- <--- CHANGE THIS to test different pot sizes
),
-- 1. Calculate the Universal Denominator (Total Theoretical Points)
theoretical_stats AS (
    SELECT
        COUNT(*) as total_items_configured,
        SUM(supply) as total_max_supply,
        SUM(supply * yield_weight) as denominator_points
    FROM item_mappings
    WHERE yield_weight > 0
),
-- 2. Calculate User Points based on their actual inventory
user_breakdown AS (
    SELECT
        pd.wallet_id,
        pd.username,
        -- Sum up yield_weight * quantity for each item in inventory
        COALESCE(SUM(
            (item->>'quantity')::int * im.yield_weight
        ), 0) as user_total_points
    FROM player_data pd
    -- Expand JSONB inventory into rows
    LEFT JOIN LATERAL jsonb_array_elements(pd.inventory) as item ON true
    -- Join with item mappings to get yield weight
    LEFT JOIN item_mappings im ON im.item_id = (item->>'id')::text
    WHERE pd.inventory IS NOT NULL AND jsonb_array_length(pd.inventory) > 0
    GROUP BY pd.wallet_id, pd.username
)
-- 3. Final Simulation Result
SELECT
    '--- GLOBAL STATS ---' as category,
    ts.denominator_points as total_theoretical_points,
    c.hourly_reward_pot as pot_size_sol,
    (c.hourly_reward_pot / NULLIF(ts.denominator_points, 0)) as reward_per_point_sol
FROM theoretical_stats ts, configuration c

UNION ALL

SELECT
    '--- DISTRIBUTION ---' as category,
    (SELECT COUNT(*) FROM user_breakdown WHERE user_total_points > 0) as users_receiving_rewards,
    (SELECT SUM(user_total_points) FROM user_breakdown) as total_points_claimed,
    NULL as reward_per_point_sol
    
UNION ALL

SELECT
    '--- TREASURY IMPACT ---' as category,
    -- Amount distributed = Points Claimed * Reward Per Point
    (
        SELECT SUM(user_total_points) FROM user_breakdown
    ) * (c.hourly_reward_pot / NULLIF(ts.denominator_points, 0)) as total_distributed_sol,
    
    -- Amount kept = Pot - Distributed
    c.hourly_reward_pot - (
        (
            SELECT SUM(user_total_points) FROM user_breakdown
        ) * (c.hourly_reward_pot / NULLIF(ts.denominator_points, 0))
    ) as kept_in_treasury_sol,
    NULL
FROM theoretical_stats ts, configuration c;

-- ============================================================================
-- OPTIONAL: VIEW INDIVIDUAL USER CALCULATIONS
-- Uncomment to see specific user payouts
-- ============================================================================
/*
WITH config AS (SELECT 10.0 as pot),
stats AS (SELECT SUM(supply * yield_weight) as denom FROM item_mappings WHERE yield_weight > 0)
SELECT 
    pd.username,
    (item->>'id')::text as item,
    (item->>'quantity')::int as qty,
    im.yield_weight,
    ((item->>'quantity')::int * im.yield_weight) as points,
    ((item->>'quantity')::int * im.yield_weight) * (c.pot / s.denom) as payout_sol
FROM player_data pd
CROSS JOIN LATERAL jsonb_array_elements(pd.inventory) as item
JOIN item_mappings im ON im.item_id = (item->>'id')::text
CROSS JOIN config c
CROSS JOIN stats s
ORDER BY points DESC;
*/
