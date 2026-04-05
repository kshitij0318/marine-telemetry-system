const topics = require("../../shared/constants/topics");

// Define fixed world-space obstacles near Arabian Sea starting area (18.9000, 72.6500)
const OBSTACLES = [
  { id: 'OBS-1', lat: 18.9021, lng: 72.6534 },
  { id: 'OBS-2', lat: 18.8987, lng: 72.6587 },
  { id: 'OBS-3', lat: 18.9072, lng: 72.6491 },
  { id: 'OBS-4', lat: 18.8920, lng: 72.6556 },
  { id: 'OBS-5', lat: 18.9034, lng: 72.6612 },
  { id: 'OBS-6', lat: 18.9116, lng: 72.6523 },
  { id: 'OBS-7', lat: 18.8895, lng: 72.6484 },
  { id: 'OBS-8', lat: 18.9068, lng: 72.6416 },
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI/180) * Math.cos(lat2 * Math.PI/180);
  const x = Math.cos(lat1 * Math.PI/180) * Math.sin(lat2 * Math.PI/180) -
            Math.sin(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.cos((lon2 - lon1) * Math.PI/180);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.OAS.buildDataTopic(vesselId, "OAS01");
    const config = { range: 200, frequency: "9.4 GHz", beamWidth: 120, pulseLength: "0.08 µs", mode: "NAVIGATION" };
    let totalScans = 0;
    
    // Track obstacle persistence and smoothed distances
    let activeDetections = new Map();
    
    // Echo trail: last 5 detections stored
    let echoTrail = [];
    
    let tickCount = 0;
    let pingRate = 10;
    let signalStrength = 85;
    let noiseFloor = 12;
    let targetStrength = -60;

    setInterval(() => {
      const now = Date.now();
      
      const detections = [];
      const headingRad = (shipState.heading * Math.PI) / 180;
      tickCount++;
      
      for (const obs of OBSTACLES) {
        const distance = calculateDistance(shipState.lat, shipState.lng, obs.lat, obs.lng);
        
        let detectionRecord = activeDetections.get(obs.id);
        
        if (distance <= config.range) {
          if (!detectionRecord) {
             detectionRecord = { smoothedDistance: distance, outOfRangeTicks: 0 };
          }
          detectionRecord.outOfRangeTicks = 0;
          // Smooth distance mapping physical delay
          detectionRecord.smoothedDistance += (distance - detectionRecord.smoothedDistance) * 0.15;
          activeDetections.set(obs.id, detectionRecord);
        } else {
          if (detectionRecord) {
             detectionRecord.outOfRangeTicks++;
             if (detectionRecord.outOfRangeTicks >= 3) {
                activeDetections.delete(obs.id);
                continue;
             }
             detectionRecord.smoothedDistance += (distance - detectionRecord.smoothedDistance) * 0.15;
          } else {
             continue; // Completely out of range and not tracked
          }
        }
        
        // Proper bearing mathematically implemented
        const lat1 = shipState.lat * Math.PI / 180;
        const lat2 = obs.lat * Math.PI / 180;
        const dLng = (obs.lng - shipState.lng) * Math.PI / 180;
        
        const bearingRad = Math.atan2(Math.sin(dLng)*Math.cos(lat2), Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng));
        let relativeAngleRad = ((bearingRad - headingRad + Math.PI) % (2*Math.PI)) - Math.PI;
        
        // Correct javascript modulo bug for negative values:
        if (relativeAngleRad < -Math.PI) relativeAngleRad += 2 * Math.PI;
        
        let angle = (relativeAngleRad * 180) / Math.PI;
        if (angle < 0) angle += 360;
        
        let threat = 'low';
        const smoothedDist = detectionRecord.smoothedDistance;
        if (smoothedDist < 50) threat = 'high';
        else if (smoothedDist <= 120) threat = 'medium';
        
        detections.push({
          id: obs.id,
          angle: +angle.toFixed(1),
          distance: +smoothedDist.toFixed(1),
          threat,
          worldLat: obs.lat,
          worldLng: obs.lng
        });
      }

      if (detections.length > 0) {
        echoTrail.push({ detections: [...detections], timestamp: now });
        if (echoTrail.length > 5) echoTrail.shift();
      }

      totalScans++;

      totalScans++;

      const targetPingRate = 10;
      const targetSignal = 85 + 10 * Math.sin(tickCount / 180);
      const targetNoise = 12 + 3 * Math.sin(tickCount / 90);
      const targetStrengthVal = detections.length > 0 ? -25 + detections[0].distance * 0.05 : -60;
      
      pingRate += (targetPingRate - pingRate) * 0.04;
      signalStrength += (targetSignal - signalStrength) * 0.04;
      noiseFloor += (targetNoise - noiseFloor) * 0.04;
      targetStrength += (targetStrengthVal - targetStrength) * 0.04;

      const payload = {
        vesselId,
        deviceId: "OAS01",
        timestamp: now,
        detections,
        range: config.range,
        config,
        performance: {
          pingRate: +pingRate.toFixed(1),
          signalStrength: +signalStrength.toFixed(1),
          noiseFloor: +noiseFloor.toFixed(1),
          targetStrength: +targetStrength.toFixed(1)
        },
        status: detections.length > 0 ? "ACTIVE" : "SCANNING"
      };
      
      client.publish(dataTopic, JSON.stringify(payload));
    }, 100); // 10Hz
  }
};