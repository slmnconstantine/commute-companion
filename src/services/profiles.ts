import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

/** Get a user's profile */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

/** Update profile fields */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'government_id_url'>>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { error: error as Error | null };
}

/** Update verification status */
export async function updateVerification(
  userId: string,
  isVerified: boolean,
  governmentIdUrl?: string
): Promise<{ error: Error | null }> {
  const updates: any = { is_verified: isVerified };
  if (governmentIdUrl) updates.government_id_url = governmentIdUrl;
  if (isVerified) updates.verified_badge = true;
  
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  return { error: error as Error | null };
}
