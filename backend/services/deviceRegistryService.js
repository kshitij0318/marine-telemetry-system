const DEVICE_TIMEOUT_MS = 5000;

class DeviceRegistryService {
  constructor() {
    this.vessels = {};
  }

  registerDevice(vesselId, deviceId, type) {
    if (!this.vessels[vesselId]) {
      this.vessels[vesselId] = { devices: {} };
    }

    this.vessels[vesselId].devices[deviceId] = {
      vesselId,
      deviceId,
      type,
      lastUpdate: Date.now(),
      status: "ACTIVE"
    };
  }

  updateHeartbeat(vesselId, deviceId) {
    if (!this.vessels[vesselId]?.devices[deviceId]) return;

    this.vessels[vesselId].devices[deviceId].lastUpdate = Date.now();
  }

  markInactiveDevices() {
    const now = Date.now();

    for (const vessel of Object.values(this.vessels)) {
      for (const device of Object.values(vessel.devices)) {
        if (now - device.lastUpdate > DEVICE_TIMEOUT_MS) {
          device.status = "INACTIVE";
        } else {
          device.status = "ACTIVE";
        }
      }
    }
  }

  getActiveDevices(vesselId) {
    return Object.values(this.vessels[vesselId]?.devices || {})
      .filter(d => d.status === "ACTIVE");
  }

  getAllVessels() {
    return this.vessels;
  }
}

module.exports = new DeviceRegistryService();