-- Cache table for shared token data
-- All users read from this, Edge Function updates it every 20 seconds
CREATE TABLE IF NOT EXISTS public.token_cache (
    id TEXT PRIMARY KEY DEFAULT 'main',
    contract_address TEXT NOT NULL,
    price_usd NUMERIC,
    market_cap NUMERIC,
    price_change_24h NUMERIC,
    volume_24h NUMERIC,
    symbol TEXT,
    name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_cache ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public Read" ON public.token_cache
    FOR SELECT USING (true);

-- Service role write access (Edge Functions use service role)
CREATE POLICY "Service Write" ON public.token_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO public.token_cache (id, contract_address, price_usd, market_cap, price_change_24h, volume_24h, symbol, name)
VALUES ('main', 'FgxMYCKfAGw4eNq9fpxHoxjCpnzJZaqyLbnTRQaXpump', 0, 0, 0, 0, 'GEAR', 'Gear Token')
ON CONFLICT (id) DO NOTHING;
