---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-03-27'
lastRevision: '2026-03-27'
version: '2.0'
revisionNotes: 'V2 completo — 9 Epics (0-8), 41 stories, 200+ acceptance criteria. Baseado em PRD V2, Architecture V2, UX Design V2. Substitui epics V1.'
inputDocuments:
  - docs/prd-v2.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/epics-and-sprints-spec.md
  - docs/tech-stack-libraries.md
workflowType: 'epics-and-stories'
project_name: 'projeto-rpg'
user_name: 'Dani_'
date: '2026-03-27'
---

# projeto-rpg — Epic Breakdown V2

## Overview

Este documento contém o breakdown completo de epics e stories para o **Pocket DM V2**. O MVP (V1) já está em produção com FR1–FR41 e NFR1–NFR28 implementados. Este documento cobre exclusivamente o trabalho V2: tech debt cleanup, novas features de combate, experiência do jogador, gestão de sessão/campanha, e modelo freemium.

**Escopo:** 9 Epics (0–8), 41 stories, organizados em 3 sprints + backlog.

---

## Requirements Inventory

### Functional Requirements (V2 — FR42-FR63, FR51b)

- FR42: DM pode adicionar monstros/jogadores mid-combat sem interromper turno atual
- FR43: DM pode definir display name para monstros (anti-metagaming). Nome real visível só para DM
- FR44: DM pode agrupar múltiplos monstros sob uma única entrada de iniciativa
- FR45: DM pode gerenciar grupos de monstros com HP individual
- FR46: DM pode expandir/colapsar grupos na lista de combate
- FR47: Late-join player pode registrar nome, HP, AC e iniciativa. DM aceita/rejeita
- FR48: Jogador recebe notificação visual "Você é o próximo" 1 turno antes
- FR49: Jogador recebe notificação visual "É sua vez!" com animação e som opcional
- FR50: Jogador pode se identificar como Jogador/Mestre/Ambos no signup
- FR51: Jogador cadastrado pode ter personagem vinculado a campanha via convite/QR
- FR51b: Jogador cadastrado entra em sessão ativa → aparece automaticamente na tela do DM
- FR52: DM pode criar/editar notas privadas na sessão (nunca broadcast)
- FR53: DM pode compartilhar arquivos (imagens, PDFs) com jogadores na sessão
- FR54: DM pode convidar jogadores para campanha via email
- FR55: Jogador que aceita convite tem personagem vinculado automaticamente
- FR56: DM Pro pode atribuir player character a jogador temporário (QR)
- FR57: Usuário Free vê features Pro com cadeado + tooltip
- FR58: Upsell contextual inline ao tentar usar feature Pro
- FR59: Trial grátis 14 dias configurável
- FR60: Modelo "Mesa" — assinatura do mestre desbloqueia Pro para mesa toda
- FR61: Diferenciação consistente Pro/Free via ícones, tooltips, labels
- FR62: CR calculator automático (SRD 2014 + 2024)
- FR63: Homebrew — criar monstros, magias, itens customizados

### Functional Requirements (V1 — FR1-FR41, Já Implementados)

> Referência apenas. Todos implementados e em produção. Ver `_bmad-output/planning-artifacts/prd.md`.

- FR1–FR6: Session & Encounter Management
- FR7–FR15, FR39, FR41: Combat Tracking
- FR16–FR21: Rules Oracle
- FR22–FR27, FR40: User & Account
- FR28–FR32, FR38: Real-Time Collaboration
- FR33–FR35: Administration
- FR36–FR37: Legal & Compliance

### Non-Functional Requirements (V2 — NFR29-NFR38)

- NFR29: Feature flags resolve ≤500ms, rollback ≤1min
- NFR30: Email invite rate limit 20/dia/DM
- NFR31: Turn notifications ≤200ms após ação do DM
- NFR32: Upload 10MB limit + type validation + malicious content check
- NFR33: Display names sanitizados contra XSS OWASP Top 10
- NFR34: Modelo Mesa valida assinatura via RLS. Graceful degradation mid-session
- NFR35: Browser support: Chrome/Firefox/Safari/Edge ≥120
- NFR36: Core Web Vitals: LCP ≤2.5s, FID ≤100ms, CLS ≤0.1
- NFR37: WCAG 2.1 AA, keyboard operável, aria-live para realtime
- NFR38: Responsive breakpoints: mobile ≤768, tablet 769-1024, desktop ≥1025

### Tech Debts

- TD1: Empty catch blocks (PlayerLobby, OracleAIModal) — falhas silenciosas
- TD2: useEffect dependency arrays faltando (4 componentes) — stale closures
- TD3: Rate limit in-memory — não funciona em serverless
- TD4: 15+ eslint-disable comments — type safety comprometida
- TD5: setTimeout sem cleanup — memory leaks
- TD6: Math.random() para dice — inseguro cripto (baixo impacto)
- TD7: Padrão error/loading duplicado em 5+ componentes
- TD8: `any` type em Oracle AI response
- TD9: Mutable global state (broadcast channel)
- TD10: Hardcoded color strings — deveria ser design tokens
- TD11: Falta testes E2E
- TD12: Aria-live regions inconsistentes

### UX Design Requirements (V2 — UX-DR16 a UX-DR30)

Source: `_bmad-output/planning-artifacts/ux-design-specification.md` (V2 Addendum)

- UX-DR16: Mid-combat add via MidCombatAddSheet — sheet deslizante com busca SRD
- UX-DR17: Display name rendering — DM vê nome real + display name; player vê somente display name
- UX-DR18: MonsterGroupRow — header colapsável com HP agregado e chevron
- UX-DR19: LateJoinForm — formulário para jogador atrasado com status pending/approved/rejected
- UX-DR20: TurnNotificationOverlay + TurnUpcomingBanner — overlay "É sua vez!" + banner "Você é o próximo"
- UX-DR21: OnlineIndicator + Presence dots — indicador de presença para auto-join
- UX-DR22: GMNotesSheet — panel colapsável com Markdown e auto-save
- UX-DR23: SharedFileCard — card de arquivo compartilhado com thumbnail e download
- UX-DR24: FeatureLockBadge + UpsellCard + TrialActivation — UI de freemium gating
- UX-DR25: InvitePlayerDialog — dialog de convite por email
- UX-DR26: RoleSelectionCards — seleção visual jogador/mestre/ambos
- UX-DR27: CRCalculatorCard — badge de dificuldade do encontro
- UX-DR28: HomebrewCreator + HomebrewBadge (purple pill)
- UX-DR29: PlayerLinkDropdown — vincular player temporário a character
- UX-DR30: Animações V2 via Framer Motion + Magic UI para player view

