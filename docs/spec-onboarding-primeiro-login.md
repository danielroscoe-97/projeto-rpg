# Spec: Onboarding Guiado — Primeiro Login (Conta Criada)

**Status**: Pronto para implementação
**Prioridade**: Alta — primeira impressão de usuários convertidos do `/try`
**Data**: 2026-04-03

---

## Contexto

O Pocket DM tem 3 entry points para novos usuários:

1. **Guest** (`/try`) — Tour guiado de combate, 13 steps, SEM conta (**corrigido em 2026-04-03**)
2. **Primeiro login** (`/app/onboarding` → `/app/dashboard`) — Wizard + Dashboard tour (**ESTE SPEC**)
3. **Player convidado** (`/join/[token]`) — Sem onboarding (entra direto na sessão)

O fluxo de primeiro login **já existe parcialmente** (wizard de 4 steps + dashboard tour de 7 steps), mas está fragmentado, com handoff frágil entre wizard e tour, e sem experiência coesa.

---

## Infraestrutura Existente

### O que JÁ funciona

| Componente | Arquivo | Status |
|-----------|---------|--------|
| DB schema `user_onboarding` | `supabase/migrations/046_user_onboarding.sql` | Funcional — tracks wizard_completed, wizard_step, dashboard_tour_completed, source |
| Wizard (4 steps) | `components/dashboard/OnboardingWizard.tsx` | Funcional com quirks — campaign name, player setup, encounter, launch |
| Welcome Screen | `components/dashboard/WelcomeScreen.tsx` | Funcional — adapta título por source (fresh/guest/returning) |
| Dashboard Tour (7 steps) | `components/tour/DashboardTourProvider.tsx` + `dashboard-tour-steps.ts` | Funcional — auto-trigger em first login |
| Tour Store | `lib/stores/dashboard-tour-store.ts` | Funcional — Zustand + localStorage + DB persist |
| Role Selection | `app/app/onboarding/role/page.tsx` | Funcional — DM/Player/Both |
| Dashboard Layout orchestration | `app/app/dashboard/layout.tsx` | Funcional — query user_onboarding, pass showDashboardTour |

### O que está QUEBRADO ou FALTANDO

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| **Handoff wizard→tour** | Alta | Wizard redireciona com `?from=wizard` mas o tour depende implicitamente desse param. Se o redirect falha ou o param se perde, tour não inicia. |
| **Quick Combat path pula tour** | Alta | Escolher "Quick Combat" no wizard marca `wizard_completed: true` e redireciona para `/app/session/new` — o dashboard tour NUNCA acontece. |
| **Schema mismatch** | Média | Type `OnboardingSource` define `'returning_no_campaign'` mas migration CHECK constraint não inclui esse valor. |
| **Sem re-trigger do tour** | Média | Se o usuário fecha o browser no meio do tour, não tem como reiniciar. O localStorage marca como completo no skip. |
| **Sem progress indicator** | Baixa | A tela de choice (wizard vs quick combat) não mostra onde o usuário está no fluxo geral. |
| **Wizard não é responsive** | Baixa | Steps do wizard não adaptam layout pra mobile. |
| **Sem role-specific content** | Baixa | Onboarding é o mesmo para DM e Player — deveria guiar de forma diferente. |

---

## Fluxo Proposto (Implementar)

### Visão Geral

```
Signup/Login
    ↓
[1] Role Selection (/app/onboarding/role)
    → DM | Player | Both
    ↓
[2] Welcome Screen (contextual)
    → Fresh user | Veio do /try (guest) | Returning
    ↓
[3] Choice: Quick Combat vs Campaign Setup
    ↓                        ↓
[3a] Quick Combat         [3b] Wizard (4 steps)
    → Session /new           → Campaign name
    → Tour in-session?       → Player char setup
                             → Encounter name
                             → Launch + share link
    ↓                        ↓
[4] Dashboard Tour (7 steps) ← AMBOS os paths devem chegar aqui
    → Sidebar nav
    → Quick Actions
    → Campaigns
    → Combats
    → Soundboard
    → Complete + CTA
    ↓
[5] Dashboard normal (onboarding_completed = true)
```

