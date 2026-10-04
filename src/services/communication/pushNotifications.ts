import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { createNotification } from '@/services/notifications';
import { handleServiceError } from '@/utils/errorHelper';

// Note: Foreground notification display handler is dynamically configured in NotificationContext
// to respect user preferences (pushEnabled, soundEnabled).

// Setup Android notification channel immediately
export async function setupNotificationChannelsAsync() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0057FF',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.warn('[PUSH] Failed to setup notification channel:', e);
  }
}

// Initialize channel as early as possible on Android
if (Platform.OS === 'android') {
  setupNotificationChannelsAsync();
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[PUSH] Permission check error:', e);
    return false;
  }
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  // Ensure notification channel exists regardless of physical device vs emulator
  await setupNotificationChannelsAsync();

  const hasPermission = await requestNotificationPermissionsAsync();
  if (!hasPermission) {
    return null;
  }

  if (!Device.isDevice) {
    console.log('[PUSH] Bypassing push token registration: running on an emulator/simulator.');
    return null;
  }

  let token = null;

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId
      ?? Constants?.easConfig?.projectId;

    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ).catch((err) => {
      console.warn('[PUSH] Handled token fetch notice:', err?.message || err);
      return null;
    });

    token = res?.data || null;
    if (token) {
      console.log('[PUSH] Successfully acquired token:', token);
    }
  } catch (e: any) {
    console.warn('[PUSH] Failed to get Expo push token:', e?.message || e);
  }

  return token;
}

export async function sendPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  data: any = {},
  userId?: string
) {
  // Suppress sending notification if the sender is the intended recipient
  if (data?.senderId && userId && data.senderId === userId) {
    return;
  }

  const payloadData = {
    ...data,
    ...(userId ? { recipientId: userId } : {}),
  };

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: payloadData,
    channelId: 'default',
    priority: 'high',
  };

  try {
    // 1. If userId is provided, log to in-app notifications in Supabase directly for the intended recipient
    if (userId) {
      await createNotification(userId, title, body, data?.type || 'general', payloadData);
    }

    // 2. Dispatch push notification over Expo if valid token exists
    const isValidToken = typeof expoPushToken === 'string' && 
      (expoPushToken.startsWith('ExponentPushToken') || expoPushToken.startsWith('ExpoPushToken'));

    if (isValidToken) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      const result = await response.json();
      console.log('Expo Push Response:', result);
    }
  } catch (e) {
    handleServiceError('Error sending push notification', e);
  }
}

