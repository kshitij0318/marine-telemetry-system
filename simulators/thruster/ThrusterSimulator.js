const topics = require("../../shared/constants/topics");

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.THRUSTER.buildDataTopic(vesselId, "THR01");
    let temperature = 35; // base ambient sea temp effectively inside housing
    let runtimeSeconds = 0;
    
    let currentRpm = 0;
    let tickCount = 0;
    const ticksPerSecond = 5;
    
    let efficiency = 85.0;
    let voltage = 380.0;
    let vibration = 0.5;
    
    setInterval(() => {
      const now = Date.now();
      runtimeSeconds += 1 / ticksPerSecond;
      
      const targetRPM = shipState.speed * 185;
      currentRpm += (targetRPM - currentRpm) * 0.06;
      
      const maxRPM = 2220; // 12 knots * 185
      const rpmRatio = currentRpm / maxRPM;
      const power = +(rpmRatio * rpmRatio * 100).toFixed(1);
      const optimalRpm = maxRPM * 0.8;
      
      const maxThrust = 50000;
      const thrust = (currentRpm / maxRPM) * maxThrust;
      
      const targetEfficiency = 100 * (1 - Math.abs(currentRpm - optimalRpm) / maxRPM * 0.4);
      efficiency += (targetEfficiency - efficiency) * 0.05;
      
      const targetVoltage = 380 + (rpmRatio * 20) + (Math.random() - 0.5) * 0.5;
      voltage += (targetVoltage - voltage) * 0.02;
      
      const currentDraw = power / (voltage || 1); // User's 'current' = power / voltage
      
      tickCount++;
      const targetVibration = 0.5 + (rpmRatio * 2.5) + 0.1 * Math.sin(tickCount / 7);
      vibration += (targetVibration - vibration) * 0.08;
      
      const maxFuelFlow = 12; // L/h
      const fuelFlow = Math.pow(Math.max(0, rpmRatio), 1.3) * maxFuelFlow;

      if (rpmRatio > 0.8) {
        temperature += 0.4 / ticksPerSecond;
      } else if (rpmRatio >= 0.4) {
        temperature += 0.1 / ticksPerSecond;
      } else {
        temperature -= 0.15 / ticksPerSecond;
      }
      temperature = Math.max(20, Math.min(95, temperature));
      
      const powerConsumption = (voltage * currentDraw) / 1000;
      const torque = (currentRpm > 0) ? (power * 9549 / currentRpm) : 0;

      const payload = {
        vesselId,
        deviceId: "THR01",
        timestamp: now,
        rpm: +currentRpm.toFixed(0),
        power,
        temperature: +temperature.toFixed(1),
        thrust: +thrust.toFixed(0),
        voltage: +voltage.toFixed(1),
        current: +currentDraw.toFixed(2),
        currentDraw: +currentDraw.toFixed(2),
        vibration: +vibration.toFixed(2),
        fuelFlow: +fuelFlow.toFixed(2),
        torque: +torque.toFixed(2),
        powerConsumption: +powerConsumption.toFixed(2),
        efficiency: +efficiency.toFixed(1),
        runtimeHours: Math.floor(runtimeSeconds / 3600),
        runtimeMinutes: Math.floor((runtimeSeconds % 3600) / 60),
        status: currentRpm > 5 ? "ACTIVE" : "IDLE"
      };
      client.publish(dataTopic, JSON.stringify(payload));
    }, 200); // 5Hz
  }
};