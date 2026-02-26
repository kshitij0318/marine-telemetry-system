import { useEffect, useState, useRef } from "react";
import VesselMap from "../../common/VesselMap";
import { Line } from "react-chartjs-2";

function GNSSDashboard() {
  const [data, setData] = useState([]);
  const [trail, setTrail] = useState([]);

  const vesselRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "parent-update") {
        const vesselData = message.data;

        setData(prev => [...prev.slice(-50), vesselData]);

        if (vesselData.latitude && vesselData.longitude) {
          setTrail(prev => {
            const updated = [
              ...prev,
              [vesselData.latitude, vesselData.longitude]
            ];
            return updated.slice(-200); // keep last 200 points
          });
        }

        vesselRef.current = vesselData;
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
      <h1>GNSS Dashboard</h1>

      {latest && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginBottom: 30
            }}
          >
            <Metric label="Speed" value={latest.speed} unit="kn" />
            <Metric label="Heading" value={latest.heading} unit="°" />
            <Metric label="Latitude" value={latest.latitude} />
          </div>

          <VesselMap
            latitude={latest.latitude}
            longitude={latest.longitude}
            heading={latest.heading}
            trail={trail}
            height={400}
          />

          <div style={{ marginTop: 40 }}>
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: "Speed",
                    data: data.map(d => d.speed),
                    borderColor: "#3b82f6"
                  }
                ]
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, unit }) {
  return (
    <div
      style={{
        background: "#0f172a",
        padding: 20,
        borderRadius: 12
      }}
    >
      <div style={{ fontSize: 14, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>
        {value ?? "--"} {unit}
      </div>
    </div>
  );
}

export default GNSSDashboard;