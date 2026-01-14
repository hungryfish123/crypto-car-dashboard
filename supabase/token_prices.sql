-- ===========================================
-- TOKEN PRICES TABLE - Shared price cache
-- All users read from this table
-- Edge Function updates it every 20 seconds
-- ===========================================

-- Drop old table if exists
DROP TABLE IF EXISTS public.token_prices;

-- Create simple price cache table
CREATE TABLE public.token_prices (
    item_id TEXT PRIMARY KEY,           -- Matches item_mappings.item_id
    contract_address TEXT NOT NULL,     -- The CA being tracked
    price_usd NUMERIC DEFAULT 0,        -- Current price in USD
    market_cap NUMERIC DEFAULT 0,       -- Market cap
    updated_at TIMESTAMPTZ DEFAULT NOW() -- Last update time
);

-- Enable Row Level Security
ALTER TABLE public.token_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read (no auth required)
CREATE POLICY "Anyone can read prices" ON public.token_prices
    FOR SELECT USING (true);

-- Only service role can write (Edge Functions)
CREATE POLICY "Service role can write" ON public.token_prices
    FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_prices;

-- Done
SELECT 'token_prices table created successfully' as status;
