---
status: 'ready-for-dev'
createdAt: '2026-03-30'
updatedAt: '2026-03-30'
epic: 11
title: 'Onboarding Guiado — Área Logada do Mestre'
inputDocuments:
  - docs/sprint-plan-2026-03-30.md
  - docs/epics-and-sprints-spec.md
  - docs/epic-campaign-dual-role.md
  - _bmad-output/planning-artifacts/epic-9-guided-onboarding.md
  - _bmad-output/implementation-artifacts/2-1-first-time-dm-onboarding-flow.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
competitiveAnalysis: 'MasterApp RPG (screenshots em qa-evidence/)'
version: '2.0'
codeReviewDate: '2026-03-30'
---

# Epic 11: Onboarding Guiado — Área Logada do Mestre (v2)

> **v2 changelog:** Spec reescrita após análise completa de código do Dashboard v2 e OnboardingWizard implementados. Incorpora issues de usabilidade, UX e a11y identificadas na revisão. Stories agora refletem o estado real do código, não suposições.

## Resumo

Experiência de onboarding completa para o mestre (DM) na área logada, cobrindo 4 cenários de entrada: registro fresh, transição guest→logado, retorno sem campanha, e user existente no Dashboard v2. Inclui tracking de estado, welcome screen contextual, humanização do wizard existente, tour guiado do Dashboard v2 (reusando infra do Epic 9), e CTAs de transição inteligentes.

**Filosofia de produto:**
> "Simplificar pro momento da mesa. Só o que é relevante no momento de adrenalina."
> O mercado de RPG digital é poluído. Pocket DM se diferencia pela **simplicidade radical**.

**Problema atual (validado por code review):**
1. O DM registra e cai num wizard que pede "Campaign name" sem contexto emocional
2. O wizard tem 6 steps (choose → campaign → players → encounter → confirm → done) — copy funcional mas frio
3. Se veio do guest combat, o `GuestDataImportModal` aparece no dashboard mas é desconectado do wizard
4. Após criar a campanha, aterrissa num dashboard sem tour/orientação
5. Empty state do dashboard mostra "Waiting for invite" mesmo para DMs (bug de UX — `DashboardOverview.tsx:168-186`)
6. Quick Actions usa `campaigns[0]` como fallback para "Invite Player" — arbitrário (`DashboardOverview.tsx:142`)
7. Estado do wizard perdido em refresh (sem persistência)
8. Falha parcial no submit não tem rollback (5 ops sequenciais sem transação)

**Solução:** Onboarding em camadas — tracking → welcome contextual → wizard humanizado → tour do dashboard → CTA de ação — com correção dos bugs de UX identificados.

**Dependências externas:** Dashboard v2 com sidebar (commit `18258ab` — **IMPLEMENTADO**)
**Componentes reusáveis:** `useTourStore`, `TourOverlay`, `TourProvider`, `TourTooltip`, `TourProgress` (Epic 9)
**Componentes a refatorar:** `OnboardingWizard.tsx`, `GuestDataImportModal.tsx`, `DashboardOverview.tsx`, `DashboardSidebar.tsx`

---

## Análise de Código — Issues Identificadas

> Estas issues foram encontradas na revisão de código e devem ser resolvidas dentro das stories deste épico ou como pré-requisitos.

### Violações de Design System

| # | Issue | Arquivo | Regra Violada | Story |
|---|-------|---------|---------------|-------|
| D1 | "View all" hardcoded em inglês | `DashboardOverview.tsx:200` | i18n obrigatório | 11.0 |
| D2 | "Pocket DM" hardcoded na sidebar | `DashboardSidebar.tsx:69` | i18n obrigatório | 11.0 |
| D3 | aria-labels "Dashboard navigation" hardcoded | `DashboardSidebar.tsx:88,129` | i18n a11y | 11.0 |
| D4 | `text-[10px]` no mobile bottom nav | `DashboardSidebar.tsx` | Min 16px (NFR23), min 44px tap | 11.0 |
| D5 | `bg-[#1a1a2e]` na sidebar | `DashboardSidebar.tsx` | Background token é `#13131e` | 11.0 |
| D6 | Zero `data-testid` em todos os componentes | Todos | Testabilidade E2E | 11.0 |
| D7 | Zero `data-tour-id` | Todos dashboard | Bloqueante pro tour | 11.4 |
| D8 | Sem glow hover nos cards | `CampaignCard`, `CombatHistoryCard` | box-shadow gold-glow no hover | 11.0 |
| D9 | Sem Cinzel nos headings de seção | `DashboardOverview.tsx` | Typography system: headings display | 11.0 |

