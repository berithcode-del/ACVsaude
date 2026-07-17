import type { FaceMeshResult, Landmark } from '@visao/shared';
import { SYSTEM_PARAMS, MEDIAPIPE_LANDMARKS } from '@visao/shared';
import { euclideanDistance } from '@visao/shared';
import { SmoothingFilter } from './SmoothingFilter';

export interface CalibrationState {
  ipd_ref_px: number;
  faceWidth_ref_px: number;
  faceHeight_ref_px: number;
  biometric_ratio: number;
  scale_comfort: number;
  timestamp: number;
  isCalibrated: boolean;
}

export type CalibrationEvent =
  | 'stabilizing'
  | 'referenceCaptured'
  | 'comfortPositionCaptured'
  | 'comfortTooClose'
  | 'comfortTooFar'
  | 'calibrationError';

export interface CalibrationEventMap {
  stabilizing: { progress: number };
  referenceCaptured: CalibrationState;
  comfortPositionCaptured: { scale_comfort: number; faceWidth_comfort_px: number };
  comfortTooClose: { scale: number };
  comfortTooFar: { scale: number };
  calibrationError: { message: string };
}

type Listener<T> = (detail: T) => void;

export class CalibrationEngine {
  private state: CalibrationState | null = null;
  private stabilityFrames = 0;
  private readonly STABILITY_THRESHOLD = SYSTEM_PARAMS.STABILITY_THRESHOLD;
  private readonly HISTORY_SIZE = SYSTEM_PARAMS.HISTORY_SIZE;
  private listeners = new Map<string, Set<Listener<any>>>();

  private nosePositions: number[] = [];

  async captureReference(faceMesh: FaceMeshResult): Promise<boolean> {
    if (!faceMesh.multiFaceLandmarks?.length) return false;

    const landmarks = faceMesh.multiFaceLandmarks[0];

    if (!this.isFaceStable(landmarks)) {
      this.stabilityFrames = 0;
      this.emit('stabilizing', { progress: 0 });
      return false;
    }

    this.stabilityFrames++;
    const progress = Math.min(100, (this.stabilityFrames / this.STABILITY_THRESHOLD) * 100);
    this.emit('stabilizing', { progress });

    if (this.stabilityFrames < this.STABILITY_THRESHOLD) return false;

    const ipd_px = euclideanDistance(
      landmarks[MEDIAPIPE_LANDMARKS.LEFT_PUPIL],
      landmarks[MEDIAPIPE_LANDMARKS.RIGHT_PUPIL]
    );
    const faceWidth_px = euclideanDistance(
      landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR],
      landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR]
    );
    const faceHeight_px = euclideanDistance(
      landmarks[MEDIAPIPE_LANDMARKS.CHIN],
      landmarks[MEDIAPIPE_LANDMARKS.FOREHEAD]
    );

    const biometric_ratio = faceWidth_px > 0 ? ipd_px / faceWidth_px : 0;

    this.state = {
      ipd_ref_px: ipd_px,
      faceWidth_ref_px: faceWidth_px,
      faceHeight_ref_px: faceHeight_px,
      biometric_ratio,
      scale_comfort: 1.0,
      timestamp: Date.now(),
      isCalibrated: true,
    };

    this.emit('referenceCaptured', { ...this.state });
    return true;
  }

  captureComfortPosition(faceMesh: FaceMeshResult): { ok: boolean; scale: number } {
    if (!this.state?.isCalibrated) {
      this.emit('calibrationError', { message: 'Calibração de referência não realizada' });
      return { ok: false, scale: 0 };
    }

    const landmarks = faceMesh.multiFaceLandmarks[0];
    const faceWidth_comfort_px = euclideanDistance(
      landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR],
      landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR]
    );

    const scale_comfort = faceWidth_comfort_px / this.state.faceWidth_ref_px;

    if (scale_comfort < SYSTEM_PARAMS.COMFORT_MIN_SCALE) {
      this.emit('comfortTooClose', { scale: scale_comfort });
      return { ok: false, scale: scale_comfort };
    }

    if (scale_comfort > SYSTEM_PARAMS.COMFORT_MAX_SCALE) {
      this.emit('comfortTooFar', { scale: scale_comfort });
      return { ok: false, scale: scale_comfort };
    }

    this.state.scale_comfort = scale_comfort;
    this.emit('comfortPositionCaptured', {
      scale_comfort,
      faceWidth_comfort_px,
    });

    return { ok: true, scale: scale_comfort };
  }

  private isFaceStable(landmarks: Landmark[]): boolean {
    const nose = landmarks[MEDIAPIPE_LANDMARKS.NOSE_TIP];
    this.nosePositions.push(nose.x);
    if (this.nosePositions.length > this.HISTORY_SIZE) {
      this.nosePositions.shift();
    }
    if (this.nosePositions.length < 5) return false;
    const variance = SmoothingFilter.variance(this.nosePositions);
    return variance < 0.001;
  }

  getState(): CalibrationState | null {
    return this.state ? { ...this.state } : null;
  }

  isCalibrated(): boolean {
    return this.state?.isCalibrated ?? false;
  }

  on<E extends CalibrationEvent>(event: E, listener: Listener<CalibrationEventMap[E]>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off<E extends CalibrationEvent>(event: E, listener: Listener<CalibrationEventMap[E]>): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit<E extends CalibrationEvent>(event: E, detail: CalibrationEventMap[E]): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }

  reset(): void {
    this.state = null;
    this.stabilityFrames = 0;
    this.nosePositions = [];
  }
}