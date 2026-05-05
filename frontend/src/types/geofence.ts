
export type GeofenceMode = 'exclusion' | 'containment';

export interface Geofence {
  id: string;
  mode: GeofenceMode;
  points: { lat: number; lng: number }[];
  label: string;
  visible: boolean;
  active: boolean; // enforced during mission
}
