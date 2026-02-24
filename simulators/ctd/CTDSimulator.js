const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;

function generateCTDData() {
  return {
    depth: +(Math.random() * 500).toFixed(2),
    temperature: +(10 + Math.random() * 15).toFixed(2),
    conductivity: +(3 + Math.random()).toFixed(2),
    timestamp: Date.now()
  };
}

client.on("connect", () => {
  console.log("CTD Simulator connected to MQTT");

  client.subscribe(topics.CTD.COMMAND);

  setInterval(() => {
    if (running) {
      const data = generateCTDData();
      client.publish(topics.CTD.DATA, JSON.stringify(data));
    }
  }, interval);
});

client.on("message", (topic, message) => {
  const command = message.toString();

  if (command === "START") running = true;
  if (command === "STOP") running = false;

  if (command.startsWith("SET_RATE")) {
    interval = parseInt(command.split(" ")[1]);
    console.log("Rate changed to", interval);
  }
});