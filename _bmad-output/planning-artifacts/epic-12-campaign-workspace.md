---
status: 'wave-1-implemented'
createdAt: '2026-04-21'
updatedAt: '2026-04-21'
epic: 12
title: 'Campaign Workspace — IA, Persistência & Histórico de Combates'
version: '1.1'
changelog:
  - '1.1 (2026-04-21): Wave 1 implementada + amendments post code review (scope decisions em 12.2 AC4 e 12.3 AC4)'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-campaign-workspace.md
  - _bmad-output/planning-artifacts/architecture.md
competitiveAnalysis: 'Roll20 Session Log, Foundry World mode, D&D Beyond Campaign tabs, Notion workspaces, Obsidian daily note'
author: 'Bob (SM) — Party Mode consolidado'
uxSpec: 'Sally (UX Designer) — embedded'
techSpec: 'Winston (Architect) — embedded'
---

# Epic 12: Campaign Workspace — IA, Persistência & Histórico de Combates

> **Contexto:** A tela de Campanhas atual é grid plano + banner bloqueante "Selecione uma campanha para salvar o combate". Combate vive em Zustand até o DM clicar Start. Detalhe da campanha existe mas está escondido. Não há timeline de combates, não há continuar-combate, não há workspace mode. Ver PRD: [prd-campaign-workspace.md](./prd-campaign-workspace.md).

**Filosofia:**
> "Campanha não é uma pasta. É um workspace. Combate não é um arquivo avulso. É um momento da história."

## Decisões arquiteturais travadas (Winston)

| # | Decisão | Rationale |
|---|---------|-----------|
| A1 | `sessions.campaign_id` → NULLABLE + `sessions.quick_mode BOOLEAN DEFAULT false` | Migration trivial resolve NOT NULL que bloqueia quick combat; evita campanha-fantasma que poluiria lista |
| A2 | Persistir `session + encounter` em status `draft` no entry da tela de setup | Resolve combate-perdido-ao-fechar-aba; 'Salvar no fim' vira UPDATE de status, não INSERT |
| A3 | `AppSidebar` estendida com prop `mode: 'global' \| 'campaign'` | Reusa skeleton/mobile/a11y existentes; não duplica componente |
| A4 | Zustand continua single-source-of-truth durante combate ao vivo; DB é snapshot | Preserva Resilient Reconnection; persistência não afeta performance de turno |
| A5 | `combat_reports` existente é reusada para 'Revisitar' (shareable) | Infra pronta, só expor na UI |
| A6 | Filtro global 'Drafts abandonados >72h' via cron job Supabase | Evita lixo acumular na timeline |

## UX Spec consolidada (Sally) — princípios e estados

### Princípios
1. **Workspace Mode** — entrar numa campanha muda contexto visual inteiro (sidebar, breadcrumb, atalhos).
2. **Zero decisão retroativa** — combate nunca pede campanha no final. Ou nasce dentro da campanha, ou é "rápido" permanentemente (com opção posterior de linkar).
3. **Mesma IA, diferenciador sutil DM/Player** — ribbon + badge; tabs condicionais.
4. **Timeline é narrativa, não tabela** — cada encounter é um capítulo, com imagem/resultado/XP/duração.
5. **Continuar é 1 clique** — card destacado, sem confirmation modal.

### Sidebar states

**Global mode (`mode='global'`, rota `/app/dashboard/*`, `/app/combat/*` sem campanha):**
```
┌──────────────────────┐
│ 🎲 PocketDM          │
├──────────────────────┤
│ 🏠 Dashboard         │
│ 🏰 Campanhas         │
│ ⚔️ Combate Rápido    │
│ 📚 SRD               │
│ ⚙️ Configurações     │
└──────────────────────┘
  240px (desktop)
```

**Campaign mode (`mode='campaign'`, rota `/app/campaigns/[id]/*`):**
```
┌─────┬──────────────────────────┐
│ 🎲  │ 🏰 KRYNN                 │
│ 🏠  ├──────────────────────────┤
│ 🏰  │ 📜 Overview              │
│ 📚  │ ⚔️ Combates              │
│ ⚙️  │ 🎭 Encontros (presets)   │
│     │ 📅 Sessões               │
│     │ 🧭 Quests                │
│     │ 👥 Jogadores             │
│     │ 🧟 NPCs                  │
│     │ 🗺️ Locais                │
│     │ 📝 Notas                 │
│     │ ⚙️ Configurações         │
│ 56px│ 240px                    │
└─────┴──────────────────────────┘
```

