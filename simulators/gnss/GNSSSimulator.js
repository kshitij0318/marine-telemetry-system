const topics = require("../../shared/constants/topics");


module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.GNSS.buildDataTopic(vesselId, "GNSS01");

    let satellites = 10;
    let hdop = 1.0;
    let tickCount = 0;

    shipState.on('tick', (state) => {
      tickCount++;
      const now = Date.now();

      const satWave = 10 + 2 * Math.sin(now / 60000);
      satellites = Math.round(satWave + (Math.random() - 0.5) * 0.1); 
      
      const targetHdop = satellites >= 10 ? 0.8 : satellites >= 8 ? 1.1 : 1.5;
      hdop += (targetHdop - hdop) * 0.01 + (Math.random() - 0.5) * 0.01;

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
          missionActive: state.missionActive,
          currentWaypointIndex: state.currentWaypointIndex,
          routePoints: state.routePoints || [],
          distanceRemaining: state.distanceRemaining,
          etaSeconds: state.etaSeconds,
        };
        client.publish(dataTopic, JSON.stringify(payload));
      }
    });

  },
};