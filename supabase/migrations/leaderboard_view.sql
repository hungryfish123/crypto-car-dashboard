-- =====================================================
-- LEADERBOARD VIEW (Using player_data)
-- Displays Top 20 players
-- Orders by fees earned first, then by creation date
-- =====================================================

DROP VIEW IF EXISTS leaderboard_view;

CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
    pd.wallet_id AS user_wallet,
    pd.username,
    pd.avatar_url,
    pd.x_profile,
    pd.referral_earnings AS fees_earned,
    jsonb_array_length(COALESCE(pd.inventory, '[]'::jsonb)) AS parts_count,
    1 AS cars_count,
    pd.created_at
FROM player_data pd
WHERE pd.wallet_id IS NOT NULL
ORDER BY 
    CASE WHEN pd.referral_earnings > 0 THEN 0 ELSE 1 END,
    pd.referral_earnings DESC,
    pd.created_at ASC
LIMIT 20;

GRANT SELECT ON leaderboard_view TO anon, authenticated;
