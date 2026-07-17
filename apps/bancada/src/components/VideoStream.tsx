import { useRef, useEffect } from 'react';
import { useBancadaStore } from '../store';

export function VideoStream() {
  const latestFrame = useBancadaStore((s) => s.latestFrame);
  const peerConnected = useBancadaStore((s) => s.peerConnected);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!latestFrame || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    };
    img.src = latestFrame;
  }, [latestFrame]);

  return (
    <div className="col-span-2 row-span-2 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Stream de Vídeo</h2>
        {latestFrame && (
          <span className="text-[10px] text-neutral-400">Recebendo...</span>
        )}
      </div>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black">
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {!peerConnected && (
          <div className="z-10 text-xs text-white/40">
            Aguardando conexão mobile...
          </div>
        )}
      </div>
    </div>
  );
}