Mobile (`< md`): rail 56px vira bottom tab bar; contextual vira drawer top com nome da campanha + tabs horizontais scrolláveis.

### Campaign Overview layout

```
╔══════════════════════════════════════════════════════════════╗
║ [COVER IMAGE — 280px tall]                                    ║
║                                                               ║
║ 🏰 KRYNN                              [Editar] [Convidar]    ║
║ 5 jogadores · Sessão #12 · Última: hoje                       ║
║ 📅 Próxima sessão: Sábado, 20h (Google Calendar)              ║
╚══════════════════════════════════════════════════════════════╝

┌─ COMBATE ATIVO ─────────────────────────────────────────────┐
│ ⚔️ Batalha do Portão Sul                                    │
│ Round 4 · 15min atrás · 3/5 inimigos abatidos               │
│                                     [▶ Continuar Combate]   │
└─────────────────────────────────────────────────────────────┘

┌─ TIMELINE (últimos 5) ──────────────────────────────────────┐
│                                                              │
│  ●── Sessão #12 · hoje                                       │
│  │   🏆 Victory · Batalha do Portão Sul · 18min · +450 XP    │
│  │   [Revisitar]                                             │
│  │                                                            │
│  ●── Sessão #11 · há 4 dias                                  │
│  │   💀 TPK · Covil do Dragão · 42min · +0 XP                │
│  │   [Revisitar]                                             │
│  │                                                            │
│  ●── Sessão #10 · há 11 dias                                 │
│      🏳️ Fled · Emboscada na Floresta · 9min · +120 XP       │
│      [Revisitar]                                             │
│                                                              │
│                                       [Ver todo histórico →] │
└─────────────────────────────────────────────────────────────┘

┌─ JOGADORES ──────────┐  ┌─ NOTAS RECENTES ──────────────────┐
│ 🧝 Elara  88/88  Lv10 │  │ 📝 Sobre o ritual do Portão...    │
│ 🗡️ Kael   42/65  Lv10 │  │    há 2 dias · 3 min de leitura   │
│ 🛡️ Thorn  55/80  Lv10 │  │ 📝 NPC: Archon de Krynn           │
│ 🎭 Ivy    30/50  Lv10 │  │    há 5 dias · 1 min de leitura   │
│ 🪄 Merlin 70/70  Lv10 │  │ 📝 Quest: Fragmento de Takhisis   │
└──────────────────────┘  └───────────────────────────────────┘

[ ⚔️ Iniciar Combate ] [ 📝 Nova Nota ] [ 🎭 Novo NPC ]
```

### Campaign Card (dashboard global) — mesma hierarquia, diferenciador sutil

```
DM card:                              Player card:
┌──────────────────────┐              ┌──────────────────────┐
│ [COVER]          🎭  │              │ [COVER]      ▓ GM   │
│                      │              │                      │
│ KRYNN                │              │ Curse of Strahd      │
│ 5 jogadores          │              │ Mestre: Lucas G.     │
│ ● Último: hoje       │              │ ● Combate Ativo      │
│                      │              │                      │
│ [Combate] [Notas] ⋮ │              │ [Entrar no Combate]  │
└──────────────────────┘              └──────────────────────┘
```

- DM cards: chip 🎭 top-right. Botões = ações DM (Combate / Notas / ⋮).
- Player cards: ribbon "GM" top-right com nome. Botão = ação player (Entrar no Combate se ativo).
- Seção DM primeiro, Player depois (prioridade de uso).

---

## Estrutura do Épico — 3 Waves, 11 Stories

### Wave 1 — KILL THE BANNER (4 stories, estimativa 3–5 dias)

> **Sai:** banner some, combate persiste desde setup, nunca mais se perde.

