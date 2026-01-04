import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook to claim pending SOL rewards from the Treasury.
 * Calls the secure payout-rewards Edge Function.
 */
export function useClaimRewards() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [txSignature, setTxSignature] = useState(null);

    const claimRewards = useCallback(async (walletAddress) => {
        if (!walletAddress) {
            setError('No wallet address provided');
            return { success: false, error: 'No wallet address' };
        }

        setLoading(true);
        setError(null);
        setTxSignature(null);

        try {
            console.log('[ClaimRewards] Requesting payout to:', walletAddress);

            const { data, error: invokeError } = await supabase.functions.invoke('payout-rewards', {
                body: { walletAddress }
            });

            if (invokeError) {
                console.error('[ClaimRewards] Invoke error:', invokeError);
                setError(invokeError.message || 'Failed to claim rewards');
                setLoading(false);
                return { success: false, error: invokeError.message };
            }

            if (!data?.success) {
                console.error('[ClaimRewards] Payout failed:', data?.error);
                setError(data?.error || 'Payout failed');
                setLoading(false);
                return { success: false, error: data?.error };
            }

            // Success!
            console.log('[ClaimRewards] Payout successful:', data.txSignature);
            setTxSignature(data.txSignature);
            setLoading(false);

            return {
                success: true,
                txSignature: data.txSignature,
                amount: data.amount
            };

        } catch (err) {
            console.error('[ClaimRewards] Unexpected error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setLoading(false);
            return { success: false, error: errorMessage };
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setTxSignature(null);
    }, []);

    return {
        claimRewards,
        loading,
        error,
        txSignature,
        reset
    };
}

export default useClaimRewards;
