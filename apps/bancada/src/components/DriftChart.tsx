import { useRef, useEffect } from 'react';
import { useBancadaStore } from '../store';
import Chart from 'chart.js/auto';

const CHART_COLORS = {
  line: 'rgba(59, 130, 246, 0.8)',
  fill: 'rgba(59, 130, 246, 0.08)',
  warn: 'rgba(245, 158, 11, 0.15)',
  severe: 'rgba(239, 68, 68, 0.15)',
  ref: 'rgba(34, 197, 94, 0.6)',
  grid: 'rgba(148, 163, 184, 0.2)',
};

export function DriftChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const telemetry = useBancadaStore((s) => s.telemetry);
  const params = useBancadaStore((s) => s.params);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = telemetry.map((_, i) => `${(i * 0.1).toFixed(1)}s`);
    const stabilityData = telemetry.map((t) => t.stability);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Estabilidade (%)',
            data: stabilityData,
            borderColor: CHART_COLORS.line,
            backgroundColor: CHART_COLORS.fill,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 10,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            padding: 8,
            cornerRadius: 6,
            displayColors: false,
            callbacks: {
              label: (ctx) => `Estabilidade: ${(ctx.parsed.y ?? 0).toFixed(0)}%`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { color: CHART_COLORS.grid, drawTicks: false },
            ticks: {
              maxTicksLimit: 8,
              font: { size: 9 },
              color: '#94A3B8',
            },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: CHART_COLORS.grid, drawTicks: false },
            ticks: {
              font: { size: 9 },
              color: '#94A3B8',
              stepSize: 25,
            },
          },
        },
      },
      plugins: [{
        id: 'thresholdZones',
        beforeDraw(chart) {
          const ctx = chart.ctx;
          const yAxis = chart.scales.y;
          const warnY = yAxis.getPixelForValue(params.stability_threshold);
          const severeY = yAxis.getPixelForValue(params.stability_threshold * 0.5);

          ctx.save();
          ctx.fillStyle = CHART_COLORS.severe;
          ctx.fillRect(chart.chartArea.left, severeY, chart.chartArea.right - chart.chartArea.left, yAxis.bottom - severeY);

          ctx.fillStyle = CHART_COLORS.warn;
          ctx.fillRect(chart.chartArea.left, warnY, chart.chartArea.right - chart.chartArea.left, severeY - warnY);

          ctx.restore();
        },
      }],
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [telemetry, params.stability_threshold]);

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Estabilidade vs Tempo</h2>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-warning-500/60" />
            Alerta
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-error-500/60" />
            Crítico
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
