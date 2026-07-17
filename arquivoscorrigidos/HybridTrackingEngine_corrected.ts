import { MEDIAPIPE_LANDMARKS, SYSTEM_PARAMS } from '@visao/shared';
import { SmoothingFilter } from './SmoothingFilter';
import type { CalibrationState } from './CalibrationEngine';
import type { FaceMeshResult, TrackingResult } from '@visao/shared';

/**
 * DISTÂNCIA BASE DO BRAÇO ESTICADO (referência média)
 * Usado para estimar distância real em milímetros.
 * 
 * Valor padrão: 600mm (60cm) — braço esticado médio adulto.
 * Pode ser ajustado por configuração do profissional na bancada.
 */
const BASE_DISTANCE_MM = 600;

export class HybridTrackingEngine {
  private calibration: CalibrationState;
  private faceWidthHistory: number[] = [];
  private readonly HISTORY_SIZE = SYSTEM_PARAMS.HISTORY_SIZE;
  private readonly EMA_ALPHA = SYSTEM_PARAMS.EMA_ALPHA;
  private faceWidthSmoothed = 0;
  private outOfRangeCounter = 0;
  private readonly OUT_OF_RANGE_TOLERANCE = SYSTEM_PARAMS.OUT_OF_RANGE_TOLERANCE;
  private readonly MIN_SCALE = SYSTEM_PARAMS.MIN_SCALE;
  private readonly MAX_SCALE = SYSTEM_PARAMS.MAX_SCALE;

  constructor(calibration: CalibrationState) {
    this.calibration = calibration;
  }

  processFrame(faceMesh: FaceMeshResult): TrackingResult {
    const landmarks = faceMesh.multiFaceLandmarks?.[0];
    if (!landmarks) {
      return {
        faceWidth_px: 0,
        faceHeight_px: 0,
        ipd_estimated_px: 0,
        scale_current: 0,
        distance_mm: null,
        stability: 0,
        isInRange: false,
      };
    }

    const leftEar = landmarks[MEDIAPIPE_LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_EAR];
    const chin = landmarks[MEDIAPIPE_LANDMARKS.CHIN];
    const forehead = landmarks[MEDIAPIPE_LANDMARKS.FOREHEAD];

    if (!leftEar || !rightEar || !chin || !forehead) {
      return {
        faceWidth_px: 0,
        faceHeight_px: 0,
        ipd_estimated_px: 0,
        scale_current: 0,
        distance_mm: null,
        stability: 0,
        isInRange: false,
      };
    }

    const faceWidth_px = Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y);
    const faceHeight_px = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);

    this.faceWidthHistory.push(faceWidth_px);
    if (this.faceWidthHistory.length > this.HISTORY_SIZE) this.faceWidthHistory.shift();

    const faceWidth_smoothed = SmoothingFilter.ema(
      this.faceWidthHistory,
      this.EMA_ALPHA
    );
    this.faceWidthSmoothed = faceWidth_smoothed;

    const ipd_estimated_px = faceWidth_smoothed * this.calibration.biometric_ratio;
    const scale_current = faceWidth_smoothed / this.calibration.faceWidth_ref_px;

    // ✅ CALCULA DISTÂNCIA REAL EM MILÍMETROS
    const distance_mm = scale_current > 0 ? Math.round(BASE_DISTANCE_MM / scale_current) : null;

    const stability = this.calculateStability();
    const isInRange = scale_current >= this.MIN_SCALE && scale_current <= this.MAX_SCALE;

    if (!isInRange) {
      this.outOfRangeCounter++;
    } else if (this.outOfRangeCounter > 0) {
      this.outOfRangeCounter -= 2;
      if (this.outOfRangeCounter < 0) this.outOfRangeCounter = 0;
    }

    const outOfRange = this.outOfRangeCounter > this.OUT_OF_RANGE_TOLERANCE;

    return {
      faceWidth_px,
      faceHeight_px,
      ipd_estimated_px,
      scale_current,
      distance_mm,  // ✅ AGORA É REAL (não null!)
      stability,
      isInRange: !outOfRange,
    };
  }

  private calculateStability(): number {
    if (this.faceWidthHistory.length < 5) return 0;
    const cv = SmoothingFilter.coefficientOfVariation(this.faceWidthHistory);
    const threshold = 0.05;
    return Math.max(0, Math.min(1, 1 - cv / threshold));
  }

  reset(): void {
    this.faceWidthHistory = [];
    this.faceWidthSmoothed = 0;
    this.outOfRangeCounter = 0;
  }
}
