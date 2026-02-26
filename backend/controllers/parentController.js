const aggregationService = require("../services/aggregationService");

exports.getParentState = (req, res) => {
  const { vesselId } = req.params;

  const state = aggregationService.getAggregatedState(vesselId);

  if (!state) {
    return res.status(404).json({ message: "Vessel not found or no data yet" });
  }

  res.json(state);
};

exports.getAllVessels = (req, res) => {
  const states = aggregationService.getAllAggregatedStates();
  res.json(states);
};