# 🔍 ANÁLISE PENTE-FINO: Commit 9f046db — ACVsaude

**Data da Análise:** 17 de Julho de 2026, 18:52
**Commit:** 9f046db — "correções ACVsaude: sql.js, EventEmitter, StaircaseSession, QR code, WelcomeScreen, docker-compose"
**Autor:** Berith Coder <marco@berith.com>

---

## ✅ O QUE FOI IMPLEMENTADO CORRETAMENTE

### 1. 🗄️ Banco de Dados (sql.js)
- ✅ Usa `sql.js` (WASM) em vez de `better-sqlite3` — **não precisa compilar nativo**
- ✅ Tabelas: `patients`, `sessions`, `rounds`, `telemetry`, `events`
- ✅ Persiste em arquivo via `fs.writeFileSync` após cada operação
- ✅ Índices para performance
- ✅ Schema completo com todos os campos necessários

### 2. 📡 API REST do Servidor
- ✅ `POST /api/session` — cria sessão
- ✅ `POST /api/patients` — cria paciente
- ✅ `GET /api/sessions` — lista sessões
- ✅ `GET /api/sessions/:id/details` — detalhes completos
- ✅ `GET /api/sessions/:id/export/json` — exporta JSON
- ✅ `GET /api/sessions/:id/export/csv` — exporta CSV
- ✅ `GET /api/patients/:id/history` — histórico do paciente
- ✅ `GET /api/patients/search?q=` — busca pacientes

### 3. 🔌 WebSocket com Persistência
- ✅ `join_session` com `deviceInfo` e `patientInfo`
- ✅ `calibration_data` → `updateSessionCalibration()`
- ✅ `telemetry` → `addTelemetryFrame()` (batch de frames)
- ✅ `exam_event` → `addEvent()` + `addRound()` (quando kind=round_answered)
- ✅ `exam_event` (test_finished) → `finishSession()`
- ✅ `disconnect` → `abortSession()` (se mobile)

### 4. 📱 Mobile — Store
- ✅ `calibrationState` no Zustand store
- ✅ `setCalibrationState` action

### 5. 📱 Mobile — FaceDetector
- ✅ Erros específicos: `not-allowed`, `not-found`, `not-readable`, `overconstrained`, `security`
- ✅ Timeout no carregamento do MediaPipe (30s)
- ✅ Fallback GPU → CPU
- ✅ `video.readyState` check antes de `drawImage`

### 6. 📱 Mobile — HybridTrackingEngine
- ✅ Cálculo de `distance_mm` real: `Math.round(600 / scale_current)`
- ✅ Histeresis com contagem de frames
- ✅ EMA suavização

### 7. 📱 Mobile — StaircaseSession
- ✅ Constantes corrigidas: `CONSECUTIVE_CORRECT=2`, `CONSECUTIVE_WRONG=1`, `MAX_REVERSALS=6`
- ✅ Algoritmo 2-down-1-up implementado corretamente

### 8. 📱 Mobile — useTracking
- ✅ Singleton do `FaceDetector` (`const globalDetector = new FaceDetector()`)
- ✅ Não reinicializa câmera entre telas
- ✅ `stopDetector()` para liberar no fim da sessão

### 9. 📱 Mobile — ExamScreen
- ✅ Usa `calibrationState` do store (não mock!)
- ✅ Verifica se calibração existe antes de iniciar
- ✅ Volta para calibração se não houver dados

### 10. 🏥 Bancada — PatientHistory
- ✅ Busca pacientes por nome
- ✅ Mostra histórico de exames em tabela
- ✅ Exporta CSV do histórico
- ✅ Mostra total de exames e última acuidade

### 11. 🏥 Bancada — SessionManager
- ✅ QR code para sessão
- ✅ Lista sessões com busca
- ✅ Cria nova sessão
- ✅ Exporta JSON/CSV da sessão ativa

### 12. 🐳 Docker
- ✅ `docker-compose.yml` na raiz
- ✅ `server/Dockerfile`
- ✅ Volume para persistência de dados

---

## ⚠️ PROBLEMAS ENCONTRADOS

