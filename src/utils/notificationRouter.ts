/**
 * Centralized Notification Router for Commute Companion
 *
 * Handles deep navigation when tapping any in-app notification:
 * - Top sliding banner
 * - Center modal popup
 * - In-app notification inbox list
 * - Background/Foreground push notification response
 */

export interface NotificationPayload {
  type?: string;
  data?: any;
  [key: string]: any;
}

export function handleNotificationNavigation(
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
  const routeHash = data.routeHash || data.route_hash;
  const status = data.status;

  console.log('[NotificationRouter] Navigating for notification:', { type, tripId, chatRoomId, postId, bookingId, status });

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
      // Driver received a new booking request -> open the specific ride
      if (tripId) {
        router.push(`/(main)/ride/${tripId}` as any);
        return;
      }
      router.push('/(main)/(tabs)/rides' as any);
      return;

    case 'booking_update':
      // Commuter ride status changed -> open ride details
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
      // Robust fallbacks based on available IDs in data
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
