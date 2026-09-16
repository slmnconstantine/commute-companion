import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getOrCreateChatRoom } from './chatRooms';

export interface LiveFaceRecord {
  tripId: string;
  userId: string;
  role: 'driver' | 'commuter';
  bookingId?: string;
  photoUri: string;
  timestamp: string;
  confidenceScore?: number;
}

const DRIVER_KEY_PREFIX = '@live_face_driver_';
const COMMUTERS_KEY_PREFIX = '@live_face_commuters_';

export const LIVE_FACE_PREFIX = '###LIVE_FACE_PAYLOAD###';

/**
 * Persists the driver's live face capture for a specific trip
 */
export async function saveDriverLiveCapture(
  tripId: string,
  driverId: string,
  photoData: string,
  confidenceScore: number = 98
): Promise<LiveFaceRecord> {
  const record: LiveFaceRecord = {
    tripId,
    userId: driverId,
    role: 'driver',
    photoUri: photoData,
    timestamp: new Date().toISOString(),
    confidenceScore,
  };

  try {
    await AsyncStorage.setItem(`${DRIVER_KEY_PREFIX}${tripId}`, JSON.stringify(record));
  } catch (err) {
    console.warn('Failed to cache driver live face capture:', err);
  }

  // Synchronize across devices via trip chat system payload
  try {
    const room = await getOrCreateChatRoom(tripId);
    if (room?.id) {
      await supabase.from('messages').insert({
        chat_room_id: room.id,
        sender_id: driverId,
        content: `${LIVE_FACE_PREFIX}${JSON.stringify(record)}`,
        is_alert: false,
      });
    }
  } catch (networkErr) {
    console.warn('Failed to broadcast driver live face capture payload:', networkErr);
  }

  return record;
}

/**
 * Helper to determine if a trip is completed and archived (older than 24 hours).
 * Also treats cancelled trips as not showing live face photos.
 */
export function isTripArchived(trip?: { status?: string; departure_time?: string | null; created_at?: string | null } | null): boolean {
  if (!trip) return false;
  if (trip.status === 'cancelled') return true;
  if (trip.status !== 'completed') return false;
  const timeStr = trip.departure_time || trip.created_at;
  if (!timeStr) return false;
  const time = new Date(timeStr).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time > 24 * 60 * 60 * 1000;
}

/**
 * Purges live face captures for a trip from local cache and remote messages.
 * Used when a trip is completed and archived to respect user privacy.
 */
export async function purgeTripLiveCaptures(tripId: string): Promise<void> {
  if (!tripId) return;

  // 1. Purge local cache
  try {
    await AsyncStorage.removeItem(`${DRIVER_KEY_PREFIX}${tripId}`);
    await AsyncStorage.removeItem(`${COMMUTERS_KEY_PREFIX}${tripId}`);
  } catch (err) {
    console.warn('Failed to purge local live face cache for trip', tripId, err);
  }

  // 2. Purge remote chat room messages
  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('trip_id', tripId)
      .eq('type', 'group')
      .maybeSingle();

    if (room?.id) {
      await supabase
        .from('messages')
        .delete()
        .eq('chat_room_id', room.id)
        .like('content', `${LIVE_FACE_PREFIX}%`);
    }
  } catch (netErr) {
    console.warn('Failed to purge remote live face records for trip', tripId, netErr);
  }
}

/**
 * Scans trips that are completed and archived (>24 hours) and purges their live face capture messages
 */
export async function purgeArchivedLiveCaptures(): Promise<void> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: archivedTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('status', 'completed')
      .lt('departure_time', oneDayAgo);

    if (archivedTrips && archivedTrips.length > 0) {
      for (const t of archivedTrips) {
        purgeTripLiveCaptures(t.id).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Failed to scan and purge archived live captures:', err);
  }
}

/**
 * Retrieves the driver's live face capture for a specific trip
 */
