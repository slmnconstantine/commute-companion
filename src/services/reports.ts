import { supabase } from '@/lib/supabase';
import { handleServiceError } from '@/utils/errorHelper';

/** Submit a report about a user */
export async function submitReport(
  reporterId: string,
  reportedUserId: string,
  tripId: string | null,
  reason: string,
  details?: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      trip_id: tripId,
      reason,
      details,
    });
    
    if (error) throw error;
    
    return { error: null };
  } catch (err) {
    handleServiceError('Failed to submit report', err);
    return { error: err as Error };
  }
}
