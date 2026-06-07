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
    // Insert the review. A Postgres trigger will automatically update the profile's average rating.
    const { error: insertError } = await supabase.from('reviews').insert(reviewData);
    if (insertError) throw insertError;
    
    return { error: null };
  } catch (err) {
    console.error('Failed to submit review', err);
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
