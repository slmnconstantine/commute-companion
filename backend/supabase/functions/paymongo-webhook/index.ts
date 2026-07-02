import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

Deno.serve(async (req) => {
  // Webhooks are standard POST endpoints, no CORS needed for Paymongo servers usually,
  // but good practice to respond 200 OK early.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)

    // Ensure it's a valid Paymongo webhook event
    if (!payload || !payload.data || !payload.data.attributes) {
      return new Response('Invalid payload', { status: 400 })
    }

    const event = payload.data
    const eventType = event.attributes.type

    // We only care about successful payments from checkout sessions
    if (eventType === 'checkout_session.payment.paid') {
      const checkoutData = event.attributes.data
      const attributes = checkoutData.attributes

      // We expect the frontend to pass the user's ID as the reference_number
      // e.g. "USER_ID"
      const userId = attributes.reference_number
      
      // Amount is in centavos, convert back to PHP
      const amountPaid = (attributes.line_items?.[0]?.amount || 0) / 100

      if (userId && amountPaid > 0) {
        // Initialize Supabase Admin client to bypass Row Level Security
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Missing Supabase environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Get current balance
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('platform_fee_balance')
          .eq('id', userId)
          .single()

        if (profileErr) {
          throw new Error(`Failed to fetch profile: ${profileErr.message}`)
        }

        // 2. Calculate new balance
        const currentBalance = profile.platform_fee_balance || 0
        const newBalance = Math.max(0, currentBalance - amountPaid)

        // 3. Update the balance in the database
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ platform_fee_balance: newBalance })
          .eq('id', userId)

        if (updateErr) {
          throw new Error(`Failed to update balance: ${updateErr.message}`)
        }

        console.log(`[Webhook] Successfully processed payment of PHP ${amountPaid} for user ${userId}. New balance: ${newBalance}`)
      }
    }

    // Always return 200 OK to Paymongo so it doesn't retry
    return new Response('Webhook received', { status: 200 })
  } catch (err: any) {
    console.error('[Webhook Error]:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 500 })
  }
})
