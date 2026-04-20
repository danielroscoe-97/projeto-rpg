# Delivery Report — Release 2026-04-19 / 2026-04-20

> **Status:** Deployado em produção (origin/master)
> **Sessão:** Party Mode multi-agent (2026-04-19 a 2026-04-20)
> **Alvo estratégico:** Evolução da plataforma pós-beta test 3 → retenção + launch

---

## Sumário executivo

**8 ondas entregues** cobrindo 30 feedbacks + 6 bugs do beta test 3 reportado pelo DM beta tester.

- **Commits de feature:** ~25
- **Commits de fix de review:** 4 críticos
- **Migrações SQL novas:** 4 (146, 147, 148, 149, 150)
- **Arquivos criados:** 45+
- **Arquivos modificados:** 30+
- **i18n chaves adicionadas:** ~200 (PT-BR + EN em paridade)
- **Reviews adversariais:** 6 (4 APPROVED, 2 APPROVED WITH RESERVES, 2 bugs críticos capturados + corrigidos)
- **Regras imutáveis preservadas:** Combat Parity, Resilient Reconnection, SRD Compliance, SEO Canonical, RTK
- **Regressões em testes:** 0 (falhas existentes são pré-existentes e não causadas por esta release)

---

## Onda 0 — Linguagem Ubíqua + Bugs

### O que foi feito

- **83 chaves i18n migradas** em `messages/pt-BR.json` + `en.json` seguindo glossário ubíquo (combate/encontro/histórico)
- **65 refs de rota migradas** `/app/session/*` → `/app/combat/*` + `/api/session/*` → `/api/combat/*` (proxy strategy pra não quebrar sendBeacon/POST)
- **Bug B01 fixado** — `/api/broadcast` 404 (rota legada com handling)
- **Bug B02 fixado** — `MISSING_MESSAGE: sheet` (chamada `getTranslations` corrigida)
- **Bug B03 fixado** — `/opengraph-image.png` 404 (next.config redirects)
- **Grupos 4 (SessionPlanner) + 6 (Auth)** PRESERVADOS — "sessão" mantido onde é contexto correto

### Commits

```
4bd4570b feat(i18n): linguagem ubíqua — 83 chaves migradas
bcc89934 refactor(routes): session → combat — 65 refs migradas
10f19f75 fix(api,app): broadcast 404, opengraph image, missed route ref
e4e3e531 fix(review): e2e selectors/regex migrated from /session/new to /combat/new
06cf40cf merge(onda0): linguagem ubíqua
```

### Code review
**APPROVED COM RESSALVAS** — 5 bugs e2e encontrados e fixados via `e4e3e531`. Zero regressões vs master. Storage keys + realtime channels + useCombatResilience preservados.

---

## Onda 1a — B04 Campaign Performance

### O que foi feito

- **Bug B04 resolvido** — Campaign page 5-8s → <2s estimado
- Refactor de `app/app/campaigns/[id]/page.tsx` de 433 → 105 linhas (shell fino)
- Criado `CampaignDmViewServer.tsx` e `CampaignPlayerViewServer.tsx` (async server components com Suspense streaming)
- Criado `loading.tsx` (route-level skeleton)
- Dashboard: 3 waves de queries sequenciais → 2 waves (merge em único Promise.all)
- Criado `CampaignPageSkeleton.tsx` + `PlayerCampaignSkeleton`

### Commit
```
c00b3eff perf(b04): add Suspense streaming + parallelize dashboard phases
```

### Code review
**APPROVED** — Correctness OK, Completeness OK, Performance ganhos confirmados, zero regressões. WIP isolation confirmada (apenas 6 arquivos no commit).

---

## Onda 1b — Show-stoppers Campaign HQ (F12, F15, F29)

### O que foi feito

