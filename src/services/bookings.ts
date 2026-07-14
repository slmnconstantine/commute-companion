import { supabase } from '@/lib/supabase';
import { Booking, BookingWithTrip, BookingWithCommuter } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { updateTripStatus } from './trips';
import { scheduleRideReminder, cancelRideReminder } from './rideReminders';

/** Create a booking request */
export async function createBooking(bookingData: Omit<Booking, 'id' | 'created_at'>): Promise<{ data: Booking | null; error: Error | null }> {
  const { data, error } = await supabase
    .rpc('create_booking_if_available', {
      p_trip_id: bookingData.trip_id,
      p_commuter_id: bookingData.commuter_id,
      p_pickup_lat: bookingData.pickup_lat,
      p_pickup_lng: bookingData.pickup_lng,
      p_dropoff_lat: bookingData.dropoff_lat,
      p_dropoff_lng: bookingData.dropoff_lng,
      p_status: bookingData.status,
      p_fare_paid: bookingData.fare_paid,
      p_platform_fee: bookingData.platform_fee,
      p_seats_booked: bookingData.seats_booked,
      p_driver_confirmed: bookingData.driver_confirmed,
      p_commuter_confirmed: bookingData.commuter_confirmed
    })
    .single();

  const booking = data as any;

  if (booking && !error) {
    // Notify the driver
    const { data: tripData } = await supabase.from('trips').select('driver:profiles!driver_id(id, push_token)').eq('id', bookingData.trip_id).single();
    const pushToken = (tripData?.driver as any)?.push_token;
    if (pushToken) {
      await sendPushNotification(pushToken, 'New Ride Request', 'A commuter has requested to join your ride!', { type: 'booking', bookingId: booking.id }, (tripData?.driver as any)?.id);
    }
  }

  return { data: booking as Booking | null, error: error as Error | null };
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
        supabase.from('bookings').update({ status: newStatus }).eq('id', b.id).then(({ error }) => { if (error) console.error(error); });
        // Instantly reflect the correct status in the UI
        b.status = newStatus as any;
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
      await sendPushNotification(pushToken, title, body, { type: 'booking_update', status }, data.commuter_id);
    }
    if (status === 'accepted') {
      // Schedule ride reminders for the commuter
      try {
        const { data: tripInfo } = await supabase
          .from('trips')
          .select('departure_time, origin_label, driver:profiles!driver_id(full_name)')
          .eq('id', data.trip_id)
          .single();
        if (tripInfo) {
          const driverName = (tripInfo.driver as any)?.full_name || 'your driver';
          scheduleRideReminder(data.trip_id, tripInfo.departure_time, driverName, tripInfo.origin_label || '').catch(console.error);
        }
      } catch (e) {
        console.error('[Reminders] Failed to schedule:', e);
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      cancelRideReminder(data.trip_id).catch(console.error);
    }
  }

  if (error) throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
}

/** Delete a booking */
export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw new Error(`DB Error: ${error.message}`);
}

/** Confirm commuter arrival (Passenger handshake) */
export async function confirmCommuterArrival(bookingId: string): Promise<void> {
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ commuter_confirmed: true })
    .eq('id', bookingId)
    .select('*, commuter:profiles!commuter_id(full_name), trip:trips(driver_id, driver:profiles!driver_id(push_token))')
    .single();

  if (updateError) throw new Error(`Failed to confirm commuter arrival: ${updateError.message}`);

  if (updatedBooking) {
    // If both confirmed, mark booking as completed
    if (updatedBooking.driver_confirmed) {
      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      if (statusError) console.error('Failed to mark booking as completed:', statusError);
      
      // Check if all bookings for this trip are completed to complete the trip
      await checkAndCompleteTrip(updatedBooking.trip_id);
    }

    // Send push notification to the driver
    const driverPushToken = (updatedBooking.trip as any)?.driver?.push_token;
    const passengerName = (updatedBooking.commuter as any)?.full_name || 'A passenger';
    if (driverPushToken) {
      await sendPushNotification(
        driverPushToken,
        'Passenger Arrived! 🏁',
        `${passengerName} has confirmed their arrival at the destination.`,
        { type: 'passenger_arrival', bookingId },
        (updatedBooking.trip as any)?.driver_id
      );
    }
  }
}

/** Confirm driver arrival (Driver handshake) */
export async function confirmDriverArrival(bookingId: string): Promise<void> {
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ driver_confirmed: true })
    .eq('id', bookingId)
    .select('*, commuter:profiles!commuter_id(push_token, full_name), trip:trips(driver_id)')
    .single();

  if (updateError) throw new Error(`Failed to confirm driver arrival: ${updateError.message}`);

  if (updatedBooking) {
    // If both confirmed, mark booking as completed
    if (updatedBooking.commuter_confirmed) {
      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      if (statusError) console.error('Failed to mark booking as completed:', statusError);

      // Check if all bookings for this trip are completed to complete the trip
      await checkAndCompleteTrip(updatedBooking.trip_id);
    }

    // Send push notification to the passenger
    const commuterPushToken = (updatedBooking.commuter as any)?.push_token;
    if (commuterPushToken) {
      await sendPushNotification(
        commuterPushToken,
        'Driver Confirmed Arrival 🚗',
        'Your driver has confirmed arrival at your destination. Tap to confirm.',
        { type: 'driver_arrival', bookingId },
        updatedBooking.commuter_id
      );
    }
  }
}

/** Helper to check if all bookings on a trip are completed and complete the trip */
export async function checkAndCompleteTrip(tripId: string): Promise<void> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('status')
    .eq('trip_id', tripId);

  if (error) {
    console.error('Error checking bookings for completion:', error);
    return;
  }

  // Filter only active bookings (accepted, completed, or dropped_off_early)
  const activeBookings = (bookings || []).filter(b => b.status === 'accepted' || b.status === 'completed' || b.status === 'dropped_off_early');
  
  // If there are bookings and all of them are completed or dropped_off_early, complete the trip
  const allCompleted = activeBookings.length > 0 && activeBookings.every(b => b.status === 'completed' || b.status === 'dropped_off_early');

  if (allCompleted) {
    try {
      await updateTripStatus(tripId, 'completed');
    } catch (err) {
      console.error('Failed to auto-complete trip:', err);
    }
  }
}
