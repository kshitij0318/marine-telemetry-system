const express = require('express');
const router = express.Router();
const missionService = require('../services/missionService');

router.get('/', (req, res) => {
  res.json(missionService.getMissionState());
});

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

router.delete('/waypoints', (req, res) => {
  res.json(missionService.clearWaypoints());
});

router.post('/start', (req, res) => {
  try {
    res.json(missionService.setMissionStatus(true));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stop', (req, res) => {
  res.json(missionService.setMissionStatus(false));
});

module.exports = router;
