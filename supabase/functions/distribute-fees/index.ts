// =====================================================
// DISTRIBUTE FEES - Supabase Edge Function
// Calculates and allocates fees to users based on holdings
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Item {
    id: string;
    name: string;
    total_supply: number;
    rarity_weight: number;
}

interface UserHolding {
    user_wallet: string;
    item_id: string;
    balance: number;
}

interface DistributionResult {
    wallet: string;
    amount: number;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Initialize Supabase client with service role for admin operations
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body
        const { total_fee_amount, admin_wallet, notes } = await req.json();

        if (!total_fee_amount || total_fee_amount <= 0) {
            return new Response(
                JSON.stringify({ error: "Invalid total_fee_amount. Must be > 0" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[distribute-fees] Starting distribution of ${total_fee_amount} SOL`);

        // =========================================
        // STEP 1: Fetch all items and visibility mappings
        // =========================================
        const { data: items, error: itemsError } = await supabase
            .from("items")
            .select("id, name, total_supply, rarity_weight");

        if (itemsError) throw itemsError;

        // Fetch hidden items from item_mappings
        const { data: hiddenMappings, error: mappingsError } = await supabase
            .from("item_mappings")
            .select("item_id")
            .eq("hidden", true);

        if (mappingsError) throw mappingsError;

        const hiddenItemIds = new Set((hiddenMappings || []).map((m: any) => m.item_id));

        // Filter out hidden items
        const activeItems = (items || []).filter((item: Item) => !hiddenItemIds.has(item.id));

        if (!activeItems || activeItems.length === 0) {
            return new Response(
                JSON.stringify({ error: "No active (non-hidden) items found" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[distribute-fees] Found ${items?.length} total items, ${activeItems.length} active`);

        // =========================================
        // STEP 2: Calculate Total System Score (Active Only)
        // Total_System_Score = Σ(total_supply × rarity_weight)
        // =========================================
        const totalSystemScore = activeItems.reduce((sum: number, item: Item) => {
            return sum + (item.total_supply * item.rarity_weight);
        }, 0);

        if (totalSystemScore === 0) {
            return new Response(
                JSON.stringify({ error: "Total system score is 0. Check item supplies." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[distribute-fees] Total System Score: ${totalSystemScore}`);

        // =========================================
        // STEP 3: Calculate SOL per token for each item
        // Item_Pool_SOL = total_fee × (supply × weight) / Total_System_Score
        // SOL_Per_Token = Item_Pool_SOL / total_supply
        // =========================================
        const solPerToken: Record<string, number> = {};

        for (const item of activeItems as Item[]) {
            const itemPoolSol = total_fee_amount * ((item.total_supply * item.rarity_weight) / totalSystemScore);
            const perToken = item.total_supply > 0 ? itemPoolSol / item.total_supply : 0;
            solPerToken[item.id] = perToken;

            console.log(`[distribute-fees] ${item.name}: Pool=${itemPoolSol.toFixed(6)} SOL, Per Token=${perToken.toFixed(9)} SOL`);
        }

        // =========================================
        // STEP 4: Fetch all user holdings
        // =========================================
        const { data: holdings, error: holdingsError } = await supabase
            .from("user_holdings")
            .select("user_wallet, item_id, balance")
            .gt("balance", 0);

        if (holdingsError) throw holdingsError;

        if (!holdings || holdings.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No user holdings found. Nothing to distribute.",
                    users_affected: 0
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[distribute-fees] Found ${holdings.length} holding records`);

        // =========================================
        // STEP 5: Calculate rewards per user
        // User_Share = balance × SOL_Per_Token
        // =========================================
        const userRewards: Record<string, number> = {};

        for (const holding of holdings as UserHolding[]) {
            const perToken = solPerToken[holding.item_id] || 0;
            const userShare = holding.balance * perToken;

            if (userShare > 0) {
                if (!userRewards[holding.user_wallet]) {
                    userRewards[holding.user_wallet] = 0;
                }
                userRewards[holding.user_wallet] += userShare;
            }
        }

        const usersToUpdate = Object.entries(userRewards).filter(([_, amount]) => amount > 0);
        console.log(`[distribute-fees] ${usersToUpdate.length} users will receive rewards`);

        // =========================================
        // STEP 6: Batch update user_rewards table
        // =========================================
        let successCount = 0;
        let errorCount = 0;
        const distributionDetails: DistributionResult[] = [];

        for (const [wallet, amount] of usersToUpdate) {
            // Upsert: Insert if not exists, update if exists
            const { error: upsertError } = await supabase
                .from("user_rewards")
                .upsert(
                    {
                        user_wallet: wallet,
                        claimable_sol: amount,  // Will be incremented below
                        lifetime_earnings: 0,   // Will be incremented on claim
                    },
                    { onConflict: "user_wallet", ignoreDuplicates: false }
                );

            if (upsertError) {
                // If upsert fails, try to increment existing
                const { error: updateError } = await supabase.rpc("increment_claimable_sol", {
                    wallet_address: wallet,
                    amount_to_add: amount,
                });

                if (updateError) {
                    console.error(`[distribute-fees] Failed to update ${wallet}:`, updateError);
                    errorCount++;
                    continue;
                }
            } else {
                // Upsert succeeded for new user, now increment for existing
                const { error: incrementError } = await supabase
                    .from("user_rewards")
                    .update({
                        claimable_sol: supabase.rpc("add_to_claimable", { wallet, amount })
                    })
                    .eq("user_wallet", wallet);

                // Alternative: Use raw SQL increment
                await supabase.rpc("increment_claimable_sol", {
                    wallet_address: wallet,
                    amount_to_add: amount,
                });
            }

            successCount++;
            distributionDetails.push({ wallet, amount });
        }

        // =========================================
        // STEP 7: Log the distribution event
        // =========================================
        await supabase.from("distribution_logs").insert({
            total_fee_amount,
            total_system_score: totalSystemScore,
            users_affected: successCount,
            admin_wallet: admin_wallet || null,
            notes: notes || null,
        });

        console.log(`[distribute-fees] Distribution complete! ${successCount} users updated, ${errorCount} errors`);

        return new Response(
            JSON.stringify({
                success: true,
                total_distributed: total_fee_amount,
                total_system_score: totalSystemScore,
                users_affected: successCount,
                errors: errorCount,
                details: distributionDetails.slice(0, 100), // Limit response size
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("[distribute-fees] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
