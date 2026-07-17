// ============================================================
// TABELA logMAR PADRÃO
// ============================================================

import type { LogMARRow } from '../types/optotype';

export const LOGMAR_STEPS: LogMARRow[] = [
  { line: 1, snellen: '20/200', logMAR: 1.0, multiplier: 10.0, angleArcmin: 50.0 },
  { line: 2, snellen: '20/160', logMAR: 0.9, multiplier: 7.94, angleArcmin: 39.81 },
  { line: 3, snellen: '20/125', logMAR: 0.8, multiplier: 6.31, angleArcmin: 31.62 },
  { line: 4, snellen: '20/100', logMAR: 0.7, multiplier: 5.01, angleArcmin: 25.12 },
  { line: 5, snellen: '20/80', logMAR: 0.6, multiplier: 3.98, angleArcmin: 19.95 },
  { line: 6, snellen: '20/63', logMAR: 0.5, multiplier: 3.16, angleArcmin: 15.85 },
  { line: 7, snellen: '20/50', logMAR: 0.4, multiplier: 2.51, angleArcmin: 12.59 },
  { line: 8, snellen: '20/40', logMAR: 0.3, multiplier: 1.99, angleArcmin: 10.0 },
  { line: 9, snellen: '20/32', logMAR: 0.2, multiplier: 1.58, angleArcmin: 7.94 },
  { line: 10, snellen: '20/25', logMAR: 0.1, multiplier: 1.26, angleArcmin: 6.31 },
  { line: 11, snellen: '20/20', logMAR: 0.0, multiplier: 1.0, angleArcmin: 5.0 },
  { line: 12, snellen: '20/16', logMAR: -0.1, multiplier: 0.79, angleArcmin: 3.98 },
  { line: 13, snellen: '20/12.5', logMAR: -0.2, multiplier: 0.63, angleArcmin: 3.16 },
];

export const LOGMAR_START = 1.0;
export const LOGMAR_END = -0.2;
export const LOGMAR_STEP = 0.1;

export function logMARToSnellen(logMAR: number): string {
  return `20/${Math.round(20 * Math.pow(10, logMAR))}`;
}

export function logMARToMultiplier(logMAR: number): number {
  return Math.pow(10, -logMAR);
}

export function logMARToDecimal(logMAR: number): number {
  return Math.pow(10, -logMAR);
}

export function logMARToArcmin(logMAR: number): number {
  return 5 * Math.pow(10, logMAR);
}
