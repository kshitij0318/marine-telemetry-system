const topics = require("../../shared/constants/topics");

// FIELD AUDIT — RADAR
// Field               | Backend emits | Frontend reads | Match? | Action
// targets             | Yes           | Yes            | Yes    | Replaces detections
// rotationAngle       | Yes           | Yes            | Yes    | New
// range               | Yes           | Yes            | Yes    | None
// config              | Yes           | Yes            | Yes    | Updated for X-band
// performance         | Yes           | Yes            | Yes    | Match verified
// statistics          | Yes           | Yes            | Yes    | None
// status              | Yes           | Yes            | Yes    | None
// suggestedManeuver   | Yes           | Yes            | Yes    | New

// Typical X-band marine radar config
const RADAR_CONFIG = {
  operatingRange: 3000, // meters
  frequency: 9.4, // GHz
  beamWidth: 2.0, // degrees
  pulseLength: 0.08, // ms
  mode: "X-BAND",
  rpm: 24
};

const WORLD_TARGETS = [
  // Close proximity, various speeds
  { id: "BUOY-A", lat: 18.9250, lng: 72.8350, speedMps: 0, course: 0, type: "NAV_MARK" },
  { id: "BUOY-B", lat: 18.9150, lng: 72.8400, speedMps: 0, course: 0, type: "NAV_MARK" },
  { id: "BUOY-C", lat: 18.9200, lng: 72.8250, speedMps: 0, course: 0, type: "NAV_MARK" },
  { id: "VESSEL-1", lat: 18.9280, lng: 72.8300, speedMps: 8.5, course: 135, type: "MERCHANT" },
  { id: "VESSEL-2", lat: 18.9100, lng: 72.8500, speedMps: 12.0, course: 315, type: "MERCHANT" },
  { id: "FISHING-1", lat: 18.9230, lng: 72.8450, speedMps: 2.0, course: 45, type: "FISHING" },
  { id: "FISHING-2", lat: 18.9180, lng: 72.8300, speedMps: 3.0, course: 90, type: "FISHING" },
  { id: "FERRY-1", lat: 18.9300, lng: 72.8400, speedMps: 15.0, course: 180, type: "FERRY" },
  { id: "PATROL-1", lat: 18.9150, lng: 72.8200, speedMps: 20.0, course: 75, type: "MILITARY" },
  { id: "YACHT-1", lat: 18.9200, lng: 72.8550, speedMps: 6.0, course: 220, type: "LEISURE" },
  { id: "VESSEL-3", lat: 18.9050, lng: 72.8300, speedMps: 10.0, course: 10, type: "MERCHANT" },
  { id: "FISHING-3", lat: 18.9350, lng: 72.8250, speedMps: 2.5, course: 110, type: "FISHING" },
  { id: "TUG-1", lat: 18.9220, lng: 72.8420, speedMps: 4.0, course: 260, type: "MERCHANT" }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y   = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x   = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function destPoint(lat, lng, bearingDeg, distanceM) {
  const R   = 6371e3;
  const d   = distanceM / R;
  const brg = (bearingDeg * Math.PI) / 180;
  const φ1  = (lat * Math.PI) / 180;
  const λ1  = (lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brg));
  const λ2 = λ1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lng: (((λ2 * 180) / Math.PI) + 540) % 360 - 180 };
}

function computeCPA(shipState, target) {
  // Convert lat/lng to local metric grid (x, y)
  // Ship is at origin (0,0)
  const dist = calculateDistance(shipState.lat, shipState.lng, target.lat, target.lng);
  const brg = calculateBearing(shipState.lat, shipState.lng, target.lat, target.lng) * Math.PI / 180;
  const targetX = dist * Math.sin(brg);
  const targetY = dist * Math.cos(brg);

  // Ship velocity vector
  const shipSpeedMps = shipState.speed || 0;
  const shipHdg = (shipState.heading || 0) * Math.PI / 180;
  const shipVx = shipSpeedMps * Math.sin(shipHdg);
  const shipVy = shipSpeedMps * Math.cos(shipHdg);

  // Target velocity vector
  const tgtSpeed = target.speedMps;
  const tgtCourse = target.course * Math.PI / 180;
  const tgtVx = tgtSpeed * Math.sin(tgtCourse);
  const tgtVy = tgtSpeed * Math.cos(tgtCourse);

  // Relative position and velocity
  const relX = targetX;
  const relY = targetY;
  const relVx = tgtVx - shipVx;
  const relVy = tgtVy - shipVy;

  const vRelSq = relVx * relVx + relVy * relVy;
  if (vRelSq < 0.001) {
    // Relative speeds are too similar
    return { cpa: dist, tcpa: 0 };
  }

  const tcpa = -(relX * relVx + relY * relVy) / vRelSq;
  
  if (tcpa < 0) {
    // Target is moving away
    return { cpa: dist, tcpa: 0 };
  }

  const cpaX = relX + relVx * tcpa;
  const cpaY = relY + relVy * tcpa;
  const cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);

  return { cpa, tcpa };
}

