const topics = require("../../shared/constants/topics");

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.CURRENTMETER.buildDataTopic(vesselId, "CM01");
    let tickCount = 0;
    
    let direction = 0;
    let waterTemperature = 22.0;
    let salinity = 34.2;
    let turbidity = 2.1;
    
    setInterval(() => {
      tickCount++;
      const now = Date.now();
      
      const bgDirection = (tickCount / 1200) * 360 % 360;
      const tidalSpeed = 0.8 + 0.6 * Math.sin(tickCount / 600);
      const apparentSpeed = tidalSpeed + shipState.speed * 0.08;
      
      const speed = Math.max(0.1, Math.min(2.5, apparentSpeed));
      
      // Shortest path angle interpolation
      let angleDiff = bgDirection - direction;
      angleDiff = ((angleDiff + 180) % 360 + 360) % 360 - 180;
      direction = (direction + angleDiff * 0.03 + 360) % 360;
      
      // Calculate U/V components
      const dirRad = direction * Math.PI / 180;
      const eastward = +(speed * Math.sin(dirRad)).toFixed(3);
      const northward = +(speed * Math.cos(dirRad)).toFixed(3);
      const upward = +(0.02 * Math.sin(tickCount / 250)).toFixed(3);
      
      const targetWaterTemp = 22 - ((shipState.depth || 0) * 0.18) + 0.8 * Math.sin(tickCount / 400);
      waterTemperature += (targetWaterTemp - waterTemperature) * 0.006;
      
      const targetSalinity = 34.2 + ((shipState.depth || 0) * 0.008) + 0.1 * Math.sin(tickCount / 600);
      salinity += (targetSalinity - salinity) * 0.003;
      
      const targetTurbidity = 2.1 + 0.8 * Math.sin(tickCount / 500);
      turbidity += (targetTurbidity - turbidity) * 0.01;

      const payload = {
        vesselId,
        deviceId: "CM01",
        timestamp: now,
        speed: +speed.toFixed(2),
        direction: +direction.toFixed(2),
        eastward,
        northward,
        upward,
        waterTemperature: +waterTemperature.toFixed(2),
        salinity: +salinity.toFixed(2),
        turbidity: +turbidity.toFixed(2),
        status: "ACTIVE"
      };
      client.publish(dataTopic, JSON.stringify(payload));
    }, 1000);
  }
};