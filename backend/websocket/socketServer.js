const WebSocket = require("ws");
const aggregationService = require("../services/aggregationService");

let wss;

function init(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
}

function broadcastParentUpdate(vesselId) {
  if (!wss) return;

  const state = aggregationService.getAggregatedState(vesselId);

  if (!state) return;

  const payload = JSON.stringify({
    type: "parent-update",
    vesselId,
    data: state
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = {
  init,
  broadcastParentUpdate
};