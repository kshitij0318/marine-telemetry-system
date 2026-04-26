module.exports = {
  CTD: {
    buildDataTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/ctd/${deviceId}/data`,
    buildCommandTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/ctd/${deviceId}/command`
  },

  GNSS: {
    buildDataTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/gnss/${deviceId}/data`,
    buildCommandTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/gnss/${deviceId}/command`
  },

  CURRENTMETER: {
    buildDataTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/currentMeter/${deviceId}/data`,
    buildCommandTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/currentMeter/${deviceId}/command`
  },

  THRUSTER: {
    buildDataTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/thruster/${deviceId}/data`,
    buildCommandTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/thruster/${deviceId}/command`
  },

  RADAR: {
    buildDataTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/radar/${deviceId}/data`,
    buildCommandTopic: (vesselId, deviceId) =>
      `vessel/${vesselId}/radar/${deviceId}/command`
  }
};