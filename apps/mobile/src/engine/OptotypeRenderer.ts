import type { TrackingResult, OptotypeConfig, RenderedLine } from '@visao/shared';
import { OPTOTYPE_CONFIG, SLOAN_LETTERS, logMARToSnellen, logMARToMultiplier, LOGMAR_START, LOGMAR_END, LOGMAR_STEP } from '@visao/shared';
import { mmToPixels } from '@visao/shared';

export class OptotypeRenderer {
  private config: OptotypeConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentScale = 1.0;
  private lastLetters: string[] = [];

  constructor(canvas: HTMLCanvasElement, config?: Partial<OptotypeConfig>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...OPTOTYPE_CONFIG, ...config };
  }

  updateScale(scale: number): void {
    const alpha = 0.2;
    this.currentScale = alpha * scale + (1 - alpha) * this.currentScale;
  }

  renderLine(logMAR: number, targetIndex: number, tracking: TrackingResult): RenderedLine {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // target stored in render order

    const baseSize_px = mmToPixels(this.config.baseSizeMm);
    const multiplier = logMARToMultiplier(logMAR);
    const fontSize_px = baseSize_px * multiplier * this.currentScale;
    const letters = this.generateRandomLetters(this.config.lettersPerLine);
    this.lastLetters = letters;
    const gap_px = fontSize_px * this.config.gapRatio;
    const centerX = this.canvas.width / 2;
    const totalWidth = letters.length * fontSize_px + (letters.length - 1) * gap_px;
    let startX = centerX - totalWidth / 2;

    this.ctx.font = '700 ' + fontSize_px + 'px ' + this.config.fontFamily;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const alpha = 0.3 + tracking.stability * 0.7;

    for (let i = 0; i < letters.length; i++) {
      const x = startX + i * (fontSize_px + gap_px) + fontSize_px / 2;
      const y = this.canvas.height / 2;
      if (i === targetIndex) {
        this.ctx.fillStyle = 'rgba(59, 130, 246, ' + alpha + ')';
      } else {
        this.ctx.fillStyle = 'rgba(15, 23, 42, ' + alpha + ')';
      }
      this.ctx.fillText(letters[i], x, y);
    }

    this.renderBottomLine(tracking);
    return { logMAR, snellen: logMARToSnellen(logMAR), letters, fontSize_px, gap_px, y_position: this.canvas.height / 2 };
  }

  renderFullExam(_currentLogMAR: number, tracking: TrackingResult): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const baseSize_px = mmToPixels(this.config.baseSizeMm);
    let y_position = 50;

    for (let logMAR = LOGMAR_START; logMAR >= LOGMAR_END; logMAR -= LOGMAR_STEP) {
      const multiplier = logMARToMultiplier(logMAR);
      const fontSize_px = baseSize_px * multiplier * this.currentScale;
      const letters = this.generateRandomLetters(this.config.lettersPerLine);
      const gap_px = fontSize_px * this.config.gapRatio;
      const centerX = this.canvas.width / 2;
      const totalWidth = letters.length * fontSize_px + (letters.length - 1) * gap_px;
      let startX = centerX - totalWidth / 2;

      this.ctx.font = '700 ' + fontSize_px + 'px ' + this.config.fontFamily;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const alpha = 0.3 + tracking.stability * 0.7;
      this.ctx.fillStyle = 'rgba(15, 23, 42, ' + alpha + ')';

      for (const letter of letters) {
        const x = startX + fontSize_px / 2;
        this.ctx.fillText(letter, x, y_position);
        startX += fontSize_px + gap_px;
      }

      this.ctx.font = Math.round(fontSize_px * 0.25) + 'px Inter, sans-serif';
      this.ctx.fillStyle = 'rgba(100, 100, 100, ' + (alpha * 0.7) + ')';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(logMARToSnellen(logMAR), startX + 10, y_position);
      y_position += fontSize_px * this.config.lineSpacing;
    }
    this.renderStatusOverlay(tracking);
  }

  private renderBottomLine(tracking: TrackingResult): void {
    const y = this.canvas.height - 30;
    this.ctx.fillStyle = '#E2E8F0';
    this.ctx.fillRect(20, y, this.canvas.width - 40, 2);
    const barWidth = 60;
    const barHeight = 4;
    const barX = 20;
    const barY = y - 14;
    this.ctx.fillStyle = '#E2E8F0';
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth, barHeight, 2);
    this.ctx.fill();
    const barColor = tracking.isInRange ? '#22C55E' : '#EF4444';
    this.ctx.fillStyle = barColor;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth * tracking.stability, barHeight, 2);
    this.ctx.fill();
    this.ctx.font = '10px Inter, sans-serif';
    this.ctx.fillStyle = barColor;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(tracking.isInRange ? 'Posicionado' : 'Reposicione', barX + barWidth + 8, barY + 4);
  }

  private renderStatusOverlay(tracking: TrackingResult): void {
    const barWidth = 150;
    const barHeight = 6;
    const barX = this.canvas.width - barWidth - 10;
    const barY = 10;
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    this.ctx.fill();
    const color = tracking.isInRange ? '#22C55E' : '#EF4444';
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth * tracking.stability, barHeight, 3);
    this.ctx.fill();
    this.ctx.font = '10px Inter, sans-serif';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(tracking.isInRange ? '\u2713 Posicionado' : '\u26A0 Reposicione', barX - 5, barY + barHeight + 10);
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
    this.ctx.fillText('Escala: ' + tracking.scale_current.toFixed(2) + 'x', this.canvas.width - 10, barY + barHeight + 24);
  }

  private generateRandomLetters(count: number): string[] {
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * SLOAN_LETTERS.length);
      letters.push(SLOAN_LETTERS[idx]);
    }
    return letters;
  }

  getLastLetters(): string[] { return [...this.lastLetters]; }

  setCanvasSize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  getScale(): number { return this.currentScale; }
}
