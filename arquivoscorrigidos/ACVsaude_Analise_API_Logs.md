# 🔴 ANÁLISE PENTE-FINO: API, Inteligência, Logs e Relatórios — ACVsaude

**Data da Análise:** 17 de Julho de 2026
**Repositório:** https://github.com/berithcode-del/ACVsaude
**Foco:** API do servidor, inteligência do exame, sistema de logs, telemetria e relatórios

---

## 📋 RESUMO EXECUTIVO

Após análise pente-fino de TODOS os arquivos da API, engines de inteligência, sistema de logs e componentes da bancada, identifiquei **problemas críticos** que impedem o salvamento correto dos dados de calibração e exame para uso futuro no equipamento.

**Problema central:** O sistema **NÃO persiste dados no servidor**. Todos os logs ficam apenas em **memória volátil** (bancada) ou **localStorage do navegador** (mobile). Quando a sessão termina ou a página recarrega, **todos os dados são perdidos**.

---

## 1. 🚨 API DO SERVIDOR — ANÁLISE CRÍTICA

### 1.1 Estrutura do Servidor (`server/src/index.ts`)

O servidor é um **simples relay WebSocket** (Socket.io) com apenas 2 endpoints HTTP:

| Endpoint | Método | Função | Persistência |
|----------|--------|--------|-------------|
| `/health` | GET | Status do servidor | ❌ Não persiste nada |
| `/api/session` | POST | Cria UUID de sessão | ❌ Só em memória RAM |

**Problema:** Não há endpoints para:
- ❌ Salvar logs de calibração
- ❌ Salvar logs de exame (rounds, respostas)
- ❌ Salvar telemetria (frames de tracking)
- ❌ Recuperar histórico de sessões
- ❌ Exportar dados para o equipamento físico

### 1.2 WebSocket — Apenas Relay (Pass-through)

```typescript
// server/src/index.ts — TODOS os handlers são apenas relay:
socket.on('telemetry', (data) => {
  socket.to(currentSession).emit('telemetry', data);  // ← Só repassa!
});
socket.on('exam_event', (data) => {
  socket.to(currentSession).emit('exam_event', data);     // ← Só repassa!
});
socket.on('video_frame', (data) => {
  socket.to(currentSession).emit('video_frame', data);    // ← Só repassa!
});
```

**Impacto:** O servidor NÃO processa, NÃO valida e NÃO persiste NENHUM dado. É apenas um "canal de rádio" entre mobile e bancada.

### 1.3 Room Manager (`server/src/room-manager.ts`)

```typescript
interface SessionState {
  sessionId: string;
  mobileId: string | null;
  bancadaId: string | null;
  createdAt: number;
  lastActivity: number;
  connected: Set<string>;
}
```

**Problemas:**
- ❌ Não armazena dados da sessão (calibração, rounds, telemetria)
- ❌ Não há histórico de sessões anteriores
- ❌ Cleanup apaga tudo após 1 hora de inatividade
- ❌ Não há banco de dados (SQLite, PostgreSQL, MongoDB, etc.)
- ❌ Não há API REST para consultar dados passados

### 1.4 Dependências do Servidor

```json
{
  "dependencies": {
    "socket.io": "^4.7.5"  // ← SÓ ISSO! Nenhum ORM, DB, storage...
  }
}
```

---

## 2. 🧠 INTELIGÊNCIA DA APLICAÇÃO — ANÁLISE DOS ENGINES

### 2.1 CalibrationEngine (`apps/mobile/src/engine/CalibrationEngine.ts`)

**Status:** ✅ Implementado corretamente

| Aspecto | Implementação | Status |
|---------|--------------|--------|
| 3 pontos de referência | IPD, FaceWidth, FaceHeight | ✅ OK |
| Razão biométrica | `ipd_px / faceWidth_px` | ✅ OK |
| Estabilização | Variância do nariz + threshold de frames | ✅ OK |
| Eventos | stabilizing, referenceCaptured, comfortPositionCaptured, etc. | ✅ OK |
| Posição de conforto | Validação min/max scale | ✅ OK |

