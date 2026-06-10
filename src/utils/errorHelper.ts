import { supabase } from '@/lib/supabase';

/**
 * Centralized error handler for services.
 * Checks for JWT expiration (e.g. PGRST303) and triggers automatic signOut
 * to redirect the user to the welcome/login screen.
 * Otherwise, logs the error as a console warning to prevent blocking LogBox developer screens.
 */
export function handleServiceError(contextMessage: string, error: any) {
  const isJwtExpired =
    error &&
    (error.code === 'PGRST303' ||
     error.message === 'JWT expired' ||
     (typeof error.message === 'string' && error.message.includes('JWT expired')) ||
     (typeof error === 'object' && JSON.stringify(error).includes('JWT expired')));

  if (isJwtExpired) {
    console.warn(`${contextMessage} (Session Expired):`, error);
    // Trigger signOut to clean up local session storage and redirect user to /welcome
    supabase.auth.signOut().catch((err) => {
      console.warn('Failed to sign out during JWT expiration handle:', err);
    });
  } else {
    // Log other errors as warnings to prevent blocking RedBox developer screens
    console.warn(contextMessage, error);
  }
}
