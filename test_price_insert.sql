-- Manually insert a test price to verify connection
INSERT INTO public.token_prices (item_id, contract_address, price_usd, market_cap, updated_at)
VALUES 
    ('eng_lv1', '4hQ69BwNNk1KTzXnJ2AmtRc9fAqceO6', 1.23456, 123456000, NOW())
ON CONFLICT (item_id) 
DO UPDATE SET 
    price_usd = EXCLUDED.price_usd,
    market_cap = EXCLUDED.market_cap,
    updated_at = NOW();

-- Check if it's there
SELECT * FROM public.token_prices WHERE item_id = 'eng_lv1';
