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

if (!latest) {
return <div style={{ padding: 30 }}>Waiting for current meter data...</div>;
}

const labels = data.map(d =>
new Date(d.lastUpdated).toLocaleTimeString()
);

return (


<div className="current-container">

  <h1 className="current-title">
    Ocean Current Monitoring
  </h1>

  <div className="current-kpi-grid">

    <KPI
      label="Current Speed"
      value={latest.currentSpeed}
      unit="m/s"
    />

    <KPI
      label="Current Direction"
      value={latest.currentDirection}
      unit="°"
    />

    <KPI
      label="Turbulence Index"
      value={latest.turbulenceIndex}
    />

  </div>




  <div className="current-visual-panel">
    <div className="current-compass">

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
          className="current-arrow"
          style={{
            transform: `rotate(${latest.currentDirection ?? 0}deg)`
          }}
        />

      </div>

      <div className="compass-value">
        {latest.currentDirection?.toFixed(1)}°
      </div>

    </div>
    <div className="flow-vector-panel">

      <div
        className="flow-arrow"
        style={{
          transform: `rotate(${latest.currentDirection ?? 0}deg)`
        }}
      />

      <div className="flow-speed">

        {(latest.currentSpeed ?? 0).toFixed(2)} m/s

      </div>

    </div>

  </div>


  <div className="current-chart-grid">
    <ChartCard title="Current Speed Trend">

      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Current Speed",
              data: data.map(d => d.currentSpeed),
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

    </ChartCard>
    <ChartCard title="Turbulence Trend">

      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Turbulence",
              data: data.map(d => d.turbulenceIndex),
              borderColor: "#ff7b00",
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

    </ChartCard>

  </div>

  <div className="current-flow-rate">

    <h3>Water Flow Rate</h3>

    <div className="flow-rate-value">

      {latest.waterFlowRate ?? "--"} m³/s

    </div>

  </div>

</div>


);

}


function KPI({ label, value, unit }) {

return (


<div className="current-kpi">

  <div className="current-kpi-label">
    {label}
  </div>

  <div className="current-kpi-value">
    {value ?? "--"} {unit || ""}
  </div>

</div>


);

}

function ChartCard({ title, children }) {

return (


<div className="current-chart-card">

  <h4>{title}</h4>

  {children}

</div>


);

}

export default CurrentMeterDashboard;
