/**
 * Form validation utilities for Commutable Companion
 */

/** Basic email format check. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password strength validator.
 *
 * Rules:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one digit
 */
export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true, message: '' };
}

/** Validates Philippine mobile numbers (+63… or 0…, 10 digits after prefix). */
export function isValidPhoneNumber(phone: string): boolean {
  return /^(\+63|0)\d{10}$/.test(phone.replace(/\s/g, ''));
}

/** Returns `true` if the trimmed string is non-empty. */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Checks if the email domain exists and has valid mail exchanger (MX) records.
 * Uses DNS-over-HTTPS (Google DNS) with zero native dependencies.
 * Bypasses network calls for common known providers and fails open on network timeout.
 */
export async function checkEmailDomainMX(email: string): Promise<{ valid: boolean; message?: string }> {
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[1]) {
    return { valid: false, message: 'Invalid email address' };
  }

  const domain = parts[1].toLowerCase().trim();

  // Fast-path: Common trusted providers need no network call
  const knownProviders = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'zoho.com',
    'yandex.com',
    'mail.com',
    'gmx.com',
  ];
  if (knownProviders.includes(domain)) {
    return { valid: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      // Status 3 is NXDOMAIN (domain does not exist)
      if (data.Status === 3) {
        return { valid: false, message: `The email domain "${domain}" does not exist.` };
      }
      const hasMX = Array.isArray(data.Answer) && data.Answer.some((ans: any) => ans.type === 15);
      if (!hasMX) {
        // Fallback A-record check (RFC 5321 permits mail delivery to A record if no MX is specified)
        const hasA = Array.isArray(data.Answer) && data.Answer.some((ans: any) => ans.type === 1);
        if (!hasA) {
          return { valid: false, message: `The domain "${domain}" cannot receive emails.` };
        }
      }
    }
    return { valid: true };
  } catch {
    // Fail open on network timeout/error so legitimate users are never blocked
    return { valid: true };
  }
}

