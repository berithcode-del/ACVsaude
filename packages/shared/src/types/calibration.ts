// ============================================================
// TIPOS DE CALIBRAÇÃO — 3 PONTOS
// ============================================================

export interface CalibrationState {
  ipd_ref_px: number;
  faceWidth_ref_px: number;
  faceHeight_ref_px: number;
  biometric_ratio: number;
  scale_comfort: number;
  timestamp: number;
  isCalibrated: boolean;
}

export type CalibrationPhase =
  | 'step1_reference'
  | 'step2_comfort'
  | 'complete';

export interface CalibrationProgress {
  phase: CalibrationPhase;
  progress: number;
  stability: number;
}
