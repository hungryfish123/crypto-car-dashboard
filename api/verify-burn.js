// Vercel Serverless Function: Verify Burn Transaction
// Path: /api/verify-burn.js
// 
// This function verifies a Solana SPL token burn transaction
// and prevents double-claiming by checking against the database.

import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// Configuration - Set these in Vercel Environment Variables
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS; // Your token mint
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '9');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server

// SPL Token Program ID
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Initialize Supabase client (server-side with service role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Check if a signature has already been claimed
 */
async function isSignatureUsed(signature) {
    const { data, error } = await supabase
        .from('burned_transactions')
        .select('signature')
        .eq('signature', signature)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error('Database error checking signature');
    }

    return !!data;
}

/**
 * Record a successful burn transaction
 */
async function recordBurn(signature, userWallet, amountBurned) {
    const { error } = await supabase
        .from('burned_transactions')
        .insert([{
            signature,
            user_wallet: userWallet,
            amount_burned: amountBurned,
            burned_at: new Date().toISOString()
        }]);

    if (error) {
        throw new Error('Failed to record burn transaction');
    }
}

/**
 * Find burn instructions in transaction
 */
function findBurnInstructions(transaction) {
    const burns = [];

    // Check main instructions
    const instructions = transaction.transaction.message.instructions || [];
    for (const ix of instructions) {
        if (ix.program === 'spl-token' &&
            (ix.parsed?.type === 'burn' || ix.parsed?.type === 'burnChecked')) {
            burns.push({
                mint: ix.parsed.info.mint,
                amount: ix.parsed.info.amount || ix.parsed.info.tokenAmount?.amount,
                decimals: ix.parsed.info.decimals || ix.parsed.info.tokenAmount?.decimals
            });
        }
    }

    // Check inner instructions
    const innerInstructions = transaction.meta?.innerInstructions || [];
    for (const inner of innerInstructions) {
        for (const ix of inner.instructions || []) {
            if (ix.program === 'spl-token' &&
                (ix.parsed?.type === 'burn' || ix.parsed?.type === 'burnChecked')) {
                burns.push({
                    mint: ix.parsed.info.mint,
                    amount: ix.parsed.info.amount || ix.parsed.info.tokenAmount?.amount,
                    decimals: ix.parsed.info.decimals || ix.parsed.info.tokenAmount?.decimals
                });
            }
        }
    }

    return burns;
}

/**
 * Main API Handler
 */
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { signature, userWallet } = req.body;

    // Validate input
    if (!signature || !userWallet) {
        return res.status(400).json({ error: 'Missing signature or userWallet' });
    }

    if (!TOKEN_MINT_ADDRESS) {
        return res.status(500).json({ error: 'Server misconfigured: TOKEN_MINT_ADDRESS not set' });
    }

    try {
        // Security Check 2: Check if signature already used
        const alreadyUsed = await isSignatureUsed(signature);
        if (alreadyUsed) {
            return res.status(400).json({
                success: false,
                error: 'Transaction already claimed'
            });
        }

        // Connect to Solana
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

        // Fetch the parsed transaction
        const transaction = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Check if transaction was successful
        if (transaction.meta?.err) {
            return res.status(400).json({
                success: false,
                error: 'Transaction failed on-chain'
            });
        }

        // Security Check 1: Verify signer matches userWallet
        const accountKeys = transaction.transaction.message.accountKeys;
        const firstSigner = accountKeys.find(key => key.signer);

        if (!firstSigner || firstSigner.pubkey.toString() !== userWallet) {
            return res.status(403).json({
                success: false,
                error: 'Transaction signer does not match wallet'
            });
        }

        // Find burn instructions
        const burns = findBurnInstructions(transaction);

        if (burns.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No burn instruction found in transaction'
            });
        }

        // Validate token mint and sum up burned amount
        let totalBurned = 0;
        for (const burn of burns) {
            if (burn.mint === TOKEN_MINT_ADDRESS) {
                // Handle decimals properly
                const decimals = burn.decimals || TOKEN_DECIMALS;
                const rawAmount = BigInt(burn.amount);
                totalBurned += Number(rawAmount) / Math.pow(10, decimals);
            }
        }

        if (totalBurned === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid token burns found for specified mint'
            });
        }

        // Success! Record the burn transaction
        await recordBurn(signature, userWallet, totalBurned);

        return res.status(200).json({
            success: true,
            amountBurned: totalBurned,
            signature: signature,
            message: 'Burn verified and recorded successfully'
        });

    } catch (error) {
        console.error('Verify burn error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
