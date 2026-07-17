// ============================================================
// FUNÇÕES MATEMÁTICAS — EMA, VARIÂNCIA, SUAVIZAÇÃO
// ============================================================

export function exponentialMovingAverage(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return standardDeviation(values) / m;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getDevicePixelRatio(): number {
  if (typeof globalThis !== 'undefined' && 'devicePixelRatio' in globalThis) {
    return (globalThis as any).devicePixelRatio ?? 1;
  }
  return 1;
}

export function mmToPixels(mm: number): number {
  const ppi = getDevicePixelRatio() * 96;
  return (mm / 25.4) * ppi;
}
