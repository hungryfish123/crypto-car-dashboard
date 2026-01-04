// =====================================================
// ADMIN SYNC ALL - Supabase Edge Function
// Force-refresh all user wallets (Admin Only)
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify admin authorization (check for service role or admin wallet)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.includes(supabaseServiceKey)) {
            // Optional: Check for admin wallet in request
            const { admin_wallet } = await req.json().catch(() => ({}));
            const adminWallets = (Deno.env.get("ADMIN_WALLETS") || "").split(",");

            if (!admin_wallet || !adminWallets.includes(admin_wallet)) {
                return new Response(
                    JSON.stringify({ error: "Unauthorized. Admin access required." }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        console.log("[admin-sync-all] Starting full sync...");

        // =========================================
        // STEP 1: Get all unique wallets from user_holdings and user_rewards
        // =========================================
        const { data: holdingsWallets } = await supabase
            .from("user_holdings")
            .select("user_wallet")
            .limit(1000);

        const { data: rewardsWallets } = await supabase
            .from("user_rewards")
            .select("user_wallet")
            .limit(1000);

        // Combine and deduplicate
        const allWallets = new Set<string>();

        for (const h of holdingsWallets || []) {
            allWallets.add(h.user_wallet);
        }
        for (const r of rewardsWallets || []) {
            allWallets.add(r.user_wallet);
        }

        const walletList = Array.from(allWallets);
        console.log(`[admin-sync-all] Found ${walletList.length} unique wallets to sync`);

        if (walletList.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No wallets to sync",
                    synced: 0
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // =========================================
        // STEP 2: Call sync-wallet for each wallet
        // =========================================
        const syncWalletUrl = `${supabaseUrl}/functions/v1/sync-wallet`;
        const results: { wallet: string; success: boolean; error?: string }[] = [];

        // Process in batches to avoid rate limits
        const BATCH_SIZE = 10;
        const DELAY_MS = 1000; // 1 second between batches

        for (let i = 0; i < walletList.length; i += BATCH_SIZE) {
            const batch = walletList.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (wallet) => {
                try {
                    const response = await fetch(syncWalletUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({ user_wallet: wallet }),
                    });

                    if (response.ok) {
                        return { wallet, success: true };
                    } else {
                        const error = await response.text();
                        return { wallet, success: false, error };
                    }
                } catch (err) {
                    return { wallet, success: false, error: err.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Rate limit delay
            if (i + BATCH_SIZE < walletList.length) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
            }

            console.log(`[admin-sync-all] Processed ${Math.min(i + BATCH_SIZE, walletList.length)}/${walletList.length} wallets`);
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        console.log(`[admin-sync-all] Complete! Success: ${successCount}, Failed: ${failCount}`);

        return new Response(
            JSON.stringify({
                success: true,
                total_wallets: walletList.length,
                synced: successCount,
                failed: failCount,
                failures: results.filter((r) => !r.success),
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("[admin-sync-all] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
