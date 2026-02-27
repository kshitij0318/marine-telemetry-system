import { useEffect, useState } from "react";

function OASDashboard() {
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

  return (
    <div style={{ padding: 30, color: "#e2e8f0" }}>
      <h1>Obstacle Avoidance Sonar</h1>

      {latest && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 20
        }}>
          <Card label="Forward Distance" value={latest.forwardDistance} unit="m" />
          <Card label="Port Distance" value={latest.portDistance} unit="m" />
          <Card label="Starboard Distance" value={latest.starboardDistance} unit="m" />
          <Card label="Risk Level" value={latest.riskLevel} />
        </div>
      )}
    </div>
  );
}

function Card({ label, value, unit }) {
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

export default OASDashboard;