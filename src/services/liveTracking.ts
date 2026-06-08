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
