/**
 * Supabase client for Commutable Companion
 *
 * Uses `expo-secure-store` for secure, encrypted token persistence
 * and `react-native-url-polyfill` to patch the URL global for RN.
 *
 * Environment variables are read from `.env` via Expo's built-in
 * `EXPO_PUBLIC_` prefix convention.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Adapter that bridges Supabase's auth storage interface
 * to Expo Secure Store (encrypted on-device keychain).
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
