# Marine Telemetry System — Fresh Windows PC Setup Guide

This guide covers everything you need to get the project running on a brand new Windows PC.
There are two pathways. Pick one and follow it completely.

- **PATHWAY A — Docker** (recommended, easiest — no Node.js needed)
- **PATHWAY B — Local** (for developers — no Docker required after setup)

---

## SECTION 1 — Prerequisites (Install These First)

Install the tools for whichever pathway you are using.

### For PATHWAY A (Docker only):
- **Git** — https://git-scm.com/download/win
- **Docker Desktop for Windows** — https://www.docker.com/products/docker-desktop

### For PATHWAY B (Local only):
- **Git** — https://git-scm.com/download/win
- **Node.js v20 LTS** — https://nodejs.org/en

> **After every install:** Close and reopen Command Prompt so the new tools are available in your PATH.

### Verify your installs

Open Command Prompt and run each of these. Each should print a version number with no errors:

```
git --version
```
```
node --version
```
```
npm --version
```
```
docker --version
```
```
docker compose version
```

You only need the tools relevant to your chosen pathway.

---

## SECTION 2 — Clone the Project (Do This First, Before Either Pathway)

Open Command Prompt. Navigate to the folder where you want the project to live. For example:

```
cd D:\Study\Docker
```

Then clone and enter the project folder:

```
git clone https://github.com/kshitij0318/marine-telemetry-system.git
cd marine-telemetry-system
```

> **From this point forward:** every command assumes you are inside the `marine-telemetry-system` folder unless told otherwise.

---

## SECTION 3 — PATHWAY A: Docker Setup (Recommended)

**PATHWAY A — Docker (No Node.js needed)**

You only need Docker Desktop installed. Node.js is NOT required.

All commands below are run in **Command Prompt** from inside the `marine-telemetry-system` folder.

---

### Step A1 — Create environment files

Run these two commands:

```
copy .env.example .env
```
```
copy frontend\.env.example frontend\.env
```

> If the second command fails because `frontend\.env.example` does not exist, create the file manually:
> Open Notepad, paste the line below, then save the file as `frontend\.env` (inside the `frontend` folder).
> Make sure it saves as `.env` not `.env.txt` — in Notepad's Save dialog, set "Save as type" to "All Files".
>
> ```
> VITE_WS_URL=ws://localhost:5001
> ```

---

### Step A2 — Make sure Docker Desktop is running

Open Docker Desktop from the Start Menu. Wait until the bottom-left corner says **"Engine running"** before continuing.

---

### Step A3 — Build and start all services

Run in Command Prompt from inside `marine-telemetry-system`:

```
docker compose up --build -d
```

> This will take **5–15 minutes the first time** — it downloads base images and builds 4 containers: `mqtt`, `backend`, `simulators`, `frontend`. Subsequent starts are instant.

---

### Step A4 — Verify all 4 containers are running

```
docker compose ps
```

All four services (`mts_mqtt`, `mts_backend`, `mts_simulators`, `mts_frontend`) should show status **`running`**.

If any show `exited`, check its logs to see what went wrong:

```
docker compose logs backend
```

Replace `backend` with whichever service name shows `exited` (e.g. `frontend`, `simulators`, `mqtt`).

---

### Step A5 — Open the app

Open a browser and go to:

```
http://localhost:3000
```

You should see the Marine Telemetry dashboard with live vessel data.

---

### Step A5 — Open the app

Open a browser and go to:

```
http://localhost:3000
```

You should see the Marine Telemetry dashboard with live vessel data.

---

### Stopping the system

```
docker compose down
```

### Full reset (if something is broken or stuck):

```
docker compose down -v
docker compose up --build -d
```

---

## SECTION 4 — PATHWAY B: Local Development Setup

**PATHWAY B — Local (Node.js required, Docker NOT required)**

You need Git and Node.js v20 installed. Docker is NOT required — though you will need it just for the MQTT broker step (or you can install Mosquitto natively as explained below).

You will need **3 Command Prompt windows open at the same time**. Each window is labelled below.

---

### Step B1 — Create environment files

In **Command Prompt** from inside `marine-telemetry-system`:

```
copy .env.example .env
```

Then create the frontend env file:

```
cd frontend
copy .env.example .env
cd ..
```

> If `frontend\.env.example` does not exist: open Notepad, paste this single line, and save the file as `frontend\.env` inside the `frontend` folder (set "Save as type" to "All Files" to prevent it saving as `.env.txt`):
>
> ```
> VITE_WS_URL=ws://localhost:5001
> ```

---

### Step B2 — Install root dependencies

In **Command Prompt** from inside `marine-telemetry-system`:

```
npm install --legacy-peer-deps
```

