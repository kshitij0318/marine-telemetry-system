const { spawn } = require("child_process");
const path = require("path");

const children = [];

function runProcess(name, command, args, env = {}) {
  const proc = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...env }
  });

  children.push(proc);

  proc.on("close", code => {
    console.log(`${name} exited with code ${code}`);
  });
}

function cleanup() {
  console.log('Shutting down all processes...');
  children.forEach(child => child.kill('SIGTERM'));
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runProcess(
  "Backend",
  "node",
  [path.join(__dirname, "../backend/server.js")]
);

// Physics Engine: A unified process orchestrator for strictly coherent multi-sensors
runProcess(
  "Physics Engine",
  "node",
  [path.join(__dirname, "../simulators/index.js")],
  { VESSEL_ID: "V001" }
);