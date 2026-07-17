import { EventEmitter } from '@visao/shared';
import type { TelemetryFrameData, RoundLog, ExamSummary, SessionLog } from '@visao/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SessionLogEventMap {
  logUpdated: SessionLog;
  roundRecorded: RoundLog;
  telemetryRecorded: TelemetryFrameData[];
  calibrationRecorded: SessionLog['calibration'];
  eventRecorded: { kind: string; data?: any; timestamp: number };
  finished: ExamSummary;
}

export class SessionLogger extends EventEmitter<SessionLogEventMap> {
  private log: SessionLog;
  private telemetryBuffer: TelemetryFrameData[] = [];
  private readonly TELEMETRY_BATCH_SIZE = 30;
  private socket: any = null;

  constructor(sessionId: string) {
    super();
    this.log = {
      sessionId,
      calibration: {
        ipdRefPx: 0,
        faceWidthRefPx: 0,
        faceHeightRefPx: 0,
        biometricRatio: 0,
        scaleComfort: 0,
        timestamp: 0,
      },
      rounds: [],
      telemetry: [],
      events: [],
      summary: {
        totalRounds: 0,
        correctCount: 0,
        incorrectCount: 0,
        finalLogMAR: 0,
        finalSnellen: '',
        finalDecimal: 0,
        averageResponseTimeMs: 0,
        voiceFallbackCount: 0,
        recalibrationCount: 0,
        driftEventsCount: 0,
      },
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenDiagonalInches: this.getScreenDiagonalInches(),
        devicePixelRatio: window.devicePixelRatio,
      },
      timestamps: {
        start: Date.now(),
        end: 0,
      },
    };
  }

  // ✅ NOVO: Conectar com WebSocket para enviar dados ao servidor
  setSocket(socket: any): void {
    this.socket = socket;
  }

  logCalibration(calibration: SessionLog['calibration']): void {
    this.log.calibration = calibration;
    this.emit('calibrationRecorded', calibration);
    this.saveToLocalStorage();

    // ✅ Enviar calibração para servidor via WebSocket
    this.socket?.emit?.('calibration_data', {
      ipdRefPx: calibration.ipdRefPx,
      faceWidthRefPx: calibration.faceWidthRefPx,
      faceHeightRefPx: calibration.faceHeightRefPx,
      biometricRatio: calibration.biometricRatio,
      scaleComfort: calibration.scaleComfort,
    });
  }

  logRound(round: RoundLog): void {
    this.log.rounds.push(round);
    this.emit('roundRecorded', round);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Enviar round para servidor via WebSocket
    this.socket?.emit?.('exam_event', {
      event: {
        kind: 'round_answered',
        ...round,
      },
    });
  }

  logTelemetry(frame: TelemetryFrameData): void {
    this.telemetryBuffer.push(frame);

    if (this.telemetryBuffer.length >= this.TELEMETRY_BATCH_SIZE) {
      this.flushTelemetry();
    }
  }

  private flushTelemetry(): void {
    if (this.telemetryBuffer.length === 0) return;

    const frames = [...this.telemetryBuffer];
    this.log.telemetry.push(...frames);
    this.telemetryBuffer = [];
    this.emit('telemetryRecorded', frames);
    this.emit('logUpdated', this.log);

    // ✅ Enviar telemetria para servidor via WebSocket
    this.socket?.emit?.('telemetry', { frames });

    this.saveToLocalStorage();
  }

  logEvent(event: { kind: string; data?: any }): void {
    const eventEntry = { ...event, timestamp: Date.now() };
    this.log.events.push(eventEntry);
    this.emit('eventRecorded', eventEntry);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Enviar evento para servidor via WebSocket
    this.socket?.emit?.('exam_event', { event: eventEntry });
  }

  finish(summary: ExamSummary): void {
    this.log.summary = summary;
    this.log.timestamps.end = Date.now();
    this.flushTelemetry();
    this.emit('finished', summary);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Enviar resultado final para servidor via WebSocket
    this.socket?.emit?.('exam_event', {
      event: {
        kind: 'test_finished',
        ...summary,
      },
    });

    // ✅ NOVO: Também salvar no servidor via POST (backup)
    this.saveToServer().catch(() => {});
  }

  // ✅ NOVO: Salvar no servidor via POST (backup)
  private async saveToServer(): Promise<void> {
    try {
      await fetch(`${API_URL}/api/sessions/${this.log.sessionId}/export/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.log),
      });
    } catch {
      // Fallback: já está em localStorage
    }
  }

  // ✅ NOVO: Backup offline em localStorage
  private saveToLocalStorage(): void {
    try {
      const key = 'visao_session_' + this.log.sessionId;
      localStorage.setItem(key, JSON.stringify(this.log));
    } catch { }
  }

  // ✅ NOVO: Recuperar log de localStorage (útil para retry)
  static loadFromLocalStorage(sessionId: string): SessionLog | null {
    try {
      const key = 'visao_session_' + sessionId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // ✅ NOVO: Obter log completo
  getLog(): SessionLog {
    return this.log;
  }

  // ✅ NOVO: Obter resumo do exame
  getSummary(): ExamSummary {
    return this.log.summary;
  }

  // ✅ NOVO: Obter calibração
  getCalibration(): SessionLog['calibration'] {
    return this.log.calibration;
  }

  // ✅ NOVO: Obter rounds
  getRounds(): RoundLog[] {
    return this.log.rounds;
  }

  // ✅ NOVO: Obter telemetria
  getTelemetry(): TelemetryFrameData[] {
    return this.log.telemetry;
  }

  private getScreenDiagonalInches(): number {
    const w = window.screen.width / window.devicePixelRatio;
    const h = window.screen.height / window.devicePixelRatio;
    const dpi = 96;
    const diagonalPx = Math.sqrt(w * w + h * h);
    return Math.round((diagonalPx / dpi) * 10) / 10;
  }
}
