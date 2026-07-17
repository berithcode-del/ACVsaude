export class SmoothingFilter {
  static ema(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  static variance(values: number[]): number {
    if (values.length === 0) return 0;
    const m = SmoothingFilter.mean(values);
    return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  }

  static standardDeviation(values: number[]): number {
    return Math.sqrt(SmoothingFilter.variance(values));
  }

  static coefficientOfVariation(values: number[]): number {
    const m = SmoothingFilter.mean(values);
    if (m === 0) return 0;
    return SmoothingFilter.standardDeviation(values) / m;
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}