### 🔴 PROBLEMA 1: useVideoStream NÃO RECEBE `sendFrame` CORRETAMENTE

**Arquivo:** `apps/mobile/src/hooks/useVideoStream.ts`

```typescript
export function useVideoStream(detector: FaceDetector | null, sendFrame: ((dataUrl: string) => void) | null) {
```

**Problema:** O `ExamScreen.tsx` chama:
```typescript
const { startStream } = useVideoStream(getDetector(), sendVideoFrame);
```

Mas `sendVideoFrame` vem do `useWebSocket()` que retorna:
```typescript
const { connect, sendVideoFrame } = useWebSocket();
```

**Verificação:** `sendVideoFrame` está definido no `useWebSocket`? 

```typescript
// useWebSocket.ts — NÃO TEM sendVideoFrame exportado!
return {
  connect,
  disconnect,
  sendTelemetry,
  sendExamEvent,
  sendControl,
  sendCalibrationData,
  // ❌ sendVideoFrame NÃO ESTÁ AQUI!
  getLogger,
};
```

**Impacto:** O stream de vídeo para a bancada **NÃO FUNCIONA**. A bancada não recebe frames do mobile.

**Correção:** Adicionar `sendVideoFrame` ao return do `useWebSocket`:
```typescript
return {
  // ... outros métodos
  sendVideoFrame: (dataUrl: string) => socketRef.current?.emit('video_frame', { dataUrl }),
};
```

---

### 🔴 PROBLEMA 2: SessionLogger NÃO USA WebSocket PARA ENVIAR DADOS

**Arquivo:** `apps/mobile/src/engine/SessionLogger.ts`

O `SessionLogger` foi completamente reescrito e **PERDEU** a integração com WebSocket:

```typescript
// NOVO SessionLogger (simplificado):
export class SessionLogger extends EventEmitter<SessionLogEventMap> {
  private entries: StaircaseEntry[] = [];
  private telemetryBuffer: TelemetrySnapshot[] = [];
  // ...
  recordRound(entry: StaircaseEntry): void {
    this.entries.push(entry);
    this.emit('roundRecorded', entry);
    // ❌ NÃO envia para servidor!
  }
}
```

**O QUE ERA ANTES (e funcionava):**
```typescript
// SessionLogger ANTES:
logRound(round: RoundLog): void {
  this.log.rounds.push(round);
  this.emit('logUpdated', this.log);
  this.saveToLocalStorage();
  // ✅ Envia round para servidor
  this.socket?.emit('exam_event', { event: { kind: 'round_answered', ...round } });
}
```

**Impacto:** Os rounds do exame **NÃO SÃO ENVIADOS** para o servidor em tempo real. O servidor só recebe se o `useExamState` ou `useWebSocket` enviar manualmente.

**Verificação no useExamState:**
```typescript
// useExamState.ts:
const result = recordResponse(correct);
// ❌ NÃO envia nada para o servidor aqui!
```

**Correção:** O `useExamState` precisa chamar `sendExamEvent` do WebSocket para cada round:
```typescript
// No useExamState:
const { sendExamEvent } = useWebSocket();  // ❌ NÃO está sendo usado!

// Deveria ser:
const { sendExamEvent } = useWebSocket();
// ...
recordResponse(correct) {
  // ...
  sendExamEvent({ kind: 'round_answered', ...roundLog });
}
```

---

### 🔴 PROBLEMA 3: useTracking NÃO ENVIA TELEMETRIA PARA SERVIDOR

**Arquivo:** `apps/mobile/src/hooks/useTracking.ts`

```typescript
if (logger && frameCountRef.current % 3 === 0) {
  logger.logTelemetry({
    faceDetected: true,
    faceWidthPx: result.faceWidth_px,
    // ...
    distanceMm: null,  // ❌ SEMPRE null! Deveria ser result.distance_mm
  });
}
```

**Problemas:**
1. `distanceMm: null` — deveria ser `result.distance_mm` (que agora existe!)
2. O `logger` é `SessionLogger` que **NÃO envia** para o servidor (ver Problema 2)
3. Não usa `sendTelemetry` do `useWebSocket`

