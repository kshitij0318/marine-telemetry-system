const mqtt = require("mqtt");
const deviceRegistryService = require("./deviceRegistryService");
const aggregationService = require("./aggregationService");
const socketServer = require("../websocket/socketServer");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("MQTT Subscriber connected");
  client.subscribe("vessel/+/+/+/data");
});

client.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    const parts = topic.split("/");
    const vesselId = parts[1];
    const sensorType = parts[2].toUpperCase();
    const deviceId = parts[3];

    if (!vesselId || !deviceId) return;

    deviceRegistryService.registerDevice(vesselId, deviceId, sensorType);
    deviceRegistryService.updateHeartbeat(vesselId, deviceId);

    aggregationService.updateRawData(payload);
    aggregationService.recomputeVessel(vesselId);

    socketServer.broadcastParentUpdate(vesselId);

  } catch (err) {
    console.error("MQTT parse error:", err);
  }
});

setInterval(() => {
  deviceRegistryService.markInactiveDevices();
}, 2000);

module.exports = client;