// ── Geofence validation utility ───────────────────────────────────────────────
// Uses @turf/turf (already installed) for all polygon geometry.
// No external APIs — fully offline, runs in browser.

import * as turf from '@turf/turf';
import { Geofence } from '../types/geofence';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if point is inside the polygon */
export function isPointInsidePolygon(
  lat: number, lng: number,
  polygonPoints: { lat: number; lng: number }[]
): boolean {
  if (polygonPoints.length < 3) return false;
  try {
    const poly = turf.polygon([[
      ...polygonPoints.map(p => [p.lng, p.lat]),
      [polygonPoints[0].lng, polygonPoints[0].lat]
    ]]);
    return turf.booleanPointInPolygon(turf.point([lng, lat]), poly);
  } catch {
    return false;
  }
}

/** Returns nearest point ON the polygon boundary */
export function snapToGeofenceBoundary(
  lat: number, lng: number,
  polygonPoints: { lat: number; lng: number }[]
): { lat: number; lng: number } {
  try {
    const poly = turf.polygon([[
      ...polygonPoints.map(p => [p.lng, p.lat]),
      [polygonPoints[0].lng, polygonPoints[0].lat]
    ]]);
    const pt = turf.point([lng, lat]);
    const boundary = turf.polygonToLine(poly);
    const nearest = turf.nearestPointOnLine(boundary as any, pt);
    return { lat: nearest.geometry.coordinates[1], lng: nearest.geometry.coordinates[0] };
  } catch {
    // Fallback: return centroid if geometry fails
    return computeCentroid(polygonPoints);
  }
}

/** Compute centroid of polygon points */
export function computeCentroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

/** Returns nearest point slightly INSIDE the polygon (boundary offset inward toward centroid) */
export function snapInsideGeofence(
  lat: number, lng: number,
  polygonPoints: { lat: number; lng: number }[]
): { lat: number; lng: number } {
  const snapped = snapToGeofenceBoundary(lat, lng, polygonPoints);
  const centroid = computeCentroid(polygonPoints);
  // Nudge 5% toward centroid to guarantee inside
  return {
    lat: snapped.lat + (centroid.lat - snapped.lat) * 0.05,
    lng: snapped.lng + (centroid.lng - snapped.lng) * 0.05,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export type WaypointValidationResult =
  | { valid: true }
  | { valid: false; reason: string; snappedPoint?: { lat: number; lng: number } };

/**
 * Validates a candidate waypoint position against all active geofences.
 * - Exclusion zone: hard block if point is inside.
 * - Containment zone: auto-snap if point is outside the zone.
 */
export function validateWaypointAgainstGeofences(
  lat: number, lng: number,
  geofences: Geofence[]
): WaypointValidationResult {
  for (const fence of geofences.filter(f => f.active && f.points.length >= 3)) {
    const inside = isPointInsidePolygon(lat, lng, fence.points);

    if (fence.mode === 'exclusion' && inside) {
      return {
        valid: false,
        reason: `⛔ Prohibited Area — Cannot place waypoint inside exclusion zone "${fence.label}".`,
      };
    }

    if (fence.mode === 'containment' && !inside) {
      const snappedPoint = snapInsideGeofence(lat, lng, fence.points);
      return {
        valid: false,
        reason: `📍 Waypoint outside cordoned area — Snapping to nearest valid position inside "${fence.label}" boundary.`,
        snappedPoint,
      };
    }
  }
  return { valid: true };
}

/**
 * Filters a set of waypoints through all active geofences.
 * Used for pattern placement: removes/snaps each point.
 */
export function filterWaypointsByGeofences(
  waypoints: { lat: number; lng: number }[],
  geofences: Geofence[]
): { lat: number; lng: number }[] {
  return waypoints.reduce<{ lat: number; lng: number }[]>((acc, wp) => {
    const result = validateWaypointAgainstGeofences(wp.lat, wp.lng, geofences);
    if (result.valid) {
      acc.push(wp);
    } else if ('snappedPoint' in result && result.snappedPoint) {
      // Containment: use snapped point
      acc.push(result.snappedPoint);
    }
    // Exclusion: skip point entirely
    return acc;
  }, []);
}
