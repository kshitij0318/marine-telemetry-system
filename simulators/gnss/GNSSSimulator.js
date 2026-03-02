const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "GNSS01";

const dataTopic = topics.GNSS.buildDataTopic(vesselId, deviceId);
const client = mqtt.connect("mqtt://localhost:1883");

let latitude = 19.0760;
let longitude = 72.8777;

let heading = 90;
let speed = 6;
let turnRate = 0;

function generateGNSSData() {

  // Simulate gentle turning
  turnRate += (Math.random() - 0.5) * 0.3;
  heading += turnRate;

  if (heading < 0) heading += 360;
  if (heading > 360) heading -= 360;

  speed += (Math.random() - 0.5) * 0.2;
  speed = Math.max(3, Math.min(12, speed));

  const movementFactor = speed * 0.00001;

  latitude += movementFactor * Math.cos(heading * Math.PI / 180);
  longitude += movementFactor * Math.sin(heading * Math.PI / 180);

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    latitude: +latitude.toFixed(6),
    longitude: +longitude.toFixed(6),
    speed: +speed.toFixed(2),
    heading: +heading.toFixed(2)
  };
}

client.on("connect", () => {
  console.log(`GNSS ${vesselId}-${deviceId} connected`);
  setInterval(() => {
    client.publish(dataTopic, JSON.stringify(generateGNSSData()));
  }, 1000);
});