const EventEmitter = require("events");

// Angular shortest-path lerp — prevents 359°→0° snap
function lerpAngle(current, target, factor) {
  const delta = ((target - current + 540) % 360) - 180;
  return (current + delta * factor + 360) % 360;
}

class ShipState extends EventEmitter {
  constructor() {
    super();
    // Position
    this.lat = parseFloat(process.env.VESSEL_START_LAT || "18.9220");
    this.lng = parseFloat(process.env.VESSEL_START_LNG || "72.8347");
    this.heading = 45; // degrees, 0=N, clockwise
    this.speed = 0;    // knots

    // Derived every tick
    this.headingRad = 0;
    this.speedMs = 0;

    // Mission & Routing
    this.missionActive = false;
    this.missionOwner = null; // 'navigation' | 'mission' | null
    this.waypoints = [];
    this.currentWaypointIndex = 0;
    this.avoidanceZones = [];
    this.routePoints = []; // computed water-only path
    this.distanceRemaining = 0;
    this.etaSeconds = 0;
    
    // Environmental State (Shared)
    this.depth = 20;

    // Events flags
    this.justReachedWaypoint = false;
    this.justCompletedMission = false;

    // Speed target for drift lerping
    this._speedTarget = 0;
    this._tickCount = 0;
  }

  // Master tick — 100ms — ONLY place position updates
  masterTick(waterRouter, pathSplitter) {
    this._tickCount++;
    this.justReachedWaypoint = false;
    this.justCompletedMission = false;

    this.headingRad = (this.heading - 90) * Math.PI / 180;
    this.speedMs = this.speed * 0.51444;

    if (this.missionActive) {
      this.runMissionSteering();
    } else {
      this.runHeadingDrift();
    }

    // Dead reckoning — single authoritative position update
    const dt = 0.1; // 100ms in seconds
    const distM = this.speedMs * dt;
    this.lat += (distM * Math.cos(this.headingRad)) / 111320;
    this.lng += (distM * Math.sin(this.headingRad)) / (111320 * Math.cos(this.lat * Math.PI / 180));

    // Dynamic Depth (Seafloor mapping based on lat/lng)
    const seafloor = 50 + 20 * Math.sin(this.lat * 500) * Math.cos(this.lng * 500);
    this.depth += (seafloor - this.depth) * 0.01;

    // Recompute derived stats
    if (this.missionActive && this.routePoints.length > 0) {
      this.distanceRemaining = this.computeRouteDistanceFromIndex(this.routePoints, this.currentWaypointIndex);
      this.etaSeconds = this.speedMs > 0 ? this.distanceRemaining / this.speedMs : 0;
    }

    // Emit event so simulators can react
    this.emit("tick", this);
  }

  runHeadingDrift() {
    const t = Date.now() / 1000;
    // Gentle sinusoidal heading drift — realistic ocean steering
    this.heading += 0.3 * Math.sin(t / 40);
    this.heading = ((this.heading % 360) + 360) % 360;

    // Speed: lerp toward idle speed
    this._speedTarget = 1.5 + 0.5 * Math.sin(t / 100);
    this.speed += (this._speedTarget - this.speed) * 0.03;
  }

  runMissionSteering() {
    if (!this.missionActive || this.routePoints.length === 0) return;

    const WAYPOINT_ARRIVAL_RADIUS_M = 30;

    // Find nearest point on route ahead of current position
    const target = this.routePoints[this.currentWaypointIndex];
    if (!target) {
      this.missionActive = false;
      this.justCompletedMission = true;
      return;
    }

    // Distance to current route point
    const dLat = (target.lat - this.lat) * 111320;
    const dLng = (target.lng - this.lng) * 111320 * Math.cos(this.lat * Math.PI / 180);
    const distM = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distM < WAYPOINT_ARRIVAL_RADIUS_M) {
      this.currentWaypointIndex++;
      this.justReachedWaypoint = true;
      return;
    }

    // Bearing to target
    const targetBearing = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;

    // Steer: max 1.5°/tick — smooth turn
    this.heading = lerpAngle(this.heading, targetBearing, 0.06);

    // Speed: maintain mission speed, slow near waypoints
    const approachFactor = Math.min(1, distM / 100);
    const missionSpeed = 5 + approachFactor * 2; // 5-7 kts during mission
    this.speed += (missionSpeed - this.speed) * 0.04;
  }

  computeRouteDistanceFromIndex(route, fromIndex) {
    if (fromIndex >= route.length) return 0;
    let dist = 0;
    // Distance from vessel to first point
    const dLat = (route[fromIndex].lat - this.lat) * 111320;
    const dLng = (route[fromIndex].lng - this.lng) * 111320 * Math.cos(this.lat * Math.PI / 180);
    dist += Math.sqrt(dLat * dLat + dLng * dLng);

    // Accumulate rest of the route
    for (let i = fromIndex; i < route.length - 1; i++) {
        const dLat = (route[i + 1].lat - route[i].lat) * 111320;
        const dLng = (route[i + 1].lng - route[i].lng) * 111320 * Math.cos(route[i].lat * Math.PI / 180);
        dist += Math.sqrt(dLat * dLat + dLng * dLng);
    }
    return dist;
  }
}

// Global instance
const shipState = new ShipState();
module.exports = shipState;