#### Story 12.1 — Migration: `sessions.campaign_id` nullable + `quick_mode`
**As a** DM quick-mode user,
**I want** combate rápido não falhar ao persistir,
**So that** eu posso continuar usando `/combat/new?quick=true` sem precisar escolher campanha.

**Acceptance Criteria:**
- [ ] AC1: Migration criada em `supabase/migrations/NNN_sessions_quick_mode.sql`
- [ ] AC2: `sessions.campaign_id` vira `NULL` permitido; constraint `campaign_id IS NOT NULL OR quick_mode = true` (CHECK)
- [ ] AC3: `sessions.quick_mode BOOLEAN NOT NULL DEFAULT false`
- [ ] AC4: Índice parcial `WHERE campaign_id IS NOT NULL` mantido para queries de campanha
- [ ] AC5: RLS policies atualizadas: quick_mode sessions acessíveis apenas por `owner_id = auth.uid()`
- [ ] AC6: Tests: Vitest cobre CREATE com/sem campaign_id; RLS testado em branch
- [ ] AC7: Types regenerados em `types/supabase.ts`

**Dependências:** nenhuma (primeira story)
**Tech notes (Winston):** validar com Beta Test 3 dataset antes do merge (docs/beta-test-3-status-report.md)

---

#### Story 12.2 — Persistir session+encounter como `draft` no entry da setup

> **Post-implementation amendment (v1.1):** after code review, two ACs were consciously re-scoped:
> - **AC4 (combatants UPDATE in real-time)** — **DEFERRED TO WAVE 3**. Persisting every addCombatant/removeCombatant to the DB during setup would require intercepting Zustand mutations and would materially increase the surface of the realtime/broadcast flow (which Resilient Reconnection Rule warns against). The "resume interrupted combat" user journey is covered by Story 12.9 (Continuar Combate), which hydrates from `party_snapshot`/`creatures_snapshot` taken at Start. For the Wave 1 MVP, refresh-during-setup still loses combatants; this is an acceptable trade-off because refresh-during-setup is rare and Zustand already survives tab-focus changes.
> - **AC5 (refresh loads draft)** — **IMPLEMENTED VIA sessionStorage**, not full DB-side recovery. The session_id is cached in `window.sessionStorage` keyed by `pocketdm.draft-session:{campaignId|quick}`, so refresh reuses the same draft row instead of orphaning a new one. Combatants still live in Zustand and are not recovered from storage — see AC4 note above.

**As a** DM iniciando um combate,
**I want** o combate ser salvo automaticamente quando eu entro na tela de setup,
**So that** se eu fechar a aba ou perder conexão, eu posso retomar de onde parei.

**Acceptance Criteria:**
- [ ] AC1: Ao montar `app/combat/new/page.tsx` com `campaign_id` resolvido (ou `quick=true`), cria session + encounter draft imediatamente
- [ ] AC2: `encounters.ended_at = NULL`, `encounters.is_active = false` até o Start
- [ ] AC3: Nova coluna ou flag `sessions.is_draft BOOLEAN` OU uso do existente `sessions.is_active = false` para identificar drafts
- [ ] AC4: Adicionar/remover combatants na setup faz UPDATE real no DB (não só Zustand)
- [ ] AC5: Refresh na tela carrega o draft sem perder criaturas adicionadas
- [ ] AC6: Tests: E2E Playwright cobre refresh da página de setup
- [ ] AC7: RLS: draft só visível ao owner

**Dependências:** 12.1
**Tech notes (Winston):** reusar `createEncounterWithCombatants` existente; mudar call site do `handleStartEncounter` para `handleSetupEntry`. Zustand continua como SoR durante combate ao vivo (A4).

---

#### Story 12.3 — Remover banner "Selecione uma campanha" do recap

> **Post-implementation amendment (v1.1):** AC4 (post-save redirect) was **inverted**. The original spec said save should `router.push` to `/app/campaigns/[id]` or `/app/dashboard`. Implementation instead **stays on the recap screen** — which aligns with the original user complaint ("o banner me expulsa da tela de recap"). Redirect is removed entirely; the DM decides when to leave (via the existing `onNewCombat` close button). This also preserves the combat_report share URL visible on screen, supporting the Revisitar storytelling flow (Wave 3).

