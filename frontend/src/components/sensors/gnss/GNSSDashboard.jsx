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

        return updated.slice(-200);

      });

    }

    vesselRef.current = vesselData;

  }

};

return () => ws.close();

}, []);

const latest = data[data.length - 1];

if (!latest) {
return <div style={{ padding: 30 }}>Waiting for GNSS data...</div>;
}

const labels = data.map(d =>
new Date(d.lastUpdated).toLocaleTimeString()
);

return (

<div className="gnss-container">

  <div className="gnss-header">
    <h2>Navigation System</h2>
  </div>

  <div className="gnss-metrics">

    <Metric label="Speed" value={latest.speed?.toFixed(2)} unit="kn" />
    <Metric label="Heading" value={latest.heading?.toFixed(1)} unit="°" />
    <Metric label="Latitude" value={latest.latitude?.toFixed(5)} />
    <Metric label="Longitude" value={latest.longitude?.toFixed(5)} />

  </div>

  <div className="gnss-main">

    {/* COMPASS */}

    <div className="gnss-compass">

      <div className="compass-circle">

        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="compass-mark"
            style={{ transform: `rotate(${i * 30}deg)` }}
          >
            <span>{i * 30}</span>
          </div>
        ))}

        <div
          className="compass-needle"
          style={{ transform: `rotate(${latest.heading ?? 0}deg)` }}
        />

      </div>

      <div className="compass-heading">
        {latest.heading?.toFixed(1)}°
      </div>

    </div>

    {/* MAP */}

    <div className="gnss-map">

      <VesselMap
        latitude={latest.latitude}
        longitude={latest.longitude}
        heading={latest.heading}
        speed={latest.speed}
        depth={latest.depth}
        trail={trail}
        height={420}
      />

    </div>

    {/* SPEED GAUGE */}

    <div className="gnss-speed-panel">

      <div className="speed-gauge">

        <div
          className="speed-fill"
          style={{
            height: `${Math.min(100, (latest.speed || 0) * 8)}%`
          }}
        />

      </div>

      <div className="speed-value">
        {latest.speed?.toFixed(2)} kn
      </div>

    </div>

  </div>

  {/* SPEED CHART */}

  <div className="gnss-chart">

    <Line
      data={{
        labels,
        datasets: [
          {
            label: "Speed",
            data: data.map(d => d.speed),
            borderColor: "#00eaff",
            tension: 0.3
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8aa4c8" } },
          y: { ticks: { color: "#8aa4c8" } }
        }
      }}
    />

  </div>

</div>

);

}

function Metric({ label, value, unit }) {

return (

<div className="gnss-metric">

  <div className="gnss-metric-label">
    {label}
  </div>

  <div className="gnss-metric-value">
    {value ?? "--"} {unit || ""}
  </div>

</div>

);

}

export default GNSSDashboard;