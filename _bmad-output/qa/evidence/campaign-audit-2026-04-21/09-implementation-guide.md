# Implementation Guide — Campaign HQ Redesign

**Público:** devs que vão implementar o redesign
**Escopo:** Fase A-D com file paths, stories SM-ready, estimativas, dependências
**Relaciona-se com:** [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) · [02-component-library.md](./02-component-library.md) · [03-interactions-spec.md](./03-interactions-spec.md) · [04-states-catalog.md](./04-states-catalog.md) · [06-i18n-strings.md](./06-i18n-strings.md) · [07-accessibility-spec.md](./07-accessibility-spec.md) · [08-edge-cases-catalog.md](./08-edge-cases-catalog.md) · [findings.md](./findings.md)

---

## 0. Princípios de implementação

1. **Feature flag primeiro.** `CAMPAIGN_HQ_V2` em `.env` + condicional em `app/app/campaigns/[id]/page.tsx`. V1 vive até flag toggle.
2. **Sem big-bang.** Fase A ship antes de Fase B. Fase B ship antes de Fase C.
3. **Combat Parity em cada PR.** Checklist Guest/Anônimo/Auth (CLAUDE.md rule).
4. **Resilient Reconnection em tudo.** Skeleton nunca spinner (CLAUDE.md rule).
5. **Tokens sempre via Tailwind/CSS vars.** Zero hex inline (DS §10).
6. **Empty state condicional por role/auth.** Never "Crie X" pra quem não pode criar.
7. **Testes E2E antes do ship.** Ver [03-interactions-spec.md](./03-interactions-spec.md) pra cenários.
8. **PR < 400 linhas em média.** Bigger = split.

---

## Fase A — Quick Wins (2-3 dias, sem refactor de IA)

**Goal:** matar 8 blockers/highs da auditoria sem tocar arquitetura. Ship antes da Fase B começar.

### Story A.1 — i18n key `campaign.player_hq_button`
**Fix:** F-02 (🔴 blocker)
**Estimativa:** 1h
**Files:**
- `messages/pt-BR.json` (adicionar `campaign.player_hq_button: "Abrir meu painel"`)
- `messages/en.json` (adicionar `campaign.player_hq_button: "Open my dashboard"`)
- Verificar callsite em `app/app/campaigns/[id]/CampaignPlayerViewServer.tsx:~197`

**AC:**
- Key resolvida nos 2 locales
- Texto raw `campaign.player_hq_button` não aparece na UI
- Playwright test adicionado: `e2e/campaign-player-hq.spec.ts` verifica texto botão

### Story A.2 — Role-gate sidebar player (Inventário do Grupo)
**Fix:** F-06 (🟠 high)
**Estimativa:** 2h
**Files:**
- `components/nav/NavigationLayoutServer.tsx` (se existir) ou layout pai
- `lib/types/campaign-hub.ts` (fonte de verdade `SURFACES[]`)

**Approach:**
1. Criar `SURFACES` export em `lib/types/campaign-hub.ts` com `{ id, label, icon, roles: ('dm'|'player-auth'|'player-anon')[], modes: string[] }`
2. Sidebar consome `SURFACES.filter(s => s.roles.includes(role))`
3. `CampaignNavBar` (legado, Fase A só corrige) também consome mesmo array

**AC:**
- Inventário do Grupo invisível pra player em todas as views
- Player-Notes invisível pra player (já era `dmOnly`)
- Settings idem

### Story A.3 — Empty state Quest condicional por role
**Fix:** F-05 (🟠 high)
**Estimativa:** 1h
**Files:**
- Component de empty-state de quests (buscar em `components/campaign/quests/*.tsx`)
- `messages/pt-BR.json` + `en.json` adicionar keys:
  - `empty_states.quests.dm`: "Crie a primeira quest da campanha"
  - `empty_states.quests.player_auth`: "Seu mestre ainda não criou quests. Elas aparecerão aqui."
  - `empty_states.quests.player_anon`: idem player_auth

**AC:**
- Player vê copy sem "crie"
- CTA "+ Nova quest" só aparece pra Mestre