**Problema:** Os dados de calibração são capturados mas **NÃO são enviados para o servidor**. Ficam apenas no objeto `CalibrationEngine` e são passados para o `HybridTrackingEngine` via construtor. Não há persistência.

### 2.2 HybridTrackingEngine (`apps/mobile/src/engine/HybridTrackingEngine.ts`)

**Status:** ⚠️ Implementado, mas com limitações

| Aspecto | Especificação | Implementação | Status |
|---------|--------------|---------------|--------|
| Medição principal | FaceWidth (sinal grande, estável) | ✅ `euclideanDistance(leftEar, rightEar)` | ✅ OK |
| Reconstrução IPD | `FaceWidth × biometric_ratio` | ✅ Implementado | ✅ OK |
| Fator de escala | `FaceWidth_atual / FaceWidth_ref` | ✅ Implementado | ✅ OK |
| Suavização EMA | Alpha=0.3 | ✅ `SmoothingFilter.ema()` | ✅ OK |
| Histerese | Timer em segundos (3s fora, 1s dentro) | ⚠️ Contagem de frames (aproximado) | ⚠️ Parcial |
| Estabilidade | `1 - CV / threshold` | ✅ `coefficientOfVariation` | ✅ OK |

**Problema:** O `distanceMm` (distância em milímetros) é sempre `null` no telemetria! O sistema calcula `scale_current` e `distance_ratio`, mas **NÃO converte para milímetros reais**.

```typescript
// TelemetryFrameData:
distanceMm: number | null;  // ← SEMPRE null na implementação!
```

Isso impede que a bancada mostre a distância real do paciente ao smartphone.

### 2.3 StaircaseSession (`apps/mobile/src/engine/StaircaseSession.ts`)

**Status:** 🔴 **DIVERGENTE DA ESPECIFICAÇÃO**

| Parâmetro | Especificação (v2.0) | Implementação (system.ts) | Status |
|-----------|---------------------|--------------------------|--------|
| CONSECUTIVE_CORRECT | 2 (2-down) | 3 | 🔴 ERRADO |
| CONSECUTIVE_WRONG | 1 (1-up) | 2 | 🔴 ERRADO |
| MAX_REVERSALS | 6 | 3 | 🔴 ERRADO |
| STEP_LOGMAR | 0.1 | 0.1 | ✅ OK |

**Impacto clínico:** O exame fica **mais difícil** (precisa 3 acertos para descer, 2 erros para subir) e termina **mais cedo** (3 reversals vs 6). O resultado logMAR pode estar **subestimado** (visão pior do que realidade).

### 2.4 OptotypeRenderer (`apps/mobile/src/engine/OptotypeRenderer.ts`)

**Status:** ✅ Implementado corretamente

- Layout horizontal logMAR ✅
- Letras Sloan ✅
- Escala proporcional à distância ✅
- Indicador de estabilidade ✅
- Suavização de escala (alpha=0.2) ✅

### 2.5 VoiceRecognitionEngine (`apps/mobile/src/engine/VoiceRecognitionEngine.ts`)

**Status:** ✅ Implementado corretamente

- Retry automático (até 3x) ✅
- Fallback para botões manuais ✅
- Permissão explícita antes de iniciar ✅
- Timeout de 10s ✅

### 2.6 SmoothingFilter (`apps/mobile/src/engine/SmoothingFilter.ts`)

**Status:** ✅ Implementado corretamente

- Média móvel exponencial (EMA) ✅
- Coeficiente de variação (CV) ✅
- Variância ✅

### 2.7 FaceDetector (`apps/mobile/src/engine/FaceDetector.ts`)

**Status:** ⚠️ Problemas críticos (já detalhados na análise anterior)

