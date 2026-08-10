import { OSRM_BASE_URL } from '@/lib/constants';
import polyline from '@mapbox/polyline';
import { handleServiceError } from '@/utils/errorHelper';

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMin: number;
  encodedPolyline: string;
}

const routeCache = new Map<string, RouteResult>();
const polylineCache = new Map<string, { latitude: number; longitude: number }[]>();
const MAX_CACHE_SIZE = 100;

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, value);
}

/** Get driving route between two points using OSRM */
export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult | null> {
  const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    const url = `${OSRM_BASE_URL}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const decoded = polyline.decode(route.geometry);

    const result: RouteResult = {
      coordinates: decoded.map(([lat, lng]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      })),
      distanceKm: Math.round((route.distance / 1000) * 100) / 100,
      durationMin: Math.round(route.duration / 60),
      encodedPolyline: route.geometry,
    };

    setBoundedCache(routeCache, cacheKey, result);
    return result;
  } catch (error) {
    handleServiceError('Routing error:', error);
    return null;
  }
}

/** Decode an encoded polyline string to coordinates */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded) return [];
  if (polylineCache.has(encoded)) {
    return polylineCache.get(encoded)!;
  }

  const result = polyline.decode(encoded).map(([lat, lng]: [number, number]) => ({
    latitude: lat,
    longitude: lng,
  }));
  setBoundedCache(polylineCache, encoded, result);
  return result;
}
