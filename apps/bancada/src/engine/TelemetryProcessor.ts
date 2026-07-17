import type { TelemetryFrameData } from '@visao/shared';

export interface DriftEvent {
  type: 'drift_warning' | 'drift_severe' | 'recalibration' | 'stabilized';
  timestamp: number;
  distanceMm: number | null;
  stability: number;
}

export interface TelemetryAnalysis {
  driftEvents: DriftEvent[];
  currentStability: number;
  avgDistanceMm: number | null;
  faceDetected: boolean;
  needsRecalibration: boolean;
}

export class TelemetryProcessor {
  private buffer: TelemetryFrameData[] = [];
  private readonly WINDOW_SIZE = 30;
  private driftHistory: DriftEvent[] = [];
  private lastDriftWarning = 0;
  private readonly DRIFT_COOLDOWN = 2000;
  private consecutiveLowStability = 0;

  constructor(
    private stabilityThreshold = 60,
  ) {}

  updateParams(params: { stability_threshold?: number }): void {
    if (params.stability_threshold !== undefined) this.stabilityThreshold = params.stability_threshold;
  }

  processFrame(frame: TelemetryFrameData): DriftEvent | null {
    this.buffer.push(frame);
    if (this.buffer.length > this.WINDOW_SIZE) {
      this.buffer.shift();
    }

    if (!frame.faceDetected) return null;

    const stability = frame.stability;
    const now = Date.now();

    if (stability < this.stabilityThreshold) {
      this.consecutiveLowStability++;
    } else {
      this.consecutiveLowStability = Math.max(0, this.consecutiveLowStability - 1);
    }

    if (this.consecutiveLowStability >= 10 && now - this.lastDriftWarning > this.DRIFT_COOLDOWN) {
      this.lastDriftWarning = now;
      const event: DriftEvent = {
        type: stability < this.stabilityThreshold * 0.5 ? 'drift_severe' : 'drift_warning',
        timestamp: now,
        distanceMm: null,
        stability,
      };
      this.driftHistory.push(event);
      return event;
    }

    if (this.consecutiveLowStability <= 0 && this.driftHistory.length > 0) {
      const last = this.driftHistory[this.driftHistory.length - 1];
      if (last.type === 'drift_warning' || last.type === 'drift_severe') {
        const event: DriftEvent = {
          type: 'stabilized',
          timestamp: now,
          distanceMm: null,
          stability,
        };
        this.driftHistory.push(event);
        return event;
      }
    }

    return null;
  }

  getAnalysis(): TelemetryAnalysis {
    const recent = this.buffer.slice(-10);
    const stabilityValues = recent.map((f) => f.stability).filter((v) => v > 0);
    const avgStability = stabilityValues.length > 0
      ? stabilityValues.reduce((a, b) => a + b, 0) / stabilityValues.length
      : 0;

    const distanceValues = recent.map((f) => f.distanceMm).filter((v): v is number => v !== null);
    const avgDistance = distanceValues.length > 0
      ? distanceValues.reduce((a, b) => a + b, 0) / distanceValues.length
      : null;

    const faceDetected = recent.some((f) => f.faceDetected);

    return {
      driftEvents: this.driftHistory,
      currentStability: avgStability,
      avgDistanceMm: avgDistance,
      faceDetected,
      needsRecalibration: this.consecutiveLowStability >= 15,
    };
  }

  reset(): void {
    this.buffer = [];
    this.driftHistory = [];
    this.consecutiveLowStability = 0;
    this.lastDriftWarning = 0;
  }
}
