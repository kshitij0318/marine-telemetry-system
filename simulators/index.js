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

const shipState = require("./shipState");
const waterRouter = require("./waterRouter");
const pathSplitter = require("./pathSplitter");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log(`Physics Engine Connected. Launching coherent simulations for ${vesselId}`);

  // The master physics tick
  setInterval(() => {
    shipState.masterTick(null, null); // We will inject waterRouter and pathSplitter in later phases
  }, 100);

  // Core Command Handlers
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
          shipState.currentWaypointIndex = 0;
          shipState.missionActive = true;
          
          // Phase 2 & 4: Water-Only Routing Engine + Path Splitter
          // Wait for async routing before applying dynamically computed route Points
          let rawRoute = await waterRouter.computeWaterRoute(shipState.lat, shipState.lng, shipState.waypoints);
          
          // Apply avoidance zone dynamic path splitting
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

          // Compute water-only route
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

  // Initialize and attach standard simulators to the shared memory bus
  GNSSSimulator.start(client, vesselId, shipState);
  CTDSimulator.start(client, vesselId, shipState);
  CurrentMeterSimulator.start(client, vesselId, shipState);
  ThrusterSimulator.start(client, vesselId, shipState);
  OASSimulator.start(client, vesselId, shipState);
});