### Additional Requirements (Architecture V2)

- **DB Schema V2:** 18 tabelas (10 originais + 8 novas). Migrations 006–016.
- **Novu:** Notification system (in-app + email) — workflows: turn-upcoming, turn-now, player-joined, late-join-request, campaign-invite, trial-expiring.
- **Trigger.dev:** Background jobs — cleanup-guest-sessions, check-trial-expiry, process-session-analytics, send-campaign-invite.
- **Supabase Storage:** Bucket `session-files` para FR53.
- **Supabase Presence:** Tracking de jogadores online para FR51b.
- **Stripe Checkout + Webhooks:** Pagamento para FR59–FR60.
- **Feature flags via Supabase table** com cache client-side 5min.
- **Dual-write pattern** mantido: Zustand → channel.send() → supabase.update().

---

## FR Coverage Map (V2)

| FR | Epic | Descrição |
|----|------|-----------|
| FR42 | Epic 1 | Add mid-combat sem interromper turno |
| FR43 | Epic 1 | Display name anti-metagaming |
| FR44 | Epic 2 | Agrupar monstros sob uma iniciativa |
| FR45 | Epic 2 | HP individual em grupos de monstros |
| FR46 | Epic 2 | Expandir/colapsar grupos na lista |
| FR47 | Epic 1 | Late-join player com DM approve/reject |
| FR48 | Epic 3 | Notificação "Você é o próximo" |
| FR49 | Epic 3 | Notificação "É sua vez!" com animação |
| FR50 | Epic 3 | Role selection no signup |
| FR51 | Epic 3 | Personagem vinculado via convite/QR |
| FR51b | Epic 3 | Auto-join: jogador aparece na tela do DM |
| FR52 | Epic 4 | Notas privadas do DM na sessão |
| FR53 | Epic 4 | Compartilhar arquivos na sessão |
| FR54 | Epic 4 | Convite por email para campanha |
| FR55 | Epic 4 | Vínculo automático via convite aceito |
| FR56 | Epic 3 | DM Pro atribui PC a jogador temporário |
| FR57 | Epic 5 | Features Pro com cadeado + tooltip |
| FR58 | Epic 5 | Upsell contextual inline |
| FR59 | Epic 5 | Trial grátis 14 dias |
| FR60 | Epic 5 | Modelo Mesa — assinatura do mestre |
| FR61 | Epic 5 | Diferenciação Pro/Free consistente |
| FR62 | Epic 4 | CR calculator automático |
| FR63 | Epic 4 | Homebrew (monstros, magias, itens) |
| TD1-TD5, TD8 | Epic 0 | Tech debt cleanup (Sprint 1) |

### UX-DR Coverage Map

| UX-DR | Epic | Componente Principal |
|-------|------|---------------------|
| UX-DR16 | Epic 1 | MidCombatAddSheet |
| UX-DR17 | Epic 1 | DisplayNameInput / CombatantRow |
| UX-DR18 | Epic 2 | MonsterGroupRow |
| UX-DR19 | Epic 1 | LateJoinForm |
| UX-DR20 | Epic 3 | TurnNotificationOverlay + TurnUpcomingBanner |
| UX-DR21 | Epic 3 | OnlineIndicator + PresenceDots |
| UX-DR22 | Epic 4 | GMNotesSheet |
| UX-DR23 | Epic 4 | SharedFileCard |
| UX-DR24 | Epic 5 | FeatureLockBadge + UpsellCard |
| UX-DR25 | Epic 4 | InvitePlayerDialog |
| UX-DR26 | Epic 3 | RoleSelectionCards |
| UX-DR27 | Epic 4 | CRCalculatorCard |
| UX-DR28 | Epic 4 | HomebrewCreator + HomebrewBadge |
| UX-DR29 | Epic 3 | PlayerLinkDropdown |
| UX-DR30 | Epic 3 | Framer Motion + Magic UI animations |

---

## Epic List

### Epic 0: Tech Debt Cleanup (Sprint 1)
Eliminar dívidas técnicas críticas que comprometem estabilidade, type safety e manutenibilidade antes de adicionar features V2.
**TDs cobertos:** TD1, TD2, TD3, TD4, TD5, TD8
**Stories:** 5

### Epic 1: Combat Core Improvements (Sprint 1)
DM pode adicionar combatentes mid-combat, definir display names anti-metagaming, e aceitar jogadores atrasados.
**FRs cobertos:** FR42, FR43, FR47
**UX-DRs:** UX-DR16, UX-DR17, UX-DR19
**Stories:** 3

### Epic 2: Monster Grouping & Initiative (Sprint 2)
DM pode agrupar monstros sob uma única iniciativa, gerenciar HP individual, e expandir/colapsar grupos.
**FRs cobertos:** FR44, FR45, FR46
**UX-DRs:** UX-DR18
**Stories:** 4

### Epic 3: Player Experience Upgrade (Sprint 2)
Jogadores recebem notificações de turno, selecionam role no signup, e aparecem automaticamente na sessão. DM pode vincular jogadores temporários a characters.
**FRs cobertos:** FR48, FR49, FR50, FR51, FR51b, FR56
**UX-DRs:** UX-DR20, UX-DR21, UX-DR26, UX-DR29, UX-DR30
**Stories:** 5

### Epic 4: Session & Campaign Management (Sprint 3)
DM tem notas privadas, compartilha arquivos, convida jogadores por email, usa CR calculator e cria conteúdo homebrew.
**FRs cobertos:** FR52, FR53, FR54, FR55, FR62, FR63
**UX-DRs:** UX-DR22, UX-DR23, UX-DR25, UX-DR27, UX-DR28
**Stories:** 6

