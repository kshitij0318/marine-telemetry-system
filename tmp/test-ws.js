const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000');

ws.on('open', () => {
  console.log('Connected to Backend WebSocket');
});

ws.on('message', (data) => {
  console.log('Received payload:', data.toString());
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout waiting for data');
  process.exit(1);
}, 5000);
