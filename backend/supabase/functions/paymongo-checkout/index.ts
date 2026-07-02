import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')
    
    // Check if the key exists, otherwise return a simulated response for testing
    if (!PAYMONGO_SECRET_KEY) {
      console.log('No PAYMONGO_SECRET_KEY found. Returning mock URL.')
      return new Response(
        JSON.stringify({ 
          success: true, 
          checkoutUrl: 'mock://paymongo-sandbox', 
          isMock: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { amount, description, billing, payment_method_types, success_url, cancel_url, reference_number } = body

    if (!amount) {
      throw new Error('Amount is required')
    }

    // Call Paymongo API
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            reference_number: reference_number,
            line_items: [
              {
                currency: 'PHP',
                amount: amount,
                name: 'Commute Companion - Platform Fee Settlement',
                quantity: 1
              }
            ],
            payment_method_types: payment_method_types || ['gcash', 'paymaya', 'card'],
            description: description || 'Commute Companion Payment',
            success_url: success_url || 'commute-companion://payment/success',
            cancel_url: cancel_url || 'commute-companion://payment/cancel',
            billing: billing
          }
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to create checkout session')
    }

    const checkoutUrl = data.data?.attributes?.checkout_url

    if (!checkoutUrl) {
      throw new Error('No checkout URL returned from Paymongo')
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl,
        isMock: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
