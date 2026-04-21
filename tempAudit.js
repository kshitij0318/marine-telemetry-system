const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5001/');
ws.on('message', (data) => {
  try {
    const payload = JSON.parse(data);
    if (payload.type === 'parent-update' && payload.data) {
      console.log(JSON.stringify(payload.data, null, 2));
      process.exit(0);
    }
  } catch (err) {}
});
ws.on('error', console.error);
