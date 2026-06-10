import { OSRM_BASE_URL } from '@/lib/constants';
import polyline from '@mapbox/polyline';
import { handleServiceError } from '@/utils/errorHelper';

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMin: number;
  encodedPolyline: string;
}

/** Get driving route between two points using OSRM */
export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE_URL}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const decoded = polyline.decode(route.geometry);

    return {
      coordinates: decoded.map(([lat, lng]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      })),
      distanceKm: Math.round((route.distance / 1000) * 100) / 100,
      durationMin: Math.round(route.duration / 60),
      encodedPolyline: route.geometry,
    };
  } catch (error) {
    handleServiceError('Routing error:', error);
    return null;
  }
}

/** Decode an encoded polyline string to coordinates */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  return polyline.decode(encoded).map(([lat, lng]: [number, number]) => ({
    latitude: lat,
    longitude: lng,
  }));
}
