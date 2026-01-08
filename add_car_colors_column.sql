-- Add car_colors JSONB column for per-car color storage
ALTER TABLE player_data ADD COLUMN IF NOT EXISTS car_colors JSONB DEFAULT '{}';

-- Migrate existing car_color data to new car_colors structure
-- This copies the old single car_color into the bmw_m3_e30 slot
UPDATE player_data 
SET car_colors = jsonb_build_object(
    'bmw_m3_e30', COALESCE(car_color, '#FF0000'),
    'vw_golf_gti_mk2', '#FF0000',
    'audi_sport_quattro', '#FF0000',
    'mazda_mx5_na', '#FF0000',
    'ferrari_f40', '#FF0000'
)
WHERE car_colors IS NULL OR car_colors = '{}';

-- Optional: Drop old car_color column after migration (uncomment if desired)
-- ALTER TABLE player_data DROP COLUMN IF EXISTS car_color;
