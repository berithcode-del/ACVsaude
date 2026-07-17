import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { FaceDetector } from '../engine/FaceDetector';
import { HybridTrackingEngine } from '../engine/HybridTrackingEngine';
import type { CalibrationState } from '../engine/CalibrationEngine';
import type { SessionLogger } from '../engine/SessionLogger';

export function useTracking(calibration: CalibrationState | null, logger?: SessionLogger | null) {
  const detectorRef = useRef<FaceDetector>(new FaceDetector());
  const trackingRef = useRef<HybridTrackingEngine | null>(null);
  const frameCountRef = useRef(0);
  const setTrackingMetrics = useMobileStore((s) => s.setTrackingMetrics);
  const setError = useMobileStore((s) => s.setError);

  useEffect(() => {
    const d = detectorRef.current;
    d.on('error', (msg: { message: string }) => setError(msg.message));
    return () => { d.stop(); };
  }, []);

  useEffect(() => {
    if (calibration?.isCalibrated) {
      trackingRef.current = new HybridTrackingEngine(calibration);
    }
    return () => { trackingRef.current?.reset(); };
  }, [calibration?.faceWidth_ref_px]);

  const startCamera = useCallback(async (videoEl: HTMLVideoElement) => {
    return detectorRef.current?.initialize(videoEl) ?? false;
  }, []);

  const getTrackingResult = useCallback(() => {
    const detector = detectorRef.current;
    const tracking = trackingRef.current;
    if (!tracking) return null;
    const faceMesh = detector.getFaceDetectionResult();
    if (!faceMesh.multiFaceLandmarks?.length) return null;
    const result = tracking.processFrame(faceMesh);
    setTrackingMetrics(result.stability, null, result.isInRange);

    frameCountRef.current++;
    if (logger && frameCountRef.current % 3 === 0) {
      logger.logTelemetry({
        faceDetected: true,
        faceWidthPx: result.faceWidth_px,
        faceHeightPx: result.faceHeight_px,
        ipdEstimatedPx: result.ipd_estimated_px,
        scaleCurrent: result.scale_current,
        distanceMm: null,
        stability: result.stability,
        isInRange: result.isInRange,
      });
    }

    return result;
  }, [logger]);

  const getDetector = useCallback(() => detectorRef.current, []);

  return { startCamera, getTrackingResult, getDetector };
}
