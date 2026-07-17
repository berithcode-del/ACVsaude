import { useState, useCallback, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useBancadaStore } from '../store';
import { PatientHistory } from './PatientHistory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function SessionManager() {
  const { sessionId, setSessionId, reset } = useBancadaStore();
  const [joinCode, setJoinCode] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const createSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch {
      alert('Erro ao criar sessão. Verifique se o servidor está online.');
    }
  }, [setSessionId]);

  const joinSession = useCallback(() => {
    if (!joinCode.trim()) return;
    setSessionId(joinCode.trim());
  }, [joinCode, setSessionId]);

  const handleReset = useCallback(() => {
    reset();
    setJoinCode('');
  }, [reset]);

  const sessionUrl = sessionId
    ? `${window.location.origin}/mobile?session=${sessionId}`
    : '';

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Gerenciador de Sessão</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              showHistory
                ? 'bg-primary-500 text-white'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {showHistory ? '← Sessão' : 'Histórico'}
          </button>
        </div>
      </div>

      {showHistory ? (
        <PatientHistory />
      ) : !sessionId ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={createSession}
            className="w-full rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
          >
            Criar Nova Sessão
          </button>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200" />
            ou
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código da sessão"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              onKeyDown={(e) => e.key === 'Enter' && joinSession()}
            />
            <button
              onClick={joinSession}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-95"
            >
              Entrar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
            <span className="font-mono text-xs font-semibold text-primary-700">
              {sessionId}
            </span>
            <span className="text-[10px] text-primary-500">Sessão ativa</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <QRCode value={sessionUrl} size={128} />
            </div>
            <p className="text-center text-[10px] text-neutral-500">
              Escaneie com o smartphone
            </p>
            <a
              href={sessionUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary-500 underline hover:text-primary-600"
            >
              Abrir no mobile
            </a>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
            >
              Resetar
            </button>
            <a
              href={`${API_URL}/api/sessions/${sessionId}/export/json`}
              download
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
            >
              Exportar JSON
            </a>
            <a
              href={`${API_URL}/api/sessions/${sessionId}/export/csv`}
              download
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
            >
              Exportar CSV
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
