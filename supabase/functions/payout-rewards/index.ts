// Supabase Edge Function: payout-rewards
// Securely sends SOL from Treasury to user wallet
// First claim: No cooldown | Subsequent claims: 60s cooldown
// Min: 0.0001 SOL | Max: 0.5 SOL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.87.6'
import { decode as decodeBase58 } from 'https://deno.land/std@0.208.0/encoding/base58.ts'

// Constants
const MIN_CLAIM = 0.0001  // Minimum SOL to claim
const MAX_CLAIM = 0.5     // Maximum SOL per claim
const COOLDOWN_SECONDS = 60  // 1 minute between claims (after first claim)
const SOL_PER_POINT_PER_HOUR = 0.001  // 1 point = 0.001 SOL/hour

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(data: object, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Parse request
        const { walletAddress } = await req.json()
        if (!walletAddress) {
            return jsonResponse({ success: false, error: 'Missing wallet address' }, 400)
        }

        console.log(`[Payout] Processing claim for ${walletAddress}`)

        // 3. Validate wallet address format
        let recipientPubkey: PublicKey
        try {
            recipientPubkey = new PublicKey(walletAddress)
        } catch {
            return jsonResponse({ success: false, error: 'Invalid wallet address' }, 400)
        }

        // 4. Get player data including equipped_parts
        const { data: player, error: playerError } = await supabase
            .from('player_data')
            .select('last_claim_at, total_earned, equipped_parts')
            .eq('wallet_id', walletAddress)
            .single()

        if (playerError || !player) {
            console.error('[Payout] Player not found:', playerError)
            return jsonResponse({ success: false, error: 'Player not found' }, 404)
        }

        // 5. Check cooldown (only if last_claim_at exists - first claim is free)
        if (player.last_claim_at) {
            const lastClaim = new Date(player.last_claim_at)
            const secondsSinceLastClaim = (Date.now() - lastClaim.getTime()) / 1000
            if (secondsSinceLastClaim < COOLDOWN_SECONDS) {
                const remaining = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastClaim)
                return jsonResponse({
                    success: false,
                    error: `It has been less than a minute since your last claim. Please wait ${remaining} more seconds.`,
                    cooldownRemaining: remaining
                }, 429)
            }
        }

        // 6. Get all item yield weights from item_mappings
        const { data: itemMappings, error: mappingsError } = await supabase
            .from('item_mappings')
            .select('item_id, yield_weight')
            .gt('yield_weight', 0)

        if (mappingsError) {
            console.error('[Payout] Error fetching item mappings:', mappingsError)
            return jsonResponse({ success: false, error: 'Failed to fetch item data' }, 500)
        }

        // Create lookup map: item_id -> yield_weight
        const yieldMap: Record<string, number> = {}
        for (const item of itemMappings || []) {
            yieldMap[item.item_id] = item.yield_weight
        }

        // 7. Calculate pending rewards from equipped_parts
        let pendingRewards = 0
        const equippedParts = player.equipped_parts || {}
        const now = Date.now()

        // Iterate through all cars and their equipped parts
        for (const carId of Object.keys(equippedParts)) {
            const carParts = equippedParts[carId]
            if (!carParts || typeof carParts !== 'object') continue

            // Iterate through each slot (Engines, Turbos, etc.)
            for (const slot of Object.keys(carParts)) {
                const part = carParts[slot]
                if (!part) continue

                // Get item ID (handle both { id: "..." } and "item_id" formats)
                const itemId = typeof part === 'object' ? (part.id || part.item_id) : part
                if (!itemId) continue

                // Get yield weight for this item
                const yieldWeight = yieldMap[itemId] || 0
                if (yieldWeight === 0) continue

                // Get equipped_at timestamp (or use a default if not present)
                let equippedAt: number
                if (typeof part === 'object' && part.equipped_at) {
                    equippedAt = new Date(part.equipped_at).getTime()
                } else if (player.last_claim_at) {
                    // Fall back to last_claim_at if no equipped_at
                    equippedAt = new Date(player.last_claim_at).getTime()
                } else {
                    // For first claim, assume equipped for 1 hour minimum
                    equippedAt = now - (60 * 60 * 1000)
                }

                // Calculate hours since equipped (or since last claim, whichever is later)
                const baseTime = player.last_claim_at
                    ? Math.max(equippedAt, new Date(player.last_claim_at).getTime())
                    : equippedAt
                const hoursElapsed = Math.max(0, (now - baseTime) / (1000 * 60 * 60))

                // Calculate earnings for this item
                const itemEarnings = yieldWeight * SOL_PER_POINT_PER_HOUR * hoursElapsed
                pendingRewards += itemEarnings

                console.log(`[Payout] Item ${itemId}: ${yieldWeight} pts × ${hoursElapsed.toFixed(4)}h = ${itemEarnings.toFixed(6)} SOL`)
            }
        }

        console.log(`[Payout] Total pending rewards: ${pendingRewards.toFixed(6)} SOL`)

        // 8. Validate amount
        if (pendingRewards < MIN_CLAIM) {
            return jsonResponse({
                success: false,
                error: `Minimum claim is ${MIN_CLAIM} SOL. You have ${pendingRewards.toFixed(6)} SOL pending.`,
                pendingRewards
            }, 400)
        }

        // Cap at maximum
        const amountToSend = Math.min(pendingRewards, MAX_CLAIM)
        console.log(`[Payout] Amount to send: ${amountToSend.toFixed(6)} SOL`)

        // 9. Get Treasury keypair (NEVER log this)
        const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
        if (!treasuryPrivateKey) {
            console.error('[Payout] Treasury key not configured')
            return jsonResponse({ success: false, error: 'Treasury not configured' }, 500)
        }

        let treasuryKeypair: Keypair
        try {
            const privateKeyBytes = decodeBase58(treasuryPrivateKey)
            treasuryKeypair = Keypair.fromSecretKey(privateKeyBytes)
        } catch {
            console.error('[Payout] Invalid treasury key format')
            return jsonResponse({ success: false, error: 'Treasury configuration error' }, 500)
        }

        // 10. Connect to Solana
        const rpcUrl = Deno.env.get('HELIUS_RPC_KEY') || 'https://api.mainnet-beta.solana.com'
        const connection = new Connection(rpcUrl, 'confirmed')

        // 11. Check treasury balance
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
        const lamportsToSend = Math.floor(amountToSend * LAMPORTS_PER_SOL)

        if (treasuryBalance < lamportsToSend + 10000) { // 10000 lamports buffer for fee
            console.error(`[Payout] Insufficient treasury balance: ${treasuryBalance} lamports`)
            return jsonResponse({ success: false, error: 'Treasury insufficient funds' }, 500)
        }

        // 12. Update last_claim_at and total_earned BEFORE sending (optimistic lock)
        const newTotalEarned = (parseFloat(player.total_earned) || 0) + amountToSend
        const { error: lockError } = await supabase
            .from('player_data')
            .update({
                last_claim_at: new Date().toISOString(),
                total_earned: newTotalEarned
            })
            .eq('wallet_id', walletAddress)

        if (lockError) {
            console.error('[Payout] Failed to lock claim:', lockError)
            return jsonResponse({ success: false, error: 'Database error' }, 500)
        }

        console.log('[Payout] Claim locked. Sending transaction...')

        // 13. Create and send transaction
        let txSignature: string
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: treasuryKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: lamportsToSend
                })
            )

            txSignature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair], {
                commitment: 'confirmed'
            })

            console.log(`[Payout] ✅ Transaction successful: ${txSignature}`)

        } catch (txError: unknown) {
            // ROLLBACK on failure
            console.error('[Payout] Transaction failed, rolling back:', txError)
            await supabase
                .from('player_data')
                .update({
                    last_claim_at: player.last_claim_at,
                    total_earned: player.total_earned || 0
                })
                .eq('wallet_id', walletAddress)

            const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed'
            return jsonResponse({ success: false, error: errorMessage }, 500)
        }

        // 14. Log the payout
        await supabase
            .from('payout_logs')
            .insert({
                wallet_id: walletAddress,
                amount: amountToSend,
                tx_signature: txSignature
            })

        console.log(`[Payout] Logged payout: ${amountToSend.toFixed(6)} SOL to ${walletAddress}`)

        // 15. Return success
        return jsonResponse({
            success: true,
            txSignature,
            amount: amountToSend,
            recipientAddress: walletAddress
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Payout] Fatal error:', message)
        return jsonResponse({ success: false, error: message }, 500)
    }
})