### Tasks para o Agente Implementador

#### Task 1 — Garantir que Quick Combat path chega ao Dashboard Tour

**Arquivo**: `components/dashboard/OnboardingWizard.tsx`
**O que fazer**:
- Na opção "Quick Combat", em vez de redirecionar direto para `/app/session/new`, redirecionar para `/app/dashboard?from=wizard&next=session`
- O dashboard detecta `from=wizard` → inicia o tour
- Após o tour completar, se `next=session` existe, redireciona para `/app/session/new`
- Alternativa mais simples: marcar `wizard_completed: true` mas NÃO marcar `dashboard_tour_completed: true`, e redirecionar para `/app/dashboard?from=wizard`

#### Task 2 — Tornar o handoff wizard→tour explícito

**Arquivos**: `app/app/dashboard/layout.tsx`, `components/tour/DashboardTourProvider.tsx`
**O que fazer**:
- No layout, quando `wizard_completed: true` E `dashboard_tour_completed: false`, SEMPRE iniciar o tour (não depender de query param)
- O `?from=wizard` passa a ser apenas um hint para a animação de entrada (skip delay)
- Remover dependência implícita do query param para trigger

#### Task 3 — Fix schema mismatch

**Arquivo**: Nova migration
**O que fazer**:
- Criar migration que adiciona `'returning_no_campaign'` ao CHECK constraint da coluna `source`
- Ou remover `'returning_no_campaign'` do tipo TypeScript se não é usado

#### Task 4 — Botão "Refazer Tour" no dashboard

**Arquivos**: `components/dashboard/DashboardOverview.tsx` ou `DashboardSidebar.tsx`
**O que fazer**:
- Adicionar botão discreto (ícone `?` ou "Refazer tour") no dashboard
- Ao clicar: `dashboardTourStore.getState().resetTour()` + atualizar DB `dashboard_tour_completed: false`
- Similar ao `TourHelpButton` que já existe no guest tour

#### Task 5 — Testar o fluxo completo com Playwright

**O que testar**:
1. Signup fresh → role selection → wizard completo → dashboard tour (7/7)
2. Signup fresh → role selection → quick combat → dashboard tour deve acontecer na volta ao dashboard
3. Signup via guest → guest data import oferecido → wizard → tour
4. Verificar mobile (390x844) em todo o fluxo
5. Verificar que `wizard_completed` e `dashboard_tour_completed` são persistidos no DB

---

## Referências Técnicas

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabase/migrations/046_user_onboarding.sql` | Schema + trigger + RLS |
| `lib/types/database.ts` | Types para OnboardingSource, UserOnboarding |
| `components/dashboard/OnboardingWizard.tsx` | Wizard de 4 steps (345 linhas) |
| `components/dashboard/WelcomeScreen.tsx` | Tela welcome contextual |
| `components/tour/DashboardTourProvider.tsx` | Tour provider do dashboard |
| `components/tour/dashboard-tour-steps.ts` | 7 steps do tour |
| `lib/stores/dashboard-tour-store.ts` | Zustand store + DB persist |
| `app/app/dashboard/layout.tsx` | Orchestration (query onboarding state) |
| `app/app/dashboard/page.tsx` | Redirect logic (non-DM → onboarding) |
| `app/app/onboarding/page.tsx` | Renders OnboardingWizard |
| `app/app/onboarding/role/page.tsx` | Role selection (DM/Player/Both) |

### Guest Tour (referência de qualidade)

O guest tour em `components/tour/TourProvider.tsx` + `tour-steps.ts` é o padrão de qualidade. O dashboard tour deve ter a mesma experiência:
- Overlay com spotlight no elemento target
- Tooltips posicionados com arrow
- Progress indicator (step X/Y)
- Phase badges (Preparação/Combate/Concluído)
- Mobile-aware positioning
- Confetti na conclusão
- ESC para pular, Back/Next navigation

### Regra de Parity (CLAUDE.md)

Verificar se o onboarding funciona para:
- **DM** (fluxo principal — criar campanha, encounter, session)
- **Player** (fluxo simplificado — aguardar convite, ver personagens)
- **Both** (combina os dois)
