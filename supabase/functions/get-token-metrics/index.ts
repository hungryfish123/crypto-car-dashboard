// Supabase Edge Function: get-token-metrics
// Fetches Solana token metrics from Moralis API with 30-second caching
// Endpoints based on official Moralis documentation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CACHE_KEY = 'p_token_metrics'
const CACHE_TTL_SECONDS = 300 // 5 Minutes cache to save API credits

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const moralisKey = Deno.env.get('MORALIS_API_KEY')!

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Step 1: Read cache
        const { data: cacheRow } = await supabase
            .from('system_cache')
            .select('data, last_updated')
            .eq('key', CACHE_KEY)
            .single()

        const now = new Date()
        const lastUpdated = cacheRow?.last_updated ? new Date(cacheRow.last_updated) : null
        const cacheAge = lastUpdated ? (now.getTime() - lastUpdated.getTime()) / 1000 : Infinity

        console.log(`[Metrics] Cache age: ${cacheAge}s`)

        // Step 2: Return cached data if fresh
        if (cacheAge < CACHE_TTL_SECONDS && cacheRow?.data && Object.keys(cacheRow.data).length > 0) {
            console.log('[Metrics] Returning cached data')
            return new Response(JSON.stringify({
                success: true,
                data: cacheRow.data,
                cached: true,
                cacheAge: Math.round(cacheAge)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Step 3: Get CAs from item_mappings
        const { data: mappings } = await supabase
            .from('item_mappings')
            .select('item_id, contract_address')
            .not('contract_address', 'is', null)

        if (!mappings || mappings.length === 0) {
            console.log('[Metrics] No CAs configured')
            return new Response(JSON.stringify({
                success: true,
                data: {},
                message: 'No tokens configured'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Step 4: Fetch fresh data from Moralis
        const tokenMetrics: Record<string, unknown> = {}
        const moralisHeaders = {
            'X-API-Key': moralisKey,
            'Accept': 'application/json'
        }

        for (const mapping of mappings) {
            const ca = mapping.contract_address
            if (!ca) continue

            console.log(`[Metrics] Fetching data for ${mapping.item_id} (${ca})`)

            try {
                // 1. PRICE - GET /token/mainnet/{address}/price
                const priceRes = await fetch(
                    `https://solana-gateway.moralis.io/token/mainnet/${ca}/price`,
                    { headers: moralisHeaders }
                )
                const priceData = priceRes.ok ? await priceRes.json() : null
                console.log(`[Metrics] Price response:`, JSON.stringify(priceData))

                // 2. HOLDERS - GET /token/mainnet/holders/{address}
                const holdersRes = await fetch(
                    `https://solana-gateway.moralis.io/token/mainnet/holders/${ca}`,
                    { headers: moralisHeaders }
                )
                const holdersData = holdersRes.ok ? await holdersRes.json() : null
                console.log(`[Metrics] Holders response:`, JSON.stringify(holdersData))

                // 3. SUPPLY - Use public Solana RPC
                let supplyData = null
                try {
                    const rpcRes = await fetch(
                        'https://api.mainnet-beta.solana.com',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getTokenSupply',
                                params: [ca]
                            })
                        }
                    )
                    if (rpcRes.ok) {
                        supplyData = await rpcRes.json()
                        console.log(`[Metrics] Supply RPC response:`, JSON.stringify(supplyData))
                    } else {
                        console.log(`[Metrics] Supply RPC status: ${rpcRes.status}`)
                    }
                } catch (rpcErr) {
                    console.log(`[Metrics] Supply RPC failed:`, rpcErr)
                }

                // Extract values
                const price = priceData?.usdPrice || 0
                const holderCount = holdersData?.totalHolders || holdersData?.result?.length || 0

                // Supply from RPC response
                const supplyResult = supplyData?.result?.value
                const totalSupply = supplyResult?.uiAmount || 0

                // Calculate market cap
                const marketCap = price * totalSupply

                tokenMetrics[mapping.item_id] = {
                    ca,
                    price,
                    marketCap,
                    holderCount,
                    totalSupply,
                    symbol: priceData?.tokenSymbol || 'UNK',
                    name: priceData?.tokenName || 'Unknown',
                    lastUpdated: now.toISOString()
                }

                console.log(`[Metrics] ${mapping.item_id}: Price=$${price.toFixed(6)}, MC=$${marketCap.toFixed(0)}, Holders=${holderCount}, Supply=${totalSupply}`)

            } catch (err) {
                console.error(`[Metrics] Error for ${ca}:`, err)
                // Keep old cache if available
                if (cacheRow?.data?.[mapping.item_id]) {
                    tokenMetrics[mapping.item_id] = cacheRow.data[mapping.item_id]
                }
            }
        }

        // Step 5: Update cache
        await supabase
            .from('system_cache')
            .upsert({
                key: CACHE_KEY,
                data: tokenMetrics,
                last_updated: now.toISOString()
            }, { onConflict: 'key' })

        // Step 6: Return fresh data
        return new Response(JSON.stringify({
            success: true,
            data: tokenMetrics,
            cached: false,
            fetchedAt: now.toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Metrics] Fatal error:', message)
        return new Response(JSON.stringify({
            success: false,
            error: message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
