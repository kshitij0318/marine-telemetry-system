const express = require('express');
const router = express.Router();
const aggregationService = require('../services/aggregationService');

router.get('/', (req, res) => {
  try {
    const states = aggregationService.getAllAggregatedStates();
    // Convert object to array and ensure active state structure
    const fleet = Object.keys(states).map(vesselId => ({
      id: vesselId,
      name: vesselId === 'MV-001' ? 'Research Vessel Alpha' : 
            vesselId === 'MV-002' ? 'Survey Vessel Beta' : 'Support Vessel Gamma', // Mocking nice names,
      status: states[vesselId].activeSensors > 0 ? 'active' : 'offline',
      ...states[vesselId]
    }));
    res.json(fleet);
  } catch (error) {
    console.error('Failed to fetch fleet state:', error);
    res.status(500).json({ error: 'Failed to retrieve fleet telemetry' });
  }
});

module.exports = router;
