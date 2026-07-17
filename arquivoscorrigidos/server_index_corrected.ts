// ============================================================
// SERVIDOR ACVsaude — COM PERSISTÊNCIA SQLITE
// ============================================================

import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager.js';
import {
  getDatabase,
  createPatient,
  createSession,
  updateSessionCalibration,
  addRound,
  addTelemetryFrame,
  addEvent,
  finishSession,
  abortSession,
  getAllSessions,
  getSessionDetails,
  getPatientHistory,
  searchPatients,
  exportSessionToJSON,
  exportSessionToCSV,
  type PatientInput,
} from './db.js';

const PORT = Number(process.env.PORT) || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Inicializa banco de dados
getDatabase();

const httpServer = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // --- HEALTH CHECK ---
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        rooms: roomManager.getSessionIds().length,
        timestamp: Date.now(),
      }));
      return;
    }

    // --- CRIAR SESSÃO ---
    if (pathname === '/api/session' && req.method === 'POST') {
      const sessionId = roomManager.createSession();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId }));
      return;
    }

    // --- CRIAR PACIENTE ---
    if (pathname === '/api/patients' && req.method === 'POST') {
      const body = await readBody(req);
      const patient: PatientInput = JSON.parse(body);
      createPatient(patient);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, patientId: patient.id }));
      return;
    }

    // --- LISTAR SESSÕES ---
    if (pathname === '/api/sessions' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit')) || 50;
      const offset = Number(url.searchParams.get('offset')) || 0;
      const sessions = getAllSessions(limit, offset);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessions, count: sessions.length }));
      return;
    }

    // --- DETALHES DA SESSÃO ---
    if (pathname.startsWith('/api/sessions/') && pathname.endsWith('/details') && req.method === 'GET') {
      const sessionId = pathname.split('/')[3];
      const details = getSessionDetails(sessionId);
      if (!details) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sessão não encontrada' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(details));
      return;
    }

    // --- EXPORTAR SESSÃO (JSON) ---
    if (pathname.startsWith('/api/sessions/') && pathname.endsWith('/export/json') && req.method === 'GET') {
      const sessionId = pathname.split('/')[3];
      const json = exportSessionToJSON(sessionId);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sessao-${sessionId.slice(0, 8)}.json"`,
      });
      res.end(json);
      return;
    }

    // --- EXPORTAR SESSÃO (CSV) ---
    if (pathname.startsWith('/api/sessions/') && pathname.endsWith('/export/csv') && req.method === 'GET') {
      const sessionId = pathname.split('/')[3];
      const csv = exportSessionToCSV(sessionId);
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sessao-${sessionId.slice(0, 8)}.csv"`,
      });
      res.end(csv);
      return;
    }

    // --- HISTÓRICO DO PACIENTE ---
    if (pathname.startsWith('/api/patients/') && pathname.endsWith('/history') && req.method === 'GET') {
      const patientId = pathname.split('/')[3];
      const history = getPatientHistory(patientId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
      return;
    }

    // --- BUSCAR PACIENTES ---
    if (pathname === '/api/patients/search' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const patients = searchPatients(query);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ patients, query }));
      return;
    }

    // --- 404 ---
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (err: any) {
    console.error('[server] Erro:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  let currentSession: string | null = null;
  let patientInfo: any = null;

  socket.on('join_session', (data: {
    sessionId: string;
    role: 'mobile' | 'bancada';
    patientInfo?: PatientInput;
    deviceInfo?: any;
  }) => {
    if (!data.sessionId || !data.role) {
      socket.emit('error_message', { message: 'sessionId e role são obrigatórios' });
      return;
    }

    const joined = roomManager.joinSession(data.sessionId, socket.id, data.role);
    if (!joined) {
      socket.emit('error_message', { message: 'Sessão não encontrada' });
      return;
    }

    currentSession = data.sessionId;
    socket.join(data.sessionId);
    socket.data.role = data.role;
    socket.data.sessionId = data.sessionId;

    // ✅ Persiste dados do paciente e dispositivo no banco
    if (data.patientInfo) {
      patientInfo = data.patientInfo;
      try {
        createPatient(data.patientInfo);
      } catch { /* paciente já existe */ }
    }

    if (data.role === 'mobile' && data.deviceInfo) {
      try {
        createSession({
          id: data.sessionId,
          patientId: data.patientInfo?.id,
          sessionCode: data.sessionId.slice(0, 8).toUpperCase(),
          deviceInfo: data.deviceInfo,
        });
      } catch { /* sessão já existe */ }
    }

    socket.emit('session_joined', {
      sessionId: data.sessionId,
      role: data.role,
      peers: roomManager.getPeerCount(data.sessionId),
    });

    socket.to(data.sessionId).emit('peer_connected', { role: data.role });
    console.log(`[connect] ${data.role} ${socket.id} -> sala ${data.sessionId}`);
  });

  // ✅ Persiste calibração no banco
  socket.on('calibration_data', (data: {
    ipdRefPx: number;
    faceWidthRefPx: number;
    faceHeightRefPx: number;
    biometricRatio: number;
    scaleComfort: number;
  }) => {
    if (!currentSession) return;
    try {
      updateSessionCalibration(currentSession, data);
    } catch (err) {
      console.error('[db] Erro ao salvar calibração:', err);
    }
    socket.to(currentSession).emit('calibration_data', data);
  });

  // ✅ Persiste telemetria no banco (batch)
  socket.on('telemetry', (data: { frames: any[] }) => {
    if (!currentSession) return;
    try {
      data.frames?.forEach((frame, idx) => {
        addTelemetryFrame(currentSession!, {
          frameIndex: idx,
          faceDetected: frame.faceDetected,
          faceWidthPx: frame.faceWidthPx,
          faceHeightPx: frame.faceHeightPx,
          ipdEstimatedPx: frame.ipdEstimatedPx,
          scaleCurrent: frame.scaleCurrent,
          distanceMm: frame.distanceMm,
          stability: frame.stability,
          isInRange: frame.isInRange,
        });
      });
    } catch (err) {
      console.error('[db] Erro ao salvar telemetria:', err);
    }
    socket.to(currentSession).emit('telemetry', data);
  });

  // ✅ Persiste eventos de exame no banco
  socket.on('exam_event', (data: { event: any }) => {
    if (!currentSession) return;
    try {
      addEvent(currentSession, data.event?.kind || 'unknown', data.event);

      // Se é round respondido, salva no banco
      if (data.event?.kind === 'round_answered') {
        addRound(currentSession, {
          roundIndex: data.event.roundIndex,
          logMAR: data.event.logMAR,
          targetLetter: data.event.targetLetter,
          displayLetters: data.event.displayLetters || [],
          targetIndex: 0,
          correct: data.event.correct,
          source: data.event.responseSource || 'manual',
          responseTimeMs: data.event.responseTimeMs || 0,
          recognizedText: data.event.recognizedText,
          confidence: data.event.confidence,
          distanceMm: data.event.distanceMm,
          scale: data.event.scale,
          stability: data.event.stability,
        });
      }

      // Se é exame finalizado, atualiza resultado
      if (data.event?.kind === 'test_finished') {
        finishSession(currentSession, {
          finalLogMAR: data.event.logMAR || 0,
          finalSnellen: data.event.snellen || '',
          finalDecimal: data.event.decimal || 0,
          totalReversals: data.event.reversals || 0,
          voiceFallbackCount: data.event.voiceFallbackCount || 0,
          recalibrationCount: data.event.recalibrationCount || 0,
          driftEventsCount: data.event.driftEventsCount || 0,
          averageResponseTimeMs: data.event.averageResponseTimeMs || 0,
        });
      }
    } catch (err) {
      console.error('[db] Erro ao salvar evento:', err);
    }
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

  socket.on('disconnect', () => {
    if (currentSession) {
      const role = socket.data.role;
      roomManager.leaveSession(currentSession, socket.id);
      socket.to(currentSession).emit('peer_disconnected', { role });

      // Se mobile desconectou abruptamente, marca como abortada
      if (role === 'mobile') {
        try {
          abortSession(currentSession);
        } catch (err) {
          console.error('[db] Erro ao abortar sessão:', err);
        }
      }

      console.log(`[disconnect] ${role} ${socket.id} saiu da sala ${currentSession}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Socket.io + API REST rodando em http://localhost:${PORT}`);
  console.log(`[server] Health: http://localhost:${PORT}/health`);
  console.log(`[server] API: http://localhost:${PORT}/api/sessions`);
  console.log(`[server] DB: SQLite em ./data/acvsaude.db`);
});
