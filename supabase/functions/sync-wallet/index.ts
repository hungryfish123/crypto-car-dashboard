// =====================================================
// SYNC WALLET - Supabase Edge Function
// Scans wallet for SPL tokens and syncs with game items
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MoralisSPLToken {
    mint: string;
    amount: string;
    amountRaw: string;
    decimals: number;
    name?: string;
    symbol?: string;
}

interface GameItem {
    id: string;
    name: string;
    contract_address: string;
    rarity: string;
    rarity_weight: number;
}

interface SyncResult {
    item_id: string;
    item_name: string;
    contract_address: string;
    balance: number;
    action: "added" | "updated" | "removed";
}

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

        // Get Moralis API Key
        const moralisApiKey = Deno.env.get("MORALIS_API_KEY");
        if (!moralisApiKey) {
            throw new Error("MORALIS_API_KEY not configured");
        }

        // Parse request body
        const { user_wallet, force_refresh = false } = await req.json();

        if (!user_wallet) {
            return new Response(
                JSON.stringify({ error: "user_wallet is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[sync-wallet] Syncing wallet: ${user_wallet}`);

        // =========================================
        // STEP 1: Fetch all game items from DB
        // =========================================
        const { data: gameItems, error: itemsError } = await supabase
            .from("items")
            .select("id, name, contract_address, rarity, rarity_weight");

        if (itemsError) throw itemsError;

        if (!gameItems || gameItems.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No game items configured",
                    inventory: []
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create a map of contract addresses to game items
        const contractToItem = new Map<string, GameItem>();
        for (const item of gameItems as GameItem[]) {
            contractToItem.set(item.contract_address.toLowerCase(), item);
        }

        console.log(`[sync-wallet] Tracking ${gameItems.length} game items`);

        // =========================================
        // STEP 2: Fetch SPL tokens from Moralis
        // =========================================
        const moralisUrl = `https://solana-gateway.moralis.io/account/mainnet/${user_wallet}/tokens`;

        const moralisResponse = await fetch(moralisUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-API-Key": moralisApiKey,
            },
        });

        if (!moralisResponse.ok) {
            const errorText = await moralisResponse.text();
            console.error(`[sync-wallet] Moralis API error: ${moralisResponse.status}`, errorText);
            throw new Error(`Moralis API error: ${moralisResponse.status}`);
        }

        const moralisData = await moralisResponse.json();
        const userTokens: MoralisSPLToken[] = moralisData || [];

        console.log(`[sync-wallet] Found ${userTokens.length} SPL tokens in wallet`);

        // =========================================
        // STEP 3: Match tokens against game items
        // =========================================
        const matchedTokens = new Map<string, { item: GameItem; balance: number }>();

        for (const token of userTokens) {
            const mintAddress = token.mint.toLowerCase();
            const gameItem = contractToItem.get(mintAddress);

            if (gameItem) {
                // Parse balance (handle decimals)
                const balance = parseFloat(token.amount) || 0;
                matchedTokens.set(gameItem.id, { item: gameItem, balance });
                console.log(`[sync-wallet] Matched: ${gameItem.name} = ${balance}`);
            }
        }

        console.log(`[sync-wallet] ${matchedTokens.size} game items found in wallet`);

        // =========================================
        // STEP 4: Get current holdings from DB
        // =========================================
        const { data: currentHoldings, error: holdingsError } = await supabase
            .from("user_holdings")
            .select("item_id, balance")
            .eq("user_wallet", user_wallet);

        if (holdingsError) throw holdingsError;

        const currentBalances = new Map<string, number>();
        for (const holding of currentHoldings || []) {
            currentBalances.set(holding.item_id, parseFloat(holding.balance) || 0);
        }

        // =========================================
        // STEP 5: Sync holdings (UPSERT + Handle Sales)
        // =========================================
        const syncResults: SyncResult[] = [];

        // Process all game items (not just matched ones)
        for (const gameItem of gameItems as GameItem[]) {
            const matchedData = matchedTokens.get(gameItem.id);
            const newBalance = matchedData?.balance || 0;
            const currentBalance = currentBalances.get(gameItem.id) || 0;

            // Skip if no change
            if (newBalance === currentBalance && newBalance === 0) {
                continue;
            }

            let action: "added" | "updated" | "removed";

            if (currentBalance === 0 && newBalance > 0) {
                action = "added";
            } else if (currentBalance > 0 && newBalance === 0) {
                action = "removed";
            } else {
                action = "updated";
            }

            // UPSERT: Update or insert the holding
            if (newBalance > 0) {
                const { error: upsertError } = await supabase
                    .from("user_holdings")
                    .upsert(
                        {
                            user_wallet,
                            item_id: gameItem.id,
                            balance: newBalance,
                            last_updated: new Date().toISOString(),
                        },
                        { onConflict: "user_wallet,item_id" }
                    );

                if (upsertError) {
                    console.error(`[sync-wallet] Failed to upsert ${gameItem.name}:`, upsertError);
                    continue;
                }
            } else if (currentBalance > 0) {
                // User sold the item - set balance to 0 (or delete)
                const { error: deleteError } = await supabase
                    .from("user_holdings")
                    .delete()
                    .eq("user_wallet", user_wallet)
                    .eq("item_id", gameItem.id);

                if (deleteError) {
                    console.error(`[sync-wallet] Failed to remove ${gameItem.name}:`, deleteError);
                    continue;
                }
            }

            if (action) {
                syncResults.push({
                    item_id: gameItem.id,
                    item_name: gameItem.name,
                    contract_address: gameItem.contract_address,
                    balance: newBalance,
                    action,
                });
            }
        }

        console.log(`[sync-wallet] Sync complete. ${syncResults.length} changes made.`);

        // =========================================
        // STEP 6: Return fresh inventory
        // =========================================
        const { data: freshHoldings, error: freshError } = await supabase
            .from("user_holdings")
            .select(`
        item_id,
        balance,
        items (
          id,
          name,
          contract_address,
          rarity,
          rarity_weight
        )
      `)
            .eq("user_wallet", user_wallet)
            .gt("balance", 0);

        if (freshError) throw freshError;

        // Format inventory for frontend
        const inventory = (freshHoldings || []).map((holding: any) => ({
            item_id: holding.item_id,
            balance: parseFloat(holding.balance),
            name: holding.items?.name,
            rarity: holding.items?.rarity,
            contract_address: holding.items?.contract_address,
        }));

        return new Response(
            JSON.stringify({
                success: true,
                wallet: user_wallet,
                items_synced: syncResults.length,
                sync_results: syncResults,
                inventory,
                total_unique_items: inventory.length,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("[sync-wallet] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
