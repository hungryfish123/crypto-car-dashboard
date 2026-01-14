// Minimal test version of payout-rewards
// Use this to test if the function can even respond

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Just return a test response to verify CORS works
        const { walletAddress } = await req.json()

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Function reached successfully!',
                walletAddress: walletAddress,
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Test] Error:', message)
        return new Response(
            JSON.stringify({ success: false, error: message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
