const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "GNSS01";

const dataTopic = topics.GNSS.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;

// Mumbai starting coordinates
let latitude = 19.0760;
let longitude = 72.8777;

let heading = 90;
let speed = 6;

function generateGNSSData() {
  const movementFactor = 0.00015;

  latitude += movementFactor * Math.cos(heading * Math.PI / 180);
  longitude += movementFactor * Math.sin(heading * Math.PI / 180);

  heading += (Math.random() - 0.5) * 4;
  if (heading < 0) heading += 360;
  if (heading > 360) heading -= 360;

  speed = 5 + Math.random() * 2;

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
  console.log(`GNSS Simulator ${vesselId}-${deviceId} connected`);

  setInterval(() => {
    if (running) {
      client.publish(dataTopic, JSON.stringify(generateGNSSData()));
    }
  }, interval);
});