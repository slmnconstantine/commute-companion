import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type LocationPayload = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

let activeChannel: RealtimeChannel | null = null;

export const startBroadcastingLocation = (
  tripId: string,
  driverId: string,
  location: LocationPayload
) => {
  if (!activeChannel) {
    activeChannel = supabase.channel(`trip-${tripId}`, {
      config: {
        broadcast: { ack: false },
      },
    });

    activeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Tracking] Started broadcasting for trip ${tripId}`);
      }
    });
  }

  activeChannel.send({
    type: 'broadcast',
    event: 'location-update',
    payload: {
      driverId,
      ...location,
    },
  });
};

export const stopBroadcastingLocation = () => {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    console.log('[Tracking] Stopped broadcasting');
  }
};

export const subscribeToDriverLocation = (
  tripId: string,
  onLocationUpdate: (location: LocationPayload) => void
) => {
  const channel = supabase.channel(`trip-${tripId}`);

  channel
    .on('broadcast', { event: 'location-update' }, (payload) => {
      onLocationUpdate(payload.payload as LocationPayload);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Tracking] Subscribed to trip ${tripId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
    console.log(`[Tracking] Unsubscribed from trip ${tripId}`);
  };
};

export type RouteLocationPayload = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'driver' | 'commuter';
  latitude: number;
  longitude: number;
  timestamp: number;
};

/** Broadcast active user coordinates to route community channel */
export const broadcastRouteLocation = (
  channel: RealtimeChannel,
  payload: RouteLocationPayload
) => {
  channel.send({
    type: 'broadcast',
    event: 'route-location-update',
    payload,
  });
};

/** Broadcast user disconnect to route community channel */
export const broadcastRouteDisconnect = (
  channel: RealtimeChannel,
  userId: string
) => {
  channel.send({
    type: 'broadcast',
    event: 'route-user-disconnect',
    payload: { userId },
  });
};

/** Upsert location directly in Supabase for persistence */
export const updateRouteLocationDB = async (
  userId: string,
  routeHash: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
  speed?: number | null
) => {
  try {
    await supabase.from('user_locations').upsert({
      user_id: userId,
      route_hash: routeHash,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      is_visible: true,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to update route location in DB:', err);
  }
};

/** Fetch all actively visible members on a route from the database */
export const fetchActiveRouteMembers = async (
  routeHash: string
): Promise<Record<string, RouteLocationPayload>> => {
  try {
    const { data, error } = await supabase
      .from('user_locations')
      .select('*, user:profiles!user_locations_user_id_fkey(*)')
      .eq('route_hash', routeHash)
      .eq('is_visible', true)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error || !data) {
      return {};
    }

    const members: Record<string, RouteLocationPayload> = {};
    data.forEach((item: any) => {
      const userProfile = Array.isArray(item.user) ? item.user[0] : item.user;
      if (item.user_id) {
        members[item.user_id] = {
          userId: item.user_id,
          fullName: userProfile?.full_name || 'Member',
          avatarUrl: userProfile?.avatar_url || null,
          role: userProfile?.role || 'commuter',
          latitude: item.latitude,
          longitude: item.longitude,
          timestamp: new Date(item.updated_at).getTime(),
        };
      }
    });

    return members;
  } catch (err) {
    console.error('Failed to fetch active route members:', err);
    return {};
  }
};

/** Subscribe to route community coordinates updates and disconnects */
export const subscribeToRouteLocations = (
  routeHash: string,
  onLocationUpdate: (payload: RouteLocationPayload) => void,
  onUserDisconnect: (userId: string) => void
): { channel: RealtimeChannel; unsubscribe: () => void } => {
  const broadcastTopic = `route-${routeHash}`;

  // Clean up any stale broadcast channel for this topic
  const existingBroadcast = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:${broadcastTopic}`);
  if (existingBroadcast) {
    supabase.removeChannel(existingBroadcast);
    try {
      (supabase.realtime as any)._remove?.(existingBroadcast);
    } catch {}
  }

  const broadcastChannel = supabase.channel(broadcastTopic, {
    config: {
      broadcast: { ack: false },
    },
  });

  broadcastChannel
    .on('broadcast', { event: 'route-location-update' }, (payload) => {
      onLocationUpdate(payload.payload as RouteLocationPayload);
    })
    .on('broadcast', { event: 'route-user-disconnect' }, (payload) => {
      onUserDisconnect(payload.payload.userId as string);
    })
    .subscribe();

  // Use a unique channel name for postgres_changes to guarantee zero collision and avoid "cannot add callbacks after subscribe()"
  const dbChannelName = `route-db-${routeHash}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dbChannel = supabase.channel(dbChannelName);

  dbChannel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_locations',
        filter: `route_hash=eq.${routeHash}`,
      },
      async (payload: any) => {
        if (payload.eventType === 'DELETE' || (payload.new && payload.new.is_visible === false)) {
          const removedId = payload.old?.user_id || payload.new?.user_id;
          if (removedId) onUserDisconnect(removedId);
        } else if (payload.new && payload.new.is_visible) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          onLocationUpdate({
            userId: payload.new.user_id,
            fullName: userData?.full_name || 'Member',
            avatarUrl: userData?.avatar_url || null,
            role: userData?.role || 'commuter',
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
            timestamp: new Date(payload.new.updated_at).getTime(),
          });
        }
      }
    )
    .subscribe();

  return {
    channel: broadcastChannel,
    unsubscribe: () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
      try {
        (supabase.realtime as any)._remove?.(broadcastChannel);
        (supabase.realtime as any)._remove?.(dbChannel);
      } catch {}
    },
  };
};
