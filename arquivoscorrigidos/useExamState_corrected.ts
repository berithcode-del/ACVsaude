import { useRef, useCallback } from 'react';
import { useMobileStore } from '../store';
import { StaircaseSession } from '../engine/StaircaseSession';
import type { RoundLog, ExamSummary } from '@visao/shared';

export function useExamState() {
  const sessionRef = useRef<StaircaseSession | null>(null);
  const roundIndexRef = useRef(0);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setExamResult = useMobileStore((s) => s.setExamResult);
  const setError = useMobileStore((s) => s.setError);
  const setExamMetrics = useMobileStore((s) => s.setExamMetrics);

  const startExam = useCallback(() => {
    sessionRef.current = new StaircaseSession();
    roundIndexRef.current = 0;
  }, []);

  const getRoundLetters = useCallback(() => {
    return sessionRef.current?.getCurrentLetters() ?? [];
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

    // ✅ Envia round via WebSocket (se disponível)
    const ws = (window as any).__acv_websocket__;
    ws?.sendExamEvent?.({
      event: {
        kind: 'round_answered',
        ...roundLog,
      },
    });

    setExamMetrics(round.logMAR, round.snellen, roundIndexRef.current);

    if (round.finished) {
      const summary = session.getSummary();
      setExamResult(summary);
      setPhase('exam_finished');

      // ✅ Envia resultado final via WebSocket
      ws?.sendExamEvent?.({
        event: {
          kind: 'test_finished',
          ...summary,
        },
      });

      return summary;
    }

    return null;
  }, [setExamResult, setPhase, setExamMetrics]);

  return {
    startExam,
    getRoundLetters,
    recordResponse,
  };
}
