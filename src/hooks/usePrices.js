import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const POLL_INTERVAL = 30000; // 30 seconds (user requested)
const MORALIS_API_KEY = import.meta.env.VITE_MORALIS_API_KEY;
const CACHE_KEY = 'gear_prices_cache';

/**
 * usePrices Hook
 * 
 * 1. Loads cached prices from localStorage immediately (no "fetching" animation)
 * 2. Fetches fresh data in background
 * 3. Updates cache every 30 seconds
 */
export const usePrices = () => {
    // Initialize from localStorage cache (instant load, no "fetching" state)
    const [prices, setPrices] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                console.log('[usePrices] Loaded from cache:', Object.keys(parsed).length, 'items');
                return parsed;
            }
        } catch (e) {
            console.warn('[usePrices] Cache parse error:', e);
        }
        return {};
    });

    // Start with loading=false if we have cache, true if no cache
    const [loading, setLoading] = useState(() => {
        try {
            return !localStorage.getItem(CACHE_KEY);
        } catch {
            return true;
        }
    });

    const fetchPrices = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            console.warn('[usePrices] Supabase not configured');
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

            // Filter valid CAs (at least 30 chars)
            const validItems = items.filter(i =>
                i.contract_address &&
                i.contract_address.length > 30
            );

            console.log(`[usePrices] Found ${validItems.length} valid CAs`);

            // 2. Count HOLDERS from player_data inventory
            const holderCounts = {};
            try {
                const { data: allPlayers, error: playersError } = await supabase
                    .from('player_data')
                    .select('inventory');

                if (!playersError && allPlayers) {
                    allPlayers.forEach(player => {
                        if (player.inventory && Array.isArray(player.inventory)) {
                            const itemIds = new Set();
                            player.inventory.forEach(invItem => {
                                if (invItem && invItem.id) {
                                    itemIds.add(invItem.id);
                                }
                            });
                            itemIds.forEach(itemId => {
                                holderCounts[itemId] = (holderCounts[itemId] || 0) + 1;
                            });
                        }
                    });
                }
            } catch (holderErr) {
                console.warn('[usePrices] Error counting holders:', holderErr.message);
            }

            // 3. Fetch PRICES from Moralis for each CA
            const priceMap = {};

            if (MORALIS_API_KEY) {
                for (const item of validItems) {
                    try {
                        const priceResponse = await fetch(
                            `https://solana-gateway.moralis.io/token/mainnet/${item.contract_address}/price`,
                            {
                                headers: {
                                    'X-API-Key': MORALIS_API_KEY,
                                    'Accept': 'application/json'
                                }
                            }
                        );

                        let price = 0;
                        if (priceResponse.ok) {
                            const priceData = await priceResponse.json();
                            price = parseFloat(priceData.usdPrice) || 0;
                        }

                        priceMap[item.item_id] = {
                            price_usd: price,
                            market_cap: price * 1_000_000_000,
                            holders: holderCounts[item.item_id] || 0,
                            updated_at: new Date().toISOString()
                        };

                    } catch (err) {
                        console.error(`[usePrices] Error for ${item.item_id}:`, err.message);
                    }
                }
            } else {
                // No Moralis key - just set holders
                validItems.forEach(item => {
                    priceMap[item.item_id] = {
                        price_usd: 0,
                        market_cap: 0,
                        holders: holderCounts[item.item_id] || 0,
                        updated_at: new Date().toISOString()
                    };
                });
            }

            console.log(`[usePrices] Fetched ${Object.keys(priceMap).length} prices`);

            // 4. Update state and cache
            setPrices(priceMap);
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(priceMap));
                console.log('[usePrices] Saved to cache');
            } catch (e) {
                console.warn('[usePrices] Cache save error:', e);
            }

        } catch (err) {
            console.error('[usePrices] Fatal error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Fetch fresh data (will update cache silently)
        fetchPrices();

        // Poll every 30 seconds
        const interval = setInterval(fetchPrices, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    return { prices, loading, refetch: fetchPrices };
};

export default usePrices;
