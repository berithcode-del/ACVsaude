import { io, type Socket } from 'socket.io-client';
import type { SessionLog, RoundLog, DeviceInfo, TelemetryFrameData } from '@visao/shared';
import type { CalibrationState } from './CalibrationEngine';

type LoggerListener = (detail: any) => void;

export class SessionLogger {
  private sessionId: string;
  private log: SessionLog;
  private telemetryBuffer: TelemetryFrameData[] = [];
  private readonly TELEMETRY_BATCH_SIZE = 30;
  private socket: Socket | null = null;
  private wsUrl: string;
  private connected = false;
  private listeners = new Map<string, Set<LoggerListener>>();
  private voiceFallbackCount = 0;
  private recalibrationCount = 0;
  private driftEvents = 0;

  constructor(sessionId: string, wsUrl?: string) {
    this.sessionId = sessionId;
    this.wsUrl = wsUrl ?? '';
    this.log = this.createInitialLog();
  }

  private createInitialLog(): SessionLog {
    return {
      sessionId: this.sessionId,
      deviceInfo: this.collectDeviceInfo(),
      calibration: {} as any,
      rounds: [],
      telemetry: [],
      summary: {
        startTime: Date.now(),
        endTime: 0,
        totalDurationMs: 0,
        finalLogMAR: 0,
        finalSnellen: '',
        averageResponseTimeMs: 0,
        voiceFallbackCount: 0,
        recalibrationCount: 0,
        driftEvents: 0,
      },
    };
  }

  private collectDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenDiagonalInches: this.estimateScreenDiagonal(),
      devicePixelRatio: window.devicePixelRatio,
    };
  }

  connectWebSocket(): void {
    try {
      this.socket = io(this.wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.socket!.emit('join_session', {
          sessionId: this.sessionId,
          role: 'mobile',
        });
        this.emit('connected');
      });

      this.socket.on('session_joined', (data) => {
        this.emit('sessionJoined', data);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.on('connect_error', () => {
        this.connected = false;
        this.emit('connectionError');
      });

      this.socket.on('control', (data) => {
        this.emit('control', data);
      });
    } catch {
      this.emit('connectionError');
    }
  }

  disconnect(): void {
    this.flushTelemetry();
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  logCalibration(calibration: CalibrationState): void {
    this.log.calibration = {
      ipd_ref_px: calibration.ipd_ref_px,
      faceWidth_ref_px: calibration.faceWidth_ref_px,
      faceHeight_ref_px: calibration.faceHeight_ref_px,
      biometric_ratio: calibration.biometric_ratio,
      scale_comfort: calibration.scale_comfort,
      timestamp: calibration.timestamp,
    };
    this.emit('calibrationLogged', this.log.calibration);
  }

  logRound(round: RoundLog): void {
    this.log.rounds.push(round);
    this.emit('roundLogged', round);
    this.sendToBancada({
      type: 'exam_event',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      event: {
        kind: 'round_answered',
        roundIndex: round.roundIndex,
        logMAR: round.logMAR,
        targetLetter: round.targetLetter,
        displayLetters: round.displayLetters,
        correct: round.response.correct,
        responseSource: round.response.source,
        responseTimeMs: round.response.responseTimeMs,
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
    const batch = this.telemetryBuffer.splice(0, this.TELEMETRY_BATCH_SIZE);
    this.log.telemetry.push(...batch);
    this.sendToBancada({ type: 'telemetry', sessionId: this.sessionId, timestamp: Date.now(), frames: batch });
  }

  incrementVoiceFallback(): void { this.voiceFallbackCount++; }
  incrementRecalibration(): void { this.recalibrationCount++; }
  incrementDriftEvent(): void { this.driftEvents++; }

  finish(result: { logMAR: number; snellen: string }): void {
    this.log.summary.endTime = Date.now();
    this.log.summary.totalDurationMs = this.log.summary.endTime - this.log.summary.startTime;
    this.log.summary.finalLogMAR = result.logMAR;
    this.log.summary.finalSnellen = result.snellen;
    this.log.summary.voiceFallbackCount = this.voiceFallbackCount;
    this.log.summary.recalibrationCount = this.recalibrationCount;
    this.log.summary.driftEvents = this.driftEvents;
    const responseTimes = this.log.rounds.map((r) => r.response.responseTimeMs).filter((t) => t > 0);
    this.log.summary.averageResponseTimeMs = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    this.flushTelemetry();
    this.sendToBancada({ type: 'exam_event', sessionId: this.sessionId, timestamp: Date.now(), event: { kind: 'test_finished', logMAR: result.logMAR } });
    this.saveToLocalStorage();
  }

  sendVideoFrame(imageData: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('video_frame', {
      type: 'video_frame',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      imageData,
    });
  }

  sendToBancada(data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(data.type, data);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const key = 'visao_session_' + this.sessionId;
      localStorage.setItem(key, JSON.stringify(this.log));
    } catch { }
  }

  private estimateScreenDiagonal(): number {
    const dpr = window.devicePixelRatio || 1;
    const widthMm = (window.screen.width / dpr) * 25.4 / 96;
    const heightMm = (window.screen.height / dpr) * 25.4 / 96;
    return Math.sqrt(widthMm * widthMm + heightMm * heightMm) / 25.4;
  }

  isConnected(): boolean { return this.connected; }
  getLog(): SessionLog { return { ...this.log }; }

  on(event: string, listener: LoggerListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }
  off(event: string, listener: LoggerListener): void {
    this.listeners.get(event)?.delete(listener);
  }
  private emit(event: string, detail?: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }
}