### Epic 5: Freemium Feature Gating (Sprint 3)
Feature flags, indicadores Pro, upsell contextual, trial de 14 dias, modelo "Mesa", integração Stripe.
**FRs cobertos:** FR57, FR58, FR59, FR60, FR61
**NFRs:** NFR29, NFR34
**UX-DRs:** UX-DR24
**Stories:** 7

### Epic 6: Audio & Ambiance (Backlog V2+)
Efeitos sonoros temáticos controlados pelos jogadores durante seus turnos, com áudio no PC do DM.
**Stories:** 4

### Epic 7: Battle Scenes & Maps (Backlog V3+)
Cenários visuais temáticos, geração por IA, efeitos cinematográficos e presets combinados.
**Stories:** 4

### Epic 8: Hardware Kit (Backlog V5)
Pesquisa de kit hardware (projetor + app) para projetar na mesa física.
**Stories:** 3

### Epic 9: Guided Onboarding — Try Mode (Implementado)
Tour guiado interativo no modo `/try` com spotlight SVG, steps interativos com auto-advance, smart skip logic, i18n (pt-BR + en), e CTA de conversão. Baseado em análise competitiva do Shieldmaiden VTT.
**FRs cobertos:** FR64, FR65, FR66, FR67, FR68, FR69, FR70, FR71, FR72
**Stories:** 4 (3 implementadas + 1 pendente com melhorias Shieldmaiden)

### Epic 10: Content Import Engine (Sprint 4)
Motor de importação genérica de conteúdo externo (monstros, magias, itens) via URL ou upload JSON. Dados em IndexedDB client-side. Parser multi-formato (5etools, Open5e, 5e-database). Integrado ao combate e ao tour do `/try`.
**Research:** `_bmad-output/planning-artifacts/research/research-compendium-legal-strategy-2026-03-28.md`
**Stories:** 7
**Stories detalhadas:** `_bmad-output/planning-artifacts/epic-10-content-import-engine.md`

---

> **Nota:** As stories detalhadas para cada Epic estão nos arquivos dedicados:
> - Epics 0, 1, 2: `_bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md`
> - Epics 3, 4, 5: `_bmad-output/planning-artifacts/epics-v2-stories.md`
> - Epic 9: `_bmad-output/planning-artifacts/epic-9-guided-onboarding.md`
> - Epic 10: `_bmad-output/planning-artifacts/epic-10-content-import-engine.md`
>
> **Para stories completas com Given/When/Then AC, consulte os arquivos acima.**
> Abaixo segue o resumo de cada story com referências.

---

## Epic 0: Tech Debt Cleanup

Resolver débitos técnicos críticos que causam bugs, falhas silenciosas ou UX ruim antes de adicionar features V2. Zero eslint-disable para type safety, zero catch blocks vazios, rate limit persistente em ambiente serverless.

### Story 0.1: Corrigir catch blocks vazios com feedback ao usuário

As a **developer**,
I want to replace empty catch blocks with proper error handling and user feedback,
So that users see meaningful error messages and errors are tracked in Sentry.

**FRs/NFRs:** TD1
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** um jogador preenchendo o formulário de registro no PlayerLobby
**When** a chamada `onRegister()` lança uma exceção
**Then** o catch exibe Toast com mensagem traduzível (`player.register_error`)
**And** `isSubmitting` é resetado para `false`
**And** o erro é reportado ao Sentry com contexto

**Given** o Oracle AI recebe um chunk SSE malformado
**When** `JSON.parse(data)` falha
**Then** `console.warn` registra o chunk malformado
**And** o streaming continua sem interrupção

**Given** qualquer catch corrigido captura um erro (não AbortError)
**When** o erro ocorre
**Then** `Sentry.captureException(error)` é chamado com tags do componente

---

### Story 0.2: Corrigir useEffect dependency arrays

As a **developer**,
I want to fix all useEffect hooks that suppress `react-hooks/exhaustive-deps`,
So that effects reagem corretamente a mudanças, prevenindo stale closures.

**FRs/NFRs:** TD2
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** GuestCombatClient.tsx:76 com eslint-disable
**When** a dependência `combatants` é corretamente declarada
**Then** funções setter são reconhecidas como estáveis (useState), eslint-disable removido

**Given** DiceHistoryPanel.tsx:41 com eslint-disable
**When** `markRead` é incluída no dependency array via useCallback/useRef
**Then** eslint-disable removido, comportamento preservado

**Given** EncounterSetup.tsx:89 e MonsterSearchPanel.tsx:140
**When** todas as dependências são corretamente declaradas
**Then** zero `eslint-disable-next-line react-hooks/exhaustive-deps` nos 4 arquivos

---

### Story 0.3: Migrar rate limit do Oracle AI para Supabase

As a **developer**,
I want to replace the in-memory rate limit Map with Supabase `rate_limits` table + `check_rate_limit()` RPC,
So that rate limiting funciona em ambiente multi-instance serverless.

**FRs/NFRs:** TD3, NFR14
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** a migration é executada
**When** a tabela `rate_limits` é criada
**Then** a RPC `check_rate_limit(p_key, p_max_count, p_window_seconds)` existe
**And** atomicamente incrementa ou reseta o contador

**Given** um request chega ao `/api/oracle-ai`
**When** o IP é extraído e a RPC é chamada
**Then** retorna HTTP 429 se limite excedido, ou prossegue normalmente

**Given** a RPC falha (timeout, conexão recusada)
**When** o catch captura o erro
**Then** o request prossegue (fail-open) e o erro é logado no Sentry

---

### Story 0.4: Cleanup de setTimeout leaks

As a **developer**,
I want to store setTimeout IDs in refs and clear them in useEffect cleanup,
So that timeouts são cancelados no unmount, prevenindo memory leaks.

**FRs/NFRs:** TD5
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** OracleAIModal.tsx com setTimeout para focus
**When** o modal é fechado antes do timeout
**Then** `clearTimeout` cancela via cleanup do useEffect

**Given** code-block.tsx com setTimeout para reset de ícone
**When** o componente é desmontado antes do timeout
**Then** timeout cancelado, zero warnings de state update em unmounted component

**Given** PlayerLobby.tsx
**When** verificado para setTimeout sem cleanup
**Then** todos os setTimeout encontrados são corrigidos ou documentados

---

