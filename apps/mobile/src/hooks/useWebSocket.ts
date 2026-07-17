import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { SessionLogger } from '../engine/SessionLogger';

export function useWebSocket(wsUrl?: string) {
  const loggerRef = useRef<SessionLogger | null>(null);
  const sessionId = useMobileStore((s) => s.sessionId);
  const setSessionId = useMobileStore((s) => s.setSessionId);

  useEffect(() => {
    if (!sessionId) {
      const id = crypto.randomUUID();
      setSessionId(id);
    }
  }, []);

  const connect = useCallback(() => {
    if (!sessionId) return null;
    const logger = new SessionLogger(sessionId, wsUrl);
    loggerRef.current = logger;
    logger.connectWebSocket();
    return logger;
  }, [sessionId, wsUrl]);

  const disconnect = useCallback(() => {
    loggerRef.current?.disconnect();
    loggerRef.current = null;
  }, []);

  const getLogger = useCallback(() => loggerRef.current, []);

  return { connect, disconnect, getLogger };
}
