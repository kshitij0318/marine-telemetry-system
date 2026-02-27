import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

function ThrusterDashboard() {
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
      <h1>Thruster Dashboard</h1>

      {latest && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginBottom: 40
          }}>
            <KPI label="RPM" value={latest.rpm} unit="rpm" />
            <KPI label="Thrust Power" value={latest.thrustPower} unit="%" />
            <KPI label="Temperature" value={latest.thrusterTemperature} unit="°C" />
            <KPI label="Status" value={latest.thrusterStatus} />
          </div>

          <h2>RPM Trend</h2>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "RPM",
                  data: data.map(d => d.rpm),
                  borderColor: "#3b82f6"
                }
              ]
            }}
          />

          <div style={{ marginTop: 10 }}>
            Latest RPM: {latest.rpm ?? "--"}
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
      <div style={{ fontSize: 14, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: "bold" }}>
        {value ?? "--"} {unit || ""}
      </div>
    </div>
  );
}

export default ThrusterDashboard;