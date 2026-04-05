const topics = require("../../shared/constants/topics");

/**
 * GNSS Simulator — with coastal land avoidance
 *
 * Operating area: Arabian Sea near Mumbai (18.9000, 72.6500)
 * The vessel tracks incremental positions at 10Hz.
 * Land avoidance: a set of simplified coastal bounding rectangles
 * for the Mumbai/Konkan coast are checked each tick. If the next
 * position would enter land, the vessel heading is reflected and
 * it is pushed back into open water.
 */

// ---- Land polygon definitions (lat/lng bounding boxes) ----
// Each entry is [latMin, latMax, lngMin, lngMax]
// These cover the key land masses the vessel could drift into
// from its starting position in the Arabian Sea.
const LAND_BOXES = [
  // Mumbai peninsula mainland
  [18.87, 19.28, 72.78, 73.05],
  // Thane / Navi Mumbai coast (east)
  [19.03, 19.28, 73.00, 73.10],
  // Raigad / Alibag coast (south of Mumbai)
  [18.60, 18.90, 72.80, 72.92],
  // Gujarat coast (north)
  [19.30, 20.50, 72.60, 73.00],
  // Goa / Konkan coast (a wide coastal band further south)
  [15.00, 18.60, 73.50, 74.50],
  // General Indian western coast safety margin
  [18.60, 19.30, 73.05, 73.30],
];

/**
 * Returns true if the given lat/lng is inside any land bounding box.
 */
function isOnLand(lat, lng) {
  for (const [latMin, latMax, lngMin, lngMax] of LAND_BOXES) {
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return true;
    }
  }
  return false;
}

/**
 * Push position back into water and reflect heading.
 * Called when the vessel has just moved onto land.
 */
