import { useEffect, useRef, useCallback } from 'react';
import { useMobileStore } from '../store';
import { CalibrationEngine } from '../engine/CalibrationEngine';
import type { FaceMeshResult } from '@visao/shared';

export function useCalibration() {
  const engineRef = useRef<CalibrationEngine | null>(null);
  const setCalibrationProgress = useMobileStore((s) => s.setCalibrationProgress);
  const setCalibrationPhase = useMobileStore((s) => s.setCalibrationPhase);
  const setCalibrationState = useMobileStore((s) => s.setCalibrationState);  // ✅ NOVO
  const setPhase = useMobileStore((s) => s.setPhase);
  const setError = useMobileStore((s) => s.setError);

  useEffect(() => {
    const engine = new CalibrationEngine();
    engineRef.current = engine;

    engine.on('stabilizing', (d: { progress: number }) => {
      setCalibrationProgress(d.progress);
    });

    engine.on('referenceCaptured', (state) => {
      setCalibrationPhase('step2_comfort');
      setCalibrationProgress(0);
      // ✅ Salva estado parcial no store
      setCalibrationState(state);
    });

    engine.on('comfortPositionCaptured', (d: { scale_comfort: number; faceWidth_comfort_px: number }) => {
      setCalibrationPhase('complete');
      setCalibrationProgress(100);
      // ✅ Atualiza estado completo no store
      const finalState = engine.getState();
      if (finalState) {
        setCalibrationState(finalState);
      }
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
  }, [setCalibrationProgress, setCalibrationPhase, setCalibrationState, setPhase, setError]);

  const captureReference = useCallback((faceMesh: FaceMeshResult) => {
    return engineRef.current?.captureReference(faceMesh) ?? false;
  }, []);

  const captureComfortPosition = useCallback((faceMesh: FaceMeshResult) => {
    const result = engineRef.current?.captureComfortPosition(faceMesh);
    return result ?? { ok: false, scale: 0 };
  }, []);

  return {
    captureReference,
    captureComfortPosition,
    engine: engineRef.current,
  };
}