function getColregsAdvice(shipHeading, absoluteBearing, threat) {
  if (threat === 'low') return null;
  const relBrg = ((absoluteBearing - shipHeading + 360) % 360);
  
  if (relBrg > 345 || relBrg < 15) {
    return { action: 'Altering course to starboard', reason: 'Head-on situation (Rule 14)' };
  } else if (relBrg >= 15 && relBrg <= 112.5) {
    return { action: 'Maintain course/speed but monitor', reason: 'Target on starboard bow (Rule 15 - give way vessel)' };
  } else if (relBrg >= 247.5 && relBrg <= 345) {
    return { action: 'Maintain course/speed', reason: 'Target on port bow (Rule 15 - stand on vessel)' };
  }
  return { action: 'Monitor closely', reason: 'Overtaking or crossing from astern' };
}

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.RADAR.buildDataTopic(vesselId, "RADAR01");

    let rotationAngle = 0;
    let tickCount = 0;
    let lastSimTime = Date.now();
    let totalDetections = 0;

    // Deep copy targets to allow independent updates
    const activeTargets = JSON.parse(JSON.stringify(WORLD_TARGETS));

    shipState.on('tick', (state) => {
      const now = Date.now();
      const dt = (now - lastSimTime) / 1000;
      lastSimTime = now;
      tickCount++;

      // Update radar rotation (24 RPM = 144 deg/sec)
      rotationAngle = (rotationAngle + 144 * dt) % 360;

      // Update target positions
      activeTargets.forEach(t => {
        if (t.speedMps > 0) {
          const p = destPoint(t.lat, t.lng, t.course, t.speedMps * dt);
          t.lat = p.lat;
          t.lng = p.lng;
        }
      });

      const processedTargets = [];
      let highThreats = 0, medThreats = 0, lowThreats = 0;
      let recommendedManeuver = null;
      let highestRiskScore = -1;

      // Radar processing logic
      activeTargets.forEach(t => {
        const dist = calculateDistance(state.lat, state.lng, t.lat, t.lng);
        if (dist > RADAR_CONFIG.operatingRange) return;

        const absBrg = calculateBearing(state.lat, state.lng, t.lat, t.lng);
        const relBrg = ((absBrg - state.heading + 360) % 360);

        const { cpa, tcpa } = computeCPA(state, t);

        // Collision Risk Index (0 to 1)
        // High risk if CPA < 200m and TCPA < 180s
        let cri = 0;
        if (cpa < 500 && tcpa < 300 && tcpa > 0) {
           cri = Math.max(0, 1 - (cpa / 500) * 0.5 - (tcpa / 300) * 0.5);
        }

        let threat = 'low';
        if (cri > 0.7) {
          threat = 'critical';
          highThreats++;
        } else if (cri > 0.4 || (dist < 200)) {
          threat = 'high';
          highThreats++;
        } else if (cri > 0.1 || (dist < 500)) {
          threat = 'medium';
          medThreats++;
        } else {
          lowThreats++;
        }

        if (cri > highestRiskScore && threat !== 'low') {
          highestRiskScore = cri;
          recommendedManeuver = getColregsAdvice(state.heading, absBrg, threat);
        }

        processedTargets.push({
          id: t.id,
          type: t.type,
          worldLat: +t.lat.toFixed(6),
          worldLng: +t.lng.toFixed(6),
          absoluteBearingDeg: +absBrg.toFixed(1),
          bearingDeg: +relBrg.toFixed(1),
          rangem: +dist.toFixed(1),
          speedMps: t.speedMps,
          courseDeg: t.course,
          cpa: +cpa.toFixed(1),
          tcpa: +tcpa.toFixed(1),
          cri: +cri.toFixed(3),
          threat
        });
      });

      totalDetections += processedTargets.length;

      const oasSensors = [
        { id: 'OAS-CAM-1', position: 'bow', center: 0 },
        { id: 'OAS-CAM-2', position: 'starboard-bow', center: 60 },
        { id: 'OAS-CAM-3', position: 'starboard-quarter', center: 120 },
        { id: 'OAS-CAM-4', position: 'stern', center: 180 },
        { id: 'OAS-CAM-5', position: 'port-quarter', center: 240 },
        { id: 'OAS-CAM-6', position: 'port-bow', center: 300 }
      ].map(sensor => {
        const fov = 60;
        const visibleTargets = processedTargets.filter(t => {
          let diff = (t.bearingDeg - sensor.center + 360) % 360;
          if (diff > 180) diff -= 360;
          return Math.abs(diff) <= fov / 2;
        }).map(t => {
          let diff = (t.bearingDeg - sensor.center + 360) % 360;
          if (diff > 180) diff -= 360;
          return {
            id: t.id,
            threat: t.threat,
            relativeAngleInFov: diff / (fov / 2), // -1 to 1
            distance: t.rangem
          };
        });

        return {
          sensorId: sensor.id,
          position: sensor.position,
          status: 'active',
          visibleTargets
        };
      });

      const payload = {
        vesselId, deviceId: "RADAR01", timestamp: now,
        rotationAngle: +rotationAngle.toFixed(1),
        targets: processedTargets,
        detections: processedTargets, // Keep backward compatibility for Phase 1 components temporarily
        oasSensors,
        range: RADAR_CONFIG.operatingRange,
        config: RADAR_CONFIG,
        performance: {
          pingRate: RADAR_CONFIG.rpm / 60,
          signalStrength: 95.0 + (Math.random() * 5 - 2.5),
          noiseFloor: -92.0 + (Math.random() * 2),
          targetStrength: processedTargets.length > 0 ? -35.0 : -95.0
        },
        statistics: {
          totalDetections,
          maxRange: processedTargets.length > 0 ? Math.max(...processedTargets.map(t => t.rangem)) : 0,
          threatCounts: { high: highThreats, medium: medThreats, low: lowThreats }
        },
        suggestedManeuver: recommendedManeuver,
        status: "ACTIVE"
      };

      if (tickCount % 5 === 0) client.publish(dataTopic, JSON.stringify(payload));
    });
  }
};