function bounceOffLand(shipState, prevLat, prevLng) {
  // Revert to pre-movement position
  shipState.lat = prevLat;
  shipState.lng = prevLng;
  // Reflect heading: turn 135–180° away from coast
  shipState.heading = (shipState.heading + 150 + (Math.random() * 60 - 30) + 360) % 360;
}

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.GNSS.buildDataTopic(vesselId, "GNSS01");
    
    let targetSpeed = shipState.speed || 6;
    let nextSpeedChangeTime = Date.now() + 20000 + Math.random() * 20000;
    
    let targetHeading = shipState.heading;
    let nextHeadingChangeTime = Date.now() + 15000 + Math.random() * 10000;
    
    let satellites = 10;
    let targetSatellites = 10;
    let nextSatChangeTime = Date.now() + 45000 + Math.random() * 45000;
    
    let hdop = 1.0;
    
    // Track consecutive land-bounce ticks to prevent getting stuck
    let bounceTicks = 0;
    
    let missionActive = false;
    let missionWaypoints = [];
    let currentWaypointIndex = 0;
    const WAYPOINT_ARRIVAL_RADIUS = 20;

    client.subscribe("COMMANDS/MISSION");
    client.on("message", (topic, message) => {
      if (topic === "COMMANDS/MISSION") {
        try {
          const cmd = JSON.parse(message.toString());
          if (cmd.type === "START_MISSION") {
            missionWaypoints = cmd.waypoints;
            currentWaypointIndex = 0;
            missionActive = true;
          } else if (cmd.type === "STOP_MISSION") {
            missionActive = false;
            missionWaypoints = [];
          }
        } catch (e) {
          console.error("Error parsing mission command:", e);
        }
      }
    });

    function missionTick() {
      if (!missionActive || missionWaypoints.length === 0) return;
      
      const target = missionWaypoints[currentWaypointIndex];
      if (!target) { missionActive = false; return; }
      
      const dLat = target.lat - shipState.lat;
      const dLng = target.lng - shipState.lng;
      
      const targetBearing = (Math.atan2(dLng, dLat) * 180/Math.PI + 360) % 360;
      
      const delta = ((targetBearing - shipState.heading + 540) % 360) - 180;
      shipState.heading += Math.max(-2, Math.min(2, delta));
      shipState.heading = (shipState.heading + 360) % 360;
      
      const dist = Math.sqrt((dLat * 111320)**2 + (dLng * 111320 * Math.cos(shipState.lat * Math.PI/180))**2);
      if (dist < WAYPOINT_ARRIVAL_RADIUS) {
        currentWaypointIndex++;
        if (currentWaypointIndex >= missionWaypoints.length) {
          missionActive = false;
        }
      }
    }
    
    let tickCount = 0;
    const intervalMs = 100;
    
    setInterval(() => {
      tickCount++;
      const now = Date.now();
      
      if (now > nextSpeedChangeTime) {
        targetSpeed = 4 + Math.random() * 6;
        nextSpeedChangeTime = now + 20000 + Math.random() * 20000;
      }
      
      if (missionActive) {
        shipState.speed = shipState.speed + (10 - shipState.speed) * 0.03;
        shipState.speed = Math.max(2, Math.min(12, shipState.speed));
        missionTick();
      } else {
        shipState.speed = shipState.speed + (targetSpeed - shipState.speed) * 0.03;
        shipState.speed = Math.max(2, Math.min(12, shipState.speed));

        if (now > nextHeadingChangeTime) {
          targetHeading = shipState.heading + (Math.random() * 40 - 20);
          nextHeadingChangeTime = now + 15000 + Math.random() * 10000;
        }
        
        let hDelta = ((targetHeading - shipState.heading + 540) % 360) - 180;
        let hStep = Math.max(-0.4, Math.min(0.4, hDelta));
        shipState.heading = (shipState.heading + hStep + 360) % 360;
      }

      // --- Position update with land avoidance ---
      const speedMs = shipState.speed * 0.514444;
      const headingRad = (shipState.heading - 90) * Math.PI / 180;
      const metersPerTick = speedMs * (intervalMs / 1000);
      
      const prevLat = shipState.lat;
      const prevLng = shipState.lng;
      
      const nextLat = shipState.lat + (metersPerTick * Math.cos(headingRad)) / 111320;
      const nextLng = shipState.lng + (metersPerTick * Math.sin(headingRad)) / (111320 * Math.cos(shipState.lat * Math.PI / 180));

      if (isOnLand(nextLat, nextLng)) {
        // Bounce off coast — reflect heading, stay at current position
        bounceOffLand(shipState, prevLat, prevLng);
        bounceTicks++;

        // If stuck bouncing for more than 50 ticks, escape toward open ocean
        if (bounceTicks > 50) {
          shipState.heading = 270; // Due west — into open Arabian Sea
          bounceTicks = 0;
        }
      } else {
        shipState.lat = nextLat;
        shipState.lng = nextLng;
        bounceTicks = 0;
      }

      // Publish every 1s (10 ticks)
      if (tickCount % 10 === 0) {
        if (now > nextSatChangeTime) {
           targetSatellites = satellites + (Math.random() > 0.5 ? 1 : -1);
           targetSatellites = Math.max(8, Math.min(12, targetSatellites));
           
           if (Math.abs(satellites - targetSatellites) > 1) {
             satellites += Math.sign(targetSatellites - satellites);
           } else {
             satellites = targetSatellites;
           }
           nextSatChangeTime = now + 45000 + Math.random() * 45000; 
        }
        
        const targetHdop = 1.0 + ((12 - satellites) * 0.375) + (Math.random() * 0.2);
        hdop = hdop + (targetHdop - hdop) * 0.1;

        const payload = {
          vesselId,
          deviceId: "GNSS01",
          timestamp: now,
          latitude: +shipState.lat.toFixed(6),
          longitude: +shipState.lng.toFixed(6),
          heading: +shipState.heading.toFixed(2),
          course: +shipState.heading.toFixed(2),
          altitude: +(15 + Math.random() * 2).toFixed(1),
          speed: +shipState.speed.toFixed(2),
          satellites,
          hdop,
          status: "ACTIVE"
        };
        client.publish(dataTopic, JSON.stringify(payload));
      }
    }, 100);
  }
};