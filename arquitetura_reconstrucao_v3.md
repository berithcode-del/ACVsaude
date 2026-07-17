# 📘 DOCUMENTO DE ARQUITETURA — RECONSTRUÇÃO DO ZERO
# Exame de Acuidade Visual Assistido por IA

**Versão:** 3.0 — Reconstrução Completa  
**Data:** 17 de Julho de 2026  
**Status:** Arquitetura para Implementação

---

## 📑 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura de Duas Interfaces](#2-arquitetura-de-duas-interfaces)
3. [Protocolo de Comunicação (WebSocket)](#3-protocolo-de-comunicação-websocket)
4. [Algoritmo de Calibração de 3 Pontos](#4-algoritmo-de-calibração-de-3-pontos)
5. [Módulo de Tracking Híbrido](#5-módulo-de-tracking-híbrido)
6. [Renderização de Optotipos](#6-renderização-de-optotipos)
7. [Reconhecimento de Voz](#7-reconhecimento-de-voz)
8. [Estrutura de Logs e Telemetria](#8-estrutura-de-logs-e-telemetria)
9. [Stack Tecnológico](#9-stack-tecnológico)
10. [Estrutura de Diretórios](#10-estrutura-de-diretórios)
11. [APIs e Contratos](#11-apis-e-contratos)
12. [Fluxo Completo](#12-fluxo-completo)
13. [Considerações de Implementação](#13-considerações-de-implementação)
14. [Cronograma](#14-cronograma)
15. [Migração da Base Atual](#15-migração-da-base-atual)

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Conceito Central
Sistema distribuído de exame de acuidade visual onde:
- **Paciente** realiza o exame no **smartphone**
- **Operador/Técnico** monitora métricas em **tempo real** no desktop via painel de bancada
- **Algoritmo** é calibrado e refinado a partir dos logs coletados em cada sessão

### 1.2 Problemas da Versão Atual vs Soluções

| Problema | Impacto | Solução na Reconstrução |
|----------|---------|------------------------|
| Letras em modo vertical | Não cabem na tela, não é padrão clínico | Layout horizontal logMAR |
| Microfone cai para fallback | Usuário não consegue usar voz | Retry + permissão explícita + fallback manual |
| Braço precisa ficar esticado | Desconforto, abandono do exame | Calibração de 3 pontos com referência biométrica |
| Tracking por pupila instável | Perde foco a cada micro-movimento | Tracking híbrido: pupila (calibração) → face (tempo real) |
| Bancada sem logs em tempo real | Não dá para calibrar algoritmo | WebSocket com telemetria completa |
| Distância congelada no início | Não adapta se usuário se move | Recalibração dinâmica durante o teste |
| Uma só interface | Não separa exame de diagnóstico | Duas aplicações: mobile (exame) + desktop (bancada) |

### 1.3 Diagrama de Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DISTRIBUÍDO                               │
├─────────────────────────────┬───────────────────────────────────────────────┤
│      📱 MOBILE (EXAME)      │         💻 DESKTOP (BANCADA)                  │
│                             │                                               │
│  ┌─────────────────────┐   │   ┌─────────────────────────────────────┐    │
│  │   CÂMERA FRONTAL    │   │   │         PAINEL DE BANCADA           │    │
│  │  (Face Mesh + Iris) │   │   │                                     │    │
│  └──────────┬──────────┘   │   │  ┌─────────────┐ ┌───────────────┐ │    │
│             │              │   │  │  STREAM DE   │ │   MÉTRICAS    │ │    │
│  ┌──────────▼──────────┐   │   │  │   VÍDEO    │ │   EM TEMPO    │ │    │
│  │  CALIBRATION ENGINE │   │   │  │   (PiP)    │ │    REAL       │ │    │
│  │   (3 pontos)        │   │   │  └─────────────┘ └───────────────┘ │    │
│  └──────────┬──────────┘   │   │                                     │    │
│             │              │   │  ┌─────────────┐ ┌───────────────┐ │    │
│  ┌──────────▼──────────┐   │   │  │   LOGS     │ │   GRÁFICOS    │ │    │
│  │ HYBRID TRACKING     │   │   │  │  POR RODADA│ │   DE DRIFT    │ │    │
│  │   (Face → Scale)    │   │   │  └─────────────┘ └───────────────┘ │    │
│  └──────────┬──────────┘   │   │                                     │    │
│             │              │   │  ┌─────────────────────────────────┐ │    │
│  ┌──────────▼──────────┐   │   │  │     CALIBRAÇÃO DO ALGORITMO     │ │    │
│  │  OPTOTYPE RENDERER  │   │   │  │  • Ajuste de parâmetros         │ │    │
│  │  (Horizontal logMAR)│   │   │  │  • Análise de sessões           │ │    │
│  └──────────┬──────────┘   │   │  │  • Exportação de datasets       │ │    │
│             │              │   │  └─────────────────────────────────┘ │    │
│  ┌──────────▼──────────┐   │   └─────────────────────────────────────┘    │
│  │  VOICE RECOGNITION  │   │                                               │
│  │   (Web Speech API)  │   │                                               │
│  └──────────┬──────────┘   │                                               │
│             │              │                                               │
│  ┌──────────▼──────────┐   │                                               │
│  │   SESSION LOGGER    │◀──┼─── WebSocket ─────────────────────────────────┤
│  │  (telemetria real)  │   │                                               │
│  └─────────────────────┘   │                                               │
│                            │                                               │
└────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2. ARQUITETURA DE DUAS INTERFACES

### 2.1 Aplicação Mobile (`/apps/mobile`)
Interface otimizada para smartphone. O paciente segura o celular a uma distância confortável.

**Responsabilidades:**
- Captura de vídeo via câmera frontal
- Detecção facial com MediaPipe Face Mesh
- Calibração de 3 pontos (braço esticado → posição confortável)
- Tracking híbrido contínuo
- Renderização de optotipos logMAR horizontal
- Reconhecimento de voz + botões manuais
- Envio de telemetria em tempo real para a bancada

**Layout:**
```
┌─────────────────────────┐
│                         │
│    ┌─────────────┐      │
│    │             │      │
│    │   OPTOTIPO  │      │  ← Cartão branco, contraste máximo
│    │   (logMAR)  │      │
│    │   V S D H K │      │  ← 5 letras horizontais
│    │             │      │
│    └─────────────┘      │
│                         │
│  ┌───────────────────┐  │
│  │   CÂMERA (PiP)    │  │  ← Preview com overlay facial
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  [Acertei] [Não]  │  │  ← Dock de ações
│  └───────────────────┘  │
└─────────────────────────┘
```

### 2.2 Aplicação Bancada (`/apps/bancada`)
Interface desktop para monitoramento técnico e calibração do algoritmo.

**Responsabilidades:**
- Receber stream de vídeo do mobile (frames via WebSocket)
- Exibir métricas em tempo real (distância, estabilidade, escala)
- Plotar gráficos de drift de distância
- Exibir logs por rodada do exame
- Permitir ajuste de parâmetros do algoritmo
- Exportar datasets de sessões para análise posterior
- Calibrar fatores de correção por dispositivo

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  BANCADA TÉCNICA — Exame de Acuidade Visual          [Sessão #] │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   ┌────────────────────┐   │   ┌────────────────────────────┐  │
│   │   STREAM DE VÍDEO  │   │   │      MÉTRICAS EM TEMPO     │  │
│   │   (do celular)     │   │   │        REAL                │  │
│   │  [overlay facial]  │   │   ├────────────────────────────┤  │
│   └────────────────────┘   │   │  Distância: 487mm ✓        │  │
│                            │   │  Escala: 1.43x              │  │
│   ┌────────────────────┐   │   │  Estabilidade: 94%           │  │
│   │   GRÁFICO DE DRIFT │   │   │  IPD estimado: 63.2mm        │  │
│   │   (distância vs    │   │   │  FaceWidth: 312px            │  │
│   │    tempo)          │   │   └────────────────────────────┘  │
│   └────────────────────┘   │                                    │
│                            │   ┌────────────────────────────┐  │
│   ┌────────────────────┐   │   │    LOGS POR RODADA          │  │
│   │   CONTROLES DE     │   │   ├────────────────────────────┤  │
│   │   CALIBRAÇÃO       │   │   │  R0: V·S·D·H·K  Target:V ✓ │  │
│   │                    │   │   │      logMAR:1.0 | 852ms      │  │
│   │  [Ajustar Focal]   │   │   │  R1: O·R·Z·N·C  Target:N ✗ │  │
│   │  [Exportar Dataset]│   │   │      logMAR:0.9 | 1203ms     │  │
│   │  [Resetar Sessão]  │   │   └────────────────────────────┘  │
│   └────────────────────┘   │                                    │
└────────────────────────────┴────────────────────────────────────┘
```

---

## 3. PROTOCOLO DE COMUNICAÇÃO (WEBSOCKET)

### 3.1 Arquitetura de Sessão

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   MOBILE     │◄───────►│   SERVIDOR   │◄───────►│   BANCADA    │
│  (Paciente)  │  WS     │  (Relay/     │  WS     │  (Técnico)   │
└──────────────┘         │   Room)      │         └──────────────┘
                         └──────────────┘
```

**Modelo:** Room-based WebSocket
- Mobile cria uma "sala" (room) com ID único (UUID)
- Bancada se conecta à mesma sala via QR code ou código de sessão
- Servidor apenas faz relay de mensagens (pode ser Socket.io, ou servidor simples)

### 3.2 Tipos de Mensagem

```typescript
// ============================================
// PROTOCOLO WEBSOCKET — TIPOS DE MENSAGEM
// ============================================

// ── DIREÇÃO: MOBILE → BANCADA ──

interface TelemetryFrame {
  type: "telemetry";
  sessionId: string;
  timestamp: number;
  frame: {
    faceDetected: boolean;
    faceWidthPx: number;
    faceHeightPx: number;
    ipdEstimatedPx: number;
    scaleCurrent: number;
    distanceMm: number | null;
    stability: number;        // 0-1
    isInRange: boolean;
  };
}

interface ExamEvent {
  type: "exam_event";
  sessionId: string;
  timestamp: number;
  event: {
    kind: "round_presented" | "round_answered" | "distance_locked" |
          "distance_drift_warning" | "distance_recalibration" |
          "face_lost" | "face_found" | "calibration_complete" |
          "voice_recognized" | "voice_error" | "test_finished";
    roundIndex?: number;
    logMAR?: number;
    targetLetter?: string;
    displayLetters?: string[];
    correct?: boolean;
    responseSource?: "voz" | "manual";
    responseTimeMs?: number;
    recognizedText?: string;
    confidence?: number;
    distanceMm?: number;
    scaleComfort?: number;
  };
}

interface VideoFrame {
  type: "video_frame";
  sessionId: string;
  timestamp: number;
  imageData: string;  // JPEG base64, qualidade 0.6
}

// ── DIREÇÃO: BANCADA → MOBILE ──

interface ControlCommand {
  type: "control";
  sessionId: string;
  command: {
    action: "start_test" | "pause_test" | "resume_test" | "abort_test" |
            "adjust_parameter" | "request_calibration";
    parameter?: {
      name: "drift_warn_mm" | "drift_severe_mm" | "stability_threshold" |
            "base_distance_m" | "correction_factor";
      value: number;
    };
  };
}

interface CalibrationData {
  type: "calibration_data";
  sessionId: string;
  data: {
    correctionFactor: number;
    deviceProfile?: {
      model: string;
      focalLength: number;
      sensorSize: number;
    };
  };
}

// ── SINCRONIZAÇÃO ──

interface SessionSync {
  type: "sync";
  sessionId: string;
  role: "mobile" | "bancada";
  status: "joining" | "connected" | "disconnected";
}
```

### 3.3 Frequência de Envio

| Tipo de Dado | Frequência | Compressão |
|--------------|-----------|------------|
| `telemetry` | A cada frame (~30fps) | JSON, leve |
| `exam_event` | Event-driven | JSON |
| `video_frame` | A cada 5 frames (~6fps) | JPEG base64, qualidade 0.6 |
| `control` | Event-driven | JSON |

---

## 4. ALGORITMO DE CALIBRAÇÃO DE 3 PONTOS

### 4.1 Conceito
O algoritmo captura uma **referência biométrica individual** no momento de máxima extensão do braço, e depois permite que o usuário recolha o braço para posição confortável, ajustando automaticamente o tamanho dos optotipos proporcionalmente.

### 4.2 Passo a Passo

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 1: BRAÇO ESTICADO (Referência Zero)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • Usuário estende o braço ao máximo                                │
│  • Sistema exibe overlay de guia facial (oval + cruz central)       │
│  • Quando rosto estável (>2s):                                     │
│                                                                     │
│    ┌─────────────────────────────────────────┐                       │
│    │  CAPTURA DOS 3 PONTOS DE REFERÊNCIA     │                       │
│    ├─────────────────────────────────────────┤                       │
│    │  P1: IPD_px (interpupilar em pixels)    │                       │
│    │      Landmarks: 468 (esq) e 473 (dir)     │                       │
│    │  P2: FaceWidth_px (orelha a orelha)       │                       │
│    │      Landmarks: 127 (esq) e 356 (dir)     │                       │
│    │  P3: FaceHeight_px (queixo a testa)       │                       │
│    │      Landmarks: 152 (queixo) e 10 (testa)  │                       │
│    └─────────────────────────────────────────┘                       │
│                                                                     │
│  • Razão biométrica: R = IPD_px / FaceWidth_px                     │
│    (constante para esta pessoa, ~0.15–0.25)                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 2: POSIÇÃO CONFORTÁVEL                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • "Recolha o braço para posição confortável"                      │
│  • Aguarda estabilização (>1.5s)                                   │
│  • Captura FaceWidth_conforto_px                                   │
│                                                                     │
│  • Fator de Escala de Conforto:                                    │
│    EscalaConforto = FaceWidth_conforto_px / FaceWidth_ref_px       │
│                                                                     │
│  • Validação:                                                       │
│    - Se EscalaConforto < 1.2 → "Aproxime mais o smartphone"       │
│    - Se EscalaConforto > 2.5 → "Afaste um pouco o smartphone"       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 3: ESTADO DE CALIBRAÇÃO CONGELADO                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CalibrationState = {                                               │
│    ipd_ref_px: number,           // IPD na distância máxima       │
│    faceWidth_ref_px: number,      // Largura rosto referência       │
│    faceHeight_ref_px: number,     // Altura rosto referência        │
│    biometric_ratio: number,     // R = IPD/FaceWidth (fixo)       │
│    scale_comfort: number,         // Escala de conforto            │
│    timestamp: number,                                               │
│    isCalibrated: true                                              │
│  }                                                                  │
│                                                                     │
│  → Exame inicia com tracking contínuo                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Implementação

```typescript
// ============================================
// MÓDULO: CalibrationEngine
// ============================================

interface CalibrationState {
  ipd_ref_px: number;
  faceWidth_ref_px: number;
  faceHeight_ref_px: number;
  biometric_ratio: number;
  scale_comfort: number;
  timestamp: number;
  isCalibrated: boolean;
}

class CalibrationEngine extends EventTarget {
  private state: CalibrationState | null = null;
  private stabilityFrames = 0;
  private readonly STABILITY_THRESHOLD = 60; // ~2s a 30fps
  private faceWidthHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;

  async captureReference(faceMesh: FaceMeshResult): Promise<boolean> {
    if (!this.isFaceStable(faceMesh)) {
      this.stabilityFrames = 0;
      this.emit('stabilizing', { progress: 0 });
      return false;
    }

    this.stabilityFrames++;
    const progress = Math.min(100, (this.stabilityFrames / this.STABILITY_THRESHOLD) * 100);
    this.emit('stabilizing', { progress });

    if (this.stabilityFrames < this.STABILITY_THRESHOLD) return false;

    const landmarks = faceMesh.multiFaceLandmarks[0];

    // P1: IPD (interpupilar)
    const leftPupil = landmarks[468];
    const rightPupil = landmarks[473];
    const ipd_px = this.euclideanDistance(leftPupil, rightPupil);

    // P2: FaceWidth (orelha a orelha)
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_px = this.euclideanDistance(leftEar, rightEar);

    // P3: FaceHeight (queixo a testa)
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const faceHeight_px = this.euclideanDistance(chin, forehead);

    // Razão biométrica individual
    const biometric_ratio = ipd_px / faceWidth_px;

    this.state = {
      ipd_ref_px: ipd_px,
      faceWidth_ref_px: faceWidth_px,
      faceHeight_ref_px: faceHeight_px,
      biometric_ratio,
      scale_comfort: 1.0,
      timestamp: Date.now(),
      isCalibrated: true
    };

    this.emit('referenceCaptured', { ...this.state });
    return true;
  }

  captureComfortPosition(faceMesh: FaceMeshResult): { ok: boolean; scale: number } {
    if (!this.state?.isCalibrated) {
      throw new Error('Calibração de referência não realizada');
    }

    const landmarks = faceMesh.multiFaceLandmarks[0];
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_comfort_px = this.euclideanDistance(leftEar, rightEar);

    const scale_comfort = faceWidth_comfort_px / this.state.faceWidth_ref_px;

    if (scale_comfort < 1.2) {
      this.emit('comfortTooClose', { scale: scale_comfort });
      return { ok: false, scale: scale_comfort };
    }

    if (scale_comfort > 2.5) {
      this.emit('comfortTooFar', { scale: scale_comfort });
      return { ok: false, scale: scale_comfort };
    }

    this.state.scale_comfort = scale_comfort;
    this.emit('comfortPositionCaptured', { scale_comfort, faceWidth_comfort_px });

    return { ok: true, scale: scale_comfort };
  }

  private isFaceStable(faceMesh: FaceMeshResult): boolean {
    const landmarks = faceMesh.multiFaceLandmarks[0];
    const nose = landmarks[1];

    this.faceWidthHistory.push(nose.x);
    if (this.faceWidthHistory.length > this.HISTORY_SIZE) {
      this.faceWidthHistory.shift();
    }

    if (this.faceWidthHistory.length < 5) return false;

    const variance = this.calculateVariance(this.faceWidthHistory);
    return variance < 0.001;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private euclideanDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );
  }

  getState(): CalibrationState | null { return this.state; }
  isCalibrated(): boolean { return this.state?.isCalibrated ?? false; }

  private emit(event: string, detail: any) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
```

---

## 5. MÓDULO DE TRACKING HÍBRIDO

### 5.1 Conceito
Após a calibração, o sistema **não mede mais as pupilas** (sinal pequeno e instável). Em vez disso:

1. Mede o **bounding box do rosto** a cada frame (sinal grande e estável)
2. Usa a **razão biométrica calibrada** para reconstruir o IPD estimado
3. Calcula o **fator de escala** em tempo real
4. Ajusta o tamanho do optotipo proporcionalmente

### 5.2 Vantagens

| Aspecto | Pupila pura | Face híbrida |
|---------|-------------|--------------|
| Tamanho do sinal | ~15-30 px | ~200-400 px |
| Sensibilidade a movimento | Alta | Baixa |
| Taxa de atualização | ~30fps | ~30fps, sinal robusto |
| Consumo de CPU | Alto | Médio |
| Precisão de distância | ±5-10 cm | ±2-3 cm |
| Tolerância a ruído | Baixa | Alta |

### 5.3 Implementação

```typescript
// ============================================
// MÓDULO: HybridTrackingEngine
// ============================================

interface TrackingResult {
  faceWidth_px: number;
  faceHeight_px: number;
  ipd_estimated_px: number;
  scale_current: number;
  distance_ratio: number;
  isInRange: boolean;
  stability: number;
}

class HybridTrackingEngine extends EventTarget {
  private calibration: CalibrationState;
  private faceWidthHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;
  private readonly EMA_ALPHA = 0.3;
  private readonly STABILITY_THRESHOLD = 0.15;
  private outOfRangeFrames = 0;
  private readonly OUT_OF_RANGE_TOLERANCE = 90; // ~3s a 30fps

  constructor(calibration: CalibrationState) {
    super();
    this.calibration = calibration;
  }

  processFrame(faceMesh: FaceMeshResult): TrackingResult {
    const landmarks = faceMesh.multiFaceLandmarks[0];

    // MEDIDA 1: Largura do rosto (sinal grande, estável)
    const leftEar = landmarks[127];
    const rightEar = landmarks[356];
    const faceWidth_raw = this.euclideanDistance(leftEar, rightEar);

    // SUAVIZAÇÃO: Filtro de média móvel exponencial
    this.faceWidthHistory.push(faceWidth_raw);
    if (this.faceWidthHistory.length > this.HISTORY_SIZE) {
      this.faceWidthHistory.shift();
    }

    const faceWidth_smoothed = this.exponentialMovingAverage(
      this.faceWidthHistory, 
      this.EMA_ALPHA
    );

    // MEDIDA 2: Reconstrução do IPD via razão biométrica
    const ipd_estimated = faceWidth_smoothed * this.calibration.biometric_ratio;

    // CÁLCULO DO FATOR DE ESCALA
    const scale_current = faceWidth_smoothed / this.calibration.faceWidth_ref_px;

    // RAZÃO DE DISTÂNCIA
    const distance_ratio = 1 / scale_current;

    // VALIDAÇÃO DE RANGE COM HISTERÊSE
    const isInRange = this.checkRangeWithHysteresis(scale_current);

    // CÁLCULO DE ESTABILIDADE
    const stability = this.calculateStability();

    return {
      faceWidth_px: faceWidth_smoothed,
      faceHeight_px: this.getFaceHeight(landmarks),
      ipd_estimated_px: ipd_estimated,
      scale_current,
      distance_ratio,
      isInRange,
      stability
    };
  }

  private checkRangeWithHysteresis(scale: number): boolean {
    const MIN_SCALE = 0.7;
    const MAX_SCALE = 3.0;

    const isCurrentlyInRange = scale >= MIN_SCALE && scale <= MAX_SCALE;

    if (!isCurrentlyInRange) {
      this.outOfRangeFrames++;
      if (this.outOfRangeFrames > this.OUT_OF_RANGE_TOLERANCE) {
        this.emit('outOfRange', { scale, frames: this.outOfRangeFrames });
        return false;
      }
      return true;
    } else {
      this.outOfRangeFrames = Math.max(0, this.outOfRangeFrames - 2);
      return true;
    }
  }

  private exponentialMovingAverage(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  private calculateStability(): number {
    if (this.faceWidthHistory.length < 3) return 1.0;
    const mean = this.faceWidthHistory.reduce((a, b) => a + b, 0) / this.faceWidthHistory.length;
    const variance = this.faceWidthHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.faceWidthHistory.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    return Math.max(0, Math.min(1, 1 - (cv / this.STABILITY_THRESHOLD)));
  }

  private getFaceHeight(landmarks: Landmark[]): number {
    return this.euclideanDistance(landmarks[152], landmarks[10]);
  }

  private euclideanDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );
  }

  private emit(event: string, detail: any) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
```

---

## 6. RENDERIZAÇÃO DE OPTOTIPOS

### 6.1 Layout Horizontal logMAR

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ESCALA logMAR PADRÃO                              │
├─────────────────────────────────────────────────────────────────────┤
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
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Implementação

```typescript
// ============================================
// MÓDULO: OptotypeRenderer
// ============================================

interface OptotypeConfig {
  fontFamily: string;
  lettersPerLine: number;
  gapRatio: number;
  lineSpacing: number;
  baseDistanceMeters: number;
  baseSizeMm: number;
}

class OptotypeRenderer {
  private config: OptotypeConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentScale = 1.0;
  private readonly SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];

  constructor(canvas: HTMLCanvasElement, config: OptotypeConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
  }

  updateScale(scale: number): void {
    const alpha = 0.2;
    this.currentScale = alpha * scale + (1 - alpha) * this.currentScale;
  }

  renderLine(logMAR: number, targetIndex: number, trackingResult: TrackingResult): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const baseSize_px = this.mmToPixels(this.config.baseSizeMm);
    const multiplier = Math.pow(10, -logMAR);
    const fontSize_px = baseSize_px * multiplier * this.currentScale;

    const letters = this.generateRandomLetters(this.config.lettersPerLine);
    const gap_px = fontSize_px * this.config.gapRatio;

    const centerX = this.canvas.width / 2;
    const totalWidth = (letters.length * fontSize_px) + ((letters.length - 1) * gap_px);
    let startX = centerX - (totalWidth / 2);

    this.ctx.font = `700 ${fontSize_px}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const alpha = 0.3 + (trackingResult.stability * 0.7);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

    for (let i = 0; i < letters.length; i++) {
      const x = startX + (i * (fontSize_px + gap_px)) + (fontSize_px / 2);
      const y = this.canvas.height / 2;

      if (i === targetIndex) {
        this.ctx.fillStyle = `rgba(0, 122, 255, ${alpha})`;
      }

      this.ctx.fillText(letters[i], x, y);

      if (i === targetIndex) {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      }
    }

    // Label Snellen
    this.ctx.font = `${fontSize_px * 0.25}px Arial`;
    this.ctx.fillStyle = `rgba(100, 100, 100, ${alpha * 0.7})`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.logMARToSnellen(logMAR), startX + totalWidth + 20, this.canvas.height / 2);

    // Overlay de status
    this.renderStatusOverlay(trackingResult);
  }

  private renderStatusOverlay(tracking: TrackingResult): void {
    const barWidth = 150;
    const barHeight = 6;
    const barX = this.canvas.width - barWidth - 10;
    const barY = 10;

    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const color = tracking.isInRange ? '#4CAF50' : '#F44336';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(barX, barY, barWidth * tracking.stability, barHeight);

    this.ctx.font = '10px Arial';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      tracking.isInRange ? '✓ Posicionado' : '⚠ Reposicione',
      barX - 5,
      barY + barHeight + 10
    );
  }

  private mmToPixels(mm: number): number {
    const ppi = window.devicePixelRatio * 96;
    return (mm / 25.4) * ppi;
  }

  private logMARToSnellen(logMAR: number): string {
    return `20/${Math.round(20 * Math.pow(10, logMAR))}`;
  }

  private generateRandomLetters(count: number): string[] {
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * this.SLOAN_LETTERS.length);
      letters.push(this.SLOAN_LETTERS[idx]);
    }
    return letters;
  }
}
```

---

## 7. RECONHECIMENTO DE VOZ

### 7.1 Problema Atual
O microfone cai imediatamente para fallback (digitação manual), indicando falha na API de reconhecimento de voz.

### 7.2 Solução: Retry + Permissão Explícita + Fallback Manual

```typescript
// ============================================
// MÓDULO: VoiceRecognitionEngine
// ============================================

interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

class VoiceRecognitionEngine extends EventTarget {
  private recognition: SpeechRecognition | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private isListening = false;
  private fallbackMode = false;
  private readonly TIMEOUT_MS = 10000;

  constructor() {
    super();
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      this.fallbackMode = true;
      return;
    }

    this.recognition = new SR();
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
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
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

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      this.fallbackMode = true;
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.fallbackMode) {
      this.emit('fallbackMode');
      return;
    }

    if (this.isListening) return;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      this.emit('permissionDenied');
      return;
    }

    try {
      this.recognition?.start();
      this.isListening = true;
      this.emit('listeningStarted');

      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          this.emit('timeout');
        }
      }, this.TIMEOUT_MS);

    } catch (error) {
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

  private emit(event: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
```

---

## 8. ESTRUTURA DE LOGS E TELEMETRIA

### 8.1 Propósito
A bancada coleta logs detalhados de cada sessão para:
- Calibrar e refinar o algoritmo de distância
- Identificar padrões de drift por dispositivo
- Ajustar parâmetros de tolerância
- Criar datasets para treinamento de modelos futuros

### 8.2 Estrutura de Log

```typescript
interface SessionLog {
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    screenDiagonalInches: number;
    devicePixelRatio: number;
    model?: string;
    focalLength?: number;
  };
  calibration: {
    ipd_ref_px: number;
    faceWidth_ref_px: number;
    faceHeight_ref_px: number;
    biometric_ratio: number;
    scale_comfort: number;
    timestamp: number;
  };
  rounds: RoundLog[];
  telemetry: TelemetryFrame[];
  summary: {
    startTime: number;
    endTime: number;
    totalDurationMs: number;
    finalLogMAR: number;
    finalSnellen: string;
    averageResponseTimeMs: number;
    voiceFallbackCount: number;
    recalibrationCount: number;
    driftEvents: number;
  };
}

interface RoundLog {
  roundIndex: number;
  logMAR: number;
  angleArcmin: number;
  targetLetter: string;
  displayLetters: string[];
  targetIndex: number;
  response: {
    correct: boolean;
    source: "voz" | "manual";
    responseTimeMs: number;
    recognizedText?: string;
    confidence?: number;
  };
  distanceAtPresentation: number;
  scaleAtPresentation: number;
  stabilityAtPresentation: number;
}
```

### 8.3 Implementação

```typescript
class SessionLogger extends EventTarget {
  private sessionId: string;
  private log: SessionLog;
  private telemetryBuffer: TelemetryFrame[] = [];
  private readonly TELEMETRY_BATCH_SIZE = 30;
  private ws: WebSocket | null = null;

  constructor(sessionId: string, wsUrl: string) {
    super();
    this.sessionId = sessionId;
    this.log = this.createInitialLog();
    this.connectWebSocket(wsUrl);
  }

  private createInitialLog(): SessionLog {
    return {
      sessionId: this.sessionId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenDiagonalInches: this.estimateScreenDiagonal(),
        devicePixelRatio: window.devicePixelRatio,
      },
      calibration: {} as any,
      rounds: [],
      telemetry: [],
      summary: {
        startTime: Date.now(),
        endTime: 0,
        totalDurationMs: 0,
        finalLogMAR: 0,
        finalSnellen: '',
        averageResponseTimeMs: 0,
        voiceFallbackCount: 0,
        recalibrationCount: 0,
        driftEvents: 0,
      }
    };
  }

  logCalibration(calibration: CalibrationState): void {
    this.log.calibration = {
      ipd_ref_px: calibration.ipd_ref_px,
      faceWidth_ref_px: calibration.faceWidth_ref_px,
      faceHeight_ref_px: calibration.faceHeight_ref_px,
      biometric_ratio: calibration.biometric_ratio,
      scale_comfort: calibration.scale_comfort,
      timestamp: calibration.timestamp,
    };
    this.emit('calibrationLogged', this.log.calibration);
  }

  logRound(round: RoundLog): void {
    this.log.rounds.push(round);
    this.emit('roundLogged', round);
    this.sendToBancada({ type: 'exam_event', sessionId: this.sessionId, event: round });
  }

  logTelemetry(frame: TelemetryFrame): void {
    this.telemetryBuffer.push(frame);
    if (this.telemetryBuffer.length >= this.TELEMETRY_BATCH_SIZE) {
      this.flushTelemetry();
    }
  }

  private flushTelemetry(): void {
    const batch = this.telemetryBuffer.splice(0, this.TELEMETRY_BATCH_SIZE);
    this.log.telemetry.push(...batch);
    this.sendToBancada({ type: 'telemetry', sessionId: this.sessionId, frames: batch });
  }

  finish(result: { logMAR: number; snellen: string }): void {
    this.log.summary.endTime = Date.now();
    this.log.summary.totalDurationMs = this.log.summary.endTime - this.log.summary.startTime;
    this.log.summary.finalLogMAR = result.logMAR;
    this.log.summary.finalSnellen = result.snellen;

    const responseTimes = this.log.rounds.map(r => r.response.responseTimeMs);
    this.log.summary.averageResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    this.flushTelemetry();
    this.sendToBancada({ type: 'exam_event', sessionId: this.sessionId, event: { kind: 'test_finished', result } });
    this.saveToLocalStorage();
  }

  private connectWebSocket(wsUrl: string): void {
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => this.emit('connected');
    this.ws.onerror = (e) => this.emit('connectionError', e);
  }

  private sendToBancada(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private saveToLocalStorage(): void {
    const key = `visao_session_${this.sessionId}`;
    localStorage.setItem(key, JSON.stringify(this.log));
  }

  private estimateScreenDiagonal(): number {
    const widthMm = window.screen.width / window.devicePixelRatio * 25.4 / 96;
    const heightMm = window.screen.height / window.devicePixelRatio * 25.4 / 96;
    return Math.sqrt(widthMm ** 2 + heightMm ** 2) / 25.4;
  }

  getLog(): SessionLog { return this.log; }

  private emit(event: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
```

---

## 9. STACK TECNOLÓGICO

### 9.1 Mobile (Exame)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Framework** | React 18+ | Componentização, hooks |
| **Linguagem** | TypeScript | Tipagem forte |
| **Face Detection** | MediaPipe Face Mesh | 468 landmarks, real-time |
| **Canvas** | HTML5 Canvas 2D | Renderização performática |
| **Build** | Vite | Build rápido, HMR |
| **Estado** | Zustand | Leve, simples |
| **Voz** | Web Speech API | Nativo, sem dependências |
| **Estilos** | Tailwind CSS | Utility-first |
| **Comunicação** | Socket.io | Real-time, rooms |

### 9.2 Bancada (Desktop)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Framework** | React 18+ | Consistência |
| **Gráficos** | Chart.js / D3.js | Visualização de métricas |
| **Tabela** | TanStack Table | Logs performáticos |
| **Build** | Vite | Consistência |
| **Estado** | Zustand | Consistência |
| **Estilos** | Tailwind CSS | Consistência |
| **Comunicação** | Socket.io | Real-time |

### 9.3 Servidor (Relay)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Runtime** | Node.js | Ecossistema JS |
| **WebSocket** | Socket.io | Rooms, fallback |

---

## 10. ESTRUTURA DE DIRETÓRIOS

```
visao-acuidade-visual/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
│
├── apps/
│   ├── mobile/                    # 📱 Exame (smartphone)
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ExamCard.tsx
│   │   │   │   ├── CameraCard.tsx
│   │   │   │   ├── DockMobile.tsx
│   │   │   │   ├── CalibrationOverlay.tsx
│   │   │   │   ├── OptotypeCanvas.tsx
│   │   │   │   └── VoiceIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCalibration.ts
│   │   │   │   ├── useTracking.ts
│   │   │   │   ├── useVoiceRecognition.ts
│   │   │   │   ├── useExamState.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   ├── engine/
│   │   │   │   ├── CalibrationEngine.ts
│   │   │   │   ├── HybridTrackingEngine.ts
│   │   │   │   ├── OptotypeRenderer.ts
│   │   │   │   ├── VoiceRecognitionEngine.ts
│   │   │   │   ├── SessionLogger.ts
│   │   │   │   └── StaircaseSession.ts
│   │   │   ├── utils/
│   │   │   │   ├── math.ts
│   │   │   │   ├── geometry.ts
│   │   │   │   └── constants.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── styles/
│   │   │       └── mobile.css
│   │   └── public/
│   │
│   └── bancada/                   # 💻 Painel técnico (desktop)
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── VideoStream.tsx
│       │   │   ├── MetricsPanel.tsx
│       │   │   ├── DriftChart.tsx
│       │   │   ├── RoundLogs.tsx
│       │   │   ├── CalibrationControls.tsx
│       │   │   └── SessionManager.tsx
│       │   ├── hooks/
│       │   │   ├── useSessionConnection.ts
│       │   │   ├── useTelemetry.ts
│       │   │   └── useWebSocket.ts
│       │   ├── engine/
│       │   │   ├── TelemetryProcessor.ts
│       │   │   ├── LogExporter.ts
│       │   │   └── AlgorithmCalibrator.ts
│       │   ├── utils/
│       │   │   └── chartHelpers.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── styles/
│       │       └── bancada.css
│       └── public/
│
├── packages/
│   ├── shared/                    # 📦 Código compartilhado
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── websocket.ts
│   │   │   │   ├── exam.ts
│   │   │   │   └── telemetry.ts
│   │   │   ├── constants/
│   │   │   │   └── logMAR.ts
│   │   │   └── utils/
│   │   │       └── validators.ts
│   │   └── package.json
│   │
│   └── mediapipe-wrapper/         # 📦 Wrapper do MediaPipe
│       ├── src/
│       │   ├── FaceMeshDetector.ts
│       │   └── types.ts
│       └── package.json
│
└── server/                          # 🖥️ Servidor WebSocket
    ├── src/
    │   ├── index.ts
    │   ├── roomManager.ts
    │   └── messageRouter.ts
    └── package.json
```

---

## 11. APIs E CONTRATOS

### 11.1 MediaPipe Face Mesh — Landmarks

```typescript
const LANDMARKS = {
  LEFT_PUPIL: 468,
  RIGHT_PUPIL: 473,
  LEFT_EAR: 127,
  RIGHT_EAR: 356,
  CHIN: 152,
  FOREHEAD: 10,
  NOSE_TIP: 1,
} as const;
```

### 11.2 Contrato WebSocket

```typescript
// Mobile → Bancada
interface MobileToBancada {
  'telemetry': TelemetryFrame[];
  'exam_event': ExamEvent;
  'video_frame': { imageData: string };
}

// Bancada → Mobile
interface BancadaToMobile {
  'control': ControlCommand;
  'calibration_data': CalibrationData;
}
```

---

## 12. FLUXO COMPLETO

### 12.1 Estados da UI Mobile

```
iniciando
    │
    ▼
aguardando_rosto ──(rosto detectado)──▶ estabilizando
    │                                        │
    │                                        ▼
    │                              fora_do_alcance_perto/longe
    │                                        │
    │                                        ▼
    │                              enquadramento_ruim
    │                                        │
    └────────────────────────────────────────┘
                                             │
                                             ▼
                                    pronto_para_iniciar
                                             │
                                    (clique "Iniciar")
                                             │
                                             ▼
                                          em_teste
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
            ouvindo_resposta         alerta_movimento      rosto_perdido_durante_teste
                    │                        │                        │
                    ▼                        │                        │
            resposta_ambigua                 │                        │
                    │                        │                        │
                    └────────────────────────┘                        │
                                             │                        │
                                             ▼                        ▼
                                    recalibrando_durante_teste
                                             │
                                             ▼
                                         finalizado
                                             │
                                             ▼
                                        erro_camera
                                        erro_microfone
```

### 12.2 Algoritmo Staircase

```typescript
class StaircaseSession {
  private currentLogMAR = 1.0;  // Começa em 20/200
  private consecutiveCorrect = 0;
  private consecutiveWrong = 0;
  private reversals = 0;
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
    if (this.lastDirection === 'up') this.reversals++;
    this.lastDirection = 'down';
    this.currentLogMAR = newLogMAR;
  }

  private moveUp(): void {
    const newLogMAR = Math.min(1.0, this.currentLogMAR + this.STEP);
    if (this.lastDirection === 'down') this.reversals++;
    this.lastDirection = 'up';
    this.currentLogMAR = newLogMAR;
  }

  isComplete(): boolean {
    return this.reversals >= this.MAX_REVERSALS;
  }
}
```

---

## 13. CONSIDERAÇÕES DE IMPLEMENTAÇÃO

### 13.1 Performance
- MediaPipe Face Mesh: ~30fps em smartphones modernos
- Tracking híbrido reduz carga de CPU
- Canvas 2D mais performático que DOM
- Telemetria em batches de 30 frames

### 13.2 Compatibilidade
- MediaPipe requer WebGL
- Web Speech API melhor no Chrome/Android
- iOS/Safari: fallback manual sempre disponível
- Câmera frontal obrigatória

### 13.3 Precisão
- Razão biométrica varia ~5% entre indivíduos
- Erro de distância: ±2-3cm com tracking híbrido
- Fator de correção por dispositivo ajustável via bancada

### 13.4 UX/UI
- Overlay de guia: vermelha → verde quando estável
- Feedback visual imediato para voz
- Animação suave no redimensionamento
- Modo escuro disponível
- Botões manuais sempre visíveis
- Fonte Sloan para optotipos

---

## 14. CRONOGRAMA

| Semana | Foco | Entregáveis |
|--------|------|-------------|
| **1** | Fundação | Monorepo, shared types, MediaPipe wrapper, servidor WS |
| **2** | Mobile Core | Câmera, CalibrationEngine, HybridTrackingEngine, renderer |
| **3** | Mobile UX | Layout horizontal, dock, estados da UI, animações |
| **4** | Mobile Voz | VoiceRecognitionEngine, retry, fallback, integração |
| **5** | Bancada Core | Conexão WS, stream de vídeo, painel de métricas |
| **6** | Bancada Logs | Tabela de rodadas, gráficos, exportação de datasets |
| **7** | Integração | Teste end-to-end, ajuste de parâmetros em tempo real |
| **8** | Polimento | Performance, testes multi-dispositivo, documentação |

---

## 15. MIGRAÇÃO DA BASE ATUAL

### 15.1 O que Reaproveitar
| Componente | Reaproveitar? | Como |
|------------|--------------|------|
| `camera.ts` | ✅ Sim | Mover para `packages/mediapipe-wrapper` |
| `voice-input.ts` | ✅ Sim | Refatorar para `VoiceRecognitionEngine` |
| `shared.css` | ✅ Sim | Manter como base de tokens |
| `exam.css` | ⚠️ Parcial | Extrair tokens, reescrever layout |
| `exam-page.ts` | ❌ Não | Reescrever com nova arquitetura |
| `bancada.ts` | ❌ Não | Reescrever com WebSocket e telemetria |

### 15.2 O que Descartar
- Algoritmo de distância por íris puro → tracking híbrido
- Layout vertical de optotipos → horizontal logMAR
- Distância congelada no início → recalibração dinâmica
- Bancada sem comunicação → WebSocket em tempo real

---

## ANEXO A: CONSTANTES DO SISTEMA

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `STABILITY_THRESHOLD` | 60 frames | Frames para calibração (~2s) |
| `HISTORY_SIZE` | 10 | Janela de suavização |
| `EMA_ALPHA` | 0.3 | Fator de suavização |
| `MIN_SCALE` | 0.7 | Escala mínima aceitável |
| `MAX_SCALE` | 3.0 | Escala máxima aceitável |
| `OUT_OF_RANGE_TOLERANCE` | 90 frames | Tolerância antes de alertar (~3s) |
| `VOICE_RETRY_MAX` | 3 | Tentativas de voz |
| `VOICE_TIMEOUT_MS` | 10000 | Timeout de voz |
| `STEP_logMAR` | 0.1 | Passo entre linhas |
| `LETTERS_PER_LINE` | 5 | Letras por linha |
| `GAP_RATIO` | 1.0 | Gap = largura da letra |
| `LINE_SPACING` | 1.5 | Espaço entre linhas |
| `MAX_REVERSALS` | 3 | Reversões para encerrar |
| `CONSECUTIVE_CORRECT` | 3 | Acertos para descer |
| `CONSECUTIVE_WRONG` | 2 | Erros para subir |
| `DISTANCE_DRIFT_WARN_MM` | 20 | Drift leve |
| `DISTANCE_DRIFT_SEVERE_MM` | 45 | Drift severo |
| `TELEMETRY_BATCH_SIZE` | 30 | Frames por batch |

---

*Documento gerado em 17 de Julho de 2026*  
*Arquitetura v3.0 — Reconstrução Completa*  
*Exame de Acuidade Visual Assistido por IA*
