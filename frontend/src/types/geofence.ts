// ── Geofence type definitions ─────────────────────────────────────────────────
// Files touching this type:
//   - MapCommandCenter.tsx (drawing, rendering, validation hook)
//   - geofenceValidator.ts (validation logic)
//   - shipState.js (backend enforcement via COMMANDS/MISSION payload)

export type GeofenceMode = 'exclusion' | 'containment';

export interface Geofence {
  id: string;
  mode: GeofenceMode;
  // 'exclusion' = ship must NOT enter this area
  // 'containment' = ship must STAY inside this area
  points: { lat: number; lng: number }[];
  label: string;
  visible: boolean;
  active: boolean; // enforced during mission
}
