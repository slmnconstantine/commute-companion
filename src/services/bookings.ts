import { supabase } from '@/lib/supabase';
import { Booking, BookingWithTrip, BookingWithCommuter } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { updateTripStatus, cancelExpiredTrips } from './trips';
import { scheduleRideReminder, cancelRideReminder } from './rideReminders';
import { isOlderThan24Hours } from '@/utils/dateFormatter';

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
    // If reservation details were provided, persist them
    if (bookingData.is_reservation) {
      await supabase
        .from('bookings')
        .update({
          is_reservation: true,
          reservation_fee: bookingData.reservation_fee || 0,
          payment_proof_url: bookingData.payment_proof_url || null,
          payment_status: bookingData.payment_status || 'submitted',
        })
        .eq('id', booking.id);
    }

    // Notify the driver
    const { data: tripData } = await supabase
      .from('trips')
      .select('driver_id, driver:profiles!driver_id(id, push_token)')
      .eq('id', bookingData.trip_id)
      .single();
    const driverId = tripData?.driver_id || (tripData?.driver as any)?.id;
    const pushToken = (tripData?.driver as any)?.push_token;
    if (driverId) {
      const notifTitle = bookingData.is_reservation ? 'Seat Reservation Request' : 'New Ride Request';
      const notifBody = bookingData.is_reservation
        ? 'A commuter submitted a seat reservation with a GCash receipt!'
        : 'A commuter has requested to join your ride!';
      await sendPushNotification(
        pushToken,
        notifTitle,
        notifBody,
        { type: 'booking', bookingId: booking.id, tripId: bookingData.trip_id, is_reservation: bookingData.is_reservation },
        driverId
      );
    }
  }

  return { data: booking as Booking | null, error: error as Error | null };
}

/** Get bookings for a commuter with trip details */
export async function getCommuterBookings(commuterId: string): Promise<BookingWithTrip[]> {
  // Trigger auto-cancellation of expired trips in background
  cancelExpiredTrips().catch(err => {
    console.error('Background cancelExpiredTrips failed in getCommuterBookings:', err);
  });

  const { data, error } = await supabase
    .from('bookings')
    .select(`*, trip:trips(*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*)), reviews(*)`)
    .eq('commuter_id', commuterId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const bookings = (data || []) as BookingWithTrip[];

  // Self-healing: if a trip was completed/cancelled or is an expired open ride, fix stuck bookings
  return bookings.map(b => {
    const isTripExpiredOpen = b.trip && ['open', 'full'].includes(b.trip.status) && isOlderThan24Hours(b.trip.departure_time);

    if (b.trip && isTripExpiredOpen) {
      b.trip.status = 'cancelled';
      supabase.from('trips').update({ status: 'cancelled' }).eq('id', b.trip.id).then(({ error: e }) => {
        if (e) console.error('Error auto-cancelling trip in getCommuterBookings:', e);
      });
    }

    if (b.trip && (b.trip.status === 'completed' || b.trip.status === 'cancelled' || isTripExpiredOpen)) {
      if (b.status === 'pending' || b.status === 'accepted') {
        const newStatus = (b.trip.status === 'cancelled' || isTripExpiredOpen) ? 'cancelled' : 'completed';
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
export async function updateBookingStatus(
  id: string,
  status: string,
  additionalUpdates?: Record<string, any>
): Promise<void> {
  const updatePayload: Record<string, any> = { status, ...(additionalUpdates || {}) };

  const { error, data } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', id)
    .neq('status', status)
    .select('*, trip:trips(driver_id), commuter:profiles!commuter_id(push_token)')
    .maybeSingle();
  
  if (error) throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
  if (!data) return; // Already in this status, idempotently skip duplicate push notifications

  const commuterId = data.commuter_id;
  const pushToken = (data.commuter as any)?.push_token;
  if (commuterId) {
    let title = 'Booking Update';
    let body = `Your booking was updated to ${status}.`;
    if (status === 'accepted') {
      if (data.is_reservation) {
        title = 'Seat Reservation Confirmed!';
        body = 'The driver verified your GCash deposit and confirmed your seat reservation.';
      } else {
        title = 'Ride Confirmed!';
        body = 'The driver has accepted your booking request.';
      }
    } else if (status === 'rejected') {
      title = 'Ride Declined';
      body = 'The driver declined your booking request.';
    }
    await sendPushNotification(pushToken, title, body, { type: 'booking_update', status, bookingId: id, tripId: data.trip_id }, commuterId);
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
    .eq('commuter_confirmed', false)
    .select('*, commuter:profiles!commuter_id(full_name), trip:trips(driver_id, driver:profiles!driver_id(push_token))')
    .maybeSingle();

  if (updateError) throw new Error(`Failed to confirm commuter arrival: ${updateError.message}`);
  if (!updatedBooking) return; // Already confirmed or duplicate call

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

  // Send notification to the driver
  const driverId = (updatedBooking.trip as any)?.driver_id;
  const driverPushToken = (updatedBooking.trip as any)?.driver?.push_token;
  const passengerName = (updatedBooking.commuter as any)?.full_name || 'A passenger';
  if (driverId) {
    await sendPushNotification(
      driverPushToken,
      'Passenger Arrived! 🏁',
      `${passengerName} has confirmed their arrival at the destination.`,
      { type: 'passenger_arrival', bookingId },
      driverId
    );
  }
}

/** Confirm driver arrival (Driver handshake) */
export async function confirmDriverArrival(bookingId: string): Promise<void> {
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ driver_confirmed: true })
    .eq('id', bookingId)
    .eq('driver_confirmed', false)
    .select('*, commuter:profiles!commuter_id(push_token, full_name), trip:trips(driver_id)')
    .maybeSingle();

  if (updateError) throw new Error(`Failed to confirm driver arrival: ${updateError.message}`);
  if (!updatedBooking) return; // Already confirmed or duplicate call

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

  // Send notification to the passenger
  const commuterId = updatedBooking.commuter_id;
  const commuterPushToken = (updatedBooking.commuter as any)?.push_token;
  if (commuterId) {
    await sendPushNotification(
      commuterPushToken,
      'Driver Confirmed Arrival 🚗',
      'Your driver has confirmed arrival at your destination. Tap to confirm.',
      { type: 'driver_arrival', bookingId },
      commuterId
    );
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
