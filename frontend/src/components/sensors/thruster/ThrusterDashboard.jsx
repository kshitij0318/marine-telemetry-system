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

  if (!latest) {
    return <div style={{ padding: 30 }}>Waiting for thruster data...</div>;
  }

  const labels = data.map(d =>
    new Date(d.lastUpdated).toLocaleTimeString()
  );

  return (

    <div className="thruster-container">
      <div className="thruster-header">
        <h2>Thruster Control System</h2>

        <div className={`thruster-status ${latest.thrusterStatus?.toLowerCase()}`}>
          {latest.thrusterStatus}
        </div>
      </div>
      <div className="thruster-main">
        <div className="thruster-visual-panel">

          <div className="thruster-propeller">

            <div className="propeller-core"></div>

            <div
              className="propeller-blade blade1"
              style={{
                animationDuration: `${Math.max(0.2, 3000 / (latest.rpm || 1))}ms`
              }}
            />

            <div
              className="propeller-blade blade2"
              style={{
                animationDuration: `${Math.max(0.2, 3000 / (latest.rpm || 1))}ms`
              }}
            />

          </div>

          <div className="thruster-rpm-display">
            {latest.rpm ?? "--"} RPM
          </div>

        </div>
        <div className="thruster-metrics">

          <Metric
            label="Thrust Power"
            value={latest.thrustPower}
            unit="%"
          />

          <div className="power-bar-container">
            <div
              className="power-bar-fill"
              style={{ width: `${latest.thrustPower ?? 0}%` }}
            />
          </div>

          <Metric
            label="Thruster Temperature"
            value={latest.thrusterTemperature}
            unit="°C"
          />

        </div>
        <div className="thruster-kpis">

          <KPI label="RPM" value={latest.rpm} unit="rpm" />

          <KPI label="Thrust" value={latest.thrustPower} unit="%" />

          <KPI label="Temperature" value={latest.thrusterTemperature} unit="°C" />

        </div>

      </div>
      <div className="thruster-charts">

        <ChartCard title="RPM Trend">

          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "RPM",
                  data: data.map(d => d.rpm),
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


        <ChartCard title="Temperature Trend">

          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Temperature",
                  data: data.map(d => d.thrusterTemperature),
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

    </div>
  );
}

function KPI({ label, value, unit }) {
  return (
    <div className="thruster-kpi">
      <div className="thruster-kpi-label">{label}</div>
      <div className="thruster-kpi-value">
        {value ?? "--"} {unit || ""}
      </div>
    </div>
  );
}
function Metric({ label, value, unit }) {
  return (
    <div className="thruster-metric">
      <div>{label}</div>
      <strong>{value ?? "--"} {unit}</strong>
    </div>
  );
}
function ChartCard({ title, children }) {
  return (
    <div className="thruster-chart-card">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export default ThrusterDashboard;