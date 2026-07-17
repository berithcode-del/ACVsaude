// ============================================================
// VALIDADORES — LETRAS, ESCALA, RESPOSTAS
// ============================================================

import { SLOAN_LETTERS } from '../constants/system';

export function isSloanLetter(letter: string): boolean {
  return SLOAN_LETTERS.includes(letter.toUpperCase() as never);
}

export function isScaleInRange(scale: number, min: number, max: number): boolean {
  return scale >= min && scale <= max;
}

export function isCalibratedComfortable(
  scaleComfort: number,
  min = 1.2,
  max = 2.5
): { ok: boolean; reason?: 'too_close' | 'too_far' } {
  if (scaleComfort < min) return { ok: false, reason: 'too_close' };
  if (scaleComfort > max) return { ok: false, reason: 'too_far' };
  return { ok: true };
}

export function normalizeTranscript(text: string): string {
  return text
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeLetter(char: string): string {
  const t = normalizeTranscript(char);
  return t.length > 0 ? t[0] : '';
}

export function validateLetterResponse(
  recognized: string,
  target: string
): boolean {
  const r = normalizeLetter(recognized);
  const t = normalizeLetter(target);
  return r === t;
}