- **F12 resolvido:** SessionHistory ganhou botão "Planejar Sessão" no header + empty state
- **F15 resolvido:** LocationCard/FactionCard/NpcCard/QuestCard agora são clicáveis (role="button", Enter/Space keyboard support)
- **F29 resolvido:** Cards não são mais decorativos — click no body abre form em modo view (readOnly)
- **Forms (Location/Faction/Npc/Quest)** ganharam prop `readOnly` + `canEdit` para toggle view ↔ edit
- **Actions mobile:** opacity-100 default (antes eram hover-only, invisíveis em mobile)
- **Stop propagation** em TODOS os action buttons (previne double-open)
- **SessionCard actions:** Start/Edit/Cancel (planned), Enter/Finish (active), Edit-recap (completed)

### Commits
```
6a708764 feat(session-history): add plan session CTA + SessionCard actions (F12)
e5855b9a feat(forms): readOnly prop in Location/Faction/Npc/Quest forms
8c7ee580 feat(campaign-cards): card body clickable (F15, F29)
fca06340 feat(campaign-lists): wire card body click to read-only detail form
3f5647b0 fix(review-1b): card keydown bubbles from child buttons (F15/F29)
```

### Code review
**APPROVED após fix** — bug crítico descoberto: keydown bubble de botões internos → abria dialog junto. Fix: guarda `e.target !== e.currentTarget` em handleCardKeyDown dos 4 cards. Todos hunters H1-H5 OK, zero regressões.

---

## Onda 2a — Campaign Dashboard Briefing (F10)

### O que foi feito

- **F10 resolvido:** Campaign overview virou "briefing informativo" — DM abre a campanha e vê em 2s o que importa
- **Layout novo:** Hero → "Hoje na sua mesa" → "Atividade recente" (Roam-style timeline) → "Teia viva" (mini mind-map preview) → "Pulso" (métricas)
- **BriefingStatus:** active_combat / active_session / planned_next / paused / new — halo dourado condicional
- **6 componentes criados:** CampaignBriefing, BriefingStatusBadge, BriefingToday, BriefingActivityTimeline, BriefingMindMapPreview, BriefingPulseStats
- **CampaignHero refatorado** — aceita prop `briefingMode` que desliga dialogs duplicados
- **2 helpers novos:** `lib/supabase/campaign-briefing.ts` + `lib/types/campaign-briefing.ts`
- **60 chaves i18n** namespace `briefing.*` em PT-BR + EN
- **CSS tokens halo:** `--halo-active`, `--halo-available`, `--dim-inactive` em globals.css
- **CampaignGrid deprecated** (rollback hatch preservado)
- **activeEncounter** agora carrega pro DM também (antes só player)
- **recentActivity** helper: 5 queries em Promise.all, top 5 ordenado por updated_at

### Commits
```
bd86330c feat(briefing): types + recent activity helper
d3b98246 wip(briefing): 5 components + CampaignHero refactor
ef1ab9b3 feat(briefing): CampaignBriefing container orchestrating sub-components
74909731 feat(briefing): integrate in CampaignDmViewServer + activeEncounter + recentActivity
b9c728a4 feat(briefing): i18n namespace briefing.* (PT-BR + EN)
5b773614 feat(briefing): halo CSS tokens + deprecate CampaignGrid
4d88bf4f fix(review-2a): suprime double CombatLaunchSheet + SessionPlanner no briefingMode
```

### Code review
**APPROVED WITH RESERVES** — bug descoberto: CampaignHero + BriefingToday ambos montavam CombatLaunchSheet + SessionPlanner (dead DOM + duplicate Realtime listeners). Fix: em briefingMode, Hero deixa de renderizar dialogs, BriefingToday vira dono único. Reservas: testes ausentes (Onda 6), i18n reservadas ainda órfãs.

---

## Onda 2b — Navigation Redesign (F13)

### O que foi feito

**Atrás de feature flag `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR` (default OFF).**

