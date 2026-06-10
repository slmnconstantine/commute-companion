import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981', // App Primary Color
    });
  }

  console.log('[PUSH] Requesting permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log('[PUSH] Existing permission status:', existingStatus);
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[PUSH] Requested new permission status:', finalStatus);
  }
  
  if (finalStatus !== 'granted') {
    console.log('[PUSH] Returning null because permission not granted.');
    return null;
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId 
      ?? Constants?.easConfig?.projectId;
    
    console.log('[PUSH] Fetching token for Project ID:', projectId);
      
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    
    console.log('[PUSH] Successfully generated token:', token);
  } catch (e) {
    console.warn("[PUSH] Failed to get Expo push token:", e);
  }

  if (!Device.isDevice) {
    console.log('Warning: Push Notifications may not work reliably on all emulators.');
  }

  return token;
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}) {
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
    const data = await response.json();
    console.log('Expo Push Response:', data);
  } catch (e) {
    const { handleServiceError } = require('@/utils/errorHelper');
    handleServiceError('Error sending push notification', e);
  }
}
