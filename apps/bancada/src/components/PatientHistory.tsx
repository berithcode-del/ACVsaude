import { useState, useCallback } from 'react';

interface PatientHistoryProps {
  serverUrl: string;
}

interface PatientSummary {
  id: string;
  name: string;
  lastExam?: string;
  totalExams: number;
  lastLogMAR?: number;
}

interface HistoryRecord {
  sessionId: string;
  date: string;
  logMAR: number;
  snellen: string;
  decimal: number;
  duration: number;
}

export function PatientHistory({ serverUrl }: PatientHistoryProps) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${serverUrl}/api/patients/search?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Falha ao buscar pacientes');
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, serverUrl]);

  const loadHistory = useCallback(async (patientId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/patients/${patientId}/history`);
      if (!res.ok) throw new Error('Falha ao carregar histórico');
      const data = await res.json();
      setHistory(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [serverUrl]);

  const handleSelectPatient = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    loadHistory(patient.id);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Histórico do Paciente</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar paciente por nome..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={!search.trim() || loading}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      {patients.length > 0 && !selectedPatient && (
        <div className="space-y-2">
          {patients.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPatient(p)}
              className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-gray-500">{p.totalExams} exame(s) · Último: {p.lastExam || 'N/A'} · Última acuidade: {p.lastLogMAR?.toFixed(2) || 'N/A'} logMAR</p>
            </button>
          ))}
        </div>
      )}

      {selectedPatient && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedPatient.name}</h3>
              <p className="text-sm text-gray-500">{selectedPatient.totalExams} exame(s) no total</p>
            </div>
            <button
              onClick={() => { setSelectedPatient(null); setHistory([]); }}
              className="text-sm text-sky-600 hover:text-sky-800"
            >
              Voltar
            </button>
          </div>

          {historyLoading ? (
            <p className="text-gray-500 text-center py-4">Carregando histórico...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum exame registrado para este paciente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Data</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">logMAR</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Snellen</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Decimal</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.sessionId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">{new Date(h.date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 px-3 font-mono">{h.logMAR.toFixed(2)}</td>
                      <td className="py-2 px-3">{h.snellen}</td>
                      <td className="py-2 px-3">{h.decimal.toFixed(2)}</td>
                      <td className="py-2 px-3">{(h.duration / 1000).toFixed(0)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (history.length === 0) return;
                const csv = 'Data,logMAR,Snellen,Decimal,Duração(s)\n' + history.map(h =>
                  `${new Date(h.date).toISOString()},${h.logMAR.toFixed(2)},${h.snellen},${h.decimal.toFixed(2)},${(h.duration / 1000).toFixed(0)}`
                ).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `historico-${selectedPatient.name}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      )}

      {patients.length === 0 && !loading && search && (
        <p className="text-center text-gray-500 py-4">Nenhum paciente encontrado para "{search}"</p>
      )}
    </div>
  );
}