### Story A.4 — Remover CTA duplicado de combate ativo (Player)
**Fix:** F-07 (🟠 high)
**Estimativa:** 2h
**Files:**
- `components/player/PlayerJoinClient.tsx` ou wrapper do player view
- Remover card verde "Combate Ativo" quando o banner vermelho topo já existe

**AC:**
- Quando `combat.active === true`, player vê UM CTA de combate (banner)
- Card verde não renderiza
- Playwright: 1 botão "Entrar" visível (não 2+)

### Story A.5 — Renomear "Histórico" → "Sessões" + split Próximas/Passadas
**Fix:** F-08 (🟠 high)
**Estimativa:** 3h
**Files:**
- `components/campaign/CampaignNavBar.tsx` (labelKey "hub_nav_sessions" substitui "hub_nav_history")
- `messages/pt-BR.json`: `campaign.hub_nav_sessions: "Sessões"`, `campaign.sessions.upcoming: "Próximas"`, `campaign.sessions.past: "Passadas"`
- Componente de lista de sessões adiciona 2 sub-tabs

**AC:**
- Label "Histórico" removido da UI
- 2 sub-tabs "Próximas" / "Passadas" renderizam corretamente
- Sessões status `planned` e `active` vão pra Próximas; `finished` vai pra Passadas

### Story A.6 — Padding mobile + title line-clamp
**Fix:** F-17 F-18 (🟡 medium)
**Estimativa:** 1h
**Files:**
- `app/app/campaigns/[id]/CampaignDmViewServer.tsx` (ou equivalente)
- CSS adicionar `px-4` + `line-clamp-2` + title `text-ellipsis`

**AC:**
- "KRYNN" tem padding 16px esquerda mobile
- "CURSE OF STRAHD" não corta + tooltip on long-press
- Playwright visual regression passa

### Story A.7 — Naming default de sessão + campo editável (F-09)
**Fix:** F-09 (🟠 high)
**Estimativa:** 3h
**Files:**
- Schema: criar DEFAULT em `sessions.name` — `'Sessão ' || row_number() over() || ' — ' || to_char(now(), 'DD Mon')` (ou via trigger)
- Form de criar sessão preenche automaticamente
- Card de sessão suporta hover → ✎ Edit inline

**AC:**
- Sessão criada sem nome vem com default "Sessão 13 — 25 Abr"
- Click em ✎ abre inline edit
- Sessão finalizada com nome default + 3 dias → trigger nudge "Quer dar nome?"

### Story A.8b — F-20: Sub-tabs de Quests cortando "Falhadas/Canceladas" mobile
**Fix:** F-20 (🟡 medium) — antes órfão do review, endereçado aqui
**Estimativa:** 1h
**Files:**
- Componente de sub-tabs de Quests (buscar por `quests` em `components/campaign/`)

**Approach:** substituir sub-tabs horizontal (6 tabs) por pattern único "filtro + busca" (§9 F-11). Em mobile, filtros abrem bottom-sheet via botão "Filtros" (mesma estratégia F-16 em NPCs).

**AC:**
- Nenhum texto de filtro corta em mobile 390px
- Labels "Falhadas" e "Canceladas" acessíveis via bottom-sheet
- Playwright mobile: todos 6 status acessíveis em <2 taps

### Story A.8c — F-23: Sincronizar sidebar state com pill bar (reconstrução)
**Fix:** F-23 (🔵 low) — antes órfão do review, endereçado aqui
**Estimativa:** 0h — **resolvido por construção**
**Explicação:**
A fonte do bug F-23 era **2 fontes de verdade competindo** (sidebar contextual mostrava item X não destacado enquanto pill bar mostrava X ativo). No redesign V2, `SURFACES[]` em `lib/types/campaign-hub.ts` é a **única** fonte, e ambas as renderizações (sidebar + breadcrumb se existir) consomem dela. Impossível desyncar.

**AC:**
- Não há pill bar no V2 (F-01 fix)
- Single source of truth `SURFACES[]` (Story B.2)
- Playwright: active state da surface é idêntico em todos os pontos de render

