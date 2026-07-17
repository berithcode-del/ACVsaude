import { useBancadaStore } from '../store';
import { useBancadaSocket } from '../hooks/useBancadaSocket';
import type { ControlAction } from '@visao/shared';

export function ControlsPanel() {
  const peerConnected = useBancadaStore((s) => s.peerConnected);
  const params = useBancadaStore((s) => s.params);
  const updateParam = useBancadaStore((s) => s.updateParam);
  const { sendControl } = useBancadaSocket();

  const sendAction = (action: ControlAction) => {
    sendControl(action);
  };

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Controle</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => sendAction('start_test')}
          disabled={!peerConnected}
          className="rounded-lg bg-success-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-success-600 disabled:opacity-40 active:scale-95"
        >
          Iniciar Teste
        </button>
        <button
          onClick={() => sendAction('pause_test')}
          disabled={!peerConnected}
          className="rounded-lg bg-warning-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-warning-600 disabled:opacity-40 active:scale-95"
        >
          Pausar
        </button>
        <button
          onClick={() => sendAction('abort_test')}
          disabled={!peerConnected}
          className="rounded-lg bg-error-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-error-600 disabled:opacity-40 active:scale-95"
        >
          Abortar
        </button>
        <button
          onClick={() => sendAction('request_calibration')}
          disabled={!peerConnected}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-40 active:scale-95"
        >
          Recalibrar
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {Object.entries(params).map(([name, val]) => (
          <div key={name} className="flex items-center justify-between">
            <label className="text-neutral-500">{formatParamName(name)}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={name === 'correction_factor' ? 200 : 100}
                value={val * (name === 'correction_factor' ? 100 : 1)}
                onChange={(e) => updateParam(name, name === 'correction_factor' ? Number(e.target.value) / 100 : Number(e.target.value))}
                className="w-20 accent-primary-500"
              />
              <span className="w-14 text-right font-mono text-neutral-900">{val}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatParamName(name: string): string {
  const map: Record<string, string> = {
    drift_warn_mm: 'Tolerância drift',
    drift_severe_mm: 'Drift severo',
    stability_threshold: 'Threshold estab.',
    base_distance_m: 'Distância base',
    correction_factor: 'Fator correção',
  };
  return map[name] ?? name;
}
