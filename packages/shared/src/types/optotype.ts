// ============================================================
// TIPOS DE OPTOTIPOS E RENDERIZAÇÃO
// ============================================================

export interface OptotypeConfig {
  fontFamily: string;
  lettersPerLine: number;
  gapRatio: number;
  lineSpacing: number;
  baseDistanceMeters: number;
  baseSizeMm: number;
}

export interface RenderedLine {
  logMAR: number;
  snellen: string;
  letters: string[];
  fontSize_px: number;
  gap_px: number;
  y_position: number;
}

export interface LogMARRow {
  line: number;
  snellen: string;
  logMAR: number;
  multiplier: number;
  angleArcmin: number;
}
