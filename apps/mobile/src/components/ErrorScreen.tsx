import { useMobileStore } from '../store';

interface ErrorScreenProps {
  type?: 'camera' | 'microphone' | 'webgl' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const ERROR_CONFIG = {
  camera: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M23 7l-6 5.2V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h13" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
    title: 'Câmera não disponível',
    message: 'Permita o acesso à câmera nas configurações do dispositivo para realizar o exame.',
  },
  microphone: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    title: 'Microfone não disponível',
    message: 'Permita o acesso ao microfone nas configurações para usar o comando de voz.',
  },
  webgl: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'WebGL não suportado',
    message: 'Seu navegador não suporta WebGL. Utilize Chrome ou Safari atualizados.',
  },
  generic: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: 'Erro inesperado',
    message: 'Ocorreu um erro durante o exame. Tente novamente.',
  },
};

export function ErrorScreen({ type = 'generic', title, message, onRetry }: ErrorScreenProps) {
  const setPhase = useMobileStore((s) => s.setPhase);
  const reset = useMobileStore((s) => s.reset);
  const config = ERROR_CONFIG[type];

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-error-500/10 text-error-500 animate-error-icon"
        aria-hidden="true"
      >
        {config.icon}
      </div>
      <h1 className="text-xl font-bold text-neutral-900">{title ?? config.title}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
        {message ?? config.message}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full rounded-full bg-primary-500 px-8 py-3 text-sm font-semibold text-white transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Tentar Novamente
          </button>
        )}
        <button
          onClick={() => { reset(); setPhase('welcome'); }}
          className="w-full rounded-full border border-neutral-300 px-8 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}
