# Marine Telemetry System

A production-grade marine telemetry platform delivering real-time visualization, mission planning, and aggregation for autonomous vessels. The system ingests high-frequency simulated hardware data via MQTT, performs data aggregation on a Node.js backend, and streams live telemetry to a React frontend over WebSockets.

---

## 🏗 Architecture

The system operates across four primary decoupled layers:

```text
+----------------+       +--------------+       +------------------+       +---------------+
|   Simulators   |       |  MQTT Broker |       | Backend Service  |       | React UI (SPA)|
| (Physics Engine| ----> | (Mosquitto)  | ----> | (Aggregation &   | ----> | (WebSocket    |
|   Node.js)     |       | Port 1883    |       |  WebSocket)      |       |  Client)      |
+----------------+       +--------------+       +------------------+       +---------------+
```

1. **Simulators**: Generate high-fidelity vessel state (GNSS, IMU, CTD, Thrusters, Radar). Publishes to `vessel/+/+/+/data`.
2. **MQTT Broker**: Handles pub/sub routing at scale.
3. **Backend**: Subscribes to raw MQTT data, aggregates packets into unified vessel objects, manages active devices via heartbeats, and broadcasts diffs over WebSocket (Port `5001`).
4. **Frontend**: Vite + React interface offering tactical dashboards, dynamic mission planning, and map-based controls.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI, React Leaflet, Chart.js
- **Backend**: Node.js, Express, WebSocket (`ws`), MQTT.js
- **Broker**: Eclipse Mosquitto
- **Desktop (Optional)**: Electron (for local IPC filesystem access)
- **Deployment**: Docker, Docker Compose

---

## 🚀 Quick Start (Production via Docker)

The easiest way to run the entire stack on any fresh machine is via Docker Compose.

1. **Install Prerequisites**:
   Ensure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/kshitij0318/marine-telemetry-system.git
   cd marine-telemetry-system
   ```

3. **Configure Environment**:
   Copy the example environment files.
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```

4. **Build and Launch**:
   ```bash
   docker-compose up --build -d
   ```

5. **Access the System**:
   - Web Interface: `http://localhost:3000`
   - WebSocket API: `ws://localhost:5001`
   - MQTT Broker: `localhost:1883`

---

## 💻 Local Development Setup

If you wish to develop without Docker:

1. **Install Dependencies**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Start the MQTT Broker**:
   You must have a local broker running (e.g., Mosquitto).
   ```bash
   docker run -it -p 1883:1883 eclipse-mosquitto
   ```

3. **Launch the Stack**:
   ```bash
   # Terminal 1: Starts Node Backend & Simulators
   npm run start:all

   # Terminal 2: Starts Vite Frontend
   cd frontend && npm run dev
   ```

4. **(Optional) Run Electron Desktop App**:
   ```bash
   npm run electron:dev
   ```

---

## ⚙️ Environment Variables

### Root `.env` (Backend & Simulators)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port for the backend API/WS. | `5001` |
| `MQTT_BROKER_URL` | The URL of the MQTT broker. | `mqtt://localhost:1883` |
| `VESSEL_ID` | Identifier for the simulated vessel. | `V001` |
| `VESSEL_START_LAT` | Initial latitude for the simulator. | `18.9000` |
| `VESSEL_START_LNG` | Initial longitude for the simulator. | `72.5000` |

### Frontend `.env` (`frontend/`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_WS_URL` | WebSocket endpoint for the UI. | `ws://localhost:5001` |

---

## 📁 Folder Structure

```text
.
├── backend/            # Express API, Aggregation logic, WebSocket server
├── electron/           # Main and Preload scripts for the desktop wrapper
├── frontend/           # React SPA (Vite, Tailwind, Context API)
├── infrastructure/     # DevOps configs (Mosquitto config)
├── scripts/            # Local dev runner (start-all.js)
├── shared/             # Shared constants and topic formats
├── simulators/         # Physics engine generating telemetry data
├── docker-compose.yml  # Root deployment orchestrator
└── README.md           # You are here
```

---

## 🛟 Troubleshooting

- **No Data in UI**: 
  - Ensure the WebSocket URL (`VITE_WS_URL`) in `frontend/.env` correctly points to the backend port (e.g., `5001`).
  - Verify the Mosquitto broker is running and exposed on port `1883`.
- **Port Conflicts**:
  - If `5001`, `3000`, or `1883` are in use, update your `.env` files and `docker-compose.yml` to map to available ports.
- **Docker Rebuild Issues**:
  - If you change package dependencies, force a clean build: `docker-compose up --build --force-recreate`.

---

## 🤝 Contributing
1. Ensure strict type definitions for any new telemetry payloads in `shared/`.
2. Follow the established Context/Reducer pattern in `frontend/src/contexts/` for state management.
3. Validate changes in both pure Web and Electron runtime environments.
