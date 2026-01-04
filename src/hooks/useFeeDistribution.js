// =====================================================
// useFeeDistribution - Hook for admin fee distribution
// Calls distribute-fees Edge Function
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useFeeDistribution() {
    const [distributing, setDistributing] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Distribute fees to all users based on holdings
     * @param {number} totalFeeAmount - Total SOL to distribute
     * @param {string} adminWallet - Admin's wallet address (optional)
     * @param {string} notes - Notes for the distribution log (optional)
     */
    const distributeFees = useCallback(async (totalFeeAmount, adminWallet = null, notes = null) => {
        if (distributing) return null;

        if (!totalFeeAmount || totalFeeAmount <= 0) {
            setError('Invalid fee amount');
            return null;
        }

        setDistributing(true);
        setError(null);
        setLastResult(null);

        try {
            console.log('[useFeeDistribution] Distributing', totalFeeAmount, 'SOL...');

            const { data, error: fnError } = await supabase.functions.invoke('distribute-fees', {
                body: {
                    total_fee_amount: parseFloat(totalFeeAmount),
                    admin_wallet: adminWallet,
                    notes: notes,
                },
            });

            if (fnError) {
                throw new Error(fnError.message);
            }

            if (data?.success) {
                console.log('[useFeeDistribution] Success:', data);
                setLastResult(data);
                return data;
            } else {
                throw new Error(data?.error || 'Distribution failed');
            }
        } catch (err) {
            console.error('[useFeeDistribution] Error:', err);
            setError(err.message);
            return null;
        } finally {
            setDistributing(false);
        }
    }, [distributing]);

    /**
     * Get distribution history/logs
     */
    const getDistributionLogs = useCallback(async (limit = 10) => {
        try {
            const { data, error } = await supabase
                .from('distribution_logs')
                .select('*')
                .order('distributed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[useFeeDistribution] Error fetching logs:', err);
            return [];
        }
    }, []);

    return {
        distributeFees,
        getDistributionLogs,
        distributing,
        lastResult,
        error,
    };
}

export default useFeeDistribution;
