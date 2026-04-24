# Estabilidade Combate — Plan Overview

**Epic:** Connection Resilience (browser multiplayer)
**Codinome:** Estabilidade Combate
**Sprint:** CR-1 (5 dias úteis)
**Owner:** Dani
**Criado em:** 2026-04-24
**Gate final:** Beta #5 com DM Lucas Galuppo (semana que vem)

---

## Por que esse plano existe

Beta #4 (DM Lucas, 2026-04-23) + postmortem Supabase CDC (2026-04-24) expuseram que nossa stack de realtime **sobrevive a cenários felizes mas desmorona em cenários reais de combate**:

- Player anônimo que perde Wi-Fi por 40s **volta com estado stale**. Descobriu HP real de monstro hidden. **Meta-gaming plantado. Narrativa quebrada. Dano irreversível.** (Quote do Piper/Lucas)
- Validação duplicada client/server gerou UX gap (IG-1 do review de PR #48)
- Estado de conexão espalhado em variáveis module-level impede UI de sinalizar "degraded" corretamente
- Heartbeats WS e app-level desalinhados (20s, 30s, 45s threshold) sem fonte única de verdade

PR #48 (merged 2026-04-24) fechou **L1 Transport** e parte de **L5 Validação** via quick-wins. Falta:

- **L1 polish** — state machine explícita (hoje é implícita, espalhada)
- **L3** — sequence + journal + resume (a lacuna crítica)
- **L5 Phase 1** — Zod schema compartilhado (fecha IG-1 + serve de template)
- **L2 polish** — reconciliar timing constants (1h de trabalho)

## Não-goals do Sprint 1

Estes itens **são reais** mas NÃO entram agora porque nenhum foi reportado como dor:

- ❌ **L4 Optimistic UI** — mutações síncronas no client antes do server confirmar
- ❌ **L2 Bidirectional heartbeat deep dive** — só reconciliação timing entra
- ❌ **Event journal em Redis** — in-memory é OK pro MVP (ver tech spec §Decisões)
- ❌ **Multi-DM concurrent sessions** — não é o caso de uso hoje
- ❌ **Migração pra PartyKit/Liveblocks** — fica no Supabase, patterns sobre a infra existente

---

## Framework — 5 Camadas de Resiliência

Toda plataforma multiplayer browser madura converge em 5 camadas. Não estamos inventando — estamos adotando patterns já canonizados.

| # | Camada | Problema que resolve | Canon industrial | Nosso estado |
|---|---|---|---|---|
| **L1** | Transport retry — exp backoff + jitter + ceiling + state machine | "WebSocket caiu, recupere" | Socket.io (2011), Phoenix (2015), Ably | ✅ 80% (PR #48) — falta state machine explícita |
| **L2** | Heartbeat bidirectional — app-level ping/pong | "Conexão zumbi que não diz que morreu" | Phoenix, STOMP, Slack RTM | ⚠️ 50% (timing drift) |
| **L3** | Sequence + journal + resume | "Voltei, o que perdi?" | IRC (1988), Matrix `/sync`, Slack RTM, Discord Gateway `Resume` | ❌ 10% (temos `_seq` mas não usamos) |
| **L4** | Optimistic UI + reconciliation | "UX fluida com 200ms lag" | Linear, Figma, Google Docs | ⚠️ 40% (fora de escopo) |
| **L5** | Idempotent mutations + shared validation | "Retry não duplica, invalid nunca passa" | Stripe idempotency-key, Zod+tRPC | ❌ 20% (duplicação client/server) |

---

## Sprint 1 — Stories

| Story | Título | Prior | Dias | Dep | Camada |
|---|---|---|---|---|---|
| **CR-01** | [Connection state machine explícita](stories/CR-01-connection-state-machine.md) | P0 | 1 | — | L1 |
| **CR-02** | [Event journal + /events?since_seq=X](stories/CR-02-event-journal.md) | P0 | 1 | — | L3 |
| **CR-03** | [Client useEventResume hook + skeleton](stories/CR-03-client-event-resume.md) | P0 | 1 | CR-01, CR-02 | L3 |
| **CR-04** | [E2E zero-drop reconnect](stories/CR-04-e2e-zero-drop.md) | P0 | 0.5-1 | CR-01..03 | gate |
| **CR-05** | [Zod schema compartilhado (player-registration)](stories/CR-05-zod-shared-validation.md) | P1 | 0.5 | — | L5 |
| **CR-06** | [Heartbeat timing reconciliation](stories/CR-06-heartbeat-timing.md) | P2 | 0.125 | — | L2 |

**Total:** ~5 dias com 30% buffer. P0 em 4 dias, P1-P2 preenche buffer.

---

## Roadmap Sugerido — 5 Dias Úteis

Sprint 1 começa **segunda-feira (2026-04-28)**. Beta #5 com Lucas na **terça-feira 2026-05-05** (7 dias depois, 2 dias de buffer pós-sprint pra polish).

| Dia | Entrega |
|---|---|
| **Seg** | CR-01 Connection state machine |
| **Ter** | CR-02 Event journal + endpoint |
| **Qua** | CR-03 Client resume hook + skeleton |
| **Qui** | CR-04 E2E zero-drop + CR-05 Zod schema |
| **Sex** | CR-06 Heartbeat timing + buffer + QA manual |
| **Sáb-Dom** | Buffer + documentação |
| **Seg 2026-05-04** | Prep para Beta #5 (Sentry alerts, dashboards) |
| **Ter 2026-05-05** | 🎲 Beta #5 com Lucas — gate final |

---

## Beta #5 — Success Criteria (Gate de Done-Done)

Ver [02-BETA-5-GATE.md](02-BETA-5-GATE.md) pro plano detalhado. Resumo:

1. **Zero-drop comprovado em sessão real** — player sai 30s+ em mobile 4G, volta, vê HP correto de monstros e todos os eventos perdidos aplicados sem refresh manual
2. **Anti-metagame mantido** — nenhum frame de nome real de hidden monster em nenhum cenário
3. **Zero "player perdido"** — se um jogador cair, ele volta sozinho, sem Mestre intervir
4. **CDC não satura** — upgrade Supabase + nosso isolamento de hot path mantém <5% error rate no `/api/combat/*`
5. **Piper/Lucas feedback:** "não lembrei da conexão em nenhum momento"

---

## Roadmap Pós-Sprint 1 (Backlog)

| Item | Trigger pra priorizar | Esforço |
|---|---|---|
| CDC audit + doc de isolamento de hot path | Agora (quick-win 1h) | 1h |
| Zod schemas phase 2 (combat mutations: add/remove/initiative/HP) | Próxima feature de combat | 2-3h/mutation |
| L2 bidirectional heartbeat deep dive | Se reportarem "DM aparece online mas não responde" | 1-2 dias |
| L4 Optimistic UI (HP updates + turn advance) | Se reportarem "delay de clique" | 2-3 dias |
| Event journal migration pra Upstash Redis | >50 DMs simultâneos OR restart serverless vira problema | 1 dia |
| Multi-DM concurrent sessions (co-Mestre) | Feature request futura | 1 sprint |

---

## Arquivos do plano

```
_bmad-output/estabilidade-combate/
├── 00-PLAN-OVERVIEW.md          ← este arquivo (tela única)
├── 01-TECH-SPEC.md              ← arquitetura detalhada (Winston)
├── 02-BETA-5-GATE.md            ← plano de teste com Lucas
└── stories/
    ├── CR-01-connection-state-machine.md
    ├── CR-02-event-journal.md
    ├── CR-03-client-event-resume.md
    ├── CR-04-e2e-zero-drop.md
    ├── CR-05-zod-shared-validation.md
    └── CR-06-heartbeat-timing.md
```

---

## Referências

- Postmortem: `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md`
- Spec reconexão: `docs/spec-resilient-reconnection.md`
- Beta #4 feedback: `docs/beta-test-session-4-2026-04-23.md`
- PR #48 (L1+L5 quick-wins): `https://github.com/danielroscoe-97/projeto-rpg/pull/48`

**Decisões travadas:**
- Permanecer no Supabase Realtime (não migrar pra PartyKit/Liveblocks agora)
- Event journal in-memory no MVP, Redis só quando escalar
- Sprint 1 antes de Beta #5 (não adicionar escopo)
- Lucas é o DM do Beta #5