### Problemas de Usabilidade

| # | Issue | Impacto | Story |
|---|-------|---------|-------|
| U1 | Quick Combat aparece em 3 lugares (QuickActions, Recent Combats, bottom card) | Confusão do DM | 11.0 |
| U2 | "New Session" escondido quando DM tem 0 campanhas owned | Contradição com empty state CTA | 11.0 |
| U3 | "Invite Player" navega pra `/campaigns` ao invés de ação direta | Expectativa frustrada | — |
| U4 | CampaignCard sem indicador de status (ativa/inativa) | DM não sabe estado | — |
| U5 | Truncation sem tooltip em nomes longos | Info perdida | 11.0 |
| U6 | Sem skeleton/loading nos client components | Flash of empty | 11.0 |
| U7 | SoundboardPageClient sem loading state (dynamic SSR:false) | Tela vazia enquanto carrega | 11.0 |
| U8 | OnboardingWizard exige HP/AC obrigatório | Contradiz "só nome obrigatório" | 11.3 |
| U9 | Empty state "Waiting for invite" aparece pra DMs | Bug — DM nunca espera invite | 11.0 |

### Problemas de Acessibilidade

| # | Issue | WCAG | Story |
|---|-------|------|-------|
| A1 | `aria-live` ausente em formulários (OnboardingWizard) | 4.1.3 | 11.3 |
| A2 | Cor como único indicador DM/Player (amber vs emerald) | 1.4.1 | 11.0 |
| A3 | Mobile nav font 10px | 1.4.4 | 11.0 |
| A4 | Focus states não explícitos nos nav links | 2.4.7 | 11.0 |
| A5 | Sem `role="alert"` nos erros de CampaignManager | 4.1.3 | — |

---

## Cenários de Entrada do Mestre

| Cenário | ID | Estado do User | Comportamento Esperado |
|---------|-----|----------------|------------------------|
| Registro fresh | `fresh` | Novo user, 0 campanhas, sem dados guest | Welcome → Wizard → Tour Dashboard → CTA |
| Guest → Registro | `guest_combat` | Novo user, 0 campanhas, COM dados guest | Welcome "Seu combate foi salvo!" → Wizard com pré-populate → Tour → CTA "Voltar ao combate" |
| Retorno sem campanha | `returning_no_campaign` | User existente, 0 campanhas, wizard_completed=false | Welcome "Que bom que voltou!" → Wizard → Tour → CTA |
| User existente, Dashboard v2 | `existing_new_dashboard` | User com campanhas, dashboard_tour_completed=false | Tour one-time do Dashboard → CTA |

---

## Story 11.0: Dashboard Polish Pré-Onboarding (Prerequisite)

**Status:** ready-for-dev

As a **DM using the dashboard**,
I need the existing UI issues fixed,
so that the onboarding tour guides me through a polished interface.

**Dependências:** Nenhuma (pode rodar em paralelo com Story 11.1)
**Esforço estimado:** 4h

### Acceptance Criteria

**AC 11.0.1** — i18n fixes
- "View all" em `DashboardOverview.tsx:200` → chave i18n `dashboard.view_all`
- "Pocket DM" em `DashboardSidebar.tsx:69` → pode manter hardcoded (é brand)
- "Dashboard navigation" em `DashboardSidebar.tsx:88,129` → chave i18n `sidebar.nav_label`

**AC 11.0.2** — Acessibilidade mobile
- Font do mobile bottom nav: `text-[10px]` → `text-xs` (12px mínimo para labels de ícone)
- Touch targets no mobile nav: garantir `min-h-[44px]` em cada nav item
- Focus ring explícito nos nav links: `focus-visible:ring-2 focus-visible:ring-amber-400/50`

**AC 11.0.3** — Visual consistency
- Background sidebar: `bg-[#1a1a2e]` → `bg-background` (usa token CSS, resolve pra `#13131e`)
- Cards hover glow: adicionar `hover:shadow-[0_0_15px_rgba(212,168,83,0.15)]` em CampaignCard e CombatHistoryCard
- Seção DM title: adicionar ícone ⚔️ antes do texto (não depender só de cor)
- Seção Player title: adicionar ícone 🎭 antes do texto (acessibilidade 1.4.1)

**AC 11.0.4** — Empty state fix
- `DashboardOverview.tsx:168-186`: empty state "Waiting for invite" só aparece se `userRole === 'player'`
- Para DMs sem campanhas: mostrar "Crie sua primeira mesa!" com CTA pro onboarding

**AC 11.0.5** — Loading states
- Adicionar skeleton loaders nas seções de campaigns e combats (while data loads)
- SoundboardPageClient: adicionar `<Suspense>` com fallback skeleton