### Story A.9 — Rename "Companheiros" → "Party" + count-1 rule
**Fix:** F-15 (🟡 medium)
**Estimativa:** 2h
**Files:**
- `messages/pt-BR.json`: `campaign.party: "Party"` (PT mantém anglicismo OK — é D&D jargon)
- Component de lista de jogadores: detectar `count === 1 && único === self`; mostrar texto alternativo

**AC:**
- Label "Companheiros" some
- Se só o próprio player: "Você está sozinho por enquanto. O mestre pode convidar mais jogadores."
- Se >1: lista normal, "Você" primeiro com badge

### Fase A — checklist de deploy

- [ ] Todos os 10 stories ✅ (A.1–A.8 + A.8b + A.8c + A.9)
- [ ] Playwright E2E passa (todos os testes novos + existentes)
- [ ] QA no viewport mobile 390 (capturar screenshots — comparar com auditoria)
- [ ] Tag `v2.1.0-fase-a` + release notes
- [ ] Deploy staging → 24h smoke → prod

**Tempo total Fase A:** 16h = 2-3 dias de dev focado (incluindo A.8b F-20).

### Highs do SPEC-REVIEW-FINAL a fechar na Fase B (lembrete)

Os blockers/highs do review final ([SPEC-REVIEW-FINAL.md](./SPEC-REVIEW-FINAL.md)) ficam como tarefas dentro de Fase B, aproveitando que componentes novos vão ser criados:

- 🟠 Adicionar `Slideover` ao component library `02-component-library.md` (Story B.3)
- 🟠 Adicionar `SoundboardChip` e `SceneAccordion` como novos domain components em Story C.8 (mindmap polish) e Story C.2 (Rodar Combate) respectivamente
- 🟠 Ícone canônico de Quest: `ScrollText` (Lucide) — alinhar em DS §4.3.2 e component 02
- 🟠 Tour dismiss persistence: `localStorage` first (UX instant) + `user_preferences.tour_dismissed_at` (cross-device) — fallback sync
- 🟠 Z-index: banner combat tem prioridade sobre BottomTabBar em mobile — `z-banner-combat: 40 > z-bottom-tab: 35` (Story B.4)
- 🟠 Schema naming: **`scene_entities`** (plural, bate com convenção Supabase) — fix em `schema-investigation-winston.md` refinado pelo Winston
- 🟠 `aria-selected` em ModeItem ativo + `aria-disabled` em ModeItem com lock (Story B.4 + 07-accessibility-spec)

Estes são follow-ups que NÃO bloqueiam Fase A (táticos), mas **devem** entrar nas PRs correspondentes de Fase B.

---

## Fase B — Shell novo (1 sprint = 5 dias)

**Goal:** implementar shell unificado (Topbar + Sidebar + Mode switcher + Bottom tab bar mobile) behind flag `CAMPAIGN_HQ_V2`. Migrar surface "Preparar" pra o novo shell como prova de conceito.

### Story B.0 — Feature flag
**Estimativa:** 1h
**Files:**
- `.env.example`: `NEXT_PUBLIC_CAMPAIGN_HQ_V2=false`
- `lib/feature-flags.ts`: helper `isCampaignHqV2Enabled()`
- `app/app/campaigns/[id]/page.tsx`: condicional de render

### Story B.1 — Design tokens em Tailwind + CSS vars
**Estimativa:** 4h
**Files:**
- `tailwind.config.ts` — adicionar tokens de [DESIGN-SYSTEM.md §10.1](./DESIGN-SYSTEM.md)
- `app/globals.css` — CSS vars `--grim-*`
- Script de verificação que tailwind + CSS vars estão sincronizados

**AC:**
- Todos os tokens do DS disponíveis como classes Tailwind (`bg-bg`, `text-gold`, `space-6`)
- CSS vars consumíveis em styled-components/inline se necessário
- Nenhum token antigo removido (retro-compat)