Wait for it to complete (it will say "added X packages").

---

### Step B3 — Install frontend dependencies

In **Command Prompt** from inside `marine-telemetry-system`:

```
cd frontend
npm install --legacy-peer-deps
cd ..
```

Wait for it to complete.

---

### Step B4 — Start the MQTT broker (Window 1)

Open a **NEW Command Prompt window** — label this one **Window 1**. Keep it open the entire time you use the app.

Run this from anywhere:

```
docker run -it -p 1883:1883 eclipse-mosquitto:2.0
```

> This requires Docker Desktop installed and running. If you absolutely do not want Docker, you can install Mosquitto natively from https://mosquitto.org/download/ and run it as a Windows service — but Docker is significantly easier.

Leave **Window 1** running. You should see Mosquitto startup logs.

---

### Step B5 — Start the backend and simulators (Window 2)

Open a **NEW Command Prompt window** — label this one **Window 2**. Keep it open the entire time.

Navigate into the project folder:

```
cd D:\Study\Docker\marine-telemetry-system
```

Then run:

```
npm run start:all
```

Wait until you see output similar to:
```
Backend running on port 5001
MQTT Subscriber connected
Physics Engine Connected. Launching coherent simulations for V001
```

Leave **Window 2** running.

---

### Step B6 — Start the frontend (Window 3)

Open a **NEW Command Prompt window** — label this one **Window 3**. Keep it open the entire time.

Navigate into the frontend folder:

```
cd D:\Study\Docker\marine-telemetry-system\frontend
```

Then run:

```
npm run dev
```

Wait until you see output like:

```
  ➜  Local:   http://localhost:5173/
```

Leave **Window 3** running.

---

### Step B7 — Open the app

Open a browser and go to:

```
http://localhost:5173
```

You should see the Marine Telemetry dashboard with live vessel data.

---

### Stopping everything

Go to each Command Prompt window (Window 1, 2, and 3) and press **Ctrl+C** in each one.

---

## SECTION 5 — Common Errors and Fixes

---

**Error: `cannot replace to directory ... @emotion/react with file`**

Cause: Docker is picking up the `node_modules` folder from your PC and trying to copy it into the container, which causes a conflict.

Fix: Make sure a file called `.dockerignore` exists inside the `frontend\` folder with `node_modules` on the first line. Then do a full clean rebuild:

```
docker compose down -v
docker compose up --build -d
```

---

**Error: `npm ERR! code ERESOLVE` / peer dependency conflict**

Cause: npm is resolving a newer version of React than the project was built with.

Fix: Always add `--legacy-peer-deps` when running npm install:

```
npm install --legacy-peer-deps
```

---

**Error: Docker build fails with `npm ci` lockfile mismatch**

```
npm error Invalid: lock file's react@19.2.4 does not satisfy react@18.3.1
```

Cause: The `package-lock.json` was generated with a different version of packages than what `package.json` now declares. This happens after dependencies are pinned.

Fix: Run `npm install` inside the `frontend` folder first to regenerate the lockfile, then retry the Docker build:

```
cd frontend
npm install --legacy-peer-deps
cd ..
docker compose up --build -d
```

---

**Error: `'docker' is not recognized` or `'docker compose' is not recognized`**

Fix: Docker Desktop is not installed, or you did not close and reopen Command Prompt after installing it. Install Docker Desktop, then close ALL Command Prompt windows and open a fresh one.

---

**Error: port already in use (3000, 5001, or 1883)**

Something else on your PC is using that port. Find and kill it:

```
netstat -ano | findstr :3000
```

Look at the number in the far-right column (that is the PID). Then kill it:

```
taskkill /PID 12345 /F
```

Replace `12345` with the actual PID number shown. Replace `3000` with whichever port is conflicting (5001, 1883, etc.).

---

**Error: frontend loads but shows no vessel data**

Check 1: Make sure **Window 2** (backend) is still running and shows no red errors.

Check 2: Make sure **Window 1** (MQTT broker) is still running.

Check 3: Open your browser, press **F12** to open DevTools, go to the **Console** tab, and look for any WebSocket connection errors. The frontend must connect to `ws://localhost:5001`. If it can't, the backend is not running.

---

## SECTION 6 — Ports Reference

| Service          | URL / Port               | Notes                              |
|------------------|--------------------------|------------------------------------|
| Frontend (Docker)| http://localhost:3000    | Served via Nginx inside Docker     |
| Frontend (Local) | http://localhost:5173    | Vite dev server (Pathway B only)   |
| Backend / WS API | ws://localhost:5001      | WebSocket + REST API               |
| MQTT Broker      | localhost:1883           | Eclipse Mosquitto                  |
