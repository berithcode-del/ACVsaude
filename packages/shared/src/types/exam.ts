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
  response: {
    correct: boolean;
    source: ResponseSource;
    responseTimeMs: number;
    recognizedText?: string;
    confidence?: number;
  };
  distanceAtPresentation: number;
  scaleAtPresentation: number;
  stabilityAtPresentation: number;
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
