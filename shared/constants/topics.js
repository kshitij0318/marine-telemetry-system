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
  }
};