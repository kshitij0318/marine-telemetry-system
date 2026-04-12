const topics = require("../../shared/constants/topics");

/**
 * OAS Simulator — Dynamic, position-relative obstacle generation
 *
 * Feature 5 fix: Removed all hardcoded lat/lng obstacle positions.
 * Obstacles are now spawned dynamically relative to the ship's current
 * position and heading, so the avoidance feature works anywhere in the world.
 *
 * Obstacle lifecycle:
 *  - Every SPAWN_INTERVAL_MS a fresh batch is generated within detection range
 *  - Each obstacle lives for OBSTACLE_TTL_MS then expires
 *  - Obstacles spawn in a forward arc (heading ± SPAWN_HALF_ARC degrees)
 *    at a randomised distance between MIN_SPAWN_DIST and config.range
 */

// ─── Config ────────────────────────────────────────────────────────────────

const SPAWN_INTERVAL_MS  = 8000;  // Spawn new batch every 8 s (tunable)
const OBSTACLE_TTL_MS    = 25000; // Each obstacle lives 25 s
const SPAWN_HALF_ARC     = 70;    // degrees either side of heading
const MIN_SPAWN_DIST     = 30;    // metres — minimum spawn distance
const MAX_OBSTACLES      = 8;     // cap on concurrent obstacles

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Move lat/lng by `distanceM` metres along `bearingDeg` */
function destPoint(lat, lng, bearingDeg, distanceM) {
  const R   = 6371e3;
  const d   = distanceM / R;
  const brg = (bearingDeg * Math.PI) / 180;
  const φ1  = (lat * Math.PI) / 180;
  const λ1  = (lng * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) +
    Math.cos(φ1) * Math.sin(d) * Math.cos(brg)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(brg) * Math.sin(d) * Math.cos(φ1),
    Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (((λ2 * 180) / Math.PI) + 540) % 360 - 180, // normalise to [-180,180]
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 +
             Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y   = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x   = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.cos((lon2 - lon1) * Math.PI / 180);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// ─── Simulator ──────────────────────────────────────────────────────────────

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.OAS.buildDataTopic(vesselId, "OAS01");
    const config    = {
      range: 200,
      frequency: "9.4 GHz",
      beamWidth: 120,
      pulseLength: "0.08 µs",
      mode: "NAVIGATION",
    };

    // Active obstacle store: { id, lat, lng, spawnedAt }
    let activeObstacles = [];
    let obstacleCounter = 0;

    // Smoothed performance metrics (low-pass filtered)
    let pingRate       = 10;
    let signalStrength = 85;
    let noiseFloor     = 12;
    let targetStrength = -60;
    let tickCount      = 0;
    let totalScans     = 0;
    let lastSpawnTime  = 0;

    /**
     * Spawn a fresh batch of obstacles ahead of the ship.
     * Replaced hardcoded lat/lng list with dynamic position-relative generation.
     */
    function spawnObstacles() {
      const now     = Date.now();
      const heading = shipState.heading;
      const count   = 2 + Math.floor(Math.random() * 4); // 2–5 per batch

      const newObs = [];
      for (let i = 0; i < count && activeObstacles.length + newObs.length < MAX_OBSTACLES; i++) {
        // Random bearing within forward arc
        const bearingOffset = (Math.random() * 2 - 1) * SPAWN_HALF_ARC;
        const bearing       = (heading + bearingOffset + 360) % 360;

        // Random distance between MIN_SPAWN_DIST and config.range
        const distance = MIN_SPAWN_DIST + Math.random() * (config.range - MIN_SPAWN_DIST);

        const pos = destPoint(shipState.lat, shipState.lng, bearing, distance);

        newObs.push({
          id:        `OBS-${++obstacleCounter}`,
          lat:       pos.lat,
          lng:       pos.lng,
          spawnedAt: now,
        });
      }

      activeObstacles = [...activeObstacles, ...newObs];
      lastSpawnTime   = now;
    }

    setInterval(() => {
      const now = Date.now();
      tickCount++;

      // Expire old obstacles
      activeObstacles = activeObstacles.filter(o => now - o.spawnedAt < OBSTACLE_TTL_MS);

      // Spawn new batch if interval elapsed or no obstacles remain
      if (now - lastSpawnTime >= SPAWN_INTERVAL_MS || activeObstacles.length === 0) {
        spawnObstacles();
      }

      // Build detections from active obstacles within range
      const detections = [];
      const headingRad = (shipState.heading * Math.PI) / 180;

      for (const obs of activeObstacles) {
        const distance = calculateDistance(shipState.lat, shipState.lng, obs.lat, obs.lng);
        if (distance > config.range) continue;

        const absoluteBearing = calculateBearing(shipState.lat, shipState.lng, obs.lat, obs.lng);
        // Relative angle: 0 = dead ahead, clockwise positive
        let relAngle = ((absoluteBearing - shipState.heading + 360) % 360);

        let threat = "low";
        if (distance < 50)       threat = "high";
        else if (distance <= 120) threat = "medium";

        detections.push({
          id:       obs.id,
          angle:    +relAngle.toFixed(1),
          distance: +distance.toFixed(1),
          threat,
          worldLat: obs.lat,
          worldLng: obs.lng,
        });
      }

      totalScans++;

      // Smooth performance metrics
      const tPing   = 10;
      const tSig    = 85 + 10 * Math.sin(tickCount / 180);
      const tNoise  = 12 + 3  * Math.sin(tickCount / 90);
      const tStr    = detections.length > 0 ? -25 + detections[0].distance * 0.05 : -60;

      pingRate       += (tPing  - pingRate)       * 0.04;
      signalStrength += (tSig   - signalStrength) * 0.04;
      noiseFloor     += (tNoise - noiseFloor)     * 0.04;
      targetStrength += (tStr   - targetStrength) * 0.04;

      const payload = {
        vesselId,
        deviceId: "OAS01",
        timestamp: now,
        detections,
        range: config.range,
        config,
        performance: {
          pingRate:      +pingRate.toFixed(1),
          signalStrength:+signalStrength.toFixed(1),
          noiseFloor:    +noiseFloor.toFixed(1),
          targetStrength:+targetStrength.toFixed(1),
        },
        status: detections.length > 0 ? "ACTIVE" : "SCANNING",
      };

      client.publish(dataTopic, JSON.stringify(payload));
    }, 100); // 10 Hz
  },
};