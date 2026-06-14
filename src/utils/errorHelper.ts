import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

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
    // Trigger signOut to clean up local session storage and redirect user to /welcome
    supabase.auth.signOut().catch((err) => {
      console.warn('Failed to sign out during JWT expiration handle:', err);
    });
    
    if (showToast) {
      Alert.alert('Session Expired', 'Please sign in again.');
    }
  } else {
    // Log other errors as warnings to prevent blocking RedBox developer screens
    console.warn(contextMessage, error);
    if (showToast && error?.message) {
      Alert.alert('Error', error.message);
    } else if (showToast) {
      Alert.alert('Error', contextMessage);
    }
  }
}
