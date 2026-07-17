// ============================================================
// DESIGN TOKENS — ESPAÇAMENTO, BORDER RADIUS, SOMBRAS
// ============================================================

export const examSpacing = {
  page: { horizontal: '1rem', vertical: '0.75rem' },
  card: { padding: '1.5rem', gap: '0.75rem' },
  optotype: { padding: '2rem', gap: '0.5em' },
  dock: {
    padding: '1rem',
    gap: '0.5rem',
    safeBottom: 'env(safe-area-inset-bottom)',
  },
  camera: { margin: '0.75rem', borderRadius: '1rem', height: '200px' },
} as const;

export const examBorderRadius = {
  examCard: '1.75rem',
  cameraCard: '1rem',
  dock: '1rem',
  button: '0.75rem',
  buttonPill: '9999px',
  optotypeCard: '1rem',
  overlay: '1.5rem',
  badge: '9999px',
  calibrationGuide: '50%',
} as const;

export const examShadows = {
  examCard: {
    default: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
    hover: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
  },
  dock: {
    default: '0 -4px 6px -1px rgba(15, 23, 42, 0.05), 0 -2px 4px -2px rgba(15, 23, 42, 0.05)',
  },
  button: {
    primary: '0 2px 4px 0 rgba(59, 130, 246, 0.25)',
    success: '0 2px 4px 0 rgba(34, 197, 94, 0.25)',
    danger: '0 2px 4px 0 rgba(239, 68, 68, 0.25)',
  },
  camera: {
    default: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
  },
  focusRing: '0 0 0 3px rgba(59, 130, 246, 0.4)',
} as const;

export const examAnimations = {
  stateTransition: { duration: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  calibrationPulse: {
    duration: '1.5s',
    easing: 'ease-in-out',
    keyframes: '0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; }',
  },
  stabilityFill: { duration: '100ms', easing: 'linear' },
  optotypeAppear: {
    duration: '200ms',
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    keyframes: 'from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); }',
  },
  optotypeResize: { duration: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  voicePulse: {
    duration: '1.5s',
    easing: 'ease-in-out',
    keyframes: '0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.02); }',
  },
  voiceWaves: {
    duration: '1s',
    easing: 'ease-in-out',
    keyframes: '0%, 100% { height: 4px; } 50% { height: 16px; }',
  },
  buttonPress: { duration: '100ms', easing: 'ease-out', transform: 'scale(0.97)' },
  resultCount: { duration: '800ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  shake: {
    duration: '400ms',
    keyframes: '0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); }',
  },
  toastEnter: {
    duration: '300ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: 'from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }',
  },
  toastExit: {
    duration: '200ms',
    easing: 'ease-in',
    keyframes: 'from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); }',
  },
} as const;