- Erros genéricos (não específicos) 🔴
- Sem timeout no carregamento do modelo 🔴
- Sem fallback GPU→CPU 🔴
- Frame skip de 2 frames (otimização não documentada) ⚠️

---

## 3. 📊 SISTEMA DE LOGS — ANÁLISE CRÍTICA

### 3.1 SessionLogger (Mobile) — Coleta de Dados

```typescript
class SessionLogger {
  private log: SessionLog;           // ← Objeto em memória
  private telemetryBuffer: TelemetryFrameData[] = [];  // ← Buffer em memória
  // ...

  private saveToLocalStorage(): void {
    try {
      const key = 'visao_session_' + this.sessionId;
      localStorage.setItem(key, JSON.stringify(this.log));  // ← SÓ localStorage!
    } catch { }
  }
}
```

**Problemas críticos:**

| Problema | Descrição | Impacto |
|----------|-----------|---------|
| ❌ Sem persistência no servidor | Dados NÃO são enviados para API REST | Dados perdidos ao fechar navegador |
| ❌ localStorage limitado | ~5MB limite, dados de telemetria são grandes | Pode estourar limite e falhar silenciosamente |
| ❌ Sem chave de identificação do paciente | `sessionId` é UUID aleatório | Não é possível associar exame a paciente |
| ❌ Sem timestamp de calibração no log | `timestamp` existe mas não é usado para indexação | Não é possível rastrear quando foi calibrado |
| ⚠️ Telemetria em batch de 30 frames | Envia a cada 30 frames (~1s a 30fps) | Pode perder dados se a conexão cair antes do flush |
| ⚠️ Vídeo enviado como base64 | `canvas.toDataURL('image/jpeg', 0.6)` | Frames pesados, consome banda |

### 3.2 LogExporter (Bancada) — Exportação de Dados

```typescript
class LogExporter {
  private log: ExportSessionLog;  // ← Só em memória da bancada!

  downloadJSON(filename = 'session-log.json'): void { ... }
  downloadCSV(filename = 'session-log.csv'): void { ... }
}
```

**Problemas:**

| Problema | Descrição | Impacto |
|----------|-----------|---------|
| ❌ Sem persistência no servidor | Dados ficam apenas na memória da bancada | Se a bancada recarregar, perde tudo |
| ❌ Sem sincronização com mobile | Mobile e bancada têm logs SEPARADOS | Dados divergentes, inconsistência |
| ❌ Sem identificação do paciente | `sessionId` é UUID, não há nome/ID do paciente | Não é possível fazer histórico clínico |
| ⚠️ CSV com dados incompletos | `distanceAtPresentation`, `scaleAtPresentation`, `stabilityAtPresentation` são sempre 0 | Métricas críticas faltando no export |
| ⚠️ Telemetria no CSV sem timestamp real | Usa `Date.now()` do momento do export, não do frame | Dados temporais incorretos |

### 3.3 TelemetryProcessor (Bancada) — Análise de Telemetria

**Status:** ✅ Implementado corretamente

- Janela deslizante de 30 frames ✅
- Detecção de drift (warning / severe) ✅
- Cooldown de 2s entre alertas ✅
- Contagem de estabilidade baixa consecutiva ✅
- Necessidade de recalibração após 15 frames instáveis ✅

**Problema:** O `distanceMm` é sempre `null` nos frames de telemetria, então o processador **NÃO consegue calcular distância real** para drift warnings baseados em milímetros.

---

## 4. 📡 COMUNICAÇÃO MOBILE ↔ BANCADA — FLUXO DE DADOS

### 4.1 Fluxo Atual

```
┌─────────────┐      WebSocket      ┌─────────────┐
│   MOBILE    │ ◄─────────────────► │   BANCADA   │
│             │   (relay servidor)    │             │
├─────────────┤                     ├─────────────┤
│ SessionLogger│                    │ LogExporter │
│  - logRound()│                    │  - addRound()│
│  - logTelemetry()│                │  - addTelemetry()│
│  - saveToLocalStorage()│           │  - downloadJSON()│
│  - sendToBancada()│               │  - downloadCSV()│
└─────────────┘                     └─────────────┘
       │                                    │
       ▼                                    ▼
  localStorage                          Memória RAM
  (5MB limite)                         (volátil)
```