### Story B.2 — `SURFACES[]` source-of-truth + resolveMode
**Estimativa:** 4h
**Files:**
- `lib/types/campaign-hub.ts` — export `SURFACES`, `MODES`, `resolveMode()`
- Tests unit pra `resolveMode()` cobrindo 8 cenários (Mestre+combat, Mestre-no-combat, player-combat, player-no-combat, anon+combat, anon-no-combat, recém-combate-Mestre, recém-combate-player)

**API:**
```typescript
type Role = 'dm' | 'player-auth' | 'player-anon'
type Mode = 'prep' | 'run' | 'recap' | 'journey' | 'watch'

interface Surface {
  id: string
  label_key: string
  icon: string // Lucide name
  modes: Mode[]
  roles: Role[]
}

function resolveMode(opts: { role: Role; combatActive: boolean; recentCombat?: boolean }): Mode
```

**AC:**
- 8 unit tests passam
- Render do sidebar consome o array
- Refator de `CampaignNavBar` pra usar também (ou deprecar junto com pill bar)

### Story B.3 — Componentes primitivos (Button, Card, Badge, Input, CheckCircle)
**Estimativa:** 6h
**Files:**
- `components/ui-v2/button.tsx` (variants primary-gold, secondary, destructive, ghost)
- `components/ui-v2/card.tsx` (variants default, hero, muted)
- `components/ui-v2/badge.tsx`
- `components/ui-v2/input.tsx` (variants text, search; states)
- `components/ui-v2/check-circle.tsx`

**Ou**: estender os existentes em `components/ui/` com novas variants — decisão: **novo diretório `ui-v2`** pra não conflitar com produção.

**AC:**
- Storybook/playground render de cada componente com todos states
- Snapshot tests

### Story B.4 — Shell: Topbar + Sidebar + ModeSwitcher + BottomTabBar
**Estimativa:** 8h
**Files:**
- `components/campaign-hq-v2/shell/Topbar.tsx`
- `components/campaign-hq-v2/shell/Sidebar.tsx`
- `components/campaign-hq-v2/shell/ModeSwitcher.tsx`
- `components/campaign-hq-v2/shell/BottomTabBar.tsx`
- `components/campaign-hq-v2/shell/ShellLayout.tsx` (composição)

**AC:**
- Shell responde a breakpoints (desktop 1024+ sidebar, tablet 768-1023 collapsed, mobile <768 drawer+tab)
- Mode switch via click ou atalho `g p` / `g r` / `g c`
- Persist sidebar collapsed state em localStorage (cosmético, não o mode)

### Story B.5 — Busca rápida (Ctrl+K) no shell
**Estimativa:** 4h
**Files:**
- `components/campaign-hq-v2/shell/QuickSearch.tsx`
- Reusa `cmdk` já instalado (`components/oracle/CommandPalette.tsx` como referência)
- `lib/hooks/useQuickSwitcherData.ts` — expor `useCampaignSearchData()` escopado à campanha atual

**AC:**
- `Ctrl+K` abre em qualquer surface dentro de campanha
- Debounce 120ms
- Grupos: NPCs, Locais, Quests, Sessões, Notas, Comandos
- `Esc` fecha
- Keyboard nav ↑↓ + Enter

### Story B.6 — Surface "Próxima Sessão" (Preparar) migrated to V2
**Estimativa:** 6h
**Files:**
- `components/campaign-hq-v2/surfaces/NextSessionSurface.tsx`
- Hero card, checklist, quick-add, activity feed (ver W1 do [05-responsive-spec.md](./05-responsive-spec.md))

**AC:**
- Render correto desktop/tablet/mobile (W1 em 3 breakpoints)
- Empty state se sem sessão agendada
- Quick-add dropdown funcional (slideover pattern, ver [03-interactions-spec.md](./03-interactions-spec.md) §7)

### Story B.7 — W0b (empty state HQ) no V2
**Estimativa:** 4h
**Files:**
- `components/campaign-hq-v2/surfaces/EmptyHqSurface.tsx`
- 3 step cards + tour dismissable (ver [03-interactions-spec.md](./03-interactions-spec.md) §12)

**AC:**
- Render correto em 3 breakpoints
- Tour dismiss persiste em `localStorage` com key `hq:tourDismissed:{campaignId}:{userId}`
- Passos são completáveis: convidar jogador → marcar sessão → preencher mundo

