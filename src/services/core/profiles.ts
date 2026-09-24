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
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'government_id_url' | 'push_token'>>
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select();
    
  if (!error && (!data || data.length === 0)) {
    return { error: new Error('Update failed: 0 rows modified. Check RLS policies.') };
  }
  
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
