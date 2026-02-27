const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "OAS01";

const dataTopic = topics.OAS.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

function generateOASData() {
  const forwardDistance = +(50 + Math.random() * 150).toFixed(1);
  const portDistance = +(30 + Math.random() * 100).toFixed(1);
  const starboardDistance = +(30 + Math.random() * 100).toFixed(1);

  let riskLevel = "LOW";
  if (forwardDistance < 40) riskLevel = "HIGH";
  else if (forwardDistance < 70) riskLevel = "MEDIUM";

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    forwardDistance,
    portDistance,
    starboardDistance,
    riskLevel
  };
}

client.on("connect", () => {
  console.log(`OAS Simulator ${vesselId}-${deviceId} connected`);

  setInterval(() => {
    client.publish(dataTopic, JSON.stringify(generateOASData()));
  }, 1000);
});