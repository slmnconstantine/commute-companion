/**
 * useLocation
 *
 * Custom hook for getting the device's current GPS coordinates and
 * reverse-geocoding them into a readable address. Falls back to the
 * default Manila coordinates defined in constants.
 */
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '@/lib/constants';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationCoords>({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
  });
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addr) {
          setAddress(
            [addr.street, addr.district, addr.city].filter(Boolean).join(', ')
          );
        }
      } catch {
        // Non-critical
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, address, loading, error, setLocation, refreshLocation: fetchLocation };
}

export function useLocationWatcher(onLocationUpdate: (loc: LocationCoords) => void, enabled = true) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (!enabled) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setError('Location permission denied');
          return;
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            if (isMounted) {
              onLocationUpdate({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            }
          }
        );
      } catch (e: any) {
        if (isMounted) setError(e.message);
      }
    })();

    return () => {
      isMounted = false;
      if (sub) {
        sub.remove();
      }
    };
  }, [enabled, onLocationUpdate]);

  return { error };
}
