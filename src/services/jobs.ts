import { supabase } from '@/lib/supabase';
import { updateTripStatus } from './trips';

/**
 * Runs self-healing jobs to fix any stuck state in the database.
 * This should be called periodically (e.g., on app launch or via a cron job).
 */
export async function runSelfHealing(): Promise<void> {
  try {
    // 1. Auto-complete trips that have been ongoing for > 24 hours
    const { data: ongoingTrips } = await supabase
      .from('trips')
      .select('id, departure_time')
      .eq('status', 'ongoing');

    if (ongoingTrips) {
      for (const trip of ongoingTrips) {
        const departureTime = new Date(trip.departure_time);
        const diffMs = Date.now() - departureTime.getTime();
        
        if (diffMs >= 24 * 60 * 60 * 1000) {
          console.log(`[Self-Healing] Trip ${trip.id} has been ongoing for >24 hours. Auto-completing...`);
          // Note: updateTripStatus internally handles completing accepted bookings and platform fees
          await updateTripStatus(trip.id, 'completed').catch(err => {
            console.error(`Failed to self-heal trip ${trip.id}:`, err);
          });
        }
      }
    }
  } catch (error) {
    console.error('Self-healing failed:', error);
  }
}
