const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");
const WebSocket = require("ws");
const topics = require("../shared/constants/topics");

const app = express();
app.use(cors());
app.use(express.json());

const mqttClient = mqtt.connect("mqtt://localhost:1883");

let latestCTD = null;
let ctdHistory = [];

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
  mqttClient.subscribe(topics.CTD.DATA);
});

mqttClient.on("message", (topic, message) => {
  if (topic === topics.CTD.DATA) {
    const parsed = JSON.parse(message.toString());

    if (!validateCTD(parsed)) {
      console.warn("Invalid CTD payload received");
      return;
    }

    latestCTD = parsed;

    ctdHistory.push(parsed);
    if (ctdHistory.length > 200) {
      ctdHistory.shift();
    }

    broadcast(parsed);
  }
});

app.get("/api/ctd", (req, res) => {
  res.json(latestCTD);
});

app.get("/api/ctd/history", (req, res) => {
  res.json(ctdHistory);
});

app.post("/api/ctd/command", (req, res) => {
  const { command } = req.body;
  mqttClient.publish(topics.CTD.COMMAND, command);
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