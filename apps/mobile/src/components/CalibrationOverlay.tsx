import { useMobileStore } from '../store';

interface CalibrationOverlayProps {
  title: string;
  instruction: string;
}

export function CalibrationOverlay({ title, instruction }: CalibrationOverlayProps) {
  const progress = useMobileStore((s) => s.calibrationProgress);
  const stability = useMobileStore((s) => s.stability);
  const errorMessage = useMobileStore((s) => s.errorMessage);

  const isStable = stability > 0.8;

  return (
    <div
      className="flex w-full max-w-sm flex-col items-center gap-6 text-center animate-state-transition"
      role="region"
      aria-label="Calibração facial"
    >
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <p className="text-sm text-neutral-600">{instruction}</p>

      <div
        className={`mx-auto h-44 w-36 rounded-[50%] border-2 transition-all duration-300 ${
          isStable
            ? 'border-success-500 bg-success-500/20'
            : 'border-primary-500 bg-primary-500/10'
        } ${!isStable ? 'animate-calibration-pulse' : ''}`}
        role="img"
        aria-label={isStable ? 'Rosto estabilizado' : 'Posicione o rosto no centro do oval'}
      >
        <div className="flex h-full items-center justify-center">
          <div
            className={`h-2 w-2 rounded-full ${
              isStable ? 'bg-success-500' : 'bg-primary-500/50'
            }`}
          />
        </div>
      </div>

      <div className="w-full">
        <div className="mb-1 flex justify-between text-xs text-neutral-500">
          <span>Estabilizando...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da calibração"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-100"
            style={{ width: progress + '%' }}
          />
        </div>
      </div>

      {errorMessage && (
        <p
          className="rounded-lg bg-warning-500/10 px-4 py-2 text-xs font-medium text-warning-600 animate-shake"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
