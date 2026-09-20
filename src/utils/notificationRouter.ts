/**
 * Centralized Notification Router for Commute Companion
 *
 * Handles deep navigation when tapping any in-app notification:
 * - Top sliding banner
 * - Center modal popup
 * - In-app notification inbox list
 * - Background/Foreground push notification response
 */

import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { isOlderThan24Hours } from '@/utils/dateFormatter';

export interface NotificationPayload {
  type?: string;
  data?: any;
  title?: string;
  body?: string;
  status?: string;
  [key: string]: any;
}

export async function handleNotificationNavigation(
  router: any,
  notification: NotificationPayload | null | undefined
) {
  if (!notification) return;

  const data = notification.data || notification;
  const type = notification.type || data?.type;
  const tripId = data.tripId || data.trip_id;
  const bookingId = data.bookingId || data.booking_id;
  const chatRoomId = data.chatRoomId || data.chat_room_id;
  const postId = data.postId || data.post_id;
  const status = data.status || notification.status;
  const title = (notification.title || data?.title || '').toLowerCase();
  const body = (notification.body || data?.body || '').toLowerCase();

  console.log('[NotificationRouter] Navigating for notification:', { type, tripId, chatRoomId, postId, bookingId, status });

  // 1. Immediate checks from notification payload for cancelled / expired / declined
  const isExplicitlyCancelled =
    status === 'cancelled' ||
    title.includes('cancelled') ||
    body.includes('was cancelled') ||
    body.includes('has been cancelled');

  const isExplicitlyDeclined =
    status === 'rejected' ||
    title.includes('declined') ||
    body.includes('declined your booking') ||
    body.includes('rejected');

  const isExplicitlyExpired =
    status === 'expired' ||
    title.includes('expired') ||
    body.includes('has expired');

  if (isExplicitlyCancelled) {
    Alert.alert(
      'Ride Cancelled',
      'This ride was cancelled and is no longer available.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Find Another Ride', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
      ]
    );
    return;
  }

  if (isExplicitlyDeclined) {
    Alert.alert(
      'Booking Declined',
      'The driver declined this booking request. You can search and book other available rides.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Browse Rides', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
      ]
    );
    return;
  }

  if (isExplicitlyExpired) {
    Alert.alert(
      'Ride Expired',
      'This scheduled ride has expired and is no longer active.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Browse Rides', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
      ]
    );
    return;
  }

  // 2. Database validation for trip availability
  if (tripId) {
    // If it's explicitly a review notification, allow directing to summary
    if (type === 'review' || type === 'new_rating') {
      router.push({
        pathname: '/(main)/ride/trip-summary',
        params: { tripId },
      } as any);
      return;
    }

    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('id, status, departure_time')
        .eq('id', tripId)
        .maybeSingle();

      if (error || !trip) {
        Alert.alert(
          'Ride Unavailable',
          'This ride is no longer available or has been removed.',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Browse Rides', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
          ]
        );
        return;
      }

      if (trip.status === 'cancelled') {
        Alert.alert(
          'Ride Cancelled',
          'This ride was cancelled and is no longer available.',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Find Another Ride', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
          ]
        );
        return;
      }

      const isTripExpired = ['open', 'full'].includes(trip.status) && isOlderThan24Hours(trip.departure_time);
      if (isTripExpired) {
        Alert.alert(
          'Ride Expired',
          'This scheduled ride has expired and is no longer active.',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Browse Rides', onPress: () => router.push('/(main)/(tabs)/rides' as any) },
          ]
        );
        return;
      }

      if (trip.status === 'completed' && type !== 'trip_update') {
        Alert.alert(
          'Ride Completed',
          'This trip has already concluded.',
          [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: 'View Summary',
              onPress: () =>
                router.push({
                  pathname: '/(main)/ride/trip-summary',
                  params: { tripId },
                } as any),
            },
          ]
        );
        return;
      }
    } catch (err) {
      console.warn('[NotificationRouter] Error checking trip availability:', err);
    }
  }

  // 3. Database validation for community post availability
  if (postId && (type === 'hub_post' || type === 'hub_mention' || type === 'hub_like' || type === 'hub_comment')) {
    try {
      const { data: post, error } = await supabase
        .from('hub_posts')
        .select('id, route_hash')
        .eq('id', postId)
        .maybeSingle();

      if (error || !post) {
        Alert.alert(
          'Post Unavailable',
          'This community post is no longer available or was removed.',
          [
            { text: 'OK', onPress: () => router.push('/(main)/(tabs)/community' as any) },
          ]
        );
        return;
      }
    } catch (err) {
      console.warn('[NotificationRouter] Error checking post availability:', err);
    }
  }

  // 4. Database validation for chat room availability
  if (chatRoomId && (type === 'chat' || type === 'new_message')) {
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('id', chatRoomId)
        .maybeSingle();

      if (error || !room) {
        Alert.alert(
          'Conversation Unavailable',
          'This chat conversation is no longer available.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (err) {
      console.warn('[NotificationRouter] Error checking chat room availability:', err);
    }
  }

  // 5. Normal routing execution
  switch (type) {
    case 'chat':
    case 'new_message':
      if (chatRoomId) {
        router.push(`/(main)/chat/${chatRoomId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'booking':
    case 'booking_request':
      if (tripId) {
        router.push(`/(main)/ride/${tripId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'booking_update':
      if (tripId) {
        router.push(`/(main)/ride/${tripId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'trip_update':
      if (tripId) {
        if (status === 'completed') {
          router.push({
            pathname: '/(main)/ride/trip-summary',
            params: { tripId },
          } as any);
        } else {
          router.push(`/(main)/ride/${tripId}` as any);
        }
        return;
      }
      router.push('/(main)/(tabs)/activity' as any);
      return;

    case 'passenger_arrival':
    case 'driver_arrival':
    case 'ride_reminder':
      if (tripId) {
        router.push(`/(main)/ride/${tripId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'ride_matched':
      if (tripId) {
        router.push(`/(main)/ride/${tripId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'hub_post':
    case 'hub_mention':
    case 'hub_like':
    case 'hub_comment':
      if (postId) {
        router.push({
          pathname: '/(main)/(tabs)/community',
          params: { postId },
        } as any);
        return;
      }
      router.push('/(main)/(tabs)/community' as any);
      return;

    case 'driver_validation':
      router.push('/(main)/verification' as any);
      return;

    case 'review':
    case 'new_rating':
      if (tripId) {
        router.push({
          pathname: '/(main)/ride/trip-summary',
          params: { tripId },
        } as any);
        return;
      }
      router.push('/(main)/(tabs)/profile' as any);
      return;

    default:
      if (chatRoomId) {
        router.push(`/(main)/chat/${chatRoomId}` as any);
      } else if (tripId) {
        if (status === 'completed') {
          router.push({
            pathname: '/(main)/ride/trip-summary',
            params: { tripId },
          } as any);
        } else {
          router.push(`/(main)/ride/${tripId}` as any);
        }
      } else if (postId) {
        router.push({
          pathname: '/(main)/(tabs)/community',
          params: { postId },
        } as any);
      } else {
        router.push('/(main)/(tabs)/rides' as any);
      }
      return;
  }
}
