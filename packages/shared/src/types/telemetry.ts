// ============================================================
// TIPOS DE TELEMETRIA E LOG DE SESSÃO
// ============================================================

import type { TelemetryFrameData } from './websocket';
import type { DeviceInfo, RoundLog, SessionSummary } from './exam';

export interface SessionLog {
  sessionId: string;
  deviceInfo: DeviceInfo;
  calibration: {
    ipd_ref_px: number;
    faceWidth_ref_px: number;
    faceHeight_ref_px: number;
    biometric_ratio: number;
    scale_comfort: number;
    timestamp: number;
  };
  rounds: RoundLog[];
  telemetry: TelemetryFrameData[];
  summary: SessionSummary;
}
