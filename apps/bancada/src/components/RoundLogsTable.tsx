import { useMemo, useEffect, useRef } from 'react';
import { useBancadaStore } from '../store';
import type { ExamEventPayload } from '@visao/shared';

interface RoundRow {
  roundIndex: number;
  logMAR: number;
  targetLetter: string;
  displayLetters: string[];
  correct: boolean | undefined;
  responseSource: string | undefined;
  responseTimeMs: number | undefined;
}

function extractRounds(events: ExamEventPayload[]): RoundRow[] {
  const rounds: RoundRow[] = [];
  const answered = events.filter((e) => e.kind === 'round_answered');
  for (const e of answered) {
    rounds.push({
      roundIndex: e.roundIndex ?? rounds.length,
      logMAR: e.logMAR ?? 0,
      targetLetter: e.targetLetter ?? '?',
      displayLetters: e.displayLetters ?? [],
      correct: e.correct,
      responseSource: e.responseSource,
      responseTimeMs: e.responseTimeMs,
    });
  }
  return rounds;
}

export function RoundLogsTable() {
  const events = useBancadaStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => extractRounds(events), [events]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rows.length]);

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Logs por Rodada</h2>
        <span className="text-[10px] text-neutral-400">{rows.length} rodadas</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-60">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            Nenhuma rodada registrada
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-neutral-200 bg-white text-neutral-500">
              <tr>
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Letras</th>
                <th className="py-2 pr-2 font-medium">Alvo</th>
                <th className="py-2 pr-2 font-medium">Res</th>
                <th className="py-2 pr-2 font-medium">Fonte</th>
                <th className="py-2 pr-2 font-medium">Tempo</th>
                <th className="py-2 font-medium">logMAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <tr
                  key={row.roundIndex}
                  className={`transition-colors ${
                    row.correct === true ? 'bg-success-500/5 hover:bg-success-500/10' :
                    row.correct === false ? 'bg-error-500/5 hover:bg-error-500/10' :
                    'hover:bg-neutral-50'
                  }`}
                >
                  <td className="py-1.5 pr-2 font-mono text-neutral-500">{row.roundIndex}</td>
                  <td className="py-1.5 pr-2 font-mono tracking-wider text-neutral-900">
                    {row.displayLetters.join('·')}
                  </td>
                  <td className="py-1.5 pr-2 font-bold text-neutral-900">{row.targetLetter}</td>
                  <td className={`py-1.5 pr-2 font-bold ${
                    row.correct === true ? 'text-success-600' :
                    row.correct === false ? 'text-error-600' :
                    'text-neutral-400'
                  }`}>
                    {row.correct === true ? '✓' : row.correct === false ? '✗' : '—'}
                  </td>
                  <td className="py-1.5 pr-2 text-neutral-500">
                    {row.responseSource === 'voz' ? '🎤' : row.responseSource === 'manual' ? '👆' : '—'}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-neutral-500">
                    {row.responseTimeMs ? `${row.responseTimeMs}ms` : '—'}
                  </td>
                  <td className="py-1.5 font-mono text-neutral-500">{row.logMAR.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
