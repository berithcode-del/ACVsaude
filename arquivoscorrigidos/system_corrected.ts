// ============================================================
// PARÂMETROS DO SISTEMA — CONSTANTES CLÍNICAS E OPERACIONAIS
// CORREÇÃO: Staircase constants ajustadas para especificação v2.0
// ============================================================

export const SYSTEM_PARAMS = {
  // --- Calibração ---
  STABILITY_THRESHOLD: 60,        // frames para estabilidade (2s a 30fps)
  HISTORY_SIZE: 10,               // janela de suavização EMA
  EMA_ALPHA: 0.3,                // fator de suavização exponencial

  // --- Tracking / Range ---
  MIN_SCALE: 0.7,                // 70% da referência (mais distante)
  MAX_SCALE: 3.0,                // 300% da referência (mais próximo)
  OUT_OF_RANGE_TOLERANCE: 90,   // ~3 segundos a 30fps (histerese)

  // --- Voz ---
  VOICE_RETRY_MAX: 3,
  VOICE_TIMEOUT_MS: 10000,

  // --- Optotipos ---
  LETTERS_PER_LINE: 5,
  GAP_RATIO: 1.0,
  LINE_SPACING: 1.5,

  // --- Staircase (CORRIGIDO para especificação v2.0) ---
  STEP_LOGMAR: 0.1,
  // MAX_REVERSALS: 3,        // ❌ ANTES (errado)
  MAX_REVERSALS: 6,             // ✅ CORRIGIDO: especificação pede 6
  // CONSECUTIVE_CORRECT: 3,  // ❌ ANTES (errado)
  CONSECUTIVE_CORRECT: 2,       // ✅ CORRIGIDO: 2-down-1-up staircase
  // CONSECUTIVE_WRONG: 2,    // ❌ ANTES (errado)
  CONSECUTIVE_WRONG: 1,          // ✅ CORRIGIDO: 1 erro sobe

  // --- Posição de conforto ---
  COMFORT_MIN_SCALE: 1.2,
  COMFORT_MAX_SCALE: 2.5,

  // --- Escala logMAR ---
  LOGMAR_START: 1.0,
  LOGMAR_END: -0.2,
} as const;

// Índices de landmarks do MediaPipe Face Mesh (478 landmarks)
// Nota: 468 e 473 são centros da íris (iris landmarks), não pupilas propriamente ditas
// Mas na prática servem como proxy para IPD na calibração
export const MEDIAPIPE_LANDMARKS = {
  LEFT_PUPIL: 468,    // left iris center (MediaPipe FaceLandmarker)
  RIGHT_PUPIL: 473,   // right iris center (MediaPipe FaceLandmarker)
  LEFT_EAR: 127,      // left ear / jaw
  RIGHT_EAR: 356,     // right ear / jaw
  CHIN: 152,          // chin bottom
  FOREHEAD: 10,       // forehead top
  NOSE_TIP: 1,        // nose tip
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

// --- Timeouts e retries para MediaPipe ---
export const MEDIAPIPE_CONFIG = {
  MODEL_LOAD_TIMEOUT_MS: 30000,     // 30s timeout para download do modelo
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  FALLBACK_DELEGATE: 'CPU' as const,  // fallback se GPU falhar
} as const;
