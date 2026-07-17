import { useMobileStore } from '../store';

export function ResultScreen() {
  const examResult = useMobileStore((s) => s.examResult);
  const reset = useMobileStore((s) => s.reset);
  const setPhase = useMobileStore((s) => s.setPhase);

  const result = examResult ?? { logMAR: 0.1, snellen: '20/25', decimal: 0.8, reversals: 3 };

  const handleNewExam = () => {
    reset();
    setPhase('welcome');
  };

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-6"
      role="main"
      aria-label="Resultado do exame"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm animate-state-transition"
        role="region"
        aria-label="Resultado de acuidade visual"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Exame Concluído!</h2>

        <div className="mx-auto my-6 w-full rounded-2xl bg-neutral-50 p-6">
          <p className="text-5xl font-extrabold text-neutral-900 animate-result-count" aria-label={`Acuidade visual: ${result.snellen}`}>
            {result.snellen}
          </p>
          <p className="mt-2 font-mono text-lg text-neutral-500">
            logMAR {result.logMAR.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Decimal: {result.decimal.toFixed(2)} | Reversões: {result.reversals}
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Desempenho
          </p>
          <div className="mt-3 flex items-end gap-2" style={{ height: 64 }} aria-label="Gráfico de desempenho por rodada">
            {[0.3, 0.5, 0.7, 0.9, 0.6, 0.8, 1.0].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md transition-all animate-optotype-appear"
                style={{
                  height: h * 56 + 'px',
                  background: i >= 4 ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)',
                  animationDelay: `${i * 0.08}s`,
                }}
                role="img"
                aria-label={`Rodada ${i + 1}: ${Math.round(h * 100)}%`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={handleNewExam}
          className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_4px_0_rgba(59,130,246,0.25)] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label="Iniciar um novo exame"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 inline-block">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Novo Exame
        </button>
        <button
          className="w-full rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label="Enviar resultado para o técnico"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 inline-block">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Enviar Resultado
        </button>
      </div>
    </div>
  );
}
