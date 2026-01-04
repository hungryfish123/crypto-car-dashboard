// =====================================================
// useUserRewards - Hook for fetching user reward balances
// Fetches claimable_sol and lifetime_earnings from database
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useUserRewards(walletAddress) {
    const [claimableSol, setClaimableSol] = useState(0);
    const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
    const [lastClaimAt, setLastClaimAt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Fetch user rewards from database
     */
    const fetchRewards = useCallback(async () => {
        if (!walletAddress) {
            setClaimableSol(0);
            setLifetimeEarnings(0);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('user_rewards')
                .select('claimable_sol, lifetime_earnings, last_claim_at')
                .eq('user_wallet', walletAddress)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    // No record found - user hasn't received rewards yet
                    setClaimableSol(0);
                    setLifetimeEarnings(0);
                    setLastClaimAt(null);
                } else {
                    throw fetchError;
                }
            } else if (data) {
                setClaimableSol(parseFloat(data.claimable_sol) || 0);
                setLifetimeEarnings(parseFloat(data.lifetime_earnings) || 0);
                setLastClaimAt(data.last_claim_at ? new Date(data.last_claim_at) : null);
            }
        } catch (err) {
            console.error('[useUserRewards] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // Fetch on mount and when wallet changes
    useEffect(() => {
        fetchRewards();
    }, [fetchRewards]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!walletAddress) return;

        const channel = supabase
            .channel(`rewards_${walletAddress}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_rewards',
                    filter: `user_wallet=eq.${walletAddress}`,
                },
                (payload) => {
                    console.log('[useUserRewards] Real-time update:', payload);
                    if (payload.new) {
                        setClaimableSol(parseFloat(payload.new.claimable_sol) || 0);
                        setLifetimeEarnings(parseFloat(payload.new.lifetime_earnings) || 0);
                        setLastClaimAt(payload.new.last_claim_at ? new Date(payload.new.last_claim_at) : null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [walletAddress]);

    /**
     * Refresh rewards manually
     */
    const refresh = useCallback(() => {
        fetchRewards();
    }, [fetchRewards]);

    /**
     * Called after successful claim to reset local state
     */
    const onClaimSuccess = useCallback((amountClaimed) => {
        setClaimableSol(0);
        setLifetimeEarnings(prev => prev + amountClaimed);
        setLastClaimAt(new Date());
    }, []);

    return {
        claimableSol,
        lifetimeEarnings,
        lastClaimAt,
        loading,
        error,
        refresh,
        onClaimSuccess,
    };
}

export default useUserRewards;
