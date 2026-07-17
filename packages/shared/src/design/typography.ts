// ============================================================
// DESIGN TOKENS — TIPOGRAFIA
// ============================================================

export const examTypography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    optotype: '"Sloan", "ETDRS", sans-serif',
  },
  optotype: {
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '0.05em',
  },
  ui: {
    title: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 },
    subtitle: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 },
    body: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.4 },
    button: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1 },
    data: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, fontFamily: 'mono' },
  },
  status: {
    label: { fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
    value: { fontSize: '0.875rem', fontWeight: 600 },
  },
} as const;
