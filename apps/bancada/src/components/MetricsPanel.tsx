import { useBancadaStore } from '../store';

export function MetricsPanel() {
  const telemetry = useBancadaStore((s) => s.telemetry);
  const last = telemetry[telemetry.length - 1];

  const metrics = last ? [
    { label: 'Detecção Facial', value: last.faceDetected ? 'Sim' : 'Não', color: last.faceDetected ? 'success' as const : 'error' as const },
    { label: 'Largura Face', value: `${last.faceWidthPx}px`, color: 'neutral' as const },
    { label: 'Altura Face', value: `${last.faceHeightPx}px`, color: 'neutral' as const },
    { label: 'IPD Estimado', value: `${last.ipdEstimatedPx.toFixed(1)}px`, color: 'neutral' as const },
    { label: 'Escala', value: last.scaleCurrent.toFixed(2), color: 'neutral' as const },
    { label: 'Estabilidade', value: `${last.stability.toFixed(0)}%`, color: last.stability > 60 ? 'success' as const : last.stability > 30 ? 'warning' as const : 'error' as const },
    { label: 'Em Alcance', value: last.isInRange ? 'Sim' : 'Não', color: last.isInRange ? 'success' as const : 'warning' as const },
  ] : [];

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Métricas em Tempo Real</h2>
      {telemetry.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
          Aguardando telemetria...
        </div>
      ) : (
        <dl className="space-y-2 text-xs">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <dt className="text-neutral-500">{m.label}</dt>
              <dd className={`font-mono font-semibold ${
                m.color === 'success' ? 'text-success-600' :
                m.color === 'warning' ? 'text-warning-600' :
                m.color === 'error' ? 'text-error-600' :
                'text-neutral-900'
              }`}>
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-auto pt-3 text-[10px] text-neutral-400">
        Frames recebidos: {telemetry.length}
      </div>
    </div>
  );
}
