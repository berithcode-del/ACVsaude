import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { StaircaseSession } from '../engine/StaircaseSession';

export function useExamState() {
  const sessionRef = useRef<StaircaseSession | null>(null);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setExamMetrics = useMobileStore((s) => s.setExamMetrics);
  const setExamResult = useMobileStore((s) => s.setExamResult);
  const setDockState = useMobileStore((s) => s.setDockState);

  useEffect(() => {
    const session = new StaircaseSession();
    sessionRef.current = session;
    setExamMetrics(session.getCurrentLogMAR(), '20/200', 0);

    session.on('logMARChanged', (d: { logMAR: number; reversals: number }) => {
      const snellen = '20/' + Math.round(20 * Math.pow(10, d.logMAR));
      setExamMetrics(d.logMAR, snellen, session.getRoundIndex());
    });

    return () => {
      session.reset();
    };
  }, []);

  const getRoundLetters = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return [];
    const letters = generateRandomLetters(5);
    session.setRoundLetters(letters);
    return letters;
  }, []);

  const recordResponse = useCallback((isCorrect: boolean) => {
    const session = sessionRef.current;
    if (!session) return null;

    session.recordResponse(isCorrect);

    if (session.isComplete()) {
      const result = session.calculateResults();
      setExamResult(result);
      setPhase('exam_finished');
      setDockState('finished');
      return result;
    }

    const logMAR = session.getCurrentLogMAR();
    const snellen = '20/' + Math.round(20 * Math.pow(10, logMAR));
    setExamMetrics(logMAR, snellen, session.getRoundIndex());
    setDockState('waiting');
    return null;
  }, []);

  const getCurrentLogMAR = useCallback(() => {
    return sessionRef.current?.getCurrentLogMAR() ?? 1.0;
  }, []);

  const startExam = useCallback(() => {
    sessionRef.current?.reset();
    setPhase('exam_running');
    setDockState('waiting');
  }, []);

  return { getRoundLetters, recordResponse, getCurrentLogMAR, startExam };
}

const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
function generateRandomLetters(count: number): string[] {
  return Array.from({ length: count }, () => SLOAN[Math.floor(Math.random() * SLOAN.length)]);
}
