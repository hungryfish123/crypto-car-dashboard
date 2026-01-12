import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const POLL_INTERVAL = 20000; // 20 seconds

/**
 * Hook to fetch token metrics directly from Moralis for all items in item_mappings
 */
export const useTokenMetrics = () => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMetrics = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            console.warn('[useTokenMetrics] Supabase not configured');
            setLoading(false);
            return;
        }

        const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY;
        if (!moralisApiKey) {
            console.error('[useTokenMetrics] VITE_MORALIS_API_KEY not set');
            setLoading(false);
            setError('API key not configured');
            return;
        }

        try {
            console.log('[useTokenMetrics] Fetching item mappings...');

            // Get all CAs from item_mappings
            const { data: mappings, error: dbError } = await supabase
                .from('item_mappings')
                .select('item_id, contract_address')
                .not('contract_address', 'is', null);

            if (dbError) {
                console.error('[useTokenMetrics] DB error:', dbError);
                setError(dbError.message);
                setLoading(false);
                return;
            }

            if (!mappings || mappings.length === 0) {
                console.log('[useTokenMetrics] No CAs configured in item_mappings');
                setData({});
                setLoading(false);
                return;
            }

            console.log('[useTokenMetrics] Found', mappings.length, 'items with CAs');

            const tokenMetrics = {};

            // Fetch data for each CA
            for (const mapping of mappings) {
                const ca = mapping.contract_address;
                if (!ca) continue;

                try {
                    console.log(`[useTokenMetrics] Fetching ${mapping.item_id}: ${ca}`);

                    const response = await fetch(
                        `https://solana-gateway.moralis.io/token/mainnet/${ca}/price`,
                        { headers: { 'X-API-Key': moralisApiKey } }
                    );

                    if (response.ok) {
                        const priceData = await response.json();
                        console.log(`[useTokenMetrics] ${mapping.item_id} response:`, priceData);

                        tokenMetrics[mapping.item_id] = {
                            ca,
                            price: parseFloat(priceData.usdPrice) || 0,
                            marketCap: priceData.marketCap || 0,
                            holderCount: 0,
                            symbol: priceData.tokenSymbol || 'UNK',
                            name: priceData.tokenName || 'Unknown'
                        };
                    } else {
                        console.warn(`[useTokenMetrics] ${mapping.item_id} failed: ${response.status}`);
                    }
                } catch (err) {
                    console.error(`[useTokenMetrics] Error for ${mapping.item_id}:`, err);
                }
            }

            console.log('[useTokenMetrics] Final metrics:', tokenMetrics);
            setData(tokenMetrics);
            setError(null);

        } catch (err) {
            console.error('[useTokenMetrics] Fetch failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    return { data, loading, error, refetch: fetchMetrics };
};

export default useTokenMetrics;
