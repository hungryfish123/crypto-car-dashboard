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
                .from('player_data')
                .select('total_earned, last_claim_at')
                .eq('wallet_id', walletAddress)
                .single();

            if (fetchError) {
                // Don't throw - just log and use defaults
                console.warn('[useUserRewards] DB error (ignored):', fetchError.message);
                setClaimableSol(0);
                setLifetimeEarnings(0);
                setLastClaimAt(null);
            } else if (data) {
                setClaimableSol(0); // Not used anymore - rewards calculated client-side
                setLifetimeEarnings(parseFloat(data.total_earned) || 0);
                setLastClaimAt(data.last_claim_at ? new Date(data.last_claim_at) : null);
            }
        } catch (err) {
            // Catch everything - never crash the app
            console.warn('[useUserRewards] Error (ignored):', err);
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
                    table: 'player_data',
                    filter: `wallet_id=eq.${walletAddress}`,
                },
                (payload) => {
                    console.log('[useUserRewards] Real-time update:', payload);
                    if (payload.new) {
                        setClaimableSol(0); // Not used anymore
                        setLifetimeEarnings(parseFloat(payload.new.total_earned) || 0);
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
