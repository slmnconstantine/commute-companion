export function generateRouteHash(originLat: number, originLng: number, destLat: number, destLng: number) {
  const oLat = originLat.toFixed(2);
  const oLng = originLng.toFixed(2);
  const dLat = destLat.toFixed(2);
  const dLng = destLng.toFixed(2);
  return `${oLat},${oLng}_${dLat},${dLng}`;
}

/**
 * Returns a list of nearby corridor route hashes within ±0.01 degrees (~1.1 km)
 * of origin and destination coordinates. This ensures commuters and drivers on the
 * same route or corridor (such as nearby bus stops or pickup points) see each other's posts.
 */
export function getNearbyRouteHashes(routeHash: string): string[] {
  if (!routeHash || !routeHash.includes('_')) return [routeHash];

  try {
    const [originPart, destPart] = routeHash.split('_');
    const [oLatStr, oLngStr] = originPart.split(',');
    const [dLatStr, dLngStr] = destPart.split(',');

    const oLat = parseFloat(oLatStr);
    const oLng = parseFloat(oLngStr);
    const dLat = parseFloat(dLatStr);
    const dLng = parseFloat(dLngStr);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      return [routeHash];
    }

    const hashes = new Set<string>();
    hashes.add(routeHash);

    const deltas = [0, -0.01, 0.01];
    for (const dOLat of deltas) {
      for (const dOLng of deltas) {
        for (const dDLat of deltas) {
          for (const dDLng of deltas) {
            const h = `${(oLat + dOLat).toFixed(2)},${(oLng + dOLng).toFixed(2)}_${(dLat + dDLat).toFixed(2)},${(dLng + dDLng).toFixed(2)}`;
            hashes.add(h);
          }
        }
      }
    }
    return Array.from(hashes);
  } catch {
    return [routeHash];
  }
}

export function isJsonLabel(label: string | null) {
  if (!label) return false;
  try {
    const parsed = JSON.parse(label);
    return !!(parsed && typeof parsed === 'object');
  } catch (e) {
    return false;
  }
}
