import WebSocket from 'ws';
import net from 'net';

const LOCAL_PORT = 2222;
const REMOTE_WS = 'wss://ballast.proxy.rlwy.net/'; // replace with your Railway URL

const server = net.createServer((socket) => {
  const ws = new WebSocket(REMOTE_WS);

  ws.on('open', () => {
    socket.on('data', (data) => ws.send(data));
    ws.on('message', (msg) => socket.write(msg));
  });

  socket.on('close', () => ws.close());
  ws.on('close', () => socket.end());
});

server.listen(LOCAL_PORT, () => console.log(`Local SFTP proxy listening on port ${LOCAL_PORT}`));
