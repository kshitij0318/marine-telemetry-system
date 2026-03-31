const deviceRegistryService = require("./deviceRegistryService");

const rawVesselData = {};
const aggregatedVesselState = {};

const metricPriority = {
  depth: ["CTD"],
  soundVelocity: ["CTD"],
  waterTemperature: ["CTD"],
  salinity: ["CTD"],
  waterDensity: ["CTD"],
  pressure: ["CTD"],
  conductivity: ["CTD"],
  depthProfile: ["CTD"],

  latitude: ["GNSS"],
  longitude: ["GNSS"],
  speed: ["GNSS"],
  heading: ["GNSS"],
  altitude: ["GNSS"],
  satellites: ["GNSS"],

  currentSpeed: ["CURRENTMETER"],
  currentDirection: ["CURRENTMETER"],
  waterFlowRate: ["CURRENTMETER"],
  turbulenceIndex: ["CURRENTMETER"],
  eastwardComponent: ["CURRENTMETER"],
  northwardComponent: ["CURRENTMETER"],
  currentMeterTemperature: ["CURRENTMETER"],

  rpm: ["THRUSTER"],
  thrustPower: ["THRUSTER"],
  thrusterTemperature: ["THRUSTER"],
  thrusterStatus: ["THRUSTER"],
  voltage: ["THRUSTER"],
  currentDraw: ["THRUSTER"],
  powerConsumption: ["THRUSTER"],
  efficiency: ["THRUSTER"],
  runtimeHours: ["THRUSTER"],
  runtimeMinutes: ["THRUSTER"],

  forwardDistance: ["OAS"],
  portDistance: ["OAS"],
  starboardDistance: ["OAS"],
  riskLevel: ["OAS"],
  detections: ["OAS"],
  totalScans: ["OAS"],
  objectsTracked: ["OAS"],
  avgDistance: ["OAS"],
  range: ["OAS"],
  scanRate: ["OAS"],
  beamAngle: ["OAS"],
  resolution: ["OAS"],
  detectionAccuracy: ["OAS"],
  falsePositiveRate: ["OAS"],
  processingLatency: ["OAS"],
  uptime: ["OAS"],
  signalQuality: ["OAS"]
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