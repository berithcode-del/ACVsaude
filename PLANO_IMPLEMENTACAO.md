# Plano de Implementação — Exame de Acuidade Visual Assistido por IA

**Documentos de Especificação:**
- `especificacao_acuidade_visual_IA.md` v2.0 — Algoritmo, estrutura e construção
- `arquitetura_reconstrucao_v3.md` v3.0 — Arquitetura de duas interfaces + WebSocket
- `adendo_design_interface.md` v1.0 — Design system, tokens, componentes e animações

---

## Sprint 1: Fundação e Infraestrutura Compartilhada

**Objetivo:** Scaffold do monorepo, tipos compartilhados, design tokens, shells das apps

| # | Task | Verificação |
|---|------|-------------|
| 1.1 | Scaffold monorepo (npm workspaces): `apps/mobile`, `apps/bancada`, `packages/shared` | `npm install` sem erros, estrutura de diretórios criada |
| 1.2 | Configurar Vite + React 18 + TypeScript + Tailwind nos 3 pacotes | `npm run dev` em cada app abre no navegador |
| 1.3 | Criar `packages/shared` com tipos globais: `websocket.ts`, `exam.ts`, `telemetry.ts` | Tipos importáveis por mobile e bancada |
| 1.4 | Implementar constantes compartilhadas: `logMAR.ts`, parâmetros do sistema (STABILITY_THRESHOLD, EMA_ALPHA, etc.) | Tabela de parâmetros exportada e testada |
| 1.5 | Implementar design tokens: `examColors`, `examTypography`, `examSpacing`, `examBorderRadius`, `examShadows` | Tokens exportados e aplicáveis via Tailwind ou CSS-in-JS |
| 1.6 | Shell do `apps/mobile`: `App.tsx` com roteamento de estados (calibration → exam → result) | Navegação entre telas funcionando |
| 1.7 | Shell do `apps/bancada`: `App.tsx` com layout grid (vídeo, métricas, logs, controles) | Layout grid responsivo renderizado |
| 1.8 | Utilitários matemáticos: `math.ts`, `geometry.ts` (distância euclidiana, EMA, variância) | Testes unitários passando |

---

## Sprint 2: Motores Core (Mobile)

**Objetivo:** Implementar os 4 motores principais do exame

| # | Task | Verificação |
|---|------|-------------|
| 2.1 | `CalibrationEngine.ts` — Captura de 3 pontos (IPD, FaceWidth, FaceHeight) com estabilidade de 2s | Eventos `stabilizing`, `referenceCaptured`, `comfortPositionCaptured` disparam corretamente |
| 2.2 | `HybridTrackingEngine.ts` — Tracking híbrido com EMA smoothing, histerese, cálculo de escala e estabilidade | `processFrame()` retorna `TrackingResult` com escala, estabilidade, range |
| 2.3 | `OptotypeRenderer.ts` — Renderização Canvas 2D com layout horizontal logMAR, 5 letras Sloan, crowding, escala dinâmica | Letras renderizadas no canvas com tamanho proporcional à escala |
| 2.4 | `VoiceRecognitionEngine.ts` — Web Speech API com retry (3x), permissão explícita, fallback mode, timeout 10s | Reconhecimento funciona, fallback ativa após 3 falhas |
| 2.5 | `StaircaseSession.ts` — Algoritmo staircase: 3 acertos → desce, 2 erros → sobe, 3 reversões → termina | `isComplete()` retorna true após 3 reversões |
| 2.6 | `SessionLogger.ts` — Logger de sessão com batch de telemetria, localStorage, envio via WebSocket | Log salvo no localStorage e enviado ao conectar WS |
| 2.7 | `SmoothingFilter.ts` — Filtro EMA e cálculo de variância/estabilidade | Valores suavizados, estabilidade 0-1 |

---

## Sprint 3: App Mobile — Interface do Exame

**Objetivo:** Tela de calibração + exame + resultado com todos os componentes de UI

| # | Task | Verificação |
|---|------|-------------|
| 3.1 | Integrar MediaPipe Face Mesh com câmera frontal (`useTracking.ts`, `FaceDetector.ts`) | Feed de câmera com landmarks faciais visíveis |
| 3.2 | `CalibrationOverlay.tsx` — Overlay oval guia, progresso de estabilidade, estados (azul tracejado → verde estável) | Overlay renderizado, transição de cor ao estabilizar |
| 3.3 | `CameraCard.tsx` — Preview PiP com overlay facial, métrica flutuante (distância, estabilidade) | Câmera exibida em card 200px, métricas sobrepostas |
| 3.4 | `ExamCard.tsx` — Área do optotipo (branco puro, contraste máximo) com `OptotypeCanvas.tsx` | Optotipos renderizados com fundo #FFFFFF e texto #0F172A |
| 3.5 | `DockMobile.tsx` — Botões "Acertei" (verde) / "Não vi" (vermelho), indicador de voz | Botões ≥48px, estilos conforme spec, voz pulsando |
| 3.6 | `VoiceIndicator.tsx` — Pílula pulsante com animação de ondas, estados (idle, listening, processing, error) | Animação CSS funcionando, reduced motion respeitado |
| 3.7 | `ResultScreen` — Card de resultado (Snellen 20/25, logMAR 0.1), gráfico de desempenho, botões novo/envio | Resultado exibido com animação de contagem |
| 3.8 | Hooks: `useCalibration.ts`, `useTracking.ts`, `useVoiceRecognition.ts`, `useExamState.ts`, `useWebSocket.ts` | Estado do exame gerenciado via Zustand, eventos sincronizados |
| 3.9 | Fluxo completo de calibração → exame → resultado funcionando em um cenário feliz | Exame completo executável do início ao fim |

