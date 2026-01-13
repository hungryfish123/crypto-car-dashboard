// Supabase Edge Function: cache-token-data
// Batch fetches ALL token prices from Moralis and updates token_cache table
// Designed to be called by a cron job every 20 seconds
// All clients read from token_cache instead of calling Moralis directly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const startTime = Date.now()
    console.log('[CacheTokenData] Starting batch update...')

    try {
        // Initialize clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const moralisKey = Deno.env.get('MORALIS_API_KEY')!

        if (!moralisKey) {
            throw new Error('MORALIS_API_KEY not configured')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Step 1: Get ALL items with contract addresses from item_mappings
        const { data: mappings, error: dbError } = await supabase
            .from('item_mappings')
            .select('item_id, contract_address')
            .not('contract_address', 'is', null)

        if (dbError) {
            throw new Error(`DB error: ${dbError.message}`)
        }

        if (!mappings || mappings.length === 0) {
            console.log('[CacheTokenData] No items with CAs found in item_mappings')
            return new Response(JSON.stringify({
                success: true,
                message: 'No tokens to cache',
                itemsProcessed: 0
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`[CacheTokenData] Found ${mappings.length} items to update`)

        // Step 2: Fetch price data from Moralis for each item
        const moralisHeaders = {
            'X-API-Key': moralisKey,
            'Accept': 'application/json'
        }

        const cacheRows: Array<{
            item_id: string
            contract_address: string
            price_usd: number
            market_cap: number
            price_change_24h: number
            symbol: string
            name: string
            updated_at: string
        }> = []

        const now = new Date().toISOString()

        for (const mapping of mappings) {
            const ca = mapping.contract_address
            if (!ca || ca.length < 32) {
                console.log(`[CacheTokenData] Skipping ${mapping.item_id}: Invalid CA`)
                continue
            }

            try {
                // Fetch price from Moralis
                const priceRes = await fetch(
                    `https://solana-gateway.moralis.io/token/mainnet/${ca}/price`,
                    { headers: moralisHeaders }
                )

                if (!priceRes.ok) {
                    console.log(`[CacheTokenData] ${mapping.item_id}: Moralis returned ${priceRes.status}`)
                    continue
                }

                const priceData = await priceRes.json()
                const price = parseFloat(priceData.usdPrice) || 0
                const priceChange = parseFloat(priceData.usdPricePercentChange24h) || 0

                // Calculate market cap (pump.fun tokens have 1B supply)
                const marketCap = price * 1_000_000_000

                cacheRows.push({
                    item_id: mapping.item_id,
                    contract_address: ca,
                    price_usd: price,
                    market_cap: marketCap,
                    price_change_24h: priceChange,
                    symbol: priceData.tokenSymbol || 'UNK',
                    name: priceData.tokenName || 'Unknown',
                    updated_at: now
                })

                console.log(`[CacheTokenData] ${mapping.item_id}: $${price.toFixed(8)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)`)

            } catch (err) {
                console.error(`[CacheTokenData] Error fetching ${mapping.item_id}:`, err)
            }
        }

        // Step 3: Batch upsert all rows into token_cache
        if (cacheRows.length > 0) {
            const { error: upsertError } = await supabase
                .from('token_cache')
                .upsert(cacheRows, { onConflict: 'item_id' })

            if (upsertError) {
                throw new Error(`Upsert error: ${upsertError.message}`)
            }

            console.log(`[CacheTokenData] Upserted ${cacheRows.length} rows to token_cache`)
        }

        const elapsed = Date.now() - startTime
        console.log(`[CacheTokenData] Completed in ${elapsed}ms`)

        return new Response(JSON.stringify({
            success: true,
            itemsProcessed: cacheRows.length,
            totalItems: mappings.length,
            elapsedMs: elapsed
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[CacheTokenData] Fatal error:', message)
        return new Response(JSON.stringify({
            success: false,
            error: message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
