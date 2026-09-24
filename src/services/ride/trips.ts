import { supabase } from '@/lib/supabase';
import { Trip, TripWithDriver } from '@/types/database';
import { sendPushNotification } from '@/services/communication/pushNotifications';
import { handleServiceError } from '@/utils/errorHelper';
import { generateRouteHash, isJsonLabel } from '@/utils/routeHash';
import { getChatRoom } from '@/services/communication/chatRooms';
import { sendMessage } from '@/services/communication/messages';
import { cancelRideReminder } from './rideReminders';
import { isOlderThan24Hours } from '@/utils/dateFormatter';
import { purgeTripLiveCaptures } from '@/services/verification/liveFaceVerification';

/** Create a new trip */
export async function createTrip(tripData: Omit<Trip, 'id' | 'created_at'>): Promise<{ data: Trip | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single();
    
  if (!error && data) {
    notifyMatchingCommuters(data as Trip).catch(err => {
      handleServiceError('Error notifying matching commuters:', err);
    });
  }
  return { data: data as Trip | null, error: error as Error | null };
}

/**
 * Automatically cancels open/full rides that are 1 day (24 hours) past their departure time.
 * Also marks any pending or accepted bookings on those rides as cancelled.
 */
export async function cancelExpiredTrips(): Promise<number> {
  try {
    // Attempt via RPC first (runs with SECURITY DEFINER so any user can cancel expired rides atomically)
    const { data: rpcTripIds, error: rpcError } = await supabase.rpc('cancel_expired_trips');
    if (!rpcError && Array.isArray(rpcTripIds)) {
      for (const tripId of rpcTripIds) {
        cancelRideReminder(tripId).catch(() => {});
      }
      return rpcTripIds.length;
    }

    // Fallback to client-side queries if RPC is not available
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Find all trips that are 'open' or 'full' with departure_time < oneDayAgo
    const { data: expiredTrips, error: fetchError } = await supabase
      .from('trips')
      .select('id')
      .in('status', ['open', 'full'])
      .lt('departure_time', oneDayAgo);

    if (fetchError) {
      console.error('Error fetching expired trips in cancelExpiredTrips:', fetchError);
      return 0;
    }

    if (!expiredTrips || expiredTrips.length === 0) {
      return 0;
    }

    const tripIds = expiredTrips.map((t) => t.id);

    // 2. Update these trips to 'cancelled'
    const { error: updateTripError } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .in('id', tripIds);

    if (updateTripError) {
      console.error('Error updating expired trips to cancelled:', updateTripError);
    }

    // 3. Update all pending / accepted bookings for these trips to 'cancelled'
    const { error: updateBookingsError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('trip_id', tripIds)
      .in('status', ['pending', 'accepted']);

    if (updateBookingsError) {
      console.error('Error cancelling bookings for expired trips:', updateBookingsError);
    }

    // 4. Cancel any ride reminders for these trips
    for (const tripId of tripIds) {
      cancelRideReminder(tripId).catch(() => {});
    }

    return tripIds.length;
  } catch (err) {
    console.error('Unexpected error in cancelExpiredTrips:', err);
    return 0;
  }
}

export interface GetTripsFilters {
  status?: string;
  statuses?: string[];
  driverId?: string;
  limit?: number;
  offset?: number;
  upcomingOnly?: boolean;
}

/** Get trips with driver info, filtered */
export async function getTrips(filters?: GetTripsFilters): Promise<TripWithDriver[]> {
  // Trigger background auto-cancellation of expired open rides
  cancelExpiredTrips().catch((err) => {
    console.error('Background cancelExpiredTrips failed in getTrips:', err);
  });

  let query = supabase
    .from('trips')
    .select(`*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*), bookings(*, reviews(*))`);

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  } else if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.upcomingOnly) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('departure_time', oneDayAgo);
  }

  if (filters?.driverId) query = query.eq('driver_id', filters.driverId);
  query = query.order('departure_time', { ascending: true });
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;

  let trips = (data || []) as TripWithDriver[];

  // Self-heal: mark in-memory trips as cancelled if they are open/full and >24h past departure
  trips = trips.map((t) => {
    if (['open', 'full'].includes(t.status) && isOlderThan24Hours(t.departure_time)) {
      return { ...t, status: 'cancelled' };
    }
    return t;
  });

  // If filtered specifically by status (e.g. 'open'), filter out the newly auto-cancelled ones
  if (filters?.status) {
    trips = trips.filter((t) => t.status === filters.status);
  }

  return trips;
}

