import { handleServiceError } from '@/utils/errorHelper';

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

interface PaymentMethodResponse {
  success: boolean;
  paymentMethodId: string;
  isMock: boolean;
  error?: string;
  data?: any;
}

/**
 * Helper to call Paymongo API endpoints using Basic Auth
 */
async function paymongoFetch(
  endpoint: string,
  method: 'GET' | 'POST',
  attributes: Record<string, any>
): Promise<any> {
  const response = await fetch(`${PAYMONGO_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${base64Encode(PAYMONGO_SECRET_KEY + ':')}`
    },
    body: method === 'POST' ? JSON.stringify({ data: { attributes } }) : undefined
  });

  const json = await response.json();

  if (!response.ok) {
    handleServiceError(`[Paymongo Service] API error at ${endpoint}:`, json);
    const errMsg = json.errors?.[0]?.detail || 'API request failed';
    throw new Error(errMsg);
  }

  return json;
}

/**
 * Generate a Paymongo checkout session url
 * 
 * @param attributes Broad checkout session options (amount, billing, line_items, etc.)
 */
export async function createCheckoutSession(
  attributes: Record<string, any>
): Promise<CheckoutSessionResponse> {
  // If the secret key is empty, automatically use mock simulation mode
  if (!PAYMONGO_SECRET_KEY) {
    console.log('[Paymongo Service] Secret Key missing. Using simulated sandbox mode for checkout session.');
    return {
      success: true,
      checkoutUrl: 'mock://paymongo-sandbox',
      isMock: true
    };
  }

  try {
    const json = await paymongoFetch('/checkout_sessions', 'POST', attributes);
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
    handleServiceError('[Paymongo Service] Exception during checkout session creation:', err);
    return {
      success: false,
      checkoutUrl: '',
      isMock: false,
      error: err.message || 'Network connectivity error'
    };
  }
}

/**
 * Create a Paymongo payment method
 * 
 * @param attributes Broad payment method attributes (type, details, billing, etc.)
 */
export async function createPaymentMethod(
  attributes: Record<string, any>
): Promise<PaymentMethodResponse> {
  // If the secret key is empty, automatically use mock simulation mode
  if (!PAYMONGO_SECRET_KEY) {
    console.log('[Paymongo Service] Secret Key missing. Using simulated sandbox mode for payment method.');
    return {
      success: true,
      paymentMethodId: 'pm_mock_123456789',
      isMock: true
    };
  }

  try {
    const json = await paymongoFetch('/payment_methods', 'POST', attributes);
    const paymentMethodId = json.data?.id;
    if (!paymentMethodId) {
      return {
        success: false,
        paymentMethodId: '',
        isMock: false,
        error: 'No payment method ID returned from server'
      };
    }

    return {
      success: true,
      paymentMethodId,
      isMock: false,
      data: json.data
    };

  } catch (err: any) {
    handleServiceError('[Paymongo Service] Exception during payment method creation:', err);
    return {
      success: false,
      paymentMethodId: '',
      isMock: false,
      error: err.message || 'Network connectivity error'
    };
  }
}
