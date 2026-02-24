const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
app.use(cors());
app.use(express.json());

const mqttClient = mqtt.connect("mqtt://localhost:1883");

let deviceRegistry = {};
let history = {};

function validateCTD(data) {
  const requiredFields = [
    "timestamp",
    "pressure",
    "depth",
    "salinity",
    "waterTemperature",
    "conductivity",
    "altimeter",
    "soundVelocity",
    "waterDensity"
  ];

  return requiredFields.every(field => field in data);
}

mqttClient.on("connect", () => {
  mqttClient.subscribe("vessel/+/ctd/+/data");
});

mqttClient.on("message", (topic, message) => {
  const parsed = JSON.parse(message.toString());

  if (!validateCTD(parsed)) {
    console.warn("Invalid CTD payload");
    return;
  }

  const { vesselId, deviceId } = parsed;
  const key = `${vesselId}-${deviceId}`;

  deviceRegistry[key] = parsed;

  if (!history[key]) history[key] = [];
  history[key].push(parsed);
  if (history[key].length > 200) history[key].shift();

  broadcast({
    type: "ctd-update",
    data: parsed
  });
});

app.get("/api/ctd/devices", (req, res) => {
  res.json(Object.values(deviceRegistry));
});

app.get("/api/ctd/history/:vesselId/:deviceId", (req, res) => {
  const key = `${req.params.vesselId}-${req.params.deviceId}`;
  res.json(history[key] || []);
});

app.post("/api/ctd/command", (req, res) => {
  const { vesselId, deviceId, command } = req.body;

  const topic = `vessel/${vesselId}/ctd/${deviceId}/command`;
  mqttClient.publish(topic, command);

  res.json({ status: "sent" });
});

const server = app.listen(5000, () =>
  console.log("Backend running on port 5000")
);

const wss = new WebSocket.Server({ server });

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}