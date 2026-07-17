import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';

interface SessionManagerProps {
  serverUrl?: string;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreated: (sessionId: string) => void;
}

interface Session {
  id: string;
  code: string;
  patientName?: string;
  status: string;
  createdAt: string;
}

function getApiBase(serverUrl?: string): string {
  if (!serverUrl) return '/api';
  try {
    const url = new URL(serverUrl);
    if (url.origin === window.location.origin) {
      return '/api';
    }
    return `${url.origin}/api`;
  } catch {
    return serverUrl + '/api';
  }
}

function getSessionUrl(serverUrl?: string, sessionId?: string): string {
  if (!serverUrl) return `${window.location.origin}/session/${sessionId || ''}`;
  try {
    const url = new URL(serverUrl);
    return `${url.origin}/session/${sessionId || ''}`;
  } catch {
    return `${serverUrl}/session/${sessionId || ''}`;
  }
}

export function SessionManager({ serverUrl, onSessionSelect, onSessionCreated }: SessionManagerProps) {
  const apiBase = getApiBase(serverUrl);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const createSession = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${apiBase}/session`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao criar sessão');
      const data = await res.json();
      loadSessions();
      onSessionCreated(data.sessionId);
      return data.sessionId;
    } catch (err: any) {
      setError(err.message);
    }
  }, [apiBase, loadSessions, onSessionCreated]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/sessions?limit=20`);
      if (!res.ok) throw new Error('Falha ao carregar sessões');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const filtered = sessions.filter(s =>
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.patientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gerenciar Sessões</h2>
        <button
          onClick={createSession}
          className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
        >
          Nova Sessão
        </button>
      </div>

      <div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por código ou paciente..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(session => (
          <div key={session.id} className="border border-gray-200 rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center py-2">
              <QRCode value={getSessionUrl(serverUrl, session.id)} size={120} />
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-lg">{session.code || session.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm text-gray-600">{session.patientName || 'Aguardando paciente'}</p>
              <p className="text-xs text-gray-400">{session.status}</p>
            </div>
            <button
              onClick={() => onSessionSelect(session.id)}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Acompanhar
            </button>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          {search ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão ativa. Crie uma nova sessão.'}
        </p>
      )}
    </div>
  );
}
