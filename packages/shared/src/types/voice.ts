// ============================================================
// TIPOS DE RECONHECIMENTO DE VOZ
// ============================================================

export interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
