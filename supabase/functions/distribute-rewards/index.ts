// =============================================================================
// FIXED SUPPLY DILUTION REWARD DISTRIBUTION - SUPABASE EDGE FUNCTION
// File: supabase/functions/distribute-rewards/index.ts
// 
// Deploy with: supabase functions deploy distribute-rewards
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =============================================================================
// CONFIGURATION
// =============================================================================

const HOURLY_REWARD_POT = 10; // SOL (or any unit you choose)

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPES
// =============================================================================

interface Item {
    item_id: string;
    supply: number;
    yield_weight: number;
}

interface UserHolding {
    wallet_id: string;
    item_id: string;
    quantity: number;
}

interface UserPayout {
    wallet_id: string;
    total_points: number;
    payout: number;
}

interface DistributionResult {
    success: boolean;
    total_pot_available: number;
    actual_distributed: number;
    retained_in_treasury: number;
    users_affected: number;
    reward_per_point: number;
    total_theoretical_points: number;
    error?: string;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Initialize Supabase client with service role (for elevated permissions)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
            JSON.stringify({ error: "Missing Supabase credentials" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const result = await distributeRewards(supabase);

        return new Response(
            JSON.stringify(result),
            {
                status: result.success ? 200 : 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Distribution failed:", error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// =============================================================================
// DISTRIBUTION LOGIC
// =============================================================================

async function distributeRewards(supabase: ReturnType<typeof createClient>): Promise<DistributionResult> {
    console.log("🚀 Starting reward distribution...");
    console.log(`💰 Hourly Reward Pot: ${HOURLY_REWARD_POT}`);

    // -------------------------------------------------------------------------
    // STEP A: Calculate the Universal Constant (Denominator)
    // -------------------------------------------------------------------------

    // Fetch all items with their supply and yield_weight from item_mappings table
    const { data: items, error: itemsError } = await supabase
        .from("item_mappings")
        .select("item_id, supply, yield_weight")
        .gt("yield_weight", 0);

    if (itemsError) {
        throw new Error(`Failed to fetch items: ${itemsError.message}`);
    }

    if (!items || items.length === 0) {
        throw new Error("No items found in database");
    }

    // Calculate TOTAL_THEORETICAL_POINTS = Sum of (item.supply * item.yield_weight)
    // This is the FIXED denominator - based on max possible supply, not current holdings
    const TOTAL_THEORETICAL_POINTS = (items as Item[]).reduce((sum, item) => {
        return sum + (item.supply * item.yield_weight);
    }, 0);

    if (TOTAL_THEORETICAL_POINTS === 0) {
        throw new Error("Total theoretical points is zero - check yield_weight values");
    }

    // Calculate REWARD_PER_POINT
    const REWARD_PER_POINT = HOURLY_REWARD_POT / TOTAL_THEORETICAL_POINTS;

    console.log(`📊 Total Items: ${items.length}`);
    console.log(`📊 Total Theoretical Points: ${TOTAL_THEORETICAL_POINTS}`);
    console.log(`📊 Reward Per Point: ${REWARD_PER_POINT.toFixed(8)}`);

    // -------------------------------------------------------------------------
    // STEP B: Calculate User Earnings
    // -------------------------------------------------------------------------

    // Fetch all player data with inventory
    const { data: players, error: playersError } = await supabase
        .from("player_data")
        .select("wallet_id, inventory");

    if (playersError) {
        throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    if (!players || players.length === 0) {
        console.log("⚠️ No players found - skipping distribution");
        return {
            success: true,
            total_pot_available: HOURLY_REWARD_POT,
            actual_distributed: 0,
            retained_in_treasury: HOURLY_REWARD_POT,
            users_affected: 0,
            reward_per_point: REWARD_PER_POINT,
            total_theoretical_points: TOTAL_THEORETICAL_POINTS,
        };
    }

    // Create a lookup map for item yield weights
    const itemYieldMap: Map<string, number> = new Map(
        (items as Item[]).map((item) => [item.item_id, item.yield_weight])
    );

    // Calculate payouts for each user
    const userPayouts: UserPayout[] = [];
    let totalDistributed = 0;

    for (const player of players) {
        const inventory = player.inventory || [];

        // Calculate user's total score
        let userTotalPoints = 0;

        for (const invItem of inventory) {
            const itemId = invItem.id || invItem.item_id;
            const quantity = invItem.quantity || 1;
            const yieldWeight = itemYieldMap.get(itemId) || 0;

            userTotalPoints += quantity * yieldWeight;
        }

        if (userTotalPoints > 0) {
            const payout = userTotalPoints * REWARD_PER_POINT;
            totalDistributed += payout;

            userPayouts.push({
                wallet_id: player.wallet_id,
                total_points: userTotalPoints,
                payout: payout,
            });
        }
    }

    console.log(`👥 Users with holdings: ${userPayouts.length}`);
    console.log(`💸 Total to distribute: ${totalDistributed.toFixed(6)}`);

    // -------------------------------------------------------------------------
    // STEP C: Batch Update the Ledger (with Transaction)
    // -------------------------------------------------------------------------

    if (userPayouts.length > 0) {
        const now = new Date().toISOString();

        // Prepare upsert data for user_rewards table
        const rewardUpdates = userPayouts.map((up) => ({
            wallet_id: up.wallet_id,
            pending_balance: up.payout, // Will be incremented via SQL
            last_distribution_at: now,
            updated_at: now,
        }));

        // Use a database function or RPC for atomic increment
        // For simplicity, we'll do individual updates with increment logic
        for (const userPayout of userPayouts) {
            // First, try to get existing balance
            const { data: existing } = await supabase
                .from("user_rewards")
                .select("pending_balance, lifetime_earnings")
                .eq("wallet_id", userPayout.wallet_id)
                .single();

            const currentPending = existing?.pending_balance || 0;
            const currentLifetime = existing?.lifetime_earnings || 0;

            // Upsert with updated values
            const { error: upsertError } = await supabase
                .from("user_rewards")
                .upsert({
                    wallet_id: userPayout.wallet_id,
                    pending_balance: currentPending + userPayout.payout,
                    lifetime_earnings: currentLifetime + userPayout.payout,
                    last_distribution_at: now,
                    updated_at: now,
                }, { onConflict: "wallet_id" });

            if (upsertError) {
                console.error(`Failed to update ${userPayout.wallet_id}:`, upsertError);
                // Continue with other users instead of failing completely
            }
        }

        // Also update pending_rewards in player_data for UI sync
        for (const userPayout of userPayouts) {
            const { data: playerData } = await supabase
                .from("player_data")
                .select("pending_rewards")
                .eq("wallet_id", userPayout.wallet_id)
                .single();

            const currentPlayerPending = playerData?.pending_rewards || 0;

            await supabase
                .from("player_data")
                .update({
                    pending_rewards: currentPlayerPending + userPayout.payout
                })
                .eq("wallet_id", userPayout.wallet_id);
        }
    }

    // -------------------------------------------------------------------------
    // STEP D: Log the Distribution
    // -------------------------------------------------------------------------

    const retainedInTreasury = HOURLY_REWARD_POT - totalDistributed;

    const { error: logError } = await supabase
        .from("system_logs")
        .insert({
            event_type: "REWARD_DISTRIBUTION",
            total_pot_available: HOURLY_REWARD_POT,
            actual_distributed: totalDistributed,
            retained_in_treasury: retainedInTreasury,
            users_affected: userPayouts.length,
            details: {
                reward_per_point: REWARD_PER_POINT,
                total_theoretical_points: TOTAL_THEORETICAL_POINTS,
                distribution_breakdown: userPayouts.slice(0, 10), // Log first 10 for debugging
            },
        });

    if (logError) {
        console.error("Failed to log distribution:", logError);
        // Don't fail the whole operation for logging failure
    }

    // -------------------------------------------------------------------------
    // RESULT
    // -------------------------------------------------------------------------

    const result: DistributionResult = {
        success: true,
        total_pot_available: HOURLY_REWARD_POT,
        actual_distributed: Number(totalDistributed.toFixed(6)),
        retained_in_treasury: Number(retainedInTreasury.toFixed(6)),
        users_affected: userPayouts.length,
        reward_per_point: REWARD_PER_POINT,
        total_theoretical_points: TOTAL_THEORETICAL_POINTS,
    };

    console.log("✅ Distribution complete:", JSON.stringify(result, null, 2));

    return result;
}
