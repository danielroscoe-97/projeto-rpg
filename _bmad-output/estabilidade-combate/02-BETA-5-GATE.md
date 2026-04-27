# Beta #5 Gate — Estabilidade Combate

**Plan:** Estabilidade Combate (Sprint CR-1)
**Gate:** Sessão real com DM Lucas Galuppo
**Data-alvo:** Terça-feira 2026-05-05 (~7 dias após Sprint 1 start)
**Duração estimada:** 2-3h de combate + 30min debrief
**Objetivo:** provar que as 5 camadas (L1..L5) funcionam em condições reais, não só em unit+E2E

---

## Por que precisamos deste gate

E2E automatizados (CR-04) cobrem cenários isolados e controlados. O que eles **não** cobrem:

- Variabilidade real de Wi-Fi doméstico (drops de 2-30s, DNS flap, ISP throttling)
- Múltiplos players simultâneos em conexões distintas (4G, Wi-Fi, cable)
- Sessão de duração realística (3h+, onde buffer overflow pode acontecer naturalmente)
- Fluxos narrativos onde o Mestre faz ações em bursts (round turbo vs pausa longa)
- **Percepção subjetiva do Mestre** — "eu me preocupei com a conexão em algum momento?"

Sem gate real, a gente merga Sprint 1 achando que fechou e descobre falha em Beta #6.

---

## Preparação pré-gate (semana antes — durante Sprint 1)

### Infra readiness (Seg 2026-04-28 a Sex 2026-05-02)

