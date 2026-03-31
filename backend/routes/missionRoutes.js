const express = require('express');
const router = express.Router();
const missionService = require('../services/missionService');

// Get full mission state
router.get('/', (req, res) => {
  res.json(missionService.getMissionState());
});

// Sync entire waypoint array
router.post('/waypoints', (req, res) => {
  try {
    const { waypoints } = req.body;
    if (!Array.isArray(waypoints)) return res.status(400).json({ error: 'Waypoints must be an array' });
    const state = missionService.setWaypoints(waypoints);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all waypoints
router.delete('/waypoints', (req, res) => {
  res.json(missionService.clearWaypoints());
});

// Start mission
router.post('/start', (req, res) => {
  try {
    res.json(missionService.setMissionStatus(true));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stop mission
router.post('/stop', (req, res) => {
  res.json(missionService.setMissionStatus(false));
});

module.exports = router;
