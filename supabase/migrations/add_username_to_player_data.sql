-- =====================================================
-- ADD USERNAME TO PLAYER_DATA
-- Adds username column to existing player_data table
-- =====================================================

ALTER TABLE player_data 
ADD COLUMN IF NOT EXISTS username TEXT CHECK (char_length(username) <= 12);
