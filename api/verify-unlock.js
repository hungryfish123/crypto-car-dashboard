import { Connection } from '@solana/web3.js';

// Configuration
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const EXPECTED_MINT = '2gD5pj1ztVAUCa7TAhxrZAV4CEaRRfxANGri1JuthwCk';

export default async function handler(req, res) {
    // 1. Method check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { signature, userWallet, amountToBurn } = req.body;

    // 2. Input validation
    if (!signature || !userWallet || amountToBurn === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: signature, userWallet, amountToBurn' });
    }

    try {
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

        // 3. Fetch Parsed Transaction
        const transaction = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!transaction) {
            return res.status(400).json({ error: 'Transaction not found' });
        }

        if (transaction.meta?.err) {
            return res.status(400).json({ error: 'Transaction failed on-chain', details: transaction.meta.err });
        }

        const preBalances = transaction.meta?.preTokenBalances || [];
        const postBalances = transaction.meta?.postTokenBalances || [];

        // 4. Find the user's balance change for the specific mint
        const findBalance = (balances, owner, mint) => {
            const found = balances.find(b => b.owner === owner && b.mint === mint);
            // Use raw amount (string) for precision, convert to number for comparison
            return found ? parseFloat(found.uiTokenAmount.uiAmountString || '0') : 0;
        };

        const preBalance = findBalance(preBalances, userWallet, EXPECTED_MINT);
        const postBalance = findBalance(postBalances, userWallet, EXPECTED_MINT);

        // Calculate how much was burned (pre - post)
        const burnedAmount = preBalance - postBalance;

        console.log(`[Verify] Wallet: ${userWallet}`);
        console.log(`[Verify] Mint: ${EXPECTED_MINT}`);
        console.log(`[Verify] Pre: ${preBalance}, Post: ${postBalance}, Burned: ${burnedAmount}`);
        console.log(`[Verify] Required: ${amountToBurn}`);

        // 5. Verification - Exact match required
        if (burnedAmount !== amountToBurn) {
            return res.status(400).json({
                success: false,
                error: `Burn amount mismatch. Burned: ${burnedAmount}, Required: ${amountToBurn}`
            });
        }

        // 6. Success Response
        return res.status(200).json({
            success: true,
            message: 'Burn verified successfully',
            data: {
                signature,
                userWallet,
                burnedAmount
            }
        });

    } catch (error) {
        console.error('Verify API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
