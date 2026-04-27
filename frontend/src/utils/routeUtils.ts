/**
 * Route Utilities — Avoidance Zone Rerouting
 *
 * ALGORITHM:
 * For each segment A→B that is blocked by an avoidance zone:
 *   1. Try every cyclic sequence of expanded zone vertices as a bypass
 *   2. Validate that the entry leg (A→first) and exit leg (last→B) do not
 *      cross the ORIGINAL (un-expanded) current zone boundary.
 *      NOTE: We check against the ORIGINAL poly (not expanded) because the
 *      bypass vertices sit ON the expanded boundary — checking against the
 *      expanded poly would always reject valid paths.
 *   3. Also validate entry/exit against all other expanded zones.
 *   4. Pick the shortest valid bypass.
 */

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface AvoidanceZone {
  id: string;
  points: { lat: number; lng: number }[];
  area: number;
  visible: boolean;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180, dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns true if segments (p1→p2) and (p3→p4) properly cross
// Uses strict bounds (0.001–0.999) to avoid false-positives at shared endpoints
function segmentsCross(p1: any, p2: any, p3: any, p4: any): boolean {
  const d = (p2.lng - p1.lng) * (p4.lat - p3.lat) - (p2.lat - p1.lat) * (p4.lng - p3.lng);
  if (Math.abs(d) < 1e-12) return false;
  const u = ((p3.lng - p1.lng) * (p4.lat - p3.lat) - (p3.lat - p1.lat) * (p4.lng - p3.lng)) / d;
  const v = ((p3.lng - p1.lng) * (p2.lat - p1.lat) - (p3.lat - p1.lat) * (p2.lng - p1.lng)) / d;
  return u > 0.001 && u < 0.999 && v > 0.001 && v < 0.999;
}

// Does segment (a→b) cross any edge of polygon?
export function intersectsPolygon(a: any, b: any, poly: any[]): boolean {
  for (let i = 0; i < poly.length; i++) {
    if (segmentsCross(a, b, poly[i], poly[(i + 1) % poly.length])) return true;
  }
  return false;
}

// Legacy export (backward compat)
export function getIntersection(p1: any, p2: any, p3: any, p4: any) {
  const d = (p2.lng - p1.lng) * (p4.lat - p3.lat) - (p2.lat - p1.lat) * (p4.lng - p3.lng);
  if (Math.abs(d) < 1e-12) return null;
  const u = ((p3.lng - p1.lng) * (p4.lat - p3.lat) - (p3.lat - p1.lat) * (p4.lng - p3.lng)) / d;
  const v = ((p3.lng - p1.lng) * (p2.lat - p1.lat) - (p3.lat - p1.lat) * (p2.lng - p1.lng)) / d;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { lat: p1.lat + u * (p2.lat - p1.lat), lng: p1.lng + u * (p2.lng - p1.lng) };
}

// Ray-cast point-in-polygon
function pointInPolygon(pt: any, poly: any[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lat, yi = poly[i].lng;
    const xj = poly[j].lat, yj = poly[j].lng;
    if (((yi > pt.lng) !== (yj > pt.lng)) &&
        pt.lat < ((xj - xi) * (pt.lng - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Expand polygon outward from its centroid by bufferDeg degrees
function expandPolygon(points: any[], bufferDeg: number) {
  let cx = 0, cy = 0;
  points.forEach(p => { cx += p.lat; cy += p.lng; });
  cx /= points.length; cy /= points.length;
  return points.map(p => {
    const dlat = p.lat - cx, dlng = p.lng - cy;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng) || 1e-9;
    return { lat: p.lat + (dlat / dist) * bufferDeg, lng: p.lng + (dlng / dist) * bufferDeg };
  });
}

// Is a segment blocked by a polygon?
// Checks: edge crossing, midpoint inside, endpoints inside
function segmentBlockedBy(a: any, b: any, poly: any[]): boolean {
  if (intersectsPolygon(a, b, poly)) return true;
  if (pointInPolygon(a, poly)) return true;
  if (pointInPolygon(b, poly)) return true;
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  if (pointInPolygon(mid, poly)) return true;
  return false;
}

// Does a segment hit any of the given polygons?
function hitsAny(a: any, b: any, polys: any[][]): boolean {
  return polys.some(poly => segmentBlockedBy(a, b, poly));
}

export const applyBuffer = (pt: any, center: any) => {
  const dlat = pt.lat - center.lat, dlng = pt.lng - center.lng;
  const dist = Math.sqrt(dlat * dlat + dlng * dlng) || 1e-9;
  return { lat: pt.lat + (dlat / dist) * 0.0003, lng: pt.lng + (dlng / dist) * 0.0003 };
};

// ── Main rerouting function ───────────────────────────────────────────────────

export const computeReroutedPath = (
  wps: Waypoint[],
  zones: AvoidanceZone[]
): { newPath: Waypoint[]; modifiedWPsCount: number } => {
  const activeZones = zones.filter(z => z.visible && z.points.length >= 3);
  if (wps.length < 2 || activeZones.length === 0) return { newPath: wps, modifiedWPsCount: 0 };

  // Buffer: ~150m — large enough that a path staying outside the buffer
  // clearly avoids the original zone
  const BUFFER_DEG = 150 / 111320;
  const expandedZones = activeZones.map(z => expandPolygon(z.points, BUFFER_DEG));

  let path: Waypoint[] = [...wps];
  let modifiedWPsCount = 0;

  for (let zIdx = 0; zIdx < activeZones.length; zIdx++) {
    // The ORIGINAL polygon — used to validate entry/exit legs
    const origPoly = activeZones[zIdx].points;
    // The EXPANDED polygon — used to detect if a segment is blocked
    // and to generate bypass candidate vertices
    const expPoly = expandedZones[zIdx];
    // All other expanded zones — for checking bypass legs don't hit other zones
    const otherExpanded = expandedZones.filter((_, i) => i !== zIdx);
    const n = expPoly.length;

    const newPath: Waypoint[] = [path[0]];

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];

      // Is this segment blocked by the current zone?
      if (!segmentBlockedBy(a, b, expPoly)) {
        newPath.push(b);
        continue;
      }

      let bestBypass: { lat: number; lng: number }[] = [];
      let bestLen = Infinity;

      // Try all cyclic sequences of consecutive expanded vertices
      for (let start = 0; start < n; start++) {
        for (let len = 1; len <= n; len++) {
          const bypass = Array.from({ length: len }, (_, k) => expPoly[(start + k) % n]);
          const first = bypass[0];
          const last  = bypass[len - 1];

          // ── KEY FIX ─────────────────────────────────────────────────────
          // Entry leg A → first bypass vertex:
          //   • Must NOT cross the ORIGINAL zone (not the expanded one,
          //     because the vertex sits on the expanded boundary)
          //   • Must NOT hit any other expanded zone
          if (segmentBlockedBy(a, first, origPoly)) continue;
          if (hitsAny(a, first, otherExpanded)) continue;

          // Exit leg last bypass vertex → B:
          //   Same rules apply
          if (segmentBlockedBy(last, b, origPoly)) continue;
          if (hitsAny(last, b, otherExpanded)) continue;

          // Compute total detour length
          let totalLen = calculateDistance(a.lat, a.lng, first.lat, first.lng);
          for (let k = 1; k < len; k++) {
            totalLen += calculateDistance(bypass[k - 1].lat, bypass[k - 1].lng, bypass[k].lat, bypass[k].lng);
          }
          totalLen += calculateDistance(last.lat, last.lng, b.lat, b.lng);

          if (totalLen < bestLen) {
            bestLen = totalLen;
            bestBypass = bypass;
          }
        }
      }

      if (bestBypass.length > 0) {
        bestBypass.forEach((bp, bpIdx) => {
          newPath.push({
            id: `reroute-z${zIdx}-s${i}-p${bpIdx}-${Date.now()}`,
            name: 'REROUTE',
            lat: bp.lat,
            lng: bp.lng,
          });
        });
        modifiedWPsCount += bestBypass.length;
      }
      // Always push the destination waypoint
      newPath.push(b);
    }

    path = newPath;
  }

  return { newPath: path, modifiedWPsCount };
};
