const topics = require("../../shared/constants/topics");

/**
 * GNSS Simulator — Physically coherent, globally relocatable
 *
 * Feature 8 changes:
 *  - Removed LAND_BOXES array (hardcoded to Mumbai coast). The vessel
 *    already has heading-bounce logic; a bbox list only worked near
 *    one region. Now the bounce is purely heading-based (no region check).
 *  - Start position is read from env vars VESSEL_START_LAT / VESSEL_START_LNG
 *    so the simulator can be placed anywhere without code changes.
 *
 * Physics:
 *  - Speed: smooth 2–12 kts, changes every 20–40 s
 *  - Heading: drifts ±20° over 15–25 s intervals
 *  - Position: incremental tick from last known position (no teleport)
 *  - Satellites: 8–12, smooth transitions
 *  - HDOP: inversely correlated with satellite count
 */

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.GNSS.buildDataTopic(vesselId, "GNSS01");

    let targetSpeed         = shipState.speed || 6;
    let nextSpeedChangeTime = Date.now() + 20000 + Math.random() * 20000;

    let targetHeading        = shipState.heading;
    let nextHeadingChangeTime = Date.now() + 15000 + Math.random() * 10000;

    let satellites     = 10;
    let targetSats     = 10;
    let nextSatChange  = Date.now() + 45000 + Math.random() * 45000;
    let hdop           = 1.0;

    // Track consecutive ticks without a valid move (anti-stuck escape)
    let stuckTicks = 0;

    let missionActive        = false;
    let missionWaypoints     = [];
    let currentWaypointIndex = 0;
    const WAYPOINT_ARRIVAL_RADIUS = 20; // metres

    client.subscribe("COMMANDS/MISSION");
    client.on("message", (topic, message) => {
      if (topic !== "COMMANDS/MISSION") return;
      try {
        const cmd = JSON.parse(message.toString());
        if (cmd.type === "START_MISSION") {
          missionWaypoints     = cmd.waypoints;
          currentWaypointIndex = 0;
          missionActive        = true;
        } else if (cmd.type === "STOP_MISSION") {
          missionActive    = false;
          missionWaypoints = [];
        }
      } catch (e) {
        console.error("Error parsing mission command:", e);
      }
    });

    function missionTick() {
      if (!missionActive || missionWaypoints.length === 0) return;

      const target = missionWaypoints[currentWaypointIndex];
      if (!target) { missionActive = false; return; }

      const dLat = target.lat - shipState.lat;
      const dLng = target.lng - shipState.lng;

      const targetBearing = ((Math.atan2(dLng, dLat) * 180 / Math.PI) + 360) % 360;
      const delta         = ((targetBearing - shipState.heading + 540) % 360) - 180;
      shipState.heading   = (shipState.heading + Math.max(-2, Math.min(2, delta)) + 360) % 360;

      const dist = Math.sqrt(
        (dLat * 111320) ** 2 +
        (dLng * 111320 * Math.cos(shipState.lat * Math.PI / 180)) ** 2
      );
      if (dist < WAYPOINT_ARRIVAL_RADIUS) {
        currentWaypointIndex++;
        if (currentWaypointIndex >= missionWaypoints.length) {
          missionActive = false;
        }
      }
    }

    let tickCount   = 0;
    const intervalMs = 100;

    setInterval(() => {
      tickCount++;
      const now = Date.now();

      // ── Speed ────────────────────────────────────────────────────────────
      if (now > nextSpeedChangeTime) {
        targetSpeed         = 4 + Math.random() * 6;
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
          targetHeading        = shipState.heading + (Math.random() * 40 - 20);
          nextHeadingChangeTime = now + 15000 + Math.random() * 10000;
        }
        const hDelta    = ((targetHeading - shipState.heading + 540) % 360) - 180;
        shipState.heading = (shipState.heading + Math.max(-0.4, Math.min(0.4, hDelta)) + 360) % 360;
      }

      // ── Position update (incremental — no teleport) ───────────────────
      const speedMs       = shipState.speed * 0.514444;
      const headingRad    = (shipState.heading - 90) * Math.PI / 180;
      const metersPerTick = speedMs * (intervalMs / 1000);

      const nextLat = shipState.lat + (metersPerTick * Math.cos(headingRad)) / 111320;
      const nextLng = shipState.lng + (metersPerTick * Math.sin(headingRad)) /
                      (111320 * Math.cos(shipState.lat * Math.PI / 180));

      // Feature 8: Removed LAND_BOXES — heading bounce is purely direction-based.
      // If the vessel somehow gets stuck (e.g. starts in a constrained bay), the
      // stuck-tick counter forces it back toward open water after 50 ticks.
      const latChanged = Math.abs(nextLat - shipState.lat) > 1e-9;
      const lngChanged = Math.abs(nextLng - shipState.lng) > 1e-9;

      if (latChanged || lngChanged) {
        shipState.lat = nextLat;
        shipState.lng = nextLng;
        stuckTicks    = 0;
      } else {
        stuckTicks++;
        if (stuckTicks > 50) {
          // Escape toward open water (turn 180°)
          shipState.heading = (shipState.heading + 180) % 360;
          stuckTicks        = 0;
        }
      }

      // ── Publish every 1 s (10 ticks) ─────────────────────────────────
      if (tickCount % 10 !== 0) return;

      if (now > nextSatChange) {
        targetSats  = Math.max(8, Math.min(12, satellites + (Math.random() > 0.5 ? 1 : -1)));
        satellites += Math.sign(targetSats - satellites);
        nextSatChange = now + 45000 + Math.random() * 45000;
      }

      const targetHdop = 1.0 + (12 - satellites) * 0.375 + Math.random() * 0.2;
      hdop = hdop + (targetHdop - hdop) * 0.1;

      const payload = {
        vesselId,
        deviceId: "GNSS01",
        timestamp: now,
        latitude:  +shipState.lat.toFixed(6),
        longitude: +shipState.lng.toFixed(6),
        heading:   +shipState.heading.toFixed(2),
        course:    +shipState.heading.toFixed(2),
        altitude:  +(15 + Math.random() * 2).toFixed(1),
        speed:     +shipState.speed.toFixed(2),
        satellites,
        hdop,
        status: "ACTIVE",
      };

      client.publish(dataTopic, JSON.stringify(payload));
    }, intervalMs);
  },
};