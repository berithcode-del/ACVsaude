import { useMobileStore } from '../store';
import { VoiceIndicator } from './VoiceIndicator';

interface DockMobileProps {
  onCorrect: () => void;
  onIncorrect: () => void;
  onStartListening: () => void;
}

export function DockMobile({ onCorrect, onIncorrect, onStartListening }: DockMobileProps) {
  const dockState = useMobileStore((s) => s.dockState);
  const voiceState = useMobileStore((s) => s.voiceState);
  const voiceEnabled = useMobileStore((s) => s.voiceEnabled);

  return (
    <div
      className="safe-area-bottom mt-auto flex flex-col gap-3 rounded-t-3xl border border-neutral-200 bg-white px-4 pb-4 pt-4 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] animate-dock-slide-up"
      role="toolbar"
      aria-label="Controles do exame"
    >
      <VoiceIndicator state={voiceState} />

      {dockState === 'waiting' && (
        <div className="flex items-center gap-3" role="group" aria-label="Controles de resposta">
          <button
            onClick={onCorrect}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2"
            aria-label="Acertei - marcar resposta como correta"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Acertei
          </button>
          <button
            onClick={onIncorrect}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-error-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2"
            aria-label="Não vi - marcar resposta como incorreta"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Não vi
          </button>
        </div>
      )}

      {dockState !== 'waiting' && (
        <button
          onClick={onStartListening}
          disabled={!voiceEnabled}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label={voiceState === 'listening' ? 'Ouvindo resposta' : 'Iniciar reconhecimento de voz'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {voiceState === 'listening' ? 'Ouvindo...' : 'Falar resposta'}
        </button>
      )}
    </div>
  );
}
