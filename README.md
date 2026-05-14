# Marine Telemetry System

A production-grade marine telemetry platform delivering real-time visualization, mission planning, and aggregation for autonomous vessels. The system ingests high-frequency simulated hardware data via MQTT, performs data aggregation on a Node.js backend, and streams live telemetry to a React frontend over WebSockets.

---

## 🏗 Architecture & Data Flow

The system operates across four primary decoupled layers, allowing it to seamlessly transition between internal physics simulators and real-world hardware data:

```text
+----------------+       +--------------+       +------------------+       +---------------+
|   Simulators   |       |  MQTT Broker |       | Backend Service  |       | React UI (SPA)|
| (Physics Engine| ----> | (Mosquitto)  | ----> | (Aggregation &   | ----> | (WebSocket    |
|   Node.js)     |       | Port 1883    |       |  WebSocket)      |       |  Client)      |
+----------------+       +--------------+       +------------------+       +---------------+
```

### 1. The Data Source (MQTT Emission)
Whether using the internal Node.js physics engines (`/simulators`), the external Python testing script (`marine_sensor_simulator.py`), or a physical marine vessel in the ocean, all hardware telemetry is published to the Mosquitto broker (Port 1883). 
- **Topic Convention**: Data is published to `vessel/{VESSEL_ID}/{SENSOR_TYPE}` (e.g., `vessel/V001/gnss`).

### 2. The Node.js Backend (Passive Funnel)
The backend service (`/backend/services/mqttSubscriberService.js`) acts as a highly optimized, passive funnel. 
- It subscribes to the wildcard topic `vessel/+/#`.
- It catches incoming JSON payloads, parses them, and manages active vessel heartbeats.
- It immediately broadcasts the data out over a persistent WebSocket connection (Port 5001).

### 3. The React Frontend (Visualization & Command)
The frontend is a Vite-powered Single Page Application (SPA) designed to render telemetry at 10Hz without performance degradation.
- **State Management**: It uses React's Context API (`TelemetryContext` and `MissionContext`) to handle the firehose of live sensor data.
- **Map Optimization**: For the Mission Command Center, the vessel marker rendering is decoupled from the React render cycle using imperative Leaflet map updates (`useAnimatedVesselPosition`). This allows the map to render smoothly at 60FPS without lagging the rest of the application components.

### 🌟 Key Operational Features
- **Dynamic Dashboards**: Dedicated pages for GNSS, CTD, Current Meter, Radar, and Thruster metrics. Components are purely visualization layers reacting to context updates.
- **Mission Planning**: The map interface allows operators to drop waypoints, draw **Exclusion Zones** (Geofences), and generate automated **Survey Patterns** (like Lawnmower or Spiral paths).
- **Automated Pathfinding**: The frontend features a pathfinding algorithm that automatically reroutes vessel trajectories around drawn exclusion zones in real-time.

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

**Mac/Linux:**
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env
copy frontend\.env.example frontend\.env
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

# 3. Build and start all 4 services (MQTT, Backend, Simulators, Frontend)
```bash
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

```bash
# Mac/Linux & Windows (Command Prompt):
cd frontend && npm install && cd ..

# Windows (PowerShell):
cd frontend; npm install; cd ..
```

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
   # Mac/Linux:
   DISABLE_SIMULATORS=true npm run start:all

   # Windows (Command Prompt):
   set DISABLE_SIMULATORS=true&& npm run start:all

   # Windows (PowerShell):
   $env:DISABLE_SIMULATORS="true"; npm run start:all
   ```
2. **Inject Payloads**: Ensure your broker is running (`localhost:1883`) and publish telemetry directly to the corresponding topics. 

**Using the included Python Simulator:**
```bash
# Mac/Linux:
python3 -m pip install paho-mqtt --break-system-packages
python3 marine_sensor_simulator.py

# Windows (Command Prompt & PowerShell):
python -m pip install paho-mqtt
python marine_sensor_simulator.py
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

## 📁 Detailed Folder Structure

```text
.
├── backend/            # Node.js Backend
│   ├── server.js       # WebSocket server entry point
│   └── services/       # Contains mqttSubscriberService.js (MQTT -> WebSocket bridge)
├── electron/           # Main and Preload scripts for the desktop wrapper deployment
├── frontend/           # React SPA (Vite, Tailwind, Context API)
│   ├── src/
│   │   ├── app/        # UI Components (Radix UI primitives, Layouts, Forms)
│   │   ├── config/     # pageVisibility.ts (Dynamic feature toggling)
│   │   ├── contexts/   # TelemetryContext.tsx (WebSocket ingestion), MissionContext.tsx
│   │   ├── pages/      # Dashboards (GNSS, Thruster, MapCommandCenter, etc.)
│   │   └── utils/      # Core logic (surveyPatterns.ts, routeUtils.ts, geofenceValidator.ts)
├── infrastructure/     # DevOps configs (Mosquitto configuration)
├── scripts/            # Local dev runners (start-all.js)
├── simulators/         # Internal Node.js physics engines (gnssSimulator, ctdSimulator)
├── docker-compose.yml  # Root orchestrator mapping all 4 containers together
├── marine_sensor_simulator.py # Python script for testing external hardware injection
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
