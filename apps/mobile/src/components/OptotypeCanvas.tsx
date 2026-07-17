import { useEffect, useRef } from 'react';
import { useMobileStore } from '../store';
import type { TrackingResult } from '@visao/shared';

interface OptotypeCanvasProps {
  letters: string[];
  targetIndex: number;
  tracking: TrackingResult | null;
}

export function OptotypeCanvas({ letters, targetIndex, tracking }: OptotypeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentLogMAR = useMobileStore((s) => s.currentLogMAR);
  const currentSnellen = useMobileStore((s) => s.currentSnellen);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    animationFrameRef.current = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const baseSize = 32;
      const scaleMult = tracking ? 0.3 + tracking.stability * 0.7 : 1;
      const fontSize = baseSize * (1 + (1 - currentLogMAR) * 0.5) * scaleMult;
      const gap = fontSize * 0.5;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const totalWidth = letters.length * fontSize + (letters.length - 1) * gap;
      let startX = centerX - totalWidth / 2;

      ctx.font = '700 ' + fontSize + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < letters.length; i++) {
        const x = startX + i * (fontSize + gap) + fontSize / 2;
        ctx.fillStyle = i === targetIndex ? '#3B82F6' : '#0F172A';
        ctx.globalAlpha = scaleMult;
        ctx.fillText(letters[i], x, centerY);
        ctx.globalAlpha = 1;

        const dotY = centerY + fontSize * 0.5 + 12;
        ctx.beginPath();
        ctx.arc(x, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = i === targetIndex ? '#3B82F6' : '#E2E8F0';
        ctx.fill();
      }

      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(20, centerY + fontSize * 0.5 + 24, rect.width - 40, 1);

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'right';
      ctx.fillText(currentSnellen, rect.width - 20, centerY);

      if (tracking && !tracking.isInRange) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.font = '13px Inter, sans-serif';
        ctx.fillStyle = '#DC2626';
        ctx.textAlign = 'center';
        ctx.fillText('Reposicione o smartphone', centerX, rect.height - 16);
      }
    });

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [letters, targetIndex, tracking, currentLogMAR, currentSnellen]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full animate-optotype-appear"
      style={{ minHeight: '140px' }}
      role="img"
      aria-label={`Letras do exame: ${letters.join(', ')}, letra alvo na posição ${targetIndex + 1}, acuidade atual ${currentSnellen}`}
    />
  );
}
