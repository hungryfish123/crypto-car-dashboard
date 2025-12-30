// Service to fetch real-time token data

const JUPITER_API_KEY = '3f2c0f50-ac78-43ed-80ee-c1256c60fee5';

/**
 * Fetches token data - tries Jupiter first, falls back to DexScreener
 * @param {string} ca - The Solana Contract Address
 * @returns {Promise<Object>} - Token data (price, mc, etc.)
 */
export const fetchTokenData = async (ca) => {
    if (!ca) return null;

    // Try Jupiter first
    try {
        console.log(`[TokenService] Trying Jupiter for ${ca}`);
        const response = await fetch(`https://api.jup.ag/price/v2?ids=${ca}&showExtraInfo=true`, {
            headers: { 'x-api-key': JUPITER_API_KEY }
        });

        if (response.ok) {
            const json = await response.json();
            const data = json.data?.[ca];

            if (data && data.price) {
                console.log(`[TokenService] Jupiter success for ${ca}:`, data.price);
                return {
                    priceUsd: parseFloat(data.price),
                    marketCap: 0,
                    priceChange24h: 0,
                    volume24h: 0,
                    symbol: 'UNK',
                    name: 'Unknown',
                    liquidity: 0,
                    pairUrl: `https://jup.ag/swap/${ca}`
                };
            }
        }
        console.log(`[TokenService] Jupiter failed for ${ca}, trying DexScreener...`);
    } catch (err) {
        console.warn(`[TokenService] Jupiter error for ${ca}:`, err.message);
    }

    // Fallback to DexScreener
    try {
        console.log(`[TokenService] Trying DexScreener for ${ca}`);
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);

        if (!response.ok) {
            throw new Error(`DexScreener API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];
            console.log(`[TokenService] DexScreener success for ${ca}:`, pair.priceUsd);
            return {
                priceUsd: parseFloat(pair.priceUsd),
                marketCap: pair.fdv || 0,
                priceChange24h: pair.priceChange?.h24 || 0,
                volume24h: pair.volume?.h24 || 0,
                symbol: pair.baseToken?.symbol || 'UNK',
                name: pair.baseToken?.name || 'Unknown',
                liquidity: pair.liquidity?.usd || 0,
                pairUrl: pair.url
            };
        }
    } catch (err) {
        console.error(`[TokenService] DexScreener error for ${ca}:`, err.message);
    }

    console.warn(`[TokenService] No price data found for ${ca}`);
    return null;
};

/**
 * Fetches holder count (Mocked for now, requires RPC or specific API key usually)
 * @param {string} ca 
 */
export const fetchHolderCount = async (ca) => {
    // TODO: Implement Helius/Moralis/RPC call here
    // For now, return a random realistic number relative to the "level" if valid CA
    if (!ca) return 0;
    return Math.floor(Math.random() * 5000) + 100;
};
