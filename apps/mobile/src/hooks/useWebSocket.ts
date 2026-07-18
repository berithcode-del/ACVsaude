import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMobileStore } from '../store';
import type { TelemetryFrameData, ControlAction, ControlParameter } from '@visao/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type ControlListener = (action: ControlAction, parameter?: ControlParameter) => void;

const socketRef = { current: null as Socket | null };
const reconnectAttempts = { current: 0 };
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let listeners: Array<(s: ConnectionStatus) => void> = [];
let controlListeners: ControlListener[] = [];
let currentStatus: ConnectionStatus = 'disconnected';

function notifyStatus(s: ConnectionStatus) {
  currentStatus = s;
  listeners.forEach(l => l(s));
}

function notifyControl(action: ControlAction, parameter?: ControlParameter) {
  controlListeners.forEach(l => l(action, parameter));
}

function scheduleReconnect() {
  if (reconnectAttempts.current >= 10) { notifyStatus('error'); return; }
  reconnectAttempts.current++;
  const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current), 30000);
  reconnectTimer = setTimeout(() => { doConnect(); }, delay);
}

function doConnect() {
  const sessionId = useMobileStore.getState().sessionId;
  const patientInfo = useMobileStore.getState().patientInfo;
  if (!sessionId) return;
  if (socketRef.current?.connected) return;

  notifyStatus('connecting');
  const socket = io('', { transports: ['websocket'], reconnection: false });
  socketRef.current = socket;

  socket.on('connect', () => {
    reconnectAttempts.current = 0;
    notifyStatus('connected');
    socket.emit('join_session', {
      sessionId,
      role: 'mobile',
      patientInfo: patientInfo ? {
        id: patientInfo.patientId,
        name: patientInfo.name,
        birthDate: patientInfo.birthDate || undefined,
        gender: patientInfo.gender || undefined,
      } : undefined,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenDiagonalInches: Math.round((Math.sqrt(
          (window.screen.width / window.devicePixelRatio) ** 2 +
          (window.screen.height / window.devicePixelRatio) ** 2
        ) / 96) * 10) / 10,
        devicePixelRatio: window.devicePixelRatio,
      },
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

  socket.on('control', (data: { command: { action: ControlAction; parameter?: ControlParameter } }) => {
    if (data?.command?.action) {
      notifyControl(data.command.action, data.command.parameter);
    }
  });

  socket.on('peer_connected', () => notifyStatus('connected'));
  socket.on('peer_disconnected', () => notifyStatus('connected'));
  socket.on('disconnect', () => { notifyStatus('disconnected'); scheduleReconnect(); });
  socket.on('connect_error', () => notifyStatus('error'));
}

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>(currentStatus);

  useEffect(() => {
    listeners.push(setStatus);
    setStatus(currentStatus);
    return () => { listeners = listeners.filter(l => l !== setStatus); };
  }, []);

  const connect = useCallback(() => { doConnect(); }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socketRef.current?.disconnect();
    socketRef.current = null;
    notifyStatus('disconnected');
    (window as any).__acv_websocket__ = undefined;
  }, []);

  useEffect(() => () => { if (listeners.length === 0) disconnect(); }, [disconnect]);

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
    sendVideoFrame,
    status,
  };
}

export function onControlEvent(listener: ControlListener): () => void {
  controlListeners.push(listener);
  return () => { controlListeners = controlListeners.filter(l => l !== listener); };
}