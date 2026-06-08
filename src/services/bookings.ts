import { supabase } from '@/lib/supabase';
import { Booking, BookingWithTrip, BookingWithCommuter } from '@/types/database';
import { sendPushNotification } from './pushNotifications';

/** Create a booking request */
export async function createBooking(bookingData: Omit<Booking, 'id' | 'created_at'>): Promise<{ data: Booking | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (data && !error) {
    // Notify the driver
    const { data: tripData } = await supabase.from('trips').select('driver:profiles!driver_id(push_token)').eq('id', bookingData.trip_id).single();
    const pushToken = (tripData?.driver as any)?.push_token;
    if (pushToken) {
      await sendPushNotification(pushToken, 'New Ride Request', 'A commuter has requested to join your ride!', { type: 'booking', bookingId: data.id });
    }
  }

  return { data: data as Booking | null, error: error as Error | null };
}

/** Get bookings for a commuter with trip details */
export async function getCommuterBookings(commuterId: string): Promise<BookingWithTrip[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, trip:trips(*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*)), reviews(*)`)
    .eq('commuter_id', commuterId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const bookings = (data || []) as BookingWithTrip[];

  // Self-healing: if a trip was completed/cancelled but the booking got stuck in pending/accepted
  return bookings.map(b => {
    if (b.trip && (b.trip.status === 'completed' || b.trip.status === 'cancelled')) {
      if (b.status === 'pending' || b.status === 'accepted') {
        const newStatus = b.trip.status === 'cancelled' ? 'rejected' : 'completed';
        // Fire and forget update to fix it in the database
        supabase.from('bookings').update({ status: newStatus }).eq('id', b.id).then();
        // Instantly reflect the correct status in the UI
        b.status = newStatus;
      }
    }
    return b;
  });
}

/** Get bookings for a trip (driver sees who booked) */
export async function getTripBookings(tripId: string): Promise<BookingWithCommuter[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, commuter:profiles!commuter_id(*)`)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as BookingWithCommuter[];
}

/** Update booking status */
export async function updateBookingStatus(id: string, status: string): Promise<void> {
  const { error, data } = await supabase.from('bookings').update({ status }).eq('id', id).select('*, trip:trips(driver_id), commuter:profiles!commuter_id(push_token)').single();
  
  if (!error && data) {
    const pushToken = (data.commuter as any)?.push_token;
    if (pushToken) {
      let title = 'Booking Update';
      let body = `Your booking was updated to ${status}.`;
      if (status === 'accepted') {
        title = 'Ride Confirmed! 🎉';
        body = 'The driver has accepted your booking request.';
      } else if (status === 'rejected') {
        title = 'Ride Declined';
        body = 'The driver declined your booking request.';
      }
      await sendPushNotification(pushToken, title, body, { type: 'booking_update', status });
    }
  }

  if (error) throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
}
