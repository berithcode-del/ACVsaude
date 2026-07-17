import { useEffect, useRef } from 'react';
import { useBancadaStore } from '../store';

export function EventsLog() {
  const events = useBancadaStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestFrame = useBancadaStore((s) => s.latestFrame);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const statusIcon = (kind: string) => {
    if (kind.includes('error') || kind === 'face_lost') return '●';
    if (kind.includes('complete') || kind === 'correct' || kind === 'face_found') return '●';
    if (kind === 'distance_drift_warning') return '●';
    return '●';
  };

  const statusColor = (kind: string) => {
    if (kind.includes('error') || kind === 'face_lost') return 'text-error-500';
    if (kind.includes('complete') || kind === 'correct' || kind === 'face_found') return 'text-success-500';
    if (kind === 'distance_drift_warning') return 'text-warning-500';
    return 'text-primary-500';
  };

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Eventos</h2>
        {latestFrame && (
          <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-600">
            Vídeo Ativo
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto text-[11px] max-h-48"
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-400">
            Nenhum evento recebido
          </div>
        ) : (
          events.map((evt, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                evt.kind.includes('error') || evt.kind === 'face_lost'
                  ? 'bg-error-500/5'
                  : evt.kind === 'distance_drift_warning'
                  ? 'bg-warning-500/5'
                  : evt.kind === 'round_answered'
                  ? evt.correct ? 'bg-success-500/5' : 'bg-error-500/5'
                  : 'bg-neutral-50'
              }`}
            >
              <span className={`text-[8px] ${statusColor(evt.kind)}`}>{statusIcon(evt.kind)}</span>
              <span className="flex-1 text-neutral-700">
                {formatEventLabel(evt)}
              </span>
              {evt.correct !== undefined && (
                <span className={`font-mono text-[10px] ${evt.correct ? 'text-success-600' : 'text-error-600'}`}>
                  {evt.correct ? '✓' : '✗'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatEventLabel(evt: any): string {
  const labels: Record<string, string> = {
    round_presented: `Rodada ${evt.roundIndex ?? '?'} apresentada`,
    round_answered: `Rodada ${evt.roundIndex ?? '?'} respondida`,
    distance_locked: 'Distância travada',
    distance_drift_warning: 'Alerta de drift',
    distance_recalibration: 'Recalibração',
    face_lost: 'Rosto perdido',
    face_found: 'Rosto encontrado',
    calibration_complete: 'Calibração completa',
    voice_recognized: 'Voz reconhecida',
    voice_error: 'Erro de voz',
    test_finished: `Teste finalizado (logMAR ${evt.logMAR?.toFixed(1) ?? '?'})`,
  };
  return labels[evt.kind] ?? evt.kind;
}
