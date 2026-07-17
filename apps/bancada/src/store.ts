import { create } from 'zustand';
import type { TelemetryFrameData, ExamEventPayload } from '@visao/shared';

interface BancadaState {
  sessionId: string | null;
  connected: boolean;
  peerConnected: boolean;
  peerRole: 'mobile' | null;
  telemetry: TelemetryFrameData[];
  events: ExamEventPayload[];
  latestFrame: string | null;
  frameRate: number;
  params: Record<string, number>;

  setSessionId: (id: string) => void;
  setConnected: (v: boolean) => void;
  setPeerConnected: (v: boolean, role?: 'mobile') => void;
  addTelemetry: (data: TelemetryFrameData) => void;
  addEvent: (event: ExamEventPayload) => void;
  setLatestFrame: (data: string) => void;
  setFrameRate: (fps: number) => void;
  updateParam: (name: string, value: number) => void;
  reset: () => void;
}

const defaultParams: Record<string, number> = {
  drift_warn_mm: 20,
  drift_severe_mm: 50,
  stability_threshold: 60,
  base_distance_m: 0.4,
  correction_factor: 1.0,
};

export const useBancadaStore = create<BancadaState>((set) => ({
  sessionId: null,
  connected: false,
  peerConnected: false,
  peerRole: null,
  telemetry: [],
  events: [],
  latestFrame: null,
  frameRate: 0,
  params: { ...defaultParams },

  setSessionId: (sessionId) => set({ sessionId }),
  setConnected: (connected) => set({ connected }),
  setPeerConnected: (peerConnected, peerRole) => set({ peerConnected, peerRole }),
  addTelemetry: (data) => set((s) => ({ telemetry: [...s.telemetry.slice(-300), data] })),
  addEvent: (event) => set((s) => ({ events: [...s.events.slice(-100), event] })),
  setLatestFrame: (latestFrame) => set({ latestFrame }),
  setFrameRate: (frameRate) => set({ frameRate }),
  updateParam: (name, value) => set((s) => ({ params: { ...s.params, [name]: value } })),
  reset: () => set({ telemetry: [], events: [], latestFrame: null, frameRate: 0, params: { ...defaultParams } }),
}));
