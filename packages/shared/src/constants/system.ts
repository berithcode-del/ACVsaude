// ============================================================
// PARÂMETROS DO SISTEMA — CONSTANTES CLÍNICAS E OPERACIONAIS
// ============================================================

export const SYSTEM_PARAMS = {
  STABILITY_THRESHOLD: 60,
  HISTORY_SIZE: 10,
  EMA_ALPHA: 0.3,
  MIN_SCALE: 0.7,
  MAX_SCALE: 3.0,
  OUT_OF_RANGE_TOLERANCE: 90,
  VOICE_RETRY_MAX: 3,
  VOICE_TIMEOUT_MS: 10000,
  STEP_LOGMAR: 0.1,
  LETTERS_PER_LINE: 5,
  GAP_RATIO: 1.0,
  LINE_SPACING: 1.5,
  MAX_REVERSALS: 3,
  CONSECUTIVE_CORRECT: 3,
  CONSECUTIVE_WRONG: 2,
  COMFORT_MIN_SCALE: 1.2,
  COMFORT_MAX_SCALE: 2.5,
  LOGMAR_START: 1.0,
  LOGMAR_END: -0.2,
} as const;

// Índices de landmarks do MediaPipe Face Mesh
export const MEDIAPIPE_LANDMARKS = {
  LEFT_PUPIL: 468,
  RIGHT_PUPIL: 473,
  LEFT_EAR: 127,
  RIGHT_EAR: 356,
  CHIN: 152,
  FOREHEAD: 10,
  NOSE_TIP: 1,
} as const;

// Letras Sloan (ETDRS padrão)
export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;

// Stack de optotipos
export const OPTOTYPE_CONFIG = {
  fontFamily: '"Sloan", "ETDRS", sans-serif',
  lettersPerLine: SYSTEM_PARAMS.LETTERS_PER_LINE,
  gapRatio: SYSTEM_PARAMS.GAP_RATIO,
  lineSpacing: SYSTEM_PARAMS.LINE_SPACING,
  baseDistanceMeters: 6,
  baseSizeMm: 60,
} as const;

// Configuração do WebSocket
export const WEBSOCKET_CONFIG = {
  TELEMETRY_FPS: 30,
  VIDEO_FRAME_INTERVAL: 5,
  VIDEO_QUALITY: 0.6,
  RECONNECT_DELAY_MS: 2000,
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;
