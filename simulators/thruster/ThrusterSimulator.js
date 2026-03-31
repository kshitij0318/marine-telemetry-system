const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "THR01";

const dataTopic = topics.THRUSTER.buildDataTopic(vesselId, deviceId);
const client = mqtt.connect("mqtt://localhost:1883");

let rpm = 1200;
let temperature = 45;
let running = true;
let runtimeMinutesTotal = Math.floor(Math.random() * 24 * 60);

function generateThrusterData() {
  rpm += (Math.random() - 0.5) * 80;
  rpm = Math.max(500, Math.min(2200, rpm));
  const thrustPower = +(rpm / 2200 * 100).toFixed(1);
  temperature += (thrustPower * 0.02) - 0.5;
  temperature = Math.max(35, Math.min(95, temperature));

  runtimeMinutesTotal += 1 / 60; // 1 second per tick
  const runtimeHours = Math.floor(runtimeMinutesTotal / 60);
  const runtimeMinutes = Math.floor(runtimeMinutesTotal % 60);

  const voltage = +(48.0 - (thrustPower * 0.05) + (Math.random() - 0.5) * 0.5).toFixed(1);
  const currentDraw = +((thrustPower / 100) * 85).toFixed(1);
  const powerConsumption = +((currentDraw * voltage) / 1000).toFixed(2); // in kW
  const efficiency = +(85 + Math.random() * 10).toFixed(1);

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    rpm: Math.round(rpm),
    thrustPower,
    thrusterTemperature: +temperature.toFixed(2),
    thrusterStatus: rpm > 700 ? "ACTIVE" : "IDLE",
    voltage,
    currentDraw,
    powerConsumption,
    efficiency,
    runtimeHours,
    runtimeMinutes
  };
}
client.on("connect", () => {
  console.log(`Thruster ${vesselId}-${deviceId} connected`);
  setInterval(() => {
    client.publish(dataTopic, JSON.stringify(generateThrusterData()));
  }, 1000);
});