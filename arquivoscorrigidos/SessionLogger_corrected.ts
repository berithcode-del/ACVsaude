import { EventEmitter } from '@visao/shared';
import type { TelemetryFrameData, RoundLog, ExamSummary, SessionLog } from '@visao/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export class SessionLogger extends EventEmitter<{ logUpdated: SessionLog }> {
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

  setSocket(socket: any): void {
    this.socket = socket;
  }

  logCalibration(calibration: SessionLog['calibration']): void {
    this.log.calibration = calibration;
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Envia calibração para servidor
    this.socket?.emit('calibration_data', {
      ipdRefPx: calibration.ipdRefPx,
      faceWidthRefPx: calibration.faceWidthRefPx,
      faceHeightRefPx: calibration.faceHeightRefPx,
      biometricRatio: calibration.biometricRatio,
      scaleComfort: calibration.scaleComfort,
    });
  }

  logRound(round: RoundLog): void {
    this.log.rounds.push(round);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Envia round para servidor
    this.socket?.emit('exam_event', {
      event: {
        kind: 'round_answered',
        roundIndex: round.roundIndex,
        logMAR: round.logMAR,
        targetLetter: round.targetLetter,
        displayLetters: round.displayLetters,
        correct: round.correct,
        responseSource: round.responseSource,
        responseTimeMs: round.responseTimeMs,
        recognizedText: round.recognizedText,
        confidence: round.confidence,
        distanceMm: round.distanceAtPresentation,
        scale: round.scaleAtPresentation,
        stability: round.stabilityAtPresentation,
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
    this.emit('logUpdated', this.log);

    // ✅ Envia batch de telemetria para servidor
    this.socket?.emit('telemetry', { frames });
  }

  logEvent(event: { kind: string; data?: any }): void {
    this.log.events.push({ ...event, timestamp: Date.now() });
    this.emit('logUpdated', this.log);

    // ✅ Envia evento para servidor
    this.socket?.emit('exam_event', { event: { ...event, timestamp: Date.now() } });
  }

  finish(summary: ExamSummary): void {
    this.log.summary = summary;
    this.log.timestamps.end = Date.now();
    this.flushTelemetry();
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    // ✅ Envia resultado final para servidor
    this.socket?.emit('exam_event', {
      event: {
        kind: 'test_finished',
        ...summary,
      },
    });

    // ✅ Também salva no servidor via POST (backup)
    this.saveToServer().catch(() => {});
  }

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

  private saveToLocalStorage(): void {
    try {
      const key = 'visao_session_' + this.log.sessionId;
      localStorage.setItem(key, JSON.stringify(this.log));
    } catch { }
  }

  getLog(): SessionLog {
    return this.log;
  }

  private getScreenDiagonalInches(): number {
    const w = window.screen.width / window.devicePixelRatio;
    const h = window.screen.height / window.devicePixelRatio;
    const dpi = 96;
    const diagonalPx = Math.sqrt(w * w + h * h);
    return Math.round((diagonalPx / dpi) * 10) / 10;
  }
}
