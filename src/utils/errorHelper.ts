import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

/**
 * Converts technical, cryptic, or backend error messages into clear, friendly, and actionable messages.
 */
export function getFriendlyErrorMessage(
  error: any,
  fallbackMessage: string = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallbackMessage;

  // Extract raw message string
  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (error?.message && typeof error.message === 'string') {
    raw = error.message;
  } else if (error?.error_description && typeof error.error_description === 'string') {
    raw = error.error_description;
  } else if (error?.details && typeof error.details === 'string') {
    raw = error.details;
  } else {
    try {
      raw = JSON.stringify(error);
    } catch {
      raw = String(error);
    }
  }

  const lower = raw.toLowerCase();
  const code = (error?.code || '').toString().toUpperCase();

  // 1. Session & Authentication Errors
  if (
    code === 'PGRST303' ||
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt') ||
    lower.includes('token is expired')
  ) {
    return 'Your session has expired. Please sign in again to continue.';
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid credentials')
  ) {
    return 'The email or password you entered is incorrect. Please try again.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('email already in use') ||
    lower.includes('user already exists') ||
    lower.includes('users_email_key') ||
    lower.includes('profiles_email_key')
  ) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (
    lower.includes('email not confirmed') ||
    lower.includes('confirm your email') ||
    lower.includes('email address not verified')
  ) {
    return 'Please verify your email address before signing in. Check your inbox for the verification link.';
  }
  if (
    lower.includes('email link is invalid or has expired') ||
    lower.includes('otp expired') ||
    lower.includes('token has expired')
  ) {
    return 'The verification link or code has expired. Please request a new one.';
  }
  if (
    lower.includes('signup requires a valid password') ||
    lower.includes('password should be at least')
  ) {
    return 'Password must be at least 8 characters with at least one uppercase letter and one number.';
  }

  // 2. Network & Connectivity
  if (
    lower.includes('network request failed') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('request has been canceled') ||
    lower.includes('network error') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('aborterror')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // 3. Database Constraints & PostgREST Errors
  if (
    code === '23505' ||
    lower.includes('duplicate key value') ||
    lower.includes('unique constraint') ||
    lower.includes('unique_violation')
  ) {
    if (lower.includes('username') || lower.includes('profiles_username')) {
      return 'This username is already taken. Please choose a different one.';
    }
    if (lower.includes('email') || lower.includes('profiles_email')) {
      return 'This email is already registered. Please sign in or use another email.';
    }
    if (lower.includes('plate_number') || lower.includes('vehicles_plate_number')) {
      return 'A vehicle with this plate number is already registered.';
    }
    if (lower.includes('route_hash') || lower.includes('routes_user_id_route_hash')) {
      return 'You already have this route saved.';
    }
    return 'This record already exists. Please check your details and try again.';
  }

  if (code === '23503' || lower.includes('violates foreign key constraint')) {
    return 'The requested record is no longer available or has been deleted.';
  }

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('violates row-level security')
  ) {
    return 'You do not have permission to perform this action.';
  }

  if (code === 'PGRST116' || lower.includes('no rows returned') || lower.includes('0 rows')) {
    return 'The requested item was not found. It may have been removed or updated.';
  }

  if (code === '22P02' || lower.includes('invalid input syntax for type uuid')) {
    return 'Invalid data reference. Please try again.';
  }

  // 4. File Upload & Storage Errors
  if (
    lower.includes('payload too large') ||
    lower.includes('entity too large') ||
    lower.includes('413') ||
    lower.includes('file too large')
  ) {
    return 'The selected file is too large. Please upload an image under 5MB.';
  }
  if (lower.includes('bucket not found') || lower.includes('the resource was not found')) {
    return 'Storage is temporarily unavailable. Please try again shortly.';
  }
  if (lower.includes('invalid mime type') || lower.includes('unsupported media type')) {
    return 'Unsupported file format. Please upload a standard JPG or PNG image.';
  }

  // 5. Booking & Ride Specific Errors
  if (lower.includes('not enough available seats') || lower.includes('seats remaining')) {
    return 'Sorry, there are not enough available seats remaining on this ride.';
  }
  if (
    lower.includes('already have an active booking') ||
    lower.includes('already booked') ||
    lower.includes('duplicate booking')
  ) {
    return 'You already have an active booking request for this ride.';
  }
  if (
    lower.includes('active ride exists') ||
    lower.includes('already have an active ride') ||
    lower.includes('ongoing ride')
  ) {
    return 'You already have an ongoing ride. Please complete or cancel it before starting a new one.';
  }
  if (lower.includes('cannot accept') || lower.includes('not open for booking')) {
    return 'This ride is no longer accepting passengers.';
  }

  // 6. Payment & Wallet Errors
  if (lower.includes('paymongo') || lower.includes('payment initialization failed')) {
    return 'Unable to initialize payment. Please check your payment details or try again.';
  }
  if (lower.includes('exceeds current balance') || lower.includes('invalid amount')) {
    return 'The payment amount entered is invalid or exceeds your balance.';
  }

  // 7. Clean up non-technical strings if they are already readable
  if (
    !raw.includes('Error:') &&
    !raw.includes('PostgrestError') &&
    !raw.includes('{') &&
    !raw.includes('}') &&
    !raw.includes('PGRST') &&
    !raw.includes('violates') &&
    !raw.includes('syntax') &&
    !raw.includes('constraint') &&
    !raw.includes('SQLSTATE') &&
    raw.length > 0 &&
    raw.length < 160
  ) {
    const trimmed = raw.trim();
    if (trimmed) {
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      return capitalized.endsWith('.') || capitalized.endsWith('!') || capitalized.endsWith('?')
        ? capitalized
        : `${capitalized}.`;
    }
  }

  return fallbackMessage;
}

/**
 * Centralized error handler for services.
 * Checks for JWT expiration (e.g. PGRST303) and triggers automatic signOut
 * to redirect the user to the welcome/login screen.
 * Otherwise, logs the error as a console warning to prevent blocking LogBox developer screens.
 * If showToast is true, it displays a native Alert.
 */
export function handleServiceError(contextMessage: string, error: any, showToast = false) {
  const isJwtExpired =
    error &&
    (error.code === 'PGRST303' ||
      error.message === 'JWT expired' ||
      (typeof error.message === 'string' && error.message.includes('JWT expired')) ||
      (typeof error === 'object' && JSON.stringify(error).includes('JWT expired')));

  if (isJwtExpired) {
    console.warn(`${contextMessage} (Session Expired):`, error);
    supabase.auth.signOut().catch((err) => {
      console.warn('Failed to sign out during JWT expiration handle:', err);
    });

    if (showToast) {
      Alert.alert('Session Expired', 'Please sign in again to continue.');
    }
  } else {
    console.warn(contextMessage, error);
    if (showToast) {
      const friendlyMsg = getFriendlyErrorMessage(error, contextMessage);
      Alert.alert('Notice', friendlyMsg);
    }
  }
}
