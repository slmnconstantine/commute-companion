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

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://fkkmxlgpcfjdtmpjgojr.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra214bGdwY2ZqZHRtcGpnb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzcyODAsImV4cCI6MjA5NTk1MzI4MH0.PUVLees9NoMwT6gHnPQI6h7orF_-APXwUDuJnLtVVg4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