**AC 11.0.6** — data-testid attributes
- Adicionar `data-testid` nos elementos chave de cada componente:
  - `DashboardSidebar`: `data-testid="sidebar"`, `data-testid="bottom-nav"`, `data-testid="nav-{key}"`
  - `DashboardOverview`: `data-testid="dashboard-overview"`, `data-testid="quick-actions"`, `data-testid="dm-campaigns"`, `data-testid="player-campaigns"`
  - `QuickActions`: `data-testid="quick-action-{key}"`
  - `CampaignCard`: `data-testid="campaign-card-{id}"`
  - `CombatHistoryCard`: `data-testid="combat-card-{id}"`

### Dev Notes

- Esta story é prerequisite pro tour funcionar direito — um tour guiando o DM por uma UI com bugs de i18n e acessibilidade seria embaraçoso
- NÃO adicionar `data-tour-id` aqui — isso é na Story 11.4 (mantém separação de responsabilidade)
- Quick Combat duplicação (U1): NÃO resolver agora — é decisão de produto que precisa de mais análise
- CampaignCard sem status (U4): NÃO resolver agora — requer mudança de schema

---

## Story 11.1: Tracking de Estado de Onboarding

**Status:** ready-for-dev

As a **system**,
I need to track each user's onboarding progress,
so that I can deliver the right experience at the right time without repeating steps.

**Dependências:** Nenhuma
**Esforço estimado:** 4h

### Acceptance Criteria

**AC 11.1.1** — Tabela `user_onboarding`
**Given** um novo user se registra via qualquer método (Google OAuth, email)
**When** o registro é confirmado no Supabase Auth
**Then** um registro é criado em `user_onboarding` com:
- `user_id` = auth.uid()
- `source` = valor detectado ('fresh' | 'guest_combat' | 'guest_browse')
- `wizard_completed` = false
- `dashboard_tour_completed` = false

**AC 11.1.2** — Detecção de origem
**Given** um user clica em "Criar conta" a partir do guest combat (`/try`) — via `GuestUpsellModal` ou `GuestBanner`
**When** o fluxo de registro é iniciado
**Then** o URL de registro inclui `?from=guest-combat`
**And** o valor `source` em `user_onboarding` é salvo como `'guest_combat'`

**Given** um user clica em "Criar conta" a partir da landing page
**When** o fluxo de registro é iniciado
**Then** o `source` é salvo como `'fresh'`

**AC 11.1.3** — RLS policies
**Given** um user autenticado
**When** ele consulta `user_onboarding`
**Then** ele só vê/edita seu próprio registro (`user_id = auth.uid()`)

**AC 11.1.4** — Redirect inteligente
**Given** um DM logado acessa `/app/dashboard`
**When** ele tem 0 campanhas E `wizard_completed = false`
**Then** redireciona para `/app/onboarding`

**Given** um DM logado acessa `/app/dashboard`
**When** ele tem campanhas E `dashboard_tour_completed = false`
**Then** o dashboard carrega normalmente MAS passa flag `showDashboardTour: true` pro client

### Tasks / Subtasks

- [ ] **Task 1: Criar migration SQL**
  - [ ] `supabase/migrations/0XX_user_onboarding.sql`
  ```sql
  CREATE TABLE user_onboarding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'fresh'
      CHECK (source IN ('fresh', 'guest_combat', 'guest_browse')),
    wizard_completed BOOLEAN NOT NULL DEFAULT false,
    wizard_step TEXT DEFAULT NULL,
    dashboard_tour_completed BOOLEAN NOT NULL DEFAULT false,
    guest_data_migrated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users read own onboarding" ON user_onboarding
    FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "Users update own onboarding" ON user_onboarding
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Users insert own onboarding" ON user_onboarding
    FOR INSERT WITH CHECK (user_id = auth.uid());
  ```

- [ ] **Task 2: Trigger de auto-create**
  ```sql
  CREATE OR REPLACE FUNCTION create_user_onboarding()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO user_onboarding (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_onboarding();
  ```

- [ ] **Task 3: Backfill users existentes**
  ```sql
  -- Users com campanhas: wizard done, tour pending
  INSERT INTO user_onboarding (user_id, source, wizard_completed, dashboard_tour_completed)
  SELECT u.id, 'fresh', true, false FROM auth.users u
  WHERE EXISTS (SELECT 1 FROM campaigns c WHERE c.owner_id = u.id)
  ON CONFLICT DO NOTHING;

  -- Users sem campanhas: wizard e tour pending
  INSERT INTO user_onboarding (user_id, source, wizard_completed, dashboard_tour_completed)
  SELECT u.id, 'fresh', false, false FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.owner_id = u.id)
  ON CONFLICT DO NOTHING;
  ```

