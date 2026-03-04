const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "CTD01";

const dataTopic = topics.CTD.buildDataTopic(vesselId, deviceId);
const commandTopic = topics.CTD.buildCommandTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;
let depth = 20;             
let maxDepth = 800;          
let direction = 1;          
let seabed = 900;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateCTDData() {
  depth += direction * (0.5 + Math.random() * 0.5);
  if (depth > maxDepth || depth < 5) {
    direction *= -1;
  }
  depth = clamp(depth, 5, maxDepth);
  const waterTemperature =
    +(25 - depth * 0.02 + (Math.random() - 0.5) * 0.2).toFixed(2);
  const salinity =
    +(34.5 + (Math.random() - 0.5) * 0.3).toFixed(2);
  const conductivity =
    +(4 + (Math.random() - 0.5) * 0.2).toFixed(3);
  const pressure =
    +(depth * 0.1).toFixed(2);
  const soundVelocity =
    +(1440 + (4 * waterTemperature) + (1.2 * salinity)).toFixed(2);
  const waterDensity =
    +(1025 + (salinity - 35) * 0.8 - waterTemperature * 0.2).toFixed(2);
  const altimeter =
    +(seabed - depth).toFixed(2);
  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    depth: +depth.toFixed(2),
    pressure,
    waterTemperature,
    salinity,
    conductivity,
    soundVelocity,
    waterDensity,
    altimeter
  };
}

client.on("connect", () => {
  console.log(`CTD Simulator ${vesselId}-${deviceId} connected`);
  client.subscribe(commandTopic);

  setInterval(() => {
    if (running) {
      client.publish(dataTopic, JSON.stringify(generateCTDData()));
    }
  }, interval);
});

client.on("message", (_, message) => {
  const command = message.toString();

  if (command === "START") running = true;
  if (command === "STOP") running = false;
});