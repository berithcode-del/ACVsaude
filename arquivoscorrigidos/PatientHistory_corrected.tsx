import { useState, useCallback, useEffect } from 'react';

interface SessionSummary {
  id: string;
  patientName: string | null;
  sessionCode: string;
  status: string;
  finalLogMAR: number | null;
  finalSnellen: string | null;
  createdAt: number;
  durationMs: number | null;
  roundCount: number;
}

interface TrendPoint {
  created_at: number;
  final_logmar: number;
  final_snellen: string;
}

export function PatientHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPatients = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  }, [searchQuery]);

  const loadPatientHistory = useCallback(async (patientId: string) => {
    setLoading(true);
    setSelectedPatient(patientId);
    try {
      const res = await fetch(`/api/patients/${patientId}/history`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setTrend(data.trend || []);
    } catch {
      setSessions([]);
      setTrend([]);
    }
    setLoading(false);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="col-span-2 row-span-3 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Histórico de Pacientes</h2>

      {/* Busca */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
          placeholder="Buscar paciente (nome, telefone, email)..."
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-primary-400"
        />
        <button
          onClick={searchPatients}
          disabled={loading}
          className="rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Resultados da busca */}
      {patients.length > 0 && !selectedPatient && (
        <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => loadPatientHistory(p.id)}
              className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-left text-xs transition-all hover:bg-neutral-100"
            >
              <div className="font-semibold text-neutral-900">{p.name}</div>
              <div className="text-neutral-500">{p.phone || p.email || 'Sem contato'}</div>
            </button>
          ))}
        </div>
      )}

      {/* Trend de logMAR */}
      {trend.length > 0 && (
        <div className="mb-3 rounded-lg bg-primary-50 p-3">
          <h3 className="mb-2 text-xs font-semibold text-primary-700">Evolução da Acuidade</h3>
          <div className="flex items-end gap-1 h-20">
            {trend.map((t, i) => {
              const height = Math.max(10, Math.min(100, (1 - t.final_logmar) * 50));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary-400 transition-all"
                    style={{ height: `${height}%` }}
                    title={`${t.final_snellen} (${t.final_logmar.toFixed(2)})`}
                  />
                  <span className="text-[8px] text-neutral-500">
                    {new Date(t.created_at).toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de sessões */}
      {sessions.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-neutral-700">
                  {s.sessionCode}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  s.status === 'completed'
                    ? 'bg-success-500/10 text-success-600'
                    : s.status === 'aborted'
                    ? 'bg-warning-500/10 text-warning-600'
                    : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {s.status === 'completed' ? 'Concluído' : s.status === 'aborted' ? 'Abortado' : s.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-neutral-500">
                <span>{formatDate(s.createdAt)}</span>
                <span>{formatDuration(s.durationMs)}</span>
              </div>
              {s.finalLogMAR !== null && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold text-primary-600">
                    {s.finalSnellen}
                  </span>
                  <span className="text-neutral-400">
                    logMAR {s.finalLogMAR.toFixed(2)}
                  </span>
                  <span className="text-neutral-400">
                    {s.roundCount} rounds
                  </span>
                </div>
              )}
              <div className="mt-2 flex gap-1">
                <a
                  href={`/api/sessions/${s.id}/export/json`}
                  download
                  className="rounded px-2 py-1 text-[10px] bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-all"
                >
                  JSON
                </a>
                <a
                  href={`/api/sessions/${s.id}/export/csv`}
                  download
                  className="rounded px-2 py-1 text-[10px] bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-all"
                >
                  CSV
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : selectedPatient ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
          Nenhum exame encontrado para este paciente
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
          Busque um paciente para ver o histórico
        </div>
      )}

      {selectedPatient && (
        <button
          onClick={() => { setSelectedPatient(null); setSessions([]); setTrend([]); }}
          className="mt-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 transition-all hover:bg-neutral-50"
        >
          ← Voltar à busca
        </button>
      )}
    </div>
  );
}