### Story 0.5: Remover eslint-disable e tipar corretamente

As a **developer**,
I want to remove unnecessary `eslint-disable` comments and replace `any` types,
So that o linter detecta bugs reais e type safety é enforced.

**FRs/NFRs:** TD4, TD8
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** broadcast.ts com 4 eslint-disable para `no-unused-vars`
**When** variáveis descartadas são renomeadas com prefixo `_`
**Then** 4 eslint-disable removidos sem mudança funcional

**Given** oracle-ai/route.ts com `any` em response parsing
**When** interfaces `GeminiStreamChunk`, `GeminiCandidate` são criadas
**Then** parsing usa type narrowing, zero `any` no arquivo

**Given** generate-srd-bundles.ts com 3 `no-explicit-any`
**When** interfaces `SrdMonsterRaw`, `SrdSpellRaw` são criadas
**Then** 3 eslint-disable removidos, script gera bundles idênticos

---

## Epic 1: Combat Core Improvements

Resolver os 3 problemas mais críticos de combate: impossibilidade de adicionar combatentes mid-combat, falta de display names para anti-metagaming, e jogadores atrasados não conseguem entrar.

### Story 1.1: Adicionar combatente mid-combat

As a **DM**,
I want to add new monsters or players to an encounter already in progress,
So that I can improvise freely — reinforcements arrive, NPCs join, players arrive late.

**FRs/NFRs:** FR42, FR12
**UX-DRs:** UX-DR16
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** o DM está em combate ativo (`is_active === true`)
**When** a interface é renderizada
**Then** botão "Adicionar Combatente" é visível na toolbar (verde construtivo)

**Given** o DM clica "Adicionar Combatente"
**When** o formulário abre
**Then** campos: Nome, HP, AC, DC (opcional), Initiative (obrigatório, editável)
**And** DM pode buscar monstros SRD ou preencher custom

**Given** o DM submete com initiative = 15
**When** o combatente é adicionado
**Then** inserido na posição correta da ordem de iniciativa
**And** `current_turn_index` ajustado se inserido antes do turno atual

**Given** novo combatente adicionado
**When** store atualizado (optimistic)
**Then** broadcast `combat:combatant_add` sanitizado para players
**And** `persistNewCombatant` salva no DB

---

### Story 1.2: Display name customizável para monstros

As a **DM**,
I want to set a custom display name for monsters visible to players,
So that players cannot metagame by recognizing monster names.

**FRs/NFRs:** FR43, NFR33
**UX-DRs:** UX-DR17
**Dependências:** Inclui migration 012 (display_name column + sanitize trigger)

**Acceptance Criteria:**

**Given** migration executada
**When** coluna `display_name` adicionada a `combatants`
**Then** `TEXT NULL DEFAULT NULL` + trigger `trg_sanitize_display_name` (strip HTML, max 40 chars)

**Given** DM adiciona "Beholder" com display_name "Criatura Misteriosa"
**When** lista de combate renderizada na DM view
**Then** DM vê: "Beholder (Criatura Misteriosa)"

**Given** combatente com display_name definido
**When** broadcast para players
**Then** `sanitizePayload` substitui `name` por `display_name` no payload
**And** nome real NUNCA enviado para players

**Given** DM insere `<script>alert('xss')</script>` como display_name
**When** salvo no banco
**Then** trigger de sanitização remove tags HTML/JavaScript

---

### Story 1.3: Late-join — jogador entra em sessão ativa

As a **player arriving late**,
I want to join an already-active combat session and enter my initiative,
So that the DM can add me without restarting the encounter.

**FRs/NFRs:** FR47
**UX-DRs:** UX-DR19
**Dependências:** Story 1.1 (mid-combat add)

**Acceptance Criteria:**

**Given** jogador acessa link de sessão com `is_active === true`
**When** PlayerLobby renderiza
**Then** formulário com campos: Nome, HP, AC, Initiative + mensagem "Combate em andamento"

**Given** jogador submete formulário
**When** enviado
**Then** broadcast `session:player_join_request` com `{ player_name, hp, ac, initiative }`
**And** jogador vê "Aguardando aprovação do mestre..."

**Given** DM recebe notificação de late-join
**When** visualiza a notificação
**Then** vê nome + initiative + botões [Aceitar] (verde) e [Rejeitar] (vermelho)

**Given** DM clica [Aceitar]
**When** processado
**Then** combatente inserido via mid-combat add (Story 1.1)
**And** jogador transiciona para PlayerInitiativeBoard

**Given** DM clica [Rejeitar]
**When** processado
**Then** jogador vê "O mestre não aceitou sua entrada" e pode tentar novamente

---

## Epic 2: Monster Grouping & Initiative

Facilitar combates com muitos monstros do mesmo tipo, agrupando-os sob uma única entrada de iniciativa com HP individual.

### Story 2.1: UI de agrupamento de monstros

As a **DM**,
I want to add multiple monsters as a named group with one action,
So that adding 5 Goblins takes one action instead of five.

**FRs/NFRs:** FR44
**UX-DRs:** UX-DR18
**Dependências:** Inclui migration 012 (monster_group_id, group_order columns)

**Acceptance Criteria:**

**Given** DM seleciona monstro no MonsterSearchPanel
**When** monstro selecionado
**Then** campo "Quantidade" (1-20, default: 1) aparece ao lado de "Adicionar"

**Given** DM seleciona "Goblin" com Quantidade = 3
**When** clica "Adicionar"
**Then** 3 combatentes criados com mesmo `monster_group_id`, nomes "Goblin 1/2/3"
**And** header de grupo renderizado: "Goblins (3)" com chevron

**Given** Quantidade = 1
**When** DM adiciona
**Then** comportamento V1 preservado (sem agrupamento)

---

### Story 2.2: HP individual dentro do grupo

As a **DM**,
I want each monster in a group to maintain its own HP independently,
So that I can damage and defeat monsters individually.

**FRs/NFRs:** FR45
**Dependências:** Story 2.1

**Acceptance Criteria:**

**Given** grupo de 3 Goblins (7/7 HP cada)
**When** DM aplica 3 de dano ao Goblin 2
**Then** Goblin 2 = 4/7 HP; Goblin 1 e 3 permanecem 7/7

