import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOnWater, clearWaterCache } from '../utils/waterCheck';

describe('isOnWater', () => {
  beforeEach(() => {
    clearWaterCache();
    vi.clearAllMocks();
  });

  global.fetch = vi.fn();

  it('should return true for open ocean (Feature 4)', async () => {
    // Mock Nominatim "Unable to geocode" error for open ocean
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "Unable to geocode" }),
    });

    const result = await isOnWater(0, 0);
    expect(result).toBe(true);
  });

  it('should return true for coordinates with "sea" in display name (Feature 4)', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        display_name: "Arabian Sea",
        type: "sea",
        class: "natural"
      }),
    });

    const result = await isOnWater(18.9, 72.6);
    expect(result).toBe(true);
  });

  it('should return false for land coordinates (Feature 4)', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        display_name: "Mumbai, Maharashtra, India",
        type: "city",
        class: "place",
        address: { city: "Mumbai" }
      }),
    });

    const result = await isOnWater(18.93, 72.83);
    expect(result).toBe(false);
  });

  it('should return true as fail-open on API failure (Feature 4)', async () => {
    (fetch as any).mockRejectedValue(new Error("Network Error"));

    const result = await isOnWater(10, 10);
    expect(result).toBe(true);
  });
});
