export function generateRouteHash(originLat: number, originLng: number, destLat: number, destLng: number) {
  const oLat = originLat.toFixed(2);
  const oLng = originLng.toFixed(2);
  const dLat = destLat.toFixed(2);
  const dLng = destLng.toFixed(2);
  return `${oLat},${oLng}_${dLat},${dLng}`;
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
