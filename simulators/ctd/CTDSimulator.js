const topics = require("../../shared/constants/topics");

// FIELD AUDIT — CTD
module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.CTD.buildDataTopic(vesselId, "CTD01");
    let depthProfileHistory = [];
    let tickCount = 0;

    // Base values that evolve slowly
    let baseTemp = 22.0;
    let baseSalinity = 34.5;
    let basePH = 8.1;

    setInterval(() => {
      tickCount++;
      const now = Date.now();
      const t = now / 1000; // time in seconds

      // 1. Dynamic Depth (Seafloor mapping)
      const seafloor = 50 + 20 * Math.sin(shipState.lat * 500) * Math.cos(shipState.lng * 500);
      shipState.depth += (seafloor - shipState.depth) * 0.01; // Smooth convergence

      // 2. Thermodynamic Evolution (Time-based trends)
      // Temperature decreases with depth and varies with time of day (simulated)
      const depthEffect = (shipState.depth / 100) * 15;
      const diurnalOscillation = 0.5 * Math.sin(t / 3600); // 1-hour cycle for demo realism
      const targetTemp = baseTemp - depthEffect + diurnalOscillation;
      const temp = baseTemp + (targetTemp - baseTemp) * 0.05 + (Math.random() - 0.5) * 0.02;
      baseTemp = temp; // Propagation

      // Salinity increases with depth
      const salinityEffect = (shipState.depth / 200) * 2;
      const saltOsc = 0.1 * Math.cos(t / 2400);
      const targetSalinity = 34.5 + salinityEffect + saltOsc;
      const salinity = baseSalinity + (targetSalinity - baseSalinity) * 0.02 + (Math.random() - 0.5) * 0.01;
      baseSalinity = salinity;

      // Derived Physics
      const conductivity = +(0.08 + 0.016 * temp) * (salinity / 35);
      const pressure = +(101.325 + (shipState.depth * 10)).toFixed(2);
      const soundVelocity = 1448.96 + 4.591 * temp - 0.053 * temp * temp + 1.34 * (salinity - 35) + 0.016 * shipState.depth;
      const density = 1025 + (salinity - 35) * 0.8 - (temp - 20) * 0.2 + shipState.depth * 0.004;

      // 3. Biochemical Indicators
      const targetPH = 8.1 + 0.05 * Math.sin(t / 4000);
      const pH = basePH + (targetPH - basePH) * 0.01 + (Math.random() - 0.5) * 0.005;
      basePH = pH;

      const turbidity = 2.0 + 1.5 * Math.sin(t / 1200) + Math.abs(shipState.speed) * 0.2;
      const dissolvedOxygen = 8.5 - temp * 0.15 + 0.2 * Math.sin(t / 800);

      // 4. Mission Profile
      if (tickCount % 50 === 0) {
        depthProfileHistory.push({ depth: +shipState.depth.toFixed(1), temperature: +temp.toFixed(2) });
        if (depthProfileHistory.length > 40) depthProfileHistory.shift();
      }

      const payload = {
        vesselId, deviceId: "CTD01", timestamp: now,
        depth: +shipState.depth.toFixed(2),
        temperature: +temp.toFixed(2),
        salinity: +salinity.toFixed(2),
        conductivity: +conductivity.toFixed(3),
        pressure,
        density: +density.toFixed(2),
        soundVelocity: +soundVelocity.toFixed(1),
        turbidity: +turbidity.toFixed(2),
        dissolvedOxygen: +dissolvedOxygen.toFixed(2),
        fluorescence: +(0.8 + 0.3 * Math.sin(t / 1500)).toFixed(2),
        pH: +pH.toFixed(2),
        depthProfile: depthProfileHistory,
        status: "ACTIVE"
      };

      if (tickCount % 5 === 0) client.publish(dataTopic, JSON.stringify(payload));
    }, 200);
  }
};