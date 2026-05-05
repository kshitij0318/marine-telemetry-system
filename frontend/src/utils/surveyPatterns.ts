/**
 * Survey Pattern Generation Utilities
 * All math uses radians internally, returns lat/lng degrees.
 */

const DEG_PER_METER_LAT = 1 / 111320;

function degPerMeterLng(lat: number) {
  return 1 / (111320 * Math.cos((lat * Math.PI) / 180));
}

function offsetPoint(origin: { lat: number; lng: number }, dx: number, dy: number) {
  return {
    lat: origin.lat + dy * DEG_PER_METER_LAT,
    lng: origin.lng + dx * degPerMeterLng(origin.lat),
  };
}

function rotate2D(x: number, y: number, angle: number) {
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

export function generateLawnmower(params: {
  center: { lat: number; lng: number };
  widthM: number; // total survey width in meters
  heightM: number; // total survey height in meters
  spacingM: number; // track spacing in meters
  headingDeg: number; // track direction (0=east-west lines)
  turnRadiusM: number; // for rounded turns (cosmetic smoothing)
}): { lat: number; lng: number }[] {
  const { center, widthM, heightM, spacingM, headingDeg } = params;
  const angle = (headingDeg * Math.PI) / 180;
  const waypoints: { lat: number; lng: number }[] = [];
  const numTracks = Math.floor(heightM / spacingM) + 1;

  for (let i = 0; i < numTracks; i++) {
    const yOffset = -heightM / 2 + i * spacingM;
    const leftward = i % 2 === 0;
    const x1 = leftward ? -widthM / 2 : widthM / 2;
    const x2 = leftward ? widthM / 2 : -widthM / 2;

    const p1 = rotate2D(x1, yOffset, angle);
    const p2 = rotate2D(x2, yOffset, angle);

    waypoints.push(offsetPoint(center, p1.x, p1.y));
    waypoints.push(offsetPoint(center, p2.x, p2.y));
  }
  return waypoints;
}

export function generateSpiral(params: {
  center: { lat: number; lng: number };
  maxRadiusM: number;
  spacingM: number;
  clockwise?: boolean;
}): { lat: number; lng: number }[] {
  const { center, maxRadiusM, spacingM, clockwise = true } = params;
  const b = spacingM / (2 * Math.PI); // growth rate
  const dir = clockwise ? 1 : -1;
  const waypoints: { lat: number; lng: number }[] = [];
  const angleStep = 0.2; // radians

  for (let theta = 0; ; theta += angleStep) {
    const r = b * theta;
    if (r > maxRadiusM) break;
    const x = r * Math.cos(dir * theta);
    const y = r * Math.sin(dir * theta);
    waypoints.push(offsetPoint(center, x, y));
  }
  return waypoints;
}

export function generateExpandingSquare(params: {
  center: { lat: number; lng: number };
  stepM: number;
  maxExtentM: number;
}): { lat: number; lng: number }[] {
  const { center, stepM, maxExtentM } = params;
  const waypoints: { lat: number; lng: number }[] = [center];
  let x = 0, y = 0, step = stepM;
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]; // E N W S
  let dirIdx = 0, repeatCount = 0;

  while (Math.max(Math.abs(x), Math.abs(y)) <= maxExtentM) {
    for (let rep = 0; rep < 2; rep++) {
      const [dx, dy] = dirs[dirIdx % 4];
      x += dx * step;
      y += dy * step;
      if (Math.max(Math.abs(x), Math.abs(y)) > maxExtentM) break;
      waypoints.push(offsetPoint(center, x, y));
      dirIdx++;
    }
    step += stepM;
    repeatCount++;
    if (repeatCount > 100) break; // safety
  }
  return waypoints;
}

export function generateRadial(params: {
  center: { lat: number; lng: number };
  maxRadiusM: number;
  angleStepDeg: number;
}): { lat: number; lng: number }[] {
  const { center, maxRadiusM, angleStepDeg } = params;
  const waypoints: { lat: number; lng: number }[] = [];
  let outward = true;

  for (let deg = 0; deg < 360; deg += angleStepDeg) {
    const rad = (deg * Math.PI) / 180;
    const r = outward ? maxRadiusM : 0;
    waypoints.push(center); // always return to center
    waypoints.push(offsetPoint(center, r * Math.cos(rad), r * Math.sin(rad)));
    outward = !outward;
  }
  return waypoints;
}

export function generateCrosshatch(params: {
  center: { lat: number; lng: number };
  widthM: number;
  heightM: number;
  spacingM: number;
  headingDeg: number;
  turnRadiusM: number;
}): { lat: number; lng: number }[] {
  const pass1 = generateLawnmower(params);
  const pass2 = generateLawnmower({
    ...params,
    headingDeg: params.headingDeg + 90,
  });
  return [...pass1, ...pass2];
}
