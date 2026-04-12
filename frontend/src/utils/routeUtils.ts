/**
 * Route Utilities for Mission Planning
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

// Distance helper (Haversine approximation)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Segment intersection
export function getIntersection(p1: any, p2: any, p3: any, p4: any) {
  const d = (p2.lng - p1.lng) * (p4.lat - p3.lat) - (p2.lat - p1.lat) * (p4.lng - p3.lng);
  if (d === 0) return null;
  const u = ((p3.lng - p1.lng) * (p4.lat - p3.lat) - (p3.lat - p1.lat) * (p4.lng - p3.lng)) / d;
  const v = ((p3.lng - p1.lng) * (p2.lat - p1.lat) - (p3.lat - p1.lat) * (p2.lng - p1.lng)) / d;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { lat: p1.lat + u * (p2.lat - p1.lat), lng: p1.lng + u * (p2.lng - p1.lng) };
}

export function intersectsPolygon(p1: any, p2: any, poly: any[]) {
  for (let i = 0; i < poly.length; i++) {
    const p3 = poly[i];
    const p4 = poly[(i + 1) % poly.length];
    if (getIntersection(p1, p2, p3, p4)) return true;
  }
  return false;
}

export const applyBuffer = (pt: {lat: number, lng: number}, center: {lat: number, lng: number}) => {
  const latDiff = pt.lat - center.lat;
  const lngDiff = pt.lng - center.lng;
  const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const bufferDeg = 0.0001; 
  return {
    lat: pt.lat + (latDiff / dist) * bufferDeg,
    lng: pt.lng + (lngDiff / dist) * bufferDeg,
  };
};

/**
 * Feature 2 Fix: Reroute logic that avoids double-insertion.
 * Takes original waypoints and zones, returns a new path with detour points.
 */
export const computeReroutedPath = (wps: Waypoint[], zones: AvoidanceZone[]): { newPath: Waypoint[]; modifiedWPsCount: number } => {
  if (wps.length < 2 || zones.length === 0) return { newPath: wps, modifiedWPsCount: 0 };

  const newPath: Waypoint[] = [wps[0]];
  let modifiedWPsCount = 0;

  for (let i = 0; i < wps.length - 1; i++) {
    const segStart = wps[i];
    const segEnd = wps[i + 1];

    let collisionZone: AvoidanceZone | null = null;
    for (const zone of zones) {
      if (!zone.visible) continue;
      if (intersectsPolygon(segStart, segEnd, zone.points)) {
        collisionZone = zone;
        break;
      }
    }

    if (collisionZone) {
      let cy = 0, cx = 0;
      collisionZone.points.forEach((p: any) => { cy += p.lat; cx += p.lng; });
      cy /= collisionZone.points.length;
      cx /= collisionZone.points.length;
      const center = { lat: cy, lng: cx };

      const sorted = [...collisionZone.points]
        .sort((a, b) => calculateDistance(segStart.lat, segStart.lng, a.lat, a.lng)
                      - calculateDistance(segStart.lat, segStart.lng, b.lat, b.lng));
      const v1 = applyBuffer(sorted[0], center);
      const v2 = applyBuffer(sorted[1], center);

      newPath.push({ ...v1, id: `detour-${i}-A`, name: `REROUTE_A` });
      newPath.push({ ...v2, id: `detour-${i}-B`, name: `REROUTE_B` });
      modifiedWPsCount += 2;
    }

    newPath.push(segEnd);
  }

  return { newPath, modifiedWPsCount };
};
