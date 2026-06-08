import { supabase } from '@/lib/supabase';
import { Review, ReviewWithProfiles } from '@/types/database';
import { sendPushNotification } from './pushNotifications';

/** Helper to notify the reviewee of a new review */
async function notifyReviewee(reviewData: Omit<Review, 'id' | 'created_at'>) {
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', reviewData.reviewee_id)
      .single();
      
    if (profileData?.push_token) {
      const { data: reviewerData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', reviewData.reviewer_id)
        .single();
      const reviewerName = reviewerData?.full_name || 'A user';

      await sendPushNotification(
        profileData.push_token,
        'New Review Received ⭐',
        `${reviewerName} rated you ${reviewData.rating} stars: "${reviewData.comment || ''}"`,
        { type: 'review', bookingId: reviewData.booking_id }
      );
    }
  } catch (e) {
    console.error('Error sending review push notification:', e);
  }
}

/** Submit a review */
export async function submitReview(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('reviews').insert(reviewData);
  if (!error) {
    notifyReviewee(reviewData);
  }
  return { error: error as Error | null };
}

/** Submit a review and update the driver's average rating in their profile */
export async function submitReviewAndUpdateProfile(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<{ error: Error | null }> {
  try {
    // Insert the review. A Postgres trigger will automatically update the profile's average rating.
    const { error: insertError } = await supabase.from('reviews').insert(reviewData);
    if (insertError) throw insertError;
    
    notifyReviewee(reviewData);
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
