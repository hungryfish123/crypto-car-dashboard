-- Reset the stale system_cache to force fresh data fetch
-- Run this in your Supabase SQL Editor

-- Clear the stale marketplace token metrics cache
DELETE FROM system_cache WHERE key = 'p_token_metrics';

-- Verify item_mappings has your CAs
SELECT item_id, contract_address FROM item_mappings WHERE contract_address IS NOT NULL;

-- Verify token_cache exists and clear it for fresh fetch
DELETE FROM token_cache WHERE id = 'main';

-- Re-insert default row for token_cache (for main chart)
INSERT INTO token_cache (id, contract_address, price_usd, market_cap, price_change_24h, volume_24h, symbol, name)
VALUES ('main', 'FgxMYCKfAGw4eNq9fpxHoxjCpnzJZaqyLbnTRQaXpump', 0, 0, 0, 0, 'GEAR', 'Gear Token')
ON CONFLICT (id) DO NOTHING;
