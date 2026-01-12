import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// All pump.fun tokens have 1 billion supply
const PUMP_FUN_SUPPLY = 1_000_000_000;

export function useSolanaToken() {
    const [data, setData] = useState({
        price: null,
        marketCap: null,
        holders: [],
        chartData: null,
        priceChange24h: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY;

                if (!moralisApiKey) {
                    console.error('[useSolanaToken] VITE_MORALIS_API_KEY not set');
                    setData(prev => ({ ...prev, loading: false, error: 'API key not configured' }));
                    return;
                }

                // Get the CA from the 'main_chart' row in item_mappings
                const { data: mapping, error: dbError } = await supabase
                    .from('item_mappings')
                    .select('contract_address')
                    .eq('item_id', 'main_chart')
                    .single();

                if (dbError) {
                    console.error('[useSolanaToken] DB error:', dbError);
                    setData(prev => ({ ...prev, loading: false, error: 'main_chart row not found' }));
                    return;
                }

                const tokenAddress = mapping?.contract_address;

                if (!tokenAddress) {
                    console.log('[useSolanaToken] No CA set for main_chart yet');
                    setData(prev => ({ ...prev, loading: false, error: 'No CA configured' }));
                    return;
                }

                console.log('[useSolanaToken] Fetching price for:', tokenAddress);

                // Get price from Moralis
                const response = await fetch(
                    `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/price`,
                    { headers: { 'X-API-Key': moralisApiKey } }
                );

                if (!response.ok) {
                    throw new Error(`Moralis API error: ${response.status}`);
                }

                const priceData = await response.json();
                console.log('[useSolanaToken] Moralis response:', priceData);

                const price = parseFloat(priceData.usdPrice) || 0;
                const change24h = priceData.usdPrice24hrPercentChange || 0;

                // Market cap = price * 1 billion (all pump.fun tokens have 1B supply)
                const marketCap = price * PUMP_FUN_SUPPLY;
                console.log('[useSolanaToken] Price:', price, 'Market Cap:', marketCap);

                // Build chart data
                const pastPrice = change24h !== 0 ? price / (1 + (change24h / 100)) : price * 0.95;
                const chartData = {
                    points: [
                        { time: '24h', price: pastPrice },
                        { time: '12h', price: pastPrice + (price - pastPrice) * 0.3 },
                        { time: '6h', price: pastPrice + (price - pastPrice) * 0.6 },
                        { time: '1h', price: pastPrice + (price - pastPrice) * 0.9 },
                        { time: 'Now', price: price }
                    ],
                    isPositive: change24h >= 0,
                    percentChange24h: change24h
                };

                setData({
                    price: price,
                    marketCap: marketCap,
                    holders: [],
                    chartData,
                    priceChange24h: change24h,
                    loading: false,
                    error: null
                });

            } catch (e) {
                console.error("[useSolanaToken] Error:", e);
                setData(prev => ({ ...prev, loading: false, error: e.message }));
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 20000);
        return () => clearInterval(interval);

    }, []);

    return data;
}
