import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { FaceDetector } from '../engine/FaceDetector';
import { HybridTrackingEngine } from '../engine/HybridTrackingEngine';
import { useWebSocket } from './useWebSocket';  // ✅ NOVO: importar WebSocket
import type { CalibrationState } from '../engine/CalibrationEngine';
import type { SessionLogger } from '../engine/SessionLogger';

const globalDetector = new FaceDetector();

export function useTracking(
  calibration: CalibrationState | null,
  logger?: SessionLogger | null
) {
  const detectorRef = useRef<FaceDetector>(globalDetector);
  const trackingRef = useRef<HybridTrackingEngine | null>(null);
  const frameCountRef = useRef(0);

  const setTrackingMetrics = useMobileStore((s) => s.setTrackingMetrics);
  const setError = useMobileStore((s) => s.setError);

  // ✅ NOVO: Obter função do WebSocket para enviar telemetria
  const { sendTelemetry } = useWebSocket();

  useEffect(() => {
    const d = detectorRef.current;

    const handleError = (detail: { type: string; message: string; userAction?: string }) => {
      const fullMessage = detail.userAction
        ? `${detail.message}. ${detail.userAction}`
        : detail.message;
      setError(fullMessage, detail.type as any);
    };

    d.on('error', handleError);
    return () => { d.off('error', handleError); };
  }, [setError]);

  useEffect(() => {
    if (calibration?.isCalibrated) {
      trackingRef.current = new HybridTrackingEngine(calibration);
    }
    return () => {
      trackingRef.current?.reset();
      trackingRef.current = null;
    };
  }, [calibration?.faceWidth_ref_px, calibration?.isCalibrated]);

  const startCamera = useCallback(async (videoEl: HTMLVideoElement) => {
    const detector = detectorRef.current;
    if (detector.getState() === 'ready') return true;
    if (detector.getState() === 'error') detector.stop();
    return detector.initialize(videoEl);
  }, []);

  const getTrackingResult = useCallback(() => {
    const detector = detectorRef.current;
    const tracking = trackingRef.current;
    if (!tracking) return null;

    const faceMesh = detector.getFaceDetectionResult();
    if (!faceMesh.multiFaceLandmarks?.length) return null;

    const result = tracking.processFrame(faceMesh);
    setTrackingMetrics(result.stability, result.distance_mm, result.isInRange);

    frameCountRef.current++;
    // ✅ CORREÇÃO: Enviar telemetria via WebSocket (batch de 3 frames)
    if (frameCountRef.current % 3 === 0) {
      // Enviar para servidor
      sendTelemetry([{
        faceDetected: true,
        faceWidthPx: result.faceWidth_px,
        faceHeightPx: result.faceHeight_px,
        ipdEstimatedPx: result.ipd_estimated_px,
        scaleCurrent: result.scale_current,
        distanceMm: result.distance_mm,  // ✅ CORREÇÃO: usa distance_mm real!
        stability: result.stability,
        isInRange: result.isInRange,
      }]);

      // Também loggar localmente se logger disponível
      if (logger) {
        logger.logTelemetry({
          faceDetected: true,
          faceWidthPx: result.faceWidth_px,
          faceHeightPx: result.faceHeight_px,
          ipdEstimatedPx: result.ipd_estimated_px,
          scaleCurrent: result.scale_current,
          distanceMm: result.distance_mm,  // ✅ CORREÇÃO: usa distance_mm real!
          stability: result.stability,
          isInRange: result.isInRange,
        });
      }
    }

    return result;
  }, [logger, setTrackingMetrics, sendTelemetry]);

  const getDetector = useCallback(() => detectorRef.current, []);

  const stopDetector = useCallback(() => {
    detectorRef.current.stop();
  }, []);

  return { startCamera, getTrackingResult, getDetector, stopDetector };
}