**As a** DM finalizando um combate,
**I want** que o combate seja salvo automaticamente sem me pedir campanha,
**So that** eu não perco contexto e não sou empurrado pra fora da tela.

**Acceptance Criteria:**
- [ ] AC1: `components/combat/RecapActions.tsx:144-150` refatorado: `handleSaveCombat` não verifica mais `!campaignId`
- [ ] AC2: Salvar combate vira UPDATE: `encounters.ended_at = now()`, `combat_result`, `party_snapshot`, `creatures_snapshot`
- [ ] AC3: Se `session.quick_mode = true`, recap mostra CTA opcional "Vincular a uma campanha" (dropdown, não bloqueante)
- [ ] AC4: Redirect pós-save vai para `/app/campaigns/[id]` se tiver campanha; `/app/dashboard` se quick
- [ ] AC5: i18n key `recap_save_no_campaign` deletada (ou realocada para texto informativo)
- [ ] AC6: Tests: Vitest cobre save flow com e sem campanha; E2E cobre redirect

**Dependências:** 12.1, 12.2
**Tech notes (Winston):** remover redirect pra `/app/dashboard/campaigns` na linha atual

---

#### Story 12.4 — Sweeper de drafts abandonados (>72h)

> **Post-implementation amendment (v1.1):** audit log (AC4) routed through the existing `error_logs` table with `level=info, component='sweep_abandoned_combat_drafts', category='housekeeping'` — avoids creating a dedicated audit table for a single consumer. Entries only written when rows are actually deleted (no daily no-op spam).

**As a** DM,
**I want** drafts antigos não poluírem minhas listas,
**So that** a timeline e dashboard mostrem só combates reais.

**Acceptance Criteria:**
- [ ] AC1: Supabase cron job OU edge function roda diariamente
- [ ] AC2: Deleta encounters com `ended_at IS NULL AND is_active = false AND created_at < now() - interval '72 hours'`
- [ ] AC3: Cascade deleta combatants e session órfã
- [ ] AC4: Log retido em `audit_log` ou similar
- [ ] AC5: Tests: unit test do SQL query

**Dependências:** 12.1, 12.2
**Tech notes (Winston):** cron via `pg_cron` extension se habilitado, senão Supabase Edge Function com schedule

---

### Wave 2 — CAMPAIGN WORKSPACE MODE (4 stories, estimativa 5–8 dias)

> **Sai:** entrar numa campanha vira experiência distinta com sidebar contextual e overview rico.

#### Story 12.5 — `AppSidebar` estendida com `mode='campaign'`
**As a** DM dentro de uma campanha,
**I want** que a sidebar reflita o contexto da campanha,
**So that** eu acesso tabs da campanha (Combates, Quests, Notas) sem voltar ao dashboard global.

**Acceptance Criteria:**
- [ ] AC1: Prop `mode: 'global' | 'campaign'` em `components/layout/AppSidebar.tsx`
- [ ] AC2: `mode='campaign'` renderiza rail 56px (ícones only) + painel contextual 240px
- [ ] AC3: Tabs do painel contextual: Overview, Combates, Encontros, Sessões, Quests, Jogadores, NPCs, Locais, Notas, Settings
- [ ] AC4: Player user vê apenas: Overview, Combates, Sessões, Quests, Notas (sem NPCs/Settings/Encontros)
- [ ] AC5: Breadcrumb sticky top: `[ícone campanha] NOME / Tab Atual`
- [ ] AC6: Mobile: rail vira bottom tab bar (4 ícones + "mais"); contextual vira drawer top scrollável
- [ ] AC7: `AppLayout` decide `mode` com base em `pathname.startsWith('/app/campaigns/')`
- [ ] AC8: Tests: E2E cobre navegação DM e Player; visual regression em desktop + mobile
- [ ] AC9: A11y: skip-link funciona, aria-current no tab ativo

**Dependências:** nenhuma (paralela a Wave 1)
**UX notes (Sally):** animação sutil (200ms) no switch mode. Rail ganha tooltip no hover com nome do tab.
**Tech notes (Winston):** NÃO criar componente separado. Subcomponentes `<SidebarGlobalRail>`, `<SidebarCampaignRail>`, `<SidebarCampaignPanel>` dentro do mesmo arquivo ou colocais.

