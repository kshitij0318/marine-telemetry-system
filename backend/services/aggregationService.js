const deviceRegistryService = require("./deviceRegistryService");

// rawVesselData: { vesselId: { deviceId: fullPayload } }
const rawVesselData = {};

// Map: sensorType → namespace key in aggregated state
const SENSOR_TYPE_TO_KEY = {
  GNSS:        'gnss',
  CTD:         'ctd',
  CURRENTMETER:'currentMeter',
  THRUSTER:    'thruster',
  OAS:         'oas',
};

class AggregationService {
  updateRawData(payload) {
    const { vesselId, deviceId } = payload;
    if (!vesselId || !deviceId) return;
    if (!rawVesselData[vesselId]) rawVesselData[vesselId] = {};
    rawVesselData[vesselId][deviceId] = payload;
  }

  /**
   * Recompute aggregated state for a vessel.
   * Instead of a flat merged object (which caused field collisions),
   * we now produce NAMESPACED sensor data:
   *   state.gnss, state.ctd, state.currentMeter, state.thruster, state.oas
   * Each namespace contains ALL fields emitted by that simulator.
   */
  recomputeVessel(vesselId) {
    if (!rawVesselData[vesselId]) return;

    const activeDevices = deviceRegistryService.getActiveDevices(vesselId);
    const namespace = {};

    for (const device of activeDevices) {
      const key = SENSOR_TYPE_TO_KEY[device.type];
      if (!key) continue;
      const payload = rawVesselData[vesselId][device.deviceId];
      if (!payload) continue;
      // Merge the full payload under the namespace key (last writer wins per sensor type)
      namespace[key] = { ...payload };
    }

    // Preserve any existing namespace keys for inactive sensors
    // (Keep last known good data, just won't be refreshed)
    if (!this._aggregated) this._aggregated = {};
    if (!this._aggregated[vesselId]) this._aggregated[vesselId] = {};

    for (const [key, data] of Object.entries(namespace)) {
      this._aggregated[vesselId][key] = data;
    }

    this._aggregated[vesselId].activeSensors = activeDevices.length;
    this._aggregated[vesselId].lastUpdated = Date.now();
  }

  getAggregatedState(vesselId) {
    return this._aggregated?.[vesselId] || null;
  }

  getAllAggregatedStates() {
    return this._aggregated || {};
  }
}

module.exports = new AggregationService();