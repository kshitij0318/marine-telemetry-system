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

  if (!latest) {
    return <div style={{ padding: 30 }}>Waiting for OAS data...</div>;
  }

  const obstacles = [
    {
      distance: Math.min(100, latest.forwardDistance),
      angle: 0,
      label: `${latest.forwardDistance}m`
    },
    {
      distance: Math.min(100, latest.portDistance),
      angle: 270,
      label: `${latest.portDistance}m`
    },
    {
      distance: Math.min(100, latest.starboardDistance),
      angle: 90,
      label: `${latest.starboardDistance}m`
    }
  ];

  return (
    <div className="oas-container">

      <div className="oas-header">
        <h2>Obstacle Avoidance Sonar</h2>
        <div className={`oas-risk ${latest.riskLevel?.toLowerCase()}`}>
          {latest.riskLevel}
        </div>
      </div>

      <div className="oas-main">
        <div className="sonar-panel">
          <SonarRadar obstacles={obstacles} />
        </div>
        <div className="oas-metrics">
          <Metric label="Forward" value={latest.forwardDistance} unit="m" />
          <Metric label="Port" value={latest.portDistance} unit="m" />
          <Metric label="Starboard" value={latest.starboardDistance} unit="m" />
        </div>

      </div>
    </div>
  );
}



function SonarRadar({ obstacles }) {

  const size = 380;
  const center = size / 2;
  const maxRadius = 150;

  return (
    <div className="sonar-wrapper">
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={150}
          className="sonar-circle"
        />
        <circle cx={center} cy={center} r={100} className="sonar-ring" />
        <circle cx={center} cy={center} r={50} className="sonar-ring" />
        <polygon
          points={`${center},${center - 20} ${center - 8},${center + 15} ${center + 8},${center + 15}`}
          className="sonar-ship"
        />
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - 150}
          className="sonar-sweep"
        />
        {obstacles.map((o, i) => {
          const angleRad = (o.angle - 90) * (Math.PI / 180);
          const radius = (o.distance / 200) * maxRadius;

          const x = center + radius * Math.cos(angleRad);
          const y = center + radius * Math.sin(angleRad);

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="6"
                className="sonar-object"
              />
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                className="sonar-label"
              >
                {o.label}
              </text>
            </g>
          );
        })}

      </svg>
    </div>
  );
}

function Metric({ label, value, unit }) {
  return (
    <div className="oas-card">
      <div className="oas-card-label">{label}</div>
      <div className="oas-card-value">
        {value ?? "--"} {unit}
      </div>
    </div>
  );
}

export default OASDashboard;