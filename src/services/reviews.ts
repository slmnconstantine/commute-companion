import { supabase } from '@/lib/supabase';
import { Review, ReviewWithProfiles } from '@/types/database';

/** Submit a review */
export async function submitReview(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('reviews').insert(reviewData);
  return { error: error as Error | null };
}

/** Submit a review and update the driver's average rating in their profile */
export async function submitReviewAndUpdateProfile(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<{ error: Error | null }> {
  try {
    // 1. Insert the review
    const { error: insertError } = await supabase.from('reviews').insert(reviewData);
    if (insertError) throw insertError;

    // 2. Fetch the current profile stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rating_avg, total_ratings')
      .eq('id', reviewData.reviewee_id)
      .single();
    
    if (profileError) throw profileError;

    // 3. Calculate new average
    const currentTotal = profile?.total_ratings || 0;
    const currentAvg = profile?.rating_avg || 0;
    
    const newTotal = currentTotal + 1;
    const newAvg = ((currentAvg * currentTotal) + reviewData.rating) / newTotal;

    // 4. Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        rating_avg: newAvg,
        total_ratings: newTotal
      })
      .eq('id', reviewData.reviewee_id);
      
    if (updateError) throw updateError;

    return { error: null };
  } catch (err) {
    console.error('Failed to submit review and update profile', err);
    return { error: err as Error };
  }
}

/** Get reviews for a user */
export async function getUserReviews(userId: string): Promise<ReviewWithProfiles[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviewer_id(*), reviewee:profiles!reviewee_id(*)`)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ReviewWithProfiles[];
}

/** Check if a review exists for a booking */
export async function hasReviewForBooking(bookingId: string, reviewerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .single();
  return !!data;
}
