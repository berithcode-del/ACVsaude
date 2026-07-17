# Visão Acuidade Visual

Exame de Acuidade Visual Assistido por IA — sistema distribuído (mobile + bancada).

## Especificações

- `especificacao_acuidade_visual_IA.md` — Algoritmo, estrutura e construção (v2.0)
- `arquitetura_reconstrucao_v3.md` — Arquitetura de duas interfaces + WebSocket (v3.0)
- `adendo_design_interface.md` — Design system, tokens, componentes, animações (v1.0)
- `PLANO_IMPLEMENTACAO.md` — Plano de implementação em 6 sprints

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Estado | Zustand |
| Socket | Socket.io (servidor + cliente) |
| Tracking | MediaPipe Face Mesh |
| Gráficos | Chart.js (bancada) |
| Monorepo | npm workspaces + Turborepo |

## Estrutura

```
visao-acuidade-visual/
├── apps/
│   ├── mobile/         # App do paciente (smartphone) — porta 3000
│   └── bancada/        # Painel do técnico (desktop) — porta 3001
├── packages/
│   └── shared/         # Tipos, constantes, design tokens, utils
├── server/             # Servidor WebSocket relay — porta 3002
├── turbo.json
└── package.json
```

## Instalação

```bash
npm install
```

## Como Rodar (Turborepo — tudo em paralelo)

```bash
npm run dev
```

Inicia **todos os serviços simultaneamente** em um único terminal:

| Serviço | Porta | URL |
|---------|-------|-----|
| App Mobile | 3000 | http://localhost:3000 |
| Bancada | 3001 | http://localhost:3001 |
| Servidor | 3002 | http://localhost:3002/health |

### Individualmente (se preferir)

```bash
npm run dev:server    # Servidor WebSocket
npm run dev:bancada   # Painel técnico
npm run dev:mobile    # App paciente
```

## Testar no Celular (Rede Local)

1. Descubra o IP do computador:
   ```powershell
   ipconfig | Select-String IPv4
   ```
   (ex: `192.168.0.10`)

2. No navegador do celular (Chrome/Safari):
   - `http://192.168.0.10:3001` → **Bancada** (painel do técnico)
   - `http://192.168.0.10:3000` → **Mobile** (app do paciente)

3. Fluxo de teste:
   - Abra a **Bancada** → clique "Criar Sessão"
   - Anote o código `ABCD-EFGH`
   - Abra o **Mobile** → toque "Iniciar Exame"
   - Bancada mostra telemetria, vídeo e eventos em tempo real

## Scripts

```bash
npm run dev          # Tudo em paralelo (Turbo)
npm run build        # Build de produção
npm run typecheck    # TypeScript check em todos workspaces
```

## Build

```bash
npm run build
```

| App | JS (gzip) | CSS |
|-----|-----------|-----|
| Mobile | 231 kB (73 kB) | 16.9 kB |
| Bancada | 417 kB (137 kB) | 12.6 kB |
