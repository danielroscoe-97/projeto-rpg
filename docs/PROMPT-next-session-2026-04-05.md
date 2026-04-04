# Prompt — Proxima Sessao de Desenvolvimento (2026-04-05)

> Cole este prompt inteiro em uma nova conversa do Claude Code.
> Ele contem todo o contexto necessario para continuar o trabalho.

---

## CONTEXTO DO PROJETO

Pocket DM (projeto-rpg) — Rastreador de combate D&D 5e. Next.js + Supabase + Tailwind.

**Estado atual (2026-04-04):**
- Demo readiness: ~99%. Todos os bugs QA Tier 1/2/3 criticos foram fixados e deployados.
- 14 bugs resolvidos hoje: mobile touch targets, combat recap, invite flow, error boundaries, combat log, mobile FAB, player onboarding.
- Build limpo: TSC + next build = 0 errors, 0 warnings.
- Vercel deploy automatico via push ao master.

**O que resta agora sao features NOVAS (nao bugs):**

---

## FRENTE 1: Player HQ Epic — Sprint 1 "Co-Piloto de Mesa" (33 SP)

### O que ja existe (70% da infra pronta):
- 30 componentes em `components/player-hq/` (PlayerHqShell, HpDisplay, ResourceDots, SpellSlotsHq, etc.)
- 8 hooks em `lib/hooks/` (useCharacterStatus, useResourceTrackers, usePlayerNotes, useBagOfHolding, etc.)
- Migrations 056-064 escritas (player_characters extended, resource_trackers, journal, npc_notes, spells)
- Rota `/app/campaigns/[id]/sheet` → PlayerHqShell
- Database types em `lib/types/database.ts` (998 linhas)
- RLS policies definidas nas migrations

### O que precisa ser feito (integracao e refinamento):
O trabalho é de ASSEMBLY, nao de criacao. Os componentes existem mas podem precisar de ajustes.

**Stories do Sprint 1:**
1. **PHQ-E1-F1** (3 SP) — Estender Dashboard com secao Player. `DashboardOverview.tsx` + `PlayerCampaignCard.tsx` ja existem.
2. **PHQ-E2-F3** (5 SP) — HP Tracker ao vivo + condicoes. `CharacterStatusPanel.tsx` + `HpDisplay.tsx` + `ConditionBadges.tsx` existem. Hook `useCharacterStatus` com realtime ja existe.
3. **PHQ-E2-F4** (3 SP) — Core Stats + Atributos + Edit Sheet. `CharacterCoreStats.tsx` + `CharacterAttributeGrid.tsx` + `CharacterEditSheet.tsx` existem.
4. **PHQ-E3-F5** (3 SP) — ResourceDots componente generico. `ResourceDots.tsx` ja existe.
5. **PHQ-E3-F6** (5 SP) — CRUD de Resource Trackers. `ResourceTrackerList.tsx` + `AddResourceTrackerDialog.tsx` + hook `useResourceTrackers` existem.
6. **PHQ-E3-F8** (3 SP) — Reset Short/Long Rest/Dawn. `RestResetPanel.tsx` ja existe.
7. **PHQ-E5-F12** (3 SP) — Spell Slots no Player HQ. `SpellSlotsHq.tsx` ja existe.

**Abordagem recomendada:**
1. Aplicar as migrations no Supabase (verificar se 056-057 ja foram aplicadas)
2. Testar rota `/app/campaigns/[id]/sheet` com um user real
3. Verificar que cada componente renderiza e conecta com o hook correto
4. Testar realtime: DM aplica dano → player ve HP atualizar em <2s
5. Polish mobile + testar em 390x844

**Docs de referencia:**
- `docs/sprint-plan-player-hq-2026-04-03.md` — Sprint plan completo
- `docs/epic-player-hq.md` — Epic com schema e stories detalhadas
- `docs/stories/PHQ-*` — Stories individuais com AC

---

## FRENTE 2: Combat Time Analytics Epic (F-43) — ~27 SP

### Feature diferenciadora — nenhum concorrente tem.

**Status:** Sprint plan criado em `docs/epic-combat-time-analytics.md`. Implementacao nao iniciada.

**O que ja existe parcialmente:**
- `turnTimeAccumulated` no combat store (auth e guest)
- `turnStartedAt` state no GuestCombatClient
- `CombatantStats.totalTurnTime` e `turnCount` ja na interface
- Awards Speedster/Slowpoke ja implementados no recap

**Stories do Sprint 1 Core (21 SP):**
1. CTA-01 (4 SP) — Acumular tempo por combatente (auth)
2. CTA-02 (3 SP) — Acumular tempo por combatente (guest)
3. CTA-03 (2 SP) — Undo support para tempo
4. CTA-04 (2 SP) — Injetar tempo no CombatantStats
5. CTA-05 (2 SP) — Duracao total no Leaderboard header
6. CTA-06 (2 SP) — Coluna de tempo no ranking
7. CTA-07 (3 SP) — Awards Speedster + Slowpoke
8. CTA-08 (1 SP) — Share text com tempo
9. CTA-09 (2 SP) — Player view — tempo no leaderboard

**Doc de referencia:** `docs/epic-combat-time-analytics.md`

---

## FRENTE 3: Nice-to-haves Pre-Demo

Itens menores que melhoram a experiencia:

1. **F-44** — Email invite via Novu (TODO em `app/api/campaign/[id]/invites/route.ts:75`)
2. **BUG-I2** — Combat Log + Recap abrem simultaneamente (overlapping)
3. **BUG-I4** — Acid Splash duplicado no compendio (2014/2024 sem diferenciacao)
4. **BUG-T3-03** — og:image endpoint retorna empty reply
5. **Sticky Next Turn no auth mode** — O FAB foi adicionado no guest mode, aplicar parity no `CombatSessionClient.tsx`

---

## REGRAS IMUTAVEIS (do CLAUDE.md)

1. **Combat Parity Rule** — Toda mudanca de combate DEVE verificar Guest/Anon/Auth (3 modos)
2. **Resilient Reconnection** — Conexao do jogador NUNCA pode ser perdida
3. **SRD Compliance** — NUNCA expor conteudo nao-SRD em paginas publicas
4. **HP Tiers** — LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — imutavel
5. **RTK** — Sempre prefixar comandos com `rtk`

---

## COMO COMECAR

Recomendacao de prioridade:
1. **Player HQ Sprint 1** — Maior valor para o beta. Verificar migrations → testar rota → polish.
2. **Combat Time Analytics** — Feature diferenciadora. CTA-01 a CTA-04 sao o core.
3. **Nice-to-haves** — Se sobrar tempo.

Para cada frente, comecar lendo o doc de referencia completo antes de implementar.
