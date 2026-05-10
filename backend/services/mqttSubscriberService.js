const mqtt = require("mqtt");
const deviceRegistryService = require("./deviceRegistryService");
const aggregationService = require("./aggregationService");
const socketServer = require("../websocket/socketServer");

// MQTT Explorer Manual Test
// ─────────────────────────────────────────────────────────────────────
// 1. Set DISABLE_SIMULATORS=true in .env, restart Docker
// 2. Open MQTT Explorer, connect to localhost:1883
// 3. Publish to: vessel/V001/gnss
//    Payload: {
//      "latitude": 18.9220, "longitude": 72.8347,
//      "heading": 90.0, "speed": 7.5,
//      "satellites": 10, "hdop": 1.1, "fixType": "DGPS",
//      "status": "active", "timestamp": 1700000000000
//    }
// 4. Frontend GNSS dashboard should update immediately
// 5. Run Python simulator: python marine_sensor_simulator.py
//    to publish all sensors automatically

const MQTT_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("MQTT Subscriber connected");
  client.subscribe("vessel/+/#");
});

client.on("reconnect", () => {
  console.log("MQTT Subscriber attempting to reconnect...");
});

client.on("error", (err) => {
  console.error("MQTT Subscriber Error:", err.message);
});

client.on("close", () => {
  console.log("MQTT Subscriber connection closed");
});

client.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    const parts = topic.split("/");
    const vesselId = parts[1];
    let sensorType, deviceId;
    
    if (parts.length === 3) {
      sensorType = parts[2].toUpperCase();
      deviceId = `${sensorType}01`;
    } else if (parts.length >= 4) {
      sensorType = parts[2].toUpperCase();
      deviceId = parts[3];
    } else {
      return;
    }

    if (!vesselId || !deviceId) return;
    
    payload.vesselId = payload.vesselId || vesselId;
    payload.deviceId = payload.deviceId || deviceId;

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