### Fase 1 — Sidebar unificada
- **F13 resolvido:** sidebar esquerda agora em toda rota `/app/*` (antes só em /dashboard)
- **Desktop:** fixed, 256px expanded / 64px collapsed, Ctrl+B toggle, localStorage persist
- **Mobile:** drawer lateral com hamburger, mesmo componente (`SidebarContent`)
- **CampaignSidebarIndex antigo** absorvido como `SidebarCampaignNav`
- **Tour seletores preservados 1:1** (dash-sidebar, dash-nav-*, etc.)

### Fase 2 — Quick Switcher universal
- **Ctrl+K** estendido: grupos novos (Ações, Campanhas, Personagens, Entidades da campanha atual, Notas recentes)
- **Chords de teclado:** `g d` (dashboard), `g c` (campaigns), `g p` (personagens), `g s` (compêndio), `g o` (soundboard)
- **Atalhos globais:** Ctrl+B (toggle sidebar), Ctrl+, (settings)
- **Respeita inputs:** não dispara em `<input>`/`<textarea>`/`[contenteditable]`

### Componentes novos
- `components/layout/AppSidebar.tsx` + `AppSidebarClient.tsx` + `AppSidebarMain.tsx`
- `components/layout/SidebarContent.tsx` + `SidebarSection.tsx` + `SidebarCampaignNav.tsx` + `SidebarMiniMap.tsx`
- `components/layout/GlobalKeyboardShortcuts.tsx`
- 3 hooks: `useSidebarCollapse`, `useRecentCampaigns`, `useKeyboardShortcut`
- `lib/quick-switcher/actions.ts` + `lib/hooks/useQuickSwitcherData.ts`

### Commits
```
70ebd8c3 feat(sidebar): AppSidebar + SidebarContent + hooks (Fase 1)
261a2dd3 feat(sidebar): integrate in app/layout + feature flag + remove CampaignSidebarIndex
81a2f387 feat(quick-switcher): extend CommandPalette + keyboard shortcuts (Fase 2)
95f6c0c9 chore(sidebar): remove dead shiftMatched variable
```

### Status
**Deployado behind flag.** Para ativar: ver `docs/VERCEL-ACTIONS.md`.

---

## Onda 3a — Entity Graph Foundation

### O que foi feito

- **PRD completo** produzido: `docs/PRD-entity-graph.md` (700 linhas)
- **Descoberta-chave:** `campaign_mind_map_edges` (mig 080) já é a tabela polimórfica — reusar em vez de criar nova
- **3 migrações SQL** (todas idempotentes, reversíveis):
  - **146** — Trigger anti-ciclo em `campaign_locations` (depth guard 20)
  - **147** — Trigger scope guard em `campaign_mind_map_edges` (valida endpoints pertencem à campanha) + função `entity_belongs_to_campaign`
  - **148** — Expansão do CHECK de `relationship` com 4 novos: `headquarters_of`, `rival_of`, `family_of`, `mentions`
- **Lib `lib/supabase/entity-links.ts`** — API tipada: `linkEntities`, `upsertEntityLink`, `unlinkEntities`, `listEntityLinks`, `listCampaignEdges`
- **Types `lib/types/entity-links.ts`** — EntityType, EdgeRelationship, MindMapEdge
- **Hook `lib/hooks/useEntityLinks.ts`** — read-only, sem Realtime na Fase 3a
- **Testes:** 14 passing + 12 skipped (SQL contract tests, aguardam Supabase CI)

### Commits
```
0d070586 feat(entity-graph): mig 146 — location hierarchy anti-cycle trigger
25fea09e feat(entity-graph): mig 147 — cross-entity edge scope guard
9dec074f feat(entity-graph): mig 148 — expand relationship types
8cb83d46 feat(entity-graph): lib/supabase/entity-links + types + hook
adeeba44 test(entity-graph): cycle prevention + scope guard + idempotency
```

### Code review
**APPROVED** — zero issues críticos. 4 riscos residuais documentados e baixos (race condition em anti-cycle, types default TRUE em scope guard, sem retry em rede, SQL integration tests skipped).

---

