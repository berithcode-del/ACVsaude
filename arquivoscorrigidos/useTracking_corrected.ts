import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { FaceDetector } from '../engine/FaceDetector';
import { HybridTrackingEngine } from '../engine/HybridTrackingEngine';
import type { CalibrationState } from '../engine/CalibrationEngine';
import type { SessionLogger } from '../engine/SessionLogger';

/**
 * Hook de tracking que COMPARTILHA o FaceDetector entre telas
 * via ref singleton (não recria entre montagens/desmontagens)
 * 
 * CORREÇÃO: Não cria novo detector a cada tela. Recebe calibração
 * do store (não mock hardcoded).
 */

// ✅ Singleton: uma única instância do FaceDetector para toda a sessão
const globalDetector = new FaceDetector();

export function useTracking(
  calibration: CalibrationState | null,
  logger?: SessionLogger | null
) {
  // Usa o detector singleton global (não cria novo)
  const detectorRef = useRef<FaceDetector>(globalDetector);
  const trackingRef = useRef<HybridTrackingEngine | null>(null);
  const frameCountRef = useRef(0);

  const setTrackingMetrics = useMobileStore((s) => s.setTrackingMetrics);
  const setError = useMobileStore((s) => s.setError);

  // ✅ Escuta erros do detector (mensagens específicas agora)
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

  // ✅ Cria/recria tracking engine quando calibração muda
  useEffect(() => {
    if (calibration?.isCalibrated) {
      trackingRef.current = new HybridTrackingEngine(calibration);
    }
    return () => {
      trackingRef.current?.reset();
      trackingRef.current = null;
    };
  }, [calibration?.faceWidth_ref_px, calibration?.isCalibrated]);

  /**
   * Inicializa câmera (reutiliza detector singleton)
   * Se já estava inicializado, não reinicia
   */
  const startCamera = useCallback(async (videoEl: HTMLVideoElement) => {
    const detector = detectorRef.current;

    // Se já está pronto, só conecta o vídeo
    if (detector.getState() === 'ready') {
      return true;
    }

    // Se está em erro, reseta primeiro
    if (detector.getState() === 'error') {
      detector.stop();
    }

    return detector.initialize(videoEl);
  }, []);

  /**
   * Obtém resultado de tracking para o frame atual
   */
  const getTrackingResult = useCallback(() => {
    const detector = detectorRef.current;
    const tracking = trackingRef.current;
    if (!tracking) return null;

    const faceMesh = detector.getFaceDetectionResult();
    if (!faceMesh.multiFaceLandmarks?.length) return null;

    const result = tracking.processFrame(faceMesh);
    setTrackingMetrics(result.stability, null, result.isInRange);

    // Log de telemetria a cada 3 frames (~10fps)
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
  }, [logger, setTrackingMetrics]);

  /**
   * Retorna o detector singleton (para useVideoStream, etc.)
   */
  const getDetector = useCallback(() => detectorRef.current, []);

  /**
   * Para o detector completamente (libera câmera)
   * Chamar apenas no fim da sessão inteira, não entre telas
   */
  const stopDetector = useCallback(() => {
    detectorRef.current.stop();
  }, []);

  return {
    startCamera,
    getTrackingResult,
    getDetector,
    stopDetector,  // ✅ NOVO: para uso no fim da sessão
  };
}
