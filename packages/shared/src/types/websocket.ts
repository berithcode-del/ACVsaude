// ============================================================
// TIPOS DE WEBSOCKET — PROTOCOLO MOBILE <-> BANCADA
// ============================================================

export type SessionRole = 'mobile' | 'bancada';
export type SessionStatus = 'joining' | 'connected' | 'disconnected';

export interface SessionSync {
  type: 'sync';
  sessionId: string;
  role: SessionRole;
  status: SessionStatus;
}

// ----- MOBILE -> BANCADA -----
export interface TelemetryFrame {
  type: 'telemetry';
  sessionId: string;
  timestamp: number;
  frames: TelemetryFrameData[];
}

export interface TelemetryFrameData {
  faceDetected: boolean;
  faceWidthPx: number;
  faceHeightPx: number;
  ipdEstimatedPx: number;
  scaleCurrent: number;
  distanceMm: number | null;
  stability: number;
  isInRange: boolean;
}

export type ExamEventKind =
  | 'round_presented'
  | 'round_answered'
  | 'distance_locked'
  | 'distance_drift_warning'
  | 'distance_recalibration'
  | 'face_lost'
  | 'face_found'
  | 'calibration_complete'
  | 'voice_recognized'
  | 'voice_error'
  | 'test_finished';

export interface ExamEventPayload {
  kind: ExamEventKind;
  roundIndex?: number;
  logMAR?: number;
  targetLetter?: string;
  displayLetters?: string[];
  correct?: boolean;
  responseSource?: 'voz' | 'manual';
  responseTimeMs?: number;
  recognizedText?: string;
  confidence?: number;
  distanceMm?: number;
  scaleComfort?: number;
}

export interface ExamEvent {
  type: 'exam_event';
  sessionId: string;
  timestamp: number;
  event: ExamEventPayload;
}

export interface VideoFrameMessage {
  type: 'video_frame';
  sessionId: string;
  timestamp: number;
  imageData: string;
}

export type MobileToBancada =
  | TelemetryFrame
  | ExamEvent
  | VideoFrameMessage
  | SessionSync;

// ----- BANCADA -> MOBILE -----
export type ControlAction =
  | 'start_test'
  | 'pause_test'
  | 'resume_test'
  | 'abort_test'
  | 'adjust_parameter'
  | 'request_calibration';

export type ControlParameterName =
  | 'drift_warn_mm'
  | 'drift_severe_mm'
  | 'stability_threshold'
  | 'base_distance_m'
  | 'correction_factor';

export interface ControlParameter {
  name: ControlParameterName;
  value: number;
}

export interface ControlCommand {
  type: 'control';
  sessionId: string;
  command: {
    action: ControlAction;
    parameter?: ControlParameter;
  };
}

export interface CalibrationData {
  type: 'calibration_data';
  sessionId: string;
  data: {
    correctionFactor: number;
    deviceProfile?: {
      model: string;
      focalLength: number;
      sensorSize: number;
    };
  };
}

export type BancadaToMobile = ControlCommand | CalibrationData | SessionSync;

export type WebSocketMessage = MobileToBancada | BancadaToMobile;
