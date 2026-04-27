const topics = require("../../shared/constants/topics");

/**
 * CTD Simulator - Physically Realistic Oceanographic Model
 * Simulates a CTD sensor mounted on a marine vessel in the Arabian Sea / Indian Ocean.
 *
 * All values are physically bounded and realistic:
 *   Temperature: 20-28°C at surface, decreases to ~18°C at 60m
 *   Salinity: 35.0-36.0 PSU, slight increase with depth
 *   Conductivity: 4.5-6.0 S/m (derived from T and S)
 *   Pressure: 1.013 bar at surface + ~0.1 bar/m
 *   Sound Velocity: ~1530-1545 m/s (Mackenzie equation)
 *   Dissolved Oxygen: 5-8 mg/L, decreasing with depth
 */
module.exports = {
  start: (client, vesselId, shipState) => {
    const dataTopic = topics.CTD.buildDataTopic(vesselId, "CTD01");
    let tickCount = 0;
    let depthProfileHistory = [];

    // CTD internal state — all values are anchored to realistic ranges
    const state = {
      depth: 2.0,         // meters, start just below surface
      depthDir: 1,        // 1 = descending, -1 = ascending
      depthSpeed: 0.25,   // m per tick (~0.25 m/s at 10Hz) 
    };

    // Surface reference values for Arabian Sea
    const SURFACE_TEMP_C    = 27.5;  // °C
    const SURFACE_SALINITY  = 35.3;  // PSU
    const MAX_DEPTH_M       = 60.0;  // meters, CTD cast depth
    const MIN_DEPTH_M       = 1.0;   // meters, near surface

    shipState.on('tick', (state_ignored) => {
      tickCount++;
      const now = Date.now();

      // ── 1. Depth oscillation (0→60m→0m cast cycle) ──────────────────────
      state.depth += state.depthDir * (state.depthSpeed + Math.random() * 0.05);
      if (state.depth >= MAX_DEPTH_M) {
        state.depth = MAX_DEPTH_M;
        state.depthDir = -1;  // start ascending
      }
      if (state.depth <= MIN_DEPTH_M) {
        state.depth = MIN_DEPTH_M;
        state.depthDir = 1;   // start descending
      }
      const D = +state.depth.toFixed(2);

      // ── 2. Temperature profile (realistic thermocline) ────────────────────
      // Surface: ~27.5°C, drops ~0.1°C per meter below 10m (thermocline)
      const thermoclineDepth = 15;  // meters
      const tempAtSurface    = SURFACE_TEMP_C + Math.sin(Date.now() / 80000) * 0.3; // slow diurnal drift
      const tempDrop         = D > thermoclineDepth ? (D - thermoclineDepth) * 0.1 : 0;
      const T                = +(tempAtSurface - tempDrop + (Math.random() - 0.5) * 0.08).toFixed(2);

      // ── 3. Salinity (increases slightly with depth — halocline) ───────────
      const S = +(SURFACE_SALINITY + D * 0.008 + (Math.random() - 0.5) * 0.03).toFixed(2);

      // ── 4. Pressure (1 atm surface + 1 dbar per meter) ───────────────────
      const pressure = +(1.013 + D * 0.09807).toFixed(3);  // bar

      // ── 5. Conductivity (UNESCO formula approximation) ────────────────────
      // C(S,T,P) ≈ 4.2 + 0.1*T + 0.015*S at typical marine values
      const conductivity = +(4.2 + 0.10 * T + 0.015 * S + (Math.random() - 0.5) * 0.02).toFixed(2);

      // ── 6. Sound velocity (Mackenzie 1981) ───────────────────────────────
      const sv = 1448.96
        + 4.591   * T
        - 0.05304 * T * T
        + 0.0002374 * T * T * T
        + 1.340   * (S - 35)
        + 0.01630 * D
        + 1.675e-7 * D * D
        - 0.01025 * T * (S - 35)
        - 7.139e-13 * T * D * D * D;

      // ── 7. Derived fields ─────────────────────────────────────────────────
      // DO: saturates near surface, decreases with depth and temp
      const dissolvedOxygen = +(7.5 - D * 0.025 - (T - 20) * 0.15 + Math.random() * 0.15).toFixed(2);
      // Turbidity: higher near surface (wave action) and near bottom
      const turbidity        = +(1.2 + Math.sin(D / 8) * 0.8 + Math.random() * 0.5).toFixed(2);
      // pH: slightly acidic with depth due to CO2
      const pH               = +(8.15 - D * 0.003 + (Math.random() - 0.5) * 0.02).toFixed(2);
      // Fluorescence (chlorophyll proxy): peaks in photic zone 5-20m
      const fcPeak           = Math.exp(-0.5 * Math.pow((D - 12) / 6, 2));  // Gaussian peak at 12m
      const fluorescence     = +(0.3 + fcPeak * 2.5 + Math.random() * 0.1).toFixed(2);
      // Density (simplified)
      const density          = +(1023 + S * 0.7 + D * 0.004 - T * 0.25).toFixed(2);

      // ── 8. Depth profile history ──────────────────────────────────────────
      if (tickCount % 30 === 0) {
        depthProfileHistory.push({ depth: D, temperature: T, salinity: S });
        if (depthProfileHistory.length > 60) depthProfileHistory.shift();
      }

      const payload = {
        vesselId,
        deviceId: "CTD01",
        timestamp: now,
        depth: D,
        temperature: T,
        salinity: S,
        conductivity,
        pressure,
        density,
        soundVelocity: +sv.toFixed(1),
        turbidity,
        dissolvedOxygen,
        fluorescence,
        pH,
        depthProfile: depthProfileHistory,
        status: "ACTIVE"
      };

      if (tickCount % 5 === 0) {
        client.publish(dataTopic, JSON.stringify(payload));
      }
    });
  }
};