/** Get single trip by ID */
export async function getTripById(id: string): Promise<TripWithDriver | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*)`)
    .eq('id', id)
    .single();
    
  if (error || !data) return null;

  const trip = data as TripWithDriver;

  // Self-heal if this trip was open/full but is 1 day past departure
  if (['open', 'full'].includes(trip.status) && isOlderThan24Hours(trip.departure_time)) {
    trip.status = 'cancelled';
    supabase.from('trips').update({ status: 'cancelled' }).eq('id', id).then(({ error: e }) => {
      if (e) console.error('Error auto-cancelling expired trip in getTripById:', e);
    });
    supabase.from('bookings').update({ status: 'cancelled' }).eq('trip_id', id).in('status', ['pending', 'accepted']).then(({ error: e }) => {
      if (e) console.error('Error auto-cancelling bookings in getTripById:', e);
    });
  }

  return trip;
}


/** Update trip status */
export async function updateTripStatus(id: string, status: string): Promise<{ error: Error | null }> {
  // Fetch accepted/pending bookings before status changes to know who to notify
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('commuter_id, commuter:profiles!commuter_id(push_token)')
    .eq('trip_id', id)
    .in('status', status === 'cancelled' ? ['accepted', 'pending'] : ['accepted']);

  const { error } = await supabase.from('trips').update({ status }).eq('id', id);
  
  if (!error) {
    if (status === 'completed') {
      try {
        // Send automated system alert to chat room about 24h grace window for lost items
        const room = await getChatRoom(id);
        if (room) {
          const { data: trip } = await supabase.from('trips').select('driver_id').eq('id', id).single();
          if (trip?.driver_id) {
            await sendMessage(
              room.id,
              trip.driver_id,
              'Ride Completed! This group chat will remain open for 24 hours in case any passenger has concerns or left an item behind.',
              true
            );
          }
        }

        // Fetch accepted/completed bookings for this trip to sum their platform fees
        const { data: bookings } = await supabase
          .from('bookings')
          .select('platform_fee')
          .eq('trip_id', id)
          .in('status', ['accepted', 'completed']);

        const totalFee = (bookings || []).reduce((sum, b) => sum + (b.platform_fee || 0), 0);

        if (totalFee > 0) {
          // Fetch the driver ID from the trip
          const { data: trip } = await supabase
            .from('trips')
            .select('driver_id')
            .eq('id', id)
            .single();

          if (trip?.driver_id) {
            // Call the RPC to atomically increment the balance
            await supabase.rpc('increment_platform_fee', {
              driver_uuid: trip.driver_id,
              amount: totalFee
            });
          }
        }
      } catch (feeError) {
        handleServiceError('Failed to accumulate platform fee:', feeError);
      }
    }

    if (status === 'completed' || status === 'cancelled') {
      // Cancel pending bookings
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('trip_id', id)
        .in('status', ['pending']);

      // Cascade status to accepted bookings
      await supabase
        .from('bookings')
        .update({ status: status })
        .eq('trip_id', id)
        .in('status', ['accepted']);
    }

    // Send push notifications to passengers
    if (bookingsData && bookingsData.length > 0) {
      // Fetch driver name to personalize the notification
      const { data: tripData } = await supabase
        .from('trips')
        .select('driver:profiles!driver_id(full_name)')
        .eq('id', id)
        .single();
      const driverName = (tripData?.driver as any)?.full_name || 'Your driver';

      let title = '';
      let body = '';
      if (status === 'ongoing') {
        title = 'Ride Started!';
        body = `${driverName} has started the trip. Tap to view live tracking.`;
      } else if (status === 'completed') {
        title = 'Trip Completed!';
        body = 'You have arrived at your destination. Thank you for riding!';
      } else if (status === 'cancelled') {
        title = 'Trip Cancelled';
        body = `We're sorry, your scheduled ride with ${driverName} was cancelled.`;
      }

      if (title && body) {
        bookingsData.forEach((b: any) => {
          const token = b.commuter?.push_token;
          sendPushNotification(token, title, body, { type: 'trip_update', tripId: id, status }, b.commuter_id);
        });
      }
    }
  }
  
  return { error: error as Error | null };
}

