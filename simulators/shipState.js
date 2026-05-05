const EventEmitter = require("events");
const turf = require("@turf/turf");

function lerpAngle(current, target, factor) {
  const delta = ((target - current + 540) % 360) - 180;
  return (current + delta * factor + 360) % 360;
}

class ShipState extends EventEmitter {
  constructor() {
    super();
    this.lat = 18.9000;
    this.lng = 72.5000;
    this.heading = 45; // degrees, 0=N, clockwise
    this.speed = 0;    // knots

    this.headingRad = 0;
    this.speedMs = 0;
    this.pitch = 0;
    this.roll = 0;
    this._lastHeading = 45;

    this.missionActive = false;
    this.missionOwner = null; // 'navigation' | 'mission' | null
    this.waypoints = [];
    this.currentWaypointIndex = 0;
    this.avoidanceZones = [];
    this.geofences = [];
    this.routePoints = []; // computed water-only path
    this.distanceRemaining = 0;
    this.etaSeconds = 0;
    
    this.depth = 20;

    this.justReachedWaypoint = false;
    this.justCompletedMission = false;

    this._speedTarget = 0;
    this._tickCount = 0;
  }

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

    this.enforceGeofences();

    const dt = 0.1; // 100ms in seconds
    const distM = this.speedMs * dt;
    this.lat += (distM * Math.cos(this.headingRad)) / 111320;
    this.lng += (distM * Math.sin(this.headingRad)) / (111320 * Math.cos(this.lat * Math.PI / 180));

    const seafloor = 50 + 20 * Math.sin(this.lat * 500) * Math.cos(this.lng * 500);
    this.depth += (seafloor - this.depth) * 0.01;

    if (this.missionActive && this.routePoints.length > 0) {
      this.distanceRemaining = this.computeRouteDistanceFromIndex(this.routePoints, this.currentWaypointIndex);
      this.etaSeconds = this.speedMs > 0 ? this.distanceRemaining / this.speedMs : 0;
    }

    const t = Date.now() / 1000;
    let turnRate = this.heading - this._lastHeading;
    if (turnRate > 180) turnRate -= 360;
    if (turnRate < -180) turnRate += 360;
    this._lastHeading = this.heading;

    this.pitch = Math.sin(t * 0.8) * 2 + (this.speedMs * 0.3);
    
    this.roll = Math.sin(t * 0.6) * 3 - (turnRate * 3.0);

    this.emit("tick", this);
  }

  runHeadingDrift() {
    const t = Date.now() / 1000;
    this.heading += 0.3 * Math.sin(t / 40);
    this.heading = ((this.heading % 360) + 360) % 360;

    this._speedTarget = 1.5 + 0.5 * Math.sin(t / 100);
    this.speed += (this._speedTarget - this.speed) * 0.03;
  }

  runMissionSteering() {
    if (!this.missionActive || this.routePoints.length === 0) return;

    const WAYPOINT_ARRIVAL_RADIUS_M = 30;

    const target = this.routePoints[this.currentWaypointIndex];
    if (!target) {
      this.missionActive = false;
      this.justCompletedMission = true;
      return;
    }

    const dLat = (target.lat - this.lat) * 111320;
    const dLng = (target.lng - this.lng) * 111320 * Math.cos(this.lat * Math.PI / 180);
    const distM = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distM < WAYPOINT_ARRIVAL_RADIUS_M) {
      this.currentWaypointIndex++;
      this.justReachedWaypoint = true;
      return;
    }

    const targetBearing = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;

    this.heading = lerpAngle(this.heading, targetBearing, 0.06);

    const approachFactor = Math.min(1, distM / 100);
    const missionSpeed = 5 + approachFactor * 2; // 5-7 kts during mission
    this.speed += (missionSpeed - this.speed) * 0.04;
  }

  computeRouteDistanceFromIndex(route, fromIndex) {
    if (fromIndex >= route.length) return 0;
    let dist = 0;
    const dLat = (route[fromIndex].lat - this.lat) * 111320;
    const dLng = (route[fromIndex].lng - this.lng) * 111320 * Math.cos(this.lat * Math.PI / 180);
    dist += Math.sqrt(dLat * dLat + dLng * dLng);

    for (let i = fromIndex; i < route.length - 1; i++) {
        const dLat = (route[i + 1].lat - route[i].lat) * 111320;
        const dLng = (route[i + 1].lng - route[i].lng) * 111320 * Math.cos(route[i].lat * Math.PI / 180);
        dist += Math.sqrt(dLat * dLat + dLng * dLng);
    }
    return dist;
  }

  enforceGeofences() {
    if (!this.geofences || this.geofences.length === 0) return;

    for (const fence of this.geofences.filter(f => f.active)) {
      const inside = this.isPointInsidePolygon(this.lat, this.lng, fence.points);
      
      if (fence.mode === 'exclusion' && inside) {
        this.heading = (this.heading + 180) % 360;
        console.warn(`[GEOFENCE] BREACH: Vessel entered exclusion zone ${fence.label}. Reversing heading.`);
        this.emit("alert", { 
          severity: 'critical', 
          title: 'GEOFENCE BREACH', 
          message: `Vessel entered exclusion zone ${fence.label}` 
        });
      }
      
      if (fence.mode === 'containment' && !inside) {
        const centroid = this.computeCentroid(fence.points);
        const bearingBack = this.bearingTo(this.lat, this.lng, centroid.lat, centroid.lng);
        this.heading = lerpAngle(this.heading, bearingBack, 0.1);
        
        if (this._tickCount % 50 === 0) { // Throttle alerts
          console.warn(`[GEOFENCE] BOUNDARY: Vessel outside containment zone ${fence.label}. Steering back.`);
          this.emit("alert", { 
            severity: 'warning', 
            title: 'GEOFENCE BOUNDARY', 
            message: `Vessel approaching boundary of ${fence.label}` 
          });
        }
      }
    }
  }

  isPointInsidePolygon(lat, lng, polygonPoints) {
    if (polygonPoints.length < 3) return false;
    try {
      const poly = turf.polygon([[
        ...polygonPoints.map(p => [p.lng, p.lat]),
        [polygonPoints[0].lng, polygonPoints[0].lat]
      ]]);
      return turf.booleanPointInPolygon(turf.point([lng, lat]), poly);
    } catch (e) {
      return false;
    }
  }

  computeCentroid(points) {
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
  }

  bearingTo(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
  }
}

const shipState = new ShipState();
module.exports = shipState;
