import { useEffect, useState, useCallback } from 'react';
import { useBancadaStore } from './store';
import { useBancadaSocket } from './hooks/useBancadaSocket';
import { SessionManager } from './components/SessionManager';
import { VideoStream } from './components/VideoStream';
import { MetricsPanel } from './components/MetricsPanel';
import { DriftChart } from './components/DriftChart';
import { RoundLogsTable } from './components/RoundLogsTable';
import { ControlsPanel } from './components/ControlsPanel';
import { EventsLog } from './components/EventsLog';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export default function App() {
  const sessionId = useBancadaStore((s) => s.sessionId);
  const connected = useBancadaStore((s) => s.connected);
  const peerConnected = useBancadaStore((s) => s.peerConnected);

  const { joinSession, disconnect } = useBancadaSocket();

  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      disconnect();
      return;
    }

    setIsJoining(true);
    joinSession(sessionId);
    setIsJoining(false);

    console.log('[bancada] Conectando à sessão:', sessionId);

    return () => {
      disconnect();
    };
  }, [sessionId, joinSession, disconnect]);

  const setSessionId = useBancadaStore((s) => s.setSessionId);

  const handleSessionSelect = useCallback((selectedSessionId: string) => {
    console.log('[bancada] Sessão selecionada:', selectedSessionId);
    setSessionId(selectedSessionId);
  }, [setSessionId]);

  const handleSessionCreated = useCallback((newSessionId: string) => {
    console.log('[bancada] Nova sessão criada:', newSessionId);
    setSessionId(newSessionId);
  }, [setSessionId]);

  return (
    <div className="min-h-full bg-neutral-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">
          SaúdeSeg+ | Exame de Acuidade Visual | Bancada
        </h1>

        <div className="flex items-center gap-2">
          {sessionId && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              peerConnected
                ? 'bg-green-100 text-green-700'
                : connected
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                peerConnected ? 'bg-green-500 animate-pulse' : connected ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              {peerConnected ? 'Mobile conectado' : connected ? 'Aguardando mobile...' : 'Desconectado'}
            </span>
          )}
          {sessionId && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
              Sessão: {sessionId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:grid-rows-4">
        <VideoStream />
        <MetricsPanel />
        <SessionManager
          serverUrl={SERVER_URL}
          onSessionSelect={handleSessionSelect}
          onSessionCreated={handleSessionCreated}
        />
        <DriftChart />
        <EventsLog />
        <ControlsPanel />
        <RoundLogsTable />
      </div>

      {isJoining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
              <span className="text-sm font-medium text-neutral-700">Conectando à sessão...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}