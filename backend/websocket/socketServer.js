const WebSocket = require("ws");
const aggregationService = require("../services/aggregationService");
const { checkAndEmitAlerts } = require("../services/notificationEngine");

let wss;
let latestAlerts = []; // Rolling cache of last emitted alerts

// ── Global state (backend is single source of truth) ─────────────────────────
const missions = {}; // { vesselId: MissionState }
let navDest = null;  // { lat, lng, name, set: true }

// ── Geo helpers ───────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Compute mission ETA/remaining ─────────────────────────────────────────────
function computeMissionETA(mission, gnss) {
  if (!gnss || !mission || !mission.waypoints || !mission.waypoints.length) return;
  
  // SYNC: Use the waypoint index reported by the simulator if available
  const idx = gnss.currentWaypointIndex !== undefined ? gnss.currentWaypointIndex : mission.currentWaypointIndex;
  mission.currentWaypointIndex = idx;
  
  // SYNC: Update active status from simulator
  if (gnss.missionActive !== undefined) {
    mission.active = gnss.missionActive;
  }

  if (idx >= mission.waypoints.length) {
    mission.eta = 0;
    mission.distanceRemaining = 0;
    return;
  }

  const wp = mission.waypoints[idx];
  const distToWp = haversine(gnss.latitude, gnss.longitude, wp.lat, wp.lng);
  let distRemaining = distToWp;
  for (let i = idx; i < mission.waypoints.length - 1; i++) {
    distRemaining += haversine(
      mission.waypoints[i].lat, mission.waypoints[i].lng,
      mission.waypoints[i + 1].lat, mission.waypoints[i + 1].lng
    );
  }
  const speedMs = Math.max((gnss.speed || 5) * 0.51444, 0.1);
  mission.eta = distRemaining / speedMs;
  mission.distanceRemaining = distRemaining;
}

// ── Compute navigation-destination ETA ───────────────────────────────────────
function computeNavETA(gnss) {
  if (!navDest || !gnss) return null;
  const dist = haversine(gnss.latitude, gnss.longitude, navDest.lat, navDest.lng);
  const speedMs = Math.max((gnss.speed || 5) * 0.51444, 0.1);
  return {
    ...navDest,
    distanceRemaining: gnss.distanceRemaining ?? +dist.toFixed(0),
    eta: gnss.etaSeconds ?? +(dist / speedMs).toFixed(0),
    routePoints: gnss.routePoints || [],
  };
}

// ── WebSocket server ──────────────────────────────────────────────────────────
function init(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (msg) => {
      try {
        const cmd = JSON.parse(msg);
        if (!cmd || !cmd.type) return;

        // Resolve Circular Dependency: require inside handler
        const mqttClient = require("../services/mqttSubscriberService");

        if (cmd.type === "START_MISSION") {
          const vesselId = cmd.vesselId || "V001";
          missions[vesselId] = {
            active: true,
            ownerPage: cmd.ownerPage || "mission",
            waypoints: cmd.waypoints || [],
            currentWaypointIndex: 0,
            completedWaypoints: [],
            eta: cmd.estimatedDuration || 0,
            distanceRemaining: cmd.estimatedDistance || 0,
          };
          
          navDest = null;
          mqttClient.publish("COMMANDS/MISSION", JSON.stringify(cmd));
          mqttClient.publish("COMMANDS/NAVIGATION", JSON.stringify({ type: 'CLEAR_NAVIGATION_DESTINATION' }));
          
          console.log(`Mission command sent for ${vesselId}`);
          broadcastParentUpdate(vesselId);
        }

        if (cmd.type === "STOP_MISSION") {
          const vesselId = cmd.vesselId || "V001";
          if (missions[vesselId]) missions[vesselId].active = false;
          mqttClient.publish("COMMANDS/MISSION", JSON.stringify(cmd));
          broadcastParentUpdate(vesselId);
        }

        if (cmd.type === "SET_NAVIGATION_DESTINATION") {
          if (!cmd.payload) return;
          navDest = {
            lat: cmd.payload.lat,
            lng: cmd.payload.lng,
            name: cmd.payload.name || "Destination",
            set: true,
          };

          const vesselId = cmd.vesselId || "V001";
          if (missions[vesselId]) missions[vesselId].active = false;

          mqttClient.publish("COMMANDS/NAVIGATION", JSON.stringify(cmd));
          mqttClient.publish("COMMANDS/MISSION", JSON.stringify({ type: 'STOP_MISSION', vesselId }));

          console.log(`Navigation command sent: ${navDest.name}`);
          broadcastParentUpdate(vesselId);
        }

        if (cmd.type === "CLEAR_NAVIGATION_DESTINATION") {
          navDest = null;
          mqttClient.publish("COMMANDS/NAVIGATION", JSON.stringify({ type: 'CLEAR_NAVIGATION_DESTINATION' }));
          broadcastParentUpdate(cmd.vesselId || "V001");
        }
      } catch (err) {
        console.error("WS command parse error:", err);
      }
    });

    ws.on("close", () => console.log("WebSocket client disconnected"));
  });

  // ── Notification engine 1Hz loop ──────────────────────────────────────────
  setInterval(() => {
    const vesselId = 'V001';
    const state = aggregationService.getAggregatedState(vesselId);
    const mission = missions[vesselId] || null;
    const newAlerts = checkAndEmitAlerts(state, mission);
    if (newAlerts.length > 0) {
      // Merge into rolling cache, cap at 100
      latestAlerts = [...newAlerts, ...latestAlerts].slice(0, 100);
      broadcastParentUpdate(vesselId);
    }
  }, 1000);
}

// ── Broadcast telemetry update to all clients ─────────────────────────────────
function broadcastParentUpdate(vesselId) {
  if (!wss || !vesselId) return;
  const state = aggregationService.getAggregatedState(vesselId);
  if (!state) return;

  const gnss = state.gnss || null;
  const mission = missions[vesselId] || null;
  
  // Synchronize mission analytics with simulator feedback
  if (mission && gnss) {
    computeMissionETA(mission, gnss);
  }

  const missionState = mission ? {
    active:                mission.active,
    ownerPage:             mission.ownerPage,
    waypoints:             mission.waypoints,
    routePoints:           gnss.routePoints || [],
    currentWaypointIndex:  mission.currentWaypointIndex,
    completedWaypoints:    mission.completedWaypoints,
    eta:                   gnss.etaSeconds ?? mission.eta,
    distanceRemaining:     gnss.distanceRemaining ?? mission.distanceRemaining,
  } : null;

  const navigationDestination = computeNavETA(gnss);

  const payload = JSON.stringify({
    type: "parent-update",
    vesselId,
    data: state,
    missionState,
    navigationDestination,
    alerts: latestAlerts.slice(0, 20), // send latest 20 alerts
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = { init, broadcastParentUpdate };