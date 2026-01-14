import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const POLL_INTERVAL = 20000; // 20 seconds
const MORALIS_API_KEY = import.meta.env.VITE_MORALIS_API_KEY;

/**
 * usePrices Hook (Direct Frontend Moralis)
 * 
 * 1. Reads contract addresses from item_mappings table
 * 2. Calls Moralis API directly from browser
 * 3. Returns prices
 * 
 * NO Edge Functions. NO Cron. Just: DB → Moralis → Display.
 */
export const usePrices = () => {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchPrices = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            console.warn('[usePrices] Supabase not configured');
            setLoading(false);
            return;
        }

        if (!MORALIS_API_KEY) {
            console.warn('[usePrices] VITE_MORALIS_API_KEY not set');
            setLoading(false);
            return;
        }

        try {
            // 1. Get contract addresses from item_mappings
            const { data: items, error } = await supabase
                .from('item_mappings')
                .select('item_id, contract_address')
                .not('contract_address', 'is', null);

            if (error) {
                console.error('[usePrices] DB error:', error.message);
                setLoading(false);
                return;
            }

            if (!items || items.length === 0) {
                console.log('[usePrices] No items with contract addresses');
                setLoading(false);
                return;
            }

            // Filter valid CAs (at least 30 chars, not null/empty strings)
            const validItems = items.filter(i =>
                i.contract_address &&
                i.contract_address.length > 30
            );

            console.log(`[usePrices] Found ${validItems.length} valid CAs`);

            // 2. Fetch prices from Moralis for each CA
            const priceMap = {};

            for (const item of validItems) {
                try {
                    const response = await fetch(
                        `https://solana-gateway.moralis.io/token/mainnet/${item.contract_address}/price`,
                        {
                            headers: {
                                'X-API-Key': MORALIS_API_KEY,
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const price = parseFloat(data.usdPrice) || 0;
                        priceMap[item.item_id] = {
                            price_usd: price,
                            market_cap: price * 1_000_000_000, // 1B supply assumption
                            updated_at: new Date().toISOString()
                        };
                        console.log(`[usePrices] ${item.item_id}: $${price.toFixed(8)}`);
                    } else {
                        console.log(`[usePrices] ${item.item_id}: Moralis ${response.status}`);
                    }
                } catch (err) {
                    console.error(`[usePrices] Error for ${item.item_id}:`, err.message);
                }
            }

            console.log(`[usePrices] Fetched ${Object.keys(priceMap).length} prices`);
            setPrices(priceMap);

        } catch (err) {
            console.error('[usePrices] Fatal error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchPrices();

        // Poll every 20 seconds
        const interval = setInterval(fetchPrices, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    return { prices, loading, refetch: fetchPrices };
};

export default usePrices;
