import { useRef, useCallback, useEffect } from 'react';
import type { FaceDetector } from '../engine/FaceDetector';
import type { SessionLogger } from '../engine/SessionLogger';

export function useVideoStream(detector: FaceDetector | null, logger: SessionLogger | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);

  const startStream = useCallback(() => {
    if (intervalRef.current || !detector || !logger) return;

    intervalRef.current = setInterval(() => {
      frameCountRef.current++;
      if (frameCountRef.current % 5 !== 0) return;
      detector.getImageData();
      logger.sendVideoFrame(detector.getImageData());
    }, 200);
  }, [detector, logger]);

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
