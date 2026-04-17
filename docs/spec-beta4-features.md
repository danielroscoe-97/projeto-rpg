# Spec Mestre — Beta 4 Features (Sprints 3/4/5)

**Data:** 2026-04-17
**Autoria:** Party mode (Paige facilitando, Winston/Amelia/Sally/John/Bob/Quinn/Mary/Barry contribuindo) + update pós-critique por Claude Opus 4.7
**Status:** ✅ Authoring complete — pronto pra execução
**Destino:** Beta 4 (quinta 2026-04-23). Shipar **TUDO**: S3.1 → S5.7 + S3.6 (i18n bug novo).
**Baseline:** master `e92ebdc2` (= HEAD pós-hotfixes de 2026-04-17 16h BRT)
**Migrations aplicadas em prod:** 136, 137, 138, **139 (hotfix RPC)**
**Próxima migration livre:** **140**

---

## ⚠️ Updates pós-criação deste doc (2026-04-17 tarde)

Lista de mudanças em prod que aconteceram DEPOIS do doc ser escrito de manhã. Quem for executar: leia isso antes.

### Hotfixes deployados
1. **Migration 139** (`139_fix_cast_late_vote_onconflict.sql`) — RPC `cast_late_vote_via_token` tinha `ON CONFLICT` sem o predicado `WHERE session_token_id IS NOT NULL` (bug PG 42P10 — partial index não inferível). Todos os POST `/api/feedback` retornavam 500. Aplicada + verificada via curl. **S5.2 Favoritos tem que usar migration 140, não 139. S5.6 Trigger tem que usar 141, não 140.** Apêndice C atualizado.
2. **Fix UX `allowChange` em `DifficultyRatingStrip`** (commit `e92ebdc2`) — componente travava após 1º click; misclick era unrecoverable. Adicionado prop `allowChange` (default `false` pra in-session poll continuar travado, `true` no `/feedback/[token]`). Sem impacto em features pendentes.

### Status real de S5.5 Content Additions
S5.5 foi **SHIPPADO** em commit `b2dbdfba` durante a tarde. Detalhe: descoberta que os 3 itens **já existiam** em `data/srd/items.json`; o gap real era tradução PT-BR ausente. Agent identificou:
- "Rod of the Pact Keeper" → 6 variantes já existentes (DMG 2014 + DMG 2024)
- "Bracers of Illusionist" era typo → correto é **"Illusionist's Bracers"** (GGR)
- "Astral Shards" plural errado → correto é **"Astral Shard"** (TCE)
Adicionadas 8 entradas PT-BR em `data/srd/item-descriptions-pt.json`. Seção S5.5 abaixo deve ser lida como **referência/reconstruction** — não re-executar.

### Bug sistêmico descoberto durante S5.5 — **NOVO ITEM S3.6**
`lib/srd/srd-search.ts:388-394` (`injectTranslationsAndRebuild`) faz lookup `translations.items[i.id]` mas `item-descriptions-pt.json` tá indexado por `toSlug(name)`. Afeta PT-BR search de **TODOS os 2707 itens do compêndio**. Provável causa raiz adicional do feedback do Lucas "X não aparece na busca" — complementa S3.3 (acentos), não substitui. Ver S3.6 abaixo (nova seção).

### Regra nova pra checklist — SW cache bump
Aprendido no Track B do beta 3: toda mudança em **broadcast type ou ABI crítica** (types trafegados, payloads de realtime, shape de data trafegado) tem que bumpar `CACHE_VERSION` em `public/sw.js` + soak 24h antes de flag flip. S5.1 (Polymorph) piggyback em `CombatStateBroadcast` — caso óbvio. Adicionado ao Apêndice G.

### Scope S5.1 confirmado pelo Dani (2026-04-17 tarde)
"isso aqui [polymorph + 2 HP bars] seria útil para polymorph **e wildshape**, importante já entrar."

Doc de manhã definiu MVP apenas como "Polymorph / 2 HP bars". **Dani quer Wildshape também** (druida). Implicações:
- **Polymorph (spell)** — mantém INT/WIS/CHA, substitui game stats por beast
- **Wild Shape (druid feature)** — mantém INT/WIS/CHA + proficiencies; reverte com overflow damage se dano > temp HP (diferente de Polymorph)

Há spec separada mais completa em `docs/spec-polymorph-wildshape.md` (~16h de dev com os 2 casos). Seção S5.1 abaixo cobre MVP com 2 HP bars; **considerar suplementar com spec separada pra wildshape overflow damage logic** (~3h adicional), ou shipar MVP polymorph em B4 + wildshape em B5.

### Handoff anterior **NÃO é referência histórica** — é complementar
Este doc e `docs/handoff-beta3-to-beta4.md` cobrem coisas diferentes:
- Este doc: deep-specs features novas
- Handoff: contexto executivo + inventário de docs + decisions log do ciclo

Leia ambos. Não demote um.

---

## 📜 Source of truth policy (leia primeiro)

Este doc é o **índice único** pra todo o trabalho do beta 3 → beta 4. Para features que já tinham spec canônico (H5–H14 no UX spec, Findings do spike), aqui vai **resumo + refs + gotchas**, não duplicação. Para features sem spec (S5.1 Polymorph, S5.2 Favoritar, S5.3 Recharge, expansões de S5.4/S5.5/S5.6), aqui vai **spec deep** suficiente pra codar direto.

Hierarquia de docs:

1. **Este doc (`spec-beta4-features.md`)** — entry point + deep-spec pras features novas
2. **[docs/epic-2-combat-ux-hotfixes.md](epic-2-combat-ux-hotfixes.md)** — spec UX canônico (H5–H14, design tokens, i18n inventory, a11y)
3. **[docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md)** — spec arquitetural canônico (Findings)
4. **[docs/beta-test-session-3-2026-04-16.md](beta-test-session-3-2026-04-16.md)** — feedback bruto do Lucas (fonte primária)
5. **[CLAUDE.md](../CLAUDE.md)** — regras imutáveis (Combat Parity, Resilient Reconnection, SRD Compliance, SEO)

Os seguintes docs viram **referência histórica** (não source of truth mais):

- `docs/sprint-plan-beta3-remediation.md` — sprint plan antigo. Substituído pela seção "Merge order" no apêndice.
- `docs/PROMPT-*` anteriores — prompts de agente específicos, podem ser arquivados ou deletados.

Os seguintes docs são **complementares** (ler junto com este):

- `docs/handoff-beta3-to-beta4.md` — contexto executivo + status de todo o ciclo de remediation + decisions log
- `docs/spec-polymorph-wildshape.md` — spec mais profunda pra S5.1 (inclui regras específicas de Wild Shape overflow damage)
- `docs/content-adds-beta3-items.md` — report do S5.5 shipado + bug sistêmico i18n (leia antes de S3.6)
- `docs/code-review-track-*.md` + `docs/code-review-final-2026-04-17.md` — padrões de qualidade esperados (os reviews do beta 3 são referência pra review do beta 4)

---

## 🎯 Escopo confirmado (1 DM + 5 players = ship tudo)

**Sample size:** Lucas (DM) + 5 players. Feedback qualitativo profundo da sessão de 2026-04-16.

**Decisão de escopo:** shipar tudo que está listado abaixo antes do beta 4 (semana de 2026-04-21). Sem cortes. Nice-to-have vira must-have porque o próximo beta precisa validar o máximo de hipóteses.

**14 features, 3 sprints lógicos, merge sequencial com worktrees paralelas:**

| Sprint | Feature | Canonical spec | Esforço | Flag |
|--------|---------|----------------|---------|------|
| S3.1 | HP numérico com barra | [H5](epic-2-combat-ux-hotfixes.md) | 4h | `ff_hp_thresholds_v2` |
| S3.2 | HP individual em grupo | [H9](epic-2-combat-ux-hotfixes.md) + [Finding 3](spike-beta-test-3-2026-04-17.md) | 2h | — |
| S3.3 | Busca compêndio com acentos | [H6](epic-2-combat-ux-hotfixes.md) | 3h | — |
| S3.4 | Remover/deletar grupo inteiro | [H10](epic-2-combat-ux-hotfixes.md) | 5h | — |
| S3.5 | Fetch orchestrator unificado | [Finding 4D](spike-beta-test-3-2026-04-17.md) + deep-spec abaixo | 4-6h | — |
| **S3.6** | **i18n injector fix (bug sistêmico PT-BR search)** | **deep-spec abaixo** | **1-2h** | — |
| S4.1 | Auto-scroll polish + pulse | [H8](epic-2-combat-ux-hotfixes.md) + [Finding 5](spike-beta-test-3-2026-04-17.md) | 2h | — |
| S4.2 | Condições custom pelo DM | [H11](epic-2-combat-ux-hotfixes.md) | 3h | `ff_custom_conditions_v1` |
| S4.3 | Quick actions (Dodge/Dash/etc) | [H12](epic-2-combat-ux-hotfixes.md) | 3h | — |
| S4.4 | Login nudge contextual | [H14](epic-2-combat-ux-hotfixes.md) | 2h | — |
| S5.1 | Polymorph / 2 HP bars | deep-spec abaixo | 6h | `ff_polymorph_v1` |
| S5.2 | Favoritar monstros/itens/conds | deep-spec abaixo | 4h | `ff_favorites_v1` |
| S5.3 | Recharge dice roller (Richard) | deep-spec abaixo | 3-4h | — |
| S5.4 | Guest recap persistence | [Finding 9](spike-beta-test-3-2026-04-17.md) + deep-spec abaixo | 1h | — |
| ~~S5.5~~ | ~~Content additions~~ | ~~deep-spec abaixo~~ | — | — ✅ **SHIPPED** commit `b2dbdfba` |
| S5.6 | Encounter duration telemetry | [Finding 8](spike-beta-test-3-2026-04-17.md) + deep-spec abaixo | 1h | — |
| S5.7 | Recap: First Blood (fix Assassino bug) | deep-spec abaixo | 1.5h | — |

**Total (atualizado pós-updates):** ~44-46h dev + review + merge + deploy + smoke. S5.5 já shipped (-2h), S3.6 novo (+1-2h), S5.1 opcionalmente +3h se incluir Wildshape overflow. Realista em uma semana com 3–5 worktrees paralelas.

---

## 🔒 Regras globais (CLAUDE.md recap — violação = blocker)

### Combat Parity (toda mudança em combat UI)

