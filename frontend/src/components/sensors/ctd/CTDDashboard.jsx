import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  ArcElement
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  ArcElement
);

import { useEffect, useState, useRef } from "react";
import { Line, Doughnut } from "react-chartjs-2";

function CTDDashboard() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState([]);

  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    fetch("http://localhost:5000/api/ctd/devices")
      .then(res => res.json())
      .then(setDevices);

    const ws = new WebSocket("ws://localhost:5000");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "ctd-update") {
        const device = message.data;

        if (
          selectedRef.current &&
          selectedRef.current.vesselId === device.vesselId &&
          selectedRef.current.deviceId === device.deviceId
        ) {
          setData(prev => [...prev.slice(-50), device]);
        }

        setDevices(prev => {
          const filtered = prev.filter(
            d => !(d.vesselId === device.vesselId && d.deviceId === device.deviceId)
          );
          return [...filtered, device];
        });
      }
    };

    return () => ws.close();
  }, []);

  const latest = data[data.length - 1];

  const sendCommand = (command) => {
    if (!selected) return;

    fetch("http://localhost:5000/api/ctd/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vesselId: selected.vesselId,
        deviceId: selected.deviceId,
        command
      })
    });
  };

  const labels = data.map(d =>
    new Date(d.timestamp).toLocaleTimeString()
  );

  const buildChart = (datasets) => ({
    labels,
    datasets
  });



  const GaugeCard = ({ label, value, min, max, unit, color }) => {
    const normalized = Math.min(
      Math.max((value - min) / (max - min), 0),
      1
    );

    const gaugeData = {
      datasets: [
        {
          data: [normalized, 1 - normalized],
          backgroundColor: [color, "#1e293b"],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }
      ]
    };

    return (
      <div
        style={{
          background: "#0f172a",
          padding: 20,
          borderRadius: 14,
          boxShadow: "0 0 15px rgba(0,0,0,0.6)",
          position: "relative",
          height: 220
        }}
      >
        <Doughnut
          data={gaugeData}
          options={{
            cutout: "75%",
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            }
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 55,
            left: 0,
            right: 0,
            textAlign: "center"
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: "bold",
              color: "#ffffff"
            }}
          >
            {value?.toFixed(2)}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>{unit}</div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 15,
            fontSize: 12,
            color: "#64748b"
          }}
        >
          {min}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 15,
            fontSize: 12,
            color: "#64748b"
          }}
        >
          {max}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: -5,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 13,
            color: "#cbd5e1"
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "#0b1120",
        minHeight: "100vh",
        color: "#e2e8f0",
        padding: 30
      }}
    >
      <h1 style={{ marginBottom: 20 }}>CTD Telemetry Control Room</h1>

      <div style={{ marginBottom: 20 }}>
        <select
          style={{
            padding: 8,
            borderRadius: 6,
            background: "#1e293b",
            color: "white",
            border: "1px solid #334155"
          }}
          onChange={(e) => setSelected(JSON.parse(e.target.value))}
        >
          <option>Select Device</option>
          {devices.map(d => (
            <option
              key={`${d.vesselId}-${d.deviceId}`}
              value={JSON.stringify(d)}
            >
              {d.vesselId} - {d.deviceId}
            </option>
          ))}
        </select>

        {selected && (
          <span style={{ marginLeft: 20 }}>
            <button onClick={() => sendCommand("START")}>Start</button>{" "}
            <button onClick={() => sendCommand("STOP")}>Stop</button>{" "}
            <button onClick={() => sendCommand("RESET")}>Reset</button>
          </span>
        )}
      </div>

      {selected && latest && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 25,
              marginBottom: 50
            }}
          >
            <GaugeCard
              label="Depth"
              value={latest.depth}
              min={0}
              max={500}
              unit="m"
              color="#3b82f6"
            />
            <GaugeCard
              label="Temperature"
              value={latest.waterTemperature}
              min={0}
              max={40}
              unit="°C"
              color="#ef4444"
            />
            <GaugeCard
              label="Salinity"
              value={latest.salinity}
              min={20}
              max={40}
              unit="PSU"
              color="#10b981"
            />
            <GaugeCard
              label="Sound Velocity"
              value={latest.soundVelocity}
              min={1400}
              max={1600}
              unit="m/s"
              color="#f59e0b"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 30
            }}
          >
            <div>
              <h3>Physical Parameters</h3>
              <Line
                data={buildChart([
                  { label: "Depth", data: data.map(d => d.depth), borderColor: "#3b82f6" },
                  { label: "Pressure", data: data.map(d => d.pressure), borderColor: "#f97316" },
                  { label: "Altimeter", data: data.map(d => d.altimeter), borderColor: "#94a3b8" }
                ])}
              />

              <h3 style={{ marginTop: 40 }}>Derived Metrics</h3>
              <Line
                data={buildChart([
                  { label: "Sound Velocity", data: data.map(d => d.soundVelocity), borderColor: "#f59e0b" },
                  { label: "Water Density", data: data.map(d => d.waterDensity), borderColor: "#a855f7" }
                ])}
              />
            </div>

            <div>
              <h3>Water Properties</h3>
              <Line
                data={buildChart([
                  { label: "Temperature", data: data.map(d => d.waterTemperature), borderColor: "#ef4444" },
                  { label: "Salinity", data: data.map(d => d.salinity), borderColor: "#10b981" },
                  { label: "Conductivity", data: data.map(d => d.conductivity), borderColor: "#6366f1" }
                ])}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CTDDashboard;