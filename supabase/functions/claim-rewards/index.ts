// =====================================================
// CLAIM REWARDS - Supabase Edge Function
// Sends claimable SOL to users and resets their balance
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from "https://esm.sh/@solana/web3.js@1.87.6";
import * as bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimum claim amount (to avoid dust transactions)
const MIN_CLAIM_AMOUNT = 0.001; // 0.001 SOL

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

        // Get Treasury Private Key from secrets
        const treasuryPrivateKey = Deno.env.get("TREASURY_PRIVATE_KEY");
        if (!treasuryPrivateKey) {
            throw new Error("Treasury private key not configured");
        }

        // Get Solana RPC URL (default to mainnet)
        const solanaRpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";

        // Parse request body
        const { user_wallet } = await req.json();

        if (!user_wallet) {
            return new Response(
                JSON.stringify({ error: "user_wallet is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate wallet address format
        try {
            new PublicKey(user_wallet);
        } catch {
            return new Response(
                JSON.stringify({ error: "Invalid wallet address format" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[claim-rewards] Processing claim for wallet: ${user_wallet}`);

        // =========================================
        // STEP 1: Check claimable balance
        // =========================================
        const { data: rewardData, error: fetchError } = await supabase
            .from("user_rewards")
            .select("claimable_sol, lifetime_earnings")
            .eq("user_wallet", user_wallet)
            .single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                // No row found
                return new Response(
                    JSON.stringify({ error: "No rewards found for this wallet", claimable: 0 }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            throw fetchError;
        }

        const claimableAmount = Number(rewardData.claimable_sol) || 0;

        if (claimableAmount < MIN_CLAIM_AMOUNT) {
            return new Response(
                JSON.stringify({
                    error: `Minimum claim amount is ${MIN_CLAIM_AMOUNT} SOL`,
                    claimable: claimableAmount
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[claim-rewards] Claimable amount: ${claimableAmount} SOL`);

        // =========================================
        // STEP 2: Create claim log (pending)
        // =========================================
        const { data: claimLog, error: logError } = await supabase
            .from("claim_logs")
            .insert({
                user_wallet,
                amount_claimed: claimableAmount,
                status: "pending",
            })
            .select()
            .single();

        if (logError) throw logError;

        // =========================================
        // STEP 3: Send SOL transaction
        // =========================================
        try {
            // Decode treasury keypair
            const treasuryKeypair = Keypair.fromSecretKey(
                bs58.decode(treasuryPrivateKey)
            );

            // Connect to Solana
            const connection = new Connection(solanaRpcUrl, "confirmed");

            // Create transfer instruction
            const recipientPubkey = new PublicKey(user_wallet);
            const lamports = Math.floor(claimableAmount * LAMPORTS_PER_SOL);

            // Check treasury balance first
            const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
            if (treasuryBalance < lamports + 5000) { // 5000 for tx fee
                throw new Error("Insufficient treasury balance");
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: treasuryKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports,
                })
            );

            // Send and confirm transaction
            console.log(`[claim-rewards] Sending ${claimableAmount} SOL to ${user_wallet}...`);

            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [treasuryKeypair],
                { commitment: "confirmed" }
            );

            console.log(`[claim-rewards] Transaction confirmed! Signature: ${signature}`);

            // =========================================
            // STEP 4: Update database on success
            // =========================================

            // Reset claimable_sol to 0, increment lifetime_earnings
            const { error: updateError } = await supabase
                .from("user_rewards")
                .update({
                    claimable_sol: 0,
                    lifetime_earnings: (rewardData.lifetime_earnings || 0) + claimableAmount,
                    last_claim_at: new Date().toISOString(),
                })
                .eq("user_wallet", user_wallet);

            if (updateError) {
                console.error("[claim-rewards] Failed to update user_rewards:", updateError);
                // Transaction succeeded but DB update failed - log for manual intervention
            }

            // Update claim log to success
            await supabase
                .from("claim_logs")
                .update({
                    transaction_signature: signature,
                    status: "success",
                })
                .eq("id", claimLog.id);

            return new Response(
                JSON.stringify({
                    success: true,
                    amount_claimed: claimableAmount,
                    transaction_signature: signature,
                    explorer_url: `https://solscan.io/tx/${signature}`,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );

        } catch (txError) {
            console.error("[claim-rewards] Transaction failed:", txError);

            // Update claim log to failed
            await supabase
                .from("claim_logs")
                .update({
                    status: "failed",
                })
                .eq("id", claimLog.id);

            return new Response(
                JSON.stringify({
                    error: "Transaction failed",
                    details: txError.message,
                    claimable: claimableAmount
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

    } catch (error) {
        console.error("[claim-rewards] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
