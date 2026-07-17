import { EventEmitter } from '@visao/shared';
import type { FaceMeshResult } from '@visao/shared';
import { MEDIAPIPE_LANDMARKS, SYSTEM_PARAMS } from '@visao/shared';

export interface CalibrationState {
  ipd_ref_px: number;
  faceWidth_ref_px: number;
  faceHeight_ref_px: number;
  biometric_ratio: number;
  scale_comfort: number;
  timestamp: number;
  isCalibrated: boolean;
}

export interface CalibrationEventMap {
  stabilizing: { progress: number };
  referenceCaptured: CalibrationState;
  comfortPositionCaptured: { scale_comfort: number; faceWidth_comfort_px: number };
  comfortTooClose: void;
  comfortTooFar: void;
  calibrationError: { message: string };
}

export class CalibrationEngine extends EventEmitter<CalibrationEventMap> {
  private state: CalibrationState = {
    ipd_ref_px: 0,
    faceWidth_ref_px: 0,
    faceHeight_ref_px: 0,
    biometric_ratio: 0,
    scale_comfort: 1,
    timestamp: 0,
    isCalibrated: false,
  };

  private referenceCaptured = false;
  private comfortCaptured = false;
  private stabilityFrames = 0;
  private stabilityThreshold = SYSTEM_PARAMS.STABILITY_THRESHOLD;
  private history: number[] = [];
  private historySize = SYSTEM_PARAMS.HISTORY_SIZE;

  getState(): CalibrationState {
    return { ...this.state };
  }

  captureReference(faceMesh: FaceMeshResult): boolean {
    if (this.referenceCaptured) return true;

    const landmarks = faceMesh.multiFaceLandmarks?.[0];
    if (!landmarks) return false;

    const leftPupil = landmarks[MEDIAPIPE_LANDMARKS.LEFT_PUPIL];
    const rightPupil = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_PUPIL];
    const leftEar = landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR];
    const chin = landmarks[MEDIAPIPE_LANDMARKS.CHIN];
    const forehead = landmarks[MEDIAPIPE_LANDMARKS.FOREHEAD];

    if (!leftPupil || !rightPupil || !leftEar || !rightEar || !chin || !forehead) return false;

    const ipd_px = Math.hypot(leftPupil.x - rightPupil.x, leftPupil.y - rightPupil.y);
    const faceWidth_px = Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y);
    const faceHeight_px = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);

    // Estabilidade: variância do nariz (ponto 1)
    const nose = landmarks[1];
    this.history.push(nose.x);
    if (this.history.length > this.historySize) this.history.shift();

    if (this.history.length >= this.historySize) {
      const variance = this.calculateVariance(this.history);
      if (variance < 0.0005) {
        this.stabilityFrames++;
        this.emit('stabilizing', { progress: this.stabilityFrames / this.stabilityThreshold });
      } else {
        this.stabilityFrames = 0;
        this.history = [];
        this.emit('stabilizing', { progress: 0 });
      }
    }

    if (this.stabilityFrames >= this.stabilityThreshold) {
      this.state.ipd_ref_px = ipd_px;
      this.state.faceWidth_ref_px = faceWidth_px;
      this.state.faceHeight_ref_px = faceHeight_px;
      this.state.biometric_ratio = ipd_px / faceWidth_px;
      this.state.timestamp = Date.now();
      this.state.isCalibrated = true;
      this.referenceCaptured = true;
      this.emit('referenceCaptured', this.getState());
      return true;
    }

    return false;
  }

  captureComfortPosition(faceMesh: FaceMeshResult): { ok: boolean; scale: number } {
    if (!this.referenceCaptured || this.comfortCaptured) return { ok: true, scale: this.state.scale_comfort };

    const landmarks = faceMesh.multiFaceLandmarks?.[0];
    if (!landmarks) return { ok: false, scale: 0 };

    const leftEar = landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR];
    if (!leftEar || !rightEar) return { ok: false, scale: 0 };

    const faceWidth_px = Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y);
    const scale = faceWidth_px / this.state.faceWidth_ref_px;

    if (scale < SYSTEM_PARAMS.COMFORT_MIN_SCALE) {
      this.emit('comfortTooClose');
      return { ok: false, scale };
    }

    if (scale > SYSTEM_PARAMS.COMFORT_MAX_SCALE) {
      this.emit('comfortTooFar');
      return { ok: false, scale };
    }

    this.state.scale_comfort = scale;
    this.state.timestamp = Date.now();
    this.comfortCaptured = true;
    this.emit('comfortPositionCaptured', { scale_comfort: scale, faceWidth_comfort_px: faceWidth_px });
    return { ok: true, scale };
  }

  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  }

  reset(): void {
    this.state = {
      ipd_ref_px: 0,
      faceWidth_ref_px: 0,
      faceHeight_ref_px: 0,
      biometric_ratio: 0,
      scale_comfort: 1,
      timestamp: 0,
      isCalibrated: false,
    };
    this.referenceCaptured = false;
    this.comfortCaptured = false;
    this.stabilityFrames = 0;
    this.history = [];
  }
}
