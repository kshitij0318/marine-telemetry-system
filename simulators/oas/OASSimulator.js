const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "OAS01";

const dataTopic = topics.OAS.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let running = true;
let interval = 1000;

// Realistic sonar-like ranges (meters)
let forwardDistance = 120;
let portDistance = 80;
let starboardDistance = 95;

function generateOASData() {

  // Smooth fluctuation
  forwardDistance += (Math.random() - 0.5) * 5;
  portDistance += (Math.random() - 0.5) * 4;
  starboardDistance += (Math.random() - 0.5) * 4;

  // Clamp realistic ranges
  forwardDistance = Math.max(10, Math.min(200, forwardDistance));
  portDistance = Math.max(5, Math.min(150, portDistance));
  starboardDistance = Math.max(5, Math.min(150, starboardDistance));

  let riskLevel = "LOW";

  if (forwardDistance < 30) riskLevel = "HIGH";
  else if (forwardDistance < 60) riskLevel = "MEDIUM";

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    forwardDistance: +forwardDistance.toFixed(1),
    portDistance: +portDistance.toFixed(1),
    starboardDistance: +starboardDistance.toFixed(1),
    riskLevel
  };
}

client.on("connect", () => {
  console.log(`OAS ${vesselId}-${deviceId} connected`);

  setInterval(() => {
    if (running) {
      client.publish(dataTopic, JSON.stringify(generateOASData()));
    }
  }, interval);
});