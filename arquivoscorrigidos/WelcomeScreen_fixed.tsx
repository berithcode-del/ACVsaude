import { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (sessionId: string, patientInfo: PatientInfo, serverUrl: string) => void;
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
}

// ✅ CORREÇÃO: Interface completa com patientId e birthDate
export interface PatientInfo {
  patientId: string;       // ✅ NOVO: ID único do paciente (prontuário)
  name: string;
  birthDate: string;       // ✅ CORREÇÃO: data de nascimento em vez de age
  gender: 'M' | 'F' | 'O'; // ✅ NOVO: gênero
  eye: 'OD' | 'OE';        // ✅ NOVO: olho sendo examinado
  notes: string;
}

export function WelcomeScreen({ onStart, serverUrl, onServerUrlChange }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');       // ✅ NOVO
  const [birthDate, setBirthDate] = useState('');       // ✅ CORREÇÃO
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');  // ✅ NOVO
  const [eye, setEye] = useState<'OD' | 'OE'>('OD');     // ✅ NOVO
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');

  // ✅ CORREÇÃO: Criar paciente no servidor ANTES de criar sessão
  const handleCreate = async () => {
    setError('');
    if (!name.trim()) { setError('Nome do paciente é obrigatório'); return; }
    if (!patientId.trim()) { setError('ID do paciente (prontuário) é obrigatório'); return; }  // ✅ NOVO

    setCreating(true);
    try {
      // ✅ CORREÇÃO: Criar/atualizar paciente no servidor primeiro
      const patientRes = await fetch(`${serverUrl}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patientId.trim(),
          name: name.trim(),
          birthDate: birthDate || undefined,
          gender: gender || undefined,
        }),
      });
      // Ignora erro 409 (paciente já existe) ou outros — continua
      if (!patientRes.ok && patientRes.status !== 409) {
        console.warn('[WelcomeScreen] Aviso ao criar paciente:', patientRes.status);
      }

      // Criar sessão
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
    if (!sessionId || !name.trim() || !patientId.trim()) return;
    onStart(sessionId, {
      patientId: patientId.trim(),
      name: name.trim(),
      birthDate,
      gender,
      eye,
      notes,
    }, serverUrl);
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

              {/* ✅ NOVO: ID do paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patientId">ID do Paciente (Prontuário) *</label>
                <input
                  id="patientId"
                  type="text"
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Ex: P-12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patientName">Nome do Paciente *</label>
                <input
                  id="patientName"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Digite o nome completo"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* ✅ CORREÇÃO: Data de nascimento em vez de idade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="birthDate">Data de Nascimento</label>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                {/* ✅ NOVO: Gênero */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="gender">Gênero</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={e => setGender(e.target.value as 'M' | 'F' | 'O')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>

              {/* ✅ NOVO: Seleção de olho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Olho a ser examinado</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEye('OD')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      eye === 'OD'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Olho Direito (OD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEye('OE')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      eye === 'OE'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Olho Esquerdo (OE)
                  </button>
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
                  placeholder="Observações clínicas..."
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm text-center" role="alert">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !patientId.trim()}
              className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Criando sessão...' : 'Criar Sessão'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">Sessão criada!</p>
              <p className="text-green-600 text-sm mt-1">Código: <span className="font-mono font-bold">{sessionId.slice(0, 8).toUpperCase()}</span></p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Paciente:</strong> {name}</p>
              <p><strong>ID:</strong> {patientId}</p>
              <p><strong>Olho:</strong> {eye === 'OD' ? 'Direito (OD)' : 'Esquerdo (OE)'}</p>
              {birthDate && <p><strong>Nascimento:</strong> {new Date(birthDate).toLocaleDateString('pt-BR')}</p>}
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Iniciar Exame
            </button>

            <button
              onClick={() => { setSessionId(''); setError(''); }}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              Criar nova sessão
            </button>
          </>
        )}
      </div>
    </div>
  );
}
