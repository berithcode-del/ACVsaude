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

  const { getRoundLetters, recordResponse, startExam } = useExamState();
  const { connect, getLogger } = useWebSocket();
  const logger = getLogger();

  const { startCamera, getTrackingResult, getDetector } = useTracking({
    ipd_ref_px: 60,
    faceWidth_ref_px: 300,
    faceHeight_ref_px: 350,
    biometric_ratio: 0.2,
    scale_comfort: 1.5,
    timestamp: Date.now(),
    isCalibrated: true,
  }, logger);

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
    startExam();
    generateNextRound();
    connect();

    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); v.srcObject = null; }
    };
  }, []);

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
        setPhase('exam_finished');
        return;
      }
      setTimeout(() => generateNextRound(), 500);
    });
  }, [letters, targetIndex, onResult, recordResponse, generateNextRound, setPhase]);

  const handleCorrect = useCallback(() => {
    const result = recordResponse(true);
    if (result) {
      setPhase('exam_finished');
      return;
    }
    setTimeout(() => generateNextRound(), 300);
  }, [recordResponse, generateNextRound, setPhase]);

  const handleIncorrect = useCallback(() => {
    const result = recordResponse(false);
    if (result) {
      setPhase('exam_finished');
      return;
    }
    setTimeout(() => generateNextRound(), 300);
  }, [recordResponse, generateNextRound, setPhase]);

  const handleStartListening = useCallback(() => {
    startListening();
  }, [startListening]);

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