- [ ] **Task 4: Propagar `source` via URL params**
  - `GuestUpsellModal.tsx`: links de registro incluem `?from=guest-combat`
  - `GuestBanner.tsx`: botão Google inclui `?from=guest-combat`
  - `app/page.tsx` (landing): CTAs incluem `?from=landing`
  - `app/auth/callback/route.ts`: ler `from` param e UPDATE `user_onboarding.source`

- [ ] **Task 5: Atualizar redirect logic em `app/app/dashboard/page.tsx`**
  - Buscar `user_onboarding` após auth check
  - Se `wizard_completed=false` + 0 campanhas → redirect `/app/onboarding`
  - Passar `showDashboardTour: !dashboard_tour_completed` como prop
  - Em `app/app/onboarding/page.tsx`: buscar `user_onboarding.source` e passar como prop

- [ ] **Task 6: Tipos TypeScript em `lib/types/database.ts`**
  ```typescript
  export interface UserOnboarding {
    user_id: string;
    source: 'fresh' | 'guest_combat' | 'guest_browse';
    wizard_completed: boolean;
    wizard_step: string | null;
    dashboard_tour_completed: boolean;
    guest_data_migrated: boolean;
    created_at: string;
    updated_at: string;
  }
  ```

### Dev Notes

- Tabela `users` já tem coluna `role` (migration `022_users_role.sql`) — NÃO colocar tracking de onboarding lá
- O campo `wizard_step` armazena JSON do estado do wizard para retomar (Story 11.3)
- Backfill: users existentes com campanhas recebem `wizard_completed=true` mas `dashboard_tour_completed=false`

---

## Story 11.2: Welcome Screen Contextual

**Status:** ready-for-dev

As a **newly registered DM**,
I want a personalized welcome message before the wizard starts,
so that I feel welcomed and understand what's about to happen.

**Dependências:** Story 11.1
**Esforço estimado:** 3h

### Acceptance Criteria

**AC 11.2.1** — Welcome screen como primeiro step
**Given** um DM acessa `/app/onboarding`
**When** a página carrega
**Then** o primeiro step é uma welcome screen (antes do step "choose" atual)

**AC 11.2.2** — Variação por cenário

| source | Headline | Subtitle | CTA |
|--------|----------|----------|-----|
| `fresh` | "Bem-vindo ao Pocket DM!" | "Vamos montar sua primeira mesa de RPG em menos de 1 minuto." | "Começar" |
| `guest_combat` | "Seu combate foi salvo!" | "Agora vamos organizar sua mesa pra ficar tudo no lugar." + preview card | "Organizar minha mesa" |
| retorno | "Que bom que voltou!" | "Vamos continuar montando sua mesa?" | "Continuar" |

**AC 11.2.3** — Guest preview card
**Given** `source = 'guest_combat'` e existe guest data em sessionStorage/localStorage
**Then** welcome mostra card com: contagem de combatentes + rodada do combate guest

**AC 11.2.4** — Responsivo + i18n
- Mobile: layout single-column, CTA full-width, min-h-[44px]
- Todos os textos em namespace `onboarding_welcome.*`
- pt-BR + en

### Tasks / Subtasks

- [ ] **Task 1: Criar `WelcomeScreen.tsx`**
  - Path: `components/dashboard/WelcomeScreen.tsx`
  - Props: `{ source, guestPreview?, onContinue }`
  - 3 variações de copy baseadas em `source`
  - Pixel art ícone: `/art/icons/mvp-crown.png` (já existe)
  - Fade-in com Framer Motion
  - Botão gold: `<Button variant="gold">`

- [ ] **Task 2: Integrar no OnboardingWizard**
  - Adicionar step `"welcome"` no `WizardStep` type (antes de `"choose"`)
  - `OnboardingWizard` recebe nova prop `source`
  - State inicial: `step: "welcome"`
  - CTA da welcome → avança pra `"choose"` (ou direto step 1 se `source=guest_combat`)

- [ ] **Task 3: Guest preview data**
  - No `OnboardingWizard` (client): ler `getGuestEncounterData()` + `getGuestCombatSnapshot()`
  - Montar `guestPreview: { combatantCount, roundNumber }`
  - Se guest data existe mas `source !== 'guest_combat'`: tratar como guest_combat

- [ ] **Task 4: Chaves i18n** — namespace `onboarding_welcome` em pt-BR e en

