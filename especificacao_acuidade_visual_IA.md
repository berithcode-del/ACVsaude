# 📘 ESPECIFICAÇÃO TÉCNICA — EXAME DE ACUIDADE VISUAL ASSISTIDO POR IA

## Documento de Especificação de Algoritmo, Estrutura e Construção

**Versão:** 2.0  
**Data:** 17 de Julho de 2026  
**Status:** Especificação Técnica para Implementação  

---

## 📑 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura do Algoritmo de Posicionamento](#2-arquitetura-do-algoritmo-de-posicionamento)
3. [Calibração de 3 Pontos](#3-calibração-de-3-pontos)
4. [Tracking Contínuo Híbrido](#4-tracking-contínuo-híbrido)
5. [Renderização de Optotipos](#5-renderização-de-optotipos)
6. [Reconhecimento de Voz](#6-reconhecimento-de-voz)
7. [Estrutura de Código](#7-estrutura-de-código)
8. [Stack Tecnológico](#8-stack-tecnológico)
9. [Fluxo Completo do Exame](#9-fluxo-completo-do-exame)
10. [Diagramas e Pseudocódigo](#10-diagramas-e-pseudocódigo)

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Objetivo
Desenvolver um exame de acuidade visual digital, assistido por inteligência artificial, que permita medição precisa da distância usuário-smartphone através de biométrica facial, eliminando a necessidade de braço totalmente esticado e proporcionando conforto ao paciente.

### 1.2 Problemas Resolvidos
| Problema | Solução Proposta |
|----------|------------------|
| Braço super esticado | Calibração de 3 pontos com referência biométrica |
| Letras em modo vertical | Layout horizontal padrão logMAR |
| Microfone com fallback constante | Retry com permissão explícita + fallback inteligente |
| Tracking instável por pupila | Tracking híbrido: pupila (calibração) → face (tempo real) |
| Perda de foco a cada movimento | Filtro de suavização + histerese no threshold |

---

## 2. ARQUITETURA DO ALGORITMO DE POSICIONAMENTO

### 2.1 Conceito Central: Calibração de 3 Pontos

O algoritmo utiliza uma **referência biométrica individual** capturada no momento de máxima extensão do braço, e depois permite que o usuário recolha o braço para posição confortável, ajustando automaticamente o tamanho dos optotipos proporcionalmente.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DO ALGORITMO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│   │  MÓDULO 1   │────▶│  MÓDULO 2   │────▶│     MÓDULO 3        │  │
│   │ CALIBRAÇÃO  │     │   TRACKING  │     │  RENDERIZAÇÃO      │  │
│   │  (3 Pontos) │     │  (Híbrido)  │     │   (Optotipos)      │  │
│   └─────────────┘     └─────────────┘     └─────────────────────┘  │
│          │                   │                    │                │
│          ▼                   ▼                    ▼                │
│   • Captura IPD         • Mede face           • Ajusta tamanho     │
│   • Captura FaceWidth   • Calcula escala      • Renderiza linhas  │
│   • Congela referência  • Reconstrói IPD      • logMAR horizontal  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Princípio Matemático

O ângulo visual do optotipo deve permanecer **constante** independente da distância:

```
Ângulo Visual = arctan(Altura_Optotipo / Distância)

Para manter o ângulo constante:
Altura_ref / Distância_ref = Altura_atual / Distância_atual

Como Distância ∝ 1/FaceWidth (inversamente proporcional ao tamanho do rosto em pixels):

Altura_atual = Altura_ref × (FaceWidth_atual / FaceWidth_ref)
             = Altura_ref × Escala
```

---

## 3. CALIBRAÇÃO DE 3 PONTOS

### 3.1 Descrição do Processo

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 1: POSICIONAMENTO INICIAL (Braço Esticado ao Máximo)        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • Usuário estende o braço ao máximo                                │
│  • Sistema exibe overlay de guia facial (oval + cruz no centro)     │
│  • Quando o rosto está centrado e estável (>2s):                   │
│                                                                     │
│    ┌─────────────────────────────────────────┐                       │
│    │  CAPTURA DOS 3 PONTOS DE REFERÊNCIA   │                       │
│    ├─────────────────────────────────────────┤                       │
│    │  P1: IPD_px (interpupilar em pixels)    │                       │
│    │  P2: FaceWidth_px (largura rosto)       │                       │
│    │  P3: FaceHeight_px (altura rosto)       │                       │
│    └─────────────────────────────────────────┘                       │
│                                                                     │
│  • Valores são congelados em CalibrationState                       │
│  • Razão biométrica é calculada: R = IPD_px / FaceWidth_px          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 2: INSTRUÇÃO DE RECOLHIMENTO                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • Sistema informa: "Agora recolha o braço para posição confortável"│
│  • Aguarda estabilização (>1.5s)                                    │
│  • Captura FaceWidth_conforto_px                                    │
│                                                                     │
│  • Calcula Fator de Escala de Conforto:                             │
│    EscalaConforto = FaceWidth_conforto_px / FaceWidth_ref_px        │
│                                                                     │
│  • Se EscalaConforto < 1.2: alerta "Aproxime mais o smartphone"    │
│  • Se EscalaConforto > 2.5: alerta "Afaste um pouco o smartphone"   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 3: CONFIRMAÇÃO E INÍCIO DO EXAME                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • Estado de calibração é salvo:                                    │
│                                                                     │
│    CalibrationState = {                                             │
│      ipd_ref_px: number,           // IPD na distância máxima     │
│      faceWidth_ref_px: number,      // Largura rosto referência     │
│      faceHeight_ref_px: number,     // Altura rosto referência      │
│      biometric_ratio: number,     // R = IPD/FaceWidth (fixo)     │
│      scale_comfort: number,         // Escala de conforto           │
│      timestamp: Date,                                              │
│      isCalibrated: true                                             │
│    }                                                                │
│                                                                     │
│  • Exame inicia com tracking contínuo                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Pseudocódigo — Módulo de Calibração

```typescript
// ============================================
// MÓDULO: CalibrationEngine
// ============================================

interface CalibrationState {
  ipd_ref_px: number;           // Distância interpupilar de referência (px)
  faceWidth_ref_px: number;     // Largura do rosto de referência (px)
  faceHeight_ref_px: number;    // Altura do rosto de referência (px)
  biometric_ratio: number;      // Razão IPD/FaceWidth (constante individual)
  scale_comfort: number;        // Fator de escala de conforto
  timestamp: number;
  isCalibrated: boolean;
}

class CalibrationEngine {
  private state: CalibrationState | null = null;
  private stabilityFrames: number = 0;
  private readonly STABILITY_THRESHOLD = 60; // ~2 segundos a 30fps

  /**
   * PASSO 1: Captura inicial com braço esticado
   * Chamado quando o usuário posiciona o rosto no overlay
   */
  async captureReference(faceMesh: FaceMeshResult): Promise<boolean> {
    // Verifica estabilidade do rosto
    if (!this.isFaceStable(faceMesh)) {
      this.stabilityFrames = 0;
      return false;
    }

    this.stabilityFrames++;

    if (this.stabilityFrames < this.STABILITY_THRESHOLD) {
      // Ainda aguardando estabilidade
      const progress = (this.stabilityFrames / this.STABILITY_THRESHOLD) * 100;
      this.emit('stabilizing', { progress });
      return false;
    }

    // Rosto estável — captura os 3 pontos
    const landmarks = faceMesh.multiFaceLandmarks[0];

    // P1: Distância interpupilar (landmarks 468 e 473 — centros das pupilas)
    const leftPupil = landmarks[468];
    const rightPupil = landmarks[473];
    const ipd_px = this.euclideanDistance(leftPupil, rightPupil);

    // P2: Largura do rosto (orelha a orelha — landmarks 127 e 356)
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_px = this.euclideanDistance(leftEar, rightEar);

    // P3: Altura do rosto (queixo a testa — landmarks 152 e 10)
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const faceHeight_px = this.euclideanDistance(chin, forehead);

    // Calcula razão biométrica (constante para esta pessoa)
    const biometric_ratio = ipd_px / faceWidth_px;

    // Salva estado de referência
    this.state = {
      ipd_ref_px: ipd_px,
      faceWidth_ref_px: faceWidth_px,
      faceHeight_ref_px: faceHeight_px,
      biometric_ratio: biometric_ratio,
      scale_comfort: 1.0, // Será atualizado no passo 2
      timestamp: Date.now(),
      isCalibrated: true
    };

    this.emit('referenceCaptured', this.state);
    return true;
  }

  /**
   * PASSO 2: Captura posição confortável
   * Chamado após o usuário recolher o braço
   */
  captureComfortPosition(faceMesh: FaceMeshResult): boolean {
    if (!this.state || !this.state.isCalibrated) {
      throw new Error('Calibração de referência não realizada');
    }

    const landmarks = faceMesh.multiFaceLandmarks[0];

    // Mede largura do rosto na posição confortável
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_comfort_px = this.euclideanDistance(leftEar, rightEar);

    // Calcula fator de escala de conforto
    const scale_comfort = faceWidth_comfort_px / this.state.faceWidth_ref_px;

    // Validação: escala deve estar em range aceitável
    if (scale_comfort < 1.2) {
      this.emit('comfortTooClose', { scale: scale_comfort });
      return false;
    }

    if (scale_comfort > 2.5) {
      this.emit('comfortTooFar', { scale: scale_comfort });
      return false;
    }

    // Atualiza estado
    this.state.scale_comfort = scale_comfort;

    this.emit('comfortPositionCaptured', {
      scale_comfort,
      faceWidth_comfort_px
    });

    return true;
  }

  /**
   * Verifica se o rosto está estável (sem movimento brusco)
   */
  private isFaceStable(faceMesh: FaceMeshResult): boolean {
    // Implementação: compara posição atual com frames anteriores
    // usando filtro de Kalman ou média móvel
    // Retorna true se variação < threshold por N frames consecutivos
    return true; // Simplificado
  }

  private euclideanDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );
  }

  getState(): CalibrationState | null {
    return this.state;
  }

  isCalibrated(): boolean {
    return this.state?.isCalibrated ?? false;
  }
}
```

---

## 4. TRACKING CONTÍNUO HÍBRIDO

### 4.1 Conceito

Após a calibração, o sistema **não mede mais as pupilas** (sinal pequeno e instável). Em vez disso:

1. Mede o **bounding box do rosto** a cada frame (sinal grande e estável)
2. Usa a **razão biométrica calibrada** para reconstruir o IPD estimado
3. Calcula o **fator de escala** em tempo real
4. Ajusta o tamanho do optotipo proporcionalmente

### 4.2 Pseudocódigo — Módulo de Tracking

```typescript
// ============================================
// MÓDULO: HybridTrackingEngine
// ============================================

interface TrackingResult {
  faceWidth_px: number;         // Largura atual do rosto
  faceHeight_px: number;        // Altura atual do rosto
  ipd_estimated_px: number;     // IPD reconstruído via razão biométrica
  scale_current: number;         // Fator de escala atual vs referência
  distance_ratio: number;       // Razão distância atual / distância ref
  isInRange: boolean;           // Se está dentro do range aceitável
  stability: number;            // Score de estabilidade (0-1)
}

class HybridTrackingEngine {
  private calibration: CalibrationState;
  private faceWidthHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;        // Janela de suavização
  private readonly STABILITY_THRESHOLD = 0.15; // 15% de variação aceitável
  private outOfRangeFrames: number = 0;
  private readonly OUT_OF_RANGE_TOLERANCE = 90; // ~3 segundos a 30fps

  constructor(calibration: CalibrationState) {
    this.calibration = calibration;
  }

  /**
   * Processa cada frame de vídeo
   * Retorna dados de tracking + fator de escala para renderização
   */
  processFrame(faceMesh: FaceMeshResult): TrackingResult {
    const landmarks = faceMesh.multiFaceLandmarks[0];

    // ── MEDIDA 1: Largura do rosto (sinal grande, estável) ──
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_raw = this.euclideanDistance(leftEar, rightEar);

    // ── SUAVIZAÇÃO: Filtro de média móvel exponencial ──
    this.faceWidthHistory.push(faceWidth_raw);
    if (this.faceWidthHistory.length > this.HISTORY_SIZE) {
      this.faceWidthHistory.shift();
    }

    const faceWidth_smoothed = this.exponentialMovingAverage(
      this.faceWidthHistory, 
      0.3  // alpha = fator de suavização
    );

    // ── MEDIDA 2: Reconstrução do IPD via razão biométrica ──
    // IPD não é medido diretamente — é reconstruído!
    const ipd_estimated = faceWidth_smoothed * this.calibration.biometric_ratio;

    // ── CÁLCULO DO FATOR DE ESCALA ──
    // scale = 1.0  → mesma distância da referência
    // scale > 1.0  → rosto maior → usuário mais próximo
    // scale < 1.0  → rosto menor → usuário mais distante
    const scale_current = faceWidth_smoothed / this.calibration.faceWidth_ref_px;

    // ── RAZÃO DE DISTÂNCIA ──
    // Distância é inversamente proporcional ao tamanho do rosto
    const distance_ratio = 1 / scale_current;

    // ── VALIDAÇÃO DE RANGE COM HISTERÊSE ──
    const isInRange = this.checkRangeWithHysteresis(scale_current);

    // ── CÁLCULO DE ESTABILIDADE ──
    const stability = this.calculateStability();

    return {
      faceWidth_px: faceWidth_smoothed,
      faceHeight_px: this.getFaceHeight(landmarks),
      ipd_estimated_px: ipd_estimated,
      scale_current: scale_current,
      distance_ratio: distance_ratio,
      isInRange: isInRange,
      stability: stability
    };
  }

  /**
   * Histerese no threshold de range:
   * - Só alerta "fora de posição" se ficar fora por >3 segundos
   * - Só volta a "dentro da posição" se ficar dentro por >1 segundo
   */
  private checkRangeWithHysteresis(scale: number): boolean {
    const MIN_SCALE = 0.7;   // 70% da referência (mais distante)
    const MAX_SCALE = 3.0;   // 300% da referência (mais próximo)

    const isCurrentlyInRange = scale >= MIN_SCALE && scale <= MAX_SCALE;

    if (!isCurrentlyInRange) {
      this.outOfRangeFrames++;
      if (this.outOfRangeFrames > this.OUT_OF_RANGE_TOLERANCE) {
        this.emit('outOfRange', { scale, frames: this.outOfRangeFrames });
        return false;
      }
      return true; // Ainda dentro da tolerância
    } else {
      this.outOfRangeFrames = Math.max(0, this.outOfRangeFrames - 2);
      return true;
    }
  }

  /**
   * Filtro de média móvel exponencial
   * Fórmula: EMA_t = alpha * valor_atual + (1-alpha) * EMA_{t-1}
   */
  private exponentialMovingAverage(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  /**
   * Calcula score de estabilidade baseado na variância do histórico
   */
  private calculateStability(): number {
    if (this.faceWidthHistory.length < 3) return 1.0;

    const mean = this.faceWidthHistory.reduce((a, b) => a + b, 0) / this.faceWidthHistory.length;
    const variance = this.faceWidthHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.faceWidthHistory.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coeficiente de variação

    // Converte CV para score de estabilidade (0-1)
    return Math.max(0, Math.min(1, 1 - (cv / this.STABILITY_THRESHOLD)));
  }

  private getFaceHeight(landmarks: Landmark[]): number {
    const chin = landmarks[152];
    const forehead = landmarks[10];
    return this.euclideanDistance(chin, forehead);
  }

  private euclideanDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );
  }
}
```

---

## 5. RENDERIZAÇÃO DE OPTOTIPOS

### 5.1 Layout Horizontal logMAR

Os optotipos devem ser renderizados em **linhas horizontais**, com cada linha representando um nível de acuidade. A escala segue a progressão logarítmica padrão.

### 5.2 Escala logMAR

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ESCALA logMAR PADRÃO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Linha  │  Snellen  │  logMAR  │  Multiplicador  │  Ângulo (arcmin)│
│  ───────┼───────────┼──────────┼─────────────────┼─────────────────│
│    1    │  20/200   │   1.0    │     10.00×      │     50.00       │
│    2    │  20/160   │   0.9    │      7.94×      │     39.81       │
│    3    │  20/125   │   0.8    │      6.31×      │     31.62       │
│    4    │  20/100   │   0.7    │      5.01×      │     25.12       │
│    5    │  20/80    │   0.6    │      3.98×      │     19.95       │
│    6    │  20/63    │   0.5    │      3.16×      │     15.85       │
│    7    │  20/50    │   0.4    │      2.51×      │     12.59       │
│    8    │  20/40    │   0.3    │      1.99×      │     10.00       │
│    9    │  20/32    │   0.2    │      1.58×      │      7.94       │
│   10    │  20/25    │   0.1    │      1.26×      │      6.31       │
│   11    │  20/20    │   0.0    │      1.00×      │      5.00       │
│   12    │  20/16    │  -0.1    │      0.79×      │      3.98       │
│   13    │  20/12.5  │  -0.2    │      0.63×      │      3.16       │
│                                                                     │
│  Fórmula: Multiplicador = 10^(-logMAR)                             │
│  Fator entre linhas: ~1.2589 (raiz décima de 10)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Pseudocódigo — Módulo de Renderização

```typescript
// ============================================
// MÓDULO: OptotypeRenderer
// ============================================

interface OptotypeConfig {
  fontFamily: string;           // 'Sloan', 'ETDRS', 'Snellen'
  lettersPerLine: number;        // Geralmente 5
  gapRatio: number;              // Espaço entre letras = 1× largura da letra
  lineSpacing: number;           // Espaço entre linhas = 1.5× altura da linha
  baseDistanceMeters: number;    // Distância de referência (ex: 4m ou 6m)
  baseSizeMm: number;            // Tamanho base em mm para 20/200 a 6m
}

interface RenderedLine {
  logMAR: number;
  snellen: string;
  letters: string[];
  fontSize_px: number;
  gap_px: number;
  y_position: number;
}

class OptotypeRenderer {
  private config: OptotypeConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentScale: number = 1.0;

  constructor(canvas: HTMLCanvasElement, config: OptotypeConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
  }

  /**
   * Atualiza o fator de escala vindo do tracking
   * Chamado a cada frame pelo HybridTrackingEngine
   */
  updateScale(scale: number): void {
    // Suaviza transições bruscas de escala
    const alpha = 0.2;
    this.currentScale = alpha * scale + (1 - alpha) * this.currentScale;
  }

  /**
   * Renderiza todas as linhas do exame
   */
  renderExam(currentLogMAR: number, trackingResult: TrackingResult): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calcula tamanho base em pixels para a distância de referência
    const baseSize_px = this.mmToPixels(this.config.baseSizeMm);

    // Gera linhas do exame
    const lines = this.generateLines(currentLogMAR, baseSize_px);

    // Renderiza cada linha
    for (const line of lines) {
      this.renderLine(line, trackingResult);
    }

    // Renderiza overlay de status
    this.renderStatusOverlay(trackingResult);
  }

  /**
   * Gera as linhas de optotipos com tamanhos logMAR
   */
  private generateLines(targetLogMAR: number, baseSize_px: number): RenderedLine[] {
    const lines: RenderedLine[] = [];
    const startLogMAR = 1.0;  // 20/200
    const endLogMAR = -0.2;   // 20/12.5
    const step = 0.1;         // Passo de 0.1 logMAR

    let y_position = 50; // Margem superior

    for (let logMAR = startLogMAR; logMAR >= endLogMAR; logMAR -= step) {
      // Multiplicador para esta linha
      const multiplier = Math.pow(10, -logMAR);

      // Tamanho da fonte ajustado pela escala atual do tracking
      const fontSize_px = baseSize_px * multiplier * this.currentScale;

      // Gera letras aleatórias para esta linha
      const letters = this.generateRandomLetters(this.config.lettersPerLine);

      // Gap entre letras = 1× largura da letra (padrão clínico)
      const gap_px = fontSize_px * this.config.gapRatio;

      lines.push({
        logMAR,
        snellen: this.logMARToSnellen(logMAR),
        letters,
        fontSize_px,
        gap_px,
        y_position
      });

      // Avança posição Y
      y_position += fontSize_px * this.config.lineSpacing;
    }

    return lines;
  }

  /**
   * Renderiza uma única linha de optotipos
   */
  private renderLine(line: RenderedLine, tracking: TrackingResult): void {
    const centerX = this.canvas.width / 2;
    const totalWidth = (line.letters.length * line.fontSize_px) + 
                       ((line.letters.length - 1) * line.gap_px);
    let startX = centerX - (totalWidth / 2);

    this.ctx.font = `${line.fontSize_px}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Ajusta opacidade baseado na estabilidade do tracking
    const alpha = 0.3 + (tracking.stability * 0.7);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

    for (let i = 0; i < line.letters.length; i++) {
      const x = startX + (i * (line.fontSize_px + line.gap_px)) + (line.fontSize_px / 2);
      const y = line.y_position;

      this.ctx.fillText(line.letters[i], x, y);
    }

    // Renderiza label Snellen ao lado
    this.ctx.font = `${line.fontSize_px * 0.3}px Arial`;
    this.ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(line.snellen, startX + totalWidth + 20, line.y_position);
  }

  /**
   * Renderiza overlay de status (tracking, estabilidade, etc.)
   */
  private renderStatusOverlay(tracking: TrackingResult): void {
    const margin = 10;

    // Barra de estabilidade
    const barWidth = 200;
    const barHeight = 8;
    const barX = this.canvas.width - barWidth - margin;
    const barY = margin;

    // Fundo da barra
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Barra de progresso
    const progressColor = tracking.isInRange ? '#4CAF50' : '#F44336';
    this.ctx.fillStyle = progressColor;
    this.ctx.fillRect(barX, barY, barWidth * tracking.stability, barHeight);

    // Texto de status
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = tracking.isInRange ? '#4CAF50' : '#F44336';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      tracking.isInRange ? '✓ Posicionado' : '⚠ Reposicione',
      barX - 10,
      barY + barHeight
    );

    // Escala atual
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
    this.ctx.fillText(
      `Escala: ${tracking.scale_current.toFixed(2)}x`,
      this.canvas.width - margin,
      barY + barHeight + 15
    );
  }

  /**
   * Converte mm para pixels baseado na densidade da tela
   */
  private mmToPixels(mm: number): number {
    const ppi = window.devicePixelRatio * 96; // pixels por polegada
    const mmPerInch = 25.4;
    return (mm / mmPerInch) * ppi;
  }

  /**
   * Converte logMAR para notação Snellen
   */
  private logMARToSnellen(logMAR: number): string {
    const numerator = 20;
    const denominator = Math.round(20 * Math.pow(10, logMAR));
    return `${numerator}/${denominator}`;
  }

  /**
   * Gera letras aleatórias do alfabeto Sloan
   */
  private generateRandomLetters(count: number): string[] {
    const sloanLetters = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * sloanLetters.length);
      letters.push(sloanLetters[idx]);
    }
    return letters;
  }
}
```

---

## 6. RECONHECIMENTO DE VOZ

### 6.1 Problema Atual
O microfone está caindo imediatamente para fallback (digitação manual), indicando falha na API de reconhecimento de voz.

### 6.2 Solução: Retry com Permissão Explícita

```typescript
// ============================================
// MÓDULO: VoiceRecognitionEngine
// ============================================

interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

class VoiceRecognitionEngine {
  private recognition: SpeechRecognition | null = null;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private isListening: boolean = false;
  private fallbackMode: boolean = false;

  constructor() {
    this.initializeRecognition();
  }

  /**
   * Inicializa o reconhecedor de voz com detecção de suporte
   */
  private initializeRecognition(): void {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('SpeechRecognition não suportado neste navegador');
      this.fallbackMode = true;
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'pt-BR';
    this.recognition.maxAlternatives = 3;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      const result: VoiceResult = {
        transcript: lastResult[0].transcript.trim().toUpperCase(),
        confidence: lastResult[0].confidence,
        isFinal: lastResult.isFinal
      };

      this.emit('result', result);

      if (result.isFinal) {
        this.isListening = false;
        this.retryCount = 0;
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Erro no reconhecimento de voz:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Permissão negada — não adianta retry
        this.fallbackMode = true;
        this.emit('permissionDenied');
        return;
      }

      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.emit('retrying', { attempt: this.retryCount, max: this.MAX_RETRIES });
        setTimeout(() => this.startListening(), 500);
      } else {
        this.fallbackMode = true;
        this.emit('fallbackActivated');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  /**
   * Solicita permissão de microfone explicitamente antes de iniciar
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Permissão de microfone negada:', error);
      this.fallbackMode = true;
      return false;
    }
  }

  /**
   * Inicia o reconhecimento de voz
   */
  async startListening(): Promise<void> {
    if (this.fallbackMode) {
      this.emit('fallbackMode');
      return;
    }

    if (this.isListening) return;

    // Solicita permissão primeiro
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      this.emit('permissionDenied');
      return;
    }

    try {
      this.recognition?.start();
      this.isListening = true;
      this.emit('listeningStarted');
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento:', error);
      this.handleStartError();
    }
  }

  private handleStartError(): void {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => this.startListening(), 1000);
    } else {
      this.fallbackMode = true;
      this.emit('fallbackActivated');
    }
  }

  stopListening(): void {
    this.recognition?.stop();
    this.isListening = false;
  }

  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // Event emitter simplificado
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}
```

---

## 7. ESTRUTURA DE CÓDIGO

### 7.1 Árvore de Diretórios

```
src/
├── core/
│   ├── calibration/
│   │   ├── CalibrationEngine.ts       # Módulo de calibração de 3 pontos
│   │   ├── CalibrationUI.tsx            # Overlay de calibração (React)
│   │   └── CalibrationState.ts          # Tipos e estado
│   ├── tracking/
│   │   ├── HybridTrackingEngine.ts      # Tracking híbrido pupila+face
│   │   ├── FaceDetector.ts              # Wrapper do MediaPipe Face Mesh
│   │   ├── SmoothingFilter.ts           # Filtros de suavização (EMA, Kalman)
│   │   └── TrackingUI.tsx               # Overlay de tracking (React)
│   ├── rendering/
│   │   ├── OptotypeRenderer.ts          # Renderizador de optotipos
│   │   ├── LogMARScale.ts               # Escala logMAR e cálculos
│   │   ├── SloanFont.ts                 # Fonte Sloan (vetorial)
│   │   └── ExamCanvas.tsx               # Componente canvas do exame
│   └── voice/
│       ├── VoiceRecognitionEngine.ts    # Reconhecimento de voz
│       ├── VoiceUI.tsx                   # UI de voz e fallback
│       └── LetterValidator.ts           # Validação de letras ditas
├── hooks/
│   ├── useCalibration.ts                # Hook de calibração
│   ├── useTracking.ts                   # Hook de tracking
│   ├── useVoiceRecognition.ts           # Hook de voz
│   └── useExamState.ts                  # Hook de estado do exame
├── components/
│   ├── CalibrationOverlay.tsx           # Overlay de guia facial
│   ├── ExamScreen.tsx                   # Tela principal do exame
│   ├── ResultsScreen.tsx                # Tela de resultados
│   └── SettingsScreen.tsx               # Configurações
├── utils/
│   ├── math.ts                          # Funções matemáticas
│   ├── geometry.ts                      # Distâncias e ângulos
│   └── constants.ts                     # Constantes do sistema
├── types/
│   └── index.ts                         # Tipos TypeScript globais
└── App.tsx                              # Aplicação principal
```

### 7.2 Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DADOS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐                                                  │
│   │   CÂMERA     │──WebRTC──▶┌─────────────────┐                  │
│   │  (getUserMedia)│          │ MediaPipe Face  │                  │
│   └──────────────┘          │    Mesh         │                  │
│                             └────────┬────────┘                  │
│                                      │                            │
│                                      ▼                            │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              HYBRID TRACKING ENGINE                     │    │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │    │
│   │  │ Face Width  │───▶│  EMA Filter │───▶│   Scale     │ │    │
│   │  │   (raw)     │    │ (suavização)│    │  Calculator │ │    │
│   │  └─────────────┘    └─────────────┘    └──────┬──────┘ │    │
│   │                                               │        │    │
│   │  ┌─────────────┐    ┌─────────────┐           │        │    │
│   │  │ Biometric   │◀───│  Calibration│◀──────────┘        │    │
│   │  │   Ratio     │    │    State    │                    │    │
│   │  │ (ref)       │    │  (3 pontos) │                    │    │
│   │  └─────────────┘    └─────────────┘                    │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                    │
│                              ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              OPTOTYPE RENDERER                          │    │
│   │  • Recebe scale_current                                 │    │
│   │  • Ajusta fontSize = baseSize × scale_current          │    │
│   │  • Renderiza linhas horizontais logMAR                  │    │
│   │  • Exibe overlay de status                              │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                    │
│                              ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              VOICE RECOGNITION                          │    │
│   │  • Captura letra dita                                   │    │
│   │  • Valida contra letra exibida                          │    │
│   │  • Avança/retorna na escala logMAR                      │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                    │
│                              ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              EXAM STATE MANAGER                         │    │
│   │  • Mantém histórico de acertos/erros                    │    │
│   │  • Calcula acuidade final (logMAR)                      │    │
│   │  • Gera relatório                                       │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. STACK TECNOLÓGICO

### 8.1 Tecnologias Recomendadas

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Framework** | React 18+ | Componentização, hooks, performance |
| **Linguagem** | TypeScript | Tipagem forte, manutenibilidade |
| **Face Detection** | MediaPipe Face Mesh | 468 landmarks, performance real-time, roda no browser |
| **Canvas** | HTML5 Canvas API | Renderização performática de optotipos |
| **Build** | Vite | Build rápido, HMR, otimizado para SPA |
| **Estado** | Zustand | Leve, simples, sem boilerplate |
| **Voz** | Web Speech API | Nativo do navegador, sem dependências externas |
| **Estilização** | Tailwind CSS | Utility-first, responsivo, consistente |
| **Fonte** | Sloan (SVG/Canvas) | Padrão ETDRS, optotipo científico |

### 8.2 Dependências

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mediapipe/face_mesh": "^0.4.0",
    "@mediapipe/camera_utils": "^0.3.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

---

## 9. FLUXO COMPLETO DO EXAME

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DO EXAME (PASSO A PASSO)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐                                                        │
│  │  START  │                                                        │
│  └────┬────┘                                                        │
│       ▼                                                             │
│  ┌─────────────────────────┐                                        │
│  │ 1. TELA DE BOAS-VINDAS │                                        │
│  │    • Instruções          │                                        │
│  │    • Botão "Iniciar"    │                                        │
│  └───────────┬─────────────┘                                        │
│              │                                                      │
│              ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │ 2. CALIBRAÇÃO — PASSO 1│                                        │
│  │    "Estique o braço ao  │                                        │
│  │     máximo"             │                                        │
│  │    • Overlay oval guia  │                                        │
│  │    • Aguarda estabilidade│                                       │
│  │    • Captura 3 pontos   │                                        │
│  │    • Barra de progresso │                                        │
│  └───────────┬─────────────┘                                        │
│              │                                                      │
│              ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │ 3. CALIBRAÇÃO — PASSO 2│                                        │
│  │    "Recolha o braço para│                                        │
│  │     posição confortável"│                                        │
│  │    • Mede nova posição  │                                        │
│  │    • Valida range       │                                        │
│  │    • Calcula escala     │                                        │
│  └───────────┬─────────────┘                                        │
│              │                                                      │
│              ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │ 4. INÍCIO DO EXAME      │                                        │
│  │    • Exibe linha 20/200 │                                        │
│  │    • Ativa microfone    │                                        │
│  │    • Inicia tracking    │                                        │
│  │      híbrido            │                                        │
│  └───────────┬─────────────┘                                        │
│              │                                                      │
│              ▼                                                      │
│  ┌─────────────────────────┐     ┌─────────────────────────┐       │
│  │ 5. EXAME EM ANDAMENTO   │◀────│  LOOP DE CADA LINHA     │       │
│  │    • Renderiza optotipo │     │    • Exibe letras       │       │
│  │    • Tracking contínuo  │     │    • Aguarda resposta    │       │
│  │    • Ajusta tamanho     │     │    • Valida resposta     │       │
│  │      em tempo real      │     │    • Registra acerto/erro│      │
│  │    • Overlay de status  │     │    • Avança/retorna      │       │
│  └───────────┬─────────────┘     └─────────────────────────┘       │
│              │                                                      │
│              ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │ 6. RESULTADO            │                                        │
│  │    • Calcula logMAR     │                                        │
│  │    • Exibe Snellen      │                                        │
│  │    • Gráfico de desempenho│                                      │
│  │    • Opção de refazer   │                                        │
│  └─────────────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. DIAGRAMAS E PSEUDOCÓDIGO

### 10.1 Diagrama de Classes

```
┌─────────────────────────────┐
│    <<interface>>             │
│    ICalibrationState         │
├─────────────────────────────┤
│  + ipd_ref_px: number        │
│  + faceWidth_ref_px: number  │
│  + faceHeight_ref_px: number │
│  + biometric_ratio: number   │
│  + scale_comfort: number     │
│  + isCalibrated: boolean     │
└─────────────────────────────┘
            ▲
            │ implementa
┌─────────────────────────────┐
│   CalibrationEngine         │
├─────────────────────────────┤
│  - state: ICalibrationState │
│  - stabilityFrames: number  │
├─────────────────────────────┤
│  + captureReference()        │
│  + captureComfortPosition()│
│  + isFaceStable()            │
│  + getState()                │
└─────────────────────────────┘
            │
            │ usa
            ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  HybridTrackingEngine       │────▶│  SmoothingFilter            │
├─────────────────────────────┤     ├─────────────────────────────┤
│  - calibration: ICalState   │     │  - history: number[]         │
│  - faceWidthHistory: number[]│    │  - alpha: number             │
├─────────────────────────────┤     ├─────────────────────────────┤
│  + processFrame()            │     │  + exponentialMovingAverage()│
│  + checkRangeWithHysteresis()│     │  + kalmanFilter()            │
│  + calculateStability()     │     │  + calculateVariance()       │
└─────────────────────────────┘     └─────────────────────────────┘
            │
            │ fornece scale_current
            ▼
┌─────────────────────────────┐
│   OptotypeRenderer          │
├─────────────────────────────┤
│  - config: OptotypeConfig   │
│  - currentScale: number     │
│  - canvas: HTMLCanvasElement│
├─────────────────────────────┤
│  + updateScale()            │
│  + renderExam()             │
│  + generateLines()          │
│  + renderLine()             │
│  + renderStatusOverlay()    │
└─────────────────────────────┘
            ▲
            │
┌─────────────────────────────┐
│   VoiceRecognitionEngine    │
├─────────────────────────────┤
│  - recognition: SpeechRecog │
│  - retryCount: number       │
│  - fallbackMode: boolean    │
├─────────────────────────────┤
│  + requestPermission()      │
│  + startListening()         │
│  + stopListening()          │
│  + isInFallbackMode()       │
└─────────────────────────────┘
```

### 10.2 Pseudocódigo do Loop Principal

```typescript
// ============================================
// LOOP PRINCIPAL DO EXAME
// ============================================

async function mainExamLoop() {

  // ── FASE 1: INICIALIZAÇÃO ──
  const faceDetector = new FaceDetector();
  await faceDetector.initialize();

  const calibration = new CalibrationEngine();
  const voice = new VoiceRecognitionEngine();
  const renderer = new OptotypeRenderer(canvas, defaultConfig);

  // ── FASE 2: CALIBRAÇÃO ──
  showScreen('calibration_step1');

  // Aguarda estabilidade do rosto com braço esticado
  let calibrated = false;
  while (!calibrated) {
    const faceMesh = await faceDetector.detectFrame();
    calibrated = await calibration.captureReference(faceMesh);
    updateCalibrationProgress(calibration.getStabilityProgress());
  }

  showScreen('calibration_step2');

  // Aguarda posição confortável
  let comfortOK = false;
  while (!comfortOK) {
    const faceMesh = await faceDetector.detectFrame();
    comfortOK = calibration.captureComfortPosition(faceMesh);

    if (!comfortOK) {
      showWarning('Ajuste a distância do smartphone');
    }
  }

  // ── FASE 3: EXAME ──
  const tracking = new HybridTrackingEngine(calibration.getState()!);
  const examState = new ExamStateManager();

  showScreen('exam');

  // Loop principal
  while (!examState.isComplete()) {

    // 1. Captura frame da câmera
    const faceMesh = await faceDetector.detectFrame();

    // 2. Processa tracking híbrido
    const trackingResult = tracking.processFrame(faceMesh);

    // 3. Atualiza escala do renderizador
    renderer.updateScale(trackingResult.scale_current);

    // 4. Renderiza optotipos da linha atual
    const currentLogMAR = examState.getCurrentLogMAR();
    renderer.renderExam(currentLogMAR, trackingResult);

    // 5. Aguarda resposta do usuário (voz ou fallback)
    const userResponse = await waitForUserResponse(voice, 10000); // timeout 10s

    // 6. Valida resposta
    const isCorrect = validateResponse(userResponse, examState.getCurrentLetters());
    examState.recordResponse(isCorrect);

    // 7. Decide próxima linha (algoritmo staircase)
    examState.advanceLine(isCorrect);

    // 8. Pequena pausa entre linhas
    await sleep(500);
  }

  // ── FASE 4: RESULTADOS ──
  const results = examState.calculateResults();
  showScreen('results', results);
}

/**
 * Algoritmo Staircase para determinar acuidade
 * - 3 acertos consecutivos → desce uma linha (letra menor)
 * - 2 erros consecutivos → sobe uma linha (letra maior)
 * - Termina após 3 reversões ou atingir limite
 */
class ExamStateManager {
  private currentLogMAR: number = 1.0;  // Começa em 20/200
  private consecutiveCorrect: number = 0;
  private consecutiveWrong: number = 0;
  private reversals: number = 0;
  private lastDirection: 'up' | 'down' | null = null;
  private readonly STEP = 0.1;
  private readonly MAX_REVERSALS = 3;

  recordResponse(isCorrect: boolean): void {
    if (isCorrect) {
      this.consecutiveCorrect++;
      this.consecutiveWrong = 0;

      if (this.consecutiveCorrect >= 3) {
        this.moveDown();
        this.consecutiveCorrect = 0;
      }
    } else {
      this.consecutiveWrong++;
      this.consecutiveCorrect = 0;

      if (this.consecutiveWrong >= 2) {
        this.moveUp();
        this.consecutiveWrong = 0;
      }
    }
  }

  private moveDown(): void {
    const newLogMAR = Math.max(-0.2, this.currentLogMAR - this.STEP);

    if (this.lastDirection === 'up') {
      this.reversals++;
    }
    this.lastDirection = 'down';
    this.currentLogMAR = newLogMAR;
  }

  private moveUp(): void {
    const newLogMAR = Math.min(1.0, this.currentLogMAR + this.STEP);

    if (this.lastDirection === 'down') {
      this.reversals++;
    }
    this.lastDirection = 'up';
    this.currentLogMAR = newLogMAR;
  }

  isComplete(): boolean {
    return this.reversals >= this.MAX_REVERSALS;
  }

  calculateResults(): ExamResult {
    // Acuidade = último logMAR onde houve 3 acertos consecutivos
    // ou média das últimas reversões
    return {
      logMAR: this.currentLogMAR,
      snellen: this.logMARToSnellen(this.currentLogMAR),
      decimal: Math.pow(10, -this.currentLogMAR),
      reversals: this.reversals
    };
  }
}
```

---

## 11. CONSTANTES E PARÂMETROS

### 11.1 Tabela de Parâmetros do Sistema

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `STABILITY_THRESHOLD` | 60 frames (~2s) | Frames consecutivos estáveis para calibração |
| `HISTORY_SIZE` | 10 | Janela do filtro de suavização |
| `EMA_ALPHA` | 0.3 | Fator de suavização exponencial |
| `MIN_SCALE` | 0.7 | Escala mínima aceitável (70% da referência) |
| `MAX_SCALE` | 3.0 | Escala máxima aceitável (300% da referência) |
| `OUT_OF_RANGE_TOLERANCE` | 90 frames (~3s) | Tolerância antes de alertar reposicionamento |
| `VOICE_RETRY_MAX` | 3 | Tentativas de reconhecimento de voz |
| `VOICE_TIMEOUT_MS` | 10000 | Timeout para resposta do usuário |
| `STEP_logMAR` | 0.1 | Passo entre linhas do exame |
| `LETTERS_PER_LINE` | 5 | Número de letras por linha |
| `GAP_RATIO` | 1.0 | Espaço entre letras = 1× largura da letra |
| `LINE_SPACING` | 1.5 | Espaço entre linhas = 1.5× altura da linha |
| `MAX_REVERSALS` | 3 | Reversões para encerrar o exame |
| `CONSECUTIVE_CORRECT` | 3 | Acertos consecutivos para descer uma linha |
| `CONSECUTIVE_WRONG` | 2 | Erros consecutivos para subir uma linha |

---

## 12. CONSIDERAÇÕES DE IMPLEMENTAÇÃO

### 12.1 Performance
- MediaPipe Face Mesh roda a ~30fps em smartphones modernos
- O tracking híbrido reduz carga de CPU (não processa pupilas a cada frame)
- Renderização em Canvas 2D é mais performática que DOM para optotipos
- Use `requestAnimationFrame` para sincronizar renderização com o display

### 12.2 Compatibilidade
- MediaPipe Face Mesh requer WebGL — verificar suporte
- Web Speech API funciona melhor no Chrome/Android
- Para iOS/Safari, considerar fallback para teclado virtual
- Testar em diferentes densidades de tela (DPI)

### 12.3 Precisão
- A razão biométrica IPD/FaceWidth varia ~5% entre indivíduos
- Erro de distância estimada: ±2-3cm com tracking híbrido
- Para precisão absoluta, adicionar calibração com cartão de referência (Warby Parker method)

### 12.4 UX/UI
- Overlay de guia facial deve ser sutil (borda vermelha → verde quando estável)
- Feedback visual imediato para voz reconhecida (letra destacada)
- Animação suave no redimensionamento de optotipos (evita flickering)
- Modo escuro para reduzir ofuscamento do smartphone

---

## 13. PRÓXIMOS PASSOS DE IMPLEMENTAÇÃO

1. **Semana 1:** Refatorar renderização para layout horizontal logMAR
2. **Semana 2:** Implementar CalibrationEngine com calibração de 3 pontos
3. **Semana 3:** Implementar HybridTrackingEngine com suavização
4. **Semana 4:** Corrigir VoiceRecognitionEngine com retry e permissão
5. **Semana 5:** Integração completa e testes de usabilidade
6. **Semana 6:** Otimização de performance e testes em múltiplos dispositivos

---

*Documento gerado em 17 de Julho de 2026*
*Especificação Técnica v2.0 — Exame de Acuidade Visual Assistido por IA*