### Story B.8 — A/B test setup com 5 Mestres (incluindo Dani)
**Estimativa:** 2h
**Files:**
- `.env.local` dos 5 Mestres com flag on
- Event tracking em PostHog/Mixpanel (o que existe): `hq_v2.mode_switched`, `hq_v2.surface_viewed`, `hq_v2.search_used`, etc

**AC:**
- 5 Mestres acessam a V2 com flag on
- Metrics capturados
- Dani aprova visualmente (feedback qualitativo)

### Fase B — checklist de deploy

- [ ] Stories B.0-B.8 ✅
- [ ] Feature flag off em produção
- [ ] 5 Mestres com flag on em produção (1 semana de teste)
- [ ] Métricas: tempo-pra-preparar-sessão (antes vs depois), NPS qualitativo, tempo em Preparar
- [ ] Tag `v2.2.0-fase-b-spike`

**Tempo total Fase B:** ~40h = 1 sprint.

---

## Fase C — Rodar + Recap + killer-features (2 sprints = 10 dias)

**Goal:** completar o redesign com modo Rodar, modo Recap, e as 4 killer-features (backlinks, tags, permissões, handouts).

### Pré-requisito: Winston spec revisada

**Bloqueador:** [schema-investigation-winston.md](../../architecture/schema-investigation-winston.md) deve estar aprovado por Winston antes de Fase C. Inclui:
- M1: `npcs.mood` enum
- M2: `scene_entities` table
- M3: `entity_mentions` table (backlinks)
- M4: tags arrays
- M5: session recap fields
- M6: character completion view

### Story C.1 — Migrations M1-M5
**Estimativa:** 6h (1h cada + 30min RLS)
**Files:**
- `supabase/migrations/2026XXXX_campaign_hq_v2_schema.sql`

**AC:**
- Migrations rodam em staging sem erro
- RLS policies aplicadas (Mestre read/write, player-auth read on shared)
- Rollback script testado

### Story C.2 — Surface Rodar (Combate ativo)
**Estimativa:** 10h
**Files:**
- `components/campaign-hq-v2/surfaces/RunSurface.tsx`
- Subcomponents: `InitiativeList`, `SceneAccordion`, `TurnActions`, `QuickAddMonster`, `CombatNote`

**AC:**
- Render W2 em 3 breakpoints
- Accordions Foundry-like colapsáveis
- Sticky "Próximo turno" CTA mobile
- Lock de Preparar/Recap durante combate (mode switcher mostra 🔒)

### Story C.3 — Surface Recap + editor markdown
**Estimativa:** 8h
**Files:**
- `components/campaign-hq-v2/surfaces/RecapSurface.tsx`
- `components/campaign-hq-v2/recap/RecapEditor.tsx` (reusa rich-text se existir, ou usa `@tiptap` novo)

**AC:**
- Editor renderiza W8
- Salva rascunho a cada 30s + toast
- "Publicar pros jogadores" setta `recap_published_at`

### Story C.4 — Killer-feat: Backlinks `@autocomplete`
**Estimativa:** 6h
**Files:**
- `components/campaign-hq-v2/backlinks/MentionAutocomplete.tsx`
- `lib/mentions/parser.ts` (parse `@nome` e `[[nome]]`)
- Integração no editor de Recap + Notas + Sessão hook

**AC:**
- Digitar `@` abre dropdown com NPCs/Locais/Quests/Sessões
- Select cria chip-link (BacklinkChip do DS §5)
- Click no chip abre ficha da entidade
- `entity_mentions` populada no save

### Story C.5 — Killer-feat: Tags
**Estimativa:** 4h
**Files:**
- `components/campaign-hq-v2/tags/TagInput.tsx`
- `lib/tags/use-campaign-tags.ts` (query + autocomplete)

**AC:**
- Digitar `#` abre sugestões de tags existentes
- Criar nova tag com Enter
- Chips removíveis em cards de entity + filter em lists

