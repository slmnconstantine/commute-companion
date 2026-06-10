import { NOMINATIM_BASE_URL, PHOTON_BASE_URL } from '@/lib/constants';
import { handleServiceError } from '@/utils/errorHelper';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  type?: string;
}

/** Search for places using Nominatim (scoped to Philippines) */
export async function geocode(query: string): Promise<GeocodingResult[]> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph`,
      { headers: { 'User-Agent': 'CommutableCompanion/1.0' } }
    );
    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type,
    }));
  } catch (error) {
    handleServiceError('Geocoding error:', error);
    return [];
  }
}

/** Search using Photon (better for autocomplete) */
export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  try {
    const res = await fetch(
      `${PHOTON_BASE_URL}?q=${encodeURIComponent(query)}&limit=5&lat=14.5995&lon=120.9842&lang=en`
    );
    const data = await res.json();
    return data.features.map((f: any) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      displayName: [
        f.properties.name,
        f.properties.street,
        f.properties.city || f.properties.county,
        f.properties.state,
      ].filter(Boolean).join(', '),
      type: f.properties.osm_value,
    }));
  } catch (error) {
    handleServiceError('Place search error:', error);
    return [];
  }
}

/** Reverse geocode coordinates to address */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'CommutableCompanion/1.0' } }
    );
    const data = await res.json();
    return data.display_name || 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}
