import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMobileStore } from '../store';
import { SessionLogger } from '../engine/SessionLogger';
import type { TelemetryFrameData } from '@visao/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const loggerRef = useRef<SessionLogger | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionId = useMobileStore((s) => s.sessionId);
  const setDockState = useMobileStore((s) => s.setDockState);

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (socketRef.current?.connected) return;

    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false, // Gerenciamos manualmente
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      reconnectAttempts.current = 0;
      setDockState('connected');

      // ✅ Envia deviceInfo e patientInfo para persistência no servidor
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenDiagonalInches: getScreenDiagonalInches(),
        devicePixelRatio: window.devicePixelRatio,
      };

      // ✅ Tenta obter patientInfo do store (se disponível)
      const patientInfo = getPatientInfoFromStore();

      socket.emit('join_session', {
        sessionId,
        role: 'mobile',
        deviceInfo,
        patientInfo,
      });
    });

    socket.on('session_joined', () => {
      loggerRef.current = new SessionLogger(sessionId);
    });

    socket.on('peer_connected', () => {
      setDockState('connected');
    });

    socket.on('peer_disconnected', () => {
      setDockState('disconnected');
    });

    socket.on('disconnect', () => {
      setDockState('disconnected');
      scheduleReconnect();
    });

    socket.on('error_message', (d: { message: string }) => {
      console.error('[ws] Erro:', d.message);
    });
  }, [sessionId, setDockState]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= 10) return;
    reconnectAttempts.current++;
    const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectTimer.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  const sendTelemetry = useCallback((frames: TelemetryFrameData[]) => {
    socketRef.current?.emit('telemetry', { frames });
  }, []);

  const sendExamEvent = useCallback((event: any) => {
    socketRef.current?.emit('exam_event', { event });
  }, []);

  const sendControl = useCallback((control: any) => {
    socketRef.current?.emit('control', control);
  }, []);

  const sendCalibrationData = useCallback((calibration: {
    ipdRefPx: number;
    faceWidthRefPx: number;
    faceHeightRefPx: number;
    biometricRatio: number;
    scaleComfort: number;
  }) => {
    socketRef.current?.emit('calibration_data', calibration);
  }, []);

  const sendVideoFrame = useCallback((dataUrl: string) => {
    socketRef.current?.emit('video_frame', { dataUrl });
  }, []);

  const getLogger = useCallback(() => loggerRef.current, []);

  return {
    connect,
    disconnect,
    sendTelemetry,
    sendExamEvent,
    sendControl,
    sendCalibrationData,
    sendVideoFrame,
    getLogger,
  };
}

// Helper: calcula diagonal da tela em polegadas
function getScreenDiagonalInches(): number {
  const w = window.screen.width / window.devicePixelRatio;
  const h = window.screen.height / window.devicePixelRatio;
  const dpi = 96; // padrão CSS
  const diagonalPx = Math.sqrt(w * w + h * h);
  return Math.round((diagonalPx / dpi) * 10) / 10;
}

// Helper: obtém patientInfo do store (se implementado)
function getPatientInfoFromStore() {
  // TODO: implementar coleta de dados do paciente na WelcomeScreen
  // Por enquanto retorna null — o servidor aceita opcional
  return null;
}