- [ ] **Task 5: Testes unitários** — `WelcomeScreen.test.tsx`
  - Renderiza variação fresh / guest_combat / returning
  - Chama onContinue ao clicar CTA
  - Guest preview mostra contagem

### Dev Notes

- O `OnboardingWizard.tsx` hoje tem `WizardStep = "choose" | 1 | 2 | 3 | 4 | "done"`. Adicionar `"welcome"` como primeiro.
- Ícones pixel art existentes: `/art/icons/mvp-crown.png`, `/art/icons/carta.png`, `/art/icons/team-chibi-1.png`, `/art/icons/potion.png`
- Se `source=guest_combat`: pular step "choose" (já sabe que vai criar campanha com dados do guest)
- NÃO adicionar confetti aqui (peso). Flash dourado com Framer Motion basta.

---

## Story 11.3: Wizard Humanizado

**Status:** ready-for-dev

As a **new DM going through the onboarding wizard**,
I want contextual copy and smart pre-population,
so that the experience feels personal and fast.

**Dependências:** Story 11.1, Story 11.2
**Esforço estimado:** 5h

### Acceptance Criteria

**AC 11.3.1** — Copy contextual nos steps

| Step | source=fresh | source=guest_combat |
|------|-------------|---------------------|
| Campaign name | "Como se chama a sua mesa?" placeholder "Ex: Mesa de Sexta" | "Dê um nome pra sua mesa" pré-preenchido "Minha campanha" |
| Players | "Quem joga com você? Só o nome basta." | PCs do guest pré-populados |
| Encounter | Comportamento atual | Nome do encounter guest pré-preenchido |

**AC 11.3.2** — Jogadores: só nome obrigatório
**Given** o wizard no step de jogadores
**Then** apenas "Nome" é required
**And** HP default=10, AC default=10, Spell DC opcional
**And** hint: "Você pode completar depois na gestão de campanha"

> **Nota de code review:** O wizard atual EXIGE HP e AC. Validação em `OnboardingWizard.tsx` verifica `max_hp >= 1` e `ac >= 1`. Precisa mudar pra defaults automáticos.

**AC 11.3.3** — Pré-popular do guest data
**Given** `source = 'guest_combat'` e existem PCs no guest data (combatentes sem `monster_id`)
**Then** PCs aparecem pré-populados na lista de jogadores
**And** monstros NÃO são pré-populados

**AC 11.3.4** — Celebração no done
**Given** o wizard finaliza com sucesso
**Then** flash dourado (`bg-gold/10` fade) + ícone check
**And** texto "Mesa criada com sucesso!"
**And** link `/join/[token]` + botão copiar (já existe)
**And** botão primário "Ir pro Dashboard"
**And** botão secundário "Voltar ao combate" (se source=guest_combat)

**AC 11.3.5** — Marcar wizard_completed
**Given** wizard finalizado com sucesso
**Then** UPDATE `user_onboarding SET wizard_completed=true, wizard_step=null`

**AC 11.3.6** — Persistência de progresso
**Given** DM está no step 2 e fecha a aba
**When** retorna a `/app/onboarding`
**Then** wizard retoma do step 2 com dados preenchidos
**Implementação:** Salvar em sessionStorage (rápido) + sync pra `wizard_step` no banco a cada step change (debounce 1s)

**AC 11.3.7** — Acessibilidade
**Given** wizard tem erro de validação
**Then** mensagem tem `role="alert"` e `aria-live="polite"`
**And** input inválido tem `aria-invalid="true"` (já existe) e `aria-describedby` apontando pro erro

### Tasks / Subtasks

- [ ] **Task 1: Tornar HP/AC opcionais com defaults**
  - Remover validação `max_hp >= 1` e `ac >= 1` do step players
  - Setar defaults: HP=10, AC=10 quando vazio
  - Adicionar hint i18n: `onboarding.players_hint`

- [ ] **Task 2: Copy contextual por source**
  - Receber prop `source` no OnboardingWizard
  - Labels e placeholders condicionais via chaves i18n separadas
  - Pré-preencher `campaignName` com "Minha campanha" se guest_combat

- [ ] **Task 3: Pré-popular jogadores do guest**
  - Ler `getGuestEncounterData()` / `getGuestCombatSnapshot()`
  - Filtrar: só combatentes SEM `monster_id` (são PCs manuais)
  - Mapear pra `PlayerInput[]`

- [ ] **Task 4: Celebração e CTAs no done**
  - Flash dourado com `motion.div` fade
  - Botão "Ir pro Dashboard" (primário)
  - Botão "Voltar ao combate" se guest (navega pro encounter importado)

