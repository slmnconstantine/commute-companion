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
