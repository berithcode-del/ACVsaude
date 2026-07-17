import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager.js';

const PORT = Number(process.env.PORT) || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const httpServer = createServer((_req, res) => {
  if (_req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: roomManager.getSessionIds().length }));
    return;
  }
  if (_req.url === '/api/session' && _req.method === 'POST') {
    const sessionId = roomManager.createSession();
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessionId }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  let currentSession: string | null = null;

  socket.on('join_session', ({ sessionId, role }: { sessionId: string; role: 'mobile' | 'bancada' }) => {
    if (!sessionId || !role) {
      socket.emit('error_message', { message: 'sessionId e role são obrigatórios' });
      return;
    }

    const joined = roomManager.joinSession(sessionId, socket.id, role);
    if (!joined) {
      socket.emit('error_message', { message: 'Sessão não encontrada' });
      return;
    }

    currentSession = sessionId;
    socket.join(sessionId);
    socket.data.role = role;
    socket.data.sessionId = sessionId;

    socket.emit('session_joined', { sessionId, role, peers: roomManager.getPeerCount(sessionId) });

      socket.to(sessionId).emit('peer_connected', { role });

    console.log(`[connect] ${role} ${socket.id} -> sala ${sessionId}`);
  });

  socket.on('telemetry', (data) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('telemetry', data);
  });

  socket.on('exam_event', (data) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('exam_event', data);
  });

  socket.on('video_frame', (data) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('video_frame', data);
  });

  socket.on('control', (data) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('control', data);
  });

  socket.on('calibration_data', (data) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('calibration_data', data);
  });

  socket.on('disconnect', () => {
    if (currentSession) {
      const role = socket.data.role;
      roomManager.leaveSession(currentSession, socket.id);
      socket.to(currentSession).emit('peer_disconnected', { role });
      console.log(`[disconnect] ${role} ${socket.id} saiu da sala ${currentSession}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Socket.io rodando em http://localhost:${PORT}`);
  console.log(`[server] Health: http://localhost:${PORT}/health`);
});