### 4.2 Problemas no Fluxo

| Problema | Descrição |
|----------|-----------|
| ❌ **Dados não chegam ao servidor** | O servidor só faz relay, não persiste |
| ❌ **Mobile e bancada têm logs separados** | Não há fonte única de verdade |
| ❌ **Se a bancada desconectar, perde tudo** | Dados só em memória RAM |
| ❌ **Se o mobile fechar, log fica incompleto** | localStorage pode não ter o finish() |
| ⚠️ **Telemetria em batch pode perder dados** | Se desconectar antes de flush, frames perdidos |
| ⚠️ **Vídeo base64 consome muita banda** | ~50-100KB por frame, pode saturar conexão |

---

## 5. 🏥 BANCADA — ANÁLISE DOS COMPONENTES

### 5.1 SessionManager (`apps/bancada/src/components/SessionManager.tsx`)

**Funcionalidades:**
- ✅ Criar sessão (UUID)
- ✅ Entrar em sessão manualmente
- ✅ Mostrar QR code / URL para mobile
- ✅ Exportar JSON/CSV
- ✅ Resetar sessão

**Problemas:**
- ❌ Não mostra histórico de sessões anteriores
- ❌ Não associa sessão a paciente (nome, ID)
- ❌ Não salva dados no servidor
- ⚠️ Exporta CSV com `distanceAtPresentation=0`, `scaleAtPresentation=0`, `stabilityAtPresentation=0` (dados não preenchidos!)

### 5.2 MetricsPanel (`apps/bancada/src/components/MetricsPanel.tsx`)

**Status:** ✅ Implementado corretamente

- Mostra métricas em tempo real ✅
- Face detectado/não detectado ✅
- Largura/altura da face ✅
- IPD estimado ✅
- Escala atual ✅
- Estabilidade (%) ✅
- Em alcance ✅

**Problema:** Não mostra **distância em milímetros** (sempre null).

### 5.3 EventsLog (`apps/bancada/src/components/EventsLog.tsx`)

**Status:** ✅ Implementado corretamente

- Log de eventos com scroll automático ✅
- Cores por tipo de evento (sucesso/erro/warning) ✅
- Ícones de status ✅
- Formatação legível ✅

### 5.4 DriftChart (`apps/bancada/src/components/DriftChart.tsx`)

**Status:** ✅ Implementado corretamente

- Gráfico de estabilidade vs tempo ✅
- Zonas de warning (amarelo) e severe (vermelho) ✅
- Chart.js com animação desligada (performance) ✅
- Tooltip interativo ✅

### 5.5 ControlsPanel (`apps/bancada/src/components/ControlsPanel.tsx`)

**Status:** ✅ Implementado corretamente

- Controles: start, pause, resume, abort ✅
- Ajuste de parâmetros (drift_warn_mm, stability_threshold, etc.) ✅
- Envio de comandos para mobile ✅

### 5.6 RoundLogsTable (`apps/bancada/src/components/RoundLogsTable.tsx`)

**Status:** ⚠️ Parcial

- Mostra rounds em tabela ✅
- LogMAR, letra alvo, resposta correta/errada ✅
- Tempo de resposta ✅

**Problema:** Não mostra **distância na apresentação** (sempre 0).

---

## 6. 🗄️ PERSISTÊNCIA DE DADOS — ANÁLISE COMPLETA

### 6.1 Onde os dados estão (e não estão)

