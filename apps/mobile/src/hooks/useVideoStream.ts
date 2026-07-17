import { useRef, useCallback, useEffect } from 'react';
import type { FaceDetector } from '../engine/FaceDetector';

export function useVideoStream(detector: FaceDetector | null, sendFrame: ((dataUrl: string) => void) | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);

  const startStream = useCallback(() => {
    if (intervalRef.current || !detector || !sendFrame) return;

    intervalRef.current = setInterval(() => {
      frameCountRef.current++;
      if (frameCountRef.current % 5 !== 0) return;
      sendFrame(detector.getImageData());
    }, 200);
  }, [detector, sendFrame]);

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, []);

  return { startStream, stopStream };
}
