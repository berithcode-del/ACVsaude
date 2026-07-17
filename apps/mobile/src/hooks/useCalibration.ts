import { useEffect, useRef, useCallback } from 'react';
import { useMobileStore } from '../store';
import { CalibrationEngine } from '../engine/CalibrationEngine';
import type { FaceMeshResult } from '@visao/shared';

export function useCalibration() {
  const engineRef = useRef<CalibrationEngine | null>(null);
  const setCalibrationProgress = useMobileStore((s) => s.setCalibrationProgress);
  const setCalibrationPhase = useMobileStore((s) => s.setCalibrationPhase);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setError = useMobileStore((s) => s.setError);

  useEffect(() => {
    const engine = new CalibrationEngine();
    engineRef.current = engine;

    engine.on('stabilizing', (d: { progress: number }) => {
      setCalibrationProgress(d.progress);
    });

    engine.on('referenceCaptured', () => {
      setCalibrationPhase('step2_comfort');
      setCalibrationProgress(0);
    });

    engine.on('comfortPositionCaptured', () => {
      setCalibrationPhase('complete');
      setCalibrationProgress(100);
      setPhase('calibration_complete');
    });

    engine.on('comfortTooClose', () => {
      setError('Aproxime mais o smartphone do rosto');
    });

    engine.on('comfortTooFar', () => {
      setError('Afaste um pouco o smartphone do rosto');
    });

    engine.on('calibrationError', (d: { message: string }) => {
      setError(d.message);
    });

    return () => {
      engine.reset();
    };
  }, []);

  const captureReference = useCallback((faceMesh: FaceMeshResult) => {
    return engineRef.current?.captureReference(faceMesh) ?? false;
  }, []);

  const captureComfortPosition = useCallback((faceMesh: FaceMeshResult) => {
    const result = engineRef.current?.captureComfortPosition(faceMesh);
    return result ?? { ok: false, scale: 0 };
  }, []);

  return { captureReference, captureComfortPosition, engine: engineRef.current };
}
