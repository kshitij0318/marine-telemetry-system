const mqtt = require("mqtt");
const topics = require("../../shared/constants/topics");

const client = mqtt.connect("mqtt://localhost:1883");

let interval = 1000;
let running = true;

let depth = 0;

function generateCTDData() {
  // Simulate descent
  depth += Math.random() * 2;

  const pressure = +(depth * 0.1).toFixed(2); // dBar approx
  const waterTemperature = +(20 - depth * 0.02 + Math.random()).toFixed(2);
  const conductivity = +(3 + Math.random() * 0.5).toFixed(3);
  const salinity = +(30 + conductivity * 1.5).toFixed(2);
  const altimeter = +(100 - depth).toFixed(2);
  const soundVelocity = +(1440 + waterTemperature * 4).toFixed(2);
  const waterDensity = +(1020 + salinity * 0.2).toFixed(2);

  return {
    timestamp: Date.now(),
    pressure,
    depth: +depth.toFixed(2),
    salinity,
    waterTemperature,
    conductivity,
    altimeter,
    soundVelocity,
    waterDensity
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

  if (command === "RESET") {
    depth = 0;
    console.log("Depth reset");
  }
});