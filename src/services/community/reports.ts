import { supabase } from '@/lib/supabase';
import { handleServiceError } from '@/utils/errorHelper';

/** Submit a report about a user */
export async function submitReport(
  reporterId: string,
  reportedUserId: string | null,
  tripId: string | null,
  reason: string,
  details?: string,
  postId?: string | null
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      trip_id: tripId,
      post_id: postId || null,
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

/** Submit a report about a community hub post */
export async function reportHubPost(
  reporterId: string,
  postId: string,
  reason: string,
  details?: string
): Promise<{ error: Error | null; autoRemoved?: boolean; alreadyReported?: boolean }> {
  try {
    // 1. Check if user already reported this post
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('post_id', postId)
      .eq('reporter_id', reporterId)
      .maybeSingle();

    if (existingReport) {
      return { error: null, alreadyReported: true };
    }

    // 2. Insert report
    const { error: insertErr } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: null,
      trip_id: null,
      post_id: postId,
      reason,
      details,
    });

    if (insertErr) throw insertErr;

    // 3. Query all reports for this post to check unique reporter count
    const { data: allReports } = await supabase
      .from('reports')
      .select('reporter_id')
      .eq('post_id', postId);

    const uniqueReporters = new Set((allReports || []).map((r: { reporter_id: string }) => r.reporter_id).filter(Boolean));

    // 4. Auto-remove post if reported by more than 20 unique users
    if (uniqueReporters.size > 20) {
      try {
        await supabase.from('post_comments').delete().eq('post_id', postId);
        await supabase.from('post_likes').delete().eq('post_id', postId);
        await supabase.from('reports').delete().eq('post_id', postId);
        await supabase.from('hub_posts').delete().eq('id', postId);
      } catch (cleanupErr) {
        console.warn('Auto-moderation cleanup note:', cleanupErr);
      }
      return { error: null, autoRemoved: true };
    }

    return { error: null, autoRemoved: false };
  } catch (err) {
    handleServiceError('Failed to submit post report', err);
    return { error: err as Error };
  }
}

