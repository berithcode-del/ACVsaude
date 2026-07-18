import { useRef, useCallback } from 'react';
import { useMobileStore } from '../store';
import { StaircaseSession } from '../engine/StaircaseSession';
import { useWebSocket } from './useWebSocket';
import type { RoundLog, ExamSummary, ExamResult } from '@visao/shared';

const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickLetters(): string[] {
  return shuffleArray([...SLOAN_LETTERS]).slice(0, 5);
}

export function useExamState() {
  const sessionRef = useRef<StaircaseSession | null>(null);
  const roundIndexRef = useRef(0);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setExamResult = useMobileStore((s) => s.setExamResult);
  const setExamMetrics = useMobileStore((s) => s.setExamMetrics);

  const { sendExamEvent } = useWebSocket();

  const startExam = useCallback(() => {
    sessionRef.current = new StaircaseSession();
    roundIndexRef.current = 0;
    const letters = pickLetters();
    sessionRef.current.setRoundLetters(letters);
  }, []);

  const getRoundLetters = useCallback((): string[] => {
    return sessionRef.current?.getCurrentLetters() ?? [];
  }, []);

  const getCurrentTargetIndex = useCallback((): number => {
    return sessionRef.current?.getCurrentTargetIndex() ?? 0;
  }, []);

  const advanceRound = useCallback(() => {
    if (!sessionRef.current) return;
    const letters = pickLetters();
    sessionRef.current.setRoundLetters(letters);
  }, []);

  const recordResponse = useCallback((
    correct: boolean,
    extra?: {
      source: 'voz' | 'manual';
      responseTimeMs: number;
      recognizedText?: string;
      confidence?: number;
      distanceMm?: number;
      scale?: number;
      stability?: number;
    }
  ): ExamSummary | null => {
    const session = sessionRef.current;
    if (!session) return null;

    const round = session.recordResponse(correct);
    roundIndexRef.current++;

    const roundLog: RoundLog = {
      roundIndex: roundIndexRef.current,
      logMAR: round.logMAR,
      angleArcmin: round.angleArcmin,
      targetLetter: round.targetLetter,
      displayLetters: round.displayLetters,
      targetIndex: round.targetIndex,
      correct: round.correct,
      responseSource: extra?.source ?? 'manual',
      responseTimeMs: extra?.responseTimeMs ?? 0,
      recognizedText: extra?.recognizedText,
      confidence: extra?.confidence,
      distanceAtPresentation: extra?.distanceMm ?? null,
      scaleAtPresentation: extra?.scale ?? null,
      stabilityAtPresentation: extra?.stability ?? null,
    };

    sendExamEvent({
      kind: 'round_answered',
      ...roundLog,
    });

    setExamMetrics(round.logMAR, round.snellen, roundIndexRef.current);

    if (round.finished) {
      const summary = session.getSummary();
      const result: ExamResult = {
        logMAR: summary.finalLogMAR,
        snellen: summary.finalSnellen,
        decimal: summary.finalDecimal,
        reversals: 0,
      };
      setExamResult(result);
      setPhase('exam_finished');

      sendExamEvent({
        kind: 'test_finished',
        ...summary,
      });

      return summary;
    }

    return null;
  }, [setExamResult, setPhase, setExamMetrics, sendExamEvent]);

  return {
    startExam,
    getRoundLetters,
    getCurrentTargetIndex,
    advanceRound,
    recordResponse,
  };
}