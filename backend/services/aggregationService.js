const deviceRegistryService = require("./deviceRegistryService");

const rawVesselData = {};
const aggregatedVesselState = {};

const metricPriority = {
  depth: ["CTD"],
  temperature: ["CTD"],
  salinity: ["CTD"],
  conductivity: ["CTD"],
  pressure: ["CTD"],

  latitude: ["GNSS"],
  longitude: ["GNSS"],
  heading: ["GNSS"],
  speed: ["GNSS"],
  course: ["GNSS"],
  satellites: ["GNSS"],
  hdop: ["GNSS"],

  direction: ["CURRENTMETER"],
  u_component: ["CURRENTMETER"],
  v_component: ["CURRENTMETER"],

  rpm: ["THRUSTER"],
  power: ["THRUSTER"],
  thrust: ["THRUSTER"],

  detections: ["OAS"],
  range: ["OAS"]
};

class AggregationService {
  updateRawData(payload) {
    const { vesselId, deviceId } = payload;

    if (!rawVesselData[vesselId]) {
      rawVesselData[vesselId] = {};
    }

    rawVesselData[vesselId][deviceId] = payload;
  }

  resolveMetric(vesselId, metric) {
    const devices = rawVesselData[vesselId];
    if (!devices) return null;

    const activeDevices = deviceRegistryService.getActiveDevices(vesselId);
    const priorityOrder = metricPriority[metric] || [];

    for (let type of priorityOrder) {
      const match = activeDevices.find(d =>
        d.type === type &&
        devices[d.deviceId] &&
        devices[d.deviceId][metric] !== undefined
      );

      if (match) {
        return devices[match.deviceId][metric];
      }
    }

    return null;
  }

  recomputeVessel(vesselId) {
    if (!rawVesselData[vesselId]) return;

    const metrics = Object.keys(metricPriority);
    const resolved = {};

    for (let metric of metrics) {
      resolved[metric] = this.resolveMetric(vesselId, metric);
    }

    const activeDevices = deviceRegistryService.getActiveDevices(vesselId);

    aggregatedVesselState[vesselId] = {
      ...resolved,
      activeSensors: activeDevices.length,
      lastUpdated: Date.now()
    };
  }

  getAggregatedState(vesselId) {
    return aggregatedVesselState[vesselId] || null;
  }

  getAllAggregatedStates() {
    return aggregatedVesselState;
  }
}

module.exports = new AggregationService();