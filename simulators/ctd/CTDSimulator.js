const topics = require("../../shared/constants/topics");
const { createNoise2D } = require("simplex-noise");

const noise2D = createNoise2D();

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.CTD.buildDataTopic(vesselId, "CTD01");
    let depthProfileHistory = [];
    
    let temperature = 22.0;
    let salinity = 34.5;
    let tickCount = 0;
    
    function seafloorDepth(lat, lng) {
      const base = 45;
      const variation = 30;
      return base + variation * (
        0.5 * Math.sin(lat * 173.7 + lng * 89.3) +
        0.3 * Math.sin(lat * 311.1 - lng * 197.4) +
        0.2 * Math.sin(lat * 47.9 + lng * 443.2)
      );
    }
    
    setInterval(() => {
      tickCount++;
      const now = Date.now();
      
      const targetDepth = seafloorDepth(shipState.lat, shipState.lng);
      shipState.depth += (targetDepth - shipState.depth) * 0.008;
      
      const targetTemp = 22 - (shipState.depth / 100) * 18 + 0.5 * Math.sin(tickCount / 300);
      temperature += (targetTemp - temperature) * 0.005;
      
      const targetSalinity = 34.5 + (shipState.depth / 200) * 1.5;
      salinity += (targetSalinity - salinity) * 0.003;
      
      // Derived C
      const conductivity = +(0.08 + 0.0162 * temperature) * (salinity / 35);
      const pressure = +(101.325 + (shipState.depth * 0.101325)).toFixed(2);
      const soundVelocity = +(1449.2 + 4.6 * temperature - 0.055 * temperature**2 + 0.00029 * temperature**3 + (1.34 - 0.01 * temperature) * (salinity - 35) + 0.016 * shipState.depth).toFixed(1);

      depthProfileHistory.push({ depth: +shipState.depth.toFixed(2), temperature: +temperature.toFixed(2) });
      if (depthProfileHistory.length > 50) depthProfileHistory.shift();

      const payload = {
        vesselId,
        deviceId: "CTD01",
        timestamp: now,
        depth: +shipState.depth.toFixed(2),
        temperature: +temperature.toFixed(2),
        salinity: +salinity.toFixed(2),
        conductivity: +conductivity.toFixed(3),
        pressure,
        soundVelocity,
        density: +(1025 + salinity * 0.8 - temperature * 0.2).toFixed(2),
        turbidity: 0.5 + Math.random() * 0.5,
        dissolvedOxygen: +(8.5 - temperature * 0.2 + Math.sin(tickCount/500) * 0.3).toFixed(2),
        fluorescence: +(0.8 + 0.4 * Math.sin(tickCount/700)).toFixed(2),
        pH: +(8.1 + 0.05 * Math.sin(tickCount/900)).toFixed(2),
        depthProfile: [...depthProfileHistory],
        status: "ACTIVE"
      };
      client.publish(dataTopic, JSON.stringify(payload));
    }, 500); // 2Hz
  }
};