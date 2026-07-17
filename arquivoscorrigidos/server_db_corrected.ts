// ============================================================
// BANCO DE DADOS SQLITE — PERSISTÊNCIA DE SESSÕES, EXAMES E TELEMETRIA
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/acvsaude.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema(): void {
  if (!db) return;

  db.exec(`
    -- Tabela de pacientes
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date TEXT,
      gender TEXT CHECK(gender IN ('M', 'F', 'O')),
      phone TEXT,
      email TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      updated_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    -- Tabela de sessões de exame
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id),
      session_code TEXT UNIQUE,  -- código curto ex: ABCD-EFGH
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'aborted', 'error')),

      -- Dados de calibração
      ipd_ref_px REAL,
      face_width_ref_px REAL,
      face_height_ref_px REAL,
      biometric_ratio REAL,
      scale_comfort REAL,
      calibration_timestamp INTEGER,

      -- Dados do dispositivo
      device_user_agent TEXT,
      device_screen_width INTEGER,
      device_screen_height INTEGER,
      device_screen_diagonal_inches REAL,
      device_pixel_ratio REAL,

      -- Resultado do exame
      final_logmar REAL,
      final_snellen TEXT,
      final_decimal REAL,
      total_reversals INTEGER,

      -- Métricas de qualidade
      voice_fallback_count INTEGER DEFAULT 0,
      recalibration_count INTEGER DEFAULT 0,
      drift_events_count INTEGER DEFAULT 0,
      average_response_time_ms REAL,

      -- Timestamps
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      started_at INTEGER,
      finished_at INTEGER,
      duration_ms INTEGER
    );

    -- Tabela de rounds (rodadas do exame)
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      round_index INTEGER NOT NULL,
      logmar REAL NOT NULL,
      angle_arcmin REAL,
      target_letter TEXT,
      display_letters TEXT,  -- JSON array
      target_index INTEGER,
      response_correct INTEGER,  -- 0 ou 1
      response_source TEXT CHECK(response_source IN ('voz', 'manual')),
      response_time_ms INTEGER,
      recognized_text TEXT,
      confidence REAL,

      -- Métricas no momento da apresentação
      distance_at_presentation_mm REAL,
      scale_at_presentation REAL,
      stability_at_presentation REAL,

      created_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    -- Tabela de telemetria (frames de tracking)
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      frame_index INTEGER,
      face_detected INTEGER,  -- 0 ou 1
      face_width_px REAL,
      face_height_px REAL,
      ipd_estimated_px REAL,
      scale_current REAL,
      distance_mm REAL,
      stability REAL,
      is_in_range INTEGER,  -- 0 ou 1
      created_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    -- Tabela de eventos do exame
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      event_kind TEXT NOT NULL,
      event_data TEXT,  -- JSON
      created_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds(session_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `);

  console.log('[db] Schema inicializado em', DB_PATH);
}

// ============================================================
// FUNÇÕES DE ACESSO AO BANCO
// ============================================================

export interface PatientInput {
  id: string;
  name: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
}

export function createPatient(patient: PatientInput): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO patients (id, name, birth_date, gender, phone, email, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    patient.id,
    patient.name,
    patient.birthDate || null,
    patient.gender || null,
    patient.phone || null,
    patient.email || null,
    Date.now()
  );
}

export interface SessionInput {
  id: string;
  patientId?: string;
  sessionCode: string;
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    screenDiagonalInches: number;
    devicePixelRatio: number;
  };
}

export function createSession(session: SessionInput): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO sessions (
      id, patient_id, session_code, status,
      device_user_agent, device_screen_width, device_screen_height,
      device_screen_diagonal_inches, device_pixel_ratio, created_at
    ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.patientId || null,
    session.sessionCode,
    session.deviceInfo.userAgent,
    session.deviceInfo.screenWidth,
    session.deviceInfo.screenHeight,
    session.deviceInfo.screenDiagonalInches,
    session.deviceInfo.devicePixelRatio,
    Date.now()
  );
}

