// Movement states — only ONE active at a time
export type MovementAction = 'TRANSIT' | 'FOLLOW_PATH' | 'LOITER' | 'HOLD' | 'RETURN_TO_HOME';

// Depth states — only ONE active
export type DepthAction = 'DIVE' | 'SURFACE' | 'NEUTRAL';

// Control overrides — highest priority
export type OverrideAction = 'EMERGENCY_STOP' | 'PAUSE';

// Stackable add-ons — can combine if non-conflicting
export type AddonAction = 'SONAR_SCAN' | 'SURVEY' | 'CHANGE_SPEED' | 'CHANGE_HEADING'
  | 'GEOFENCE_AVOIDANCE' | 'DYNAMIC_REROUTE' | 'DEPLOY_PAYLOAD' | 'WAIT';

export interface WaypointActionConfig {
  movement?: MovementAction;
  depth?: DepthAction;
  override?: OverrideAction;
  addons: AddonAction[];
  params: {
    targetSpeed?: number;      // knots — for CHANGE_SPEED
    targetHeading?: number;    // degrees — for CHANGE_HEADING
    waitDuration?: number;     // seconds — for WAIT
    loiterRadius?: number;     // meters — for LOITER
    loiterDirection?: 'cw' | 'ccw'; // for LOITER
    diveDepth?: number;        // meters — for DIVE
    surveyDuration?: number;   // seconds — for SURVEY
    sonarRange?: number;       // meters — for SONAR_SCAN
    payloadType?: string;      // for DEPLOY_PAYLOAD
  };
}

export function validateActions(config: WaypointActionConfig): { valid: boolean; error?: string } {
  const { movement, addons } = config;

  // HOLD conflicts
  if (movement === 'HOLD' && addons.includes('WAIT')) {
    // HOLD + WAIT is valid (vessel stays, waits)
  }
  if (movement === 'HOLD' && (movement === 'TRANSIT' || movement === 'FOLLOW_PATH' || movement === 'LOITER')) {
    return { valid: false, error: 'HOLD conflicts with other motion actions' };
  }

  // LOITER conflicts
  if (movement === 'LOITER' && addons.includes('CHANGE_HEADING')) {
    return { valid: false, error: 'LOITER manages its own heading — CHANGE_HEADING conflicts' };
  }

  // DEPLOY_PAYLOAD requires stationary
  if (addons.includes('DEPLOY_PAYLOAD') && movement === 'TRANSIT') {
    return { valid: false, error: 'DEPLOY_PAYLOAD requires HOLD or slow speed — not TRANSIT' };
  }

  // WAIT conflicts with motion
  if (addons.includes('WAIT') && (movement === 'TRANSIT' || movement === 'FOLLOW_PATH' || movement === 'LOITER')) {
    return { valid: false, error: 'WAIT cannot be combined with active motion' };
  }

  // EMERGENCY_STOP overrides everything
  if (config.override === 'EMERGENCY_STOP') {
    return { valid: true }; // always valid, overrides all
  }

  return { valid: true };
}

// Valid combination examples for the UI to suggest
export const VALID_COMBOS = [
  { movement: 'HOLD', addons: ['SURVEY', 'SONAR_SCAN'] as AddonAction[], label: 'Hold + Survey' },
  { movement: 'HOLD', addons: ['DEPLOY_PAYLOAD'] as AddonAction[], label: 'Hold + Deploy' },
  { movement: 'HOLD', addons: ['WAIT'] as AddonAction[], label: 'Hold + Wait' },
  { movement: 'LOITER', addons: ['SURVEY', 'SONAR_SCAN'] as AddonAction[], label: 'Loiter + Survey' },
  { movement: 'TRANSIT', addons: ['SONAR_SCAN'] as AddonAction[], label: 'Transit + Scan' },
  { movement: 'TRANSIT', addons: ['CHANGE_SPEED'] as AddonAction[], label: 'Transit + Speed Change' },
  { movement: 'TRANSIT', addons: ['DYNAMIC_REROUTE'] as AddonAction[], label: 'Transit + Auto-Reroute' },
];
