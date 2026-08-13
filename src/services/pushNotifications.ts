import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { createNotification } from '@/services/notifications';
import { handleServiceError } from '@/utils/errorHelper';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false, // Suppress OS notification shade/list while app is in foreground
    shouldPlaySound: false, // Suppress OS sound while app is in foreground
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('[PUSH] Bypassing push token registration: running on an emulator/simulator.');
    return null;
  }

  let token = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0057FF', // App Primary Color (Signal Blue)
      }).catch(() => {});
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }));
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

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

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data: any = {}, userId?: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
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

    // If userId is provided, log to in-app notifications
    if (userId) {
      await createNotification(userId, title, body, data?.type || 'general', data);
    }
  } catch (e) {
    handleServiceError('Error sending push notification', e);
  }
}
