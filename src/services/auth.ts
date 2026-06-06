import { supabase } from '@/lib/supabase';

/** Send password reset email */
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error as Error | null };
}

/** Resend verification email */
export async function resendVerificationEmail(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error as Error | null };
}

/** Update password */
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error as Error | null };
}
