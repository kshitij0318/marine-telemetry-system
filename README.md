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

> **Prerequisites**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) only. No Node.js required for this path.

```bash
# 1. Clone
git clone https://github.com/kshitij0318/marine-telemetry-system.git
cd marine-telemetry-system

# 2. Copy environment files (defaults work out-of-the-box)
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Build and start all 4 services (MQTT, Backend, Simulators, Frontend)
docker-compose up --build -d
```

Once running, open your browser:
- **Web UI**: `http://localhost:3000`
- **Backend API / WebSocket**: `http://localhost:5001`
- **MQTT Broker**: `localhost:1883`

To view live service logs:
```bash
docker-compose logs -f
```

To stop the system:
```bash
docker-compose down
```

---

## 💻 Local Development Setup (For Contributors)

> Requires **Node.js 20+** and a running local MQTT broker.

```bash
# 1. Install root dependencies
npm install

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Start a local MQTT broker (requires Docker)
docker run -d -p 1883:1883 eclipse-mosquitto:2.0

# 4. Start the backend + simulators (Terminal 1)
npm run start:all

# 5. Start the frontend dev server (Terminal 2)
cd frontend && npm run dev
```

The frontend will be available at `http://localhost:5173`.

**(Optional) Run Electron Desktop App**:
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

## 🧪 Testing with External MQTT Payloads

You can disable the internal Node.js physics engine and test the dashboard with external telemetry payloads (e.g., from a Python script or MQTT Explorer).

1. **Disable Internal Simulators**: Set `DISABLE_SIMULATORS=true` in your root `.env` file and restart Docker, or prefix your local run command:
   ```bash
   DISABLE_SIMULATORS=true npm run start:all
   ```
2. **Inject Payloads**: Ensure your broker is running (`localhost:1883`) and publish telemetry directly to the corresponding topics. 

**Using the included Python Simulator:**
```bash
# Ensure paho-mqtt is installed (using python3 on macOS to bypass Homebrew environment restrictions)
python3 -m pip install paho-mqtt --break-system-packages
# Run the script
python3 marine_sensor_simulator.py
```

**Using MQTT Explorer (Manual JSON):**
Publish to `vessel/V001/gnss`:
```json
{
  "latitude": 18.9220, "longitude": 72.8347,
  "heading": 90.0, "speed": 7.5,
  "satellites": 10, "hdop": 1.1, "fixType": "DGPS",
  "status": "active", "timestamp": 1700000000000
}
```

---

## 👁️ Customizing Page Visibility

You can show or hide specific dashboard pages dynamically without requiring a system restart. This is useful when testing specific sensors or tailoring the UI for specific mission roles.

1. Open `frontend/src/config/pageVisibility.ts`.
2. Find the `PAGE_CONFIG` array.
3. Toggle the `enabled` boolean flag to `true` or `false` for any given page.
4. If you are using `npm run dev`, Vite's Hot Module Replacement (HMR) will instantly update the sidebar and routing logic. (Note: Ensure the `fleet` page remains enabled as a fallback).

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

## 🛟 Common Errors & Fixes

**Docker: Build fails on first run / COPY conflict errors**
```
cannot replace to directory [...]/node_modules/... with file
```
This happens when Docker is sending a stale local `node_modules` folder into the build context. Fix: the `.dockerignore` files in the repo now prevent this. If you still see it, clear Docker's volume cache first and retry:
```bash
docker-compose down -v
docker-compose up --build
```

**npm: ERESOLVE peer dependency error on local install**
```
npm ERR! code ERESOLVE
npm ERR! peer react@"^19.2.4" from react-dom...
```
This happens on a clean machine without a lockfile cache. All versions in `package.json` are now pinned exactly. If you still see this, run:
```bash
cd frontend && npm install --legacy-peer-deps
```

**No Data in UI**
- Ensure `VITE_WS_URL` in `frontend/.env` correctly points to the backend (e.g., `ws://localhost:5001`).
- Verify the Mosquitto broker is running on port `1883`.

**Port Conflicts**
- If `5001`, `3000`, or `1883` are in use, update your `.env` and `docker-compose.yml` to map to available ports.

---

## 🤝 Contributing
1. Ensure strict type definitions for any new telemetry payloads in `shared/`.
2. Follow the established Context/Reducer pattern in `frontend/src/contexts/` for state management.
3. Validate changes in both pure Web and Electron runtime environments.