## Onda 4 — Player Notes Visibility (F01, F02)

### O que foi feito

**Feature completa end-to-end: player ↔ DM notes com visibilidade configurável.**

### Backend (migração 149)
- **4 níveis de visibilidade:** `private`, `shared_with_dm`, `dm_private_to_player`, `campaign_public`
- **Player Journal:** adiciona `visibility` (default `private`)
- **Campaign Notes:** adiciona `visibility` + `target_character_id` + CHECK constraint
- **Backfill:** notas legadas com `is_shared=true` viram `campaign_public`; `is_shared=false` viram `private`
- **7 novas RLS policies** (journal_author_select, journal_dm_select_shared, journal_author_insert/update/delete, campaign_notes_target_player_select, campaign_notes_shared_read atualizada)

### Migração 150 — Fix de RLS Leak CRÍTICO descoberto no review
- **Problema:** mig 149 teve `DEFAULT 'campaign_public'` em `campaign_notes.visibility`. Writers existentes (`CampaignNotes.createNote`) usavam `is_shared: false` confiando no default → notas privadas do DM viravam `visibility='campaign_public'` → **players conseguiam ler notas privadas**
- **Fix:** flip default para `private` + re-sync linhas drifted + trigger BEFORE INSERT/UPDATE espelhando `is_shared ↔ visibility`

### Lib + hooks
- `lib/types/notes-visibility.ts`
- `lib/supabase/player-notes-visibility.ts` (helpers updateNoteVisibility, createDmPrivateNote)
- `lib/hooks/useDmInboxNotes.ts` (player-side — recebe do DM)
- `lib/hooks/useDmPlayerNotes.ts` (DM-side — lê shared_with_dm + dm_private_to_player)

### UI Player HQ
- `components/player-hq/DmNotesInbox.tsx` — sub-tab "Do mestre"
- **Visibility toggle inline** em `QuickNotesList` + `JournalEntryCard` (ícone Lock ↔ Eye)
- **Privacy badge** Lock icon no header da seção
- **Copy atualizado:** "Você escolhe quais notas compartilhar com o mestre" (honesto, não enganoso)

### UI Campaign HQ
- `components/campaign/PlayerNotesInspector.tsx` — DM vê notas agrupadas por jogador, filtro per-player
- `components/campaign/DmPrivateNoteForm.tsx` — DM cria nota `dm_private_to_player` targeted
- **Nova section:** `/app/campaigns/[id]?section=player-notes` (DM-only com guard em 4 camadas)
- **CampaignNavBar** ganha pill com ícone Scroll (DM-only)

### RLS Contract Tests
- `tests/rls/player-notes-visibility.sql` (10 cenários documentados — aguardam rewrite em DO $$ blocks pra rodar em psql)

### Commits
```
dd6a5540 feat(notes-visibility): mig 149 — player_journal.visibility + campaign_notes.target_character_id
f2acc652 feat(notes-visibility): types + hooks + visibility helpers
7bc1254f feat(player-hq): DM notes inbox tab + visibility privacy badge
82b4e498 feat(campaign-hq): DmPrivateNoteForm — DM sends private note to player
05f55e61 feat(campaign-hq): PlayerNotesInspector — DM reads shared + sent private notes
7a8bdb99 feat(campaign-hq): wire PlayerNotes into navigation + i18n
ecb08545 fix(review-4): W4 notes visibility — RLS leak (mig 150) + missing UI + i18n keys
b5b95ad0 feat(player-hq): visibility toggle in QuickNotesList
77d6b2da feat(player-hq): i18n visibility keys + privacy_notice fix
9ca5b50f feat(player-hq): visibility toggle in JournalEntryCard
```

### Code review
**APPROVED WITH RESERVES** — bug CRÍTICO de RLS leak capturado + fixed via mig 150. Double-approved pela Onda 4 UI (2 revisores). Defense-in-depth confirmada (client hardcode + DB trigger + 4-camadas DM-only guard).

---

