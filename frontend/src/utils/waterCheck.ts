/**
 * Water/land detection using OpenStreetMap Nominatim reverse geocoding.
 * Results are cached to avoid hammering the API on every mouse move.
 */

const cache = new Map<string, boolean>();

/**
 * Returns true if the coordinate is on water (sea, ocean, bay, lake, river, etc.)
 * Returns false if it's on land (city, road, building, etc.)
 */
export async function isOnWater(lat: number, lng: number): Promise<boolean> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'MarineTelemetrySystem/1.0' }
    });

    if (!res.ok) {
      // If API fails, assume water (fail-open so mission isn't blocked)
      cache.set(key, true);
      return true;
    }

    const data = await res.json();

    // Nominatim returns these type/class combinations for water bodies
    const waterTypes = new Set([
      'water', 'bay', 'sea', 'ocean', 'strait', 'river', 'lake', 'canal',
      'reservoir', 'harbour', 'fjord', 'lagoon', 'tidal', 'wetland'
    ]);
    const waterClasses = new Set(['waterway', 'natural', 'water', 'place']);

    const type: string = data.type ?? '';
    const cls: string = data.class ?? '';
    const displayName: string = (data.display_name ?? '').toLowerCase();

    // Nominatim returns "Unable to geocode" with no address when in open ocean
    if (!data.address || Object.keys(data.address ?? {}).length === 0) {
      cache.set(key, true);
      return true;
    }

    const isWater =
      waterTypes.has(type) ||
      (waterClasses.has(cls) && waterTypes.has(type)) ||
      displayName.includes('sea') ||
      displayName.includes('ocean') ||
      displayName.includes('bay') ||
      displayName.includes('gulf') ||
      displayName.includes('strait') ||
      displayName.includes('channel') ||
      displayName.includes('harbour') ||
      // Open ocean: no usable address entries (just country/continent)
      !data.address?.road && !data.address?.city && !data.address?.town &&
       !data.address?.village && !data.address?.suburb && !data.address?.hamlet;

    cache.set(key, isWater);
    return isWater;
  } catch {
    // Network error — fail-open
    cache.set(key, true);
    return true;
  }
}

/** Clears the cache — useful during testing */
export function clearWaterCache() {
  cache.clear();
}