export async function getDriverLiveCapture(
  tripId: string,
  driverId?: string
): Promise<LiveFaceRecord | null> {
  if (!tripId) return null;

  // Check if trip is completed and archived
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('status, departure_time, created_at')
      .eq('id', tripId)
      .maybeSingle();

    if (trip && isTripArchived(trip)) {
      purgeTripLiveCaptures(tripId).catch(() => {});
      return null;
    }
  } catch (e) {
    // If network check fails, proceed with caution
  }

  // 1. Check local cache
  try {
    const cached = await AsyncStorage.getItem(`${DRIVER_KEY_PREFIX}${tripId}`);
    if (cached) {
      return JSON.parse(cached) as LiveFaceRecord;
    }
  } catch (err) {
    console.warn('Failed to read driver live face cache:', err);
  }

  // 2. Fetch from trip chat room messages
  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('trip_id', tripId)
      .eq('type', 'group')
      .maybeSingle();

    if (room?.id) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('chat_room_id', room.id)
        .order('created_at', { ascending: false });

      if (msgs && msgs.length > 0) {
        for (const m of msgs) {
          if (m.content?.startsWith(LIVE_FACE_PREFIX)) {
            const rawJson = m.content.slice(LIVE_FACE_PREFIX.length);
            const parsed = JSON.parse(rawJson) as LiveFaceRecord;
            if (parsed.role === 'driver' && (!driverId || parsed.userId === driverId)) {
              // Cache locally
              AsyncStorage.setItem(`${DRIVER_KEY_PREFIX}${tripId}`, JSON.stringify(parsed)).catch(() => {});
              return parsed;
            }
          }
        }
      }
    }
  } catch (fetchErr) {
    console.warn('Failed to retrieve driver live face from database:', fetchErr);
  }

  return null;
}

/**
 * Persists the commuter's live face capture for a specific trip & booking
 */
export async function saveCommuterLiveCapture(
  tripId: string,
  commuterId: string,
  bookingId: string,
  photoData: string,
  confidenceScore: number = 96
): Promise<LiveFaceRecord> {
  const record: LiveFaceRecord = {
    tripId,
    userId: commuterId,
    role: 'commuter',
    bookingId,
    photoUri: photoData,
    timestamp: new Date().toISOString(),
    confidenceScore,
  };

  // Cache locally in commuter map for this trip
  try {
    const key = `${COMMUTERS_KEY_PREFIX}${tripId}`;
    const raw = await AsyncStorage.getItem(key);
    const map: Record<string, LiveFaceRecord> = raw ? JSON.parse(raw) : {};
    map[commuterId] = record;
    if (bookingId) map[bookingId] = record;
    await AsyncStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to cache commuter live face capture:', err);
  }

  // Broadcast to trip chat room so driver can receive it in real-time
  try {
    const room = await getOrCreateChatRoom(tripId);
    if (room?.id) {
      await supabase.from('messages').insert({
        chat_room_id: room.id,
        sender_id: commuterId,
        content: `${LIVE_FACE_PREFIX}${JSON.stringify(record)}`,
        is_alert: false,
      });
    }
  } catch (networkErr) {
    console.warn('Failed to broadcast commuter live face capture:', networkErr);
  }

  return record;
}

/**
 * Retrieves all commuter live face captures for a trip
 */
export async function getTripCommuterCaptures(
  tripId: string
): Promise<Record<string, LiveFaceRecord>> {
  if (!tripId) return {};

  // Check if trip is completed and archived
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('status, departure_time, created_at')
      .eq('id', tripId)
      .maybeSingle();

    if (trip && isTripArchived(trip)) {
      purgeTripLiveCaptures(tripId).catch(() => {});
      return {};
    }
  } catch (e) {
    // If network check fails, proceed
  }

  const map: Record<string, LiveFaceRecord> = {};

  // 1. Read from local cache
  try {
    const key = `${COMMUTERS_KEY_PREFIX}${tripId}`;
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      Object.assign(map, JSON.parse(raw));
    }
  } catch (err) {
    console.warn('Failed to read commuter captures from cache:', err);
  }

  // 2. Query remote payloads from chat room
  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('trip_id', tripId)
      .eq('type', 'group')
      .maybeSingle();

    if (room?.id) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('chat_room_id', room.id)
        .order('created_at', { ascending: true });

      if (msgs && msgs.length > 0) {
        for (const m of msgs) {
          if (m.content?.startsWith(LIVE_FACE_PREFIX)) {
            const rawJson = m.content.slice(LIVE_FACE_PREFIX.length);
            const parsed = JSON.parse(rawJson) as LiveFaceRecord;
            if (parsed.role === 'commuter') {
              map[parsed.userId] = parsed;
              if (parsed.bookingId) {
                map[parsed.bookingId] = parsed;
              }
            }
          }
        }
        // Save back updated map to cache
        AsyncStorage.setItem(`${COMMUTERS_KEY_PREFIX}${tripId}`, JSON.stringify(map)).catch(() => {});
      }
    }
  } catch (fetchErr) {
    console.warn('Failed to fetch remote commuter captures:', fetchErr);
  }

  return map;
}

/**
 * Helper to get a specific commuter's live face capture
 */
export async function getCommuterLiveCapture(
  tripId: string,
  commuterId: string
): Promise<LiveFaceRecord | null> {
  const captures = await getTripCommuterCaptures(tripId);
  return captures[commuterId] || null;
}
