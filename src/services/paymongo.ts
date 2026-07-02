import { supabase } from '@/lib/supabase';
import { handleServiceError } from '@/utils/errorHelper';

/**
 * Paymongo Payment Gateway Service
 * 
 * Securely calls Supabase Edge Functions to generate checkout sessions.
 * Never stores or uses Paymongo secret keys on the frontend.
 */

interface CheckoutSessionResponse {
  success: boolean;
  checkoutUrl: string;
  isMock: boolean;
  error?: string;
}

/**
 * Generate a Paymongo checkout session url via Edge Function
 * 
 * @param attributes Broad checkout session options (amount, billing, etc.)
 */
export async function createCheckoutSession(
  attributes: Record<string, any>
): Promise<CheckoutSessionResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('paymongo-checkout', {
      body: attributes
    });

    if (error) {
      throw error;
    }

    if (!data?.success) {
      return {
        success: false,
        checkoutUrl: '',
        isMock: false,
        error: data?.error || 'Failed to retrieve checkout URL'
      };
    }

    // This catches the mock fallback if the developer hasn't set the PAYMONGO_SECRET_KEY in Edge Functions
    if (data.isMock) {
      console.log('[Paymongo Service] Edge function running in simulated sandbox mode.');
      return {
        success: true,
        checkoutUrl: data.checkoutUrl,
        isMock: true
      };
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      isMock: false
    };

  } catch (err: any) {
    handleServiceError('[Paymongo Service] Exception during checkout session creation:', err);
    return {
      success: false,
      checkoutUrl: '',
      isMock: false,
      error: err.message || 'Network connectivity error with Edge Function'
    };
  }
}
