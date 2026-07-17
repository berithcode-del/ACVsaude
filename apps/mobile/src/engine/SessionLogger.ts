import { EventEmitter } from '@visao/shared';
import type { TelemetryFrameData, RoundLog, ExamSummary, SessionLog } from '@visao/shared';

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

  setSocket(socket: any): void {
    this.socket = socket;
  }

  logCalibration(calibration: SessionLog['calibration']): void {
    this.log.calibration = calibration;
    this.emit('calibrationRecorded', calibration);
    this.saveToLocalStorage();

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

    this.socket?.emit?.('telemetry', { frames });

    this.saveToLocalStorage();
  }

  logEvent(event: { kind: string; data?: any }): void {
    const eventEntry = { ...event, timestamp: Date.now() };
    this.log.events.push(eventEntry);
    this.emit('eventRecorded', eventEntry);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    this.socket?.emit?.('exam_event', { event: eventEntry });
  }

  finish(summary: ExamSummary): void {
    this.log.summary = summary;
    this.log.timestamps.end = Date.now();
    this.flushTelemetry();
    this.emit('finished', summary);
    this.emit('logUpdated', this.log);
    this.saveToLocalStorage();

    this.socket?.emit?.('exam_event', {
      event: {
        kind: 'test_finished',
        ...summary,
      },
    });
  }

  private saveToLocalStorage(): void {
    try {
      const key = 'visao_session_' + this.log.sessionId;
      localStorage.setItem(key, JSON.stringify(this.log));
    } catch { }
  }

  static loadFromLocalStorage(sessionId: string): SessionLog | null {
    try {
      const key = 'visao_session_' + sessionId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  getLog(): SessionLog {
    return this.log;
  }

  getSummary(): ExamSummary {
    return this.log.summary;
  }

  getCalibration(): SessionLog['calibration'] {
    return this.log.calibration;
  }

  getRounds(): RoundLog[] {
    return this.log.rounds;
  }

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