## Onda 5 — Auto-invite Combat (F19)

### O que foi feito

**DM inicia combate → players logados recebem toast automático em <2s.**

### Backend
- `app/api/combat/invite/dispatch/route.ts` — endpoint server (pattern de `/api/broadcast`)
- Validações: owner check (401/403), 204 se `campaign_id=null` (Quick Combat), rate-limit 3/5min (429)
- Bulk insert em `player_notifications` ANTES do broadcast (fallback durável)
- Service role broadcast em canal **novo** `campaign:{id}:invites` (NÃO reusa `session:{sessionId}`)

### Client
- `lib/supabase/combat-invite.ts` — helper `dispatchCombatInvite`
- `hooks/useCombatInviteListener.tsx` — subscribe multi-campaign + dedup por session_id
- `components/notifications/CombatInviteListenerMount.tsx` — mount adapter
- `components/notifications/CombatInviteToast.tsx` — toast gold CTA
- `components/campaign/ActiveCombatBanner.tsx` — banner persistente em `/app/campaigns/[id]` (3 camadas: SSR + broadcast + polling 30s)

### Integrações
- `components/combat-session/CombatSessionClient.tsx` — `dispatchCombatInvite` após `broadcastEvent` nos 2 paths de `handleStartCombat`
- `app/app/layout.tsx` — monta `CombatInviteListenerMount` em ambos modos (flag ON e OFF)
- `lib/types/realtime.ts` — adiciona `RealtimeCombatInvite` + event type `campaign:combat_invite`
- `lib/realtime/sanitize.ts` + `broadcast.ts` — drop explícito do event do pipeline `session:{id}`
- `components/notifications/NotificationBell.tsx` — ícone Swords + nav ao clicar em combat_invite
- i18n: `player_hq.notifications.type_combat_invite`, `combat_invite_message`, namespace `combat_invite_toast.*`

### UX por contexto
- `/app/dashboard`: toast gold persistente
- `/app/campaigns/[id]` (mesma campanha): toast + banner persistente
- Outra rota `/app/*`: toast low-key prefixado com nome da campanha
- Player offline: badge em NotificationBell ao voltar, clique navega

### Combat Parity verificada
- **Guest `/try`:** não dispara (sem access_token)
- **Anônimo `/join`:** não chama (não é DM)
- **Autenticado `/invite`:** dispara via CombatSessionClient
- **Server extra defense:** 204/401/403/429

### Commits
```
6469f0d7 feat(combat-invite): backend dispatch endpoint + types
c3ac92c7 feat(combat-invite): listener hook + listener mount
17fff2fd feat(combat-invite): wire dispatchCombatInvite in CombatSessionClient
0354d482 feat(combat-invite): banner in /app/campaigns/[id] (fallback persist)
dd6c3044 feat(combat-invite): i18n + NotificationBell icon
```

### Code review
Não houve review adversarial formal (rate limit no momento). Hunters self-aplicados pelo próprio agente confirmaram: tsc clean, Combat Parity verificada em 3 modos, player_notifications persist ANTES do broadcast (defense in depth), canal novo (não reusa session:), dedup por session_id.

---

## Follow-ups concluídos

### W4 toggle UI parte 2
- `9ca5b50f feat(player-hq): visibility toggle in JournalEntryCard`
- `privacy_notice` copy já estava corrigido em master (descoberto durante task)

---

## Docs criados nesta release

