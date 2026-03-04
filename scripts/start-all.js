const { spawn } = require("child_process");
const path = require("path");

function runProcess(name, command, args, env = {}) {
  const proc = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env }
  });

  proc.on("close", code => {
    console.log(`${name} exited with code ${code}`);
  });
}

runProcess(
  "Backend",
  "node",
  [path.join(__dirname, "../backend/server.js")]
);
runProcess(
  "CTD Simulator",
  "node",
  [path.join(__dirname, "../simulators/ctd/CTDSimulator.js")],
  { VESSEL_ID: "V001", DEVICE_ID: "CTD01" }
);

runProcess(
  "GNSS Simulator",
  "node",
  [path.join(__dirname, "../simulators/gnss/GNSSSimulator.js")],
  { VESSEL_ID: "V001", DEVICE_ID: "GNSS01" }
);

runProcess(
  "Current Meter Simulator",
  "node",
  [path.join(__dirname, "../simulators/currentMeter/CurrentMeterSimulator.js")],
  { VESSEL_ID: "V001", DEVICE_ID: "CM01" }
);

runProcess(
  "Thruster Simulator",
  "node",
  [path.join(__dirname, "../simulators/thruster/ThrusterSimulator.js")],
  { VESSEL_ID: "V001", DEVICE_ID: "THR01" }
);
runProcess(
  "OAS Simulator",
  "node",
  [path.join(__dirname, "../simulators/oas/OASSimulator.js")],
  { VESSEL_ID: "V001", DEVICE_ID: "OAS01" }
);