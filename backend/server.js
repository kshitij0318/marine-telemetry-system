const express = require("express");
const cors = require("cors");

const parentRoutes = require("./routes/parentRoutes");
const fleetRoutes = require("./routes/fleetRoutes");
const missionRoutes = require("./routes/missionRoutes");

const mqttSubscriberService = require("./services/mqttSubscriberService");
const socketServer = require("./websocket/socketServer");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/parent", parentRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/missions", missionRoutes);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);


socketServer.init(server);

require("./services/mqttSubscriberService");