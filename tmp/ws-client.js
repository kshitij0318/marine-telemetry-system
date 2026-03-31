const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000');

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  process.exit();
});

ws.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
