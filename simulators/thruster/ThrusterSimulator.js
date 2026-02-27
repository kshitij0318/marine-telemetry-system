const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "THR01";

const dataTopic = topics.THRUSTER.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let rpm = 1200;
let running = true;

function generateThrusterData() {
  rpm += (Math.random() - 0.5) * 100;

  const thrustPower = +(rpm / 2000 * 100).toFixed(1);
  const thrusterTemperature = +(40 + Math.random() * 15).toFixed(2);

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    rpm: Math.round(rpm),
    thrustPower,
    thrusterTemperature,
    thrusterStatus: running ? "ACTIVE" : "IDLE"
  };
}

client.on("connect", () => {
  console.log(`Thruster Simulator ${vesselId}-${deviceId} connected`);

  setInterval(() => {
    client.publish(dataTopic, JSON.stringify(generateThrusterData()));
  }, 1000);
});