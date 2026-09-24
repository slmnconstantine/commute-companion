import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const BACKGROUND_LOCATION_TASK = 'COMMUTE_BACKGROUND_LOCATION_TASK';
export const STORAGE_KEY_VISIBILITY = '@user_location_visibility_enabled';
export const STORAGE_KEY_USER_ID = '@active_broadcast_user_id';
export const STORAGE_KEY_ROUTE_HASH = '@active_broadcast_route_hash';

/**
 * Define the global background location task.
 * Note: Must be defined in the global scope so Expo TaskManager can invoke it
 * even when the app is backgrounded or woken up by OS location service.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocation] Task error:', error);
    return;
  }

  try {
    const isVisible = await AsyncStorage.getItem(STORAGE_KEY_VISIBILITY);
    if (isVisible !== 'true') {
      return;
    }

    const userId = await AsyncStorage.getItem(STORAGE_KEY_USER_ID);
    const routeHash = await AsyncStorage.getItem(STORAGE_KEY_ROUTE_HASH);

    if (!userId || !routeHash) {
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        const latest = locations[locations.length - 1];

        // Persist to Supabase live database
        await supabase.from('user_locations').upsert({
          user_id: userId,
          route_hash: routeHash,
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
          heading: latest.coords.heading ?? null,
          speed: latest.coords.speed ?? null,
          is_visible: true,
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('[BackgroundLocation] Failed to persist background location:', err);
  }
});

/**
 * Request both foreground and background location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }

  // Background permission is required for persistent tracking when app is closed/in background
  try {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  } catch (e) {
    console.warn('[BackgroundLocation] Background permission request warning:', e);
    // On some devices or emulators, foreground is granted and background might return granted or undetermined
    return true;
  }
}

/**
 * Start broadcasting location and register background tracking
 */
export async function startBackgroundLocationTracking(
  userId: string,
  routeHash: string
): Promise<boolean> {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      return false;
    }

    // Persist visibility preference and target route in storage
    await AsyncStorage.setItem(STORAGE_KEY_VISIBILITY, 'true');
    await AsyncStorage.setItem(STORAGE_KEY_USER_ID, userId);
    await AsyncStorage.setItem(STORAGE_KEY_ROUTE_HASH, routeHash);

    // Immediately record current position in Supabase
    try {
      const currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await supabase.from('user_locations').upsert({
        user_id: userId,
        route_hash: routeHash,
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        heading: currentLoc.coords.heading ?? null,
        speed: currentLoc.coords.speed ?? null,
        is_visible: true,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[BackgroundLocation] Initial location capture warning:', e);
    }

    // Register with Expo Task Manager if not already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 15, // Update every 15 meters
        deferredUpdatesInterval: 15000, // Or every 15 seconds
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Commute Location Visibility Active',
          notificationBody: 'Broadcasting your location to members on this commute route.',
          notificationColor: '#0D9488',
        },
      });
    }

    return true;
  } catch (err) {
    console.error('[BackgroundLocation] Failed to start background tracking:', err);
    return false;
  }
}

/**
 * Stop broadcasting location and unregister background tracking.
 * This is ONLY called when the user explicitly toggles visibility OFF.
 */
export async function stopBackgroundLocationTracking(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_VISIBILITY, 'false');

    // Unregister background task
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    // Mark location as invisible in Supabase
    await supabase
      .from('user_locations')
      .update({ is_visible: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (err) {
    console.error('[BackgroundLocation] Failed to stop background tracking:', err);
  }
}

/**
 * Check if the user previously had visibility toggled ON
 */
export async function getPersistedVisibility(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_VISIBILITY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Check and resume background tracking session on app start if visibility was left ON
 */
export async function syncBackgroundLocationSession(
  userId: string,
  routeHash: string
): Promise<boolean> {
  const isEnabled = await getPersistedVisibility();
  if (isEnabled) {
    await startBackgroundLocationTracking(userId, routeHash);
    return true;
  }
  return false;
}
