// ============================================================
// TIPOS DE TELEMETRIA E LOG DE SESSÃO
// ============================================================

import type { TelemetryFrameData } from './websocket';
import type { DeviceInfo, RoundLog, ExamSummary } from './exam';

export interface SessionLog {
  sessionId: string;
  deviceInfo: DeviceInfo;
  calibration: {
    ipdRefPx: number;
    faceWidthRefPx: number;
    faceHeightRefPx: number;
    biometricRatio: number;
    scaleComfort: number;
    timestamp: number;
  };
  rounds: RoundLog[];
  telemetry: TelemetryFrameData[];
  events: { kind: string; data?: any; timestamp: number }[];
  summary: ExamSummary;
  timestamps: {
    start: number;
    end: number;
  };
}
