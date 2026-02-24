import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip
);

import { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";

function CTDDashboard() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState([]);

  const wsRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Open WebSocket ONCE
  useEffect(() => {
    fetch("http://localhost:5000/api/ctd/devices")
      .then(res => res.json())
      .then(setDevices);

    const ws = new WebSocket("ws://localhost:5000");
    wsRef.current = ws;

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

  return (
    <div style={{ padding: 20 }}>
      <h1>CTD Telemetry Dashboard</h1>

      <select
        onChange={(e) =>
          setSelected(JSON.parse(e.target.value))
        }
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
        <>
          <div style={{ margin: "10px 0" }}>
            <button onClick={() => sendCommand("START")}>Start</button>
            <button onClick={() => sendCommand("STOP")}>Stop</button>
            <button onClick={() => sendCommand("RESET")}>Reset</button>
          </div>

          {/* Physical Parameters */}
          <h3>Physical Parameters</h3>
          <Line
            data={buildChart([
              {
                label: "Depth (m)",
                data: data.map(d => d.depth),
                borderColor: "blue"
              },
              {
                label: "Pressure (dBar)",
                data: data.map(d => d.pressure),
                borderColor: "orange"
              },
              {
                label: "Altimeter (m)",
                data: data.map(d => d.altimeter),
                borderColor: "gray"
              }
            ])}
          />

          {/* Water Properties */}
          <h3 style={{ marginTop: 30 }}>Water Properties</h3>
          <Line
            data={buildChart([
              {
                label: "Temperature (°C)",
                data: data.map(d => d.waterTemperature),
                borderColor: "red"
              },
              {
                label: "Salinity (PSU)",
                data: data.map(d => d.salinity),
                borderColor: "green"
              },
              {
                label: "Conductivity (S/m)",
                data: data.map(d => d.conductivity),
                borderColor: "purple"
              }
            ])}
          />

          {/* Derived Metrics */}
          <h3 style={{ marginTop: 30 }}>Derived Metrics</h3>
          <Line
            data={buildChart([
              {
                label: "Sound Velocity (m/s)",
                data: data.map(d => d.soundVelocity),
                borderColor: "brown"
              },
              {
                label: "Water Density (kg/m³)",
                data: data.map(d => d.waterDensity),
                borderColor: "black"
              }
            ])}
          />
        </>
      )}
    </div>
  );
}

export default CTDDashboard;