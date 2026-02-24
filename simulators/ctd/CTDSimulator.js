const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "CTD01";

const dataTopic = topics.CTD.buildDataTopic(vesselId, deviceId);
const commandTopic = topics.CTD.buildCommandTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;
let depth = 0;

function generateCTDData() {
  depth += Math.random() * 2;

  const pressure = +(depth * 0.1).toFixed(2);
  const waterTemperature = +(20 - depth * 0.02 + Math.random()).toFixed(2);
  const conductivity = +(3 + Math.random() * 0.5).toFixed(3);
  const salinity = +(30 + conductivity * 1.5).toFixed(2);
  const altimeter = +(100 - depth).toFixed(2);
  const soundVelocity = +(1440 + waterTemperature * 4).toFixed(2);
  const waterDensity = +(1020 + salinity * 0.2).toFixed(2);

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    pressure,
    depth: +depth.toFixed(2),
    salinity,
    waterTemperature,
    conductivity,
    altimeter,
    soundVelocity,
    waterDensity
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

client.on("message", (topic, message) => {
  const command = message.toString();

  if (command === "START") running = true;
  if (command === "STOP") running = false;
  if (command === "RESET") depth = 0;

  if (command.startsWith("SET_RATE")) {
    interval = parseInt(command.split(" ")[1]);
  }
});