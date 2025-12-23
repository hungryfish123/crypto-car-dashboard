import { useState, useEffect } from 'react';

const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjliYjE3YjRhLWU0ZmEtNGM0NS04ODY1LTdmNmQxMzliYTA0MyIsIm9yZ0lkIjoiNDg3MDA0IiwidXNlcklkIjoiNTAxMDQ2IiwidHlwZUlkIjoiNmNjZDhhZTgtZGRjOC00MDViLTlmYmEtZDQzNWZkMWNlOTg5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjYzNTk4MDQsImV4cCI6NDkyMjExOTgwNH0.P0PTMzWWiTfUJVttZ4zuCFgMzGWm8npAkdteNG8nyYY"; // User provided
const TOKEN_ADDRESS = "3jd7Dk9s9DuiRHAbV6Wf3CZQuk9ZiLiP9KNvJEUVpump";

export function useSolanaToken() {
    const [data, setData] = useState({
        price: null,
        marketCap: null,
        holders: [],
        priceChange24h: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchData = async () => {
            const moralisHeaders = {
                "X-API-Key": MORALIS_API_KEY,
                "Accept": "application/json"
            };

            let price = null;
            let marketCap = null;
            let priceChange24h = null;
            let holders = [];
            let errorMsg = null;

            // Source A: DexScreener (Price, FDV, 24h Change)
            try {
                const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`);
                if (dexRes.ok) {
                    const dexData = await dexRes.json();
                    console.log('Dex Data:', dexData); // Debug log as requested

                    if (dexData.pairs && dexData.pairs.length > 0) {
                        const pair = dexData.pairs[0];
                        price = parseFloat(pair.priceUsd);
                        marketCap = pair.fdv; // User standard for Solana MC
                        priceChange24h = pair.priceChange?.h24 || 0;
                    }
                } else {
                    console.error("DexScreener Fetch Failed:", dexRes.status);
                    errorMsg = "Price API Unavailable";
                }
            } catch (e) {
                console.error("DexScreener Error:", e);
                errorMsg = "Price Data Error";
            }

            // Source B: Moralis (Holders Only)
            // Using proxy which we set up previously '/moralis' -> 'https://solana-gateway.moralis.io'
            try {
                const holdersRes = await fetch(
                    `/moralis/token/mainnet/${TOKEN_ADDRESS}/holders`,
                    { headers: moralisHeaders }
                );

                if (holdersRes.ok) {
                    const holdersData = await holdersRes.json();
                    // Map to simple structure: { address: '...', amount: '...' }
                    // User requested slicing first 5
                    holders = Array.isArray(holdersData) ? holdersData.slice(0, 5).map(item => ({
                        address: item.address,
                        amount: item.amount // Usually returned by Moralis holders endpoint
                    })) : [];
                } else {
                    console.error("Moralis Holders Fetch Failed:", holdersRes.status);
                    // Don't set global error if only holders fail, just empty array
                }
            } catch (e) {
                console.error("Moralis Holders Error:", e);
            }

            setData({
                price,
                marketCap,
                holders,
                priceChange24h,
                loading: false,
                error: !price ? (errorMsg || "Data Unavailable") : null
            });
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);

    }, []);

    return data;
}