---

#### Story 12.6 — Campaign Overview redesenhado (Hero + Combate Ativo + Timeline + Jogadores + Notas)
**As a** DM entrando na campanha,
**I want** ver o estado atual da mesa e o histórico recente,
**So that** eu preparo a sessão rapidamente.

**Acceptance Criteria:**
- [ ] AC1: `app/app/campaigns/[id]/page.tsx` renderiza novo `CampaignOverview` component
- [ ] AC2: Hero com `cover_image_url`, nome, contadores (jogadores, sessões, última sessão)
- [ ] AC3: Bloco "Próxima Sessão" editável (input + data picker); persiste em `campaigns.next_session_at` (nova coluna OU JSON de metadata)
- [ ] AC4: Card "Combate Ativo" aparece apenas se existe encounter com `ended_at IS NULL AND is_active = true`
- [ ] AC5: Timeline dos últimos 5 encounters com `ended_at IS NOT NULL` (descending)
- [ ] AC6: Lista de jogadores com HP/level (join `campaign_members` → `player_characters` → último `combatants.current_hp`)
- [ ] AC7: Últimas 3 notas editadas com preview de 2 linhas
- [ ] AC8: Quick Actions inferiores: Iniciar Combate / Nova Nota / Novo NPC
- [ ] AC9: Player view: Hero + Combate Ativo (se tem) + Notas públicas + Próxima sessão (read-only)
- [ ] AC10: Tests: Vitest para data fetchers, E2E para DM e Player views
- [ ] AC11: Performance: LCP < 2.5s (já que é SSR); loading skeleton pros blocos client

**Dependências:** 12.5 (para navegar); 12.2 (para mostrar combate ativo corretamente)
**UX notes (Sally):** em mobile, Hero reduz para 120px tall; grid vira coluna única; Timeline scrolla horizontalmente ou vira accordion.
**Tech notes (Winston):** server component com `Suspense` por bloco. Reusar `CampaignDmViewServer` se alinhar, senão criar `CampaignOverview.tsx` focado.

---

#### Story 12.7 — Dashboard de Campanhas — cards com ribbon DM/Player + seção "Combates Rápidos"
**As a** usuário,
**I want** diferenciar visualmente campanhas em que sou DM vs jogador,
**So that** eu encontro rápido o contexto que quero.

**Acceptance Criteria:**
- [ ] AC1: `components/dashboard/CampaignCard.tsx` ganha variant por role
- [ ] AC2: DM card: chip 🎭 top-right; botões [Combate] [Notas] [⋮]
- [ ] AC3: Player card: ribbon "GM: {nome}" top-right; botão [Entrar no Combate] quando ativo, senão [Ver Campanha]
- [ ] AC4: Dashboard separa DM cards (primeiro) e Player cards (depois); headers "Minhas Mesas (como Mestre)" / "Minhas Mesas (como Jogador)" mantidos
- [ ] AC5: Nova seção "Combates Rápidos" lista `sessions.quick_mode = true` do usuário (opcional, só aparece se tiver)
- [ ] AC6: CTA "+ Nova Campanha" mantido no topo direito
- [ ] AC7: Tests: Visual regression + Vitest para filtros

**Dependências:** 12.1 (para filtrar quick_mode)
**UX notes (Sally):** ordem visual: DM cards com mais affordance (botões primários), Player cards mais contemplativos (um CTA único). Ribbon usa cor do DM (gerada do email hash) pra reconhecimento.

---

#### Story 12.8 — Entry points consistentes: combate sempre nasce dentro da campanha
**As a** DM,
**I want** iniciar combate de dentro da campanha já com contexto,
**So that** eu nunca vejo o picker de campanha se já estou num contexto.

