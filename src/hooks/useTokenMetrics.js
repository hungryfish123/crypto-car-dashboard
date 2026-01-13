import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const POLL_INTERVAL = 20000; // 20 seconds
const EDGE_FUNCTION_URL = 'https://ssxsjafkzuqikmobhihl.supabase.co/functions/v1/get-token-metrics';

/**
 * Hook to fetch token metrics via Edge Function
 * Edge Function handles caching - all users share the same cached data
 */
export const useTokenMetrics = () => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMetrics = useCallback(async () => {
        if (!isSupabaseConfigured) {
            console.warn('[useTokenMetrics] Supabase not configured');
            setLoading(false);
            return;
        }

        try {
            console.log('[useTokenMetrics] Calling Edge Function...');

            // Call the Edge Function - it handles caching internally
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeHNqYWZrenVxaWttb2JoaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4MTQ5NDgsImV4cCI6MjA1MDM5MDk0OH0.A5lP0BLGkFq9DAfkTWAqzGNOcNw8UFpbJV2fi-5-rF4'}`
                }
            });

            if (!response.ok) {
                throw new Error(`Edge Function returned ${response.status}`);
            }

            const result = await response.json();
            console.log('[useTokenMetrics] Response:', result);

            if (result.success && result.data) {
                setData(result.data);
                setError(null);
                console.log(`[useTokenMetrics] Loaded ${Object.keys(result.data).length} items`);
            } else {
                console.warn('[useTokenMetrics] No data in response');
                setData({});
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

        // Poll every 20 seconds
        const interval = setInterval(fetchMetrics, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchMetrics]);

    return {
        data,
        loading,
        error,
        refetch: fetchMetrics
    };
};

export default useTokenMetrics;
