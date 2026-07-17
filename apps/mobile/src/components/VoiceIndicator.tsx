import type { VoiceState } from '@visao/shared';

interface VoiceIndicatorProps {
  state: VoiceState;
}

export function VoiceIndicator({ state }: VoiceIndicatorProps) {
  if (state === 'idle') return null;

  const labels: Record<VoiceState, string> = {
    idle: '',
    listening: 'Ouvindo...',
    processing: 'Processando...',
    error: 'Erro',
  };

  return (
    <div
      className="mx-auto flex items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={state === 'listening' ? 'Aguardando resposta de voz' : labels[state]}
    >
      <span
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white ${
          state === 'error' ? 'bg-error-500' : 'bg-primary-500 animate-voice-pulse'
        }`}
      >
        <span className="flex items-end gap-0.5" aria-hidden="true">
          {state === 'listening' && [0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block w-0.5 rounded-full bg-white animate-voice-waves"
              style={{
                height: '3px',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </span>
        {labels[state]}
      </span>
    </div>
  );
}
