import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMobileStore } from '../store';
import type { TelemetryFrameData } from '@visao/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionId = useMobileStore((s) => s.sessionId);

  const connect = useCallback(() => {
    if (!sessionId) return;
    setStatus('connecting');

    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      reconnectAttempts.current = 0;
      setStatus('connected');

      socket.emit('join_session', {
        sessionId,
        role: 'mobile',
      });
    });

    socket.on('session_joined', () => {
      (window as any).__acv_websocket__ = {
        sendExamEvent: (event: any) => socketRef.current?.emit('exam_event', { event }),
        sendTelemetry: (frames: TelemetryFrameData[]) => socketRef.current?.emit('telemetry', { frames }),
        sendControl: (control: any) => socketRef.current?.emit('control', control),
        sendCalibrationData: (data: any) => socketRef.current?.emit('calibration_data', data),
        sendVideoFrame: (dataUrl: string) => socketRef.current?.emit('video_frame', { dataUrl }),
      };
    });

    socket.on('peer_connected', () => {
      setStatus('connected');
    });

    socket.on('peer_disconnected', () => {
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
      scheduleReconnect();
    });

    socket.on('connect_error', () => {
      setStatus('error');
    });
  }, [sessionId]);

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
    setStatus('disconnected');
    (window as any).__acv_websocket__ = undefined;
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

  const sendCalibrationData = useCallback((data: any) => {
    socketRef.current?.emit('calibration_data', data);
  }, []);

  // ✅ CORREÇÃO: Adicionar sendVideoFrame ao return
  const sendVideoFrame = useCallback((dataUrl: string) => {
    socketRef.current?.emit('video_frame', { dataUrl });
  }, []);

  return {
    connect,
    disconnect,
    sendTelemetry,
    sendExamEvent,
    sendControl,
    sendCalibrationData,
    sendVideoFrame,  // ✅ ADICIONADO
    status,
  };
}
