export type OASSensorPosition = 
  | 'bow' 
  | 'starboard-bow' 
  | 'starboard-quarter' 
  | 'stern' 
  | 'port-quarter' 
  | 'port-bow';

export interface OASSensorDefinition {
  id: string;
  position: OASSensorPosition;
  label: string;
  centerAngle: number; // 0 is bow, 90 is starboard
  fov: number; // field of view in degrees
}

export const OAS_SENSORS: Record<OASSensorPosition, OASSensorDefinition> = {
  'bow': { id: 'OAS-CAM-1', position: 'bow', label: 'Bow', centerAngle: 0, fov: 60 },
  'starboard-bow': { id: 'OAS-CAM-2', position: 'starboard-bow', label: 'STBD Bow', centerAngle: 60, fov: 60 },
  'starboard-quarter': { id: 'OAS-CAM-3', position: 'starboard-quarter', label: 'STBD Quarter', centerAngle: 120, fov: 60 },
  'stern': { id: 'OAS-CAM-4', position: 'stern', label: 'Stern', centerAngle: 180, fov: 60 },
  'port-quarter': { id: 'OAS-CAM-5', position: 'port-quarter', label: 'Port Quarter', centerAngle: 240, fov: 60 },
  'port-bow': { id: 'OAS-CAM-6', position: 'port-bow', label: 'Port Bow', centerAngle: 300, fov: 60 },
};

export interface OASCamFeedPayload {
  sensorId: string;
  position: OASSensorPosition;
  status: 'active' | 'offline' | 'degraded';
  visibleTargets: Array<{
    id: string;
    threat: string;
    relativeAngleInFov: number; // -1 (left edge) to 1 (right edge)
    distance: number;
  }>;
}
