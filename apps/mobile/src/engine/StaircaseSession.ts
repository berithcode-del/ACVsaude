import type { ExamResult } from '@visao/shared';
import { SYSTEM_PARAMS, logMARToSnellen, logMARToDecimal, logMARToArcmin } from '@visao/shared';

export interface RoundRecord {
  logMAR: number;
  angleArcmin: number;
  targetLetter: string;
  displayLetters: string[];
  targetIndex: number;
  correct: boolean;
  finished: boolean;
  snellen: string;
}

type SessionListener = (detail: any) => void;

export class StaircaseSession {
  private currentLogMAR: number = SYSTEM_PARAMS.LOGMAR_START;
  private consecutiveCorrect = 0;
  private consecutiveWrong = 0;
  private reversals = 0;
  private lastDirection: 'up' | 'down' | null = null;
  private currentTargetIndex = 0;
  private currentLetters: string[] = [];
  private roundIndex = 0;
  private readonly STEP: number = SYSTEM_PARAMS.STEP_LOGMAR;
  private readonly MAX_REVERSALS: number = SYSTEM_PARAMS.MAX_REVERSALS;
  private readonly CONSECUTIVE_CORRECT: number = SYSTEM_PARAMS.CONSECUTIVE_CORRECT;
  private readonly CONSECUTIVE_WRONG: number = SYSTEM_PARAMS.CONSECUTIVE_WRONG;
  private readonly MIN_LOGMAR: number = SYSTEM_PARAMS.LOGMAR_END;
  private readonly MAX_LOGMAR: number = SYSTEM_PARAMS.LOGMAR_START;
  private listeners = new Map<string, Set<SessionListener>>();

  constructor() {
    this.reset();
  }

  getCurrentLogMAR(): number {
    return this.currentLogMAR;
  }

  getCurrentTargetIndex(): number {
    return this.currentTargetIndex;
  }

  getCurrentLetters(): string[] {
    return [...this.currentLetters];
  }

  getRoundIndex(): number {
    return this.roundIndex;
  }

  setRoundLetters(letters: string[]): void {
    this.currentLetters = letters;
    this.currentTargetIndex = Math.floor(Math.random() * letters.length);
  }

  recordResponse(isCorrect: boolean): RoundRecord {
    if (isCorrect) {
      this.consecutiveCorrect++;
      this.consecutiveWrong = 0;

      if (this.consecutiveCorrect >= this.CONSECUTIVE_CORRECT) {
        this.moveDown();
        this.consecutiveCorrect = 0;
      }
    } else {
      this.consecutiveWrong++;
      this.consecutiveCorrect = 0;

      if (this.consecutiveWrong >= this.CONSECUTIVE_WRONG) {
        this.moveUp();
        this.consecutiveWrong = 0;
      }
    }

    this.roundIndex++;

    return {
      logMAR: this.currentLogMAR,
      angleArcmin: logMARToArcmin(this.currentLogMAR),
      targetLetter: this.currentLetters[this.currentTargetIndex] || '',
      displayLetters: [...this.currentLetters],
      targetIndex: this.currentTargetIndex,
      correct: isCorrect,
      finished: this.isComplete(),
      snellen: logMARToSnellen(this.currentLogMAR),
    };
  }

  private moveDown(): void {
    const newLogMAR = Math.max(this.MIN_LOGMAR, this.currentLogMAR - this.STEP);

    if (this.lastDirection === 'up') {
      this.reversals++;
    }
    this.lastDirection = 'down';
    this.currentLogMAR = newLogMAR;

    this.emit('logMARChanged', { logMAR: this.currentLogMAR, direction: 'down', reversals: this.reversals });
  }

  private moveUp(): void {
    const newLogMAR = Math.min(this.MAX_LOGMAR, this.currentLogMAR + this.STEP);

    if (this.lastDirection === 'down') {
      this.reversals++;
    }
    this.lastDirection = 'up';
    this.currentLogMAR = newLogMAR;

    this.emit('logMARChanged', { logMAR: this.currentLogMAR, direction: 'up', reversals: this.reversals });
  }

  isComplete(): boolean {
    return this.reversals >= this.MAX_REVERSALS;
  }

  getReversals(): number {
    return this.reversals;
  }

  calculateResults(): ExamResult {
    return {
      logMAR: this.currentLogMAR,
      snellen: logMARToSnellen(this.currentLogMAR),
      decimal: logMARToDecimal(this.currentLogMAR),
      reversals: this.reversals,
    };
  }

  on(event: string, listener: SessionListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: SessionListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, detail?: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }

  getSummary(): ExamResult {
    return {
      logMAR: this.currentLogMAR,
      snellen: logMARToSnellen(this.currentLogMAR),
      decimal: logMARToDecimal(this.currentLogMAR),
      reversals: this.reversals,
    };
  }

  reset(): void {
    this.currentLogMAR = SYSTEM_PARAMS.LOGMAR_START;
    this.consecutiveCorrect = 0;
    this.consecutiveWrong = 0;
    this.reversals = 0;
    this.lastDirection = null;
    this.currentTargetIndex = 0;
    this.currentLetters = [];
    this.roundIndex = 0;
  }
}