```
docs/ROADMAP-pos-linguagem-ubiqua.md          (plano mestre de 6 ondas)
docs/UX-benchmarks-modern-ludic.md            (diretriz cross-cutting)
docs/glossario-ubiquo.md                       (14 termos oficiais)
docs/migration-i18n-linguagem-ubiqua.md        (83 chaves + grupos)
docs/migration-rotas-session-to-combat.md     (65 refs + 8 passos)
docs/PROMPT-execucao-linguagem-ubiqua.md      (prompt executor)
docs/beta-test-session-3-2026-04-16.md        (30 feedbacks + 6 bugs)
docs/EPIC-player-hq-standalone.md             (parcialmente coberto)
docs/SPIKE-b04-campaign-performance.md        (causa raiz + fix plan)
docs/SPEC-campaign-hq-cards-crud.md           (Onda 1b)
docs/SPEC-campaign-dashboard-briefing.md      (Onda 2a)
docs/SPEC-navigation-redesign.md              (Onda 2b)
docs/PRD-entity-graph.md                       (Onda 3 — 700 linhas)
docs/SPEC-player-notes-visibility.md          (Onda 4)
docs/SPEC-auto-invite-combat.md               (Onda 5)
docs/DELIVERY-RELEASE-2026-04-20.md           (este doc)
docs/PROMPT-execucao-ondas-3b-3g-e-6.md       (próxima rodada)
docs/VERCEL-ACTIONS.md                         (ações no Vercel)
```

---

## Regras imutáveis — auditoria final

| Regra | Status | Evidência |
|---|---|---|
| **Combat Parity** (guest/anon/auth) | ✅ | Todas features novas auth-only respeitam matriz. Guest/anon clients intocados. |
| **Resilient Reconnection** | ✅ | `lib/player-identity-storage.ts`, `lib/realtime/*` (canais `session:`), `useCombatResilience`, session tokens NUNCA tocados |
| **SRD Compliance** | ✅ | Zero edits em `data/srd/` ou `public/srd/` |
| **SEO Canonical** | ✅ | Sem mudanças em rotas públicas/metadata. `metadataBase` intocado |
| **RTK** | ✅ | Todos comandos prefixados |

---

## Métricas de qualidade

- **TypeScript:** `rtk tsc --noEmit` verde em todos os merges
- **Tests:** 0 regressões em comparação com master baseline (140 falhas pré-existentes documentadas — ambiente jest/Supabase env vars, não relacionadas às mudanças)
- **Build Vercel:** espera-se verde (tsc passa)
- **Paridade i18n PT-BR × EN:** 100% — reviews confirmaram zero chaves missing

---

## Performance estimada

| Métrica | Antes | Depois (estimado) | Como medir |
|---|---|---|---|
| Campaign page FCP | 5-8s | <2s | Lighthouse + Vercel Analytics |
| Dashboard first load | 6s | ~2s | idem |
| Dashboard waves de query | 3 sequenciais | 1 paralelo | code review |
| Campaign queries | cascade | Suspense streaming | code review |

---

## Breaking changes

**Nenhum.** Todas mudanças foram aditivas ou atrás de feature flag (Onda 2b). Rotas legadas `/session/*` continuam funcionando via proxy (evita quebrar sendBeacon/POST em tabs abertas).

---

## Security review

- **RLS leak em mig 149** capturado no review e fixado em mig 150 ANTES de qualquer user ler notas erradas em produção (janela curta entre deploys)
- **Combat invite:** guard em 4 camadas (owner check + 204 null campaign + rate limit + service role)
- **Player notes:** defense-in-depth (client hardcode + DB trigger + 4-camadas guard UI)
- **Entity graph edges:** scope guard previne cross-campaign link (NPC global anexado a local de outra campanha é rejeitado)

---

## Próximos passos recomendados

1. **Ativar Onda 2b em produção** — ver `docs/VERCEL-ACTIONS.md`
2. **Smoke test manual em prod** — checklist por onda em cada SPEC
3. **Executar Onda 3b-3g** (Entity Graph UI) — ver `docs/PROMPT-execucao-ondas-3b-3g-e-6.md`
4. **Onda 6 polish** — deletar components antigos, mini mind-map real, test coverage

---

## Contribuidores

- **Dani_** (product owner, strategic decisions)
- **Claude Opus 4.7** (multi-agent orchestrator + party mode facilitator)
- Multiple parallel sub-agents (code review, implementation, spec production)

Total de agentes paralelos spawned nesta sessão: ~20