- [ ] Sprint 1 CR-01..CR-06 merged em master
- [ ] Deploy prod estável há >48h antes do Beta #5 (sem hotfix no dia)
- [ ] Sentry rules configuradas (ver [Observabilidade](#observabilidade))
- [ ] Dashboard "Estabilidade Combate" criado (Sentry ou similar)
- [ ] Supabase plan mantido no upgrade pós-incident (sem downgrade surpresa)

### Comunicação com o Lucas (Seg 2026-05-04)

- [ ] Confirmar horário com o Lucas
- [ ] Pedir campanha "alta pressão" (mesma vibe Beta #4 — 19 combatants, BBEG lendário) pra stress-test
- [ ] Alinhar que vamos gravar tela do lado dele (com consentimento) pra caçar UX issues
- [ ] Pedir ao menos 2 players diferentes (de dispositivos/conexões diferentes — se 1 é mobile 4G, melhor)
- [ ] Alertar que se acontecer incident, a gente pausa combat, debuga, retoma (não cancela)

### Nosso lado (Ter 2026-05-05, dia do gate)

- [ ] Dashboard Sentry aberto em monitor secundário
- [ ] Log tail do Vercel aberto em terminal
- [ ] Sentry alerts pra Slack no modo "notify immediately"
- [ ] Ter `supabase-realtime-logs` disponíveis (se precisar pull)
- [ ] Journal size (`journals.size` via debug endpoint ou Sentry custom metric) visível

---

## Cenários obrigatórios (matriz de teste)

Durante a sessão, a gente ativamente induz (ou aguarda ocorrer naturalmente) os seguintes cenários e valida o comportamento:

### Cenário S1 — Disconnect curto do player (happy path resume)

| Item | Valor |
|---|---|
| **Setup** | Combate ativo, round 3+, 10+ combatants |
| **Ação** | 1 player desliga Wi-Fi por 15-30s |
| **Expected** | Skeleton aparece após 500ms. Quando volta Wi-Fi, skeleton some em <3s, estado correto (HP, turn, conditions). Sem refresh manual. |
| **Evidence** | Screenshot/vídeo do skeleton. Log: `resume_success` no Sentry com `events_applied: N`. |
| **Fail if** | Player precisa refresh manual. Player vê HP stale >5s pós-reconnect. Tela branca. Form de re-registro. |

### Cenário S2 — Disconnect longo do player (too_stale fallback)

| Item | Valor |
|---|---|
| **Setup** | Combate intenso, DM em burst de ações (HP updates rápidos) |
| **Ação** | 1 player fica offline >3min durante bursts (150+ eventos) |
| **Expected** | Quando volta, `too_stale` response retornado, fallback `/state` rodado, estado correto |
| **Evidence** | Sentry breadcrumb de `too_stale`. Network tab: 1 GET `/events` retornando too_stale + 1 GET `/state` 200. |
| **Fail if** | Estado divergente. Stack trace no Sentry. Player confuso com inconsistência. |

### Cenário S3 — Disconnect do DM mid-combat

| Item | Valor |
|---|---|
| **Setup** | DM rodando combate, players online |
| **Ação** | DM desliga Wi-Fi 20-60s |
| **Expected** | Players vêem "DM offline" banner após ~45s (PLAYER_STALE_THRESHOLD). Nenhum evento novo. Quando DM volta, retoma sem drama. |
| **Fail if** | Players recebem evento fantasma. DM volta e estado divergiu do DB. |

### Cenário S4 — Mobile 4G instável (1 player)

| Item | Valor |
|---|---|
| **Setup** | 1 player no celular em rede celular (4G), fora de Wi-Fi |
| **Ação** | Natural — andar, entrar elevador, etc |
| **Expected** | Reconexões transitórias (1-5s) passam sem skeleton visível (sub-500ms). Disconnects longos (>5s) mostram skeleton. Nenhum drop de evento. |
| **Fail if** | Spam de reconexão na UI. Battery drain percebido. |

### Cenário S5 — Mestre faz ação rápida (burst)

| Item | Valor |
|---|---|
| **Setup** | Round de combate com muitos monstros (15+) |
| **Ação** | DM avança turno + HP update + condition add em sequência (5+ ações em 10s) |
| **Expected** | Todos os players recebem todos os eventos em ordem. Latência P95 <1s. Journal não estoura. |
| **Evidence** | Sentry métrica `broadcast_send_duration`. |
| **Fail if** | Eventos fora de ordem. Latência >3s. |

### Cenário S6 — Validação de registro (late-join mid-combat)

| Item | Valor |
|---|---|
| **Setup** | Combate rolando; 1 player quer entrar late |
| **Ação** | Player abre `/join/[token]` + tenta registrar com init=50, HP=80 (valores altos) |
| **Expected** | Zod schema aceita. Server aceita. Player entra no combate. |
| **Fail if** | Toast genérico. Erro sem destaque no campo. Server rejeita valor válido. |

### Cenário S7 — BBEG com init alto

| Item | Valor |
|---|---|
| **Setup** | DM adiciona BBEG (legendary monster, +12 init mod) |
| **Ação** | DM digita init 32 no setup ou inline edit |
| **Expected** | Aceita sem clamp silencioso pra 30/50 |
| **Fail if** | Valor é clampeado ou rejeitado |

### Cenário S8 — Reveal de monstro hidden mid-combat

| Item | Valor |
|---|---|
| **Setup** | Monstro hidden com display_name "Figura Sombria" |
| **Ação** | DM revela (toggle is_hidden=false) + player refresha |
| **Expected** | **Nunca** nome real aparece. Display name continua sendo exibido. |
| **Fail if** | Player vê nome real por 1 frame ou permanente |

---

## Observabilidade (durante e pós-gate)

### Sentry rules alertando em tempo real

| Rule | Threshold | Ação |
|---|---|---|
| `AbortError em /api/combat/*` | >5 em 5min | Slack DM urgente |
| `too_stale_rate` | >10% em 10min | Slack mention |
| `ConnectionState degraded duration` | >60s | Slack alert |
| `Journal size por sessão` | >80 (80% cap) | Log warning |
| `Resume endpoint 500s` | qualquer | Slack mention |

### Dashboards com visibilidade live

- Supabase Realtime: subscribe success rate, channel error rate
- Estabilidade Combate: resume success, too_stale rate, fallback /state rate, ceiling hits/hour

### Debrief pós-sessão (30min com Lucas)

Perguntas estruturadas:

1. **[Percepção geral]** "De 0-10, quão estável sentiu o combate?" (comparar com Beta #4 que foi ~4-5)
2. **[Skeleton UX]** "Apareceu skeleton em algum momento? Foi rápido demais, irritante?"
3. **[Drops percebidos]** "Lembra de algum momento que algo ficou stale pro player? Ou você não se lembra?"
4. **[DM-side]** "Teve algum momento que *você* se preocupou com conexão?"
5. **[Surprise]** "Aconteceu algo que você não esperava?" (caçar long-tail bugs)
6. **[Blocker]** "Algo te travou fluxo narrativo?"

---

## Success Criteria (done-done do Sprint 1)

**🟢 Pass — ship:**
- Todos 8 cenários (S1-S8) observados OR induzidos sem failure
- Lucas pontua "de 0-10 estabilidade" em **≥8**
- Lucas não se preocupou com conexão em nenhum momento narrativo
- Sentry shows `resume_success_rate > 95%`, `too_stale < 5%`, 0 Sentry alerts críticos durante sessão

**🟡 Partial — ship com follow-up P1:**
- 1-2 cenários observam failure **não-crítico** (ex: flicker de skeleton por 100ms, UI issue estético)
- Lucas pontua 6-7, mas sem narrative breakage
- Métricas OK mas um alert disparou (sem bloquear combate)
- **Ação:** criar 1-3 stories P1 no backlog + ship Sprint 1 + resolver no Sprint 2

**🔴 Fail — bloqueia ship:**
- 1+ cenário falha crítico: player perde evento, nome real vaza, estado divergente não-recuperável
- Lucas reporta narrative breakage (mesmo custo do Beta #4)
- Sentry alert severo durante sessão
- **Ação:** hotfix em branch dedicada, re-teste antes de ship

---

## Após o gate

### Se 🟢 Pass
- [ ] Update `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md` marcando R1-R8 como "Complete"
- [ ] Post-mortem Estabilidade Combate (session retro) em `_bmad-output/estabilidade-combate/03-BETA-5-RETRO.md`
- [ ] Anunciar no changelog/memory que connection resilience é production-grade
- [ ] Avançar pro próximo epic (provavelmente Party Mode HQ Redesign)

### Se 🟡 Partial
- [ ] Criar stories P1 CR-07..N no backlog
- [ ] Ship Sprint 1 mesmo assim
- [ ] Programar Beta #5.5 follow-up após fixes

### Se 🔴 Fail
- [ ] Revert ou hotfix rápido
- [ ] Post-mortem imediato
- [ ] Re-Beta #5 em ≤1 semana

---

## Bônus: sessão instrumentada (opcional)

Se quiser ir além, antes do Lucas começar:

- [ ] Gravar tela do DM (OBS ou Loom) + 1 player (com consentimento)
- [ ] Habilitar logs verbose em dev mode de `broadcast.ts` (info level)
- [ ] Instrumentar cada broadcastEvent com timing pra métrica de latência
- [ ] Pre-load sessão no localhost com DevTools aberto pra re-run post-sessão

Isso custa ~1h de prep extra mas te dá evidência permanente pra refinar patterns no Sprint 2+.