export function updateSessionCalibration(
  sessionId: string,
  calibration: {
    ipdRefPx: number;
    faceWidthRefPx: number;
    faceHeightRefPx: number;
    biometricRatio: number;
    scaleComfort: number;
  }
): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions SET
      ipd_ref_px = ?,
      face_width_ref_px = ?,
      face_height_ref_px = ?,
      biometric_ratio = ?,
      scale_comfort = ?,
      calibration_timestamp = ?,
      started_at = COALESCE(started_at, ?)
    WHERE id = ?
  `).run(
    calibration.ipdRefPx,
    calibration.faceWidthRefPx,
    calibration.faceHeightRefPx,
    calibration.biometricRatio,
    calibration.scaleComfort,
    Date.now(),
    Date.now(),
    sessionId
  );
}

export function addRound(sessionId: string, round: {
  roundIndex: number;
  logMAR: number;
  angleArcmin?: number;
  targetLetter: string;
  displayLetters: string[];
  targetIndex: number;
  correct: boolean;
  source: 'voz' | 'manual';
  responseTimeMs: number;
  recognizedText?: string;
  confidence?: number;
  distanceMm?: number;
  scale?: number;
  stability?: number;
}): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO rounds (
      session_id, round_index, logmar, angle_arcmin, target_letter,
      display_letters, target_index, response_correct, response_source,
      response_time_ms, recognized_text, confidence,
      distance_at_presentation_mm, scale_at_presentation, stability_at_presentation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    round.roundIndex,
    round.logMAR,
    round.angleArcmin || null,
    round.targetLetter,
    JSON.stringify(round.displayLetters),
    round.targetIndex,
    round.correct ? 1 : 0,
    round.source,
    round.responseTimeMs,
    round.recognizedText || null,
    round.confidence || null,
    round.distanceMm || null,
    round.scale || null,
    round.stability || null
  );
}

export function addTelemetryFrame(sessionId: string, frame: {
  frameIndex?: number;
  faceDetected: boolean;
  faceWidthPx: number;
  faceHeightPx: number;
  ipdEstimatedPx: number;
  scaleCurrent: number;
  distanceMm?: number;
  stability: number;
  isInRange: boolean;
}): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO telemetry (
      session_id, frame_index, face_detected, face_width_px, face_height_px,
      ipd_estimated_px, scale_current, distance_mm, stability, is_in_range
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    frame.frameIndex || null,
    frame.faceDetected ? 1 : 0,
    frame.faceWidthPx,
    frame.faceHeightPx,
    frame.ipdEstimatedPx,
    frame.scaleCurrent,
    frame.distanceMm || null,
    frame.stability,
    frame.isInRange ? 1 : 0
  );
}

export function addEvent(sessionId: string, kind: string, data?: any): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO events (session_id, event_kind, event_data)
    VALUES (?, ?, ?)
  `).run(sessionId, kind, data ? JSON.stringify(data) : null);
}

export function finishSession(
  sessionId: string,
  result: {
    finalLogMAR: number;
    finalSnellen: string;
    finalDecimal: number;
    totalReversals: number;
    voiceFallbackCount: number;
    recalibrationCount: number;
    driftEventsCount: number;
    averageResponseTimeMs: number;
  }
): void {
  const db = getDatabase();
  const session = db.prepare('SELECT created_at FROM sessions WHERE id = ?').get(sessionId) as { created_at: number } | undefined;
  const duration = session ? Date.now() - session.created_at : 0;

  db.prepare(`
    UPDATE sessions SET
      status = 'completed',
      final_logmar = ?,
      final_snellen = ?,
      final_decimal = ?,
      total_reversals = ?,
      voice_fallback_count = ?,
      recalibration_count = ?,
      drift_events_count = ?,
      average_response_time_ms = ?,
      finished_at = ?,
      duration_ms = ?
    WHERE id = ?
  `).run(
    result.finalLogMAR,
    result.finalSnellen,
    result.finalDecimal,
    result.totalReversals,
    result.voiceFallbackCount,
    result.recalibrationCount,
    result.driftEventsCount,
    result.averageResponseTimeMs,
    Date.now(),
    duration,
    sessionId
  );
}