**Correção:** O `useTracking` deveria receber `sendTelemetry` do WebSocket e enviar diretamente:
```typescript
// useTracking deveria receber:
const { sendTelemetry } = useWebSocket();
// ...
if (frameCountRef.current % 3 === 0) {
  sendTelemetry([{
    faceDetected: true,
    faceWidthPx: result.faceWidth_px,
    distanceMm: result.distance_mm,  // ✅ CORRIGIDO
    // ...
  }]);
}
```

---

### 🔴 PROBLEMA 4: WelcomeScreen NÃO ENVI PATIENT INFO PARA SERVIDOR

**Arquivo:** `apps/mobile/src/screens/WelcomeScreen.tsx`

```typescript
export interface PatientInfo {
  name: string;
  age: string;      // ❌ Deveria ser birthDate (data)
  notes: string;    // ❌ Não tem ID do paciente
}
```

**Problemas:**
1. `age` é string em vez de `birthDate` (data de nascimento) — dificulta cálculo de idade
2. **Não tem `patientId`** — campo obrigatório para identificar paciente no banco
3. O `onStart` recebe `PatientInfo` mas **NÃO envia** para o servidor ao criar sessão

**O que deveria fazer:**
```typescript
// Ao criar sessão, deveria:
await fetch(`${serverUrl}/api/patients`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: patientId,      // ✅ ID único do paciente
    name: name,
    birthDate: birthDate, // ✅ Data de nascimento
    // ...
  }),
});
```

**Impacto:** O paciente é criado no banco com **dados incompletos** ou **não é criado** (depende de quem chama a API).

---

### 🟡 PROBLEMA 5: useWebSocket NÃO EXPORTA sendVideoFrame

**Arquivo:** `apps/mobile/src/hooks/useWebSocket.ts`

```typescript
return {
  connect,
  disconnect,
  sendTelemetry,
  sendExamEvent,
  sendControl,
  sendCalibrationData,
  // ❌ sendVideoFrame NÃO ESTÁ AQUI!
  getLogger,
};
```

Mas o `ExamScreen.tsx` espera:
```typescript
const { connect, sendVideoFrame } = useWebSocket();
```

**Impacto:** `sendVideoFrame` é `undefined` → vídeo não é enviado para bancada.

---

### 🟡 PROBLEMA 6: SessionLogger PERDEU FUNCIONALIDADE DE EXPORTAÇÃO

**Arquivo:** `apps/mobile/src/engine/SessionLogger.ts`

O novo `SessionLogger` é apenas um **EventEmitter** simples. Perdeu:
- ❌ `saveToLocalStorage()` — backup offline
- ❌ `getLog()` — obter log completo
- ❌ `logCalibration()` — registrar calibração
- ❌ `logEvent()` — registrar eventos genéricos
- ❌ `finish()` com summary completo
- ❌ `deviceInfo` — informações do dispositivo

**Impacto:** O mobile não tem mais log local completo. Se a conexão cair, **perde-se todo o histórico do exame**.

---

### 🟡 PROBLEMA 7: server/index.ts NÃO SALVA BANCO APÓS CADA OPERAÇÃO

**Arquivo:** `server/src/index.ts`

```typescript
// No handler de telemetry:
socket.on('telemetry', (data) => {
  // ... addTelemetryFrame() ...
  socket.to(currentSession).emit('telemetry', data);
  // ❌ NÃO chama saveDatabase()!
});
```

O `db.ts` tem `saveDatabase()` mas **não é chamado** após cada operação no `index.ts`.

**Impacto:** Se o servidor cair entre operações, os dados **NÃO são persistidos** no arquivo.

**Correção:** Adicionar `saveDatabase(db)` após cada operação de escrita:
```typescript
import { getDatabase, saveDatabase } from './db.js';
// ...
addTelemetryFrame(currentSession, frame);
saveDatabase(getDatabase());  // ✅ Persiste imediatamente
```

---

### 🟡 PROBLEMA 8: useExamState NÃO INTEGRA COM WEBSOCKET

