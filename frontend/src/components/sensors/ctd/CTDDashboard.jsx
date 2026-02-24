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

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

function CTDDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setData(prev => [...prev.slice(-50), parsed]);
    };

    return () => ws.close();
  }, []);

  const sendCommand = async (command) => {
    await fetch("http://localhost:5000/api/ctd/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
  };

  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "Depth (m)",
        data: data.map(d => d.depth),
        borderColor: "blue"
      },
      {
        label: "Water Temp (°C)",
        data: data.map(d => d.waterTemperature),
        borderColor: "red"
      },
      {
        label: "Salinity (PSU)",
        data: data.map(d => d.salinity),
        borderColor: "green"
      }
    ]
  };

  const latest = data[data.length - 1];

  return (
    <div style={{ padding: "20px" }}>
      <h1>CTD Level-3 Dashboard</h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => sendCommand("START")}>Start</button>
        <button onClick={() => sendCommand("STOP")}>Stop</button>
        <button onClick={() => sendCommand("SET_RATE 500")}>Faster</button>
        <button onClick={() => sendCommand("RESET")}>Reset Depth</button>
      </div>

      {latest && (
        <div style={{ marginBottom: "20px" }}>
          <p><strong>Pressure:</strong> {latest.pressure} dBar</p>
          <p><strong>Conductivity:</strong> {latest.conductivity} S/m</p>
          <p><strong>Altimeter:</strong> {latest.altimeter} m</p>
          <p><strong>Sound Velocity:</strong> {latest.soundVelocity} m/s</p>
          <p><strong>Water Density:</strong> {latest.waterDensity} kg/m³</p>
        </div>
      )}

      <Line data={chartData} />
    </div>
  );
}

export default CTDDashboard;