- [ ] **Task 5: Persistência de progresso**
  - sessionStorage como cache local
  - UPDATE `wizard_step` no banco a cada step change (debounce)
  - No mount: restaurar de sessionStorage primeiro, fallback pro banco

- [ ] **Task 6: Acessibilidade**
  - Adicionar `role="alert"` e `aria-live="polite"` nos containers de erro
  - Adicionar `aria-describedby` nos inputs inválidos

- [ ] **Task 7: Atualizar `wizard_completed`**
  - Após campanha criada: UPDATE user_onboarding

- [ ] **Task 8: Atualizar testes**
  - Testes existentes (15) + novos:
  - Copy contextual por source
  - Pré-populate de guest data
  - HP/AC opcionais
  - Celebração após submit
  - Acessibilidade (role="alert")

### Dev Notes

- O `OnboardingWizard.tsx` tem 758 linhas. Refatorar com cuidado — muita lógica condicional existente.
- `newPlayer()` usa counter `_playerIdCounter` — frágil mas funciona. Não refatorar sem necessidade.
- O step "choose" faz sentido manter: "Quick Combat ou Campanha?" é uma escolha real. MAS se `source=guest_combat`, pular direto pro step 1.
- A celebração NÃO precisa de lib de confetti. Flash dourado com Framer Motion suficiente.
- `GuestDataImportModal` continuará existindo como fallback para quem pula o onboarding.

---

## Story 11.4: Tour Guiado do Dashboard v2

**Status:** ready-for-dev

As a **DM who just completed the wizard** (or existing user seeing Dashboard v2 for the first time),
I want a guided tour that shows me where everything is,
so that I navigate confidently.

**Dependências:** Story 11.0 (polish), Story 11.1 (tracking)
**Esforço estimado:** 6h

### Acceptance Criteria

**AC 11.4.1** — Auto-start após wizard
**Given** DM completou wizard → redirect `/app/dashboard?from=wizard`
**When** dashboard carrega
**Then** tour inicia após 800ms

**AC 11.4.2** — Auto-start para users existentes (one-time)
**Given** DM existente com campanhas, `dashboard_tour_completed=false`
**When** acessa `/app/dashboard`
**Then** tour inicia após 1200ms
**And** welcome step diz "Renovamos sua área!"

**AC 11.4.3** — 7 steps do tour

| # | ID | Alvo (data-tour-id) | Pos desktop | Pos mobile | Título |
|---|-----|---------------------|-------------|------------|--------|
| 0 | dash-welcome | `dash-overview` | modal | modal | "Sua central de comando!" |
| 1 | dash-sidebar | `dash-sidebar` (desktop) / `dash-bottom-nav` (mobile) | right | top | "Navegação rápida" |
| 2 | dash-quick-actions | `dash-quick-actions` | bottom | bottom | "Ações rápidas" |
| 3 | dash-campaigns | `dash-campaigns` | bottom | bottom | "Suas mesas" |
| 4 | dash-combats | `dash-nav-combats` | right | top | "Histórico de combates" |
| 5 | dash-soundboard | `dash-nav-soundboard` | right | top | "Ambientação sonora" |
| 6 | dash-complete | `dash-new-session` | bottom | bottom | "Pronto pra jogar!" |

**AC 11.4.4** — Não repete
**Given** tour completado ou pulado
**Then** `dashboard_tour_completed = true` no banco
**And** tour NUNCA reinicia automaticamente

**AC 11.4.5** — Pulável
- "Pular" button em cada step
- ESC encerra
- Ambos marcam `dashboard_tour_completed = true`

**AC 11.4.6** — Responsivo
- Steps de sidebar usam `mobileSelector` pra bottom nav
- Tooltip: top/bottom only no mobile (nunca left/right)
- Width: `min(340px, viewport - 32px)`

**AC 11.4.7** — Store separado do guest tour
- localStorage key: `"dashboard-tour-v1"` (separado de `"guided-tour-v1"`)

### Tasks / Subtasks

- [ ] **Task 1: Adicionar `data-tour-id` nos componentes dashboard**
  - `DashboardOverview.tsx`:
    - Container: `data-tour-id="dash-overview"`
    - Quick Actions section: `data-tour-id="dash-quick-actions"`
    - DM campaigns section: `data-tour-id="dash-campaigns"`
    - "New Session" button: `data-tour-id="dash-new-session"`
  - `DashboardSidebar.tsx`:
    - Sidebar desktop: `data-tour-id="dash-sidebar"`
    - Bottom nav mobile: `data-tour-id="dash-bottom-nav"`
    - Nav item combats: `data-tour-id="dash-nav-combats"`
    - Nav item soundboard: `data-tour-id="dash-nav-soundboard"`