| Tipo de Dado | Local | Persistente? | Acessível após sessão? |
|-------------|-------|-------------|----------------------|
| Dados de calibração | `CalibrationEngine` (memória mobile) | ❌ NÃO | ❌ NÃO |
| Dados de calibração | `SessionLogger.log.calibration` (memória mobile) | ❌ NÃO | ❌ NÃO |
| Dados de calibração | `localStorage` (mobile) | ⚠️ Parcial (5MB) | ⚠️ Só no mesmo navegador |
| Rounds de exame | `SessionLogger.log.rounds` (memória mobile) | ❌ NÃO | ❌ NÃO |
| Rounds de exame | `LogExporter.log.rounds` (memória bancada) | ❌ NÃO | ❌ NÃO |
| Telemetria | `SessionLogger.telemetryBuffer` (memória mobile) | ❌ NÃO | ❌ NÃO |
| Telemetria | `BancadaStore.telemetry` (memória bancada) | ❌ NÃO | ❌ NÃO |
| Resumo do exame | `SessionLogger.log.summary` (memória mobile) | ❌ NÃO | ❌ NÃO |
| Vídeo frames | `BancadaStore.latestFrame` (memória bancada) | ❌ NÃO | ❌ NÃO |
| **NADA** | **Servidor / Banco de Dados** | **❌ NÃO EXISTE** | **❌ NÃO EXISTE** |

### 6.2 Consequência para o Equipamento Físico

Se você quer usar os dados de calibração para **ajustar o equipamento físico** (ex: mesa de refratação, autorefrator, etc.):

| Necessidade | Status | Problema |
|------------|--------|----------|
| Obter logMAR final do paciente | ⚠️ Parcial | Só no momento do exame, não há histórico |
| Obter dados de calibração (IPD, faceWidth) | ❌ Não possível | Dados não persistem |
| Obter telemetria completa para análise | ❌ Não possível | Dados não persistem |
| Comparar exames do mesmo paciente ao longo do tempo | ❌ Não possível | Sem identificação do paciente |
| Exportar dados para sistema hospitalar (HL7, DICOM) | ❌ Não possível | Sem API de exportação |
| Calibrar equipamento físico com dados do exame | ❌ Não possível | Sem integração |

---

## 7. 🔧 RECOMENDAÇÕES PARA SALVAR LOGS E CALIBRAÇÕES

### 7.1 Prioridade 1: Adicionar Persistência no Servidor

**Opção A: SQLite (simples, zero config)**
```typescript
// server/src/db.ts
import Database from 'better-sqlite3';
const db = new Database('acvsaude.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    created_at INTEGER,
    finished_at INTEGER,
    final_logmar REAL,
    final_snellen TEXT,
    device_info TEXT,
    calibration_data TEXT,
    summary_data TEXT
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    round_index INTEGER,
    logmar REAL,
    target_letter TEXT,
    correct INTEGER,
    response_source TEXT,
    response_time_ms INTEGER,
    distance_mm REAL,
    scale REAL,
    stability REAL,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    frame_index INTEGER,
    face_detected INTEGER,
    face_width_px REAL,
    face_height_px REAL,
    ipd_estimated_px REAL,
    scale_current REAL,
    distance_mm REAL,
    stability REAL,
    is_in_range INTEGER,
    created_at INTEGER
  );
`);
```

**Opção B: PostgreSQL (produção, escalável)**
```typescript
// Usar Prisma ORM ou Drizzle
// Adicionar ao docker-compose.yml
```

### 7.2 Prioridade 2: API REST para Consulta

```typescript
// Novos endpoints no servidor:
GET  /api/sessions              → Lista todas as sessões
GET  /api/sessions/:id          → Detalhes de uma sessão
GET  /api/sessions/:id/rounds   → Rounds do exame
GET  /api/sessions/:id/telemetry → Telemetria completa
GET  /api/patients/:id/sessions  → Histórico do paciente
POST /api/sessions/:id/export   → Exporta JSON/CSV/PDF
```

### 7.3 Prioridade 3: Identificação do Paciente

```typescript
// Antes de iniciar o exame, coletar:
interface PatientInfo {
  patientId: string;      // ID do hospital/prontuário
  name: string;
  birthDate: string;
  gender: 'M' | 'F' | 'O';
  eye: 'OD' | 'OE';        // Olho direito / esquerdo
}

