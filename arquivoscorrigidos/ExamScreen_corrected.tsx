import { useEffect, useRef, useState, useCallback } from 'react';
import { useMobileStore } from '../store';
import { ExamCard } from './ExamCard';
import { CameraCard } from './CameraCard';
import { OptotypeCanvas } from './OptotypeCanvas';
import { DockMobile } from './DockMobile';
import { useTracking } from '../hooks/useTracking';
import { useExamState } from '../hooks/useExamState';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVideoStream } from '../hooks/useVideoStream';
import type { TrackingResult } from '@visao/shared';

export function ExamScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [letters, setLetters] = useState<string[]>(['V', 'S', 'D', 'H', 'K']);
  const [targetIndex, setTargetIndex] = useState(0);
  const [tracking, setTracking] = useState<TrackingResult | null>(null);

  const setPhase = useMobileStore((s) => s.setPhase);
  // ✅ PEGA CALIBRAÇÃO REAL DO STORE (não mock!)
  const calibrationState = useMobileStore((s) => s.calibrationState);

  const { getRoundLetters, recordResponse, startExam } = useExamState();
  const { connect, getLogger } = useWebSocket();
  const logger = getLogger();

  // ✅ Passa calibração REAL do store
  const { startCamera, getTrackingResult, getDetector, stopDetector } = useTracking(
    calibrationState,
    logger
  );

  const { startStream } = useVideoStream(getDetector(), logger);
  const { startListening, onResult } = useVoiceRecognition();

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    startCamera(video).then(setCameraReady);
  }, [startCamera]);

  const generateNextRound = useCallback(() => {
    const l = getRoundLetters();
    if (l.length > 0) {
      setLetters(l);
      setTargetIndex(Math.floor(Math.random() * l.length));
    }
  }, [getRoundLetters]);

  useEffect(() => {
    // ✅ Verifica se tem calibração antes de iniciar
    if (!calibrationState?.isCalibrated) {
      setPhase('calibration_step1');
      return;
    }

    startExam();
    generateNextRound();
    connect();

    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); v.srcObject = null; }
    };
  }, [calibrationState, startExam, generateNextRound, connect, setPhase]);

  useEffect(() => {
    if (!cameraReady) return;
    const interval = setInterval(() => {
      const result = getTrackingResult();
      if (result) setTracking(result);
    }, 100);
    return () => clearInterval(interval);
  }, [cameraReady, getTrackingResult]);

  useEffect(() => {
    if (cameraReady) {
      startStream();
    }
  }, [cameraReady, startStream]);

  useEffect(() => {
    onResult((letter: string) => {
      const target = letters[targetIndex] || '';
      const correct = letter === target;
      const result = recordResponse(correct);
      if (result) {
        // ✅ Para detector no fim da sessão (libera câmera)
        stopDetector();
        setPhase('exam_finished');
        return;
      }
      setTimeout(() => generateNextRound(), 500);
    });
  }, [letters, targetIndex, onResult, recordResponse, generateNextRound, setPhase, stopDetector]);

  const handleCorrect = useCallback(() => {
    const result = recordResponse(true);
    if (result) {
      stopDetector();
      setPhase('exam_finished');
      return;
    }
    setTimeout(() => generateNextRound(), 300);
  }, [recordResponse, generateNextRound, setPhase, stopDetector]);

  const handleIncorrect = useCallback(() => {
    const result = recordResponse(false);
    if (result) {
      stopDetector();
      setPhase('exam_finished');
      return;
    }
    setTimeout(() => generateNextRound(), 300);
  }, [recordResponse, generateNextRound, setPhase, stopDetector]);

  const handleStartListening = useCallback(() => {
    startListening();
  }, [startListening]);

  // ✅ Se não tem calibração, mostra mensagem de erro
  if (!calibrationState?.isCalibrated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-error-500">Calibração necessária</h1>
        <p className="text-sm text-neutral-600">
          A calibração não foi encontrada. Por favor, retorne e complete a calibração.
        </p>
        <button
          onClick={() => setPhase('calibration_step1')}
          className="rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white"
        >
          Voltar à Calibração
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 px-3 py-3">
      <ExamCard>
        <OptotypeCanvas letters={letters} targetIndex={targetIndex} tracking={tracking} />
      </ExamCard>
      <CameraCard onVideoReady={handleVideoReady} />
      <DockMobile
        onCorrect={handleCorrect}
        onIncorrect={handleIncorrect}
        onStartListening={handleStartListening}
      />
    </div>
  );
}