- [ ] **Task 2: Criar `dashboard-tour-steps.ts`**
  - Path: `components/tour/dashboard-tour-steps.ts`
  - 7 steps com `id`, `selector`, `mobileSelector?`, `position`, `mobilePosition?`, `titleKey`, `descriptionKey`, `isModal?`

- [ ] **Task 3: Criar `useDashboardTourStore`**
  - Path: `lib/stores/dashboard-tour-store.ts`
  - Clonar estrutura de `tour-store.ts`
  - Storage key: `"dashboard-tour-v1"`
  - Actions: startTour, goToStep, skipTour, completeTour, resetTour

- [ ] **Task 4: Criar `DashboardTourProvider.tsx`**
  - Path: `components/tour/DashboardTourProvider.tsx`
  - Props: `shouldAutoStart`, `delayMs`, `source`, `importedEncounterId?`
  - Mais simples que TourProvider do guest — sem auto-interactions, sem phase transitions
  - Reusar `TourOverlay` e `TourTooltip` existentes
  - Mobile detection: viewport < 768px → usa `mobileSelector`/`mobilePosition`
  - No complete/skip: UPDATE `user_onboarding.dashboard_tour_completed = true`

- [ ] **Task 5: Integrar no layout do dashboard**
  - `app/app/dashboard/layout.tsx`: buscar `dashboard_tour_completed` no server
  - `DashboardLayout.tsx`: renderizar `<DashboardTourProvider>` condicionalmente
  - Detectar `?from=wizard` URL param pra delay de 800ms (vs 1200ms)

- [ ] **Task 6: Chaves i18n** — namespace `dashboard_tour` (16 chaves pt-BR + en)

- [ ] **Task 7: Testes**
  - `dashboard-tour-steps.test.ts`: IDs únicos, fields obrigatórios, mobileSelector em dash-sidebar
  - `dashboard-tour-store.test.ts`: state inicial, startTour, completeTour, skipTour
  - `DashboardTourProvider.test.tsx`: auto-start, não inicia se completed, ESC encerra

### Dev Notes

- **NÃO reusar o TourProvider do guest inteiro** — ele tem lógica específica (auto-fill search, click first result, snapshot combatants). O DashboardTourProvider é step-by-step simples.
- **TourOverlay e TourTooltip SÃO reusáveis** — mesma UI visual, diferente orquestração.
- O DashboardSidebar renderiza sidebar (`hidden lg:flex`) e bottom nav (`lg:hidden`) como elementos separados. O tour detecta qual está visível via `window.matchMedia('(min-width: 1024px)')`.
- O step `dash-campaigns` pode não ter conteúdo se DM acabou de criar 1 campanha — o tour deve funcionar mesmo com 1 card.

---

## Story 11.5: CTA Final + Transição Inteligente

**Status:** ready-for-dev

As a **DM who completed the onboarding**,
I want a clear next-step action,
so that I know exactly what to do.

**Dependências:** Story 11.4
**Esforço estimado:** 3h

### Acceptance Criteria

**AC 11.5.1** — CTA contextual no step final

| source | CTA Primário | CTA Secundário |
|--------|-------------|----------------|
| `fresh` | "Iniciar primeiro combate" → `/app/session/new` | "Explorar o dashboard" → fecha tour |
| `guest_combat` | "Voltar ao combate" → `/app/session/{id}` | "Explorar o dashboard" → fecha tour |
| `existing_new_dashboard` | "Entendi!" → fecha tour | — |

**AC 11.5.2** — Analytics
- `trackEvent('onboarding:tour_completed', { source, cta_clicked, steps_viewed })`
- `trackEvent('onboarding:tour_skipped', { source, skipped_at_step })`

**AC 11.5.3** — Empty state de combates melhorado
**Given** DM completou onboarding e está no dashboard
**When** 0 combates salvos
**Then** seção de combates mostra ícone pixel art + "Nenhum combate ainda" + CTA "Novo Combate"

### Tasks / Subtasks

- [ ] **Task 1: CTAs contextuais no tooltip do step final**
  - Renderizar botões dentro do tooltip do step `dash-complete`
  - Navegar baseado em `source` e `importedEncounterId`

- [ ] **Task 2: Propagar `importedEncounterId`**
  - No `GuestDataImportModal.handleImport()`: salvar `session_id` em sessionStorage `'imported-encounter-id'`
  - No DashboardTourProvider: ler e limpar após uso

- [ ] **Task 3: Analytics**
  - `trackEvent` em completeTour e skipTour