---

## Sprint 4: Servidor de Comunicação e Telemetria

**Objetivo:** Servidor WebSocket (relay) + sincronização mobile/bancada

| # | Task | Verificação |
|---|------|-------------|
| 4.1 | Servidor Node.js + Socket.io com sistema de salas (room por sessão UUID) | Mobile conecta, bancada conecta na mesma sala |
| 4.2 | Protocolo de mensagens: `telemetry`, `exam_event`, `video_frame`, `control`, `sync` | Mensagens trafegam entre mobile e bancada |
| 4.3 | Mobile: envio de telemetria a cada frame (~30fps) e `exam_event` em cada rodada | Bancada recebe telemetria em tempo real |
| 4.4 | Mobile: envio de `video_frame` JPEG base64 a cada 5 frames (~6fps, qualidade 0.6) | Bancada exibe preview do vídeo |
| 4.5 | Bancada: comandos `start_test`, `pause_test`, `abort_test`, `adjust_parameter` | Mobile reage aos comandos da bancada |
| 4.6 | Geração de QR code / código de sessão para pareamento | Mobile e bancada conectam via QR code |
| 4.7 | Tratamento de desconexão e reconexão | Sistema recupera após queda de conexão |

---

## Sprint 5: App Bancada (Desktop)

**Objetivo:** Painel completo de monitoramento técnico e calibração do algoritmo

| # | Task | Verificação |
|---|------|-------------|
| 5.1 | `VideoStream.tsx` — Stream de vídeo do mobile (frames base64 → canvas) | Vídeo do celular exibido na bancada |
| 5.2 | `MetricsPanel.tsx` — Distância, escala, estabilidade, IPD estimado, FaceWidth em tempo real | Métricas atualizando a cada frame recebido |
| 5.3 | `DriftChart.tsx` — Gráfico de distância vs tempo com linha de referência e área de tolerância | Chart.js/D3 renderizando dados históricos |
| 5.4 | `RoundLogsTable.tsx` — Tabela de logs por rodada (TanStack Table), acertos/erros coloridos | Tabela com scroll, hover, highlight de acerto/erro |
| 5.5 | `CalibrationControls.tsx` — Ajuste de parâmetros (fator correção, tolerância drift, threshold) | Parâmetros enviados ao mobile via control command |
| 5.6 | `SessionManager.tsx` — QR code de conexão, exportar dataset (JSON/CSV), resetar sessão | Dataset exportado com estrutura `SessionLog` |
| 5.7 | `TelemetryProcessor.ts` — Processamento de telemetria, detecção de drift, recalibração | Eventos de drift/recalibração identificados |
| 5.8 | `LogExporter.ts` — Exportar `SessionLog` completo para JSON/CSV | Arquivo baixado com dados completos da sessão |

---

## Sprint 6: Polish, Animações, Acessibilidade e Testes

**Objetivo:** Finalização com animações, acessibilidade clínica, testes multi-dispositivo

| # | Task | Verificação |
|---|------|-------------|
| 6.1 | Animações do exame: `stateTransition`, `calibrationPulse`, `voicePulse`, `voiceWaves`, `optotypeAppear`, `optotypeResize`, `buttonPress`, `resultCount`, `shake`, `toastEnter/Exit` | Animações suaves, sem flickering |
| 6.2 | Reduced motion: `@media (prefers-reduced-motion: reduce)` desabilita animações | Animações desligadas com preferência do sistema |
| 6.3 | Acessibilidade: ARIA labels em todos componentes (examCard, optotype, calibration, voice, stability, result) | Leitor de tela navega todos os elementos |
| 6.4 | Contraste: optotipo sempre #0F172A sobre #FFFFFF, touch targets ≥48×48px | WCAG AA verificado |
| 6.5 | Safe areas: notch, home indicator (iOS), orientação portrait bloqueada | Layout respeita áreas seguras |
| 6.6 | Modo escuro desabilitado durante exame | Fundo permanece branco no exame |
| 6.7 | Tratamento de erros: câmera sem permissão, microfone sem permissão, WebGL não suportado | Telas de erro com ilustrações e ação |
| 6.8 | Testes de usabilidade multi-dispositivo (Chrome/Android, iOS/Safari, diferentes DPIs) | Exame funcional em 3+ dispositivos |
| 6.9 | Otimização de performance: `requestAnimationFrame`, reduzir draw calls, debounce telemetria | 30fps mantido durante exame |
| 6.10 | Revisão de código e documentação final | Checklist de implementação de design completo |

---

## Dependências entre Sprints

```
Sprint 1 (Fundação)
    └── Sprint 2 (Motores Core)
    │       └── Sprint 3 (App Mobile)
    │
    └── Sprint 4 (Servidor/Telemetria) ← depende de tipos do Sprint 1
            └── Sprint 5 (App Bancada) ← depende de Sprint 4
                            │
    └── Sprint 6 (Polish) ← depende de Sprint 3 + Sprint 5
```

**Total: ~50 tasks distribuídas em 6 sprints.**
