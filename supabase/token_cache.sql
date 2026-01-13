-- Shared Token Cache - Per-Item Price Storage
-- Updated schema: Each row stores price data for one marketplace item
-- Edge Function updates this every 20 seconds, all clients read from here

-- Drop old table if it exists with different schema
DROP TABLE IF EXISTS public.token_cache;

-- Create new per-item cache table
CREATE TABLE public.token_cache (
    item_id TEXT PRIMARY KEY,              -- Links to item_mappings.item_id
    contract_address TEXT NOT NULL,
    price_usd NUMERIC DEFAULT 0,
    market_cap NUMERIC DEFAULT 0,
    price_change_24h NUMERIC DEFAULT 0,
    symbol TEXT,
    name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (all clients can read cached prices)
DROP POLICY IF EXISTS "Public Read" ON public.token_cache;
CREATE POLICY "Public Read" ON public.token_cache
    FOR SELECT USING (true);

-- Service role write access (Edge Functions update the cache)
DROP POLICY IF EXISTS "Service Write" ON public.token_cache;
CREATE POLICY "Service Write" ON public.token_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_token_cache_item_id ON public.token_cache(item_id);

-- Verification query
SELECT 'token_cache table ready for per-item caching' as status;
