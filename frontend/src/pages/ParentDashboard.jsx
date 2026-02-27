import { useEffect, useState, useRef } from "react";
import VesselMap from "../components/common/VesselMap";

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

        if (!selectedRef.current) {
          setSelectedVessel(message.vesselId);
        }
      }
    };

    return () => ws.close();
  }, []);

  const currentData = vessels[selectedVessel];

  return (
    <div style={{
      padding: 30,
      background: "#0b1120",
      minHeight: "100vh",
      color: "#e2e8f0"
    }}>
      <h1 style={{ marginBottom: 20 }}>Fleet Telemetry Dashboard</h1>

      {/* Vessel Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 25 }}>
        {Object.keys(vessels).map(id => (
          <button
            key={id}
            onClick={() => setSelectedVessel(id)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                selectedVessel === id ? "#3b82f6" : "#1e293b",
              color: "white"
            }}
          >
            {id}
          </button>
        ))}
      </div>

      {currentData && (
        <>
          {/* NAVIGATION KPIs */}
          <Section title="Navigation">
            <MetricCard label="Speed" value={currentData.speed} unit="kn" />
            <MetricCard label="Heading" value={currentData.heading} unit="°" />
          </Section>

          {/* ENVIRONMENT KPIs */}
          <Section title="Water Environment">
            <MetricCard label="Depth" value={currentData.depth} unit="m" />
            <MetricCard label="Temperature" value={currentData.waterTemperature} unit="°C" />
            <MetricCard label="Salinity" value={currentData.salinity} unit="PSU" />
          </Section>

          {/* CURRENT DYNAMICS KPIs */}
          <Section title="Current Dynamics">
            <MetricCard label="Current Speed" value={currentData.currentSpeed} unit="m/s" />
            <MetricCard label="Current Direction" value={currentData.currentDirection} unit="°" />
            <MetricCard label="Turbulence Index" value={currentData.turbulenceIndex} />
          </Section>
          {/* PROPULSION KPIs */}
          <Section title="Propulsion">
            <MetricCard label="RPM" value={currentData.rpm} unit="rpm" />
            <MetricCard label="Thrust Power" value={currentData.thrustPower} unit="%" />
            <MetricCard label="Thruster Temp" value={currentData.thrusterTemperature} unit="°C" />
            <MetricCard label="Status" value={currentData.thrusterStatus} />
          </Section>
          {/* SAFETY KPIs */}
          <Section title="Obstacle Avoidance">
            <MetricCard label="Forward Distance" value={currentData.forwardDistance} unit="m" />
            <MetricCard label="Starboard Distance" value={currentData.starboardDistance} unit="m" />
            <MetricCard label="Risk Level" value={currentData.riskLevel} />
            <MetricCard label="Port Distance" value={currentData.portDistance} unit="m" />
          </Section>

          {/* MAP (UNCHANGED) */}
          <div
            onClick={() => setMapExpanded(true)}
            style={{ cursor: "pointer", marginTop: 30 }}
          >
            <VesselMap
              latitude={currentData.latitude}
              longitude={currentData.longitude}
              heading={currentData.heading}
              height={250}
            />
          </div>

          {mapExpanded && (
            <div
              onClick={() => setMapExpanded(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000
              }}
            >
              <div
                style={{ width: "90%", height: "90%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <VesselMap
                  latitude={currentData.latitude}
                  longitude={currentData.longitude}
                  heading={currentData.heading}
                  height="100%"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <>
      <h2 style={{ marginTop: 30, marginBottom: 15 }}>{title}</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20
      }}>
        {children}
      </div>
    </>
  );
}

function MetricCard({ label, value, unit }) {
  return (
    <div style={{
      background: "#0f172a",
      padding: 20,
      borderRadius: 12
    }}>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>
        {value ?? "--"} {unit || ""}
      </div>
    </div>
  );
}

export default ParentDashboard;