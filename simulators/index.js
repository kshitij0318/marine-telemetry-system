const mqtt = require("mqtt");
const topics = require("../shared/constants/topics");
const GNSSSimulator = require("./gnss/GNSSSimulator");
const CTDSimulator = require("./ctd/CTDSimulator");
const CurrentMeterSimulator = require("./currentMeter/CurrentMeterSimulator");
const ThrusterSimulator = require("./thruster/ThrusterSimulator");
const OASSimulator = require("./oas/OASSimulator");

const vesselId = process.env.VESSEL_ID || "V001";

// Feature 8: Start position driven by env vars — relocate simulation anywhere.
// Set VESSEL_START_LAT / VESSEL_START_LNG to move the ship to any coordinate.
const START_LAT = parseFloat(process.env.VESSEL_START_LAT || "18.9000");
const START_LNG = parseFloat(process.env.VESSEL_START_LNG || "72.6500");

// The globally shared simulation physics pool
const shipState = {
  lat:     START_LAT,
  lng:     START_LNG,
  heading: 270, // West — into open Arabian Sea water by default
  speed:   0,
  depth:   20,
  roll:    0,
  pitch:   0,
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