**Given** DM marca Goblin 2 como derrotado
**When** processado
**Then** Goblin 2 visual de derrotado; 1 e 3 permanecem ativos
**And** header atualiza para "Goblins (2/3 ativos)"

**Given** todos os membros derrotados
**When** último membro marcado
**Then** grupo inteiro visual de derrotado, skip no turn advance

---

### Story 2.3: Expandir/colapsar grupos

As a **DM**,
I want to expand and collapse monster groups in the combat list,
So that I see a compact overview and expand when needed.

**FRs/NFRs:** FR46
**Dependências:** Story 2.1

**Acceptance Criteria:**

**Given** grupo renderizado pela primeira vez
**When** lista exibida
**Then** grupo aparece colapsado: header "Goblins (3)" com chevron

**Given** DM clica no chevron/header
**When** grupo expandido
**Then** membros individuais visíveis com HpAdjuster; animação 150-200ms

**Given** navegação via teclado
**When** focus no header
**Then** Enter/Space toggle; `aria-expanded` atualizado

**Given** estado de expand/collapse
**When** armazenado
**Then** client-side Zustand only (não DB, não broadcast)

---

### Story 2.4: Roll coletivo de iniciativa

As a **DM**,
I want a monster group to roll a single initiative for all members,
So that grouped monsters act on the same turn.

**FRs/NFRs:** FR44
**Dependências:** Story 2.1

**Acceptance Criteria:**

**Given** grupo de 3 Goblins no setup
**When** DM clica "Rolar Iniciativa" ou roll no header
**Then** 1 d20 + DEX mod aplicado a todos os 3 membros

**Given** DM edita initiative do Goblin 2 para 18 (grupo = 14)
**When** override aplicado
**Then** Goblin 2 se separa na ordem mas mantém `monster_group_id`

**Given** "Roll All NPCs" com 3 Goblins + 2 Esqueletos + 1 Dragão
**When** executado
**Then** 3 rolls (1 por grupo + 1 individual), não 6

---

## Epic 3: Player Experience Upgrade

Tornar a experiência do jogador conectado engajadora e fluida. Notificações de turno, auto-join, role selection, vinculação de personagens.

### Story 3.1: Notificação "Você é o próximo"

As a **player**,
I want a visual notification when it is one turn before my turn,
So that I can prepare my action and keep combat flowing.

**FRs/NFRs:** FR48, NFR31
**UX-DRs:** UX-DR20
**Dependências:** Nenhuma

**Acceptance Criteria:**

**Given** DM avança turno e broadcast inclui `next_combatant_id`
**When** `next_combatant_id` = jogador
**Then** banner "Você é o próximo!" em ≤200ms (NFR31)
**And** `aria-live="polite"`, estilo amber/gold

**Given** próximo combatente é monstro
**When** DM avança turno
**Then** nenhuma notificação para nenhum jogador

---

### Story 3.2: Notificação "É sua vez!"

As a **player**,
I want a prominent notification when it is my turn,
So that I know immediately when to act.

**FRs/NFRs:** FR49, NFR31
**UX-DRs:** UX-DR20
**Dependências:** Story 3.1

**Acceptance Criteria:**

**Given** `current_turn_index` = combatant do jogador
**When** broadcast recebido
**Then** banner "É sua vez!" com pulse animation + background amber
**And** `navigator.vibrate([200])` se disponível
**And** `aria-live="assertive"`, persiste durante o turno

**Given** turno avança para outro combatente
**When** broadcast recebido
**Then** banner removido, background retorna ao normal (transição 200ms)

---

### Story 3.3: Player auto-join (jogador cadastrado)

As a **registered player**,
I want my character to load automatically when I enter a session linked to my campaign,
So that I can join instantly without re-entering stats.

**FRs/NFRs:** FR51b
**UX-DRs:** UX-DR21
**Dependências:** Story 4.3 (campaign invites — jogador vinculado à campanha)

**Acceptance Criteria:**

**Given** jogador vinculado à campanha acessa `/join/[token]`
**When** sistema detecta `player_character` na campanha
**Then** dados pré-preenchidos (nome, HP, AC, DC), formulário editável, botão "Confirmar e Entrar"

**Given** jogador confirma auto-join
**When** combate em andamento
**Then** inserido como late-join (FR47) com prompt de iniciativa

**Given** Supabase Presence ativo
**When** jogador entra
**Then** `channel.track({ userId, characterName, status: 'online' })`
**And** DM vê indicador de presença atualizado

---

### Story 3.4: Seleção de role no cadastro

As a **new user**,
I want to select my role (Player, DM, or Both) during signup,
So that the app adapts to how I use it.

**FRs/NFRs:** FR50
**UX-DRs:** UX-DR26
**Dependências:** Migration 013 (users.role column)

**Acceptance Criteria:**

**Given** novo usuário completa email/senha
**When** signup processado
**Then** step adicional: cards "Jogador" / "Mestre" / "Ambos" (default: Ambos)

**Given** role selecionado
**When** salvo
**Then** `users.role` = `'player'|'dm'|'both'`, dashboard adapta layout

**Given** role = 'dm'
**When** acessa dashboard
**Then** foco em campanhas criadas, encounter builder, onboarding wizard (FR40)

---

### Story 3.5: DM vincula jogador temporário a character da campanha

As a **DM**,
I want to link a temporary QR-joined player to a campaign character,
So that their stats load from the campaign and the link persists.

**FRs/NFRs:** FR56
**UX-DRs:** UX-DR29
**Dependências:** Campanhas existentes com player_characters

**Acceptance Criteria:**

**Given** jogador entra via QR code
**When** DM visualiza o jogador
**Then** dropdown "Vincular a personagem:" lista PCs não vinculados da campanha

**Given** DM seleciona personagem
**When** confirmado
**Then** stats do player_character carregam para o combatant
**And** `combatants.player_character_id` salvo

**Given** jogador cria conta posteriormente
**When** cadastro processado
**Then** vinculação persiste (auto-join em futuras sessões)

---

## Epic 4: Session & Campaign Management

Experiência completa para o mestre Pro: notas privadas, compartilhamento de arquivos, convites por email, CR calculator e homebrew.

### Story 4.1: Notas privadas do GM

