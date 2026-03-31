const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const vesselId = process.env.VESSEL_ID || "V001";
const deviceId = process.env.DEVICE_ID || "OAS01";

const dataTopic = topics.OAS.buildDataTopic(vesselId, deviceId);

const client = mqtt.connect("mqtt://localhost:1883");

let running = true;
let interval = 1000;
let forwardDistance = 120;
let portDistance = 80;
let starboardDistance = 95;

let totalScans = 5000;
let objectsTracked = 50;
let range = 200;
let scanRate = 10;
let beamAngle = 360;
let resolution = 0.5;
let signalQuality = "Excellent";

function generateOASData() {
  forwardDistance += (Math.random() - 0.5) * 5;
  portDistance += (Math.random() - 0.5) * 4;
  starboardDistance += (Math.random() - 0.5) * 4;
  forwardDistance = Math.max(10, Math.min(200, forwardDistance));
  portDistance = Math.max(5, Math.min(150, portDistance));
  starboardDistance = Math.max(5, Math.min(150, starboardDistance));

  totalScans += 1;
  
  let riskLevel = "LOW";
  if (forwardDistance < 30) riskLevel = "HIGH";
  else if (forwardDistance < 60) riskLevel = "MEDIUM";

  // Generate realistic detection arrays natively
  const detections = [];
  if (riskLevel === "HIGH") {
    detections.push({ angle: 0, distance: +forwardDistance.toFixed(1), threat: "high" });
    objectsTracked += 1;
  } else if (riskLevel === "MEDIUM" && Math.random() > 0.5) {
    detections.push({ angle: 45, distance: +portDistance.toFixed(1), threat: "medium" });
  } else if (Math.random() > 0.8) {
    detections.push({ 
      angle: Math.floor(Math.random() * 360), 
      distance: +(Math.random() * 150).toFixed(1), 
      threat: "low" 
    });
  }

  const detectionAccuracy = +(98.0 + Math.random() * 1.5).toFixed(1);
  const falsePositiveRate = +(0.1 + Math.random() * 0.2).toFixed(1);
  const processingLatency = +(14 + Math.random() * 3).toFixed(1);
  const uptime = +(99.8 + Math.random() * 0.1).toFixed(2);

  const avgDistance = detections.length > 0 
    ? +(detections.reduce((sum, d) => sum + d.distance, 0) / detections.length).toFixed(1)
    : 0.0;

  return {
    vesselId,
    deviceId,
    timestamp: Date.now(),
    forwardDistance: +forwardDistance.toFixed(1),
    portDistance: +portDistance.toFixed(1),
    starboardDistance: +starboardDistance.toFixed(1),
    riskLevel,
    detections,
    totalScans,
    objectsTracked,
    avgDistance,
    range,
    scanRate,
    beamAngle,
    resolution,
    detectionAccuracy,
    falsePositiveRate,
    processingLatency,
    uptime,
    signalQuality
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