### Story C.6 — Killer-feat: Permissões granulares
**Estimativa:** 8h
**Files:**
- `lib/permissions/campaign.ts` — check `canEdit(userId, entityId, entityType)`
- Middleware de RLS no Supabase
- UI desabilita actions sem permissão + shows tooltip

**AC:**
- Player edita sua ficha, não dos outros
- Player vê NPC com `visibility=shared`, não `visibility=hidden`
- Mindmap tem toggle "Visível pra players" no editor

### Story C.7 — Killer-feat: Handout drop
**Estimativa:** 6h
**Files:**
- `components/campaign-hq-v2/handouts/HandoutDropzone.tsx`
- `lib/handouts/upload.ts` (Supabase Storage)
- Player Watch mostra toast + accordion "Handouts desta sessão"

**AC:**
- Mestre arrasta imagem em Rodar → upload + toast
- Player vê toast + imagem aparece em accordion
- Max 5 MB + auto-compress

### Story C.8 — Mapa Mental polish (F-12, F-13)
**Estimativa:** 6h
**Files:**
- `components/campaign-hq-v2/mindmap/MindmapCanvas.tsx`

**AC:**
- Labels sempre visíveis (não só on-hover)
- Legend inline no controls (F-13 fix)
- Auto-fit initial zoom baseado em cluster density
- Click node → painel lateral (desktop) / bottom-sheet (mobile)

### Story C.9 — Migrar todas as surfaces do Mestre pra V2
**Estimativa:** 12h
**Surfaces:** Quests, NPCs, Locais, Facções, Notas, Trilha (Soundboard), Party

**Pra cada:**
- Move pra `components/campaign-hq-v2/surfaces/`
- Aplica pattern de list (F-11 fix): busca inline + chips de filtro + views salvas
- Empty states por role/auth

### Story C.10 — Migrar Player shell pra V2
**Estimativa:** 8h
**Files:**
- `components/campaign-hq-v2/player/JourneySurface.tsx` (W4)
- `components/campaign-hq-v2/player/WatchSurface.tsx` (W6, W7)

**AC:**
- Player shell unificado com Mestre (mesmo chrome, diferentes modes)
- Anon player: Minha Jornada light (matriz §4 DS)
- Auth player: full

### Fase C — checklist de deploy

- [ ] Stories C.1-C.10 ✅
- [ ] Playwright E2E cobrindo: backlinks, tags, permissões, handouts, mindmap
- [ ] Combat Parity checklist: Mestre + auth-player + anon-player testados
- [ ] Resilient Reconnection: simular desconexão em cada mode
- [ ] SRD Compliance: verificar mindmap público não expõe não-SRD
- [ ] Feature flag on em produção com A/B 50/50
- [ ] Tag `v2.3.0-fase-c`

**Tempo total Fase C:** ~80h = 2 sprints.

---

## Fase D — Cleanup + remoção do legado (1 sprint = 5 dias)

**Goal:** V2 vira default. V1 é deletada.

### Story D.1 — Flag on 100% (default on)
**Estimativa:** 1h
**Files:**
- `.env.example`: `NEXT_PUBLIC_CAMPAIGN_HQ_V2=true`
- Prod env: flag on 100%

### Story D.2 — Deletar V1
**Estimativa:** 4h
**Files a DELETAR:**
- `components/campaign/CampaignNavBar.tsx`
- `app/app/campaigns/[id]/CampaignDmViewServer.tsx` (V1)
- `app/app/campaigns/[id]/CampaignPlayerViewServer.tsx` (V1)
- `components/dm/*` (se orfão)
- i18n keys deprecated (per [06-i18n-strings.md](./06-i18n-strings.md) §4)

**AC:**
- Zero referências a `CampaignNavBar`, pill bar, etc
- Bundle size reduzido (medir antes/depois)
- Testes E2E legados removidos ou atualizados

### Story D.3 — Redirect de rotas legadas
**Estimativa:** 2h
**Files:**
- `middleware.ts` ou `app/app/campaigns/[id]/page.tsx`

**Redirect:**
- `?section=sessions` → `/prep/sessions` (301)
- `?section=encounters` → `/prep/encounters`
- Etc por 90 dias, depois remove