**Acceptance Criteria:**
- [ ] AC1: Botão "Combate" no CampaignCard (dashboard) → `/app/combat/new?campaign=UUID`
- [ ] AC2: Quick Action "Iniciar Combate" no Campaign Overview → mesma rota com `campaign_id` já resolvido
- [ ] AC3: `/app/combat/new` sem `?campaign=` nem `?quick=true` redireciona para `/app/dashboard/campaigns` com hint "Escolha onde iniciar o combate" (não é um banner sinistro, é uma redireção limpa)
- [ ] AC4: `QuickActions.tsx` (dashboard global) tem dois CTAs separados: "Combate na Campanha" (abre modal picker) e "Combate Rápido" (vai direto)
- [ ] AC5: Tests: E2E cobre os 4 entry points (DM card, overview, dashboard picker, quick)

**Dependências:** 12.5, 12.6
**UX notes (Sally):** o "picker de campanha" deixa de ser uma tela dedicada e vira modal leve quando necessário.

---

### Wave 3 — TIMELINE, REVISITAR, AVALIAR (3 stories, estimativa 5–8 dias)

> **Sai:** histórico de combates como feature de primeira classe, 3 modos de uso.

#### Story 12.9 — 'Continuar Combate' — hydrate do snapshot
**As a** DM que teve combate interrompido,
**I want** retomar de onde parei com 1 clique,
**So that** eu não perco o estado da sessão.

**Acceptance Criteria:**
- [ ] AC1: Card "Combate Ativo" no Campaign Overview (já especificado em 12.6) tem botão "Continuar"
- [ ] AC2: Click carrega `encounters.party_snapshot` + `creatures_snapshot` + `combatants` na sala de combate
- [ ] AC3: Zustand hydrate restaura round, turn, conditions, HP
- [ ] AC4: Broadcast channel é re-estabelecido; jogadores anônimos ativos recebem rejoin automático
- [ ] AC5: Se > 4h desde última atividade, modal confirma "Continuar combate de X minutos atrás?"
- [ ] AC6: Se algum player desconectou, banner "2 jogadores precisam re-entrar" com link copiável
- [ ] AC7: Tests: E2E simula fechar tab + reabrir via "Continuar"; respeita Resilient Reconnection Rule (CLAUDE.md)

**Dependências:** 12.2, 12.6
**Tech notes (Winston):** hydrate acontece em `CombatSessionClient.tsx` via `useEffect` no mount quando `encounters.is_active = true`. Preservar Zustand como SoR após hydrate.

---

#### Story 12.10 — 'Revisitar' — modal cinematográfico por encounter
**As a** DM,
**I want** um recap visual rico de combate passado,
**So that** eu conto storytelling pros jogadores entre sessões.

**Acceptance Criteria:**
- [ ] AC1: Timeline item no Overview tem botão [Revisitar]
- [ ] AC2: Modal full-screen (não popup) com: nome, resultado, duração, XP, round final, DM notes, dificuldade percebida, party snapshot + creatures snapshot em grid
- [ ] AC3: Hero com artwork do primeiro monstro (se houver) + overlay com resultado (Victory/TPK/Fled)
- [ ] AC4: Seção "O que aconteceu" — resumo auto-gerado (template): "3 jogadores participaram. Kael foi o mais ferido (HP 12/65). O goblin chefe foi abatido no round 3 por Elara."
- [ ] AC5: Botão "Compartilhar" gera link público usando `combat_reports` (já existe)
- [ ] AC6: Botão "Copiar resumo" copia texto formatado pro clipboard (pronto pra WhatsApp)
- [ ] AC7: Player view: mesma modal, sem DM notes privadas
- [ ] AC8: Tests: Vitest para template generator; E2E para share flow

**Dependências:** 12.6, `combat_reports` existente
**UX notes (Sally):** essa tela é o "momento Instagram" do PocketDM. Tratamento visual rico, permita download de imagem de resumo (OG image style). Inspiração: Strava activity recap.

---

#### Story 12.11 — 'Avaliar' — Stats da campanha
**As a** DM,
**I want** ver estatísticas agregadas da minha campanha,
**So that** eu ajusto dificuldade e identifico padrões.

