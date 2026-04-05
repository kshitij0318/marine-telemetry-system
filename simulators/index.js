const mqtt = require("mqtt");
const topics = require("../shared/constants/topics");
const GNSSSimulator = require("./gnss/GNSSSimulator");
const CTDSimulator = require("./ctd/CTDSimulator");
const CurrentMeterSimulator = require("./currentMeter/CurrentMeterSimulator");
const ThrusterSimulator = require("./thruster/ThrusterSimulator");
const OASSimulator = require("./oas/OASSimulator");

const vesselId = process.env.VESSEL_ID || "V001";

// The globally shared simulation physics pool
const shipState = {
  lat: 18.9000,
  lng: 72.6500,
  heading: 90,
  speed: 0,
  depth: 20,
  roll: 0,
  pitch: 0
};

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log(`Physics Engine Connected. Launching coherent simulations for ${vesselId}`);
  
  // Initialize and attach standard simulators to the shared memory bus
  GNSSSimulator.start(client, vesselId, shipState);
  CTDSimulator.start(client, vesselId, shipState);
  CurrentMeterSimulator.start(client, vesselId, shipState);
  ThrusterSimulator.start(client, vesselId, shipState);
  OASSimulator.start(client, vesselId, shipState);
});
