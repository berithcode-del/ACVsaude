import { useRef, useCallback, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useBancadaStore } from '../store';
import type { ControlAction, ControlParameter, TelemetryFrameData, ExamEventPayload } from '@visao/shared';

const SERVER_URL = ''; // mesmo origin (proxy Vite)

export function useBancadaSocket() {
  const socketRef = useRef<Socket | null>(null);
  const store = useBancadaStore();

  const createSession = useCallback(async (): Promise<string> => {
    const res = await fetch(`/api/session`, { method: 'POST' });
    const { sessionId } = await res.json();
    store.setSessionId(sessionId);
    return sessionId;
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      store.setConnected(true);
      socket.emit('join_session', { sessionId, role: 'bancada' });
    });

    socket.on('session_joined', () => {
      store.setSessionId(sessionId);
    });

    socket.on('disconnect', () => {
      store.setConnected(false);
      store.setPeerConnected(false);
    });

    socket.on('peer_connected', () => {
      store.setPeerConnected(true, 'mobile');
    });

    socket.on('peer_disconnected', () => {
      store.setPeerConnected(false);
    });

    socket.on('telemetry', (data: { frames: TelemetryFrameData[] }) => {
      data.frames?.forEach((f: TelemetryFrameData) => store.addTelemetry(f));
    });

    socket.on('exam_event', (data: { event: ExamEventPayload }) => {
      store.addEvent(data.event);
    });

    socket.on('video_frame', (data: { imageData: string }) => {
      store.setLatestFrame(data.imageData);
    });

    socketRef.current = socket;
  }, []);

  const sendControl = useCallback((action: ControlAction, parameter?: ControlParameter) => {
    const sessionId = store.sessionId;
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit('control', {
      type: 'control',
      sessionId,
      command: { action, parameter },
    });
  }, [store.sessionId]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  return { createSession, joinSession, sendControl, disconnect };
}
