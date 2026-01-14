import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Constants matching backend
const SOL_PER_POINT_PER_HOUR = 0.001;
const COOLDOWN_SECONDS = 60;
const MIN_CLAIM = 0.0001;
const MAX_CLAIM = 0.5;

/**
 * useRewards Hook
 * 
 * Calculates real-time earnings based on equipped items.
 * Updates every second for live display.
 * 
 * @param {string} walletAddress - User's wallet address
 * @param {Object} equippedParts - Currently equipped items by car { carId: { slot: { id, equipped_at } } }
 * @param {Object} yieldWeights - Lookup map of item_id -> yield_weight
 */
export function useRewards(walletAddress, equippedParts = {}, yieldWeights = {}) {
    const [pendingRewards, setPendingRewards] = useState(0);
    const [hourlyRate, setHourlyRate] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [lastClaimAt, setLastClaimAt] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [claimError, setClaimError] = useState(null);
    const [claimSuccess, setClaimSuccess] = useState(null);

    const intervalRef = useRef(null);

    // Calculate total equipped points and hourly rate
    const calculateTotalPoints = useCallback(() => {
        let totalPoints = 0;

        // Iterate through all cars and their equipped parts
        for (const carId of Object.keys(equippedParts)) {
            const carParts = equippedParts[carId];
            if (!carParts || typeof carParts !== 'object') continue;

            for (const slot of Object.keys(carParts)) {
                const part = carParts[slot];
                if (!part) continue;

                // Get item ID
                const itemId = typeof part === 'object' ? (part.id || part.item_id) : part;
                if (!itemId) continue;

                // Get yield weight
                const yieldWeight = yieldWeights[itemId] || 0;
                totalPoints += yieldWeight;
            }
        }

        return totalPoints;
    }, [equippedParts, yieldWeights]);

    // Calculate hourly rate
    useEffect(() => {
        const points = calculateTotalPoints();
        const rate = points * SOL_PER_POINT_PER_HOUR;
        setHourlyRate(rate);
    }, [calculateTotalPoints]);

    // Load player data on mount
    useEffect(() => {
        if (!walletAddress) return;

        const loadPlayerData = async () => {
            const { data } = await supabase
                .from('player_data')
                .select('last_claim_at, total_earned')
                .eq('wallet_id', walletAddress)
                .single();

            if (data) {
                setLastClaimAt(data.last_claim_at ? new Date(data.last_claim_at) : null);
                setTotalEarned(parseFloat(data.total_earned) || 0);
            }
        };

        loadPlayerData();
    }, [walletAddress]);

    // Real-time earnings calculation (every second)
    useEffect(() => {
        console.log('[useRewards] Setting up interval with', Object.keys(equippedParts).length, 'cars');
        const updatePendingRewards = () => {
            const now = Date.now();
            let totalPending = 0;

            // Iterate through all equipped items
            for (const carId of Object.keys(equippedParts)) {
                const carParts = equippedParts[carId];
                if (!carParts || typeof carParts !== 'object') continue;

                for (const slot of Object.keys(carParts)) {
                    const part = carParts[slot];
                    if (!part) continue;

                    const itemId = typeof part === 'object' ? (part.id || part.item_id) : part;
                    if (!itemId) continue;

                    const yieldWeight = yieldWeights[itemId] || 0;
                    if (yieldWeight === 0) continue;

                    // Get equipped_at or use lastClaimAt as fallback
                    let equippedAt;
                    if (typeof part === 'object' && part.equipped_at) {
                        equippedAt = new Date(part.equipped_at).getTime();
                    } else if (lastClaimAt) {
                        equippedAt = lastClaimAt.getTime();
                    } else {
                        // If never claimed, assume equipped for 1 hour
                        equippedAt = now - (60 * 60 * 1000);
                    }

                    // Calculate from the later of: equipped_at or last_claim_at
                    const baseTime = lastClaimAt
                        ? Math.max(equippedAt, lastClaimAt.getTime())
                        : equippedAt;

                    const hoursElapsed = Math.max(0, (now - baseTime) / (1000 * 60 * 60));
                    const itemEarnings = yieldWeight * SOL_PER_POINT_PER_HOUR * hoursElapsed;
                    totalPending += itemEarnings;
                    console.log(`  ${itemId}: ${yieldWeight}pts × ${hoursElapsed.toFixed(4)}h = ${itemEarnings.toFixed(6)} SOL`);
                }
            }

            console.log('[useRewards] Total pending:', totalPending.toFixed(6), 'SOL');
            setPendingRewards(totalPending);

            // Calculate cooldown remaining (only if there was a previous claim)
            if (lastClaimAt) {
                const secondsSinceClaim = (now - lastClaimAt.getTime()) / 1000;
                const remaining = Math.max(0, COOLDOWN_SECONDS - secondsSinceClaim);
                setCooldownRemaining(Math.ceil(remaining));
            } else {
                // First claim - no cooldown
                setCooldownRemaining(0);
            }
        };

        // Initial calculation
        updatePendingRewards();

        // Update every second
        intervalRef.current = setInterval(updatePendingRewards, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [equippedParts, yieldWeights, lastClaimAt]);

    // Claim rewards function
    const claimRewards = useCallback(async () => {
        if (!walletAddress) {
            setClaimError('Wallet not connected');
            return { success: false, error: 'Wallet not connected' };
        }

        // Check cooldown (only for non-first claims)
        if (lastClaimAt && cooldownRemaining > 0) {
            const errorMsg = `It has been less than a minute since your last claim. Please wait ${cooldownRemaining} more seconds.`;
            setClaimError(errorMsg);
            return { success: false, error: errorMsg };
        }

        if (pendingRewards < MIN_CLAIM) {
            const errorMsg = `Minimum claim is ${MIN_CLAIM} SOL. You have ${pendingRewards.toFixed(6)} SOL pending.`;
            setClaimError(errorMsg);
            return { success: false, error: errorMsg };
        }

        setIsLoading(true);
        setClaimError(null);
        setClaimSuccess(null);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payout-rewards`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ walletAddress }),
                }
            );

            const result = await response.json();

            if (result.success) {
                // Update local state
                setLastClaimAt(new Date());
                setTotalEarned(prev => prev + result.amount);
                setPendingRewards(0);
                setCooldownRemaining(COOLDOWN_SECONDS);

                setClaimSuccess({
                    amount: result.amount,
                    txSignature: result.txSignature,
                    recipientAddress: result.recipientAddress
                });

                return {
                    success: true,
                    amount: result.amount,
                    txSignature: result.txSignature
                };
            } else {
                setClaimError(result.error || 'Claim failed');
                if (result.cooldownRemaining) {
                    setCooldownRemaining(result.cooldownRemaining);
                }
                return { success: false, error: result.error };
            }
        } catch (err) {
            const errorMsg = err.message || 'Network error';
            setClaimError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, lastClaimAt, cooldownRemaining, pendingRewards]);

    // Clear error/success after display
    const clearClaimStatus = useCallback(() => {
        setClaimError(null);
        setClaimSuccess(null);
    }, []);

    // Can claim check
    const canClaim = pendingRewards >= MIN_CLAIM &&
        (lastClaimAt === null || cooldownRemaining === 0) &&
        !isLoading;

    return {
        pendingRewards,
        hourlyRate,
        totalEarned,
        cooldownRemaining,
        canClaim,
        isLoading,
        claimError,
        claimSuccess,
        claimRewards,
        clearClaimStatus,
        maxClaim: MAX_CLAIM,
        minClaim: MIN_CLAIM,
        isFirstClaim: lastClaimAt === null,
    };
}

export default useRewards;
