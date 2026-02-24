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
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");
    setSocket(ws);

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setData((prev) => [...prev.slice(-20), parsed]);
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
    labels: data.map((d) => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "Depth",
        data: data.map((d) => d.depth),
        borderColor: "blue"
      },
      {
        label: "Temperature",
        data: data.map((d) => d.temperature),
        borderColor: "red"
      }
    ]
  };

  return (
    <div>
      <h1>CTD Dashboard</h1>
      <button onClick={() => sendCommand("START")}>Start</button>
      <button onClick={() => sendCommand("STOP")}>Stop</button>
      <button onClick={() => sendCommand("SET_RATE 500")}>
        Faster
      </button>
      <Line data={chartData} />
    </div>
  );
}

export default CTDDashboard;