**Arquivo:** `apps/mobile/src/hooks/useExamState.ts`

```typescript
export function useExamState() {
  // ❌ NÃO recebe sendExamEvent do WebSocket!
  const { getRoundLetters, recordResponse, startExam } = useExamState();
  // ...
  const recordResponse = useCallback((correct: boolean, extra?: {...}) => {
    // ...
    const roundLog = { ... };
    // ❌ NÃO envia roundLog para servidor!
    // ❌ NÃO envia resultado final para servidor!
  });
}
```

**Impacto:** O exame funciona localmente, mas **nenhum dado chega ao servidor** para persistência.

---

### 🟢 PROBLEMA 9: PatientHistory NÃO MOSTRA TREND DE logMAR

**Arquivo:** `apps/bancada/src/components/PatientHistory.tsx`

O componente mostra uma **tabela** de exames, mas **NÃO tem gráfico/visualização** do trend de logMAR ao longo do tempo.

**Impacto:** O profissional não consegue visualizar a **evolução da acuidade** do paciente de forma gráfica.

---

### 🟢 PROBLEMA 10: ErrorScreen NÃO USA NOVOS TIPOS DE ERRO

**Arquivo:** `apps/mobile/src/components/ErrorScreen.tsx`

O `ErrorScreen` ainda usa os tipos antigos:
```typescript
type ErrorType = 'camera' | 'microphone' | 'webgl' | 'generic' | null;
```

Mas o `FaceDetector` agora emite erros específicos:
```typescript
type CameraErrorType = 'not-allowed' | 'not-found' | 'not-readable' | ...;
```

**Impacto:** As mensagens específicas de erro ("Toque no cadeado", "Feche Zoom") **NÃO SÃO MOSTRADAS** ao usuário.

---

## 📋 RESUMO DE PROBLEMAS POR GRAVIDADE

| # | Problema | Gravidade | Impacto |
|---|----------|-----------|---------|
| 1 | `useVideoStream` não recebe `sendVideoFrame` | 🔴 **Alto** | Vídeo não chega à bancada |
| 2 | `SessionLogger` não envia dados para servidor | 🔴 **Alto** | Nenhum dado persiste no servidor |
| 3 | `useTracking` não envia telemetria | 🔴 **Alto** | Telemetria não persiste |
| 4 | `WelcomeScreen` não envia patient info | 🔴 **Alto** | Paciente não identificado no banco |
| 5 | `useWebSocket` não exporta `sendVideoFrame` | 🟡 **Médio** | Vídeo não funciona |
| 6 | `SessionLogger` perdeu funcionalidades | 🟡 **Médio** | Sem backup offline |
| 7 | Servidor não salva banco após cada op | 🟡 **Médio** | Risco de perda de dados |
| 8 | `useExamState` não integra WebSocket | 🔴 **Alto** | Exame não persiste |
| 9 | `PatientHistory` sem gráfico de trend | 🟢 **Baixo** | UX inferior |
| 10 | `ErrorScreen` não usa erros específicos | 🟢 **Baixo** | Mensagens genéricas |

---

## 🎯 CONCLUSÃO

O commit 9f046db implementou **muitas correções importantes**:
- ✅ Banco de dados SQLite completo
- ✅ API REST funcional
- ✅ WebSocket com persistência
- ✅ Singleton do FaceDetector
- ✅ Calibração real no store
- ✅ Constantes do staircase corrigidas
- ✅ distance_mm calculado
- ✅ Erros específicos da câmera

**MAS** há **problemas críticos de integração**:
- Os dados do exame **NÃO CHEGAM** ao servidor porque a cadeia de envio está quebrada
- `useExamState` → não envia rounds
- `useTracking` → não envia telemetria (ou envia com distanceMm=null)
- `SessionLogger` → foi simplificado demais, perdeu envio
- `useWebSocket` → não exporta `sendVideoFrame`
- `WelcomeScreen` → não envia patient info completo

**Para o sistema funcionar end-to-end, é necessário corrigir a integração entre mobile e servidor.**

---

*Análise gerada em 17/07/2026 — Kimi AI*
