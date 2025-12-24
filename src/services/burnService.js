// Frontend service to verify burn transactions
// This calls the serverless API function

/**
 * Verify a burn transaction with the server
 * @param {string} signature - The Solana transaction signature
 * @param {string} userWallet - The user's wallet address
 * @returns {Promise<{success: boolean, amountBurned?: number, error?: string}>}
 */
export async function verifyBurnTransaction(signature, userWallet) {
    try {
        const response = await fetch('/api/verify-burn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                signature,
                userWallet
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Verification failed'
            };
        }

        return {
            success: true,
            amountBurned: data.amountBurned,
            signature: data.signature
        };
    } catch (error) {
        console.error('Error verifying burn:', error);
        return {
            success: false,
            error: 'Network error. Please try again.'
        };
    }
}

/**
 * Calculate rewards based on amount burned
 * @param {number} amountBurned - Amount of tokens burned
 * @returns {number} - In-game currency reward
 */
export function calculateBurnReward(amountBurned) {
    // Example: 1 token = 100 in-game currency
    const BURN_RATE = 100;
    return Math.floor(amountBurned * BURN_RATE);
}

/**
 * Full burn verification flow with reward calculation
 * @param {string} signature - The Solana transaction signature  
 * @param {string} userWallet - The user's wallet address
 * @returns {Promise<{success: boolean, reward?: number, error?: string}>}
 */
export async function claimBurnReward(signature, userWallet) {
    // Step 1: Verify the burn with server
    const verification = await verifyBurnTransaction(signature, userWallet);

    if (!verification.success) {
        return {
            success: false,
            error: verification.error
        };
    }

    // Step 2: Calculate reward
    const reward = calculateBurnReward(verification.amountBurned);

    return {
        success: true,
        reward: reward,
        amountBurned: verification.amountBurned
    };
}