/** Search nearby trips based on origin proximity */
export async function searchNearbyTrips(
  lat: number, lng: number, radiusKm: number = 5
): Promise<TripWithDriver[]> {
  // Use a bounding box approach since we don't have PostGIS RPC
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      driver:profiles!driver_id (*),
      vehicle:vehicles!vehicle_id (*)
    `)
    .gte('origin_lat', lat - latDelta)
    .lte('origin_lat', lat + latDelta)
    .gte('origin_lng', lng - lngDelta)
    .lte('origin_lng', lng + lngDelta)
    .gte('departure_time', new Date().toISOString())
    .in('status', ['open', 'full'])
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return (data || []) as TripWithDriver[];
}

/** Get driver's trips */
export async function getDriverTrips(driverId: string): Promise<TripWithDriver[]> {
  return getTrips({ driverId });
}

/** Find and notify commuters whose ride requests match the route of the newly created trip */
export async function notifyMatchingCommuters(trip: Trip): Promise<void> {
  try {
    const routeHash = generateRouteHash(
      trip.origin_lat,
      trip.origin_lng,
      trip.destination_lat,
      trip.destination_lng
    );

    // Query active routes matching this route hash
    const { data: routes, error } = await supabase
      .from('routes')
      .select('*, user:profiles!routes_user_id_fkey(*)')
      .eq('route_hash', routeHash)
      .eq('is_active', true);

    if (error || !routes) {
      handleServiceError('Failed to query matching commuter requests:', error);
      return;
    }

    // Filter to ensure it belongs to a commuter and has a JSON request label
    const matches = routes.filter((r: any) => {
      const isCommuter = r.user?.role === 'commuter';
      if (!isCommuter) return false;
      return isJsonLabel(r.label);
    });

    console.log(`Found ${matches.length} matching commuter requests for route ${routeHash}`);

    // Send push notification to each matching commuter
    for (const match of matches) {
      const token = match.user?.push_token;
      console.log(`Sending Ride Matched notification to ${match.user?.full_name || 'commuter'} (${token || 'no push token'})`);
      await sendPushNotification(
        token,
        'Ride Matched!',
        `A driver has offered a ride matching your requested route from ${trip.origin_label.split(',')[0]} to ${trip.destination_label.split(',')[0]}.`,
        {
          type: 'ride_matched',
          tripId: trip.id,
          origin: trip.origin_label,
          destination: trip.destination_label,
        },
        match.user_id
      );
    }
  } catch (err) {
    handleServiceError('Error in notifyMatchingCommuters:', err);
  }
}

/** Delete a trip and cancel all bookings related to it */
export async function deleteTrip(id: string): Promise<{ error: Error | null }> {
  // Cancel any scheduled local ride reminders for this trip
  await cancelRideReminder(id).catch(err => {
    console.error('Error cancelling ride reminders on deleteTrip:', err);
  });

  // Purge any live face verification captures
  purgeTripLiveCaptures(id).catch(() => {});

  // Fetch accepted/pending bookings before deletion to notify commuters
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('commuter_id, commuter:profiles!commuter_id(push_token)')
    .eq('trip_id', id)
    .in('status', ['accepted', 'pending']);

  if (bookingsData && bookingsData.length > 0) {
    const { data: tripData } = await supabase
      .from('trips')
      .select('driver:profiles!driver_id(full_name)')
      .eq('id', id)
      .single();
    const driverName = (tripData?.driver as any)?.full_name || 'Your driver';
    
    bookingsData.forEach((b: any) => {
      const token = b.commuter?.push_token;
      sendPushNotification(
        token,
        'Trip Cancelled',
        `We're sorry, your scheduled ride with ${driverName} was cancelled and deleted.`,
        { type: 'trip_update', tripId: id, status: 'deleted' },
        b.commuter_id
      );
    });
  }

  // Delete chat room, members, and messages for this trip
  try {
    const room = await getChatRoom(id);
    if (room) {
      await supabase.from('messages').delete().eq('chat_room_id', room.id);
      await supabase.from('chat_members').delete().eq('chat_room_id', room.id);
      await supabase.from('chat_rooms').delete().eq('id', room.id);
    }
  } catch (chatErr) {
    console.error('Error cleaning up chat data on deleteTrip:', chatErr);
  }

  // Delete bookings related to this trip
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('trip_id', id);

  if (bookingsError) {
    console.warn('Note deleting bookings for trip:', bookingsError);
  }

  // Delete the trip itself
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    handleServiceError('Failed to delete trip:', error);
  }

  return { error: error as unknown as Error };
}

/** Check if driver currently has an ongoing trip */
export async function hasActiveTrip(driverId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .eq('status', 'ongoing');

  if (error) {
    handleServiceError('Failed to check active trips:', error);
    return false;
  }

  return (count || 0) > 0;
}