- [ ] **Task 4: Empty state de combates**
  - Em `DashboardOverview.tsx`: se 0 encounters, mostrar empty state com CTA
  - Consistente com estilo pixel art existente

- [ ] **Task 5: Testes**
  - CTA correto por source
  - trackEvent chamado com dados corretos
  - Empty state renderiza

### Dev Notes

- `importedEncounterId` é `session_id` (não encounter id) — redirect pra `/app/session/{id}`
- `trackEvent` já existe em `lib/analytics/track.ts`
- Empty state de combates: referenciar estilo do empty state existente (pixel art cat)

---

## Resumo do Épico

| Story | Título | Deps | Esforço | Foco |
|-------|--------|------|---------|------|
| 11.0 | Dashboard Polish (prerequisite) | — | 4h | i18n, a11y, visual fixes |
| 11.1 | Tracking de onboarding | — | 4h | Schema, triggers, redirects |
| 11.2 | Welcome Screen | 11.1 | 3h | UX emocional, 3 variações |
| 11.3 | Wizard humanizado | 11.1, 11.2 | 5h | Copy, pré-populate, a11y |
| 11.4 | Tour Dashboard v2 | 11.0, 11.1 | 6h | 7 steps, tour infra |
| 11.5 | CTA + transição | 11.4 | 3h | CTAs, analytics, empty states |
| **Total** | | | **25h** | |

### Grafo de Dependências

```
Story 11.0 (Polish) ─────────────────────┐
Story 11.1 (Tracking) ──┬──────────────────┤
                         │                  │
                         ├─→ Story 11.2 ──→ Story 11.3
                         │   (Welcome)      (Wizard)
                         │
                         └─→ Story 11.4 ──→ Story 11.5
                             (Tour)         (CTA)
```

**Paralelo 1:** Stories 11.0 e 11.1 podem rodar simultaneamente
**Paralelo 2:** Após 11.1, as trilhas 11.2→11.3 e 11.4→11.5 podem ser paralelas
**Caminho crítico:** 11.1 → 11.4 → 11.5 (13h)

### Componentes Novos

| Componente | Tipo | Story |
|------------|------|-------|
| `supabase/migrations/0XX_user_onboarding.sql` | Migration | 11.1 |
| `components/dashboard/WelcomeScreen.tsx` | Client Component | 11.2 |
| `components/tour/dashboard-tour-steps.ts` | Config | 11.4 |
| `lib/stores/dashboard-tour-store.ts` | Zustand Store | 11.4 |
| `components/tour/DashboardTourProvider.tsx` | Client Component | 11.4 |

### Componentes Refatorados

| Componente | Mudança | Story |
|------------|---------|-------|
| `DashboardOverview.tsx` | i18n fix, data-tour-id, empty state DM, combats empty | 11.0, 11.4, 11.5 |
| `DashboardSidebar.tsx` | font fix, bg fix, data-tour-id | 11.0, 11.4 |
| `QuickActions.tsx` | data-tour-id | 11.4 |
| `OnboardingWizard.tsx` | +welcome step, +source, +copy contextual, +pré-populate, +a11y | 11.2, 11.3 |
| `DashboardLayout.tsx` | +DashboardTourProvider | 11.4 |
| `app/app/dashboard/layout.tsx` | +onboarding query | 11.4 |
| `app/app/dashboard/page.tsx` | +onboarding redirect update | 11.1 |
| `app/app/onboarding/page.tsx` | +source prop | 11.2 |
| `GuestUpsellModal.tsx` | +?from=guest-combat param | 11.1 |
| `GuestBanner.tsx` | +?from=guest-combat param | 11.1 |
| `GuestDataImportModal.tsx` | +save imported session_id | 11.5 |
| `lib/types/database.ts` | +UserOnboarding type | 11.1 |

### Chaves i18n Adicionadas

| Namespace | Keys | Story |
|-----------|------|-------|
| `onboarding_welcome` | 9 chaves | 11.2 |
| `onboarding` updates | 8 chaves | 11.3 |
| `dashboard_tour` | 16 chaves | 11.4 |
| `dashboard` updates | 4 chaves | 11.0, 11.5 |
| `sidebar` updates | 1 chave | 11.0 |

---

> **Criado:** 2026-03-30 — BMAD Party Mode
> **v2:** Reescrito após code review completo do Dashboard v2
> **Autor:** John (PM) + Winston (Architect) + Sally (UX) + Mary (Analyst) + Bob (SM)
> **Premissas:** docs/sprint-plan-2026-03-30.md (Filosofia de Produto), ux-design-specification.md
