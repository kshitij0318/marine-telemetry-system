const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "CM01";

const dataTopic = topics.CURRENTMETER.buildDataTopic(vesselId, deviceId);
const client = mqtt.connect("mqtt://localhost:1883");

let baseDirection = 110;
let phase = 0;

function generateCurrentMeterData() {

  phase += 0.05;

  // Simulate tidal sinusoidal current
  const currentSpeed =
    +(1.2 + Math.sin(phase) * 0.8 + (Math.random() - 0.5) * 0.2).toFixed(2);

  baseDirection += (Math.random() - 0.5) * 2;

  const currentDirection =
    +(baseDirection % 360).toFixed(2);

  const waterFlowRate =
    +(currentSpeed * 1.8 + (Math.random() - 0.5) * 0.3).toFixed(2);

  const turbulenceIndex =
    +(currentSpeed * 0.15 + Math.random() * 0.05).toFixed(3);

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
  console.log(`Current Meter ${vesselId}-${deviceId} connected`);
  setInterval(() => {
    client.publish(dataTopic, JSON.stringify(generateCurrentMeterData()));
  }, 1000);
});