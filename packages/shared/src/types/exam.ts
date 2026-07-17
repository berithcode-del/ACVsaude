// ============================================================
// TIPOS DO EXAME — LOGMAR, STAIRCASE, RODADAS
// ============================================================

export type ResponseSource = 'voz' | 'manual';

export interface RoundLog {
  roundIndex: number;
  logMAR: number;
  angleArcmin: number;
  targetLetter: string;
  displayLetters: string[];
  targetIndex: number;
  correct: boolean;
  responseSource: ResponseSource;
  responseTimeMs: number;
  recognizedText?: string;
  confidence?: number;
  distanceAtPresentation: number | null;
  scaleAtPresentation: number | null;
  stabilityAtPresentation: number | null;
}

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  screenDiagonalInches: number;
  devicePixelRatio: number;
  model?: string;
  focalLength?: number;
}

export interface ExamResult {
  logMAR: number;
  snellen: string;
  decimal: number;
  reversals: number;
}

export interface ExamSummary {
  totalRounds: number;
  correctCount: number;
  incorrectCount: number;
  finalLogMAR: number;
  finalSnellen: string;
  finalDecimal: number;
  averageResponseTimeMs: number;
  voiceFallbackCount: number;
  recalibrationCount: number;
  driftEventsCount: number;
}

export interface SessionSummary {
  startTime: number;
  endTime: number;
  totalDurationMs: number;
  finalLogMAR: number;
  finalSnellen: string;
  averageResponseTimeMs: number;
  voiceFallbackCount: number;
  recalibrationCount: number;
  driftEvents: number;
}

export type ExamPhase =
  | 'welcome'
  | 'calibration_step1'
  | 'calibration_step2'
  | 'calibration_complete'
  | 'exam_running'
  | 'exam_paused'
  | 'exam_finished'
  | 'error';

export type DockState = 'waiting' | 'listening' | 'answering' | 'finished';
