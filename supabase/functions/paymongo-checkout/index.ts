import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const attributes = await req.json();
    const secretKey = Deno.env.get('PAYMONGO_SECRET_KEY');

    if (!secretKey) {
      console.warn('PAYMONGO_SECRET_KEY not set, using mock fallback');
      return new Response(
        JSON.stringify({ success: true, isMock: true, checkoutUrl: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the payload for PayMongo
    const payload = {
      data: {
        attributes: {
          billing: attributes.billing,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          cancel_url: attributes.cancel_url || 'commute-companion://payment/cancel',
          description: attributes.description,
          line_items: attributes.line_items,
          payment_method_types: ['qrph', 'gcash', 'paymaya', 'card'],
          reference_number: attributes.reference_number,
          success_url: attributes.success_url || 'commute-companion://payment/success',
        }
      }
    };

    const basicAuth = btoa(`${secretKey}:`);

    const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Paymongo error:', data);
      throw new Error(data.errors?.[0]?.detail || 'Failed to create checkout session');
    }

    const checkoutUrl = data.data?.attributes?.checkout_url;

    if (!checkoutUrl) {
      throw new Error('No checkout URL returned from Paymongo');
    }

    return new Response(
      JSON.stringify({ success: true, isMock: false, checkoutUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in paymongo-checkout function:', error);
    return new Response(
      JSON.stringify({ success: false, isMock: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
