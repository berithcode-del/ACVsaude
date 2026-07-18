import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/acvsaude.db');

let db: SqlJsDatabase | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    initializeSchema(db);
  }
  return db;
}

export function getDb(): SqlJsDatabase | null {
  return db;
}

function initializeSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date TEXT,
      gender TEXT CHECK(gender IN ('M', 'F', 'O')),
      phone TEXT,
      email TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      session_code TEXT UNIQUE,
      status TEXT DEFAULT 'active',
      ipd_ref_px REAL,
      face_width_ref_px REAL,
      face_height_ref_px REAL,
      biometric_ratio REAL,
      scale_comfort REAL,
      calibration_timestamp INTEGER,
      device_user_agent TEXT,
      device_screen_width INTEGER,
      device_screen_height INTEGER,
      device_screen_diagonal_inches REAL,
      device_pixel_ratio REAL,
      final_logmar REAL,
      final_snellen TEXT,
      final_decimal REAL,
      total_reversals INTEGER,
      voice_fallback_count INTEGER DEFAULT 0,
      recalibration_count INTEGER DEFAULT 0,
      drift_events_count INTEGER DEFAULT 0,
      average_response_time_ms REAL,
      created_at INTEGER,
      started_at INTEGER,
      finished_at INTEGER,
      duration_ms INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      round_index INTEGER NOT NULL,
      logmar REAL NOT NULL,
      angle_arcmin REAL,
      target_letter TEXT,
      display_letters TEXT,
      target_index INTEGER,
      response_correct INTEGER,
      response_source TEXT,
      response_time_ms INTEGER,
      recognized_text TEXT,
      confidence REAL,
      distance_at_presentation_mm REAL,
      scale_at_presentation REAL,
      stability_at_presentation REAL,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      frame_index INTEGER,
      face_detected INTEGER,
      face_width_px REAL,
      face_height_px REAL,
      ipd_estimated_px REAL,
      scale_current REAL,
      distance_mm REAL,
      stability REAL,
      is_in_range INTEGER,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_kind TEXT NOT NULL,
      event_data TEXT,
      created_at INTEGER
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds(session_id)`);
  saveDatabase(db);

  console.log('[db] Schema inicializado');
}

export function saveDatabase(db: SqlJsDatabase): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export interface PatientInput {
  id: string;
  name: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
}

export function createPatient(patient: PatientInput): void {
  const d = db!;
  d.run(
    `INSERT OR REPLACE INTO patients (id, name, birth_date, gender, phone, email, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patient.id, patient.name, patient.birthDate || null, patient.gender || null, patient.phone || null, patient.email || null, Date.now()]
  );
  saveDatabase(d);
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
  const d = db!;
  d.run(
    `INSERT INTO sessions (id, patient_id, session_code, status, device_user_agent, device_screen_width, device_screen_height, device_screen_diagonal_inches, device_pixel_ratio, created_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
    [session.id, session.patientId || null, session.sessionCode, session.deviceInfo.userAgent, session.deviceInfo.screenWidth, session.deviceInfo.screenHeight, session.deviceInfo.screenDiagonalInches, session.deviceInfo.devicePixelRatio, Date.now()]
  );
  saveDatabase(d);
}

export function updateSessionCalibration(sessionId: string, calibration: { ipdRefPx: number; faceWidthRefPx: number; faceHeightRefPx: number; biometricRatio: number; scaleComfort: number }): void {
  const d = db!;
  d.run(
    `UPDATE sessions SET ipd_ref_px=?, face_width_ref_px=?, face_height_ref_px=?, biometric_ratio=?, scale_comfort=?, calibration_timestamp=?, started_at=COALESCE(started_at,?) WHERE id=?`,
    [calibration.ipdRefPx, calibration.faceWidthRefPx, calibration.faceHeightRefPx, calibration.biometricRatio, calibration.scaleComfort, Date.now(), Date.now(), sessionId]
  );
  saveDatabase(d);
}

export function addRound(sessionId: string, round: { roundIndex: number; logMAR: number; angleArcmin?: number; targetLetter: string; displayLetters: string[]; targetIndex: number; correct: boolean; source: string; responseTimeMs: number; recognizedText?: string; confidence?: number; distanceMm?: number; scale?: number; stability?: number }): void {
  const d = db!;
  d.run(
    `INSERT INTO rounds (session_id, round_index, logmar, angle_arcmin, target_letter, display_letters, target_index, response_correct, response_source, response_time_ms, recognized_text, confidence, distance_at_presentation_mm, scale_at_presentation, stability_at_presentation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [sessionId, round.roundIndex, round.logMAR, round.angleArcmin || null, round.targetLetter, JSON.stringify(round.displayLetters), round.targetIndex, round.correct ? 1 : 0, round.source, round.responseTimeMs, round.recognizedText || null, round.confidence || null, round.distanceMm || null, round.scale || null, round.stability || null]
  );
  saveDatabase(d);
}

