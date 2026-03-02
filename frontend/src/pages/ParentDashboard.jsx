import { useEffect, useState, useRef } from "react";
import VesselMap from "../components/common/VesselMap";
import OASRadar from "../components/bridge/OASRadar";

function ParentDashboard() {
  const [vessels, setVessels] = useState({});
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selectedVessel;
  }, [selectedVessel]);

  useEffect(() => {
    fetch("http://localhost:5000/api/parent")
      .then(res => res.json())
      .then(data => {
        setVessels(data);
        const ids = Object.keys(data);
        if (ids.length > 0) setSelectedVessel(ids[0]);
      });
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "parent-update") {
        setVessels(prev => ({
          ...prev,
          [message.vesselId]: message.data
        }));
      }
    };
    return () => ws.close();
  }, []);

  const data = vessels[selectedVessel];
  if (!data) return null;

  return (
    <div className="bridge-container">

      {/* =========================
          TOP GRID (3 PANELS)
      ========================== */}
      <div className="bridge-main">

        {/* HEADING */}
        <div className="heading-panel">
          <div className="heading-circle">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bearing-mark"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <span>{i * 30}</span>
              </div>
            ))}

            <div
              className="heading-line"
              style={{ transform: `rotate(${data.heading ?? 0}deg)` }}
            />
          </div>

          <div className="heading-value">
            {data.heading?.toFixed(1)}°
          </div>

          <div className="heading-sub">
            {getCardinal(data.heading)}
          </div>
        </div>

        {/* PROPULSION */}
        <div className="center-panel">

          <div className="ship-silhouette">
            <div className="ship-body" />
            <div
              className="ship-heading-line"
              style={{ transform: `rotate(${data.heading ?? 0}deg)` }}
            />
          </div>

          <div className="engine-columns">
            <EngineBar
              label="RPM"
              value={data.rpm}
              percentage={Math.min(100, (data.rpm ?? 0) / 40)}
            />

            <EngineBar
              label="Thrust"
              value={`${data.thrustPower ?? 0}%`}
              percentage={data.thrustPower ?? 0}
            />
          </div>
        </div>

        {/* TELEMETRY ONLY */}
        <div className="right-panel">
          <Telemetry label="Speed" value={`${data.speed?.toFixed(2)} kn`} />
          <Telemetry label="Depth" value={`${data.depth?.toFixed(2)} m`} />
          <Telemetry label="Temp" value={`${data.waterTemperature?.toFixed(2)} °C`} />
          <Telemetry label="Current" value={`${data.currentSpeed?.toFixed(2)} m/s`} />
          <Telemetry label="Direction" value={`${data.currentDirection?.toFixed(1)}°`} />
          <Telemetry label="Salinity" value={`${data.salinity?.toFixed(2)} PSU`} />

          <div className={`risk-badge ${data.riskLevel?.toLowerCase()}`}>
            {data.riskLevel}
          </div>
        </div>

      </div>

      {/* =========================
          BOTTOM SPLIT SECTION
      ========================== */}
      <div className="bridge-bottom-split">

        {/* GNSS MAP (LEFT) */}
        <div className="bottom-panel">
          <div
            className="bridge-map"
            onClick={() => setMapExpanded(true)}
          >
            <VesselMap
              latitude={data.latitude}
              longitude={data.longitude}
              heading={data.heading}
              height={350}
            />
          </div>
        </div>

        {/* OAS RADAR (RIGHT) */}
        <div className="bottom-panel radar-wrapper">
          <OASRadar
            heading={data.heading}
            obstacles={[
              { distance: Math.min(40, data.forwardDistance / 5), angle: 0 },
              { distance: Math.min(40, data.portDistance / 5), angle: 270 },
              { distance: Math.min(40, data.starboardDistance / 5), angle: 90 }
            ]}
          />
        </div>

      </div>

      {/* FULLSCREEN MAP */}
      {mapExpanded && (
        <div
          className="fullscreen-map-container"
          onClick={() => setMapExpanded(false)}
        >
          <div
            className="fullscreen-map"
            onClick={(e) => e.stopPropagation()}
          >
            <VesselMap
              latitude={data.latitude}
              longitude={data.longitude}
              heading={data.heading}
              height="100%"
            />
          </div>

          <div className="fullscreen-close">✕</div>
        </div>
      )}

    </div>
  );
}

function EngineBar({ label, value, percentage }) {
  return (
    <div className="engine-block">
      <div
        className="engine-fill"
        style={{ height: `${percentage}%` }}
      />
      <div className="engine-text">
        {label} {value}
      </div>
    </div>
  );
}

function Telemetry({ label, value }) {
  return (
    <div className="telemetry-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getCardinal(deg = 0) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export default ParentDashboard;