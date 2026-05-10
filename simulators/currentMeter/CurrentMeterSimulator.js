if (process.env.DISABLE_SIMULATORS === 'true') {
  console.log(`[SIM] ${__filename} disabled by DISABLE_SIMULATORS env var. Exiting.`);
  process.exit(0);
}
const topics = require("../../shared/constants/topics");

module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.CURRENTMETER.buildDataTopic(vesselId, "CM01");
    let tickCount = 0;
    
    let baseSpeed = 0.8;
    let baseDirection = 45; // NE current
    let baseTemp = 21.5;

    shipState.on('tick', (state) => {
      tickCount++;
      const now = Date.now();
      const t = now / 1000;

      const tidalOsc = 0.4 * Math.sin(t / 1800); // 30-min tidal cycle
      const targetSpeed = 1.2 + tidalOsc + 0.2 * Math.cos(t / 5000);
      const speed = baseSpeed + (targetSpeed - baseSpeed) * 0.01 + (Math.random() - 0.5) * 0.01;
      baseSpeed = speed;

      const dirDrift = 15 * Math.sin(t / 3600); // 1-hour direction drift
      const targetDir = (45 + dirDrift + 360) % 360;
      let dirDiff = ((targetDir - baseDirection + 540) % 360) - 180;
      const direction = (baseDirection + dirDiff * 0.005 + 360) % 360;
      baseDirection = direction;

      const dirRad = (direction * Math.PI) / 180;
      const eastward = +(speed * Math.sin(dirRad)).toFixed(3);
      const northward = +(speed * Math.cos(dirRad)).toFixed(3);
      const upward = +(0.05 * Math.sin(t / 300)).toFixed(3);

      const targetTemp = 21.5 + 0.5 * Math.sin(t / 4000) - (state.depth / 150);
      const waterTemp = baseTemp + (targetTemp - baseTemp) * 0.01 + (Math.random() - 0.5) * 0.005;
      baseTemp = waterTemp;

      const salinity = 34.2 + 0.1 * Math.sin(t / 5000) + (state.depth / 300);
      const turbidity = 1.8 + 0.5 * Math.cos(t / 2000);

      const payload = {
        vesselId, deviceId: "CM01", timestamp: now,
        speed: +speed.toFixed(2),
        direction: +direction.toFixed(2),
        eastward, northward, upward,
        waterTemperature: +waterTemp.toFixed(2),
        salinity: +salinity.toFixed(2),
        turbidity: +turbidity.toFixed(2),
        status: "ACTIVE"
      };

      if (tickCount % 10 === 0) client.publish(dataTopic, JSON.stringify(payload));
    }); // 10Hz internal, 1Hz publish
  }
};