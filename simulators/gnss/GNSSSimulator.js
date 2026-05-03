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

    let satellites = 10;
    let hdop = 1.0;
    let tickCount = 0;

    // React to the centralized 100ms master tick
    shipState.on('tick', (state) => {
      tickCount++;
      const now = Date.now();

      // 1. Sensor internal state evolution (Continuous) based purely on time/position
      const satWave = 10 + 2 * Math.sin(now / 60000);
      satellites = Math.round(satWave + (Math.random() - 0.5) * 0.1); 
      
      const targetHdop = satellites >= 10 ? 0.8 : satellites >= 8 ? 1.1 : 1.5;
      hdop += (targetHdop - hdop) * 0.01 + (Math.random() - 0.5) * 0.01;

      // 2. Publish every 1s
      if (tickCount % 10 === 0) {
        const signalQuality = hdop < 1 ? 5 : hdop < 1.4 ? 4 : hdop < 1.8 ? 3 : 2;
        const fixType = satellites >= 10 ? "DGPS" : satellites >= 8 ? "3D" : "2D";

        const payload = {
          vesselId,
          deviceId: "GNSS01",
          timestamp: now,
          latitude: +state.lat.toFixed(6),
          longitude: +state.lng.toFixed(6),
          heading: +state.heading.toFixed(2),
          course: +((state.heading + Math.sin(now / 5000) * 2 + 360) % 360).toFixed(2),
          speed: +state.speed.toFixed(2),
          pitch: +state.pitch.toFixed(2),
          roll: +state.roll.toFixed(2),
          satellites,
          hdop: +hdop.toFixed(2),
          signalQuality,
          fixType,
          status: "ACTIVE",
          // Include mission state for synchronization
          missionActive: state.missionActive,
          currentWaypointIndex: state.currentWaypointIndex,
          routePoints: state.routePoints || [],
          distanceRemaining: state.distanceRemaining,
          etaSeconds: state.etaSeconds,
        };
        client.publish(dataTopic, JSON.stringify(payload));
      }
    });

    // Commands are now handled by shipState or SocketServer, GNSS does not steer the ship.
  },
};