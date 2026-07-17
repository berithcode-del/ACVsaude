import type { FaceMeshResult, TrackingResult, Landmark } from '@visao/shared';
import type { CalibrationState } from './CalibrationEngine';
import { SYSTEM_PARAMS, MEDIAPIPE_LANDMARKS } from '@visao/shared';
import { euclideanDistance } from '@visao/shared';
import { SmoothingFilter } from './SmoothingFilter';

type TrackingListener = (detail: any) => void;

export class HybridTrackingEngine {
  private calibration: CalibrationState;
  private faceWidthHistory: number[] = [];
  private readonly HISTORY_SIZE = SYSTEM_PARAMS.HISTORY_SIZE;
  private readonly EMA_ALPHA = SYSTEM_PARAMS.EMA_ALPHA;
  private readonly STABILITY_THRESHOLD = 0.15;
  private outOfRangeFrames = 0;
  private readonly OUT_OF_RANGE_TOLERANCE = SYSTEM_PARAMS.OUT_OF_RANGE_TOLERANCE;
  private listeners = new Map<string, Set<TrackingListener>>();

  constructor(calibration: CalibrationState) {
    this.calibration = calibration;
  }

  processFrame(faceMesh: FaceMeshResult): TrackingResult {
    const landmarks = faceMesh.multiFaceLandmarks[0];

    const faceWidth_raw = euclideanDistance(
      landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR],
      landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR]
    );

    this.faceWidthHistory.push(faceWidth_raw);
    if (this.faceWidthHistory.length > this.HISTORY_SIZE) {
      this.faceWidthHistory.shift();
    }

    const faceWidth_smoothed = SmoothingFilter.ema(this.faceWidthHistory, this.EMA_ALPHA);

    const ipd_estimated = faceWidth_smoothed * this.calibration.biometric_ratio;

    const scale_current = faceWidth_smoothed / this.calibration.faceWidth_ref_px;

    const distance_ratio = scale_current > 0 ? 1 / scale_current : 0;

    const isInRange = this.checkRangeWithHysteresis(scale_current);

    const stability = this.calculateStability();

    return {
      faceWidth_px: faceWidth_smoothed,
      faceHeight_px: this.getFaceHeight(landmarks),
      ipd_estimated_px: ipd_estimated,
      scale_current,
      distance_ratio,
      isInRange,
      stability,
    };
  }

  private checkRangeWithHysteresis(scale: number): boolean {
    const MIN_SCALE = SYSTEM_PARAMS.MIN_SCALE;
    const MAX_SCALE = SYSTEM_PARAMS.MAX_SCALE;

    const isCurrentlyInRange = scale >= MIN_SCALE && scale <= MAX_SCALE;

    if (!isCurrentlyInRange) {
      this.outOfRangeFrames++;
      if (this.outOfRangeFrames > this.OUT_OF_RANGE_TOLERANCE) {
        this.emit('outOfRange', { scale, frames: this.outOfRangeFrames });
        return false;
      }
      return true;
    } else {
      this.outOfRangeFrames = Math.max(0, this.outOfRangeFrames - 2);
      return true;
    }
  }

  private calculateStability(): number {
    if (this.faceWidthHistory.length < 3) return 1.0;
    const cv = SmoothingFilter.coefficientOfVariation(this.faceWidthHistory);
    return Math.max(0, Math.min(1, 1 - cv / this.STABILITY_THRESHOLD));
  }

  private getFaceHeight(landmarks: Landmark[]): number {
    return euclideanDistance(landmarks[MEDIAPIPE_LANDMARKS.CHIN], landmarks[MEDIAPIPE_LANDMARKS.FOREHEAD]);
  }

  on(event: string, listener: TrackingListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: TrackingListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, detail: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }

  reset(): void {
    this.faceWidthHistory = [];
    this.outOfRangeFrames = 0;
  }
}