import { useMobileStore } from '../store';

export function WelcomeScreen() {
  const setPhase = useMobileStore((s) => s.setPhase);

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center animate-state-transition"
      role="main"
      aria-label="Tela inicial do exame de acuidade visual"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500/10" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
          <path d="M2 12h3m14 0h3M12 2v3m0 14v3" />
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-neutral-900">Exame de Acuidade Visual</h1>
      <p className="max-w-sm text-sm text-neutral-600 leading-relaxed">
        Este exame avalia sua visão usando reconhecimento facial para ajustar
        automaticamente o tamanho dos optotipos à distância do smartphone.
      </p>
      <ol className="flex w-full max-w-xs flex-col gap-3 text-left text-sm text-neutral-700" aria-label="Passos do exame">
        <li className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white" aria-hidden="true">1</span>
          <span>Estique o braço ao máximo para calibrar o sistema</span>
        </li>
        <li className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white" aria-hidden="true">2</span>
          <span>Recolha o braço para posição confortável</span>
        </li>
        <li className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white" aria-hidden="true">3</span>
          <span>Leia em voz alta a letra destacada na tela</span>
        </li>
      </ol>
      <button
        onClick={() => setPhase('calibration_step1')}
        className="mt-2 w-full max-w-xs rounded-full bg-primary-500 px-8 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label="Iniciar exame de acuidade visual"
      >
        Iniciar Exame
      </button>
      <p className="text-xs text-neutral-400">Posicione o rosto centralizado no oval de guia</p>
    </div>
  );
}