Antes de considerar feature completa, documentar a linha correspondente na [parity matrix global](#parity-matrix-mestra) e implementar onde aplica:

- **Guest** (`/try`) — `GuestCombatClient.tsx`, Zustand + localStorage
- **Anônimo** (`/join/[token]`) — `PlayerJoinClient.tsx`, Supabase anon auth
- **Autenticado** (`/invite/[token]`) — `PlayerJoinClient.tsx`, Supabase auth + campaign_members

### Resilient Reconnection (zero-drop guarantee)

Qualquer mudança em realtime/conexão: verificar checklist em CLAUDE.md. Ordem absoluta: `pagehide` → `sendBeacon` → `broadcast` → `visibilitychange` bidirecional → storage persist → `reconnect-from-storage no mount` → DM stale detection timer. **Não depender de UM sistema só.**

### SRD Compliance

- **S5.5 crítico**: qualquer item/monstro adicionado em `public/srd/` DEVE estar em SRD 5.1, SRD 5.1 2024, ou MAD (Monster-a-Day, parceria r/monsteraday). Rod of Pact Keeper (DMG) → só `data/srd/`, nunca `public/srd/`.
- Depois de mexer em `data/srd/*.json`, SEMPRE rodar `npx tsx scripts/filter-srd-public.ts`.

### SEO

- Nada em S3.x/S4.x/S5.x toca SEO direto. Se tocar: ver `docs/seo-architecture.md`.
- `S4.4 Login nudge` introduz nova route de retorno — sanitizar via whitelist (ver H14).

### SW cache version bump (aprendido no Track B beta 3)

Toda mudança em **broadcast type** ou **ABI crítica trafegada** (shape de payloads em realtime, novos event types, alteração de campos obrigatórios) DEVE:

1. Bumpar `CACHE_VERSION` em `public/sw.js` (ex: `v3` → `v4`)
2. **Soak 24h em prod** antes de flag flip (dá tempo pro SW antigo expirar nos clientes)
3. DM side só emite com flag ON após soak; player side handler shipa ANTES (backwards compat)

Features impactadas neste sprint:
- **S5.1 Polymorph** — piggyback em `CombatStateBroadcast` adicionando campo `polymorph` → **bump obrigatório**
- **S5.7 First Blood** — mudança de type `assassin → first_blood` em `AwardType` + backward compat no render → **bump recomendado** (ABI de AwardType)
- **S4.2 Condições custom** — não muda broadcast (custom conditions trafegam no mesmo array de conditions) → **não precisa bump**

**NÃO precisa bump:** S3.x/S4.1/S4.3/S4.4/S5.2/S5.3/S5.4/S5.6 (todos alteram só UI local ou DB server-side).

### HpStatus union (crítico pra S3.1 / S3.2 / S5.1)

```typescript
export type HpStatus = "FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";
```

Este tipo é trafegado em broadcasts. **NÃO ADICIONE** `DEFEATED` ao union — clientes PWA cacheados quebram. Use tipo derivado client-side:

```typescript
export type HpDisplayState = HpStatus | "DEFEATED";
export function deriveDisplayState(c: { hp_status: HpStatus; current_hp: number }): HpDisplayState {
  return c.current_hp <= 0 ? "DEFEATED" : c.hp_status;
}
```

Mesma regra pra S5.1 (HP bar secundária de polymorph): **não trafegar estado derivado via broadcast**.

### i18n parity

Toda key nova DEVE aparecer em `messages/pt-BR.json` **e** `messages/en.json`. CI falha se houver key só num idioma.

### Testing

- Projeto usa **Jest**, não Vitest. `rtk vitest run` não existe aqui.
- Playwright e2e roda em CI mas dev server pode estar offline — compilar é obrigatório, rodar é best-effort.

---

## 📋 TOC

- [SPRINT 3 — estrutural](#sprint-3--estrutural)
  - [S3.1 — HP numérico com barra](#s31--hp-numérico-com-barra)
  - [S3.2 — HP individual em grupo](#s32--hp-individual-em-grupo)
  - [S3.3 — Busca compêndio com acentos](#s33--busca-compêndio-com-acentos)
  - [S3.4 — Remover/deletar grupo inteiro](#s34--removerdeletar-grupo-inteiro)
  - [S3.5 — Fetch orchestrator unificado](#s35--fetch-orchestrator-unificado)
  - [S3.6 — i18n injector fix (bug sistêmico PT-BR search)](#s36--i18n-injector-fix)
- [SPRINT 4 — features + polish](#sprint-4--features--polish)
  - [S4.1 — Auto-scroll polish + pulse](#s41--auto-scroll-polish--pulse)
  - [S4.2 — Condições custom pelo DM](#s42--condições-custom-pelo-dm)
  - [S4.3 — Quick actions](#s43--quick-actions)
  - [S4.4 — Login nudge contextual](#s44--login-nudge-contextual)
- [SPRINT 5 — features novas (deep-spec)](#sprint-5--features-novas)
  - [S5.1 — Polymorph / 2 HP bars](#s51--polymorph--2-hp-bars)
  - [S5.2 — Favoritar monstros/itens/condições](#s52--favoritar-monstrositensconições)
  - [S5.3 — Recharge dice roller (Richard)](#s53--recharge-dice-roller-richard)
  - [S5.4 — Guest recap persistence](#s54--guest-recap-persistence)
  - [S5.5 — Content additions](#s55--content-additions)
  - [S5.6 — Encounter duration telemetry](#s56--encounter-duration-telemetry)
  - [S5.7 — Recap: First Blood (fix Assassino bug)](#s57--recap-first-blood-fix-assassino-bug)
- [Apêndice A — merge order](#apêndice-a--merge-order)
- [Apêndice B — feature flags](#apêndice-b--feature-flags)
- [Apêndice C — migrations](#apêndice-c--migrations)
- [Apêndice D — telemetry events](#apêndice-d--telemetry-events)
- [Apêndice E — parity matrix mestra](#parity-matrix-mestra)
- [Apêndice F — rollback paths](#apêndice-f--rollback-paths)
- [Apêndice G — gate de "pronto"](#apêndice-g--gate-de-pronto)

---

# SPRINT 3 — estrutural

## S3.1 — HP numérico com barra

**Canonical spec:** [epic-2 Hotfix 5, linhas 601–823](epic-2-combat-ux-hotfixes.md)

**User story (Lucas, 2026-04-16):** "Full/Light/Moderate sem números — mostrar 70/XX com barra."

**O que entrega:**

- Componente `HpDisplay` com prop `revealExact` (anti-metagaming preservado)
- Numérico exato (70/120) para DM + jogador vendo seu próprio PC + casos `revealExact=true`
- Numérico velado (aproximado via status + barra) para PCs vendo monstros (preserva surpresa)
- Breakpoints atualizados: 100–76% Full, 75–51% Light, 50–26% Moderate, 25–1% Critical (flag `ff_hp_thresholds_v2` default OFF; flag ON migra pra 100–75/50/25 arredondado)

**Críticas do spec (não esquecer):**

- `HpStatus` union: **NÃO adicionar `DEFEATED`** — use `HpDisplayState = HpStatus | "DEFEATED"` com `deriveDisplayState()`. Ver regra global acima.
- Só `CRITICAL` visual muda; `DEFEATED` é derivado.
- Feature flag: `ff_hp_thresholds_v2` em `lib/flags.ts`, default OFF.

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ | `GuestCombatClient.tsx` + `HpDisplay` |
| Anon | ✅ | `PlayerJoinClient.tsx` + `HpDisplay` |
| Auth | ✅ | `PlayerJoinClient.tsx` + `HpDisplay` |

**Telemetry:** `combat:hp_threshold_transition { flag_on, from: HpStatus, to: HpStatus }` (opcional, com flag ON)

**Effort:** 4h

**Gate:** tsc clean, `HpDisplay` unit tests (>10 cases: boundaries, revealExact on/off, defeated derived), parity matrix preenchida, flag toggle testado.

---

## S3.2 — HP individual em grupo

**Canonical spec:** [epic-2 Hotfix 9, linhas 1171–1306](epic-2-combat-ux-hotfixes.md) (display) + [spike Finding 3, linhas 400–474](spike-beta-test-3-2026-04-17.md) (data)

**User story (Lucas):** "Vida do grupo somando HP de todas criaturas tá me fodendo."

**Ownership crítico:**

- **Track C já shippado expôs `groupHealth { min, max, median, membersAlive, membersTotal }`** em `MonsterGroupHeader.tsx` (spike Finding 3). **Dados prontos. Seu job é só render.**
- **NÃO MEXER** em `computeGroupAgg` — ele já foi removido da duplicação em PlayerInitiativeBoard (Track C).

**O que entrega:**

- Dots individuais por membro no header do grupo (role="listitem" dentro de role="list")
- Cada dot color-coded: FULL=green, LIGHT=yellow, MODERATE=orange, HEAVY=red, CRITICAL=dark-red, DEFEATED=gray
- Aria-label: "HP dos membros do grupo: 3 cheios, 2 críticos, 1 caído"
- Responsive: >6 membros colapsa pra "N membros · median: X"
- i18n keys já existem (ver H9 tabela em epic-2 linha 111–117): `combat.hp_full_short`, `hp_light_short`, ..., `hp_defeated_short`, `group_members_hp`

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ | `MonsterGroupHeader.tsx` (reutilizado) |
| Anon | ✅ | `MonsterGroupHeader.tsx` (reutilizado) |
| Auth | ✅ | `MonsterGroupHeader.tsx` (reutilizado) |

**Telemetry:** nenhum evento novo.

**Effort:** 2h (só visual)

**Gate:** tsc clean, visual regression test no Storybook se existir, parity matrix preenchida.

---

## S3.3 — Busca compêndio com acentos

**Canonical spec:** [epic-2 Hotfix 6, linhas 824–967](epic-2-combat-ux-hotfixes.md)

**User story (Lucas):** "Velociraptor não aparece na busca. Owlbear idem. É acento."

**Diagnóstico (confirmado):**

- `PlayerCompendiumBrowser` faz `.toLowerCase().includes(query)` sem normalização de diacríticos.
- `Fuse.js` em outros lugares não tem `ignoreDiacritics`.

**O que entrega:**

- Novo helper `lib/srd/normalize-query.ts` com `normalizeForSearch(s: string): string` (NFD + strip combining marks)
- Caller aplica: `normalizeForSearch(query)` contra `normalizeForSearch(name)` em filtros locais (PlayerCompendiumBrowser + MonsterSearchPanel + quaisquer filtros `.includes()`)
- Fuse instances: adicionar `ignoreDiacritics: true` (opção oficial Fuse v7, ver [node_modules/fuse.js/dist/fuse.d.ts:299](../node_modules/fuse.js/dist/fuse.d.ts#L299))
- Threshold Fuse: 0.35 → 0.4 (recalibrar após fold)

**Crítica do spec:**

- ❌ NÃO use `Fuse.config.getFn` — não existe na API pública do Fuse v7. V1 do spec sugeria, foi corrigido.
- ✅ `ignoreDiacritics` + caller-side normalize = combo obrigatório.

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ | `MonsterSearchPanel.tsx`, `PlayerCompendiumBrowser.tsx` |
| Anon | ✅ | idem |
| Auth | ✅ | idem |

**Testes críticos (Jest):**

- `normalizeForSearch("Velociraptor")` === `normalizeForSearch("velociraptor")` === `normalizeForSearch("VELOCIRAPTOR")`
- `normalizeForSearch("Owlbear")` contém `normalizeForSearch("urso coruja")` → false (nome PT é diferente, OK; teste de tradução vai em Fuse)
- `normalizeForSearch("Dragão Vermelho")` contém `normalizeForSearch("dragao vermelho")` → true (fold de ã → a)
- Fuse search "velocir" retorna "Velociraptor" + "Vólogic" (se existir)
- Threshold 0.4: não inclui muito ruído em queries de 3 letras ("ogr" não retorna "dog")

**Telemetry:** nenhum evento novo.

**Effort:** 3h

**Gate:** tsc clean, Jest >8 cases incluindo queries PT-BR do feedback do Lucas, parity matrix preenchida.

---

## S3.4 — Remover/deletar grupo inteiro

**Canonical spec:** [epic-2 Hotfix 10, linhas 1307–1510](epic-2-combat-ux-hotfixes.md)

**User story (Lucas):** "Tem que ter botão pra remover grupo inteiro, não um por um. E deletar grupo inteiro também."

**Duas ações distintas:**

- **Limpar derrotados** — remove só `current_hp <= 0` do grupo (os vivos ficam na iniciativa)
- **Deletar grupo** — remove TODOS os membros (confirm dialog obrigatório, "Esta ação não pode ser desfeita.")

**Crítica do spec:**

- **Espelhar `handleRemoveCombatant`** ([lib/hooks/useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352-L400)) — não reinventar. Loop de persist + broadcast por combatant + turn_index adjust (`wasCurrentTurnRemoved`, `removedBeforeCurrent`) + state_sync + initiative reorder persist.
- Guest: store-only equivalent (sem broadcasts).
- Touch targets: 32×32 desktop mínimo (WCAG 2.5.8 AA).

**O que entrega:**

- Dois botões no `MonsterGroupHeader.tsx`: "Limpar {N} derrotados" (visível se N>0) + "Deletar grupo" (sempre)
- 2 modais de confirmação (AlertDialog do Radix, já trapeia foco)
- i18n keys já existem (H10 tabela em epic-2 linha 118–127): `combat.group_clear_defeated`, `group_clear_confirm_*`, `group_delete`, `group_delete_confirm_*`
- Turn-index adjust testado em 4 casos: (a) grupo tem turn atual, (b) grupo inteiro antes do turn atual, (c) misto, (d) tudo depois

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM solo) | `GuestCombatClient.tsx` — store mutation |
| Anon | DM-only (players não veem) | `CombatSessionClient.tsx` via `useCombatActions` |
| Auth | DM-only | idem |

**Telemetry:** `combat:group_cleared { group_id, kind: "clear_defeated" | "delete_group", member_count }`

**Effort:** 5h (logic espelhada é a parte pesada)

**Gate:** tsc clean, Jest pra turn-index adjust em 4 casos, e2e DM adiciona grupo de 5, mata 3, "Limpar derrotados" → 2 restam; depois "Deletar grupo" → todos removidos + turn avança.

---

## S3.5 — Fetch orchestrator unificado

**Canonical spec:** [spike Finding 4D, linha 592–594](spike-beta-test-3-2026-04-17.md) + **deep-spec abaixo** (Finding 4D diz "bucket 2-3 dias, precisa de repro antes de refactor"; mas decidimos shipar)

**User story (inferida):** 4–5 loops de polling concorrentes em `/api/session/[id]/state` causaram 219 req/min no pico, 90 × 429 em 2min durante beta 3. Precisa consolidar.

### Arquitetura atual (loops concorrentes identificados)

Em `PlayerJoinClient.tsx`:
1. `lobby-poll` — polling enquanto combate não iniciou
2. `turn-poll` — polling durante o combate
3. `late-join-poll` — polling em CAT-1 ([PlayerJoinClient.tsx:1243](../components/player/PlayerJoinClient.tsx#L1243))
4. `dm-presence-poll` — polling do status do DM
5. `visibility fetchFullState` — dispara a cada `visibilitychange → visible`

Total teórico: 5 fetches/player/minuto × 8 players = 40 req/min baseline. Observado: 200+ req/min (bursting sincronizado).

Track C (shippado) já adicionou:
- Throttle de 5s em `fetchFullState` com `priority` param
- 3-tier reconnection classifier

**S3.5 é o próximo passo: orchestrator único.**

### Deep-spec

**Novo arquivo:** `lib/realtime/fetch-orchestrator.ts`

```typescript
type FetchPriority = "emergency" | "high" | "throttled" | "background";

type FetchRequest = {
  encounterId: string;
  priority: FetchPriority;
  caller: string; // "visibility_change" | "turn_poll" | "lobby_poll" | etc
  timestamp: number;
};

class FetchOrchestrator {
  private queue: FetchRequest[] = [];
  private inFlight = false;
  private lastFetchAt = 0;
  private consecutiveErrors = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;

  // Priority intervals
  private readonly intervals: Record<FetchPriority, number> = {
    emergency: 0,         // bypass throttle
    high: 2_000,          // 2s min between fetches
    throttled: 5_000,     // 5s min (atual comportamento)
    background: 15_000,   // 15s min for polling loops
  };

  // Circuit breaker
  private readonly maxConsecutiveErrors = 3;
  private readonly circuitCooldownMs = 30_000;

  async fetch(req: FetchRequest): Promise<SessionState | null> {
    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenedAt < this.circuitCooldownMs) {
        if (req.priority !== "emergency") return null;
        // emergency bypass — resetar circuito se sucesso
      } else {
        this.circuitOpen = false;
        this.consecutiveErrors = 0;
      }
    }

    // Throttle check (skipped for emergency)
    const minInterval = this.intervals[req.priority];
    if (req.priority !== "emergency" && Date.now() - this.lastFetchAt < minInterval) {
      return null; // drop — o caller já tem os dados recentes
    }

    // Deduplicate: se mesmo caller + mesmo encounterId na fila, dropar
    if (this.queue.some(q => q.caller === req.caller && q.encounterId === req.encounterId)) {
      return null;
    }

    // In-flight coalescing: se já tem fetch rodando, esperar resultado
    if (this.inFlight) {
      return new Promise(resolve => this.queue.push({ ...req, _resolve: resolve } as any));
    }

    return this.executeFetch(req);
  }

  private async executeFetch(req: FetchRequest): Promise<SessionState | null> {
    this.inFlight = true;
    this.lastFetchAt = Date.now();

    try {
      const res = await fetch(`/api/session/${req.encounterId}/state`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const state = await res.json();
      this.consecutiveErrors = 0;

      // Resolve coalesced callers
      const pending = this.queue.splice(0);
      pending.forEach(p => (p as any)._resolve?.(state));

      trackEvent("fetch_orchestrator:hit", { caller: req.caller, priority: req.priority });
      return state;
    } catch (e: any) {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.circuitOpen = true;
        this.circuitOpenedAt = Date.now();
        trackEvent("fetch_orchestrator:circuit_open", { caller: req.caller });
      }
      return null;
    } finally {
      this.inFlight = false;
    }
  }
}

export const fetchOrchestrator = new FetchOrchestrator();
```

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/realtime/fetch-orchestrator.ts` | **NOVO** — singleton exportado |
| `components/player/PlayerJoinClient.tsx:856-972` | MODIFICAR — `fetchFullState` chama `fetchOrchestrator.fetch()` |
| `components/player/PlayerJoinClient.tsx:1243` (late-join CAT-1) | MODIFICAR — priority="emergency" |
| `components/player/PlayerJoinClient.tsx:1816-1831` (visibility) | MODIFICAR — priority="emergency" |
| `components/player/PlayerJoinClient.tsx` (lobby/turn/dm-presence polls) | MODIFICAR — priority="background" |
| `components/session/CombatSessionClient.tsx` (polling calls, se houver) | MODIFICAR — priority="high" ou "background" |

### Callers map (obrigatório confirmar em PR)

| Caller | Priority | Justificativa |
|--------|----------|---------------|
| `visibility_change:visible` | emergency | HIGH-4 mandate do Track C; não pode bloquear |
| `combat:combatant_add_reorder fallback` | emergency | Finding 2 — desync critical |
| `late_join:cat_1` | emergency | Player acabou de entrar; zero dados |
| `auto_join:detected` | emergency | Mesma razão |
| `turn_poll` | high | UX ativo, precisa reativo |
| `lobby_poll` | background | Pre-combat, aceitar 15s |
| `dm_presence_poll` | background | Idem |
| `manual_refresh_button` | emergency | User explicitou intent |

### Test plan

- **Unit (Jest):**
  - 2 chamadas throttled em <5s → 2ª rejeitada (retorna null)
  - 1 throttled + 1 emergency em paralelo → ambas rodam
  - 3 errors consecutivos → circuit opens, background call rejeitada
  - Emergency call bypassa circuit aberto
  - Dedupe: mesmo caller 2× na fila → 1 request
  - Coalescing: 3 callers em in-flight → 1 network call, 3 respostas
- **E2E:** cenário DM + 5 players simulados (mock visibility events) — volume de requests ao endpoint < 50 req/min em rolling minuto

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ❌ N/A (não usa /api/session/[id]/state) | — |
| Anon | ✅ | `PlayerJoinClient.tsx` |
| Auth | ✅ | `PlayerJoinClient.tsx` |

### Telemetry

- `fetch_orchestrator:hit { caller, priority }`
- `fetch_orchestrator:dropped { caller, reason: "throttle" | "dedup" | "circuit" }`
- `fetch_orchestrator:circuit_open { caller }`
- `fetch_orchestrator:circuit_close { duration_ms }`

### Rollout

- Direct deploy (não tem flag; refactor de internals). Monitorar:
  - `/api/session/[id]/state` 429 rate: target <1% requests
  - `fetch_orchestrator:dropped` volume: aceitar 30-50% drops (isso é o ponto)
  - `fetch_orchestrator:circuit_open`: alerta se >2/sessão

### Rollback

- Revert do commit (refactor single-file). Pre-existing throttle volta.

### Effort

- **4-6h** (menos que os 2-3 dias do spike original porque Track C já throttle existente)

### Gate

- tsc clean, 12+ unit tests, e2e volume <50 req/min, parity matrix preenchida

---

## S3.6 — i18n injector fix

**Canonical spec:** (nenhum) — **deep-spec abaixo**. Bug descoberto 2026-04-17 durante shipping de S5.5 (content adds).

**User story (Lucas, 2026-04-16):** "Não consegui achar Velociraptor, Owlbear, Rod of Pact Keeper, etc. no compêndio em PT-BR."

**Complemento a S3.3:** S3.3 trata busca com acentos (fold NFD + `ignoreDiacritics`). **S3.6 trata um bug mais profundo** — traduções PT-BR não são injetadas corretamente no index de busca, então mesmo sem problema de acento, o nome PT-BR não matcha.

### Root cause

[lib/srd/srd-search.ts:388-394](../lib/srd/srd-search.ts#L388-L394), função `injectTranslationsAndRebuild`:

```typescript
// Lookup atual (BUG)
const translation = translations.items[item.id];
//                                     ^^^^^^^^
// item.id = "1-rod-of-the-pact-keeper-dmg" (inclui sufixo de fonte)
// MAS item-descriptions-pt.json tá indexado por toSlug(item.name) = "1-rod-of-the-pact-keeper"
// ⇒ lookup retorna undefined SEMPRE pra items com sufixo de fonte
```

Impacto: **nenhum item tem descrição/nome PT-BR injetado** no index Fuse → `ignoreDiacritics` de S3.3 não resolve por si só porque o name PT-BR nem está no index.

**Afeta:** ~2707 items do compêndio (principalmente os non-SRD que todos têm sufixo de fonte), alguma parcela de monsters e spells também se tiverem o mesmo padrão de indexação. **Confirmar via grep antes de escopar.**

### Deep-spec

**Parte 1 — diagnóstico (obrigatório antes do fix):**

```bash
# 1. Checar shape dos arquivos PT-BR
cd "c:/Projetos Daniel/projeto-rpg"
jq 'keys[:5]' data/srd/item-descriptions-pt.json
jq 'keys[:5]' data/srd/monster-descriptions-pt.json
jq 'keys[:5]' data/srd/spell-descriptions-pt.json

# 2. Checar shape dos items no data/srd
jq '.[0:3] | .[] | {id, name}' data/srd/items.json
# ou onde estiver

# 3. Confirmar que o bug afeta items
grep -n "translations.items\[" lib/srd/srd-search.ts
grep -n "translations.monsters\[" lib/srd/srd-search.ts
grep -n "translations.spells\[" lib/srd/srd-search.ts
```

**Parte 2 — fix (opção B: fallback slug — recomendado, backwards compat):**

```typescript
// lib/srd/srd-search.ts:388-394 (before)
const translation = translations.items[item.id];

// After
const slugKey = toSlug(item.name); // usar helper existente se tiver, senão criar
const translation = translations.items[item.id] ?? translations.items[slugKey];
```

Mesma mudança pra monsters e spells se o bug se propagar.

**Por que não regerar os arquivos PT-BR pra usar id?** Porque:
1. Arquivos PT-BR são gerados por translation script (manual ou CLI) — mudar shape requer re-export de 2707+ entradas
2. Algumas entries são compartilhadas entre versions (ex: item "Potion of Healing" DMG 2014 + 2024) — slug é naturalmente agnóstico de fonte, id não
3. Risco de perda de traduções em migração one-shot

**Opção A (rejeitada):** regerar arquivos PT-BR por id. Breaking. Não recomendado.

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/srd/srd-search.ts:388-394` | MODIFICAR — fallback slug no lookup |
| `lib/srd/srd-search.ts` (outras callsites de `translations.*[...]`) | AUDITAR — mesmo padrão em monsters/spells? |
| `lib/srd/__tests__/srd-search.test.ts` (ou novo) | ADICIONAR — regression tests |

### Test plan

**Unit (Jest):**
- Item com id sufixado + slug na tradução → matches slug, retorna PT-BR name
- Item com id sufixado + SEM slug na tradução → retorna undefined (não crasha)
- Item com id sem sufixo + id na tradução → mantém comportamento atual
- Idempotência: chamar `injectTranslationsAndRebuild` 2× com mesma data → mesmo index

**E2E / manual:**
- Buscar "Bastão do Selo" (tradução do Rod of Pact Keeper) em PT-BR logged in → deve aparecer
- Buscar "Fragmento Astral" (Astral Shard) → deve aparecer
- Buscar "Braceletes do Ilusionista" → deve aparecer
- Buscar "Velociraptor" → deve aparecer sem precisar digitar acento
- Repetir com monsters e spells se fix se estender

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (usa Fuse local) | `lib/srd/srd-search.ts` singleton |
| Anon | ✅ | idem |
| Auth | ✅ (usa `/api/srd/full/` + injetor) | idem |

### Telemetry

Adicionar evento pra medir eficácia do fix:
- `compendium:search_missed { query_length, language, result_count_zero: boolean }`

Após 48h em prod, comparar volume de `result_count_zero: true` em PT-BR — deve cair significativamente se o fix endereçou o root cause.

### Effort

**1-2h** (audit + fix 1-line + 8 Jest cases + manual QA)

### Gate

- tsc clean, 8+ Jest cases cobrindo sufixos e edge cases, QA manual dos 4 nomes PT-BR (Velociraptor, Bastão do Selo, Fragmento Astral, Braceletes do Ilusionista), parity matrix preenchida, telemetria instrumentada.

---

# SPRINT 4 — features + polish

## S4.1 — Auto-scroll polish + pulse

**Canonical spec:** [epic-2 Hotfix 8, linhas 1056–1170](epic-2-combat-ux-hotfixes.md) (visual) + [spike Finding 5, linhas 634–727](spike-beta-test-3-2026-04-17.md) (guard fix, **supersede** H8)

**User story (Lucas):** "Ao passar vez na visão do mestre tem que scrollar."

**Ownership:**

- **Track C já shippado o guard fix** (Finding 5 supersede H8 v1). Agora quando o turno avança, painéis em outras rows fecham via `turn-advancing` CustomEvent.
- **Seu job é SÓ o polish visual**: smooth scroll + pulse highlight 1s + respect `prefers-reduced-motion`.

**O que entrega:**

- Keyframe `turn-pulse` em `app/globals.css`: opacity + scale suave 1s one-shot no combatant-row atual ao mudar turno
- CSS var `--tw-gold` (brand) usado, NÃO oracle-gold
- Listener `prefers-reduced-motion` remove animation
- useEffect deps: `[currentTurnIndex]` apenas (NÃO incluir `combatants`)
- `pulseTimerRef` cleanup no unmount

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM) | `GuestCombatClient.tsx` |
| Anon | ✅ (player vê sua vez) | `PlayerJoinClient.tsx` |
| Auth | ✅ (DM + player) | `CombatSessionClient.tsx` + `PlayerJoinClient.tsx` |

**Telemetry:** nenhum novo.

**Effort:** 2h

**Gate:** tsc clean, visual teste em `prefers-reduced-motion: reduce` = sem animation, parity matrix preenchida.

---

## S4.2 — Condições custom pelo DM

**Canonical spec:** [epic-2 Hotfix 11, linhas 1511–1686](epic-2-combat-ux-hotfixes.md)

**User story (Lucas):** "Condição ponto que o mestre escreve como se fosse um bless ou um toner, tipo um 'cego histérico'."

**O que entrega:**

- DM cria condição com nome + descrição livre (opcional); aplica em combatante; remove quando quiser
- ConditionSelector ganha aba "Custom" com input + botão "Aplicar"
- ConditionBadge renderiza custom com tooltip da descrição
- Feature flag: `ff_custom_conditions_v1` default OFF
- i18n keys já existem (H11 tabela, epic-2 linha 128–132): `combat.custom_condition_label`, `custom_condition_name_placeholder`, `custom_condition_desc_placeholder`, `custom_condition_apply`, `custom_condition_aria`
- Colisão com parsers existentes (`concentrating:X`, `exhaustion:N`): custom conditions usam prefix `custom:` no storage pra não colidir (ex: `custom:Bless:Abençoado`)

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM é único) | `GuestCombatClient.tsx` + `ConditionSelector.tsx` |
| Anon | DM-aplica, players read-only | `CombatSessionClient.tsx` + `ConditionBadge` |
| Auth | idem | idem |

**Telemetry:** `combat:custom_condition_applied { flag_on, name_length }` (não logar o `name` real — LGPD).

**Effort:** 3h

**Gate:** tsc clean, Jest pra parser de `custom:` prefix não colidindo com `concentrating:` e `exhaustion:`, parity matrix preenchida, flag toggle testado.

---

## S4.3 — Quick actions

**Canonical spec:** [epic-2 Hotfix 12, linhas 1687–1869](epic-2-combat-ux-hotfixes.md)

**User story (Lucas):** "Tem que colocar uma condição tipo um status assim que eu tô de dodge."

**O que entrega:**

- Quick-actions strip na ficha do combatente: **Dodge, Dash, Help, Disengage, Hide, Ready** (6 ações D&D)
- Cada ação aplica condição predefinida + tooltip explicando mecânica
- **Dodge auto-expira** no próximo turno do caster (feature oficial D&D): disparado em `handleAdvanceTurn` do DM + broadcast `combat:condition_change` pros players
- Auto-cleanup: lista de ações com `expires_on: "next_turn_of_self"` → cleanup quando o caster inicia seu próximo turno
- Anônimo (player) tem **self-apply** via `onSelfConditionToggle` existente ([PlayerInitiativeBoard.tsx:218-220](../components/player/PlayerInitiativeBoard.tsx#L218)) — expandir pra aceitar quick actions
- i18n keys já existem (H12 tabela, epic-2 linha 133–135): `combat.quick_actions_label`, `combat.action_dodge/dash/help/disengage/hide/ready` + `_desc`

**Crítica:**

- Player **NÃO expõe custom conditions** no self-apply (H11 read-only pra player). Só quick actions padrão.

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM aplica em tudo) | `GuestCombatClient.tsx` + `ConditionSelector.tsx` |
| Anon | ✅ (self-apply + DM-apply) | `PlayerJoinClient.tsx` + `CombatSessionClient.tsx` |
| Auth | ✅ | idem |

**Telemetry:** `combat:quick_action_applied { action: "dodge" | ... | "ready", applied_by: "dm" | "self" }`

**Effort:** 3h

**Gate:** tsc clean, Jest pra auto-cleanup em `handleAdvanceTurn` (case: caster tem Dodge, avança um turno completo, volta pro caster → Dodge foi removido), parity matrix preenchida.

---

## S4.4 — Login nudge contextual

**Canonical spec:** [epic-2 Hotfix 14, linhas 1896–2136](epic-2-combat-ux-hotfixes.md)

**User story (inferida):** Guest/anon abre o compêndio sem saber que login destrava conteúdo extra → perda de conversão.

**O que entrega:**

- Banner não-bloqueante no topo do compêndio quando guest/anon abre
- CTA: "Criar conta grátis" (guest) / "Entrar" (anon) + "Dispensar"
- Dismissal persiste por **3 dias** (TTL fixo) em localStorage com fallback sessionStorage
- `returnUrl` sanitizado via whitelist de paths internos (anti open-redirect)
- Analytics via `trackEvent()` (padrão do projeto), NÃO `window.dispatchEvent`

**Crítica do spec:**

- ❌ NÃO use `authReady && authUserId` pra detecção de real auth — esses valores dão false positives pra anon users
- ✅ Use `isRealAuth = !!user && !user.is_anonymous` ([PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415))
- CTA button: `bg-gold text-surface-primary` (não `text-white` — falha WCAG AA em texto normal sobre gold)

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (CTA "Sign up") | Compendium page wrapper |
| Anon | ✅ (CTA "Log in") | idem |
| Auth | ❌ N/A (não mostra banner) | — |

**Telemetry:**

- `compendium:login_nudge_shown { mode: "guest" | "anon" }`
- `compendium:login_nudge_cta_clicked { mode }`
- `compendium:login_nudge_dismissed { mode, ttl_days: 3 }`

**Effort:** 2h

**Gate:** tsc clean, Jest pra returnUrl whitelist (cases: `/dashboard` OK, `https://evil.com` rejeitado → fallback `/`), parity matrix preenchida, contrast check manual.

---

# SPRINT 5 — features novas

## S5.1 — Polymorph / 2 HP bars

**Canonical spec:** (nenhum) — **deep-spec abaixo**

**User story (Lucas):** "Jogador se transformar num monstro via polymorph… segunda barrinha de vida que vai começar a morrer antes. Ele pode conseguir virar um grupo quando ele transformar."

### Contexto D&D

Polymorph/Wildshape transforma jogador em outra criatura:
- HP da forma nova = HP da criatura nova (não do player)
- Dano ao player na forma: vem primeiro do HP da forma. Só atravessa pro HP original quando forma == 0
- True Polymorph pode virar grupo (ex: Druid → Swarm of Ravens) — feature de swarm não é prioridade mas a estrutura suporta

### Decisão de escopo (MVP + Wildshape)

**Dani confirmou 2026-04-17 tarde:** "isso aqui seria útil para polymorph e **wildshape**, importante já entrar."

**Ship (MVP estendido):** "Transformar virando 1 criatura com 2 HP bars + suportar mecânica de Wild Shape do druida" (fecha 100% do pain do druid/wizard). Swarm fica bucket futuro.

**NÃO implementar:**
- Import automático dos stats do monstro (Lucas pode referenciar manualmente no compêndio)
- Substituição total do sheet (complexidade alta, low value pra MVP)
- Duration timer automático (já existe time tracking no combat)

### Polymorph vs Wild Shape — diferenças que impactam damage logic

| Aspecto | Polymorph (spell) | Wild Shape (druid) |
|---------|-------------------|--------------------|
| Stats retidos | Alignment, personalidade, INT/WIS/CHA | INT/WIS/CHA + proficiencies |
| Stats trocados | Todo resto (AC, HP, speed, attacks, saves, skills) | Físicos (STR/DEX/CON/HP/AC/speed) |
| HP dinâmica | HP beast separado, **original intacto** até revert | HP beast separado |
| Revert com dano zero na forma | Reverte **sem** dano residual no original (dano perdido) | Reverte **com** overflow: dano restante aplica no druida |
| Revert manual | Se concentração quebra → reverte imediato | Bonus action, a qualquer hora |
| Duração | 1h ou até concentração quebrar | Metade do nível do druida em horas |

**Damage logic impacta:** `handleTakeDamage` precisa saber se é polymorph ou wildshape pra calcular overflow corretamente.

**Recomendação:** adicionar campo `polymorph.type: "polymorph" | "wildshape"` no data model. UI de apply tem toggle ou 2 botões separados. Cost de dev: ~3h adicional sobre o MVP original, totalizando ~9h em vez de ~6h.

**Spec complementar:** ver `docs/spec-polymorph-wildshape.md` pra detalhes de overflow logic no wildshape.

### Data model

**Adicionar ao `Combatant` type** (em `lib/types/combat.ts` ou onde combatant viver):

```typescript
interface Combatant {
  // ... campos existentes
  polymorph?: {
    enabled: boolean;
    type: "polymorph" | "wildshape";  // NOVO: afeta damage overflow logic
    form_name: string;        // "Velociraptor" (display-only, não precisa validar)
    temp_current_hp: number;  // HP atual da forma
    temp_max_hp: number;      // HP máximo da forma
    // temp_hp_status é DERIVADO client-side via deriveHpStatus(temp_current_hp, temp_max_hp)
    started_at_turn: number;  // turn_index quando transformou (pra timer/rollback debug)
  };
}
```

**Damage logic por type:**

```typescript
// Em handleTakeDamage
if (polymorph.enabled) {
  const overflow = Math.max(0, damage - polymorph.temp_current_hp);
  polymorph.temp_current_hp = Math.max(0, polymorph.temp_current_hp - damage);
  
  if (polymorph.temp_current_hp === 0) {
    if (polymorph.type === "wildshape" && overflow > 0) {
      // Wild Shape: overflow vai pro druida (RAW)
      original_hp -= overflow;
    }
    // Polymorph: overflow perdido (RAW — "any excess damage is lost")
    endPolymorph(combatant, "damage");
  }
}
```

**Broadcast type:**

- `polymorph` field vai no `CombatStateBroadcast` existente (piggyback, não novo broadcast channel)
- `temp_hp_status` **NÃO vai no broadcast** — é derivado client-side (mesma regra do HpStatus)

### Comportamento lógica

1. DM clica "Polymorph" no combatant sheet → modal com 3 inputs:
   - Form name (texto livre)
   - Form max HP (número)
   - Form AC (opcional, display-only)
2. On submit: `setPolymorph({ enabled: true, form_name, temp_current_hp: max, temp_max_hp: max, started_at_turn: currentTurnIndex })`
3. HP display do combatant mostra **2 bars empilhadas**: form HP em cima (gold border pra destacar), original HP embaixo (desaturado)
4. Damage logic ([lib/hooks/useCombatActions.ts](../lib/hooks/useCombatActions.ts) — `handleTakeDamage`):
   - `if polymorph.enabled && polymorph.temp_current_hp > 0`: subtrai primeiro da forma
   - Overflow: se dano > temp_current_hp, overflow vai pro original HP
   - `temp_current_hp === 0`: forma colapsa, auto-remove polymorph, seta flag `polymorph_ended_by_damage` no log
5. Healing: só no HP da forma **enquanto transformado**. Post-revert, healing vai pro original (comportamento normal).
6. DM pode manualmente clicar "End Polymorph" → reverte sem dano residual
7. Quando `temp_current_hp === 0`, trigger:
   - `combat_action_log`: "Velociraptor form of João foi destruído" (i18n)
   - `polymorph` object cleared
   - Broadcast `combat:state_update`

### UI

- Modal `PolymorphModal.tsx` (novo) — DM triggered
- `HpAdjuster.tsx` ([components/combat/HpAdjuster.tsx](../components/combat/HpAdjuster.tsx)) — adicionar section "Polymorph" quando `polymorph.enabled === true`:
  - Quick-adjust para HP da forma (`-1`, `-5`, `-10`, custom)
  - Botão "End Polymorph" destacado em amarelo
- `CombatantRow.tsx` — renderizar 2 HP bars se polymorph ativo:
  - Label: `form_name` em cima, nome real embaixo
  - Bar superior: `deriveHpStatus(temp_current_hp, temp_max_hp)` — usa mesmos tokens do HpDisplay (S3.1)

### Flag

`ff_polymorph_v1` default OFF. Toggle em staging, testa com Lucas, flip prod.

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/types/combat.ts` (ou onde Combatant vive) | ADICIONAR campo `polymorph?` |
| `components/combat/PolymorphModal.tsx` | **NOVO** |
| `components/combat/CombatantRow.tsx` | MODIFICAR — render 2 HP bars se polymorph |
| `components/combat/HpAdjuster.tsx` | MODIFICAR — section polymorph |
| `lib/hooks/useCombatActions.ts` (`handleTakeDamage`) | MODIFICAR — damage absorption logic |
| `lib/flags.ts` | ADICIONAR `ff_polymorph_v1` |
| `messages/pt-BR.json` + `messages/en.json` | ADICIONAR keys i18n |

### i18n keys novas

```
combat.polymorph.trigger: "Polymorph / Transformar" / "Polymorph / Transform"
combat.polymorph.modal_title: "Transformar {name}" / "Transform {name}"
combat.polymorph.form_name_label: "Nome da forma" / "Form name"
combat.polymorph.form_name_placeholder: "Ex: Velociraptor" / "e.g. Velociraptor"
combat.polymorph.form_max_hp: "HP máximo da forma" / "Form max HP"
combat.polymorph.form_ac_optional: "CA da forma (opcional)" / "Form AC (optional)"
combat.polymorph.apply: "Transformar" / "Transform"
combat.polymorph.end_button: "Encerrar transformação" / "End polymorph"
combat.polymorph.form_hp_label: "HP da forma ({form_name})" / "Form HP ({form_name})"
combat.polymorph.form_destroyed: "{form_name} foi destruído; {name} volta à forma original" / "{form_name} was destroyed; {name} reverts"
combat.polymorph.ended_manually: "{name} encerrou a transformação" / "{name} ended polymorph"
```

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM pode transformar qualquer combatente incluindo PC próprio) | `GuestCombatClient.tsx` |
| Anon | DM-triggered, jogador vê 2 bars da sua forma | `CombatSessionClient.tsx` + `PlayerJoinClient.tsx` |
| Auth | idem | idem |

### Test plan

- **Jest:**
  - Damage 10 → temp_current_hp 20 → 10/20; original intacto
  - Damage 25 → temp_current_hp 20 → 0/20, overflow 5 pro original; polymorph ended
  - Damage exatos 20 → temp_current_hp 20 → 0/20, polymorph ended, zero overflow
  - Heal 5 durante polymorph → só temp_current_hp +5 (original intacto)
  - DM "End Polymorph" manual → polymorph cleared, HP original intacto
- **E2E:** DM aplica polymorph em PC, dá dano, confirma 2 bars atualizadas em tempo real em PlayerJoinClient.

### Telemetry

- `combat:polymorph_applied { form_name_length, temp_max_hp, target_kind: "pc" | "npc" }`
- `combat:polymorph_ended { reason: "damage" | "manual", turns_active }`

### Rollback

- Flag OFF → modal não aparece, damage logic fallback pro comportamento normal. Dados `polymorph` em combatants ativos: degradam gracefully (ignorados sem erro).

### Effort

**6h** (modal + data model + damage logic + UI 2 bars + tests)

### Gate

tsc clean, 6+ Jest cases, e2e DM→polymorph→dano→overflow, parity matrix preenchida, flag toggle validado.

---

## S5.2 — Favoritar monstros/itens/condições

**Canonical spec:** (nenhum) — **deep-spec abaixo**

**User story (Lucas):** "Favoritar as fichas dos monstros pra ele aparecer como um atalho dentro do combate."

### Decisões de escopo (confirmadas)

- **Scope:** monstros + itens + condições favoritáveis (3 kinds). Spells fica bucket.
- **Persistência:** 
  - Guest: `localStorage` com key `pdm:favorites:v1`
  - Anon: `localStorage` (mesma key; perdem quando limpam browser, aceitável)
  - Auth: Supabase table `user_favorites` (persistente, sync cross-device)
- **Limite:** 50 favoritos por kind (100 total ≈ cap razoável, anti-abuse)
- **UX de acesso rápido:** aba "Favoritos ⭐" no topo do compêndio (primeira aba, default visível). Dentro do combate: botão atalho que abre compêndio já filtrado por favoritos.

### Data model

**Migration 140** (novo arquivo — **renumerada de 139 porque 139 virou hotfix em prod**):

```sql
-- 140_user_favorites.sql
create table public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('monster', 'item', 'condition')),
  slug text not null,
  favorited_at timestamptz not null default now(),
  unique(user_id, kind, slug)
);

create index user_favorites_user_kind_idx on user_favorites(user_id, kind);

-- RLS
alter table user_favorites enable row level security;

create policy "users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

create policy "users can insert own favorites"
  on user_favorites for insert
  with check (auth.uid() = user_id);

create policy "users can delete own favorites"
  on user_favorites for delete
  using (auth.uid() = user_id);
```

**⚠️ Crítico (CLAUDE.md — SRD compliance):** Migration só cria table + RLS. **NUNCA** adicionar trigger em `auth.users` (viola SRD compliance rule por "acessar auth internals"). Favoritos são plain references ao slug; dados do monstro/item/condição continuam em `data/srd/`.

### API routes

- `GET /api/favorites?kind=monster` → `{ favorites: [{ slug, favorited_at }] }`
- `POST /api/favorites` body `{ kind, slug }` → 201 Created
- `DELETE /api/favorites` body `{ kind, slug }` → 204 No Content

Rate limit: 30/min por user_id (previne abuse).

### Client storage (Guest/Anon)

**Novo:** `lib/favorites/local-store.ts`

```typescript
type Favorite = { kind: "monster" | "item" | "condition"; slug: string; favorited_at: number };
const KEY = "pdm:favorites:v1";
const MAX_PER_KIND = 50;

export function getFavorites(kind?: string): Favorite[] { /* ... */ }
export function addFavorite(kind: string, slug: string): boolean { /* enforce cap */ }
export function removeFavorite(kind: string, slug: string): void { /* ... */ }
export function isFavorite(kind: string, slug: string): boolean { /* ... */ }
```

### Hook unificado

**Novo:** `lib/favorites/use-favorites.ts`

```typescript
export function useFavorites(kind: "monster" | "item" | "condition") {
  const { user } = useAuth();
  const isAuth = !!user && !user.is_anonymous;

  // auth → react-query fetching /api/favorites
  // guest/anon → subscribe to localStorage + BroadcastChannel (cross-tab sync)

  return { favorites, add, remove, isFavorite, loading };
}
```

### UI

- **Compendium tab bar** — adicionar "⭐ Favoritos" como primeira tab (default ativa se tiver favoritos, senão "Monstros")
- **Cards (monster/item/condition)** — ícone de estrela no canto superior direito:
  - ⭐ outline se não favorito, ⭐ filled se favorito
  - Click toggle. Touch target 32×32.
  - Aria: `aria-pressed={isFavorite}`, `aria-label="Favoritar {name}"`
- **Combat quick access** — no CombatantSetupRow/AddCombatantForm, adicionar toggle "Ver só favoritos" no topo do picker

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (localStorage) | `MonsterSearchPanel`, `ConditionCard`, `ItemCard`, `EncounterSetup` |
| Anon | ✅ (localStorage) | idem |
| Auth | ✅ (API + localStorage fallback offline) | idem |

### i18n keys novas

```
favorites.tab_label: "Favoritos" / "Favorites"
favorites.empty_state: "Nenhum favorito ainda. Clique na ⭐ pra começar." / "No favorites yet. Click ⭐ to start."
favorites.favorite_aria: "Favoritar {name}" / "Favorite {name}"
favorites.unfavorite_aria: "Remover {name} dos favoritos" / "Remove {name} from favorites"
favorites.limit_reached: "Limite de {max} favoritos por categoria atingido." / "Limit of {max} favorites per category reached."
favorites.filter_toggle: "Mostrar só favoritos" / "Show favorites only"
```

### Flag

`ff_favorites_v1` default OFF. Toggle em staging, testa, flip prod.

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/140_user_favorites.sql` | **NOVO** (renumerado — 139 virou hotfix) |
| `app/api/favorites/route.ts` | **NOVO** |
| `lib/favorites/local-store.ts` | **NOVO** |
| `lib/favorites/use-favorites.ts` | **NOVO** |
| `components/compendium/PlayerCompendiumBrowser.tsx` | MODIFICAR — adicionar tab Favoritos |
| `components/oracle/MonsterSearch.tsx` | MODIFICAR — estrela nos cards |
| `components/oracle/ItemCard.tsx` | MODIFICAR — estrela |
| `components/oracle/ConditionCard.tsx` | MODIFICAR — estrela |
| `components/combat/AddCombatantForm.tsx` | MODIFICAR — filter favoritos |
| `lib/flags.ts` | ADICIONAR `ff_favorites_v1` |
| `messages/pt-BR.json` + `en.json` | ADICIONAR keys |

### Test plan

- **Unit:** localStorage store (add/remove/cap 50/kind/multi-tab via BroadcastChannel)
- **Unit:** API route auth check (anon user rejected), RLS tested
- **E2E:** 
  - Guest: favorita 3 monstros, vai pra tab Favoritos, vê os 3
  - Auth: favorita em device A, vê em device B (cross-device sync)
  - Guest → Auth: ao logar, opcional "Importar favoritos locais?" (v2 feature, bucket)

### Telemetry

- `favorites:added { kind }`
- `favorites:removed { kind }`
- `favorites:tab_opened { count }`
- `favorites:limit_reached { kind }` (alerta se frequente)

### Rollback

- Flag OFF → tab escondida, estrelas escondidas. Dados persistem (localStorage + DB) — re-enable sem perda.

### Effort

**4h**

### Gate

tsc clean, 8+ unit tests, e2e guest + auth, parity matrix preenchida, migration applied em staging primeiro.

---

## S5.3 — Recharge dice roller (Richard)

**Canonical spec:** (nenhum) — **deep-spec abaixo**. Substitui/unblocks [epic-2 Hotfix 13](epic-2-combat-ux-hotfixes.md#hotfix-13--richard-clicável-dice-roller-do-combatente) (era BLOCKED).

**User story (Lucas, verbatim):** "O Richard não tá dando pra clicar, ele tem que dar pra clicar pra ser o D6, né?"

**Clarificação (Dani, 2026-04-17):** "Richard" = **Recharge** (transcrição do áudio errou). É o dice roller de habilidades de monstro que têm `(Recharge X)` / `(Recharge X-Y)`.

### Contexto D&D

Monstros com habilidades "Recharge":
- Exemplos: Ancient Red Dragon's Fire Breath `(Recharge 5-6)`, Behir's Lightning Breath `(Recharge 5-6)`, Beholder's Eye Rays (individuais, sem recharge — não entra)
- Depois de usar, ability fica "depleted"
- Início do próximo turno do monstro: rola d6. Se ≥ threshold → "recharged", disponível. Senão continua depleted.
- Edge cases:
  - `(Recharge 5-6)` → threshold 5
  - `(Recharge 6)` → threshold 6
  - `(Recharge 4-6)` → threshold 4
  - `(Recharge X–Y)` com en-dash → tratado igual `-` hyphen
  - `(Recharges after a Short or Long Rest)` → **NÃO** é Recharge dice — ignora (zero impact in-combat, DM gerencia manualmente)

### Data model

**In-combat only** — não precisa persistir entre combates.

Estado vive no combatant (store Zustand no guest; state no CombatSessionClient no DM auth):

```typescript
interface Combatant {
  // ...
  rechargeState?: Record<string, { depleted: boolean; threshold: number }>;
  // key = nome normalizado da action (ex: "fire_breath")
}
```

Não trafega via broadcast por combatante individual — em vez disso, piggyback no estado de combate existente (state_sync já cobre).

**Reset entre combates (regra):**

- `rechargeState` é **scoped por combatant instance** no encounter atual, **NÃO persistido** entre encounters
- Quando combate encerra (`/api/encounters/[id]/end`), `rechargeState` é descartado junto com o combat state
- Quando combate novo inicia, todos os monstros começam com `rechargeState: {}` (ou ausente → default comportamento)
- **DM clona monstro** (adiciona 2× "Ancient Red Dragon"): cada instância tem `rechargeState` INDEPENDENTE — o `combatant.id` é único por instância, não por slug do monstro

**Edge case:** jogador polymorpha em monstro com Recharge (S5.1). **Out of scope pra S5.3 MVP** — a forma nova tem `rechargeState` zerado, mas o DM precisa clicar manualmente (não tem UI pro player). V2 consideraria expor.

### Parser

**Novo:** `lib/combat/parse-recharge.ts`

```typescript
const RECHARGE_RE = /\(Recharge\s+(\d)(?:[-–](\d))?\)/i;

export function parseRecharge(actionName: string): { threshold: number; key: string } | null {
  const match = actionName.match(RECHARGE_RE);
  if (!match) return null;
  const threshold = parseInt(match[1], 10);
  const key = actionName
    .replace(RECHARGE_RE, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return { threshold, key };
}

export function rollRecharge(threshold: number): { roll: number; recharged: boolean } {
  const roll = Math.floor(Math.random() * 6) + 1;
  return { roll, recharged: roll >= threshold };
}
```

### UI

**Novo:** `components/combat/RechargeableAction.tsx` — wrapper for action blocks em `MonsterStatBlock.tsx` quando tem recharge.

```tsx
<div className="action-block">
  <div className="trait-name flex items-center gap-2">
    {actionName}
    {rechargeInfo && (
      <RechargeButton
        depleted={state.depleted}
        threshold={rechargeInfo.threshold}
        onToggle={/* depleted: true → rolls d6 / depleted: false → marca true */}
      />
    )}
  </div>
  <p className={cn("trait-desc", state.depleted && "opacity-50")}>
    {renderDesc(desc, actionName)}
  </p>
</div>
```

**`RechargeButton.tsx`:**

- Available (not depleted): ícone de dado + tooltip "Marcar como usada (depleted)"
  - Click → `setDepleted(true)`, logs `"{action} usada (Recharge {threshold}+)"` no combat-action-log
- Depleted: ícone de hourglass + tooltip "Rolar d6 para recarregar (precisa {threshold}+)"
  - Click → `rollRecharge(threshold)`, anima 500ms, mostra `{roll}` flutuando, se `recharged=true` → `setDepleted(false)` + logs "{action} recarregada (rolou {roll})", senão logs "{action} ainda depleted (rolou {roll}, precisa {threshold}+)"

### Integração em MonsterStatBlock

Em [components/oracle/MonsterStatBlock.tsx:527-534](../components/oracle/MonsterStatBlock.tsx#L527-L534), o `SectionBlock` actions hoje passa items direto. Vamos passar um wrapper:

```tsx
<SectionBlock
  title={L.actions}
  items={(monster.actions ?? []).map((item) => ({
    name: item.name,
    desc: getDesc("actions", item.name, item.desc),
    rechargeInfo: parseRecharge(item.name),
    rechargeKey: parseRecharge(item.name)?.key,
  }))}
  renderDesc={renderDesc}
  rechargeState={combatantRechargeState}
  onRechargeToggle={handleRechargeToggle}
/>
```

**Decisão importante:** MonsterStatBlock hoje é usado em múltiplos contextos (compêndio read-only, combate ativo). Na view compêndio read-only, `rechargeState` é undefined → RechargeButton não renderiza (só texto normal). Na view combate, state vem do combatant → botão aparece.

Prop drill: `combatantId` precisa chegar até MonsterStatBlock em contextos de combate — adicionar prop opcional `combatantContext?: { id: string; rechargeState: RechargeState; onRechargeToggle: (key: string) => void }`.

### i18n keys novas

```
combat.recharge.depleted_tooltip: "Rolar d6 para recarregar (precisa {threshold}+)" / "Roll d6 to recharge (need {threshold}+)"
combat.recharge.available_tooltip: "Marcar como usada" / "Mark as used"
combat.recharge.rolled: "{action} rolou {roll}" / "{action} rolled {roll}"
combat.recharge.success: "{action} recarregada!" / "{action} recharged!"
combat.recharge.failed: "{action} ainda aguarda recharge ({roll}/{threshold})" / "{action} still waiting ({roll}/{threshold})"
combat.recharge.depleted_label: "Depleted" / "Depleted"
combat.recharge.used_by: "{caster} usou {action}" / "{caster} used {action}"
```

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (DM solo) | `GuestCombatClient.tsx` — Zustand rechargeState |
| Anon | ✅ DM-only (players não controlam monstros) | `CombatSessionClient.tsx` |
| Auth | ✅ idem | idem |

**Edge case:** player polymorphed em monstro com Recharge (via S5.1). **Out of scope** — player na forma não tem acesso ao statblock pra clicar. DM roda recharge do monstro-forma.

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/combat/parse-recharge.ts` | **NOVO** — parser + roll |
| `components/combat/RechargeableAction.tsx` | **NOVO** |
| `components/combat/RechargeButton.tsx` | **NOVO** |
| `components/oracle/MonsterStatBlock.tsx:527-534` | MODIFICAR — passa recharge info e state |
| `lib/stores/combat-store.ts` (guest) | MODIFICAR — rechargeState por combatant |
| `components/session/CombatSessionClient.tsx` | MODIFICAR — rechargeState + handleRechargeToggle |
| `messages/pt-BR.json` + `en.json` | ADICIONAR keys |

### Test plan

- **Unit (Jest):**
  - `parseRecharge("Fire Breath (Recharge 5-6)")` → `{ threshold: 5, key: "fire_breath" }`
  - `parseRecharge("Lightning Breath (Recharge 5-6)")` → threshold 5
  - `parseRecharge("Antipathic Flood (Recharge 6)")` → threshold 6
  - `parseRecharge("Aberrant Quickness (Recharges after a Short or Long Rest)")` → null (ignora)
  - `parseRecharge("Acid Rain (Recharges on a Short or Long Rest)")` → null
  - `parseRecharge("Fire Breath (Recharge 5–6)")` (en-dash) → threshold 5
  - `parseRecharge("Bite")` → null
  - Random roll: `rollRecharge(5)` 1000× → distribuição ~33% recharged
- **E2E:** DM adiciona Ancient Red Dragon, usa Fire Breath → depleted. Avança turno (simula). Clica recharge → d6 anima → se ≥5 recharged.

### Telemetry

- `combat:recharge_used { monster_slug, action_key }` (marcar depleted)
- `combat:recharge_rolled { monster_slug, action_key, roll, threshold, recharged }`

### Rollback

- Reverter novo componente. Monsters voltam a mostrar Fire Breath como texto puro.

### Effort

**3-4h** (parser 0.5h + UI 1.5h + prop drill MonsterStatBlock 0.5h + tests 1h)

### Gate

tsc clean, 8+ Jest cases cobrindo todos regex variantes, e2e Red Dragon Fire Breath, parity matrix preenchida.

---

## S5.4 — Guest recap persistence

**Canonical spec:** [spike Finding 9, linhas 910–933](spike-beta-test-3-2026-04-17.md) + **expansão abaixo**

**User story (Lucas + Track A review):** "Guest fecha a tab depois de encerrar combate e antes de salvar → perde o recap permanentemente."

### Deep-spec

**Simples:** localStorage persist + 24h TTL + banner de "voltar pro último recap" no remount.

**Arquivos:**

- `components/guest/GuestCombatClient.tsx` linha ~1541 (setShowRecap) + mount effect

**Storage key:** `pdm:guest:last-recap:v1`

**Schema:**

```typescript
{
  report: RecapReport, // mesmo shape do report state in-memory
  savedAt: number,     // Date.now()
  encounterLabel: string, // nome curto pro banner
}
```

**Lifecycle:**

1. Quando `setShowRecap(true)` dispara → também: `localStorage.setItem(KEY, JSON.stringify({ report, savedAt: Date.now(), encounterLabel: report.encounterName || "Último combate" }))`
2. Quando user clica "Fechar recap" / "Novo combate": `localStorage.removeItem(KEY)`
3. No mount do `GuestCombatClient`: ler KEY. Se `Date.now() - savedAt < 24h * 3600 * 1000` → mostra banner não-intrusivo topo: "Você tem um recap pendente do último combate. [Ver recap] [Dispensar]"
4. Expired (>24h) ou ausente → banner não aparece

**UI banner:**

- Classe: `bg-gold/10 border border-gold/30 rounded px-4 py-2 flex items-center justify-between`
- Botão "Ver recap" → `setShowRecap(true)` + rehidrata report do storage
- Botão "Dispensar" → `localStorage.removeItem(KEY)`, banner some

**i18n keys novas:**

```
guest.last_recap_banner_title: "Recap do último combate disponível" / "Last combat recap available"
guest.last_recap_banner_cta: "Ver recap" / "View recap"
guest.last_recap_banner_dismiss: "Dispensar" / "Dismiss"
```

**Parity:**

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ | `GuestCombatClient.tsx` (alvo único desta feature) |
| Anon | ❌ N/A (já persiste via `/api/session/[id]/latest-recap` desde Track A) | — |
| Auth | ❌ N/A (idem) | — |

**Files afetados:**

| Arquivo | Mudança |
|---------|---------|
| `components/guest/GuestCombatClient.tsx` | MODIFICAR — persist no setShowRecap + remount banner |
| `messages/pt-BR.json` + `en.json` | ADICIONAR 3 keys |

**Testes:**

- **Jest** (componente unit):
  - Mount com localStorage vazio → banner não aparece
  - Mount com valid recap <24h → banner aparece
  - Mount com expired recap >24h → banner não aparece + localStorage cleared
  - setShowRecap(true) → localStorage populated
  - Dismiss → localStorage cleared

**Telemetry:**

- `guest:recap_persisted { report_size }`
- `guest:recap_banner_shown { age_hours }`
- `guest:recap_banner_clicked { action: "view" | "dismiss" }`

**Effort:** 1h

**Gate:** tsc clean, Jest 5 cases, visual manual em dev.

---

## S5.5 — Content additions ✅ SHIPPED

**Status:** ✅ Shippado em commit `b2dbdfba` (2026-04-17 tarde). **Seção mantida por completude / reconstruction; NÃO re-executar.**

**Canonical spec:** (nenhum código) — **workflow executado abaixo**

**User story (Lucas):** "Faltam itens: Rod of the Pact Keeper, Bracers of Illusionist, Astral Shards."

### O que foi entregue

Descoberta-chave durante execução: os 3 itens **já existiam** em `data/srd/items.json`. O gap real era tradução PT-BR ausente + 2 typos nos nomes reportados:

- **"Rod of the Pact Keeper"** → confirmado, 6 variantes (DMG 2014 +1/+2/+3 + DMG 2024 +1/+2/+3)
- **"Bracers of Illusionist"** → **typo** → correto é **"Illusionist's Bracers"** (fonte GGR — Guildmasters' Guide to Ravnica)
- **"Astral Shards"** (plural) → **typo** → correto é **"Astral Shard"** singular (fonte TCE — Tasha's Cauldron of Everything)

Commit `b2dbdfba` adicionou 8 entradas PT-BR em `data/srd/item-descriptions-pt.json`:
- `Bastão do Selo de Pacto +1/+2/+3` (6 variantes DMG/XDMG)
- `Fragmento Astral`
- `Braceletes do Ilusionista`

SRD Compliance: CLEAN. Nenhum item em `public/srd/items.json`. Auth-gated via `/api/srd/full/`.

### Bug descoberto que virou S3.6

Durante a execução, descobriu-se que o `injectTranslationsAndRebuild` em `srd-search.ts:388-394` **nunca injeta as traduções PT-BR** (lookup por id vs indexação por slug). Mesmo com essas 8 entradas novas, o Lucas não as encontraria via busca PT-BR **até que S3.6 também seja shippado**.

**Ver S3.6 acima.** Shipar S3.6 é pré-requisito pra validar S5.5 end-to-end.

### Docs relacionadas

- `docs/content-adds-beta3-items.md` — report completo do agent
- `docs/spec-polymorph-wildshape.md` — não relacionado, só link pra referência

### NÃO fazer

- ❌ Não rodar `filter-srd-public.ts` novamente (rodou no agent, `public/srd/` clean)
- ❌ Não re-adicionar os itens (já existem em `data/srd/items.json`)
- ❌ Não criar migration (pura data, sem schema change)

### Status pós-shipping

Workflow original abaixo mantido pra referência caso agente do beta 4 precise adicionar mais content. Regra: **sempre auditar primeiro se item já existe antes de spec'ar "add"**.

---

### Workflow original (referência histórica, NÃO executar)

### Análise SRD compliance

| Item | Origem | SRD 5.1? | Ação |
|------|--------|----------|------|
| Rod of the Pact Keeper | DMG (Core) | ❌ Não é SRD | `data/srd/items.json` apenas, gated via `/api/srd/full/` |
| Bracers of Illusionist | TCE (Tasha's) | ❌ Não é SRD | `data/srd/items.json` apenas |
| Astral Shards | ? (Dani validar — pode ser do BGDiA ou homebrew) | ❓ | **Pendente de confirmação de fonte** |

**Regra CLAUDE.md:** "NUNCA colocar dados completos (não-SRD) em public/".

### Workflow

1. **Dani valida a fonte de "Astral Shards"** (antes de começar):
   - Se homebrew: OK pra anywhere
   - Se DMG/TCE/outro: `data/srd/` only
2. Editar `data/srd/items.json` adicionando os 3 items com schema consistente (mesma estrutura dos existentes)
3. Gerar traduções PT-BR em `data/srd/item-descriptions-pt.json` + `item-names-pt.json`
4. **Rodar** `npx tsx scripts/filter-srd-public.ts` → isso **re-filtra** `public/srd/items.json` aplicando `srd-item-whitelist.json`. Os 3 novos itens NÃO entram (não estão na whitelist — correto).
5. Verificar contagens antes/depois:
   - `data/srd/items.json` — subir de N → N+3
   - `public/srd/items.json` — **sem mudança** (whitelist filtra)
6. Verificar build passa sem erro

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `data/srd/items.json` | ADICIONAR 3 items com schema `{ name, type, rarity, attunement, description, source, srd_2024: false }` |
| `data/srd/item-descriptions-pt.json` | ADICIONAR 3 descrições PT-BR |
| `data/srd/item-names-pt.json` | ADICIONAR 3 entries de slug-map |

**NÃO mexer:**

- `public/srd/items.json` (regenerado pelo script)
- `data/srd/srd-item-whitelist.json` (whitelist derivada do SRD oficial — NÃO adicionar items não-SRD)

### Test plan

- Manual: verificar Supabase `items` table se tiver (Lucas pode ter tentado adicionar lá)
- Manual: rodar `filter-srd-public.ts`, diff de `public/srd/items.json` deve ser vazio
- E2E (auth-logged): buscar "Rod of Pact Keeper" no compêndio → aparece (via `/api/srd/full/`)
- E2E (guest): buscar "Rod of Pact Keeper" → não aparece (correto, não é SRD)

### Parity (comportamento)

| Modo | Vê os 3 items? |
|------|-----|
| Guest | ❌ Não (filtrado por whitelist) |
| Anon | ❌ Não |
| Auth | ✅ Sim (via `/api/srd/full/`) |

### Effort

**2h** (edição de dados + traduções + script run + verify)

### Gate

- Regex da fonte de "Astral Shards" confirmada por Dani **antes** de começar
- Contagens: `data/srd/items.json` +3, `public/srd/items.json` delta 0
- E2E auth vê, guest não vê

---

## S5.6 — Encounter duration telemetry

**Canonical spec:** [spike Finding 8, linhas 893–907](spike-beta-test-3-2026-04-17.md) + **expansão abaixo**

**User story (telemetry leakage, interno):** Agregador reportou "duração média 18s" falsamente porque `encounters.started_at` era NULL pra alguns registros. SUMMARY.md descartou encounter do Lucas.

### Root cause

`encounters.started_at` é preenchido pelo código que transiciona `is_active false → true`, mas:

1. Pode haver paths que só setam `is_active = true` sem tocar `started_at`
2. Encounters antigos (pre-schema-change) têm `started_at = NULL`
3. Guest mode não usa tabela `encounters` (é local-only) — não aplicável

### Deep-spec

**Parte 1 — backfill (one-shot SQL):**

```sql
-- parte da migration 140 ou script manual
UPDATE encounters
SET started_at = created_at
WHERE started_at IS NULL AND is_active = false;
-- justificativa: para encounters já fechados, created_at é o melhor proxy que temos
```

**Parte 2 — DB trigger (migration 140):**

```sql
-- 141_encounter_started_at_trigger.sql (renumerada de 140)
create or replace function ensure_encounter_started_at()
returns trigger
language plpgsql
as $$
begin
  if NEW.is_active = true and OLD.is_active = false and NEW.started_at IS NULL then
    NEW.started_at := now();
  end if;
  return NEW;
end;
$$;

create trigger encounter_started_at_trigger
  before update on encounters
  for each row
  when (OLD.is_active IS DISTINCT FROM NEW.is_active)
  execute function ensure_encounter_started_at();
```

**Parte 3 — auditoria de paths (code):**

Grep por todos os lugares que setam `is_active = true`:

```bash
rtk grep "is_active.*true" --glob "**/*.ts" --glob "**/*.tsx"
```

Para cada match, garantir que ou: (a) seta `started_at: new Date().toISOString()` também, OU (b) confia no trigger pra preencher.

Se o path for API: explicit é melhor, trigger é fallback. Se for SQL direto (raro): confiar no trigger.

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/141_encounter_started_at_trigger.sql` | **NOVO** — trigger + backfill |
| `app/api/session/[id]/start/route.ts` (ou similar) | MODIFICAR — explicit `started_at: now()` |
| Outros paths encontrados via grep | MODIFICAR conforme |

### Test plan

- **SQL manual em staging:**
  - Backfill: `SELECT count(*) FROM encounters WHERE started_at IS NULL AND is_active = false` antes e depois (depois deve ser 0)
  - Trigger: `UPDATE encounters SET is_active = true, started_at = NULL WHERE id = '...'` → verificar started_at não-null após
- **E2E:** iniciar combate, verificar `encounters.started_at` populated (não-null) via Supabase inspect

### Parity

| Modo | Aplicável? |
|------|-----------|
| Guest | ❌ N/A (não usa `encounters` table) |
| Anon | ✅ (DM inicia combate, telemetria correta) |
| Auth | ✅ idem |

### Telemetry downstream

Depois do fix, o agregador `scripts/summarize-encounters.ts` (ou similar) deve:

- Aceitar `duration_seconds` como campo confiável
- Alerta se >5% encounters têm `started_at IS NULL` em rolling 7 days

### Rollback

- Migration reversível: `DROP TRIGGER IF EXISTS encounter_started_at_trigger ON encounters; DROP FUNCTION IF EXISTS ensure_encounter_started_at();`
- Backfill não é reversível (acidental overrides de `started_at`) — aceitável porque era NULL

### Effort

**1h** (0.5h SQL + 0.5h code audit + test)

### Gate

- tsc clean, migration tested em staging, backfill count 0 pós-apply, trigger dispara corretamente

---

## S5.7 — Recap: First Blood (fix Assassino bug)

**Canonical spec:** (nenhum) — **deep-spec abaixo**. Bug identificado 2026-04-17.

**User story (Lucas / Dani, 2026-04-17):** "Assassino tem que mudar pra First Blood e tem que ser a **primeira pessoa que matou alguém**, não o primeiro que morreu."

### Root cause (bug crítico — duas camadas)

**Camada 1 — bug de dados:** [lib/utils/combat-stats.ts:82-84](../lib/utils/combat-stats.ts#L82-L84)

```typescript
if (entry.type === "defeat" && entry.targetName) {
  getOrCreate(entry.targetName).knockouts += 1;  // ❌ incrementa a VÍTIMA
}
```

Quando o log emite `{ type: "defeat", actorName: <quem matou>, targetName: <quem morreu> }`, o `knockouts` é incrementado em `targetName` (a vítima) em vez do `actorName` (o matador). Resultado: o prêmio "Assassino" mostra a pessoa que **mais morreu**, não quem mais matou.

Verificação em [lib/hooks/useCombatActions.ts:269-275, 288-294, 374-380](../lib/hooks/useCombatActions.ts#L269-L275): os entries de defeat são emitidos com `actorName: getCurrentActorName()` (quem causou) e `targetName: before.name` (vítima). Shape é correto. O bug é no agregador.

**Camada 2 — semântica errada:** mesmo corrigindo knockouts, Dani quer mudar:
- "Assassino" → **"First Blood"** (temporal — PRIMEIRO kill do combate, estilo FPS)
- Não é "mais kills" (contagem), é "primeiro kill" (timestamp)

### Deep-spec

**Parte 1 — Fix do bug knockouts (sempre ship, independente):**

Em [lib/utils/combat-stats.ts:82-84](../lib/utils/combat-stats.ts#L82-L84):

```typescript
// ANTES (bug)
if (entry.type === "defeat" && entry.targetName) {
  getOrCreate(entry.targetName).knockouts += 1;
}

// DEPOIS (correção — incrementa quem matou)
if (entry.type === "defeat" && entry.actorName && entry.targetName) {
  // Skip self-defeats (ex: morte por dano de área sem actor claro, ou
  // actor === target sugere autopsia/suicídio narrativo — não conta como kill)
  if (entry.actorName !== entry.targetName) {
    getOrCreate(entry.actorName).knockouts += 1;
  }
}
```

**Parte 2 — Novo award "First Blood":**

Adicionar função dedicada ao invés de reaproveitar `getTopForStat(stats, "knockouts")`:

```typescript
// Em lib/utils/combat-stats.ts, logo antes de buildAwards

/**
 * First Blood — primeira defeat do combate, atribuída a quem matou.
 * Retorna null se ninguém matou ninguém ainda.
 * Considera apenas defeats com actor diferente da vítima.
 */
export function findFirstBlood(entries: CombatLogEntry[]): {
  actorName: string;
  targetName: string;
  round: number;
} | null {
  // Log entries já são preservados em ordem cronológica.
  // Para quebra de empate (mesmo round), assume-se ordem de inserção.
  const firstDefeat = entries.find(
    (e) =>
      e.type === "defeat" &&
      e.actorName &&
      e.targetName &&
      e.actorName !== e.targetName,
  );
  if (!firstDefeat) return null;
  return {
    actorName: firstDefeat.actorName!,
    targetName: firstDefeat.targetName!,
    round: firstDefeat.round,
  };
}
```

Em `buildAwards()` linha 459–468, substituir o bloco "Assassin":

```typescript
// REMOVER:
// Assassin — most knockouts
// const assassin = getTopForStat(stats, "knockouts");
// if (assassin) {
//   awards.push({ type: "assassin", ... });
// }

// ADICIONAR (receber entries como novo parâmetro):
// First Blood — primeiro kill do combate
const firstBlood = findFirstBlood(entries);
if (firstBlood) {
  awards.push({
    type: "first_blood",
    combatantName: firstBlood.actorName,
    value: firstBlood.round,
    displayValue: t("recap_award_value_first_blood", {
      target: firstBlood.targetName,
      round: firstBlood.round,
    }),
  });
}
```

**Nota:** `buildAwards` hoje recebe só `stats`. Precisa receber também `entries: CombatLogEntry[]` (ou o caller passar `firstBlood` já pre-computado). Mudança de assinatura impacta os callers — auditar.

**Parte 3 — Rename type "assassin" → "first_blood":**

Em [lib/types/combat-report.ts:7](../lib/types/combat-report.ts#L7):

```typescript
// ANTES
export type AwardType =
  | "mvp"
  | "assassin"
  | "tank"
  | ...

// DEPOIS
export type AwardType =
  | "mvp"
  | "first_blood"   // ← era "assassin"
  | "tank"
  | ...
```

Callers que fazem match por string literal "assassin" precisam update:
- `lib/utils/combat-stats.ts` linha 745 (emoji map) + 755 (label map)
- `lib/notifications/combat-recap-email.ts:39` (email icon/label map)
- `app/r/[code]/opengraph-image.tsx:12` (OG image icon map)
- `app/r/[code]/page.tsx:80` (Skull icon map) + 91 (label "Assassin")

**Parte 4 — i18n:**

Remover/deprecar `recap_award_assassin` (mas manter por enquanto — algum recap antigo persistido no DB pode ainda ter `type: "assassin"`).

Adicionar keys novas em `messages/pt-BR.json` + `messages/en.json`:

```json
"recap_award_first_blood": "First Blood",  // igual nos 2 idiomas (termo de FPS, universal)
"recap_award_value_first_blood": "abateu {target} no round {round}"  // pt-BR
"recap_award_value_first_blood": "downed {target} in round {round}"  // en
```

### Backward compatibility — recaps antigos persistidos

⚠️ **Decisão de migração:** na DB existem recaps salvos em `encounters.recap_snapshot` (migration 136, Track A) com `type: "assassin"`. Duas opções:

- **A (recomendado):** Rendering layer (`CombatRecap.tsx`, `/app/r/[code]/page.tsx`) aceita **AMBOS** types por 2–3 meses. Mapa de ícone/label:
  ```typescript
  const AWARD_LABELS = {
    mvp: "MVP",
    first_blood: "First Blood",
    assassin: "First Blood",  // ← legacy fallback; maps to first_blood display
    // ...
  };
  ```
  Novos combates emitem `first_blood`; legacy renderiza igual. Zero migration SQL.
- **B:** UPDATE SQL one-shot no `recap_snapshot` JSON pra trocar `assassin → first_blood` nos recaps antigos. Complexo (JSON surgery) e irreversível. **Não recomendado.**

**Usar A.**

### Files afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/utils/combat-stats.ts:82-84` | FIX BUG — incrementa actorName, não targetName, em knockouts |
| `lib/utils/combat-stats.ts` (após buildNarratives) | NOVO — `findFirstBlood()` function |
| `lib/utils/combat-stats.ts:459-468` (buildAwards) | MODIFICAR — substituir Assassin por First Blood; receber `entries` como param |
| `lib/utils/combat-stats.ts:745` (emoji map) | RENAME chave `assassin` → `first_blood` + legacy alias |
| `lib/utils/combat-stats.ts:755` (label map) | RENAME idem |
| `lib/types/combat-report.ts:7` | ADICIONAR `"first_blood"`, manter `"assassin"` por backward compat ou remover |
| `lib/notifications/combat-recap-email.ts:39` | ADICIONAR `first_blood: { icon: "\u{1FA78}", label: "First Blood" }` |
| `app/r/[code]/opengraph-image.tsx:12` | ADICIONAR `first_blood: "\u{1FA78}"` (ou skull mantido) |
| `app/r/[code]/page.tsx:80, 91` | ADICIONAR mapa pra `first_blood` |
| `components/combat/RecapAwardsCarousel.tsx` | AUDITAR se renderiza type explicitly |
| `messages/pt-BR.json:2001` + `messages/en.json` (equiv) | ADICIONAR `recap_award_first_blood`, `recap_award_value_first_blood` |
| Callers de `buildAwards()` | AUDITAR — agora aceita `entries` param |

### Test plan

**Unit (Jest):**

- `findFirstBlood([])` → null
- `findFirstBlood([{type:"attack",...}])` → null (nenhum defeat)
- `findFirstBlood([{type:"defeat", actorName:"Aragorn", targetName:"Orc", round:2}, {type:"defeat", actorName:"Legolas", targetName:"Goblin", round:3}])` → `{ actorName: "Aragorn", targetName: "Orc", round: 2 }`
- `findFirstBlood([{type:"defeat", actorName:"Ciclone", targetName:"Ciclone", round:1}])` → null (self-defeat skipped)
- Bug fix unit: combate com Aragorn dando 2 kills em Orcs → `stats["Aragorn"].knockouts === 2`, `stats["Orc"].knockouts === 0`
- `buildAwards` agora retorna `type: "first_blood"` não `"assassin"` (snapshot test)
- Legacy rendering: `type: "assassin"` em recap antigo renderiza label "First Blood" (backward compat test)

**E2E (manual no staging):**

- Guest + 2 PCs + 2 orcs. Cada PC mata 1 orc (PC1 primeiro). Finaliza combate. Recap mostra "First Blood: PC1 abateu Orc no round N". Tanque/Healer/etc continuam corretos.
- Auth: ver recap antigo (já persistido) — renderiza "First Blood" (via legacy alias), não crash.

### Telemetry

- Nenhum evento novo. `recap_awards_shown` existente (se existir) agrega por type — dashboard de `type: "first_blood"` após shipar, dashboards antigos `assassin` caiam pra 0 com tempo.

### Parity

| Modo | Implementa? | Onde |
|------|-------------|------|
| Guest | ✅ (recap local) | `buildAwards` no GuestCombatClient pipeline |
| Anon | ✅ (recap persisted) | `buildAwards` no CombatSessionClient pipeline |
| Auth | ✅ | idem |

Feature é pure logic — sem diferença entre modos no comportamento.

### Rollback

- Revert commit. Bug volta (Assassino mostra vítima). **Atenção:** recaps novos emitidos no intervalo com `type: "first_blood"` vão renderizar com fallback se rollback remover a key i18n — adicionar alias em rollback branch se precisar.

### Effort

**1.5h** (fix bug 10min + findFirstBlood + rename type + backward compat rendering + i18n + tests)

### Gate

- tsc clean, 8+ Jest cases (incluindo backward compat), recap antigo no DB de staging renderiza ok, novo recap mostra First Blood.

---

# Apêndice A — merge order

Ordem de merge pra minimizar conflito em shared files. Shared files hot (tocados por múltiplas features):

- `PlayerJoinClient.tsx` — S3.5 (orchestrator), S4.1 (pulse), S4.3 (quick actions self-apply), S5.1 (polymorph)
- `CombatSessionClient.tsx` — S4.1, S4.2, S4.3, S5.1, S5.3
- `CombatantRow.tsx` — S3.1, S5.1 (2 HP bars)
- `useCombatActions.ts` — S3.4, S5.1
- `MonsterStatBlock.tsx` — S5.3
- `MonsterGroupHeader.tsx` — S3.2, S3.4
- `messages/pt-BR.json` + `en.json` — S3.1, S3.2, S3.4, S4.2, S4.3, S4.4, S5.1, S5.2, S5.3, S5.4

### Ordem recomendada (commits sequenciais em master após review)

**Fase 1 — migrations + infra (sem UI impact):**
1. `S5.6` migration 141 (trigger + backfill started_at) → staging apply (renumerada de 140)
2. `S5.2` migration 140 (user_favorites) → staging apply (renumerada de 139 porque hotfix ocupou 139)
3. `S3.5` fetch orchestrator (refactor internals, sem UI change) → smoke
4. `S3.6` i18n injector fix (standalone, baixo risco) → smoke via PT-BR search

**Fase 2 — HP visual (bloco coeso):**
5. `S3.1` HP numérico (adiciona HpDisplay, usado por S3.2 e S5.1)
6. `S3.2` HP individual em grupo (consumidor de S3.1)

**Fase 3 — shared UI surfaces:**
7. `S3.4` Remover/deletar grupo (toca MonsterGroupHeader — mesmo arquivo que S3.2)
8. `S3.3` Busca com acentos (isolado; complementa S3.6)

**Fase 4 — combat polish:**
9. `S4.1` Auto-scroll polish + pulse
10. `S4.2` Condições custom
11. `S4.3` Quick actions

**Fase 5 — features isoladas (podem merge em qualquer ordem):**
12. `S5.3` Recharge dice roller
13. ~~`S5.5` Content additions~~ ✅ SHIPPED (commit `b2dbdfba`, pular)
14. `S5.4` Guest recap persistence
15. `S5.7` First Blood (fix bug recap)

**Fase 6 — features que tocam muito:**
16. `S4.4` Login nudge (nova route wrapping, baixo conflito)
17. `S5.1` Polymorph + Wildshape (toca muito — mergear por último pra não rebasar 5× + **requer SW cache bump**)
18. `S5.2` Favoritar (toca cards de compendium — baixo conflito mas alto footprint)

**Gate intermediário entre Fase 5 e 6:** smoke test prod dos endpoints novos (regra nova, ver Apêndice G). 30min de gate, salva horas de hotfix.

### Paralelização via worktrees

3–5 tracks em paralelo, scopes disjuntos:

- **Track α:** S3.1 + S3.2 (HP visual, coeso)
- **Track β:** S3.3 + S3.4 (compêndio + group actions)
- **Track γ:** S3.5 (orchestrator solo)
- **Track δ:** S4.1 + S4.2 + S4.3 (combat polish em série, mesmo client)
- **Track ε:** S4.4 (login nudge, solo)
- **Track ζ:** S5.1 (polymorph, isolado até merge final)
- **Track η:** S5.2 (favoritar, isolado)
- **Track θ:** S5.3 (Richard, isolado)
- **Track ι:** S5.4 + S5.5 + S5.6 + S5.7 (quick wins, agrupados — todos isolados de combat UI)

---

# Apêndice B — feature flags

| Flag | Default | Controla | Gate pra flip |
|------|---------|----------|---------------|
| `ff_hp_thresholds_v2` | OFF | S3.1 thresholds novos (75/50/25) | Beta 4 soak + Lucas valida visual |
| `ff_custom_conditions_v1` | OFF | S4.2 condições custom | Beta 4 soak + parser não-colide |
| `ff_polymorph_v1` | OFF | S5.1 polymorph + wildshape 2 HP bars | SW cache v4 soak 24h + staging test Lucas |
| `ff_favorites_v1` | OFF | S5.2 favoritos | Staging test + migration 140 applied |
| `ff_combatant_add_reorder` | OFF (Track B beta 3 shippado) | Reorder em add | Soak 24h até 2026-04-18 00:00 UTC, depois flip staging → prod (independente de beta 4) |

**Flip cadence atualizado (beta 4 é quinta 2026-04-23):**

- **Sex 2026-04-18:** shipar todas features com flag OFF em prod
- **Sáb 2026-04-19:** SW cache soak de 24h+ das features que bumparam `CACHE_VERSION` (S5.1, S5.7 se shipado)
- **Seg 2026-04-21:** flip em staging — Lucas testa cenários específicos por flag
- **Ter 2026-04-22:** flip em prod **um por vez** com **4-6h entre cada**, pra dar tempo de observar e rollback com calma. Atrasando em relação ao plano original (2-4h era otimista demais — beta 4 é 24h depois; precisa de colchão)
- **Qua 2026-04-23 manhã:** última janela de rollback antes do beta 4 à noite
- **Qua 2026-04-23 noite:** beta 4 com flags ON

**Sem flag (refactor interno):** S3.2, S3.3, S3.4, S3.5, S3.6, S4.1, S4.3, S4.4, S5.3, S5.4, ~~S5.5~~ (shipped), S5.6, S5.7 (legacy compat no render).

**Flag flip pós-beta 3 pendente:** `ff_combatant_add_reorder` — Track B beta 3 com SW cache v3. Soak de 24h completo 2026-04-18 00:00 UTC. Pode flipar sáb 19/04 manhã (não precisa esperar junto com beta 4 flips).

---

# Apêndice C — migrations

### Migrations já aplicadas em prod (histórico)

| Nº | Arquivo | Feature | Status |
|----|---------|---------|--------|
| 136 | `136_encounter_recap_snapshot.sql` | Track A beta 3 (recap persist) | ✅ aplicada 2026-04-17 |
| 137 | `137_backfill_whitelist_post_114.sql` | Track C beta 3 (whitelist) | ✅ aplicada 2026-04-17 |
| 138 | `138_late_vote_via_session_token.sql` | Track F beta 3 (voting) | ✅ aplicada 2026-04-17 |
| **139** | `139_fix_cast_late_vote_onconflict.sql` | **HOTFIX RPC beta 3** | ✅ aplicada 2026-04-17 tarde |

### Migrations NOVAS do beta 4 (apply order)

| Nº | Arquivo | Feature | Reversível |
|----|---------|---------|-----------|
| **140** | `140_user_favorites.sql` | S5.2 | Sim (`DROP TABLE user_favorites`) |
| **141** | `141_encounter_started_at_trigger.sql` | S5.6 | Sim (drop trigger + function); backfill não-reversível |

**⚠️ Apply order:** 140 → 141. Ambas seguras pra staging antes de prod. **Migrations 139 já está em prod; NÃO re-aplicar.**

**Apply command:** `npx supabase db push --linked`

**Verification post-apply:**

```sql
-- 140 (user_favorites)
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_favorites';
SELECT policyname FROM pg_policies WHERE tablename = 'user_favorites';

-- 141 (encounter_started_at_trigger)
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'encounter_started_at_trigger';
SELECT count(*) FROM encounters WHERE started_at IS NULL AND is_active = false; -- deve ser 0
```

### Audit de migration 139 (pra referência histórica)

```sql
-- Verificar que o fix da partial unique tá ativo
SELECT pg_get_functiondef('cast_late_vote_via_token(text,uuid,smallint,uuid)'::regprocedure);
-- deve conter: "ON CONFLICT (encounter_id, session_token_id, voter_fingerprint) WHERE session_token_id IS NOT NULL"
```

---

# Apêndice D — telemetry events

### Novos eventos (14)

| Event | Props | Feature |
|-------|-------|---------|
| `combat:hp_threshold_transition` | `flag_on, from, to` | S3.1 |
| `combat:group_cleared` | `group_id, kind, member_count` | S3.4 |
| `fetch_orchestrator:hit` | `caller, priority` | S3.5 |
| `fetch_orchestrator:dropped` | `caller, reason` | S3.5 |
| `fetch_orchestrator:circuit_open` | `caller` | S3.5 |
| `fetch_orchestrator:circuit_close` | `duration_ms` | S3.5 |
| `combat:custom_condition_applied` | `flag_on, name_length` | S4.2 |
| `combat:quick_action_applied` | `action, applied_by` | S4.3 |
| `compendium:login_nudge_shown` | `mode` | S4.4 |
| `compendium:login_nudge_cta_clicked` | `mode` | S4.4 |
| `compendium:login_nudge_dismissed` | `mode, ttl_days` | S4.4 |
| `combat:polymorph_applied` | `form_name_length, temp_max_hp, target_kind` | S5.1 |
| `combat:polymorph_ended` | `reason, turns_active` | S5.1 |
| `favorites:added` / `favorites:removed` / `favorites:tab_opened` / `favorites:limit_reached` | `kind, count` | S5.2 |
| `combat:recharge_used` | `monster_slug, action_key` | S5.3 |
| `combat:recharge_rolled` | `monster_slug, action_key, roll, threshold, recharged` | S5.3 |
| `guest:recap_persisted` | `report_size` | S5.4 |
| `guest:recap_banner_shown` | `age_hours` | S5.4 |
| `guest:recap_banner_clicked` | `action` | S5.4 |

### Alertas pós-deploy (Sentry/Supabase dashboard)

| Métrica | Threshold | Ação |
|---------|-----------|------|
| `/api/session/[id]/state` 429 rate | >1% rolling 5min | page |
| `fetch_orchestrator:circuit_open` volume | >2/sessão | investigate |
| `favorites:limit_reached` volume | >5/user/day | UI melhoria (pager) |
| `combat:polymorph_ended.reason=damage` volume | qualquer — é normal | dashboard track |
| `encounters.started_at IS NULL` count | >5% rolling 7d | page (trigger broken) |

---

# Apêndice E — parity matrix mestra

Cada feature precisa preencher 3 linhas abaixo. Consolidado:

| Feature | Guest | Anon | Auth |
|---------|-------|------|------|
| S3.1 HP numérico | ✅ | ✅ | ✅ |
| S3.2 HP individual em grupo | ✅ | ✅ | ✅ |
| S3.3 Busca com acentos | ✅ | ✅ | ✅ |
| S3.4 Remover/deletar grupo | ✅ (DM) | ✅ (DM) | ✅ (DM) |
| S3.5 Fetch orchestrator | ❌ (N/A) | ✅ | ✅ |
| S3.6 i18n injector fix | ✅ | ✅ | ✅ |
| S4.1 Auto-scroll polish | ✅ | ✅ | ✅ |
| S4.2 Condições custom | ✅ (DM) | ✅ (DM-apply) | ✅ (DM-apply) |
| S4.3 Quick actions | ✅ (DM) | ✅ (self + DM) | ✅ |
| S4.4 Login nudge | ✅ | ✅ | ❌ (N/A) |
| S5.1 Polymorph | ✅ (DM) | ✅ (DM-apply) | ✅ |
| S5.2 Favoritar | ✅ (localStorage) | ✅ (localStorage) | ✅ (API + local) |
| S5.3 Recharge dice | ✅ (DM) | ✅ (DM) | ✅ (DM) |
| S5.4 Guest recap persist | ✅ | ❌ (N/A) | ❌ (N/A) |
| ~~S5.5 Content additions~~ ✅ SHIPPED | ❌ (não-SRD, by design) | ❌ (não-SRD) | ✅ (full access) |
| S5.6 Encounter duration | ❌ (N/A) | ✅ | ✅ |
| S5.7 First Blood (recap) | ✅ | ✅ | ✅ |

**Regra:** se feature é marcada ✅ pra modo X mas não implementa, é BLOCKER de merge.

---

# Apêndice F — rollback paths

| Feature | Rollback se regressão em prod |
|---------|-------------------------------|
| S3.1 | `ff_hp_thresholds_v2 = false` → volta threshold v1 (numérico ainda aparece, só thresholds voltam ao antigo) |
| S3.2 | revert commit (só visual); fallback pro totalCurrentHp somado pré-Track C — não volta, porque Track C removeu |
| S3.3 | revert commit (helper + Fuse config); busca volta pra pre-acentos (bug conhecido) |
| S3.4 | revert commit; botões somem; user remove combatant 1 por 1 (comportamento antigo) |
| S3.5 | revert commit; volta pro throttle single-file de Track C (ainda funciona, só sem circuit breaker) |
| S3.6 | revert commit do fallback; lookup volta pra só por id (bug original retorna — mas não regride nada além do que já existia) |
| S4.1 | revert CSS keyframe |
| S4.2 | `ff_custom_conditions_v1 = false` → aba não aparece |
| S4.3 | revert commit; quick actions somem; DM aplica cond manualmente via selector |
| S4.4 | revert commit; banner some |
| S5.1 | `ff_polymorph_v1 = false` → modal não aparece; combatants com `polymorph` ativo no DB (nenhum ainda — pre-flag) degrada OK |
| S5.2 | `ff_favorites_v1 = false` → tab + estrelas invisíveis; migration 140 permanece sem harm |
| S5.3 | revert commit; Recharge volta pra texto normal |
| S5.4 | revert commit; localStorage key órfão ignorado |
| ~~S5.5~~ | ~~revert commit de data/ + rerun `filter-srd-public.ts`~~ — já shipped, se precisar reverter: `git revert b2dbdfba` (remove 8 entradas PT-BR, itens continuam buscáveis em EN) |
| S5.6 | drop trigger + function (migration revert) |
| S5.7 | revert commit; recaps NOVOS perdem o award First Blood, mas knockouts volta a contar errado (vítima). Recaps antigos continuam ok via legacy alias. |

---

# Apêndice G — gate de "pronto"

Antes de merge em master, cada feature DEVE ter:

- [ ] `rtk tsc --noEmit` — zero erros
- [ ] `rtk lint` — zero novos errors (pre-existing OK)
- [ ] Jest unit tests novos passam (mínimo de cases documentados na seção Test plan da feature)
- [ ] Playwright e2e compila (rodar é opcional se dev offline — anotar no PR se não rodou)
- [ ] Parity matrix preenchida (Apêndice E) — cada ✅ justificado com arquivo tocado
- [ ] A11y: touch targets ≥32×32 desktop / ≥44×44 mobile; contraste WCAG AA verificado; `prefers-reduced-motion` respeitado em animações; ARIA labels em botões novos
- [ ] i18n: novas keys em `pt-BR.json` E `en.json` (parity 100%)
- [ ] Feature flag default OFF se a feature é marcada como flagged no Apêndice B
- [ ] Telemetry events implementados conforme Apêndice D
- [ ] Rollback path documentado (Apêndice F atualizado se mudou)
- [ ] Code review adversarial passou (3 lentes: Blind Hunter, Edge Case Hunter, Acceptance Auditor)
- [ ] Se tiver migration: staging apply + verify + backup de rollback SQL
- [ ] **Se tocar broadcast type / ABI crítica (S5.1, S5.7): `CACHE_VERSION` em `public/sw.js` bumpado**

### Gate NOVO — smoke test em prod pós-deploy (aprendido no beta 3)

Regra **vermelha** (blocker): pra qualquer feature que adiciona/modifica endpoint HTTP, RPC Supabase, ou route nova, executar o gate abaixo APÓS o push e APÓS o Vercel terminar o deploy:

- [ ] **`curl` end-to-end no endpoint** retorna 2xx com payload esperado (não só HTTP 200 em página estática — verificar JSON shape)
- [ ] Pro RPC Supabase: executar via SQL `SELECT my_rpc(...)` OU via `/api/...` real com payload de teste, verificar shape do return
- [ ] Pra migration com trigger/function: rodar query de verificação do Apêndice C
- [ ] Pra feature realtime: abrir 2 tabs (DM + Player), trigger a action, verificar broadcast chegou

**Por que esse gate é obrigatório:** no beta 3, a Track F shipou com RPC que dava PG 42P10 (ON CONFLICT partial index inference). Review adversarial cobriu segurança/código, e2e Playwright foi `--list` only (não executado). Bug só foi descoberto pelo Lucas quando players tentaram votar. Hotfix foi ~45min a mais + reputação. **Curl end-to-end levaria 2 minutos pra detectar.**

**Exemplo concreto para beta 4:**

```bash
# Após merge de S5.2 (Favoritos):
curl -X POST https://pocketdm.com.br/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: <valid auth cookie>" \
  -d '{"kind":"monster","slug":"velociraptor"}'
# deve retornar 201 + { id, kind, slug, favorited_at }

curl https://pocketdm.com.br/api/favorites?kind=monster \
  -H "Cookie: <valid auth cookie>"
# deve retornar { favorites: [{ slug: "velociraptor", favorited_at: ... }] }
```

### Gate final pra deploy pro beta 4

- [ ] Todas features com gate acima ✅ (S3.1-3.6 + S4.1-4.4 + S5.1-5.4 + S5.6 + S5.7; S5.5 já shipped)
- [ ] Migrations **140, 141** aplicadas em prod (139 já aplicada como hotfix)
- [ ] SW `CACHE_VERSION` bumpado + soak de 24h+ completo ANTES de flip flags ABI-breaking
- [ ] Flags OFF em prod (flip individual a partir de 2026-04-22)
- [ ] Sentry alerts configurados (Apêndice D)
- [ ] Smoke test prod (curl endpoints novos)
- [ ] Dani valida com Lucas em sessão de staging **antes** do beta 4

---

## 🎬 Próximo passo

**Dani valida:**

1. Formato deste spec serve?
2. Decisões de escopo em S5.1/S5.2/S5.3 (descritas em "Decisões de escopo") batem com sua intenção?
3. "Astral Shards" (S5.5) — fonte conhecida, ou vamos pedir pra Lucas?

Se ok, próxima etapa:

- Criar worktrees (3-5 paralelas conforme Apêndice A)
- Dispatch de dev agents com links diretos pra esta spec
- Loop review → fix → merge → deploy conforme playbook do beta 3

— *Spec mestre por Paige + Party Mode, 2026-04-17*
