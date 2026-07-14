import { supabase } from '@/lib/supabase';
import { Trip, TripWithDriver } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { handleServiceError } from '@/utils/errorHelper';
import { generateRouteHash, isJsonLabel } from '@/utils/routeHash';

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

/** Get trips with driver info, filtered */
export async function getTrips(filters?: {
  status?: string;
  driverId?: string;
  limit?: number;
  offset?: number;
}): Promise<TripWithDriver[]> {
  let query = supabase
    .from('trips')
    .select(`*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*), bookings(*, reviews(*))`);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.driverId) query = query.eq('driver_id', filters.driverId);
  query = query.order('departure_time', { ascending: true });
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TripWithDriver[];
}

/** Get single trip by ID */
export async function getTripById(id: string): Promise<TripWithDriver | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`*, driver:profiles!driver_id(*), vehicle:vehicles!vehicle_id(*)`)
    .eq('id', id)
    .single();
    
  if (error || !data) return null;

  return data as TripWithDriver;
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
        title = 'Ride Started! 🚗';
        body = `${driverName} has started the trip. Tap to view live tracking.`;
      } else if (status === 'completed') {
        title = 'Trip Completed! 🏁';
        body = 'You have arrived at your destination. Thank you for riding!';
      } else if (status === 'cancelled') {
        title = 'Trip Cancelled ❌';
        body = `We're sorry, your scheduled ride with ${driverName} was cancelled.`;
      }

      if (title && body) {
        bookingsData.forEach((b: any) => {
          const token = b.commuter?.push_token;
          if (token) {
            sendPushNotification(token, title, body, { type: 'trip_update', tripId: id, status });
          }
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
    .in('status', ['open', 'full', 'ongoing'])
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
      if (token) {
        console.log(`Sending Ride Matched push to ${match.user.full_name} (${token})`);
        await sendPushNotification(
          token,
          'Ride Matched! 🚗',
          `A driver has offered a ride matching your requested route from ${trip.origin_label.split(',')[0]} to ${trip.destination_label.split(',')[0]}.`,
          {
            type: 'ride_matched',
            tripId: trip.id,
            origin: trip.origin_label,
            destination: trip.destination_label,
          }
        );
      }
    }
  } catch (err) {
    handleServiceError('Error in notifyMatchingCommuters:', err);
  }
}

/** Delete a trip and cancel all bookings related to it */
export async function deleteTrip(id: string): Promise<{ error: Error | null }> {
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
      if (token) {
        sendPushNotification(
          token,
          'Trip Cancelled ❌',
          `We're sorry, your scheduled ride with ${driverName} was cancelled and deleted.`,
          { type: 'trip_update', tripId: id, status: 'deleted' }
        );
      }
    });
  }

  // First, delete bookings related to this trip
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('trip_id', id);

  if (bookingsError) {
    handleServiceError('Failed to delete bookings for trip:', bookingsError);
    return { error: bookingsError as unknown as Error };
  }

  // Next, delete the trip itself
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
