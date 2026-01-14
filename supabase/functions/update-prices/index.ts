// ===========================================
// UPDATE-PRICES Edge Function (DEBUG VERSION)
// Returns detailed logs to client to diagnose failure
// ===========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
    // CORS headers - required for browser requests
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const logs: string[] = []
    function log(msg: string) {
        console.log(msg)
        logs.push(msg)
    }

    const headers = corsHeaders
    log('[Start] Function invoked')

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const moralisKey = Deno.env.get('MORALIS_API_KEY')!

        if (!moralisKey) {
            log('[Error] MORALIS_API_KEY is missing/empty')
            return new Response(JSON.stringify({ success: false, logs }), { headers })
        }
        log('[Config] Keys found')

        // Use Service Role to bypass RLS
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        })

        // 1. Get Items
        log('[DB] Fetching item_mappings...')
        const { data: items, error: dbError } = await supabase
            .from('item_mappings')
            .select('item_id, contract_address')

        if (dbError) {
            log(`[Error] DB Select failed: ${dbError.message}`)
            return new Response(JSON.stringify({ success: false, logs }), { headers })
        }

        if (!items || items.length === 0) {
            log('[Warning] item_mappings table is EMPTY')
            return new Response(JSON.stringify({ success: true, count: 0, logs }), { headers })
        }

        const validItems = items.filter(i => i.contract_address && i.contract_address.length > 30)
        log(`[DB] Found ${items.length} total rows. ${validItems.length} have valid CAs.`)

        if (validItems.length === 0) {
            log('[Warning] No valid CAs found. Check database.')
            return new Response(JSON.stringify({ success: true, count: 0, logs }), { headers })
        }

        // 2. Fetch from Moralis (Limit to first 3 for debug speed if many)
        log('[Moralis] Fetching prices...')
        const updates: any[] = []

        for (const item of validItems) {
            try {
                const url = `https://solana-gateway.moralis.io/token/mainnet/${item.contract_address}/price`
                const res = await fetch(url, {
                    headers: { 'X-API-Key': moralisKey, 'Accept': 'application/json' }
                })

                if (!res.ok) {
                    const txt = await res.text()
                    log(`[Moralis Error] ${item.item_id}: ${res.status} - ${txt.substring(0, 50)}...`)
                    continue
                }

                const data = await res.json()
                const price = parseFloat(data.usdPrice) || 0
                log(`[Success] ${item.item_id}: $${price}`)

                updates.push({
                    item_id: item.item_id,
                    contract_address: item.contract_address,
                    price_usd: price,
                    market_cap: price * 1_000_000_000,
                    updated_at: new Date().toISOString()
                })
            } catch (err) {
                log(`[Fetch Error] ${item.item_id}: ${err.message}`)
            }
        }

        // 3. Upsert
        if (updates.length > 0) {
            log(`[DB] Upserting ${updates.length} prices...`)
            const { error: upsertError } = await supabase
                .from('token_prices')
                .upsert(updates, { onConflict: 'item_id' })

            if (upsertError) {
                log(`[Error] Upsert failed: ${upsertError.message}`)
            } else {
                log('[DB] Write successful!')
            }
        } else {
            log('[Warning] No successful price fetches to save.')
        }

        return new Response(JSON.stringify({
            success: true,
            prices: updates, // <--- RETURNING DATA DIRECTLY
            logs
        }), { headers })

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        log(`[Fatal Error] ${msg}`)
        return new Response(JSON.stringify({ success: false, error: msg, logs }), { status: 500, headers })
    }
})
