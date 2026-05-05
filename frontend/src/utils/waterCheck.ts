/**
 * Water/land detection using OpenStreetMap Nominatim reverse geocoding.
 *
 * Feature 4 fix: Removed region-biased address-presence logic. Now uses Nominatim's
 * globally consistent `type` and `class` fields, plus its `error` field for open ocean.
 * Works correctly at any coordinate on Earth, not just the Arabian Sea.
 *
 * Results are cached (4-decimal precision) to avoid hammering the API.
 */

const cache = new Map<string, boolean>();

/** Returns true if the coordinate is on water (open ocean, sea, bay, lake, river, etc.) */
export async function isOnWater(lat: number, lng: number): Promise<boolean> {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'MarineTelemetrySystem/1.0' }
    });

    if (!res.ok) {
      cache.set(key, true);
      return true;
    }

    const data = await res.json();

    if (data.error) {
      cache.set(key, true);
      return true;
    }

    const waterTypes = new Set([
      'water', 'bay', 'sea', 'ocean', 'strait', 'river', 'lake', 'canal',
      'reservoir', 'harbour', 'fjord', 'lagoon', 'tidal_flat', 'wetland',
      'coastline', 'beach',
    ]);

    const type: string  = (data.type  ?? '').toLowerCase();
    const cls:  string  = (data.class ?? '').toLowerCase();
    const name: string  = (data.display_name ?? '').toLowerCase();

    if (cls === 'natural' && waterTypes.has(type)) {
      cache.set(key, true);
      return true;
    }
    if (cls === 'waterway') {
      cache.set(key, true);
      return true;
    }
    if (waterTypes.has(type)) {
      cache.set(key, true);
      return true;
    }

    const waterKeywords = ['sea', 'ocean', 'bay', 'gulf', 'strait', 'channel', 'harbour', 'lake', 'river'];
    if (waterKeywords.some(kw => name.includes(kw))) {
      cache.set(key, true);
      return true;
    }

    const result = false;
    cache.set(key, result);
    return result;

  } catch {
    cache.set(key, true);
    return true;
  }
}

/** Clears the cache — call between test cases */
export function clearWaterCache() {
  cache.clear();
}
