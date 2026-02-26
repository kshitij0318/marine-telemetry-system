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
              color: "white",
              fontWeight: selectedVessel === id ? "bold" : "normal"
            }}
          >
            {id}
          </button>
        ))}
      </div>

      {currentData && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginBottom: 30
          }}>
            <MetricCard label="Depth" value={currentData.depth} unit="m" />
            <MetricCard label="Temperature" value={currentData.waterTemperature} unit="°C" />
            <MetricCard label="Speed" value={currentData.speed} unit="kn" />
            <MetricCard label="Heading" value={currentData.heading} unit="°" />
            <MetricCard label="Active Sensors" value={currentData.activeSensors} />
          </div>

          <div
            onClick={() => setMapExpanded(true)}
            style={{ cursor: "pointer" }}
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
                style={{
                  width: "90%",
                  height: "90%"
                }}
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


function MetricCard({ label, value, unit }) {
  return (
    <div style={{
      background: "#0f172a",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 0 10px rgba(0,0,0,0.3)"
    }}>
      <div style={{
        fontSize: 13,
        color: "#94a3b8",
        marginBottom: 5
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 24,
        fontWeight: "bold"
      }}>
        {value !== undefined && value !== null
          ? `${value} ${unit || ""}`
          : "--"}
      </div>
    </div>
  );
}

export default ParentDashboard;