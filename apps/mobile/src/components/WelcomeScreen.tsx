import { useState } from 'react';
import { useMobileStore, type PatientInfo } from '../store';

const API_URL = import.meta.env.VITE_API_URL || '';

export function WelcomeScreen() {
  const sessionId = useMobileStore((s) => s.sessionId);
  const setPhase = useMobileStore((s) => s.setPhase);
  const setSessionId = useMobileStore((s) => s.setSessionId);
  const setPatientInfo = useMobileStore((s) => s.setPatientInfo);
  const setError = useMobileStore((s) => s.setError);

  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
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
          birthDate: birthDate ? birthDate.split('/').reverse().join('-') : undefined,
          gender: gender || undefined,
        }),
      });
      if (!patientRes.ok && patientRes.status !== 409) {
        console.warn('[WelcomeScreen] Aviso ao criar paciente:', patientRes.status);
      }

      let existingSessionId = sessionId;
      if (!existingSessionId) {
        const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
        if (!res.ok) throw new Error('Falha ao criar sessão no servidor');
        const data = await res.json();
        existingSessionId = data.sessionId;
      }

      const info: PatientInfo = {
        patientId: patientId.trim(),
        name: name.trim(),
        birthDate,
        gender,
      };

      setSessionId(existingSessionId);
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
              type="text"
              inputMode="numeric"
              value={birthDate}
              onChange={e => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                if (v.length > 4) v = v.slice(0, 4) + '/' + v.slice(4);
                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                setBirthDate(v);
              }}
              placeholder="DD/MM/AAAA"
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
    </div>
  );
}