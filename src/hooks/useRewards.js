import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Constants
const SOL_PER_POINT_PER_HOUR = 0.001;
const COOLDOWN_SECONDS = 60;
const MIN_CLAIM = 0.0001;
const MAX_CLAIM = 0.5;
const UPDATE_INTERVAL_MS = 5000; // Save to DB every 5 seconds

/**
 * useRewards Hook - Database-backed version
 * 
 * Stores pending_rewards in the database so it persists:
 * - When items are unequipped, earnings are preserved
 * - Only starts earning when items are equipped
 * - No more "1 hour ago" fallback - starts at 0
 */
export function useRewards(walletAddress, equippedParts = {}, yieldWeights = {}, ownedCars = []) {
    const [pendingRewards, setPendingRewards] = useState(0);
    const [hourlyRate, setHourlyRate] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [lastClaimAt, setLastClaimAt] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [claimError, setClaimError] = useState(null);
    const [claimSuccess, setClaimSuccess] = useState(null);

    // Database values
    const [dbPendingRewards, setDbPendingRewards] = useState(0);
    const [lastRewardsUpdate, setLastRewardsUpdate] = useState(null);

    const intervalRef = useRef(null);
    const saveIntervalRef = useRef(null);

    // Calculate total equipped points (includes equipped parts + owned cars)
    const calculateTotalPoints = useCallback(() => {
        let totalPoints = 0;

        // Add points from equipped parts
        for (const carId of Object.keys(equippedParts)) {
            const carParts = equippedParts[carId];
            if (!carParts || typeof carParts !== 'object') continue;

            for (const slot of Object.keys(carParts)) {
                const part = carParts[slot];
                if (!part) continue;

                const itemId = typeof part === 'object' ? (part.id || part.item_id) : part;
                if (!itemId) continue;

                const yieldWeight = yieldWeights[itemId] || 0;
                totalPoints += yieldWeight;
            }
        }

        // Add points from owned cars (excluding default bmw which is always owned)
        for (const carId of ownedCars) {
            if (carId === 'bmw_m3_e30') continue; // Default car doesn't add points
            const carYield = yieldWeights[carId] || 0;
            if (carYield > 0) {
                totalPoints += carYield;
            }
        }

        return totalPoints;
    }, [equippedParts, yieldWeights, ownedCars]);

    const currentPoints = calculateTotalPoints();

    // Update hourly rate when points change
    useEffect(() => {
        setHourlyRate(currentPoints * SOL_PER_POINT_PER_HOUR);
    }, [currentPoints]);

    // Load player data from database
    useEffect(() => {
        if (!walletAddress) return;

        const loadPlayerData = async () => {
            const { data, error } = await supabase
                .from('player_data')
                .select('last_claim_at, total_earned, pending_rewards, last_rewards_update')
                .eq('wallet_id', walletAddress)
                .single();

            if (error) {
                console.warn('[useRewards] Error loading player data:', error.message);
                return;
            }

            if (data) {
                setLastClaimAt(data.last_claim_at ? new Date(data.last_claim_at) : null);
                setTotalEarned(parseFloat(data.total_earned) || 0);
                setDbPendingRewards(parseFloat(data.pending_rewards) || 0);
                setLastRewardsUpdate(data.last_rewards_update ? new Date(data.last_rewards_update) : new Date());

                console.log('[useRewards] Loaded from DB - pending:', data.pending_rewards);
            }
        };

        loadPlayerData();
    }, [walletAddress]);

    // Real-time display calculation (every second)
    useEffect(() => {
        const updateDisplay = () => {
            const now = Date.now();

            // Calculate earnings since last database update
            let earningsSinceUpdate = 0;
            if (lastRewardsUpdate && currentPoints > 0) {
                const hoursSinceUpdate = (now - lastRewardsUpdate.getTime()) / (1000 * 60 * 60);
                earningsSinceUpdate = currentPoints * SOL_PER_POINT_PER_HOUR * hoursSinceUpdate;
            }

            // Total pending = database value + earnings since last save
            const totalPending = dbPendingRewards + earningsSinceUpdate;
            setPendingRewards(totalPending);

            // Cooldown calculation
            if (lastClaimAt) {
                const secondsSinceClaim = (now - lastClaimAt.getTime()) / 1000;
                const remaining = Math.max(0, COOLDOWN_SECONDS - secondsSinceClaim);
                setCooldownRemaining(Math.ceil(remaining));
            } else {
                setCooldownRemaining(0);
            }
        };

        updateDisplay();
        intervalRef.current = setInterval(updateDisplay, 2000); // Update every 2 seconds

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [currentPoints, dbPendingRewards, lastRewardsUpdate, lastClaimAt]);

    // Save to database every 5 seconds (only if we have earnings to save)
    useEffect(() => {
        if (!walletAddress) return;

        const saveToDatabase = async () => {
            const now = new Date();

            // Only save if we have points equipped (earning something)
            if (currentPoints <= 0) return;
            if (!lastRewardsUpdate) return;

            // Calculate earnings since last update
            const hoursSinceUpdate = (now.getTime() - lastRewardsUpdate.getTime()) / (1000 * 60 * 60);
            const newEarnings = currentPoints * SOL_PER_POINT_PER_HOUR * hoursSinceUpdate;

            if (newEarnings <= 0) return;

            const newPendingRewards = dbPendingRewards + newEarnings;

            // Update database
            const { error } = await supabase
                .from('player_data')
                .update({
                    pending_rewards: newPendingRewards,
                    last_rewards_update: now.toISOString()
                })
                .eq('wallet_id', walletAddress);

            if (error) {
                console.warn('[useRewards] Error saving to DB:', error.message);
                return;
            }

            // Update local state
            setDbPendingRewards(newPendingRewards);
            setLastRewardsUpdate(now);
            console.log(`[useRewards] Saved to DB: ${newPendingRewards.toFixed(6)} SOL`);
        };

        // Save immediately when points change (to capture earnings before unequip)
        if (currentPoints > 0) {
            saveToDatabase();
        }

        // Also save periodically
        saveIntervalRef.current = setInterval(saveToDatabase, UPDATE_INTERVAL_MS);

        return () => {
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        };
    }, [walletAddress, currentPoints, dbPendingRewards, lastRewardsUpdate]);

    // Claim rewards function
    const claimRewards = useCallback(async () => {
        if (!walletAddress) {
            setClaimError('Wallet not connected');
            return { success: false, error: 'Wallet not connected' };
        }

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

            // Handle non-OK responses (502, 500, etc.)
            if (!response.ok) {
                let errorMsg = `Server error (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch {
                    // Response wasn't JSON - use status text
                    errorMsg = `Server error: ${response.statusText || response.status}`;
                }
                setClaimError(errorMsg);
                // NO cooldown on failure - user can retry immediately
                return { success: false, error: errorMsg };
            }

            const result = await response.json();

            if (result.success) {
                const claimTime = new Date();
                setLastClaimAt(claimTime);
                setTotalEarned(prev => prev + result.amount);
                setPendingRewards(0);
                setDbPendingRewards(0);
                setLastRewardsUpdate(claimTime);
                setCooldownRemaining(COOLDOWN_SECONDS); // Only set cooldown on SUCCESS

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
                // NO cooldown on failure - don't set cooldownRemaining
                return { success: false, error: result.error };
            }
        } catch (err) {
            const errorMsg = err.message || 'Network error';
            setClaimError(errorMsg);
            // NO cooldown on network error
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, lastClaimAt, cooldownRemaining, pendingRewards]);

    const clearClaimStatus = useCallback(() => {
        setClaimError(null);
        setClaimSuccess(null);
    }, []);

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
