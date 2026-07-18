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

const PHONETIC_MAP: Record<string, string> = {
  CEE: 'C', CE: 'C', CÊ: 'C',
  DEE: 'D', DE: 'D', DÊ: 'D',
  AGÁ: 'H', AGA: 'H', GA: 'H',
  CÁ: 'K', KA: 'K', CAPA: 'K',
  ENE: 'N',
  Ó: 'O', O: 'O',
  ERRÊ: 'R', ERRE: 'R', RE: 'R',
  ESSÊ: 'S', ESSE: 'S',
  VÊ: 'V', VE: 'V',
  ZÊ: 'Z', ZE: 'Z',
};

export function normalizeLetter(char: string): string {
  const t = normalizeTranscript(char);
  if (t.length === 0) return '';
  if (t.length === 1 && isSloanLetter(t)) return t;
  const mapped = PHONETIC_MAP[t];
  if (mapped) return mapped;
  return isSloanLetter(t[0]) ? t[0] : '';
}

export function validateLetterResponse(
  recognized: string,
  target: string
): boolean {
  const r = normalizeLetter(recognized);
  const t = normalizeLetter(target);
  return r === t;
}
