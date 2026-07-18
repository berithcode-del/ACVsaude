import { create } from 'zustand';
import type { ExamPhase, DockState, ExamResult, VoiceState } from '@visao/shared';
import type { CalibrationState } from './engine/CalibrationEngine';

export interface PatientInfo {
  patientId: string;
  name: string;
  birthDate: string;
  gender: 'M' | 'F' | 'O';
}

export type ErrorType = 'camera' | 'microphone' | 'webgl' | 'generic' | null;

interface MobileState {
  phase: ExamPhase;
  dockState: DockState;
  sessionId: string | null;
  patientInfo: PatientInfo | null;
  voiceEnabled: boolean;
  voiceState: VoiceState;
  examResult: ExamResult | null;

  calibrationProgress: number;
  calibrationPhase: 'step1_reference' | 'step2_comfort' | 'complete';
  calibrationState: CalibrationState | null;

  stability: number;
  distanceMm: number | null;
  isInRange: boolean;
  currentLogMAR: number;
  currentSnellen: string;
  roundIndex: number;

  errorMessage: string | null;
  errorType: ErrorType;

  setPhase: (p: ExamPhase) => void;
  setDockState: (s: DockState) => void;
  setSessionId: (id: string) => void;
  setPatientInfo: (info: PatientInfo | null) => void;
  setVoiceEnabled: (v: boolean) => void;
  setVoiceState: (s: VoiceState) => void;
  setExamResult: (r: ExamResult) => void;
  setCalibrationProgress: (p: number) => void;
  setCalibrationPhase: (p: 'step1_reference' | 'step2_comfort' | 'complete') => void;
  setCalibrationState: (state: CalibrationState | null) => void;
  setTrackingMetrics: (s: number, d: number | null, r: boolean) => void;
  setExamMetrics: (logMAR: number, snellen: string, round: number) => void;
  setError: (m: string | null, type?: ErrorType) => void;
  reset: () => void;
}

const initialState = {
  phase: 'welcome' as ExamPhase,
  dockState: 'waiting' as DockState,
  sessionId: null as string | null,
  patientInfo: null as PatientInfo | null,
  voiceEnabled: true,
  voiceState: 'idle' as VoiceState,
  examResult: null as ExamResult | null,
  calibrationProgress: 0,
  calibrationPhase: 'step1_reference' as const,
  calibrationState: null as CalibrationState | null,
  stability: 0,
  distanceMm: null as number | null,
  isInRange: false,
  currentLogMAR: 1.0,
  currentSnellen: '20/200',
  roundIndex: 0,
  errorMessage: null as string | null,
  errorType: null as ErrorType,
};

export const useMobileStore = create<MobileState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setDockState: (dockState) => set({ dockState }),
  setSessionId: (sessionId) => set({ sessionId }),
  setPatientInfo: (patientInfo) => set({ patientInfo }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  setVoiceState: (voiceState) => set({ voiceState }),
  setExamResult: (examResult) => set({ examResult }),
  setCalibrationProgress: (calibrationProgress) => set({ calibrationProgress }),
  setCalibrationPhase: (calibrationPhase) => set({ calibrationPhase }),
  setCalibrationState: (calibrationState) => set({ calibrationState }),
  setTrackingMetrics: (stability, distanceMm, isInRange) => set({ stability, distanceMm, isInRange }),
  setExamMetrics: (currentLogMAR, currentSnellen, roundIndex) => set({ currentLogMAR, currentSnellen, roundIndex }),
  setError: (errorMessage, errorType = 'generic') => {
    if (errorMessage === null) {
      set({ errorMessage: null, errorType: null });
      return;
    }
    set({ errorMessage, errorType, phase: 'error' });
  },
  reset: () => set(initialState),
}));
