<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repo -->

Purpose
-------
This file gives immediate, actionable guidance for an AI coding agent to be productive in this repository (marine-telemetry-system). It is intentionally concise and tied to concrete files and patterns found in the codebase.

Quick facts / assumptions
-----------------------
- Backend: Express app listening on port 5000 (`backend/server.js`).
- MQTT broker: expected at mqtt://localhost:1883 (many components connect directly to this address).
- Frontend: Vite React app under `frontend/` (run with `cd frontend && npm run dev`).
- Top-level start script: `npm run start:all` runs `node scripts/start-all.js` to start the backend and simulators.

High-level architecture (big picture)
-------------------------------------
- Sensors/Devices -> Bridges/Simulators: Bridges (serial-to-MQTT) live under `bridges/`; simulators live under `simulators/` and are started by `scripts/start-all.js`.
- MQTT bus: central integration point. Bridges/simulators publish device telemetry to MQTT topics and subscribe to command topics.
- Backend: `backend/services/mqttSubscriberService.js` subscribes to telemetry topics, updates `deviceRegistryService` and `aggregationService`, then pushes updates to clients via `websocket/socketServer`.
- Frontend: connects to backend websockets and/or MQTT clients (see `frontend/src/mqtt/mqttClient.js` — currently a placeholder) to show dashboards in `frontend/src/pages/`.

Key files to read first (use these as anchors)
-------------------------------------------
- `backend/server.js` — sets up Express routes and starts socket server.
- `backend/services/mqttSubscriberService.js` — single place where telemetry is consumed and forwarded into services and sockets. Important parsing logic: subscribes to `vessel/+/+/+/data` and extracts vesselId, sensor type and deviceId from topic parts.
- `shared/constants/topics.js` — canonical topic builders (use these when publishing/subscribing from new bridges or features).
- `bridges/ctd/CTDBridge.js` — concrete example of a serial bridge: reads serial lines, parses them, publishes to MQTT and listens for command topic.
- `bridges/base/BaseBridge.js` — intended base class for bridges (currently empty) — check before adding duplicated logic.
- `scripts/start-all.js` — developer convenience script that spawns backend and several simulators; use it to run an integrated local environment.
- `frontend/package.json` and `frontend/src/` — frontend dev flow (Vite). See `frontend/README.md` for any front-end specifics.

Important integration patterns & conventions
-----------------------------------------
- MQTT topic format is standardized via `shared/constants/topics.js`. Always use the build helpers, e.g.:
  - `topics.CTD.buildDataTopic(vesselId, deviceId)`
  - `topics.GNSS.buildCommandTopic(vesselId, deviceId)`
- Subscriber parsing: `mqttSubscriberService` assumes topic segments: `vessel/{vesselId}/{sensorType}/{deviceId}/data`. The code upper-cases the sensor type when registering a device (sensorType = parts[2].toUpperCase()). Keep that in mind when adding sensors.
- Device lifecycle: `deviceRegistryService.registerDevice(...)`, `updateHeartbeat(...)` and a periodic `markInactiveDevices()` call are used — prefer registering/updating through those services rather than reinventing state handling.
- Aggregation: raw messages are forwarded to `aggregationService.updateRawData(payload)` and then `aggregationService.recomputeVessel(vesselId)` — this pattern (store raw, then recompute) is used across telemetry flows.
- Websockets: backend uses `websocket/socketServer` and calls like `socketServer.broadcastParentUpdate(vesselId)` — use the socket server API rather than directly manipulating WebSocket internals.

Practical examples (copyable patterns)
-------------------------------------
- Publish telemetry from a bridge or simulator (use topic builder):
  const topics = require('../../shared/constants/topics');
  mqttClient.publish(topics.CTD.buildDataTopic(VESSEL_ID, DEVICE_ID), JSON.stringify(payload));

- Subscribe in backend (pattern already used):
  client.subscribe('vessel/+/+/+/data');
  // parse in message handler: const parts = topic.split('/');

Platform / environment notes
---------------------------
- Default serial path in `bridges/ctd/CTDBridge.js` is currently `COM5` (Windows). On macOS or Linux you will need to change to `/dev/tty.*` or `/dev/ttyUSB*` before testing hardware bridges.
- MQTT broker is assumed local. If you prefer Docker Mosquitto, look for `infrastructure/mqtt/` (docker-compose.yml may be empty here) — the rest of the code assumes a broker at `localhost:1883`.

Developer workflows (how to run things locally)
-----------------------------------------------
1. Start integrated environment (backend + simulators):
   - From repo root: `npm install` (if not already), then `npm run start:all`.
   - This runs `scripts/start-all.js` which starts backend and multiple simulators (env vars like VESSEL_ID and DEVICE_ID are set for simulators in that script).
2. Start frontend UI (separate terminal):
   - cd frontend
   - npm install
   - npm run dev

When adding features
--------------------
- If you add a new sensor/bridge:
  - Add bridge under `bridges/<sensor>/` following CTD pattern: read device, parse, publish with `topics.<SENSOR>.buildDataTopic` and subscribe to `buildCommandTopic`.
  - Use `deviceRegistryService` to register and heartbeat devices.
  - Update `shared/constants/topics.js` only if the topic structure must change (avoid breaking existing subscribers).
- For backend work, prefer adding logic into services (e.g., `aggregationService`, `deviceRegistryService`) rather than stuffing business logic into route handlers.

What to avoid
-------------
- Don't hardcode topic strings in multiple places; use `shared/constants/topics.js` helpers.
- Avoid changing the MQTT host/port in many files — centralize any config changes where possible (note: currently config is spread across files and uses hard-coded mqtt://localhost:1883).

Where to look for more context
-----------------------------
- `backend/` — controllers, services, websocket and server wiring.
- `bridges/` and `simulators/` — devices and data sources.
- `frontend/src/pages/` — example UI usage of telemetry and components used in dashboards.

If something is unclear
----------------------
Leave a short line in PR describing the assumption you made (ex: "Assumed VESSEL_ID format 'V001' for new simulator"). Ask the maintainer to confirm changes to MQTT topic structure before merging.

Feedback
--------
If any historic copilot/AGENT guidance should be preserved or merged, point me to the file(s) and I will merge them into this doc.

End of file
