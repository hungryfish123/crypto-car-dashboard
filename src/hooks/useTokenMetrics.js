import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Hook to fetch cached token metrics from Supabase Edge Function
 * @returns {{ data: Object, loading: boolean, error: string|null, refetch: Function }}
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

        try {
            console.log('[useTokenMetrics] Fetching metrics...');

            const { data: response, error: fnError } = await supabase.functions.invoke('get-token-metrics');

            if (fnError) {
                console.error('[useTokenMetrics] Edge Function error:', fnError);
                setError(fnError.message);
                return;
            }

            if (response?.success) {
                console.log('[useTokenMetrics] Received data:', response);
                setData(response.data || {});
                setError(null);
            } else {
                console.warn('[useTokenMetrics] Unexpected response:', response);
                setError(response?.error || 'Unknown error');
            }
        } catch (err) {
            console.error('[useTokenMetrics] Fetch failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchMetrics();

        // Poll every 30 seconds
        const interval = setInterval(fetchMetrics, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchMetrics]);

    return { data, loading, error, refetch: fetchMetrics };
};

export default useTokenMetrics;
