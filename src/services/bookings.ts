import { supabase } from '@/lib/supabase';
import { Booking, BookingWithTrip, BookingWithCommuter } from '@/types/database';

/** Create a booking request */
export async function createBooking(bookingData: Omit<Booking, 'id' | 'created_at'>): Promise<{ data: Booking | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();
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
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
}
