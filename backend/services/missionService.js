class MissionService {
  constructor() {
    this.isActive = false;
    this.waypoints = [];
  }

  getMissionState() {
    return {
      isActive: this.isActive,
      waypoints: this.waypoints
    };
  }

  setWaypoints(waypoints) {
    this.waypoints = waypoints;
    return this.getMissionState();
  }

  addWaypoint(waypoint) {
    this.waypoints.push(waypoint);
    return this.getMissionState();
  }

  clearWaypoints() {
    this.waypoints = [];
    if (this.isActive) this.isActive = false; // Stop mission if no path
    return this.getMissionState();
  }

  setMissionStatus(active) {
    if (active && this.waypoints.length === 0) {
      throw new Error('Cannot start mission without waypoints');
    }
    this.isActive = active;
    return this.getMissionState();
  }
}

module.exports = new MissionService();