**Acceptance Criteria:**
- [ ] AC1: Nova tab "Stats" no rail contextual da campanha (apenas DM)
- [ ] AC2: Cards de métrica: total de combates, win rate, tempo médio por combate, XP total distribuído, TPK count
- [ ] AC3: Gráfico barra: dificuldade percebida (`dm_difficulty_rating`) vs CR médio real por encounter (últimos 20)
- [ ] AC4: Ranking "Mais ferido": soma de HP perdido por jogador (derivado de snapshots inicial→final)
- [ ] AC5: Timeline expandida (todos encounters, não só 5) com filtros por resultado
- [ ] AC6: Export CSV (opcional V1.1)
- [ ] AC7: Tests: Vitest para agregadores SQL; E2E para filtros

**Dependências:** 12.6, snapshots existentes
**UX notes (Sally):** não virar planilha. Cada stat tem contexto narrativo ("Sua mesa sobrevive 78% dos combates — saudável").
**Tech notes (Winston):** queries de agregação via Postgres views materialized? Se crescer muito, criar `campaign_stats_mv` refresh diário. V1 usa queries diretas.

---

## Sequência recomendada (Bob)

```
Wave 1 (paralelizável entre si):
  12.1 (migration)  ──┐
  12.2 (persist setup) ├── merge — Sprint 1
  12.3 (kill banner)    │
  12.4 (sweeper)      ──┘

Wave 2:
  12.5 (sidebar) ──┐
  12.6 (overview) ─┼── merge — Sprint 2
  12.7 (cards)   ──┤
  12.8 (entry points)┘

Wave 3:
  12.9 (continuar) ──┐
  12.10 (revisitar) ──├── merge — Sprint 3
  12.11 (avaliar)  ──┘
```

## Definition of Done (todas stories)

- [ ] AC marcados e testados (unit + E2E onde aplicável)
- [ ] i18n PT-BR + EN (chaves em `messages/pt-BR.json` + `messages/en.json`)
- [ ] Combat Parity Rule verificada (DM / Jogador Anônimo / Jogador Autenticado — CLAUDE.md)
- [ ] Resilient Player Reconnection preservada (não quebra heartbeat/storage/visibilitychange — CLAUDE.md)
- [ ] `tsc --noEmit` passa
- [ ] `rtk vitest run` passa
- [ ] `rtk playwright test` passa (E2E onde story especifica)
- [ ] A11y: aria-labels, skip-links, tab order verificados
- [ ] Performance: LCP < 2.5s em páginas server-side; TTI < 3s
- [ ] RLS testado com Beta Test 3 dataset

## Métricas de sucesso (pós-deploy)

Referenciar PRD §6. Resumo:
- Taxa de combates salvos: 100%
- Cliques pra iniciar combate: 2 (dentro do workspace)
- Combates perdidos por aba fechada: 0%
- Uso de 'Revisitar' em 30 dias: ≥ 20%
- DMs que entram na tab Stats: ≥ 40%

## Riscos específicos de implementação (QA — Quinn)

| Risco | Story afetada | Mitigação |
|-------|--------------|-----------|
| Draft pollution durante dev (dataset cheio de lixo) | 12.2, 12.4 | Sweeper manual + filtro agressivo na Timeline |
| RLS regressão em combate quick | 12.1 | Test matrix: quick + anon player + DM scenarios |
| Sidebar contextual quebra no onboarding wizard | 12.5 | Forçar `mode='global'` em rotas de onboarding |
| Hydrate de combate ativo causa estado zumbi | 12.9 | Timeout/confirmação em >4h; botão "Desistir" do combate |
| Timeline query O(n) degrada com campanhas grandes | 12.6, 12.11 | Limit 5 no overview; paginação na tab Stats; index em `encounters(session_id, ended_at DESC)` |

## Dependências de conteúdo (Paige — Tech Writer)

- i18n keys novas (estimativa: ~40 keys novas)
- Tooltips para tabs da sidebar (hover)
- Help doc: "Como funciona o workspace de campanha" (blog post V1.1)
- Changelog + comunicado para beta testers no Discord

---

**Próximo passo acionável:** SM abre Story 12.1 e despacha pra dev. Recomendação Bob: começar Wave 1 imediatamente, paralelizando 12.1 → 12.2+12.3 → 12.4 enquanto Wave 2 ainda está em wireframe.
