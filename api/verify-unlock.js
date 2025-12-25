import { Connection, PublicKey } from '@solana/web3.js';

// Configuration
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

export default async function handler(req, res) {
    // 1. Method check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { signature, walletAddress, requiredAmount } = req.body;

    // 2. Input validation
    if (!signature || !walletAddress || !requiredAmount) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

        // 3. Fetch Transaction
        const transaction = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.meta?.err) {
            return res.status(400).json({ error: 'Transaction failed on-chain' });
        }

        // 4. Calculate Balance Change
        // We look for the change in token balance for the user's wallet
        // Note: This logic assumes we are checking for a *decrease* in balance (Burn)

        // Helper to find balance for a specific owner in a list of token balances
        const findBalance = (balances, owner) => {
            const found = balances.find(b => b.owner === owner);
            return found ? found.uiTokenAmount.uiAmount : 0;
        };

        const preBalance = findBalance(transaction.meta.preTokenBalances, walletAddress);
        const postBalance = findBalance(transaction.meta.postTokenBalances, walletAddress);

        // Calculate how much was burned/spent
        // If it's a burn, pre should be > post
        const amountChanged = preBalance - postBalance;

        // Floating point precision handling (simple version)
        // In production, consider using BigInt for raw amounts, but uiAmount is usually sufficient for simple checks
        const amountBurned = Math.max(0, amountChanged);

        console.log(`Wallet: ${walletAddress}`);
        console.log(`Pre: ${preBalance}, Post: ${postBalance}, Diff: ${amountBurned}`);
        console.log(`Required: ${requiredAmount}`);

        // 5. Verification
        if (amountBurned < requiredAmount) {
            return res.status(400).json({
                success: false,
                error: `Insufficient burn amount. Burned: ${amountBurned}, Required: ${requiredAmount}`
            });
        }

        // 6. Database Update (Mocked)
        // TODO: Connect to database and unlock the car for this user
        // await db.users.update({ where: { wallet: walletAddress }, data: { unlockedCars: { push: 'CAR_ID' } } });
        console.log(`[MOCK DB] Unlocking car for ${walletAddress} after valid burn of ${amountBurned}`);

        // 7. Success Response
        return res.status(200).json({
            success: true,
            message: 'Burn verified and unlock authorized',
            data: {
                signature,
                walletAddress,
                amountBurned
            }
        });

    } catch (error) {
        console.error('Verify API Error:', error);
        return res.status(500).json({ error: 'Internal server verification failed', details: error.message });
    }
}
