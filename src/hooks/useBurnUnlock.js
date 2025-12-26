import { useCallback, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { PublicKey, Transaction, Connection, clusterApiUrl } from '@solana/web3.js';
import { createBurnCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// Replace with your actual Devnet Mint Address
// TODO: User to provide actual mint address
const MINT_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
const REQUIRED_DECIMALS = 9; // Devnet Token usually 9

export function useBurnUnlock() {
    const { wallets } = useWallets();
    const [isBurning, setIsBurning] = useState(false);

    const handleBurnToUnlock = useCallback(async (carId, carPrice, onSuccess) => {
        const solanaWallet = wallets.find(w => w.chainType === 'solana');

        if (!solanaWallet) {
            alert('Please connect your Solana wallet first!');
            return;
        }

        try {
            setIsBurning(true);
            console.log(`Initiating burn for ${carId}. Price: ${carPrice}`);

            // Establish connection (Devnet)
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            const publicKey = new PublicKey(solanaWallet.address);

            // 1. Get Token Info & User ATA
            const mintPublicKey = new PublicKey(MINT_ADDRESS);
            const userATA = await getAssociatedTokenAddress(mintPublicKey, publicKey);

            console.log('User ATA:', userATA.toString());

            // 2. Create Burn Instruction
            const amountToBurn = BigInt(carPrice * Math.pow(10, REQUIRED_DECIMALS));

            const burnIx = createBurnCheckedInstruction(
                userATA, // Token Account to burn from
                mintPublicKey, // Mint Address
                publicKey, // Owner (User)
                amountToBurn, // Amount
                REQUIRED_DECIMALS // Decimals
            );

            // 3. Build Transaction
            const transaction = new Transaction().add(burnIx);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // 4. Send Transaction using Privy Wallet Provider
            console.log('Getting wallet provider...');
            const provider = await solanaWallet.getProvider();

            console.log('Sending transaction...');
            // Standard Solana provider interface
            const { signature } = await provider.signAndSendTransaction(transaction);

            console.log('Transaction sent:', signature);

            // 5. Wait for Confirmation
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed on-chain');
            }

            console.log('Transaction confirmed. Verifying with API...');

            // 6. Verify via API
            const response = await fetch('/api/verify-unlock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature,
                    walletAddress: publicKey.toString(),
                    requiredAmount: carPrice
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert(`Car Unlocked! ${carId} is now yours.`);
                if (onSuccess) onSuccess();
            } else {
                alert(`Verification failed: ${data.error}`);
            }

        } catch (error) {
            console.error('Burn failed:', error);
            alert(`Burn failed: ${error.message || error}`);
        } finally {
            setIsBurning(false);
        }
    }, [wallets]);

    return { handleBurnToUnlock, isBurning };
}
