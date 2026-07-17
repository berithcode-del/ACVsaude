import { EventEmitter } from '@visao/shared';
import type { TelemetryFrameData } from '@visao/shared';

export interface StaircaseEntry {
  round: number;
  logMAR: number;
  direction: 'up' | 'down';
  correct: boolean;
  reversal: boolean;
  timestamp: number;
}

export interface TelemetrySnapshot {
  timestamp: number;
  distanceMm: number | null;
  faceDetected: boolean;
  stability: number;
}

export interface SessionLogEventMap {
  roundRecorded: StaircaseEntry;
  telemetryRecorded: TelemetrySnapshot;
  sessionFinished: { entries: StaircaseEntry[]; finalLogMAR: number };
}

export class SessionLogger extends EventEmitter<SessionLogEventMap> {
  private entries: StaircaseEntry[] = [];
  private telemetryBuffer: TelemetrySnapshot[] = [];
  private startTime = Date.now();

  recordRound(entry: StaircaseEntry): void {
    this.entries.push(entry);
    this.emit('roundRecorded', entry);
  }

  recordTelemetry(snapshot: TelemetrySnapshot): void {
    this.telemetryBuffer.push(snapshot);
    if (this.telemetryBuffer.length > 500) this.telemetryBuffer.shift();
    this.emit('telemetryRecorded', snapshot);
  }

  finish(): { entries: StaircaseEntry[]; finalLogMAR: number } {
    const result = {
      entries: [...this.entries],
      finalLogMAR: this.entries.length > 0 ? this.entries[this.entries.length - 1].logMAR : 0,
    };
    this.emit('sessionFinished', result);
    return result;
  }

  logTelemetry(frame: TelemetryFrameData): void {
    this.recordTelemetry({
      timestamp: Date.now(),
      distanceMm: frame.distanceMm,
      faceDetected: frame.faceDetected,
      stability: frame.stability,
    });
  }

  getEntries(): StaircaseEntry[] { return [...this.entries]; }
  getTelemetry(): TelemetrySnapshot[] { return [...this.telemetryBuffer]; }
  getDuration(): number { return Date.now() - this.startTime; }

  reset(): void {
    this.entries = [];
    this.telemetryBuffer = [];
    this.startTime = Date.now();
  }
}