### Story D.4 — Observability expandida
**Estimativa:** 4h
**Files:**
- Tracking completo: `tempo-pra-preparar-sessão`, `taxa-retorno-semana-1`, `uso-de-backlinks`, `tags-por-campanha`, `handouts-enviados`

### Story D.5 — Busca rápida expandida com comandos
**Estimativa:** 4h
**Files:**
- Commands como: `add quest`, `go to NPC Grolda`, `start combat`, `toggle sidebar`

### Story D.6 — Cleanup de anti-patterns encontrados durante C
**Estimativa:** 4h
**Output:** updates no DESIGN-SYSTEM.md §12 (anti-patterns catalog) pra prevenir recorrência.

### Fase D — checklist de deploy

- [ ] Bundle size reduzido (ver métricas)
- [ ] Zero warnings no build
- [ ] Playwright full-suite verde
- [ ] Tag `v3.0.0-campaign-hq-v2`

**Tempo total Fase D:** ~20h = 1 sprint (parcial).

---

## Cronograma consolidado

| Fase | Duração | Acumulado | Valor entregue |
|---|---|---|---|
| A — Quick wins | 2-3 dias | 2-3d | 8 fixes imediatos |
| B — Shell + Preparar | 1 sprint | ~8d | Shell novo + Preparar no V2 behind flag |
| C — Rodar + Recap + killer-feats | 2 sprints | ~18d | V2 completo com backlinks, tags, permissões, handouts |
| D — Cleanup | 1 sprint | ~23d | V1 removida, bundle reduzido |

**Total: ~4.5 sprints / 22-25 dias de dev focado.**

---

## Dependências críticas

| De | Para | Tipo |
|---|---|---|
| Schema migrations (C.1) | Rodar (C.2), Recap (C.3), Backlinks (C.4), Tags (C.5) | Blocker |
| Winston spec aprovada | Fase C inteira | Blocker |
| Shell novo (B.4) | Todas surfaces V2 (B.6-C.10) | Blocker |
| Tokens em Tailwind (B.1) | Todos componentes V2 | Blocker |
| `cmdk` + `sonner` já instalados | QuickSearch (B.5), Toasts | OK — reuso |
| Skeletons existentes | Loading states | OK — reuso |

---

## Risk register

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Schema migration quebra dados existentes | Média | Staging 24h antes de prod + rollback script testado |
| Feature flag on afeta usuários não-beta | Baixa | `CAMPAIGN_HQ_V2` é opt-in por user_id inicialmente |
| Backlinks killer-feat atrasa escopo C | Alta | MVP: `@` autocomplete + chip render; backlinks-page é v1.5 |
| Handout storage estoura quota Supabase | Média | Quota monitor + auto-compress + rate limit |
| V2 regride métricas de engagement | Baixa | A/B 50/50 + early rollback se NPS cai |
| Resilient Reconnection quebra no shell novo | Alta | Shell mantém todos os handlers existentes de PlayerJoinClient; regression suite visual |
| Combat Parity viola em Rodar | Alta | Checklist obrigatório por PR; Guest NÃO tem Rodar |
| SRD compliance vazou via mindmap público | Baixa | Filter whitelist ativo; teste automatizado na publicação |

---

## Métricas de sucesso

**Pós Fase A (1 semana):**
- Zero user reports de "menu que aparece e some"
- Bug F-02 (`campaign.player_hq_button`) não aparece em sentry/logs

**Pós Fase B (1 semana de A/B com 5 Mestres):**
- Tempo médio pra preparar sessão **cai ≥20%**
- NPS qualitativo dos 5 Mestres: ≥7/10

**Pós Fase C (2 semanas de A/B 50/50):**
- Tempo pra achar NPC em Rodar **<10s** (job Mestre-Run-1)
- Uso de backlinks ≥ 5 por campanha ativa (killer-feat adoption)
- Taxa de retorno semana-1 **sobe ≥5pp** vs V1

**Pós Fase D:**
- Bundle size reduzido ≥10%
- Zero referências a V1 no código
- Rich Results Test passa

