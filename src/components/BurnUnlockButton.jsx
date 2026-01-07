import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'; // Keep for hook structure if needed, but we use Privy mostly
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createBurnCheckedInstruction, getAccount } from '@solana/spl-token';
import { supabase } from '../supabaseClient';
import { Loader2, Flame, Lock } from 'lucide-react';

const TOKEN_MINT = '4hQ69BwNNk1KTzXnJ2AmtRc9fAqcEo6VVox3bJM9pump'; // Your Token Mint
const BURN_AMOUNT = 10;
const TOKEN_DECIMALS = 9;

const BurnUnlockButton = ({ carId, onUnlock, label = "Unlock Car" }) => {
    const { user, authenticated, connectWallet, wallets } = usePrivy();
    const [burning, setBurning] = useState(false);
    const [status, setStatus] = useState('');

    const handleBurn = async () => {
        if (!authenticated) {
            connectWallet();
            return;
        }

        const wallet = wallets[0]; // Use the primary connected wallet
        if (!wallet) {
            setStatus('No wallet connected');
            return;
        }

        setBurning(true);
        setStatus('Initiating burn...');

        try {
            // 1. Get Connection using Moralis RPC (Private)
            const connection = new window.solanaWeb3.Connection(
                import.meta.env.VITE_MORALIS_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
                'confirmed'
            );

            const publicKey = new PublicKey(wallet.address);
            const mint = new PublicKey(TOKEN_MINT);

            // 2. Check Balance
            let tokenAccount;
            try {
                tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
                const accountInfo = await connection.getTokenAccountBalance(tokenAccount);

                if (!accountInfo.value.uiAmount || accountInfo.value.uiAmount < BURN_AMOUNT) {
                    throw new Error(`Insufficient funds. Need ${BURN_AMOUNT} tokens.`);
                }
            } catch (err) {
                // Check if it's just that the account doesn't exist
                throw new Error(`Token account not found or empty. You need ${BURN_AMOUNT} tokens.`);
            }

            // 3. Create Burn Instruction
            const burnAmountRaw = BigInt(BURN_AMOUNT) * BigInt(Math.pow(10, TOKEN_DECIMALS));

            const { blockhash } = await connection.getLatestBlockhash('confirmed');

            const transaction = new Transaction();
            transaction.add(
                createBurnCheckedInstruction(
                    tokenAccount,
                    mint,
                    publicKey,
                    burnAmountRaw,
                    TOKEN_DECIMALS
                )
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // 4. Sign and Send via Privy
            setStatus('Please sign the transaction...');
            const signature = await wallet.sendTransaction(transaction, connection);

            setStatus('Confirming burn...');
            await connection.confirmTransaction(signature, 'confirmed');

            // 5. Verify with Backend & Unlock
            setStatus('Verifying unlock...');
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-burn-unlock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    signature,
                    userWallet: wallet.address,
                    carId
                })
            });

            const data = await response.json();

            if (!data.success) {
                // Determine if it was actually recorded despite error
                if (data.error && data.error.includes('already processed')) {
                    setStatus('Already unlocked!');
                    if (onUnlock) onUnlock();
                    return;
                }
                throw new Error(data.error || 'Verification failed');
            }

            setStatus('Unlock successful!');
            if (onUnlock) onUnlock();

        } catch (err) {
            console.error('Burn failed:', err);
            setStatus(err.message || 'Transaction failed');
        } finally {
            setBurning(false);
        }
    };

    return (
        <button
            onClick={handleBurn}
            disabled={burning}
            className={`
                relative group overflow-hidden rounded-xl px-8 py-4 
                bg-red-600 hover:bg-red-500 transition-all duration-300
                flex items-center justify-center gap-3
                shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)]
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
        >
            {/* Background Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content */}
            <div className="relative z-10 flex items-center gap-2 font-bold uppercase tracking-widest text-white">
                {burning ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">{status || 'Burning...'}</span>
                    </>
                ) : (
                    <>
                        <Flame className="w-5 h-5 fill-current" />
                        <span>{status && status.includes('failed') ? 'Retry Burn' : label}</span>
                        <div className="h-4 w-px bg-white/30 map-2" />
                        <span className="text-xs opacity-90">{BURN_AMOUNT} TOKENS</span>
                    </>
                )}
            </div>
        </button>
    );
};

export default BurnUnlockButton;
