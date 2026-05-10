if (process.env.DISABLE_SIMULATORS === 'true') {
  console.log('[SIM] All simulators disabled. Waiting for external MQTT data.');
  // Keep process alive so Docker doesn't restart it, but do nothing
  setInterval(() => {}, 1000 * 60 * 60);
} else {

const mqtt = require("mqtt");
const topics = require("../shared/constants/topics");
const GNSSSimulator = require("./gnss/GNSSSimulator");
const CTDSimulator = require("./ctd/CTDSimulator");
const CurrentMeterSimulator = require("./currentMeter/CurrentMeterSimulator");
const ThrusterSimulator = require("./thruster/ThrusterSimulator");
const RadarSimulator = require("./radar/radarSimulator");

const vesselId = process.env.VESSEL_ID || "V001";

const START_LAT = 18.9000;
const START_LNG = 72.5000;

const shipState = require("./shipState");
const waterRouter = require("./waterRouter");
const pathSplitter = require("./pathSplitter");

const MQTT_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log(`Physics Engine Connected. Launching coherent simulations for ${vesselId}`);

  setInterval(() => {
    shipState.masterTick(waterRouter, pathSplitter); 
  }, 100);

  client.subscribe("COMMANDS/MISSION");
  client.subscribe("COMMANDS/NAVIGATION");

  client.on("message", async (topic, message) => {
    try {
      const cmd = JSON.parse(message.toString());
      if (topic === "COMMANDS/MISSION") {
        if (cmd.type === "START_MISSION") {
          shipState.missionOwner = cmd.ownerPage || "mission";
          shipState.waypoints = cmd.waypoints || [];
          shipState.avoidanceZones = cmd.avoidanceZones || [];
          shipState.geofences = cmd.geofences || [];
          shipState.currentWaypointIndex = 0;
          shipState.missionActive = true;
          
          let rawRoute = await waterRouter.computeWaterRoute(shipState.lat, shipState.lng, shipState.waypoints);
          
          shipState.routePoints = pathSplitter.computeReroutedPath(rawRoute, shipState.avoidanceZones);
          
        } else if (cmd.type === "STOP_MISSION") {
          shipState.missionActive = false;
        }
      } else if (topic === "COMMANDS/NAVIGATION") {
        if (cmd.type === "SET_NAVIGATION_DESTINATION") {
          shipState.missionActive = true; // Use steering engine
          shipState.missionOwner = "navigation";
          shipState.waypoints = [{ lat: cmd.payload.lat, lng: cmd.payload.lng }];
          shipState.avoidanceZones = []; // Nav mode usually doesn't have custom zones set via the UI immediately
          shipState.currentWaypointIndex = 0;

          let rawRoute = await waterRouter.computeWaterRoute(shipState.lat, shipState.lng, shipState.waypoints);
          shipState.routePoints = rawRoute;
          
        } else if (cmd.type === "CLEAR_NAVIGATION_DESTINATION") {
          if (shipState.missionOwner === "navigation") {
            shipState.missionActive = false;
          }
        }
      }
    } catch (e) {
      console.error("Simulation command parse error:", e);
    }
  });

  GNSSSimulator.start(client, vesselId, shipState);
  CTDSimulator.start(client, vesselId, shipState);
  CurrentMeterSimulator.start(client, vesselId, shipState);
  ThrusterSimulator.start(client, vesselId, shipState);
  RadarSimulator.start(client, vesselId, shipState);
});
}
