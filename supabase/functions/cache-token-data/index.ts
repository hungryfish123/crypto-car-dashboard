import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Main token CA - this is the "GEAR" token shown on the main page chart
// This is also stored in item_mappings for the first item and can be overridden there
const DEFAULT_TOKEN_ADDRESS = "FgxMYCKfAGw4eNq9fpxHoxjCpnzJZaqyLbnTRQaXpump";
const CACHE_TTL_SECONDS = 20;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const moralisApiKey = Deno.env.get('MORALIS_API_KEY')
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Try to get the main token CA from item_mappings (first item with a CA)
        // This allows the CA to be updated via Admin Panel
        let tokenAddress = DEFAULT_TOKEN_ADDRESS
        const { data: mappings } = await supabase
            .from('item_mappings')
            .select('contract_address')
            .not('contract_address', 'is', null)
            .limit(1)

        if (mappings && mappings.length > 0 && mappings[0].contract_address) {
            tokenAddress = mappings[0].contract_address
            console.log(`Using CA from item_mappings: ${tokenAddress}`)
        } else {
            console.log(`Using default CA: ${tokenAddress}`)
        }

        // Check cache first
        const { data: cached, error: cacheError } = await supabase
            .from('token_cache')
            .select('*')
            .eq('id', 'main')
            .single()

        if (cached && !cacheError) {
            const cacheAge = (Date.now() - new Date(cached.updated_at).getTime()) / 1000

            // If cache is fresh (< 20 seconds), return it immediately
            if (cacheAge < CACHE_TTL_SECONDS) {
                console.log(`Cache hit (${cacheAge.toFixed(1)}s old)`)
                return new Response(JSON.stringify({
                    priceUsd: cached.price_usd,
                    marketCap: cached.market_cap,
                    priceChange24h: cached.price_change_24h,
                    volume24h: cached.volume_24h,
                    symbol: cached.symbol,
                    name: cached.name,
                    updatedAt: cached.updated_at,
                    fromCache: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        // Cache is stale or missing - fetch fresh data from Moralis
        console.log('Fetching fresh data from Moralis...')

        if (!moralisApiKey) {
            throw new Error('MORALIS_API_KEY secret not set')
        }

        const moralisResponse = await fetch(
            `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/price`,
            { headers: { 'X-API-Key': moralisApiKey } }
        )

        if (!moralisResponse.ok) {
            const errorText = await moralisResponse.text()
            console.error(`Moralis API error: ${moralisResponse.status} - ${errorText}`)
            throw new Error(`Moralis API error: ${moralisResponse.status}`)
        }

        const moralisData = await moralisResponse.json()
        console.log('Moralis response:', JSON.stringify(moralisData))

        const tokenData = {
            price_usd: parseFloat(moralisData.usdPrice) || 0,
            market_cap: moralisData.marketCap || 0,
            price_change_24h: moralisData.usdPrice24hrPercentChange || 0,
            volume_24h: 0,
            symbol: moralisData.tokenSymbol || 'GEAR',
            name: moralisData.tokenName || 'Gear Token',
            updated_at: new Date().toISOString()
        }

        console.log('Parsed token data:', JSON.stringify(tokenData))

        // Update cache
        const { error: updateError } = await supabase
            .from('token_cache')
            .upsert({
                id: 'main',
                contract_address: tokenAddress,
                ...tokenData
            })

        if (updateError) {
            console.error('Cache update failed:', updateError)
        } else {
            console.log('Cache updated successfully')
        }

        return new Response(JSON.stringify({
            priceUsd: tokenData.price_usd,
            marketCap: tokenData.market_cap,
            priceChange24h: tokenData.price_change_24h,
            volume24h: tokenData.volume_24h,
            symbol: tokenData.symbol,
            name: tokenData.name,
            updatedAt: tokenData.updated_at,
            fromCache: false
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
