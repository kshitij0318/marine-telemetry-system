const topics = require("../../shared/constants/topics");

// FIELD AUDIT — OAS
// Field            | Backend emits | Frontend reads | Match? | Action
// detections       | Yes           | Yes            | Yes    | None
// range            | Yes           | Yes            | Yes    | None
// config           | Yes           | Yes            | Yes    | Match verified
// performance      | Yes           | Yes            | Yes    | Match verified
// statistics       | Yes           | Yes            | Yes    | None
// status           | Yes           | Yes            | Yes    | None

const SPAWN_INTERVAL_MS  = 12000; 
const OBSTACLE_TTL_MS    = 35000; 
const SPAWN_HALF_ARC     = 60;    
const MIN_SPAWN_DIST     = 40;    
const MAX_OBSTACLES      = 12;    

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

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.OAS.buildDataTopic(vesselId, "OAS01");
    const config    = { operatingRange: 200, frequency: 200.0, beamWidth: 12.5, pulseLength: 0.100, mode: "SURVEY" };

    let activeObstacles = [];
    let obstacleCounter = 0;
    let pingRate = 1.0;
    let signalStrength = 85;
    let noiseFloor = -90;
    let tickCount = 0;
    let cumulativeDetectionCount = 0;
    let lastSpawnTime = 0;

    function spawnObstacles() {
      const now = Date.now();
      const count = 2 + Math.floor(Math.random() * 3);
      const newObs = [];
      for (let i = 0; i < count && activeObstacles.length + newObs.length < MAX_OBSTACLES; i++) {
        const bearing = (shipState.heading + (Math.random() * 2 - 1) * SPAWN_HALF_ARC + 360) % 360;
        const distance = MIN_SPAWN_DIST + Math.random() * (config.operatingRange - MIN_SPAWN_DIST - 20);
        const pos = destPoint(shipState.lat, shipState.lng, bearing, distance);
        newObs.push({ id: `OBS-${++obstacleCounter}`, lat: pos.lat, lng: pos.lng, spawnedAt: now, driftDir: Math.random() * 360 });
      }
      activeObstacles = [...activeObstacles, ...newObs];
      lastSpawnTime = now;
    }

    setInterval(() => {
      const now = Date.now();
      tickCount++;

      // 1. Lifecycle & Drift
      activeObstacles = activeObstacles.filter(o => now - o.spawnedAt < OBSTACLE_TTL_MS);
      activeObstacles.forEach(o => {
        // Very slow drift 0.2m/s
        const driftDist = 0.2 * 0.1;
        const p = destPoint(o.lat, o.lng, o.driftDir, driftDist);
        o.lat = p.lat; o.lng = p.lng;
      });

      if (now - lastSpawnTime >= SPAWN_INTERVAL_MS || activeObstacles.length === 0) spawnObstacles();

      // 2. Detections
      const detections = [];
      for (const obs of activeObstacles) {
        const distance = calculateDistance(shipState.lat, shipState.lng, obs.lat, obs.lng);
        if (distance > config.operatingRange) continue;
        const absoluteBearing = calculateBearing(shipState.lat, shipState.lng, obs.lat, obs.lng);
        let relAngle = ((absoluteBearing - shipState.heading + 360) % 360);
        // Correct for Sonar display: dead ahead is 90 in canvas logic usually,
        // but frontend SonarDisplay does (det.angle - 90).
        // If dead ahead is 0 deg from backend: (0 - 90) = -90 rad?
        // Wait, SonarDisplay uses:
        // const angle = (det.angle - 90) * Math.PI / 180;
        // If det.angle is 90, result is 0 rad (straight right).
        // If det.angle is 0, result is -90 deg (straight up).
        // So dead ahead should be 0 from backend.

        detections.push({ id: obs.id, angle: +relAngle.toFixed(1), distance: +distance.toFixed(1), threat: distance < 60 ? "high" : distance < 130 ? "medium" : "low" });
      }
      cumulativeDetectionCount += (tickCount % 10 === 0 ? detections.length : 0);

      // 3. Performance Evolution
      pingRate = 1.0 + 0.1 * Math.sin(now / 15000);
      signalStrength = 85 + 5 * Math.sin(now / 20000) + (Math.random() - 0.5) * 2;
      noiseFloor = -90 + 3 * Math.cos(now / 25000) + (Math.random() - 0.5) * 1;
      const targetStr = detections.length > 0 ? -40 + 5 * Math.sin(now / 10000) : -95;

      const payload = {
        vesselId, deviceId: "OAS01", timestamp: now,
        detections, range: config.operatingRange,
        config: { ...config, frequency: +(200 + 5 * Math.sin(now / 30000)).toFixed(1), pulseLength: +(0.1 + 0.02 * Math.sin(now / 40000)).toFixed(3) },
        performance: { pingRate: +pingRate.toFixed(2), signalStrength: +signalStrength.toFixed(1), noiseFloor: +noiseFloor.toFixed(1), targetStrength: +targetStr.toFixed(1) },
        statistics: {
          totalDetections: Math.floor(cumulativeDetectionCount),
          maxRange: detections.length > 0 ? +Math.max(...detections.map(d => d.distance)).toFixed(1) : 0,
          threatCounts: { high: detections.filter(d => d.threat === 'high').length, medium: detections.filter(d => d.threat === 'medium').length, low: detections.filter(d => d.threat === 'low').length }
        },
        status: detections.length > 0 ? "ACTIVE" : "SCANNING"
      };

      if (tickCount % 5 === 0) client.publish(dataTopic, JSON.stringify(payload));
    }, 200);
  }
};