// Helper to base64 encode strings in standard browser/React Native environment (pure JS fallback)
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++) & 0xff;
    if (i === str.length) {
      result += chars.charAt(c1 >> 2);
      result += chars.charAt((c1 & 0x3) << 4);
      result += '==';
      break;
    }
    const c2 = str.charCodeAt(i++);
    if (i === str.length) {
      result += chars.charAt(c1 >> 2);
      result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      result += chars.charAt((c2 & 0xf) << 2);
      result += '=';
      break;
    }
    const c3 = str.charCodeAt(i++);
    result += chars.charAt(c1 >> 2);
    result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    result += chars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    result += chars.charAt(c3 & 0x3f);
  }
  return result;
}

/**
 * Paymongo Payment Gateway Service
 * 
 * Supports generating checkout sessions for GCash, Maya, and Cards.
 * Includes a simulated offline fallback for local demo validation.
 */

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Secret key from .env
const PAYMONGO_SECRET_KEY = process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY || '';

interface CheckoutSessionResponse {
  success: boolean;
  checkoutUrl: string;
  isMock: boolean;
  error?: string;
}

/**
 * Generate a Paymongo checkout session url
 * 
 * @param amountInPesos Amount to pay (e.g. 150.00)
 * @param driverName Full name of the paying driver
 * @param driverEmail Optional email address of driver
 */
export async function createCheckoutSession(
  amountInPesos: number,
  driverName: string,
  driverEmail: string = 'driver@commutecompanion.com'
): Promise<CheckoutSessionResponse> {
  
  // If the secret key is empty, automatically use mock simulation mode
  if (!PAYMONGO_SECRET_KEY) {
    console.log('[Paymongo Service] Secret Key missing. Using simulated sandbox mode.');
    return {
      success: true,
      checkoutUrl: 'mock://paymongo-sandbox',
      isMock: true
    };
  }

  try {
    const amountInCentavos = Math.round(amountInPesos * 100);

    const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Encode(PAYMONGO_SECRET_KEY + ':')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: {
              name: driverName,
              email: driverEmail
            },
            line_items: [
              {
                amount: amountInCentavos,
                currency: 'PHP',
                name: 'Commute Companion - Platform Fee Settlement',
                quantity: 1
              }
            ],
            payment_method_types: ['gcash', 'paymaya', 'card'],
            description: `Payment of Platform Fees for driver: ${driverName}`,
            success_url: 'commutecompanion://payment/success',
            cancel_url: 'commutecompanion://payment/cancel'
          }
        }
      })
    });

    const json = await response.json();

    if (!response.ok) {
      console.error('[Paymongo Service] Checkout API returned error:', json);
      const errMsg = json.errors?.[0]?.detail || 'Failed to initialize payment gateway';
      return {
        success: false,
        checkoutUrl: '',
        isMock: false,
        error: errMsg
      };
    }

    const checkoutUrl = json.data?.attributes?.checkout_url;
    if (!checkoutUrl) {
      return {
        success: false,
        checkoutUrl: '',
        isMock: false,
        error: 'No checkout URL returned from payment server'
      };
    }

    return {
      success: true,
      checkoutUrl,
      isMock: false
    };

  } catch (err: any) {
    console.error('[Paymongo Service] Exception during checkout session creation:', err);
    return {
      success: false,
      checkoutUrl: '',
      isMock: false,
      error: err.message || 'Network connectivity error'
    };
  }
}
