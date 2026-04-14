const topics = require("../../shared/constants/topics");

// FIELD AUDIT — GNSS
// Field | Backend emits | Frontend reads | Match? | Action
// lat, lng   Yes           Yes              Yes      None
// heading    Yes           Yes              Yes      None
// speed      Yes           Yes              Yes      None
// course     Yes           Yes              Yes      Derive from heading + drift
// satellites Yes           Yes              Yes      Continuous transition
// hdop       Yes           Yes              Yes      Continuous transition
// signalQuality Yes        Yes              Yes      HDOP-derived
// status     Yes           Yes              Yes      None

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.GNSS.buildDataTopic(vesselId, "GNSS01");

    // ── Simulation State ───────────────────────────────────────────────────
    let navTarget = null; // { lat, lng }
    let missionWaypoints = [];
    let currentWaypointIndex = 0;
    let missionActive = false;

    let satellites = 10;
    let hdop = 1.0;
    let tickCount = 0;
    const intervalMs = 100;

    // ── MQTT Commands ──────────────────────────────────────────────────────
    client.subscribe("COMMANDS/MISSION");
    client.subscribe("COMMANDS/NAVIGATION");

    client.on("message", (topic, message) => {
      try {
        const cmd = JSON.parse(message.toString());
        if (topic === "COMMANDS/MISSION") {
          if (cmd.type === "START_MISSION") {
            missionWaypoints = cmd.waypoints || [];
            currentWaypointIndex = 0;
            missionActive = true;
            navTarget = null; // Mission overrides Navigation
          } else if (cmd.type === "STOP_MISSION") {
            missionActive = false;
          }
        } else if (topic === "COMMANDS/NAVIGATION") {
          if (cmd.type === "SET_NAVIGATION_DESTINATION") {
            navTarget = { lat: cmd.payload.lat, lng: cmd.payload.lng };
            missionActive = false; // Navigation overrides Mission
            missionWaypoints = []; 
          } else if (cmd.type === "CLEAR_NAVIGATION_DESTINATION") {
            navTarget = null;
          }
        }
      } catch (e) {
        console.error("GNSS command parse error:", e);
      }
    });

    // ── Geo helpers ────────────────────────────────────────────────────────
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getBearing(lat1, lon1, lat2, lon2) {
      const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    // ── Main Simulation Loop ───────────────────────────────────────────────
    setInterval(() => {
      tickCount++;
      const now = Date.now();

      // 1. Determine target heading and destination state
      let targetHeading = shipState.heading;
      let targetSpeed = 6.0; // Cruise speed

      const currentActiveTarget = missionActive ? missionWaypoints[currentWaypointIndex] : navTarget;

      if (currentActiveTarget) {
        const dist = haversine(shipState.lat, shipState.lng, currentActiveTarget.lat, currentActiveTarget.lng);
        
        if (missionActive && dist < 25) {
          // Mission waypoint reached
          currentWaypointIndex++;
          if (currentWaypointIndex >= missionWaypoints.length) {
            missionActive = false;
          }
        } else if (!missionActive && dist < 25) {
          // Nav destination reached
          navTarget = null;
        } else {
          // Move towards target
          targetHeading = getBearing(shipState.lat, shipState.lng, currentActiveTarget.lat, currentActiveTarget.lng);
          targetSpeed = 10.0; // High speed during transit
        }
      } else {
        // Idle/Drift model: slow sinusoidal weave
        targetHeading = (shipState.heading + 0.2 * Math.sin(tickCount / 100)) % 360;
        targetSpeed = 4.0 + 0.5 * Math.sin(tickCount / 500);
      }

      // 2. Physics Evasion (Smooth convergence)
      // Heading convergence
      const hDelta = ((targetHeading - shipState.heading + 540) % 360) - 180;
      shipState.heading = (shipState.heading + hDelta * 0.05 + 360) % 360;

      // Speed convergence
      shipState.speed += (targetSpeed - shipState.speed) * 0.02;

      // Position update
      const speedMs = shipState.speed * 0.514444;
      const headingRad = (shipState.heading - 90) * Math.PI / 180;
      const distTick = speedMs * (intervalMs / 1000);

      shipState.lat += (distTick * Math.cos(headingRad)) / 111320;
      shipState.lng += (distTick * Math.sin(headingRad)) / (111320 * Math.cos(shipState.lat * Math.PI / 180));

      // 3. Sensor internal state evolution (Continuous)
      const satWave = 10 + 2 * Math.sin(now / 60000);
      satellites = Math.round(satWave + (Math.random() - 0.5) * 0.1); // slow vary 8-12
      
      const targetHdop = satellites >= 10 ? 0.8 : satellites >= 8 ? 1.1 : 1.5;
      hdop += (targetHdop - hdop) * 0.01 + (Math.random() - 0.5) * 0.01;

      // 4. Publish every 1s
      if (tickCount % 10 === 0) {
        const signalQuality = hdop < 1 ? 5 : hdop < 1.4 ? 4 : hdop < 1.8 ? 3 : 2;
        const fixType = satellites >= 10 ? "DGPS" : satellites >= 8 ? "3D" : "2D";

        const payload = {
          vesselId,
          deviceId: "GNSS01",
          timestamp: now,
          latitude: +shipState.lat.toFixed(6),
          longitude: +shipState.lng.toFixed(6),
          heading: +shipState.heading.toFixed(2),
          course: +((shipState.heading + Math.sin(now / 5000) * 2 + 360) % 360).toFixed(2),
          speed: +shipState.speed.toFixed(2),
          satellites,
          hdop: +hdop.toFixed(2),
          signalQuality,
          fixType,
          status: "ACTIVE",
          // Include mission state for synchronization
          missionActive,
          currentWaypointIndex,
        };
        client.publish(dataTopic, JSON.stringify(payload));
      }
    }, intervalMs);
  },
};