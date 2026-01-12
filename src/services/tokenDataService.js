// Service to fetch real-time token data using ONLY Moralis API
// All external API dependencies have been consolidated to Moralis.

/**
 * Fetches token price data using Moralis API
 * @param {string} ca - The Solana Contract Address
 * @returns {Promise<Object>} - Token data (price, mc, etc.)
 */
export const fetchTokenData = async (ca) => {
    if (!ca) return null;

    const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY;

    if (!moralisApiKey) {
        console.error('[TokenService] VITE_MORALIS_API_KEY not set');
        return null;
    }

    try {
        console.log(`[TokenService] Fetching data from Moralis for ${ca}`);
        const response = await fetch(
            `https://solana-gateway.moralis.io/token/mainnet/${ca}/price`,
            { headers: { 'X-API-Key': moralisApiKey } }
        );

        if (response.ok) {
            const data = await response.json();
            if (data && data.usdPrice) {
                console.log(`[TokenService] Moralis success for ${ca}:`, data.usdPrice);
                return {
                    priceUsd: parseFloat(data.usdPrice),
                    marketCap: data.marketCap || 0,
                    priceChange24h: data.usdPrice24hrPercentChange || 0,
                    volume24h: 0,
                    symbol: data.tokenSymbol || 'UNK',
                    name: data.tokenName || 'Unknown',
                    liquidity: 0,
                    pairUrl: null
                };
            }
        }

        console.error(`[TokenService] Moralis API error:`, response.status);
        return null;
    } catch (err) {
        console.error(`[TokenService] Moralis error for ${ca}:`, err.message);
        return null;
    }
};

/**
 * Fetches holder count (mocked - Moralis doesn't provide this for Solana SPL in free tier)
 * @param {string} ca 
 */
export const fetchHolderCount = async (ca) => {
    if (!ca) return 0;
    // Moralis doesn't have a direct holder count endpoint for Solana SPL tokens
    // Return mock value for now
    return Math.floor(Math.random() * 5000) + 100;
};

/**
 * Constructs simple chart data based on 24h price change from Moralis
 * @param {string} ca 
 */
export const fetchTokenChartData = async (ca) => {
    try {
        const tokenData = await fetchTokenData(ca);
        if (!tokenData) return null;

        const currentPrice = tokenData.priceUsd;
        const change24h = tokenData.priceChange24h || 0;
        const pastPrice = currentPrice / (1 + (change24h / 100));

        // Construct 5 simulated data points based on 24h change
        const points = [
            { time: '24h', price: pastPrice },
            { time: '12h', price: pastPrice + (currentPrice - pastPrice) * 0.3 },
            { time: '6h', price: pastPrice + (currentPrice - pastPrice) * 0.6 },
            { time: '1h', price: pastPrice + (currentPrice - pastPrice) * 0.9 },
            { time: 'Now', price: currentPrice }
        ];

        return {
            points,
            isPositive: change24h >= 0,
            percentChange24h: change24h
        };
    } catch (err) {
        console.warn('[TokenService] Chart data error:', err);
        return null;
    }
};
