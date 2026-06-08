import { supabase } from '@/lib/supabase';
import { Trip, TripWithDriver } from '@/types/database';
import { sendPushNotification } from './pushNotifications';

/** Create a new trip */
export async function createTrip(tripData: Omit<Trip, 'id' | 'created_at'>): Promise<{ data: Trip | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single();
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
  if (error) return null;
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
    if (status === 'completed' || status === 'cancelled') {
      // Cascade status to bookings
      await supabase
        .from('bookings')
        .update({ status: status })
        .eq('trip_id', id)
        .in('status', ['accepted', 'pending']);
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
    .in('status', ['open', 'full', 'ongoing'])
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return (data || []) as TripWithDriver[];
}

/** Get driver's trips */
export async function getDriverTrips(driverId: string): Promise<TripWithDriver[]> {
  return getTrips({ driverId });
}
