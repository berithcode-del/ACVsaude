import { useState } from 'react';
import { useMobileStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function WelcomeScreen() {
  const setPhase = useMobileStore((s) => s.setPhase);
  const setSessionId = useMobileStore((s) => s.setSessionId);
  const setError = useMobileStore((s) => s.setError);
  const { connect } = useWebSocket();

  const [mode, setMode] = useState<'new' | 'join' | null>(null);
  const [joinCode, setJoinCode] = useState('');

  // ✅ NOVO: Dados do paciente
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [eye, setEye] = useState<'OD' | 'OE'>('OD');
  const [showPatientForm, setShowPatientForm] = useState(false);

  const handleCreateSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.sessionId);
      connect();

      // ✅ Se tem dados do paciente, salva no servidor
      if (patientName.trim() && patientId.trim()) {
        await fetch(`${API_URL}/api/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: patientId.trim(),
            name: patientName.trim(),
            birthDate: birthDate || undefined,
            gender: gender || undefined,
          }),
        });
      }

      setPhase('calibration_step1');
    } catch {
      setError('Falha ao criar sessão. Verifique sua conexão.', 'generic');
    }
  };

  const handleJoinSession = () => {
    if (!joinCode.trim()) return;
    setSessionId(joinCode.trim());
    connect();
    setPhase('calibration_step1');
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">ACV Saúde</h1>
        <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
          Exame de acuidade visual com inteligência artificial
        </p>
      </div>

      {!mode && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => setMode('new')}
            className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95"
          >
            Nova Sessão
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95"
          >
            Entrar em Sessão
          </button>
        </div>
      )}

      {mode === 'new' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {/* ✅ Toggle para dados do paciente */}
          <button
            onClick={() => setShowPatientForm(!showPatientForm)}
            className="text-xs text-primary-500 underline hover:text-primary-600"
          >
            {showPatientForm ? 'Ocultar dados do paciente' : 'Adicionar dados do paciente (opcional)'}
          </button>

          {showPatientForm && (
            <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="ID do paciente (prontuário) *"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-primary-400"
                required
              />
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Nome completo *"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-primary-400"
                required
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-primary-400"
                />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-primary-400"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEye('OD')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    eye === 'OD' ? 'bg-primary-500 text-white' : 'border border-neutral-200 text-neutral-600'
                  }`}
                >
                  Olho Direito (OD)
                </button>
                <button
                  onClick={() => setEye('OE')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    eye === 'OE' ? 'bg-primary-500 text-white' : 'border border-neutral-200 text-neutral-600'
                  }`}
                >
                  Olho Esquerdo (OE)
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateSession}
            disabled={showPatientForm && (!patientName.trim() || !patientId.trim())}
            className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95 disabled:opacity-50"
          >
            Criar e Iniciar
          </button>
          <button
            onClick={() => setMode(null)}
            className="w-full rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95"
          >
            Voltar
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Código da sessão"
            className="rounded-full border border-neutral-200 px-4 py-3 text-center text-sm font-semibold tracking-widest uppercase outline-none transition-all focus:border-primary-400"
            onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
          />
          <button
            onClick={handleJoinSession}
            className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95"
          >
            Entrar
          </button>
          <button
            onClick={() => setMode(null)}
            className="w-full rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
