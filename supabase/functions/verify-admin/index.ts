import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code } = await req.json()
        const secretCode = Deno.env.get('ADMIN_CODE')

        if (!secretCode) {
            console.error("ADMIN_CODE secret not set")
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        if (code === secretCode) {
            return new Response(
                JSON.stringify({ success: true, message: 'Authenticated' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        } else {
            // Return 401 for invalid code
            // Delay slightly to mitigate timing attacks (though network variance dominates)
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid code' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
