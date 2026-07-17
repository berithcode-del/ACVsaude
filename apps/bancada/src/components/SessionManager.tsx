import { useState, useCallback, useEffect, useRef } from 'react';
import { useBancadaStore } from '../store';
import { useBancadaSocket } from '../hooks/useBancadaSocket';
import { LogExporter } from '../engine/LogExporter';

export function SessionManager() {
  const sessionId = useBancadaStore((s) => s.sessionId);
  const connected = useBancadaStore((s) => s.connected);
  const peerConnected = useBancadaStore((s) => s.peerConnected);
  const events = useBancadaStore((s) => s.events);
  const reset = useBancadaStore((s) => s.reset);
  const { createSession, joinSession, disconnect } = useBancadaSocket();
  const [manualCode, setManualCode] = useState('');
  const exporterRef = useRef<LogExporter | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const handleCreateSession = useCallback(async () => {
    const id = await createSession();
    if (id) {
      exporterRef.current = new LogExporter(id);
    }
  }, []);

  const handleJoinManual = useCallback(() => {
    if (manualCode.trim()) {
      joinSession(manualCode.trim());
    }
  }, [manualCode, joinSession]);

  useEffect(() => {
    if (sessionId) {
      joinSession(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && !qrUrl) {
      const code = sessionId.slice(0, 8).toUpperCase();
      const url = `${window.location.origin}/join/${code}`;
      setQrUrl(url);
    }
  }, [sessionId, qrUrl]);

  useEffect(() => {
    if (!exporterRef.current) return;
    for (const evt of events) {
      if (evt.kind === 'round_answered' && evt.roundIndex !== undefined) {
        exporterRef.current.addRound({
          roundIndex: evt.roundIndex,
          logMAR: evt.logMAR ?? 0,
          angleArcmin: 0,
          targetLetter: evt.targetLetter ?? '?',
          displayLetters: evt.displayLetters ?? [],
          targetIndex: 0,
          response: {
            correct: evt.correct ?? false,
            source: evt.responseSource ?? 'voz',
            responseTimeMs: evt.responseTimeMs ?? 0,
          },
          distanceAtPresentation: 0,
          scaleAtPresentation: 0,
          stabilityAtPresentation: 0,
        });
      }
    }
  }, [events]);

  const handleExportJSON = useCallback(() => {
    if (!exporterRef.current) return;
    exporterRef.current.downloadJSON(`sessao-${sessionId?.slice(0, 8)}.json`);
  }, [sessionId]);

  const handleExportCSV = useCallback(() => {
    if (!exporterRef.current) return;
    exporterRef.current.downloadCSV(`sessao-${sessionId?.slice(0, 8)}.csv`);
  }, [sessionId]);

  const handleReset = useCallback(() => {
    exporterRef.current = null;
    setQrUrl(null);
    reset();
    disconnect();
  }, []);

  return (
    <div className="col-span-2 row-span-1 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Sessão</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          connected ? 'bg-success-500/10 text-success-600' : 'bg-error-500/10 text-error-600'
        }`}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!sessionId ? (
          <>
            <button
              onClick={handleCreateSession}
              className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
            >
              Criar Sessão
            </button>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABCD-EFGH"
                className="w-32 rounded-lg border border-neutral-200 px-2 py-2 text-xs outline-none focus:border-primary-400"
              />
              <button
                onClick={handleJoinManual}
                disabled={!manualCode.trim()}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition-all hover:bg-neutral-50 disabled:opacity-40"
              >
                Entrar
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-neutral-500">
                  {sessionId.slice(0, 8)}...
                </span>
                {peerConnected && (
                  <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-600">
                    Mobile conectado
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => navigator.clipboard.writeText(sessionId)}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-50"
                >
                  Copiar
                </button>
                <button
                  onClick={disconnect}
                  className="rounded-md border border-error-200 px-2 py-1 text-[10px] text-error-500 hover:bg-error-50"
                >
                  Desconectar
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-50"
                >
                  Resetar
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center justify-center rounded-lg bg-neutral-50 p-2">
                <div>
                  <p className="text-center text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                    Código
                  </p>
                  <p className="mt-0.5 text-center font-mono text-lg font-bold tracking-widest text-neutral-900 select-all">
                    {sessionId.slice(0, 4).toUpperCase()}-{sessionId.slice(4, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleExportJSON}
                  disabled={events.length === 0}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={events.length === 0}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