---

## Checklist PR template

Copiar pra descrição de cada PR desta iniciativa:

```markdown
## Summary
[1-3 bullets do que muda]

## Links
- Story: [ID]
- DS ref: [link]
- Finding fix: [F-XX]

## Combat Parity checklist (per CLAUDE.md)
- [ ] Tested Mestre
- [ ] Tested Auth player
- [ ] Tested Anon player (via /join/token)
- [ ] Tested Guest (se aplicável)

## Resilient Reconnection checklist
- [ ] Skeleton, não spinner
- [ ] pagehide handler se toca realtime
- [ ] visibilitychange handler se toca realtime
- [ ] Storage persist se necessário

## SRD Compliance checklist (se toca dados)
- [ ] Conteúdo não-SRD não vaza pra /public
- [ ] Whitelist ativo

## Tests
- [ ] Unit tests pass
- [ ] Playwright E2E pass
- [ ] Visual regression pass
- [ ] Type check pass

## Rollout
- [ ] Feature flag controlled
- [ ] Observability metrics tracked
- [ ] Rollback plan documented
```

---

## Apêndice A — File tree proposto

```
components/
├── campaign-hq-v2/           # Todo código novo do redesign
│   ├── shell/
│   │   ├── Topbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ModeSwitcher.tsx
│   │   ├── BottomTabBar.tsx
│   │   ├── ShellLayout.tsx
│   │   └── QuickSearch.tsx
│   ├── surfaces/
│   │   ├── EmptyHqSurface.tsx           # W0b
│   │   ├── NextSessionSurface.tsx       # W1
│   │   ├── QuestsSurface.tsx
│   │   ├── NpcsSurface.tsx
│   │   ├── LocationsSurface.tsx
│   │   ├── FactionsSurface.tsx
│   │   ├── NotesSurface.tsx
│   │   ├── MindmapSurface.tsx           # W3
│   │   ├── SoundboardSurface.tsx
│   │   ├── RunSurface.tsx               # W2
│   │   └── RecapSurface.tsx             # W8
│   ├── player/
│   │   ├── JourneySurface.tsx           # W4
│   │   └── WatchSurface.tsx             # W6/W7
│   ├── recap/
│   │   └── RecapEditor.tsx
│   ├── backlinks/
│   │   ├── MentionAutocomplete.tsx
│   │   └── BacklinkChip.tsx
│   ├── tags/
│   │   ├── TagInput.tsx
│   │   └── TagChip.tsx
│   └── handouts/
│       └── HandoutDropzone.tsx
├── ui-v2/                    # Primitives novos
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   └── check-circle.tsx
└── ui/                       # Legado — mantido enquanto V1 existir

lib/
├── types/
│   └── campaign-hub.ts       # SURFACES, MODES, resolveMode (source of truth)
├── mentions/
│   └── parser.ts             # @-parser
├── tags/
│   └── use-campaign-tags.ts
├── permissions/
│   └── campaign.ts
├── handouts/
│   └── upload.ts
└── feature-flags.ts

app/
└── app/
    └── campaigns/
        └── [id]/
            ├── page.tsx                    # Entry — conditional V1/V2 via flag
            ├── prep/
            │   └── [[...slug]]/page.tsx    # V2 Preparar
            ├── run/
            │   └── page.tsx                # V2 Rodar
            └── recap/
                └── [[...slug]]/page.tsx    # V2 Recap

supabase/migrations/
└── 2026XXXX_campaign_hq_v2_schema.sql      # M1-M5
```

---

## Apêndice B — Comandos úteis durante implementação

```bash
# Rodar dev com flag on
NEXT_PUBLIC_CAMPAIGN_HQ_V2=true npm run dev

# Playwright só campaign-hq-v2
npx playwright test e2e/campaign-hq-v2/

# Type check
npm run type-check

# Visual regression
npm run playwright:visual

# Storybook (se for adicionar pra ui-v2)
npm run storybook
```

---

**Fim do implementation guide. 22 stories, 4 fases, ~25 dias totais. Pode começar amanhã.**
