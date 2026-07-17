# 📎 ADENDO DE DESIGN E INTERFACE
# Exame de Acuidade Visual Assistido por IA — Alinhamento SaúdeSeg+

**Versão:** 1.0  
**Data:** 17 de Julho de 2026  
**Status:** Adendo ao Documento de Arquitetura v3.0  

---

## 📑 ÍNDICE

1. [Identidade Visual SaúdeSeg+](#1-identidade-visual-saudeseg)
2. [Tokens de Design Aplicados](#2-tokens-de-design-aplicados)
3. [Interface Mobile (Exame)](#3-interface-mobile-exame)
4. [Interface Bancada (Desktop)](#4-interface-bancada-desktop)
5. [Componentes Específicos do Exame](#5-componentes-específicos-do-exame)
6. [Animações e Micro-interações](#6-animações-e-micro-interações)
7. [Acessibilidade Clínica](#7-acessibilidade-clínica)
8. [Assets e Recursos](#8-assets-e-recursos)

---

## 1. IDENTIDADE VISUAL SAÚDESEG+

### 1.1 Contexto
O exame de acuidade visual é um **módulo dentro da plataforma SaúdeSeg+**. A interface deve seguir fielmente o design system existente, mantendo consistência visual com o restante da plataforma (login, dashboard, gestão de ASOs, etc.).

### 1.2 Princípios Herdados do SaúdeSeg+

| Princípio | Aplicação no Exame |
|-----------|-------------------|
| **Clean Clinical Aesthetic** | Interface limpa, sem ruído visual. Foco total no optotipo |
| **Neumorfismo Leve** | Cartões com sombras suaves, bordas arredondadas |
| **Acessibilidade First** | WCAG AA, contraste máximo no optotipo, touch targets 44px+ |
| **Mobile-First** | O exame é mobile-native. Thumb zone friendly |
| **Multi-tenant** | Branding configurável por empresa/clínica |

### 1.3 Paleta de Cores — Adaptação para o Exame

```typescript
// ============================================
// CORES DO EXAME (herdadas do SaúdeSeg+)
// ============================================

export const examColors = {
  // ===== BRAND / PRIMARY (igual ao SaúdeSeg+) =====
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',   // ← Azul principal SaúdeSeg+
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    DEFAULT: '#3B82F6',
    foreground: '#FFFFFF',
    soft: 'rgba(59, 130, 246, 0.12)',
  },

  // ===== NEUTRAL / GRAY SCALE (slate) =====
  neutral: {
    0:   '#FFFFFF',
    50:  '#F8FAFC',   // Fundo principal
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // ===== SEMANTIC STATUS (igual ao SaúdeSeg+) =====
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    DEFAULT: '#22C55E',
    foreground: '#FFFFFF',
    soft: 'rgba(34, 197, 94, 0.12)',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    DEFAULT: '#F59E0B',
    foreground: '#1F2937',
    soft: 'rgba(245, 158, 11, 0.12)',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    DEFAULT: '#EF4444',
    foreground: '#FFFFFF',
    soft: 'rgba(239, 68, 68, 0.12)',
  },

  // ===== ÁREA DO OPTOTIPO — CONTRASTE MÁXIMO =====
  // Esta área NÃO segue o tema — é sempre preto-sobre-branco
  // por requisito clínico (pesquisa: contraste afeta acuidade medida)
  optotype: {
    background: '#FFFFFF',      // Sempre branco puro
    text: '#0F172A',           // Preto slate-900 (não #000000 puro — melhor para olhos)
    targetHighlight: '#3B82F6', // Azul brand para letra alvo (modo debug/operador)
    border: '#E2E8F0',         // Linha de leitura
  },

  // ===== OVERLAYS E GUIAS =====
  overlay: {
    calibration: 'rgba(59, 130, 246, 0.15)',  // Azul translúcido
    calibrationBorder: '#3B82F6',
    stable: 'rgba(34, 197, 94, 0.2)',          // Verde quando estável
    unstable: 'rgba(239, 68, 68, 0.2)',       // Vermelho quando instável
    faceGuide: 'rgba(255, 255, 255, 0.3)',    // Guia facial
  },

  // ===== DOCK E CONTROLES =====
  dock: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
  },
};
```

---

## 2. TOKENS DE DESIGN APLICADOS

### 2.1 Tipografia

```typescript
// ============================================
// TIPOGRAFIA DO EXAME
// ============================================

export const examTypography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    optotype: '"Sloan", "ETDRS", sans-serif',  // Fonte clínica para optotipos
  },

  // Optotipos — tamanhos dinâmicos baseados em logMAR
  optotype: {
    // Tamanhos calculados em tempo real pelo OptotypeRenderer
    // baseSize é definido pela distância e escala logMAR
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '0.05em',  // Crowding clínico
  },

  // UI Text
  ui: {
    title:      { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 },      // 20px
    subtitle:   { fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 },         // 16px
    body:       { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },      // 14px
    caption:    { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.4 },       // 12px
    button:     { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1 },        // 14px
    data:       { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, fontFamily: 'mono' }, // 24px
  },

  // Labels de status
  status: {
    label:      { fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
    value:      { fontSize: '0.875rem', fontWeight: 600 },
  },
};
```

### 2.2 Espaçamento

```typescript
// ============================================
// ESPAÇAMENTO DO EXAME
// ============================================

export const examSpacing = {
  // Layout
  page: {
    horizontal: '1rem',      // 16px
    vertical: '0.75rem',       // 12px
  },

  // Cards
  card: {
    padding: '1.5rem',         // 24px
    gap: '0.75rem',            // 12px
  },

  // Optotipo
  optotype: {
    padding: '2rem',         // 32px — área de respiro visual
    gap: '0.5em',              // Crowding: gap = metade da largura da letra
  },

  // Dock
  dock: {
    padding: '1rem',           // 16px
    gap: '0.5rem',             // 8px entre botões
    safeBottom: 'env(safe-area-inset-bottom)',
  },

  // Camera PiP
  camera: {
    margin: '0.75rem',         // 12px
    borderRadius: '1rem',      // 16px
    height: '200px',             // Altura fixa do card de câmera
  },
};
```

### 2.3 Border Radius

```typescript
// ============================================
// BORDER RADIUS DO EXAME
// ============================================

export const examBorderRadius = {
  // Cards principais
  examCard: '1.75rem',       // 28px — grande, amigável
  cameraCard: '1rem',         // 16px
  dock: '1rem',               // 16px

  // Botões
  button: '0.75rem',          // 12px — padrão SaúdeSeg+
  buttonPill: '9999px',       // Botões de ação principal

  // Optotipo
  optotypeCard: '1rem',       // 16px

  // Overlays
  overlay: '1.5rem',          // 24px
  badge: '9999px',            // Pill

  // Guia de calibração
  calibrationGuide: '50%',    // Círculo/oval
};
```

### 2.4 Sombras (Neumorfismo Leve)

```typescript
// ============================================
// SOMBRAS DO EXAME — Neumorfismo Leve SaúdeSeg+
// ============================================

export const examShadows = {
  // Cards
  examCard: {
    default: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
    hover: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
  },

  // Dock
  dock: {
    default: '0 -4px 6px -1px rgba(15, 23, 42, 0.05), 0 -2px 4px -2px rgba(15, 23, 42, 0.05)',
  },

  // Botões
  button: {
    primary: '0 2px 4px 0 rgba(59, 130, 246, 0.25)',
    success: '0 2px 4px 0 rgba(34, 197, 94, 0.25)',
    danger: '0 2px 4px 0 rgba(239, 68, 68, 0.25)',
  },

  // Camera PiP
  camera: {
    default: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
  },

  // Focus ring (acessibilidade)
  focusRing: '0 0 0 3px rgba(59, 130, 246, 0.4)',
};
```

---

## 3. INTERFACE MOBILE (EXAME)

### 3.1 Estrutura de Tela

```
┌─────────────────────────────────────────┐
│           STATUS BAR (OS)               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │      ÁREA DO OPTOTIPO           │   │ ← Card branco, contraste máximo
│  │                                 │   │
│  │      V  S  D  H  K              │   │ ← 5 letras horizontais
│  │                                 │   │
│  │      ●  ○  ○  ○  ○              │   │ ← Marcadores (alvo destacado)
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📹 CÂMERA (PiP)               │   │ ← Preview com overlay facial
│  │  [overlay de guia]              │   │
│  │  ┌─────────┐                    │   │
│  │  │  😊     │  487mm ✓           │   │ ← Métrica flutuante
│  │  └─────────┘                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  "Diga em voz alta a letra      │   │
│  │   destacada"                    │   │
│  │                                 │   │
│  │  ┌──────────┐  ┌──────────┐    │   │
│  │  │ ✓ Acertei │  │ ✗ Não vi │    │   │ ← Botões manuais sempre visíveis
│  │  └──────────┘  └──────────┘    │   │
│  │                                 │   │
│  │  [🎤 Ouvindo...]               │   │ ← Indicador de voz (quando ativo)
│  └─────────────────────────────────┘   │
│                                         │
│         [ HOME INDICATOR ]              │
└─────────────────────────────────────────┘
```

### 3.2 Estados da Interface

#### Estado: Calibração — Braço Esticado

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │    ┌─────────────────────┐      │   │
│  │    │                     │      │   │
│  │    │    OVAL DE GUIA     │      │   │ ← Overlay azul translúcido
│  │    │    (rosto central)  │      │   │
│  │    │                     │      │   │
│  │    └─────────────────────┘      │   │
│  │                                 │   │
│  │  "Estique o braço ao máximo"    │   │
│  │                                 │   │
│  │  [████████░░░░░░░░░░] 60%       │   │ ← Barra de progresso
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📹 Câmera ativa                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Aguardando calibração...       │   │
│  │  [Botões desabilitados]          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Specs visuais:**
- Overlay de guia: `border: 2px dashed #3B82F6`, `background: rgba(59, 130, 246, 0.1)`
- Quando estável: `border-color: #22C55E`, `background: rgba(34, 197, 94, 0.15)`
- Barra de progresso: `background: #3B82F6`, `border-radius: 9999px`
- Texto instrucional: `font-size: 1rem`, `color: #475569`, `text-align: center`

#### Estado: Em Teste

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │ ← Linha de leitura
│  │                                 │   │
│  │        V     S     D     H     K   │   ← Letras logMAR
│  │                                 │   │
│  │        ●     ○     ○     ○     ○   │   ← Marcadores
│  │                                 │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📹 [preview]        487mm ✓   │   │
│  │  [███████░░░] 94%               │   │ ← Estabilidade
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  "Diga em voz alta a letra      │   │
│  │   destacada"                    │   │
│  │                                 │   │
│  │  ┌────────────┐ ┌────────────┐  │   │
│  │  │ ✓ Acertei  │ │ ✗ Não vi   │  │   │
│  │  │   (verde)  │ │   (vermelho)│  │   │
│  │  └────────────┘ └────────────┘  │   │
│  │                                 │   │
│  │     🎤 Ouvindo...               │   │ ← Pílula pulsante
│  │     [animação de ondas]         │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Specs visuais do optotipo:**
- Background: `#FFFFFF` (sempre)
- Letras: `#0F172A` (preto slate, não puro)
- Gap entre letras: `0.5em` (crowding clínico)
- Marcadores: `8px` círculo, `#3B82F6` quando alvo
- Linha de leitura: `2px solid #E2E8F0`

**Specs visuais dos botões:**
- "Acertei": `background: rgba(34, 197, 94, 0.12)`, `color: #16A34A`, `border-radius: 9999px`
- "Não vi": `background: rgba(239, 68, 68, 0.1)`, `color: #DC2626`, `border-radius: 9999px`
- Altura mínima: `48px` (touch target)

#### Estado: Resultado Final

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │      🎉 Exame Concluído!       │   │
│  │                                 │   │
│  │      ┌─────────────────┐      │   │
│  │      │                 │      │   │
│  │      │   20/25         │      │   │ ← Resultado Snellen
│  │      │   (logMAR 0.1)  │      │   │ ← Resultado logMAR
│  │      │                 │      │   │
│  │      └─────────────────┘      │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐  │   │
│  │  │  Gráfico de desempenho   │  │   │
│  │  │  [mini chart]            │  │   │
│  │  └─────────────────────────┘  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  [🔄 Novo Exame]                │   │
│  │  [📤 Enviar Resultado]          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 3.3 Componentes Mobile — Specs Detalhadas

#### ExamCard (Área do Optotipo)

```typescript
interface ExamCardProps {
  children: ReactNode;
  variant?: 'calibrating' | 'testing' | 'result';
}

// Visual specs
const examCardStyles = {
  background: '#FFFFFF',
  borderRadius: '1.75rem',        // 28px
  padding: '2rem',                 // 32px
  boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
  border: '1px solid #E2E8F0',
  // Quando em teste: sem borda, sombra mais suave
  // Quando calibrando: borda azul tracejada
};
```

#### CameraCard (Preview PiP)

```typescript
interface CameraCardProps {
  videoRef: RefObject<HTMLVideoElement>;
  overlay?: 'guide' | 'tracking' | 'none';
  metrics?: {
    distanceMm: number | null;
    stability: number;
    isInRange: boolean;
  };
}

// Visual specs
const cameraCardStyles = {
  background: '#000000',
  borderRadius: '1rem',           // 16px
  height: '200px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
  position: 'relative',
};

// Métrica flutuante
const metricsOverlayStyles = {
  position: 'absolute',
  bottom: '12px',
  right: '12px',
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(8px)',
  borderRadius: '9999px',
  padding: '6px 12px',
  color: '#FFFFFF',
  fontSize: '0.75rem',
  fontFamily: 'monospace',
};
```

#### DockMobile (Barra de Ações)

```typescript
interface DockMobileProps {
  state: 'waiting' | 'listening' | 'answering' | 'finished';
  onCorrect: () => void;
  onIncorrect: () => void;
  onStart: () => void;
  voiceEnabled: boolean;
}

// Visual specs
const dockStyles = {
  background: '#FFFFFF',
  borderRadius: '1rem',           // 16px
  padding: '1rem',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
  boxShadow: '0 -4px 6px -1px rgba(15, 23, 42, 0.05), 0 -2px 4px -2px rgba(15, 23, 42, 0.05)',
  border: '1px solid #E2E8F0',
  margin: '0 0.75rem 0.75rem',
};
```

#### VoiceIndicator (Pílula de Voz)

```typescript
interface VoiceIndicatorProps {
  state: 'idle' | 'listening' | 'processing' | 'error';
}

// Visual specs
const voiceIndicatorStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  background: '#3B82F6',
  color: '#FFFFFF',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  animation: 'pulse 1.5s ease-in-out infinite',
};

// Animação de ondas
const waveAnimation = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.02); }
  }
`;
```

---

## 4. INTERFACE BANCADA (DESKTOP)

### 4.1 Estrutura de Tela

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏥 SaúdeSeg+  >  Exame de Acuidade Visual  >  Sessão #550e8400            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │                            │  │         MÉTRICAS EM TEMPO REAL       │  │
│  │   STREAM DE VÍDEO          │  ├──────────────────────────────────────┤  │
│  │   (do celular)             │  │                                      │  │
│  │                            │  │  Distância        487 mm     ✓       │  │
│  │  ┌────────────────────┐   │  │  ━━━━━━━━━━━━━━  [███████░░░]        │  │
│  │  │                    │   │  │                                      │  │
│  │  │   [rosto com       │   │  │  Escala           1.43x              │  │
│  │  │    landmarks]      │   │  │  ━━━━━━━━━━━━━━  [████████░░]        │  │
│  │  │                    │   │  │                                      │  │
│  │  │   overlay:         │   │  │  Estabilidade     94%                │  │
│  │  │   • face mesh      │   │  │  ━━━━━━━━━━━━━━  [█████████░]       │  │
│  │  │   • pupils         │   │  │                                      │  │
│  │  │   • distance ring  │   │  │  IPD Estimado     63.2 mm            │  │
│  │  └────────────────────┘   │  │  FaceWidth        312 px             │  │
│  │                            │  │                                      │  │
│  │  [▶] [⏸] [⏹]             │  └──────────────────────────────────────┘  │
│  └────────────────────────────┘                                             │
│                                                                             │
│  ┌────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   GRÁFICO DE DRIFT         │  │         LOGS POR RODADA              │  │
│  │                            │  ├──────────────────────────────────────┤  │
│  │  distância (mm)            │  │  #  │ Letras      │ Alvo │ Res │ Tempo│  │
│  │  500 ┤    ╭─╮             │  │─────┼─────────────┼──────┼─────┼──────│  │
│  │  480 ┤   ╱   ╲            │  │  0  │ V·S·D·H·K  │  V   │  ✓  │ 852ms│  │
│  │  460 ┤──╱     ╲────       │  │  1  │ O·R·Z·N·C  │  N   │  ✗  │1203ms│  │
│  │  440 ┤╱           ╲       │  │  2  │ D·H·K·V·S  │  S   │  ✓  │ 634ms│  │
│  │      └────────────────     │  │  3  │ ...        │  ... │  ...│  ... │  │
│  │         0  5  10  15s      │  └──────────────────────────────────────┘  │
│  │                            │                                             │
│  │  [linha de referência]     │  ┌──────────────────────────────────────┐  │
│  │  [área de tolerância]      │  │    PARÂMETROS DO ALGORITMO            │  │
│  └────────────────────────────┘  ├──────────────────────────────────────┤  │
│                                  │  • Fator de correção:     [1.00  ▲▼]  │  │
│  ┌────────────────────────────┐  │  • Tolerância drift:      [20mm  ▲▼]  │  │
│  │   CONTROLES                │  │  • Threshold estabilidade: [60   ▲▼]  │  │
│  │                            │  │  • Escala mínima:         [0.7  ▲▼]  │  │
│  │  [📊 Exportar Dataset]      │  │  • Escala máxima:         [3.0  ▲▼]  │  │
│  │  [🔄 Resetar Sessão]       │  │                                       │  │
│  │  [⚙️  Configurações]       │  │  [💾 Salvar Perfil]  [📤 Exportar]     │  │
│  └────────────────────────────┘  └──────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes Bancada — Specs Detalhadas

#### MetricsPanel

```typescript
interface MetricsPanelProps {
  metrics: {
    distanceMm: number | null;
    scaleCurrent: number;
    stability: number;
    ipdEstimated: number;
    faceWidthPx: number;
    isInRange: boolean;
  };
}

// Visual specs
const metricsPanelStyles = {
  background: '#FFFFFF',
  borderRadius: '1rem',
  padding: '1.5rem',
  boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.08)',
  border: '1px solid #E2E8F0',
};

// Barra de progresso
const progressBarStyles = {
  height: '8px',
  borderRadius: '9999px',
  background: '#E2E8F0',
  fill: '#3B82F6',  // ou #22C55E quando ok
};
```

#### DriftChart

```typescript
interface DriftChartProps {
  data: Array<{
    timestamp: number;
    distanceMm: number;
    referenceDistanceMm: number;
  }>;
  toleranceMm: number;
}

// Visual specs
const chartStyles = {
  background: '#FFFFFF',
  borderRadius: '1rem',
  padding: '1.5rem',
  height: '250px',
  // Linha principal: #3B82F6
  // Linha de referência: #94A3B8 (tracejada)
  // Área de tolerância: rgba(34, 197, 94, 0.1)
  // Fora de tolerância: rgba(239, 68, 68, 0.1)
};
```

#### RoundLogsTable

```typescript
interface RoundLogsTableProps {
  rounds: RoundLog[];
  onSelectRound?: (round: RoundLog) => void;
}

// Visual specs — segue Table do SaúdeSeg+
const tableStyles = {
  headerHeight: '48px',
  rowHeight: '52px',
  headerBackground: '#F8FAFC',
  rowHover: '#F8FAFC',
  border: '#E2E8F0',
  // Acerto: background rgba(34, 197, 94, 0.08)
  // Erro: background rgba(239, 68, 68, 0.08)
};
```

---

## 5. COMPONENTES ESPECÍFICOS DO EXAME

### 5.1 CalibrationOverlay (Overlay de Calibração)

```typescript
interface CalibrationOverlayProps {
  phase: 'step1_reference' | 'step2_comfort' | 'complete';
  progress: number;  // 0-100
  stability: number; // 0-1
}

// Visual specs
const calibrationOverlayStyles = {
  // Guia facial (oval)
  guide: {
    border: '2px dashed #3B82F6',
    background: 'rgba(59, 130, 246, 0.08)',
    borderRadius: '50%',
    transition: 'all 300ms ease',
  },
  // Quando estável
  guideStable: {
    border: '2px solid #22C55E',
    background: 'rgba(34, 197, 94, 0.12)',
  },
  // Cruz central
  crosshair: {
    color: '#3B82F6',
    opacity: 0.5,
  },
  // Barra de progresso
  progressBar: {
    height: '6px',
    borderRadius: '9999px',
    background: '#E2E8F0',
    fill: '#3B82F6',
    transition: 'width 100ms linear',
  },
};
```

### 5.2 OptotypeDisplay (Display de Optotipos)

```typescript
interface OptotypeDisplayProps {
  letters: string[];
  targetIndex: number;
  fontSize: number;  // em pixels, calculado dinamicamente
  logMAR: number;
  snellen: string;
  showTarget?: boolean;  // true para debug/operador
}

// Visual specs
const optotypeStyles = {
  container: {
    background: '#FFFFFF',        // SEMPRE branco
    borderRadius: '1rem',
    padding: '2rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5em',                  // Crowding clínico
    minHeight: '120px',
    borderBottom: '2px solid #E2E8F0',  // Linha de leitura
  },
  letter: {
    fontFamily: '"Sloan", sans-serif',
    fontWeight: 700,
    color: '#0F172A',             // Preto slate (não puro)
    lineHeight: 1,
    textAlign: 'center',
  },
  marker: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'transparent',
    transition: 'all 150ms ease',
    marginTop: '8px',
  },
  markerActive: {
    background: '#3B82F6',
    transform: 'scale(1.2)',
  },
  targetHighlight: {
    color: '#3B82F6',              // Azul brand (apenas para debug)
  },
};
```

### 5.3 StabilityIndicator (Indicador de Estabilidade)

```typescript
interface StabilityIndicatorProps {
  stability: number;  // 0-1
  isInRange: boolean;
}

// Visual specs
const stabilityStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  // Estados
  stable: {
    background: 'rgba(34, 197, 94, 0.12)',
    color: '#16A34A',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.12)',
    color: '#B45309',
  },
  unstable: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#DC2626',
  },
  // Barra
  bar: {
    width: '60px',
    height: '4px',
    borderRadius: '9999px',
    background: '#E2E8F0',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 200ms ease',
  },
};
```

### 5.4 ResultCard (Card de Resultado)

```typescript
interface ResultCardProps {
  snellen: string;
  logMAR: number;
  decimal: number;
  rounds: RoundLog[];
  chartData: any[];
}

// Visual specs
const resultCardStyles = {
  container: {
    background: '#FFFFFF',
    borderRadius: '1.75rem',
    padding: '2rem',
    boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.08)',
    border: '1px solid #E2E8F0',
    textAlign: 'center',
  },
  snellenValue: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#0F172A',
    lineHeight: 1.1,
  },
  logMARValue: {
    fontSize: '1.25rem',
    fontWeight: 500,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  chart: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#F8FAFC',
    borderRadius: '1rem',
  },
};
```

---

## 6. ANIMAÇÕES E MICRO-INTERAÇÕES

### 6.1 Animações do Exame

```typescript
// ============================================
// ANIMAÇÕES — motion.ts (extensão do SaúdeSeg+)
// ============================================

export const examAnimations = {
  // Transição entre estados da UI
  stateTransition: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Calibração — pulso do overlay
  calibrationPulse: {
    duration: '1.5s',
    easing: 'ease-in-out',
    keyframes: `
      0%, 100% { opacity: 0.08; }
      50% { opacity: 0.15; }
    `,
  },

  // Progresso de estabilidade
  stabilityFill: {
    duration: '100ms',
    easing: 'linear',
  },

  // Optotipo — aparecimento suave
  optotypeAppear: {
    duration: '200ms',
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    keyframes: `
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    `,
  },

  // Optotipo — redimensionamento (quando escala muda)
  optotypeResize: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Indicador de voz — pulso
  voicePulse: {
    duration: '1.5s',
    easing: 'ease-in-out',
    keyframes: `
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.02); }
    `,
  },

  // Ondas do microfone
  voiceWaves: {
    duration: '1s',
    easing: 'ease-in-out',
    keyframes: `
      0%, 100% { height: 4px; }
      50% { height: 16px; }
    `,
  },

  // Botão pressionado
  buttonPress: {
    duration: '100ms',
    easing: 'ease-out',
    transform: 'scale(0.97)',
  },

  // Resultado — contagem animada
  resultCount: {
    duration: '800ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Shake de erro
  shake: {
    duration: '400ms',
    keyframes: `
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    `,
  },

  // Toast/alerta
  toastEnter: {
    duration: '300ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: `
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    `,
  },

  toastExit: {
    duration: '200ms',
    easing: 'ease-in',
    keyframes: `
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    `,
  },
};
```

### 6.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .calibration-pulse,
  .voice-pulse,
  .voice-waves,
  .optotype-appear,
  .optotype-resize {
    animation: none !important;
    transition: none !important;
  }

  .button-press:active {
    transform: none;
  }
}
```

---

## 7. ACESSIBILIDADE CLÍNICA

### 7.1 Requisitos Específicos do Exame

| Requisito | Especificação | Justificativa |
|-----------|---------------|---------------|
| **Contraste do optotipo** | ≥ 21:1 (preto #0F172A sobre branco #FFFFFF) | Pesquisa: contraste reduzido piora acuidade medida em até 2.5 linhas logMAR |
| **Área do optotipo** | Sempre branco puro, nunca colorida | Evita interferência na medição |
| **Touch targets** | ≥ 48×48px | HIG/WCAG — paciente pode ter tremor |
| **Feedback de voz** | Visual + sonoro (opcional) | Pacientes com deficiência auditiva |
| **Modo escuro** | Desabilitado durante o exame | Fundo escuro altera percepção de contraste |
| **Brilho da tela** | Sugerir 100% antes do exame | Garantir contraste máximo |
| **Orientação** | Bloquear em portrait | Consistência da distância |
| **Zoom do sistema** | Suportar até 200% | Acessibilidade visual |

### 7.2 ARIA e Screen Reader

```typescript
// ARIA patterns específicos do exame
const examAria = {
  examCard: {
    role: 'region',
    ariaLabel: 'Área do teste de acuidade visual',
    ariaLive: 'polite',
  },
  optotypeLetter: {
    role: 'img',
    ariaLabel: (letter: string) => `Letra ${letter}`,
  },
  calibrationOverlay: {
    role: 'progressbar',
    ariaLabel: 'Progresso da calibração',
    ariaValueMin: 0,
    ariaValueMax: 100,
    ariaValueNow: 'progress',
  },
  voiceIndicator: {
    role: 'status',
    ariaLive: 'polite',
    ariaLabel: 'Ouvindo sua resposta',
  },
  stabilityIndicator: {
    role: 'meter',
    ariaLabel: 'Estabilidade do posicionamento',
    ariaValueMin: 0,
    ariaValueMax: 100,
    ariaValueNow: 'stability',
  },
  resultCard: {
    role: 'alert',
    ariaLive: 'assertive',
    ariaLabel: 'Resultado do exame',
  },
};
```

---

## 8. ASSETS E RECURSOS

### 8.1 Ícones (Lucide React)

```typescript
// Ícones utilizados no exame
const examIcons = {
  // Navegação
  back: 'ArrowLeft',
  close: 'X',
  menu: 'Menu',

  // Status
  check: 'Check',
  x: 'X',
  alert: 'AlertTriangle',
  info: 'Info',

  // Ações
  mic: 'Mic',
  micOff: 'MicOff',
  camera: 'Camera',
  cameraOff: 'CameraOff',
  refresh: 'RefreshCw',
  play: 'Play',
  pause: 'Pause',
  stop: 'Square',

  // Resultado
  trophy: 'Trophy',
  chart: 'BarChart3',
  download: 'Download',
  share: 'Share2',

  // Calibração
  target: 'Target',
  move: 'Move',
  hand: 'Hand',

  // Bancada
  settings: 'Settings',
  sliders: 'SlidersHorizontal',
  database: 'Database',
  fileJson: 'FileJson',
  fileCsv: 'FileSpreadsheet',
  eye: 'Eye',
  eyeOff: 'EyeOff',

  // Medical
  stethoscope: 'Stethoscope',
  activity: 'Activity',
  heart: 'Heart',

  // Size: 24px base
  // Stroke: 2px
  // Color: herdado do contexto (currentColor)
};
```

### 8.2 Ilustrações

```typescript
// Ilustrações do exame (SVG/Lottie)
const examIllustrations = {
  // Estado vazio / inicial
  emptyState: '/illustrations/exam-empty.svg',

  // Calibração
  calibrationArm: '/illustrations/calibration-arm.svg',
  calibrationFace: '/illustrations/calibration-face.svg',

  // Erros
  cameraError: '/illustrations/camera-error.svg',
  microphoneError: '/illustrations/mic-error.svg',

  // Resultado
  resultSuccess: '/illustrations/result-success.svg',
  resultChart: '/illustrations/result-chart.svg',

  // Estilo: flat, cores do SaúdeSeg+, linhas finas
};
```

### 8.3 Fonte Sloan (Optotipos)

```typescript
// Fonte Sloan — padrão ETDRS
// Opções de implementação:

// Opção 1: Fonte web (se licenciada)
@font-face {
  font-family: 'Sloan';
  src: url('/fonts/Sloan.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

// Opção 2: SVG paths (sem dependência de fonte)
// Cada letra é renderizada como SVG path
// Vantagem: controle total do aspect ratio
// Desvantagem: mais código

// Opção 3: Fonte sistema com ajuste
// Usar Inter/Inter Bold com letter-spacing aumentado
// para simular crowding Sloan
// NÃO recomendado — afeta precisão da medição

// RECOMENDAÇÃO: Opção 1 (fonte Sloan licenciada)
// ou Opção 2 (SVG paths) para máxima precisão
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO DE DESIGN

### 9.1 Mobile

- [ ] Cores do SaúdeSeg+ aplicadas (primary #3B82F6, neutrals slate)
- [ ] Área do optotipo sempre branca (#FFFFFF) com letras pretas (#0F172A)
- [ ] Border radius: examCard 28px, cameraCard 16px, dock 16px, buttons 12px/pill
- [ ] Sombras: neumorfismo leve (card, dock, camera)
- [ ] Tipografia: Inter para UI, Sloan para optotipos
- [ ] Touch targets ≥ 48px
- [ ] Animações: calibração pulse, voice pulse, optotype appear/resize
- [ ] Reduced motion respeitado
- [ ] ARIA labels em todos os elementos interativos
- [ ] Safe areas (notch, home indicator)
- [ ] Modo escuro DESABILITADO durante o exame

### 9.2 Bancada

- [ ] Layout grid: vídeo + métricas + gráfico + logs + controles
- [ ] Cores do SaúdeSeg+ aplicadas
- [ ] Tabela de logs com estilo SaúdeSeg+ (header slate-50, hover slate-50)
- [ ] Gráfico de drift com área de tolerância colorida
- [ ] Cards com border-radius 16px, sombra leve
- [ ] Botões: primary (filled), secondary (outline), ghost
- [ ] Inputs com estados: default, hover, focus, error
- [ ] Responsivo: collapse para single column em < 1024px
- [ ] QR code para conexão rápida
- [ ] Dark mode disponível (opcional)

---

*Adendo gerado em 17 de Julho de 2026*  
*Alinhamento com Design System SaúdeSeg+ v1.0*  
*Documento complementar à Arquitetura v3.0*