export function addTelemetryFrame(sessionId: string, frame: { frameIndex?: number; faceDetected: boolean; faceWidthPx: number; faceHeightPx: number; ipdEstimatedPx: number; scaleCurrent: number; distanceMm?: number; stability: number; isInRange: boolean }): void {
  const d = db!;
  d.run(
    `INSERT INTO telemetry (session_id, frame_index, face_detected, face_width_px, face_height_px, ipd_estimated_px, scale_current, distance_mm, stability, is_in_range) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [sessionId, frame.frameIndex || null, frame.faceDetected ? 1 : 0, frame.faceWidthPx, frame.faceHeightPx, frame.ipdEstimatedPx, frame.scaleCurrent, frame.distanceMm || null, frame.stability, frame.isInRange ? 1 : 0]
  );
}

export function addEvent(sessionId: string, kind: string, data?: any): void {
  const d = db!;
  d.run(`INSERT INTO events (session_id, event_kind, event_data) VALUES (?,?,?)`, [sessionId, kind, data ? JSON.stringify(data) : null]);
}

export function finishSession(sessionId: string, result: { finalLogMAR: number; finalSnellen: string; finalDecimal: number; totalReversals: number; voiceFallbackCount: number; recalibrationCount: number; driftEventsCount: number; averageResponseTimeMs: number }): void {
  const d = db!;
  const row = d.exec(`SELECT created_at FROM sessions WHERE id = ?`, [sessionId]);
  const created = row.length ? (row[0].values[0]?.[0] as number) : Date.now();
  const duration = Date.now() - created;

  d.run(
    `UPDATE sessions SET status='completed', final_logmar=?, final_snellen=?, final_decimal=?, total_reversals=?, voice_fallback_count=?, recalibration_count=?, drift_events_count=?, average_response_time_ms=?, finished_at=?, duration_ms=? WHERE id=?`,
    [result.finalLogMAR, result.finalSnellen, result.finalDecimal, result.totalReversals, result.voiceFallbackCount, result.recalibrationCount, result.driftEventsCount, result.averageResponseTimeMs, Date.now(), duration, sessionId]
  );
  saveDatabase(d);
}

export function abortSession(sessionId: string): void {
  db!.run(`UPDATE sessions SET status='aborted', finished_at=? WHERE id=? AND status NOT IN ('completed', 'aborted')`, [Date.now(), sessionId]);
  saveDatabase(db!);
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db!.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

export function getSessionsByPatient(patientId: string): any[] {
  return queryAll(
    `SELECT s.id, p.name as patient_name, s.session_code, s.status, s.final_logmar, s.final_snellen, s.created_at, s.duration_ms, (SELECT COUNT(*) FROM rounds r WHERE r.session_id=s.id) as round_count FROM sessions s LEFT JOIN patients p ON s.patient_id=p.id WHERE s.patient_id=? ORDER BY s.created_at DESC`,
    [patientId]
  );
}

export function getAllSessions(limit = 50, offset = 0): any[] {
  return queryAll(
    `SELECT s.id, p.name as patient_name, s.session_code, s.status, s.final_logmar, s.final_snellen, s.created_at, s.duration_ms, (SELECT COUNT(*) FROM rounds r WHERE r.session_id=s.id) as round_count FROM sessions s LEFT JOIN patients p ON s.patient_id=p.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function getSessionDetails(sessionId: string): any | null {
  const session = queryOne(`SELECT * FROM sessions WHERE id=?`, [sessionId]);
  if (!session) return null;
  const rounds = queryAll(`SELECT * FROM rounds WHERE session_id=? ORDER BY round_index`, [sessionId]);
  const telemetry = queryAll(`SELECT * FROM telemetry WHERE session_id=? ORDER BY created_at`, [sessionId]);
  const events = queryAll(`SELECT * FROM events WHERE session_id=? ORDER BY created_at`, [sessionId]);
  return { session, rounds, telemetry, events };
}

export function getPatientHistory(patientId: string): any {
  const patient = queryOne(`SELECT * FROM patients WHERE id=?`, [patientId]);
  const sessions = getSessionsByPatient(patientId);
  const trend = queryAll(`SELECT created_at, final_logmar, final_snellen FROM sessions WHERE patient_id=? AND status='completed' AND final_logmar IS NOT NULL ORDER BY created_at ASC`, [patientId]);
  return { patient, sessions, trend };
}

export function searchPatients(query: string): any[] {
  return queryAll(`SELECT * FROM patients WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name LIMIT 20`, [`%${query}%`, `%${query}%`, `%${query}%`]);
}

export function exportSessionToJSON(sessionId: string): string {
  const details = getSessionDetails(sessionId);
  return details ? JSON.stringify(details, null, 2) : '{}';
}

export function exportSessionToCSV(sessionId: string): string {
  const rows = queryAll(`SELECT * FROM rounds WHERE session_id=? ORDER BY round_index`, [sessionId]);
  if (!rows.length) return '';
  const headers = ['round_index','logmar','target_letter','display_letters','response_correct','response_source','response_time_ms','distance_mm','scale','stability'].join(',');
  const csvRows = rows.map((r: any) => [r.round_index, r.logmar, r.target_letter, r.display_letters, r.response_correct, r.response_source, r.response_time_ms, r.distance_at_presentation_mm || '', r.scale_at_presentation || '', r.stability_at_presentation || ''].join(','));
  return [headers, ...csvRows].join('\n');
}