// Enviar no join_session:
socket.emit('join_session', {
  sessionId,
  role: 'mobile',
  patientInfo: { ... }
});
```

### 7.4 Prioridade 4: Sincronização Mobile ↔ Servidor

```typescript
// SessionLogger.ts — Modificar para enviar ao servidor:
private async saveToServer(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/sessions/${this.sessionId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.log),
    });
  } catch {
    // Fallback: salvar em localStorage para retry posterior
    this.saveToLocalStorage();
  }
}
```

### 7.5 Prioridade 5: Calcular distanceMm Real

```typescript
// HybridTrackingEngine.ts — Adicionar:
private calculateDistanceMm(scale: number): number | null {
  // Fórmula: distance = baseDistance / scale
  // baseDistance = distância de calibração (braço esticado)
  // Precisa saber a distância real do braço esticado (ex: 600mm)
  const BASE_DISTANCE_MM = 600; // 60cm = braço esticado médio
  return BASE_DISTANCE_MM / scale;
}

// Ou usar fórmula mais precisa com focal length:
// distance = (focalLength * faceWidthRealMm) / faceWidthPx
```

---

## 8. 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Persistência Básica (1-2 dias)
- [ ] Adicionar SQLite ao servidor
- [ ] Criar tabelas: sessions, rounds, telemetry
- [ ] Modificar server para salvar dados ao receber eventos
- [ ] Adicionar endpoint GET /api/sessions/:id

### Fase 2: Identificação do Paciente (1 dia)
- [ ] Adicionar patientInfo ao protocolo WebSocket
- [ ] Modificar WelcomeScreen para coletar dados do paciente
- [ ] Adicionar campo patient_id às tabelas do banco

### Fase 3: Exportação e Integração (2-3 dias)
- [ ] Endpoint POST /api/sessions/:id/export (JSON/CSV/PDF)
- [ ] Interface na bancada para buscar histórico de pacientes
- [ ] Comparar exames anteriores (trend de logMAR)

### Fase 4: Cálculo de Distância Real (1 dia)
- [ ] Adicionar baseDistanceMm à calibração
- [ ] Calcular distanceMm no HybridTrackingEngine
- [ ] Enviar distanceMm na telemetria

---

## 9. 🎯 CONCLUSÃO

### Status Atual do Sistema de Logs

| Aspecto | Status |
|---------|--------|
| Coleta de dados no mobile | ✅ OK (SessionLogger completo) |
| Coleta de dados na bancada | ✅ OK (LogExporter completo) |
| Processamento de telemetria | ✅ OK (TelemetryProcessor completo) |
| Visualização em tempo real | ✅ OK (Metrics, Events, DriftChart) |
| Exportação JSON/CSV | ⚠️ Parcial (dados incompletos) |
| Persistência no servidor | ❌ **NÃO EXISTE** |
| Histórico de pacientes | ❌ **NÃO EXISTE** |
| Integração com equipamento | ❌ **NÃO EXISTE** |

### Resposta à Pergunta Original

> *"Se a gente vai conseguir salvar os logs dos exames para poder fazer essas calibrações no equipamento"*

**Resposta: NÃO, no estado atual.**

Os dados de calibração e exame são coletados mas **não persistem** além da sessão em andamento. Quando:
- O navegador do mobile é fechado → dados do localStorage podem ser apagados
- A bancada recarrega → todos os dados em memória são perdidos
- O servidor reinicia → todas as sessões em memória são perdidas

**Para usar os dados no equipamento físico, é necessário:**
1. Adicionar banco de dados ao servidor (SQLite/PostgreSQL)
2. Criar API REST para consulta e exportação
3. Adicionar identificação do paciente
4. Calcular distância real em milímetros
5. Implementar interface de histórico na bancada

---

*Análise gerada em 17/07/2026 — Kimi AI*
