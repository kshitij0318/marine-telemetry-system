const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "CM01";

const dataTopic = topics.CURRENTMETER.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;

let baseDirection = 120;

function generateCurrentMeterData() {
  const currentSpeed = +(1 + Math.random() * 1.5).toFixed(2);
  const currentDirection = +(baseDirection + (Math.random() - 0.5) * 10).toFixed(2);
  const waterFlowRate = +(2 + Math.random() * 2).toFixed(2);
  const turbulenceIndex = +(Math.random() * 0.5).toFixed(3);

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    currentSpeed,
    currentDirection,
    waterFlowRate,
    turbulenceIndex
  };
}

client.on("connect", () => {
  console.log(`Current Meter Simulator ${vesselId}-${deviceId} connected`);

  setInterval(() => {
    if (running) {
      client.publish(dataTopic, JSON.stringify(generateCurrentMeterData()));
    }
  }, interval);
});