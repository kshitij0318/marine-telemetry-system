import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

function CurrentMeterDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "parent-update") {
        setData(prev => [...prev.slice(-50), message.data]);
      }
    };

    return () => ws.close();
  }, []);

  const latest = data[data.length - 1];

  const labels = data.map(d =>
    new Date(d.lastUpdated).toLocaleTimeString()
  );

  return (
    <div style={{ padding: 30, color: "#e2e8f0" }}>
      <h1>Current Meter Dashboard</h1>

      {latest && (
        <>
          {/* TOP KPI VISUALS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginBottom: 40
          }}>
            <KPI label="Current Speed" value={latest.currentSpeed} unit="m/s" />
            <KPI label="Current Direction" value={latest.currentDirection} unit="°" />
            <KPI label="Turbulence Index" value={latest.turbulenceIndex} />
          </div>

          {/* FLOW RATE TREND */}
          <h2>Water Flow Rate Trend</h2>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Flow Rate",
                  data: data.map(d => d.waterFlowRate),
                  borderColor: "#3b82f6"
                }
              ]
            }}
          />

          <div style={{ marginTop: 10 }}>
            Latest Value: {latest.waterFlowRate ?? "--"} m³/s
          </div>

          {/* TURBULENCE TREND */}
          <h2 style={{ marginTop: 40 }}>Turbulence Trend</h2>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Turbulence",
                  data: data.map(d => d.turbulenceIndex),
                  borderColor: "#f59e0b"
                }
              ]
            }}
          />

          <div style={{ marginTop: 10 }}>
            Latest Value: {latest.turbulenceIndex ?? "--"}
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, unit }) {
  return (
    <div style={{
      background: "#0f172a",
      padding: 20,
      borderRadius: 12
    }}>
      <div style={{ fontSize: 14, color: "#94a3b8" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: "bold" }}>
        {value ?? "--"} {unit || ""}
      </div>
    </div>
  );
}

export default CurrentMeterDashboard;