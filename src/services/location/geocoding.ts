import { NOMINATIM_BASE_URL, PHOTON_BASE_URL } from '@/lib/constants';
import { handleServiceError } from '@/utils/errorHelper';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  type?: string;
}

const searchPlacesCache = new Map<string, GeocodingResult[]>();
const geocodeCache = new Map<string, GeocodingResult[]>();
const reverseGeocodeCache = new Map<string, string>();
const MAX_CACHE_SIZE = 120;

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, value);
}

/** Search for places using Nominatim (scoped to Philippines) */
export async function geocode(query: string): Promise<GeocodingResult[]> {
  const normQuery = query.trim().toLowerCase();
  if (geocodeCache.has(normQuery)) {
    return geocodeCache.get(normQuery)!;
  }

  try {
    const res = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph`,
      { headers: { 'User-Agent': 'CommutableCompanion/1.0' } }
    );
    const data = await res.json();
    const results = data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type,
    }));
    setBoundedCache(geocodeCache, normQuery, results);
    return results;
  } catch (error) {
    handleServiceError('Geocoding error:', error);
    return [];
  }
}

/** Search using Photon (better for autocomplete, biased to user location or Cebu City) */
export async function searchPlaces(query: string, userLat?: number, userLng?: number): Promise<GeocodingResult[]> {
  const normQuery = `${query.trim().toLowerCase()}_${userLat?.toFixed(2) ?? ''}_${userLng?.toFixed(2) ?? ''}`;
  if (searchPlacesCache.has(normQuery)) {
    return searchPlacesCache.get(normQuery)!;
  }

  try {
    // Dynamic coordinate bias; defaults to Cebu City center (10.3157, 123.8854)
    const lat = userLat !== undefined ? userLat : 10.3157;
    const lon = userLng !== undefined ? userLng : 123.8854;
    const res = await fetch(
      `${PHOTON_BASE_URL}?q=${encodeURIComponent(query)}&limit=5&lat=${lat}&lon=${lon}&lang=en`
    );
    const data = await res.json();
    const results = (data.features || []).map((f: any) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      displayName: [
        f.properties.name,
        f.properties.street,
        f.properties.city || f.properties.county || f.properties.district,
        f.properties.state,
      ].filter(Boolean).join(', '),
      type: f.properties.osm_value,
    }));
    setBoundedCache(searchPlacesCache, normQuery, results);
    return results;
  } catch (error) {
    handleServiceError('Place search error:', error);
    return [];
  }
}

/** Formats reverse-geocoded OSM payload into a clean, un-merged address */
function formatStructuredOsmAddress(data: any): string {
  if (!data) return 'Unknown location';
  const addr = data.address;
  if (!addr) return data.display_name || 'Unknown location';

  const pointName = data.name || addr.amenity || addr.shop || addr.building || addr.road || addr.pedestrian;
  // Use distinct barangay/suburb without concatenating overlapping quarter/suburb names (e.g. avoid 'T. Padilla, Carreta')
  const barangay = addr.suburb || addr.quarter || addr.village || addr.neighbourhood;
  const city = addr.city || addr.municipality || addr.town || addr.county;

  const parts: string[] = [];
  if (pointName) parts.push(pointName);
  if (barangay && (!pointName || !pointName.toLowerCase().includes(barangay.toLowerCase()))) {
    parts.push(barangay);
  }
  if (city && (!barangay || !barangay.toLowerCase().includes(city.toLowerCase()))) {
    parts.push(city);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return data.display_name || 'Unknown location';
}

/** Reverse geocode coordinates to address */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'CommutableCompanion/1.0' } }
    );
    const data = await res.json();
    const displayName = formatStructuredOsmAddress(data);
    setBoundedCache(reverseGeocodeCache, cacheKey, displayName);
    return displayName;
  } catch {
    return 'Unknown location';
  }
}
