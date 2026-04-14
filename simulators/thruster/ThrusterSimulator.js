const topics = require("../../shared/constants/topics");

// FIELD AUDIT — THRUSTER
module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.THRUSTER.buildDataTopic(vesselId, "THR01");
    let tickCount = 0;
    
    // Internal state propagation
    let currentRpm = 0;
    let baseTemp = 35.0;
    let voltage = 380.0;
    let runtimeSeconds = 0;

    setInterval(() => {
      tickCount++;
      const now = Date.now();
      const t = now / 1000;
      runtimeSeconds += 0.1;

      // 1. Target RPM derived from shipState speed with mechanical inertia
      // If speed is 10kts, target is ~1800 RPM
      const baseTarget = shipState.speed * 180;
      const cruiseMod = 50 * Math.sin(t / 15); // Engine "burble"
      const targetRPM = Math.max(0, baseTarget + cruiseMod);
      
      // Convergence towards target (mechanical inertia)
      currentRpm += (targetRPM - currentRpm) * 0.05;
      const rpmRatio = currentRpm / 2220; // 2220 is maxRpm

      // 2. Thermodynamic Model (Proportional to square of RPM)
      const loadFactor = rpmRatio ** 2;
      const targetTemp = 35 + loadFactor * 55 + 2 * Math.sin(t / 60);
      const temperature = baseTemp + (targetTemp - baseTemp) * 0.01 + (Math.random() - 0.5) * 0.05;
      baseTemp = temperature;

      // 3. Electrical & Mechanical Coupling
      const torque = 50 + currentRpm * 0.12 + Math.random() * 5;
      const powerKW = (torque * currentRpm * 2 * Math.PI / 60) / 1000;
      
      const targetVoltage = 380 + 2 * Math.sin(t / 30);
      voltage += (targetVoltage - voltage) * 0.02;
      const currentDraw = (powerKW * 1000) / (voltage * 1.732 * 0.95); // 3-phase approximation

      const thrust = rpmRatio * 45000 + (Math.random() - 0.5) * 100;

      // 4. Efficiency & Vibration
      // Optimal efficiency at 75% load
      const efficiency = 92 - Math.abs(rpmRatio - 0.75) * 20 + Math.sin(t / 20) * 2;
      const vibration = 0.05 + (rpmRatio ** 3) * 0.5 + 0.05 * Math.sin(t * 10); // high freq ripple

      const payload = {
        vesselId, deviceId: "THR01", timestamp: now,
        rpm: +currentRpm.toFixed(0),
        power: +powerKW.toFixed(1),
        temperature: +temperature.toFixed(1),
        thrust: +thrust.toFixed(0),
        voltage: +voltage.toFixed(1),
        current: +currentDraw.toFixed(2),
        currentDraw: +currentDraw.toFixed(2),
        vibration: +vibration.toFixed(2),
        fuelFlow: +(powerKW * 0.18 + Math.random() * 0.2).toFixed(2),
        torque: +torque.toFixed(2),
        powerConsumption: +powerKW.toFixed(2),
        efficiency: +efficiency.toFixed(1),
        runtimeHours: Math.floor(runtimeSeconds / 3600),
        runtimeMinutes: Math.floor((runtimeSeconds % 3600) / 60),
        maxRpm: 2220,
        tempWarningThreshold: 85,
        status: currentRpm > 100 ? "ACTIVE" : "IDLE"
      };

      if (tickCount % 10 === 0) client.publish(dataTopic, JSON.stringify(payload));
    }, 100);
  }
};