As a **DM**,
I want to write and save private notes during a session,
So that I can track information without players seeing it.

**FRs/NFRs:** FR52
**UX-DRs:** UX-DR22
**Dependências:** Migration 008 (session_notes table)

**Acceptance Criteria:**

**Given** DM em sessão ativa clica "Notas"
**When** painel abre
**Then** textarea com auto-save (debounce 1s), indicador "Salvo", Markdown support

**Given** notas salvas
**When** jogadores conectados
**Then** notas NUNCA broadcast, NUNCA na player view, RLS: `auth.uid() = owner_id`

**Given** DM fecha e reabre sessão
**When** abre painel
**Then** notas carregadas da tabela `session_notes`

---

### Story 4.2: Compartilhar arquivos na sessão

As a **DM**,
I want to upload and share images/PDFs with players,
So that I can share maps and handouts in real-time.

**FRs/NFRs:** FR53, NFR32
**UX-DRs:** UX-DR23
**Dependências:** Migration 009, Supabase Storage bucket

**Acceptance Criteria:**

**Given** DM clica "Compartilhar Arquivo"
**When** file picker abre
**Then** aceita: PNG, JPEG, WebP, PDF. Max: 10MB

**Given** arquivo válido selecionado
**When** upload completo
**Then** salvo em Supabase Storage `session-files/{session_id}/`
**And** broadcast `session:file_shared`, jogadores veem card com download

**Given** arquivo inválido (tipo ou tamanho)
**When** selecionado
**Then** validação client + server (magic bytes) rejeita com mensagem

---

### Story 4.3: Convite de jogador via email

As a **DM**,
I want to invite a player to my campaign by email,
So that they can create account and have character auto-linked.

**FRs/NFRs:** FR54, NFR30
**UX-DRs:** UX-DR25
**Dependências:** Migration 010, Novu workflow

**Acceptance Criteria:**

**Given** DM na gestão de campanha clica "Convidar"
**When** email inserido e enviado
**Then** `campaign_invites` criado (token, expires_at = +7d), email via Novu

**Given** DM já enviou 20 convites hoje
**When** tenta o 21o
**Then** bloqueado: "Limite de 20 convites por dia atingido" (NFR30)

**Given** 7 dias sem aceite
**When** token verificado
**Then** status = 'expired', link não funciona

---

### Story 4.4: Auto-link personagem ao aceitar convite

As a **invited player**,
I want my character auto-linked to the campaign after signup via invite,
So that I'm ready to join sessions without additional setup.

**FRs/NFRs:** FR55
**Dependências:** Story 4.3

**Acceptance Criteria:**

**Given** jogador clica link `/auth/sign-up?invite={token}&campaign={id}`
**When** signup completo
**Then** redirecionado para wizard "Criar Personagem", auto-vinculado à campanha

**Given** jogador já tem conta
**When** loga via link de convite
**Then** opção: "Criar novo personagem" ou "Vincular existente"

---

### Story 4.5: CR Calculator automático

As a **DM**,
I want an automatic CR calculator during encounter setup,
So that I can assess encounter difficulty for my party.

**FRs/NFRs:** FR62
**UX-DRs:** UX-DR27
**Dependências:** Nenhuma (client-side)

**Acceptance Criteria:**

**Given** DM configurando encontro com monstros adicionados
**When** party level e player count definidos
**Then** badge: "Fácil" (verde) / "Médio" (amarelo) / "Difícil" (laranja) / "Mortal" (vermelho)

**Given** ruleset 2014
**When** calculado
**Then** fórmula DMG 2014 (XP thresholds + multiplicador de grupo)

**Given** ruleset 2024
**When** calculado
**Then** fórmula DMG 2024 (CR budget)

**Given** monstros adicionados/removidos
**When** lista muda
**Then** recalcula em ≤50ms (client-side, sem server)

---

### Story 4.6: Homebrew — criar conteúdo customizado

As a **DM (Pro)**,
I want to create custom monsters, spells, and items,
So that I can use homebrew content in sessions alongside SRD.

**FRs/NFRs:** FR63
**UX-DRs:** UX-DR28
**Dependências:** Migration 011, Feature flag `homebrew`

**Acceptance Criteria:**

**Given** DM Pro no Compendium clica "Criar Homebrew"
**When** formulário renderizado
**Then** três abas: Monstro (stat block), Magia (description), Item (properties)

**Given** homebrew salvo
**When** DM usa search (Fuse.js)
**Then** aparece nos resultados com badge "Homebrew" (roxa), scoped ao usuário

**Given** DM Free tenta acessar
**When** clica "Criar Homebrew"
**Then** `ProGate` exibe `ProBadge` com lock + upsell contextual

---

## Epic 5: Freemium Feature Gating

Implementar modelo de monetização sem degradar tier gratuito. Feature flags, indicadores Pro, upsell contextual, trial 14 dias, modelo Mesa, integração Stripe.

### Story 5.1: Sistema de feature flags

As a **developer / admin**,
I want a feature flag system via Supabase table with client cache,
So that Pro features can be gated and rolled back without redeploy.

**FRs/NFRs:** NFR29
**Dependências:** Migration 007

**Acceptance Criteria:**

**Given** migration 007 aplicada
**When** schema verificado
**Then** tabela `feature_flags` com seed: persistent_campaigns, saved_presets, export_data, homebrew, session_analytics, cr_calculator, file_sharing, email_invites

**Given** `useFeatureGate('homebrew')` chamado
**When** user plan = 'free'
**Then** retorna `{ allowed: false }`
**When** user plan = 'pro' ou 'mesa'
**Then** retorna `{ allowed: true }`

**Given** admin toggle flag
**When** DB atualizado
**Then** clients refletem em ≤5min (cache TTL)

---

### Story 5.2: Indicadores visuais Pro

As a **Free user**,
I want to see which features are Pro via lock icon + tooltip,
So that I understand what requires upgrade.

**FRs/NFRs:** FR57, FR61
**UX-DRs:** UX-DR24
**Dependências:** Story 5.1

**Acceptance Criteria:**

**Given** feature gated como Pro
**When** user Free encontra
**Then** `ProBadge` (lock icon + "Pro" + tooltip "Disponível no plano Pro")

