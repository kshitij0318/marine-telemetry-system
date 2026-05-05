const topics = require("../../shared/constants/topics");

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.THRUSTER.buildDataTopic(vesselId, "THR01");
    const thrusterNames = ['PORT', 'STARBOARD', 'BOW'];
    let tickCount = 0;
    
    let thrusterStates = thrusterNames.map(name => ({
      name,
      currentRpm: 0,
      baseTemp: 35.0,
      voltage: 380.0,
      runtimeSeconds: 0,
      tempWarningThreshold: 80,
      maxRpm: 3000
    }));

    shipState.on('tick', (state) => {
      tickCount++;
      const now = Date.now();
      const t = now / 1000;

      const thrusters = thrusterStates.map((ts, i) => {
        ts.runtimeSeconds += 0.1;

        const baseTarget = state.speed * 180 + (i * 50);
        const cruiseMod = 50 * Math.sin(t / 15 + i); // Engine "burble"
        const targetRPM = Math.max(0, baseTarget + cruiseMod);
        
        ts.currentRpm += (targetRPM - ts.currentRpm) * 0.05;
        const rpmRatio = ts.currentRpm / ts.maxRpm;

        const loadFactor = rpmRatio ** 2;
        const targetTemp = 35 + loadFactor * 55 + 2 * Math.sin(t / 60 + i);
        ts.baseTemp += (targetTemp - ts.baseTemp) * 0.01 + (Math.random() - 0.5) * 0.05;

        const torque = 50 + ts.currentRpm * 0.12 + Math.random() * 5;
        const powerKW = (torque * ts.currentRpm * 2 * Math.PI / 60) / 1000;
        
        const targetVoltage = 380 + 2 * Math.sin(t / 30 + i);
        ts.voltage += (targetVoltage - ts.voltage) * 0.02;
        const currentDraw = (powerKW * 1000) / (ts.voltage * 1.732 * 0.95); // 3-phase approximation

        const thrust = rpmRatio * 45000 + (Math.random() - 0.5) * 100;

        const efficiency = 92 - Math.abs(rpmRatio - 0.75) * 20 + Math.sin(t / 20 + i) * 2;
        const vibration = 0.05 + (rpmRatio ** 3) * 0.5 + 0.05 * Math.sin(t * 10 + i); // high freq ripple

        return {
          id: `thruster-${ts.name.toLowerCase()}`,
          name: ts.name,
          rpm: +ts.currentRpm.toFixed(0),
          power: +powerKW.toFixed(1),
          temperature: +ts.baseTemp.toFixed(1),
          thrust: +thrust.toFixed(0),
          voltage: +ts.voltage.toFixed(1),
          current: +currentDraw.toFixed(2),
          currentDraw: +currentDraw.toFixed(2),
          vibration: +vibration.toFixed(2),
          fuelFlow: +(powerKW * 0.18 + Math.random() * 0.2).toFixed(2),
          torque: +torque.toFixed(2),
          powerConsumption: +powerKW.toFixed(2),
          efficiency: +efficiency.toFixed(1),
          runtimeHours: Math.floor(ts.runtimeSeconds / 3600),
          runtimeMinutes: Math.floor((ts.runtimeSeconds % 3600) / 60),
          maxRpm: ts.maxRpm,
          tempWarningThreshold: ts.tempWarningThreshold,
          status: ts.currentRpm > 100 ? "active" : "idle"
        };
      });

      const payload = {
        vesselId, deviceId: "THR01", timestamp: now,
        thrusters,
        rpm: thrusters[0].rpm,
        power: thrusters[0].power,
        temperature: thrusters[0].temperature,
        thrust: thrusters[0].thrust,
        voltage: thrusters[0].voltage,
        current: thrusters[0].current,
        currentDraw: thrusters[0].currentDraw,
        vibration: thrusters[0].vibration,
        fuelFlow: thrusters[0].fuelFlow,
        torque: thrusters[0].torque,
        powerConsumption: thrusters[0].powerConsumption,
        efficiency: thrusters[0].efficiency,
        runtimeHours: thrusters[0].runtimeHours,
        runtimeMinutes: thrusters[0].runtimeMinutes,
        maxRpm: thrusters[0].maxRpm,
        tempWarningThreshold: thrusters[0].tempWarningThreshold,
        status: "ACTIVE"
      };

      if (tickCount % 10 === 0) client.publish(dataTopic, JSON.stringify(payload));
    });
  }
};