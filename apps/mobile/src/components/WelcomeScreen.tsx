import { useState } from 'react';
import { useMobileStore, type PatientInfo } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function WelcomeScreen() {
  const setPhase = useMobileStore((s) => s.setPhase);
  const setSessionId = useMobileStore((s) => s.setSessionId);
  const setPatientInfo = useMobileStore((s) => s.setPatientInfo);
  const setError = useMobileStore((s) => s.setError);

  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [eye, setEye] = useState<'OD' | 'OE'>('OD');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setErrorLocal] = useState('');

  const handleStart = async () => {
    setErrorLocal('');
    if (!name.trim()) { setErrorLocal('Nome do paciente é obrigatório'); return; }
    if (!patientId.trim()) { setErrorLocal('ID do paciente (prontuário) é obrigatório'); return; }

    setCreating(true);
    try {
      const patientRes = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patientId.trim(),
          name: name.trim(),
          birthDate: birthDate || undefined,
          gender: gender || undefined,
        }),
      });
      if (!patientRes.ok && patientRes.status !== 409) {
        console.warn('[WelcomeScreen] Aviso ao criar paciente:', patientRes.status);
      }

      const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao criar sessão no servidor');
      const data = await res.json();

      const info: PatientInfo = {
        patientId: patientId.trim(),
        name: name.trim(),
        birthDate,
        gender,
        eye,
        notes,
      };

      setSessionId(data.sessionId);
      setPatientInfo(info);
      setPhase('calibration_step1');
    } catch (err: any) {
      setErrorLocal(err.message || 'Erro ao conectar ao servidor');
      setError(err.message || 'Erro ao conectar ao servidor', 'generic');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center animate-state-transition overflow-y-auto" role="main" aria-label="Tela inicial do exame de acuidade visual">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
          <path d="M2 12h3m14 0h3M12 2v3m0 14v3" />
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-neutral-900">Exame de Acuidade Visual</h1>

      <div className="w-full max-w-xs space-y-3 text-left">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1" htmlFor="patientId">ID do Paciente (Prontuário) *</label>
          <input
            id="patientId"
            type="text"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Ex: P-12345"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1" htmlFor="patientName">Nome do Paciente *</label>
          <input
            id="patientName"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Nome completo"
            autoComplete="name"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1" htmlFor="birthDate">Nascimento</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1" htmlFor="gender">Gênero</label>
            <select
              id="gender"
              value={gender}
              onChange={e => setGender(e.target.value as 'M' | 'F' | 'O')}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="M">Masc.</option>
              <option value="F">Fem.</option>
              <option value="O">Outro</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">Olho a examinar</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEye('OD')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                eye === 'OD' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-700 border-neutral-300'
              }`}
            >
              Direito (OD)
            </button>
            <button
              type="button"
              onClick={() => setEye('OE')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                eye === 'OE' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-700 border-neutral-300'
              }`}
            >
              Esquerdo (OE)
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1" htmlFor="patientNotes">Observações</label>
          <textarea
            id="patientNotes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={2}
            placeholder="Observações clínicas..."
          />
        </div>
      </div>

      {error && <p className="text-error-500 text-sm text-center" role="alert">{error}</p>}

      <button
        onClick={handleStart}
        disabled={creating || !name.trim() || !patientId.trim()}
        className="w-full max-w-xs rounded-full bg-primary-500 px-8 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Iniciar exame de acuidade visual"
      >
        {creating ? 'Criando sessão...' : 'Iniciar Exame'}
      </button>
      <p className="text-xs text-neutral-400">Servidor: {API_URL}</p>
    </div>
  );
}