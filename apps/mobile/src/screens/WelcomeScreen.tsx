import { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (sessionId: string, patientInfo: PatientInfo, serverUrl: string) => void;
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
}

export interface PatientInfo {
  name: string;
  age: string;
  notes: string;
}

export function WelcomeScreen({ onStart, serverUrl, onServerUrlChange }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) { setError('Nome do paciente é obrigatório'); return; }
    setCreating(true);
    try {
      const res = await fetch(`${serverUrl}/api/session`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao criar sessão');
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setCreating(false);
    }
  };

  const handleStart = () => {
    if (!sessionId || !name.trim()) return;
    onStart(sessionId, { name: name.trim(), age, notes }, serverUrl);
  };

  const isConnected = sessionId.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sky-900">ACV Saúde</h1>
          <p className="text-gray-600 mt-2">Exame de Acuidade Visual</p>
        </div>

        {!isConnected ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="serverUrl">Servidor</label>
                <input
                  id="serverUrl"
                  type="text"
                  value={serverUrl}
                  onChange={e => onServerUrlChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="http://localhost:3002"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patientName">Nome do Paciente</label>
                <input
                  id="patientName"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Digite o nome"
                  autoComplete="name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patientAge">Idade</label>
                  <input
                    id="patientAge"
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    min="0" max="120"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patientNotes">Observações</label>
                <textarea
                  id="patientNotes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  rows={2}
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm text-center" role="alert">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Criando sessão...' : 'Criar Sessão'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">Sessão criada!</p>
              <p className="text-green-700 text-sm mt-1">Código: <span className="font-mono font-bold">{sessionId.slice(0, 8).toUpperCase()}</span></p>
              <p className="text-green-700 text-sm">Paciente: {name}</p>
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 transition-colors"
            >
              Iniciar Exame
            </button>
          </>
        )}
      </div>
    </div>
  );
}