**Given** `ProGate` wraps feature
**When** user Pro
**Then** children renderizados normalmente
**When** user Free
**Then** `ProBadge` renderizado no lugar

---

### Story 5.3: Upsell contextual

As a **Free user**,
I want a contextual upsell when I try to use a Pro feature,
So that I understand the value without random popups.

**FRs/NFRs:** FR58
**Dependências:** Story 5.2

**Acceptance Criteria:**

**Given** Free user clica ProBadge
**When** ação interceptada
**Then** modal `UpsellCard` com feature name, CTA "Iniciar Trial" / "Ver Planos"
**And** max 1x por sessão por feature (sessionStorage)
**And** NUNCA popup aleatório

---

### Story 5.4: Trial grátis (14 dias)

As a **Free DM**,
I want a 14-day free trial of Pro features,
So that I can evaluate before subscribing.

**FRs/NFRs:** FR59
**Dependências:** Migration 006 (subscriptions table), Story 5.1

**Acceptance Criteria:**

**Given** DM Free que nunca usou trial
**When** ativa trial
**Then** `subscriptions: plan='pro', status='trialing', trial_ends_at=now+14d`
**And** todas features Pro desbloqueadas, banner "Trial Pro: X dias"

**Given** trial expirou
**When** DM acessa app
**Then** status = 'canceled', features Pro bloqueadas, dados PRESERVADOS (read-only)

**Given** Trigger.dev cron detecta trial expirando em 2 dias
**When** executado
**Then** email via Novu `trial-expiring`

---

### Story 5.5: Modelo "Mesa"

As a **DM Pro**,
I want connected players to inherit Pro features during my session,
So that the entire table benefits from one subscription.

**FRs/NFRs:** FR60, NFR34
**Dependências:** Story 5.1, Story 5.4 ou 5.6

**Acceptance Criteria:**

**Given** DM Pro inicia sessão
**When** sessão criada
**Then** `sessions.dm_plan = 'pro'`; jogadores herdam features Pro via RLS

**Given** assinatura DM expira mid-session
**When** webhook processa
**Then** `dm_plan` na session atual mantido (graceful degradation — NFR34)
**And** features Pro continuam até fim da sessão

**Given** sessão encerrada, nova sessão iniciada
**When** DM agora Free
**Then** `dm_plan = 'free'`, features Pro não disponíveis

---

### Story 5.6: Integração Stripe

As a **DM**,
I want to subscribe via secure payment,
So that I can unlock Pro with monthly or annual plan.

**FRs/NFRs:** Infraestrutura
**Dependências:** Story 5.4 (subscriptions table)

**Acceptance Criteria:**

**Given** DM clica "Assinar Pro"
**When** Checkout session criada
**Then** redirect para Stripe Checkout. Preços: R$14,90/mês ou R$119,90/ano

**Given** pagamento completo
**When** webhook `checkout.session.completed`
**Then** `subscriptions: status='active'`, features Pro desbloqueadas

**Given** webhook `customer.subscription.deleted`
**When** processado
**Then** `status='canceled'`, features Pro bloqueadas (graceful se em sessão)

---

### Story 5.7: Painel de assinatura

As a **DM**,
I want to view and manage my subscription in settings,
So that I can see my plan, renewal date, and upgrade/cancel.

**FRs/NFRs:** Complemento UX
**Dependências:** Story 5.6

**Acceptance Criteria:**

**Given** DM acessa Settings → "Plano"
**When** página carrega
**Then** exibe plano atual, data renovação (se Pro), dias restantes (se Trial), CTA upgrade (se Free)

**Given** DM Pro clica "Gerenciar Assinatura"
**When** processado
**Then** redirect para Stripe Customer Portal

---

## Epic 6: Audio & Ambiance (Backlog V2+)

Jogadores podem disparar efeitos sonoros temáticos durante seus turnos. Áudio reproduzido no PC do DM via Supabase Realtime broadcast.

### Story 6.1: Efeitos sonoros por turno

As a **player**,
I want sound effect buttons during my turn,
So that I can add atmosphere to my combat actions.

**FRs/NFRs:** —
**Dependências:** Epic 3 (turn notifications), Epic 5 V1 (Realtime)

**Acceptance Criteria:**

**Given** player view durante turno ativo
**When** jogador visualiza controles
**Then** barra de botões de som: melee, magia, ambiente, dramático
**And** fora do turno: botões desabilitados

---

### Story 6.2: Audio lock (1 jogador por vez)

As a **DM**,
I want only the current turn player to trigger sounds,
So that there's no audio chaos.

**FRs/NFRs:** —
**Dependências:** Story 6.1

**Acceptance Criteria:**

**Given** combate ativo com múltiplos jogadores
**When** DM avança turno
**Then** lock transferido automaticamente para novo jogador ativo

---

### Story 6.3: Áudio remoto (som no PC do DM)

As a **player**,
I want the sound I trigger to play on the DM's PC,
So that the whole table hears it.

**FRs/NFRs:** —
**Dependências:** Story 6.1, Supabase Realtime

**Acceptance Criteria:**

**Given** jogador ativo pressiona botão de som
**When** disparado
**Then** broadcast `audio:play` com `sound_id`; DM client reproduz
**And** sons pré-carregados em IndexedDB (<100ms latência)

---

### Story 6.4: Biblioteca de sons pré-construída

As a **DM**,
I want a curated combat sound library,
So that players have quality options without uploading.

**FRs/NFRs:** —
**Dependências:** Story 6.3

**Acceptance Criteria:**

**Given** biblioteca de sons
**When** visualizada
**Then** categorias: Melee, Magia, Ambiente, Dramático. Licença: CC0.

---

## Epic 7: Battle Scenes & Maps (Backlog V3+)

DM pode selecionar cenas temáticas, gerar cenários via IA, aplicar efeitos visuais e usar presets combinados.

### Story 7.1: Compêndio de cenas temáticas

As a **DM**,
I want to select a thematic background from a curated library,
So that the player view shows a visual scene.

**FRs/NFRs:** —
**Dependências:** Epic 5 V1 (Realtime player view)

**Acceptance Criteria:**

**Given** DM abre seletor de cenas
**When** seleciona uma cena
**Then** player view exibe background via broadcast. Transição fade 300ms.

