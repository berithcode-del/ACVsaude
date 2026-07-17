// ============================================================
// TIPOS DE TRACKING HÍBRIDO
// ============================================================

export interface TrackingResult {
  faceWidth_px: number;
  faceHeight_px: number;
  ipd_estimated_px: number;
  scale_current: number;
  distance_mm: number | null;
  isInRange: boolean;
  stability: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMeshResult {
  multiFaceLandmarks: Landmark[][];
}
