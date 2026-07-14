/**
 * Supabase client for Commutable Companion
 *
 * Uses `@react-native-async-storage/async-storage` for token persistence.
 * This avoids the 2048-byte size limit of expo-secure-store that can corrupt sessions.
 *
 * Environment variables are read from `.env` via Expo's built-in
 * `EXPO_PUBLIC_` prefix convention.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
