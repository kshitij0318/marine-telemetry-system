
const ALERT_COOLDOWNS = {}; // { alertId: lastEmittedTimestamp }

function formatETA(seconds) {
  if (!seconds || seconds < 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * @param {object} aggregatedState - State from aggregationService
 * @param {object|null} missionState - Active mission or null
 * @returns {Alert[]}
 */
function checkAndEmitAlerts(aggregatedState, missionState) {
  const alerts = [];
  const now = Date.now();

  function emit(id, cooldownMs, alert) {
    if (now - (ALERT_COOLDOWNS[id] || 0) < cooldownMs) return;
    ALERT_COOLDOWNS[id] = now;
    alerts.push({ ...alert, id: `${id}-${now}`, acknowledged: false });
  }

  const gnss = aggregatedState?.gnss;
  const thruster = aggregatedState?.thruster;
  const radar = aggregatedState?.radar;
  const ctd = aggregatedState?.ctd;

  if (missionState?.active) {
    const remaining = missionState?.waypoints?.length - missionState?.currentWaypointIndex || 0;
    emit('mission-active', 30000, {
      severity: 'info',
      category: 'mission',
      title: 'Mission In Progress',
      message: `Active route via ${missionState.ownerPage || 'mission'}. ETA: ${formatETA(missionState.eta)}. ${remaining} waypoint(s) remaining.`,
      timestamp: now,
    });
  }

  if (thruster) {
    const maxTemp = thruster.tempWarningThreshold || 85;
    if (thruster.temperature > maxTemp) {
      emit('thruster-overheat', 20000, {
        severity: 'critical',
        category: 'sensor',
        title: 'Thruster Overheat',
        message: `Temperature ${thruster.temperature?.toFixed(1)}°C exceeds ${maxTemp}°C limit.`,
        timestamp: now,
      });
    } else if (thruster.temperature > maxTemp * 0.85) {
      emit('thruster-warm', 30000, {
        severity: 'warning',
        category: 'sensor',
        title: 'Thruster Temperature Elevated',
        message: `Temperature ${thruster.temperature?.toFixed(1)}°C approaching limit of ${maxTemp}°C.`,
        timestamp: now,
      });
    }
    const maxRpm = thruster.maxRpm || 2220;
    if (thruster.rpm > maxRpm * 0.92) {
      emit('thruster-rpm', 15000, {
        severity: 'warning',
        category: 'sensor',
        title: 'High Thruster RPM',
        message: `Thruster at ${thruster.rpm?.toFixed(0)} RPM (${((thruster.rpm/maxRpm)*100).toFixed(0)}% capacity).`,
        timestamp: now,
      });
    }
  }

  if (gnss?.satellites !== undefined) {
    if (gnss.satellites < 5) {
      emit('gnss-degraded', 30000, {
        severity: 'critical',
        category: 'sensor',
        title: 'GNSS Signal Critical',
        message: `Only ${gnss.satellites} satellites in view. Position accuracy severely degraded.`,
        timestamp: now,
      });
    } else if (gnss.satellites < 8) {
      emit('gnss-low', 60000, {
        severity: 'warning',
        category: 'sensor',
        title: 'GNSS Signal Low',
        message: `${gnss.satellites} satellites in view. Fix quality may be reduced.`,
        timestamp: now,
      });
    }
    if ((gnss.hdop || 0) > 3.0) {
      emit('gnss-hdop', 30000, {
        severity: 'warning',
        category: 'sensor',
        title: 'GNSS HDOP Elevated',
        message: `Position dilution of precision (HDOP: ${gnss.hdop?.toFixed(2)}) is above acceptable threshold.`,
        timestamp: now,
      });
    }
  }

  if (radar?.detections) {
    const highThreats = radar.detections.filter(d => d.threat === 'high');
    if (highThreats.length > 0) {
      const nearest = Math.min(...highThreats.map(d => d.distance));
      emit('radar-collision', 15000, {
        severity: 'critical',
        category: 'safety',
        title: `Collision Warning — ${highThreats.length} Obstacle(s)`,
        message: `Nearest high-threat object at ${nearest.toFixed(0)}m. Immediate evasive action required.`,
        timestamp: now,
      });
    }
  }

  if (ctd) {
    if (!checkAndEmitAlerts._prevDepth) checkAndEmitAlerts._prevDepth = ctd.depth;
    const depthDelta = Math.abs(ctd.depth - checkAndEmitAlerts._prevDepth);
    if (depthDelta > 5) {
      emit('ctd-depth-change', 10000, {
        severity: 'warning',
        category: 'sensor',
        title: 'Rapid Depth Change',
        message: `Depth changed ${depthDelta.toFixed(1)}m. Verify seafloor proximity.`,
        timestamp: now,
      });
    }
    checkAndEmitAlerts._prevDepth = ctd.depth;
  }

  return alerts;
}

module.exports = { checkAndEmitAlerts };