export function abortSession(sessionId: string): void {
  const db = getDatabase();
  db.prepare(`UPDATE sessions SET status = 'aborted', finished_at = ? WHERE id = ?`)
    .run(Date.now(), sessionId);
}

// ============================================================
// FUNÇÕES DE CONSULTA
// ============================================================

export interface SessionSummary {
  id: string;
  patientName: string | null;
  sessionCode: string;
  status: string;
  finalLogMAR: number | null;
  finalSnellen: string | null;
  createdAt: number;
  durationMs: number | null;
  roundCount: number;
}

export function getSessionsByPatient(patientId: string): SessionSummary[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT 
      s.id, p.name as patient_name, s.session_code, s.status,
      s.final_logmar, s.final_snellen, s.created_at, s.duration_ms,
      (SELECT COUNT(*) FROM rounds r WHERE r.session_id = s.id) as round_count
    FROM sessions s
    LEFT JOIN patients p ON s.patient_id = p.id
    WHERE s.patient_id = ?
    ORDER BY s.created_at DESC
  `).all(patientId) as SessionSummary[];
}

export function getAllSessions(limit = 50, offset = 0): SessionSummary[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT 
      s.id, p.name as patient_name, s.session_code, s.status,
      s.final_logmar, s.final_snellen, s.created_at, s.duration_ms,
      (SELECT COUNT(*) FROM rounds r WHERE r.session_id = s.id) as round_count
    FROM sessions s
    LEFT JOIN patients p ON s.patient_id = p.id
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as SessionSummary[];
}

export function getSessionDetails(sessionId: string) {
  const db = getDatabase();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const rounds = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_index').all(sessionId);
  const telemetry = db.prepare('SELECT * FROM telemetry WHERE session_id = ? ORDER BY created_at').all(sessionId);
  const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY created_at').all(sessionId);

  return { session, rounds, telemetry, events };
}

export function getPatientHistory(patientId: string) {
  const db = getDatabase();
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  const sessions = getSessionsByPatient(patientId);

  // Trend de logMAR ao longo do tempo
  const trend = db.prepare(`
    SELECT created_at, final_logmar, final_snellen
    FROM sessions
    WHERE patient_id = ? AND status = 'completed' AND final_logmar IS NOT NULL
    ORDER BY created_at ASC
  `).all(patientId);

  return { patient, sessions, trend };
}

export function searchPatients(query: string) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM patients
    WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
    ORDER BY name
    LIMIT 20
  `).all(`%${query}%`, `%${query}%`, `%${query}%`);
}

export function exportSessionToJSON(sessionId: string): string {
  const details = getSessionDetails(sessionId);
  if (!details) return '{}';
  return JSON.stringify(details, null, 2);
}

export function exportSessionToCSV(sessionId: string): string {
  const db = getDatabase();
  const rounds = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_index').all(sessionId) as any[];

  if (rounds.length === 0) return '';

  const headers = [
    'round_index', 'logmar', 'target_letter', 'display_letters',
    'response_correct', 'response_source', 'response_time_ms',
    'distance_mm', 'scale', 'stability'
  ].join(',');

  const rows = rounds.map(r => [
    r.round_index,
    r.logmar,
    r.target_letter,
    r.display_letters,
    r.response_correct,
    r.response_source,
    r.response_time_ms,
    r.distance_at_presentation_mm || '',
    r.scale_at_presentation || '',
    r.stability_at_presentation || ''
  ].join(','));

  return [headers, ...rows].join('\n');
}
