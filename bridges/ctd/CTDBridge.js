const mqtt = require("mqtt");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const parseCTD = require("./parser");
const topics = require("../../shared/constants/topics");

const mqttClient = mqtt.connect("mqtt://localhost:1883");

const port = new SerialPort({
  path: "COM5",
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

mqttClient.on("connect", () => {
  console.log("CTD Bridge connected to MQTT");
  mqttClient.subscribe(topics.CTD.COMMAND);
});

parser.on("data", (line) => {
  const parsed = parseCTD(line);
  if (!parsed) return;

  mqttClient.publish(
    topics.CTD.DATA,
    JSON.stringify(parsed)
  );
});

mqttClient.on("message", (topic, message) => {
  if (topic === topics.CTD.COMMAND) {
    port.write(message.toString() + "\n");
  }
});