---

### Story 7.2: Geração de cena por IA

As a **DM**,
I want to generate scenes with AI from a text prompt,
So that I have unique backgrounds without depending on a fixed library.

**FRs/NFRs:** —
**Dependências:** Story 7.1, API de geração (Gemini/DALL-E)

**Acceptance Criteria:**

**Given** DM clica "Gerar Cena" e insere prompt
**When** imagem gerada
**Then** preview exibido. DM pode aceitar, regenerar ou cancelar.
**And** imagem otimizada (WebP, ≤500KB) antes de broadcast.

---

### Story 7.3: Efeitos visuais cinematográficos

As a **DM**,
I want to apply animated visual effects over scenes,
So that dramatic moments have visual impact.

**FRs/NFRs:** —
**Dependências:** Story 7.1

**Acceptance Criteria:**

**Given** cena ativa na player view
**When** DM seleciona efeito
**Then** overlay animado: chuva, neve, névoa, relâmpago, fogo, aura mágica
**And** respeita `prefers-reduced-motion`

---

### Story 7.4: Presets de cena com música + efeitos

As a **DM**,
I want bundled presets combining background + music + effects,
So that I can set the scene with one click.

**FRs/NFRs:** —
**Dependências:** Story 7.1, 7.3, Epic 6

**Acceptance Criteria:**

**Given** DM seleciona preset
**When** aplicado
**Then** background + música + efeitos ativados na player view
**And** DM pode desativar componentes individuais

---

## Epic 8: Hardware Kit (Backlog V5)

Pesquisa e prototipagem de kit hardware para projetar cenas na mesa física.

### Story 8.1: Pesquisa de especificação do kit

As a **product team**,
I want a complete hardware spec,
So that we have validated BOM and target cost.

**FRs/NFRs:** —
**Dependências:** Epic 7

**Acceptance Criteria:**

**Given** necessidade de projetar cenas na mesa
**When** pesquisa concluída
**Then** spec define: projetor, cabos, suporte. Custo ≤R$2.000.

---

### Story 8.2: Integração app ↔ projetor

As a **DM**,
I want the selected scene projected on the physical table,
So that players see the map directly on the playing surface.

**FRs/NFRs:** —
**Dependências:** Story 8.1, Epic 7

**Acceptance Criteria:**

**Given** app rodando com projetor conectado
**When** DM seleciona cena
**Then** projetada via segunda tela / casting WiFi. Atualiza em tempo real.

---

### Story 8.3: Pesquisa de modelo de negócio

As a **product team**,
I want validated go-to-market strategy for the hardware kit,
So that we have a viable business model.

**FRs/NFRs:** —
**Dependências:** Story 8.1, 8.2

**Acceptance Criteria:**

**Given** necessidade de definir pricing
**When** pesquisa concluída
**Then** comparação: venda avulsa vs kit+Pro bundled vs lease
**And** unit economics e timeline de viabilidade

---

## Dependências entre Stories

```
Epic 0 (Sprint 1):
  Story 0.1 ─── independente
  Story 0.2 ─── independente
  Story 0.3 ─── independente
  Story 0.4 ─── independente
  Story 0.5 ─── após 0.2

Epic 1 (Sprint 1):
  Story 1.1 ─── independente (base para 1.3)
  Story 1.2 ─── independente (inclui migration 012)
  Story 1.3 ─── após 1.1

Epic 2 (Sprint 2):
  Story 2.1 ─── independente (inclui migration 012 columns)
  Story 2.2 ─── após 2.1
  Story 2.3 ─── após 2.1
  Story 2.4 ─── após 2.1

Epic 3 (Sprint 2):
  Story 3.1 ─── independente
  Story 3.2 ─── após 3.1
  Story 3.3 ─── após 4.3 (campaign invites)
  Story 3.4 ─── independente (migration 013)
  Story 3.5 ─── independente

Epic 4 (Sprint 3):
  Story 4.1 ─── independente (migration 008)
  Story 4.2 ─── independente (migration 009 + Storage)
  Story 4.3 ─── independente (migration 010 + Novu)
  Story 4.4 ─── após 4.3
  Story 4.5 ─── independente (client-side)
  Story 4.6 ─── independente (migration 011)

Epic 5 (Sprint 3, paralelo com Epic 4):
  Story 5.1 ─── independente (migration 007, base para 5.2-5.7)
  Story 5.2 ─── após 5.1
  Story 5.3 ─── após 5.2
  Story 5.4 ─── após 5.1 (migration 006)
  Story 5.5 ─── após 5.1
  Story 5.6 ─── independente (Stripe account)
  Story 5.7 ─── após 5.6
```

## Sequência de Migrations

```
Migration 006: subscriptions table
Migration 007: feature_flags table + seed
Migration 008: session_notes table
Migration 009: session_files table
Migration 010: campaign_invites table
Migration 011: homebrew_monsters/spells/items tables
Migration 012: combatants V2 columns (display_name, monster_group_id, group_order)
Migration 013: users.role column + subscription_id
Migration 014: rate_limits table + check_rate_limit RPC
Migration 015: sanitize_display_name trigger
Migration 016: RLS V2 policies para novas tabelas
```

## Sprint Planning

| Sprint | Épics | Duração | Stories |
|--------|-------|---------|---------|
| Sprint 1 | Epic 0 + Epic 1 | 5 dias | 8 stories |
| Sprint 2 | Epic 2 + Epic 3 | 5 dias | 9 stories |
| Sprint 3 | Epic 4 + Epic 5 | 10 dias | 13 stories |
| **Total** | **Epics 0-5** | **20 dias (~4 semanas)** | **30 stories** |
| Sprint 4 | Epic 10 | 7 dias | 7 stories |
| Backlog V2+ | Epic 6 | ~7-10 dias | 4 stories |
| Backlog V3+ | Epic 7 | ~15-20 dias | 4 stories |
| Backlog V5 | Epic 8 | TBD | 3 stories |

---

> **Para acceptance criteria detalhados (Given/When/Then completos) de cada story, consulte:**
> - Epics 0-2: `_bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md`
> - Epics 3-5: `_bmad-output/planning-artifacts/epics-v2-stories.md`
