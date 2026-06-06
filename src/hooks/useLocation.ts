/**
 * useLocation
 *
 * Custom hook for getting the device's current GPS coordinates and
 * reverse-geocoding them into a readable address. Falls back to the
 * default Manila coordinates defined in constants.
 */
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    (async () => {
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

        if (isMounted) {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });

          // Reverse geocode for a human-readable address
          try {
            const [addr] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (addr && isMounted) {
              setAddress(
                [addr.street, addr.district, addr.city].filter(Boolean).join(', ')
              );
            }
          } catch {
            // Reverse geocode failed non-critical
          }
        }
      } catch (e: any) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location, address, loading, error, setLocation };
}
