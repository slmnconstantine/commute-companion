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

/** Broadcast active user coordinates to route community */
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

/** Broadcast user disconnect to route community */
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

/** Subscribe to route community coordinates updates and disconnects */
export const subscribeToRouteLocations = (
  routeHash: string,
  onLocationUpdate: (payload: RouteLocationPayload) => void,
  onUserDisconnect: (userId: string) => void
): { channel: RealtimeChannel; unsubscribe: () => void } => {
  const channel = supabase.channel(`route-${routeHash}`, {
    config: {
      broadcast: { ack: false },
    },
  });

  channel
    .on('broadcast', { event: 'route-location-update' }, (payload) => {
      onLocationUpdate(payload.payload as RouteLocationPayload);
    })
    .on('broadcast', { event: 'route-user-disconnect' }, (payload) => {
      onUserDisconnect(payload.payload.userId as string);
    })
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
};
