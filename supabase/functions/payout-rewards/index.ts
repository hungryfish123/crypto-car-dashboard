// Supabase Edge Function: payout-rewards
// Securely signs and sends SOL from Treasury to user wallet
// WARNING: TREASURY_PRIVATE_KEY must NEVER be logged or returned

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

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase with service role for DB writes
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        /* 
        // 2. Get the authorization header and verify user (SKIPPED - Payout goes to wallet_id match only)
        const authHeader = req.headers.get('Authorization')
        
        // Create a client with the user's token to verify auth
        const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader || '' } }
        })

        const { data: { user }, error: authError } = await userClient.auth.getUser()
        // if (authError || !user) ...
        */

        console.log(`[Payout] Processing claim request...`)

        // 3. Parse request body for wallet address
        const { walletAddress } = await req.json()
        if (!walletAddress) {
            return new Response(JSON.stringify({ success: false, error: 'Missing wallet address' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Validate wallet address format
        let recipientPubkey: PublicKey
        try {
            recipientPubkey = new PublicKey(walletAddress)
        } catch {
            return new Response(JSON.stringify({ success: false, error: 'Invalid wallet address' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 4. Get user's pending rewards from player_data table
        const { data: playerData, error: playerError } = await supabase
            .from('player_data')
            .select('pending_rewards')
            .eq('wallet_id', walletAddress)
            .single()

        if (playerError || !playerData) {
            console.error('[Payout] Player not found:', playerError)
            return new Response(JSON.stringify({ success: false, error: 'Player not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const pendingRewards = parseFloat(playerData.pending_rewards) || 0
        console.log(`[Payout] Pending rewards: ${pendingRewards} SOL`)

        // 5. Validate rewards amount
        if (pendingRewards <= 0) {
            return new Response(JSON.stringify({ success: false, error: 'No pending rewards' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 6. Get Treasury keypair (NEVER log this)
        const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
        if (!treasuryPrivateKey) {
            console.error('[Payout] Treasury key not configured')
            return new Response(JSON.stringify({ success: false, error: 'Treasury not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        let treasuryKeypair: Keypair
        try {
            // Parse Base58 format (exported from Phantom/Solflare)
            const privateKeyBytes = decodeBase58(treasuryPrivateKey)
            treasuryKeypair = Keypair.fromSecretKey(privateKeyBytes)
        } catch {
            console.error('[Payout] Invalid treasury key format')
            return new Response(JSON.stringify({ success: false, error: 'Treasury configuration error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 7. Connect to Solana RPC
        const rpcUrl = Deno.env.get('HELIUS_RPC_URL') || 'https://api.mainnet-beta.solana.com'
        const connection = new Connection(rpcUrl, 'confirmed')

        // 8. Check treasury balance
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
        const lamportsToSend = Math.floor(pendingRewards * LAMPORTS_PER_SOL)

        if (treasuryBalance < lamportsToSend + 5000) { // 5000 lamports for tx fee
            console.error(`[Payout] Insufficient treasury balance: ${treasuryBalance} < ${lamportsToSend}`)
            return new Response(JSON.stringify({ success: false, error: 'Treasury insufficient funds' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 9. OPTIMISTIC LOCK: Set pending_rewards to 0 BEFORE sending
        const { error: lockError } = await supabase
            .from('player_data')
            .update({ pending_rewards: 0 })
            .eq('wallet_id', walletAddress)

        if (lockError) {
            console.error('[Payout] Failed to lock rewards:', lockError)
            return new Response(JSON.stringify({ success: false, error: 'Database error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log('[Payout] Rewards locked. Sending transaction...')

        // 10. Create and send the transaction
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

            console.log(`[Payout] Transaction successful: ${txSignature}`)

        } catch (txError: unknown) {
            // ROLLBACK: Restore the pending_rewards
            console.error('[Payout] Transaction failed, rolling back:', txError)
            await supabase
                .from('player_data')
                .update({ pending_rewards: pendingRewards })
                .eq('wallet_id', walletAddress)

            const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed'
            return new Response(JSON.stringify({ success: false, error: errorMessage }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 11. Log the payout for auditing
        await supabase
            .from('payout_logs')
            .insert({
                wallet_id: walletAddress,
                amount: pendingRewards,
                tx_signature: txSignature
            })

        console.log(`[Payout] Payout logged for wallet ${walletAddress}`)

        // 12. Return success
        return new Response(JSON.stringify({
            success: true,
            txSignature,
            amount: pendingRewards
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Payout] Fatal error:', message)
        return new Response(JSON.stringify({ success: false, error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
