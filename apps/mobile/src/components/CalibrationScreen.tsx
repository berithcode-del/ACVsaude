import { useEffect, useRef, useState, useCallback } from 'react';
import { useMobileStore } from '../store';
import { CameraCard } from './CameraCard';
import { CalibrationOverlay } from './CalibrationOverlay';
import { useCalibration } from '../hooks/useCalibration';
import { useTracking } from '../hooks/useTracking';

export function CalibrationScreen() {
  const phase = useMobileStore((s) => s.phase);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setError = useMobileStore((s) => s.setError);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const { captureReference, captureComfortPosition } = useCalibration();
  const { startCamera, getDetector } = useTracking(null);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    startCamera(video).then(setCameraReady);
  }, [startCamera]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); v.srcObject = null; }
    };
  }, []);

  useEffect(() => {
    if (!cameraReady) return;
    let running = true;

    const interval = setInterval(() => {
      if (!running) return;
      const detector = getDetector();
      if (!detector) return;

      const faceMesh = detector.getFaceDetectionResult();
      if (phase === 'calibration_step1') {
        captureReference(faceMesh);
      }

      if (phase === 'calibration_step2') {
        captureComfortPosition(faceMesh);
      }
    }, 100);

    return () => { running = false; clearInterval(interval); };
  }, [cameraReady, phase]);

  const isStep1 = phase === 'calibration_step1';
  const title = isStep1
    ? 'Passo 1 — Braço Esticado'
    : 'Passo 2 — Posição Confortável';
  const instruction = isStep1
    ? 'Estique o braço ao máximo mantendo o rosto centralizado'
    : 'Recolha o braço para a posição confortável';

  const handleNext = () => {
    setError(null);
    if (isStep1) {
      setPhase('calibration_step2');
    } else {
      setPhase('calibration_complete');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-4">
      <CameraCard onVideoReady={handleVideoReady} />
      <div className="flex flex-1 items-center justify-center">
        <CalibrationOverlay title={title} instruction={instruction} />
      </div>
      <button
        onClick={handleNext}
        className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95"
      >
        {isStep1 ? 'Próximo Passo' : 'Iniciar Exame'}
      </button>
    </div>
  );
}
