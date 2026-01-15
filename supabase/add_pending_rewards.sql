-- Add pending_rewards column to player_data
-- This stores the claimable amount and is updated periodically

ALTER TABLE player_data 
ADD COLUMN IF NOT EXISTS pending_rewards NUMERIC DEFAULT 0;

-- Also add a column to track when we last updated the pending rewards
ALTER TABLE player_data 
ADD COLUMN IF NOT EXISTS last_rewards_update TIMESTAMPTZ DEFAULT NOW();

-- Update RLS policy if needed (pending_rewards should be readable by the user)
-- The existing policies should already allow this since they're based on wallet_id
