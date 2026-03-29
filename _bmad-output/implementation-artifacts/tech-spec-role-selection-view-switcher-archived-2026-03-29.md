---
title: 'Role Selection no Signup e View Switcher'
slug: 'role-selection-view-switcher'
created: '2026-03-29'
status: 'done'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
tech_stack: ['Next.js', 'React 19', 'Zustand', 'Supabase', 'next-intl', 'Tailwind CSS']
files_to_modify:
  - 'components/sign-up-form.tsx'
  - 'components/layout/RoleSwitcher.tsx'
  - 'lib/stores/role-store.ts'
  - 'app/app/layout.tsx'
  - 'app/auth/confirm/route.ts'
  - 'app/app/dashboard/page.tsx'
  - 'components/settings/SettingsClient.tsx'
  - 'messages/pt-BR.json'
  - 'messages/en.json'
code_patterns: ['Zustand stores (lib/stores/)', 'next-intl translations', 'Supabase RLS', 'Radix UI components']
test_patterns: ['Vitest for unit tests', 'Playwright for e2e']
---

# Tech-Spec: Role Selection no Signup e View Switcher

**Created:** 2026-03-29

## Overview

### Problem Statement

Atualmente a conta do Pocket DM não diferencia entre Mestre e Jogador no momento do cadastro. O onboarding de role é uma etapa separada e opcional (page `/app/onboarding/role`), e não existe mecanismo para o usuário trocar entre as visões de Mestre e Jogador na área logada.

### Solution

1. Integrar a seleção de papel (Player/DM/Both) diretamente no formulário de cadastro
2. Persistir o role no banco via URL param na confirmação de email
3. Adicionar botão de troca de visão (RoleSwitcher) na navbar para usuários "both"
4. Adaptar o dashboard e navegação com base no `activeView`
5. Permitir alteração do role nas Configurações

### Scope

**In Scope:**
- Seleção de role no signup form (3 cards: Jogador/Mestre/Ambos)
- Zustand store para role + activeView com persistência em localStorage
- RoleSwitcher pill na navbar (apenas para role "both")
- Dashboard adaptation: esconder/mostrar conteúdo baseado na view ativa
- Settings: seção para alterar role
- i18n (pt-BR e en)

**Out of Scope:**
- Alteração de RLS policies (role é UI personalization only, não autorização)
- Criação de player dashboard separado (será personalizado, mas mesmo componente)
- Monetização ou feature flags baseadas em role

## Context for Development

### Codebase Patterns

- **Zustand stores** em `lib/stores/` — padrão: `create<State>((set, get) => ({...}))` com `loadX()`, `reset()`
- **i18n** via `next-intl` — namespace por feature (ex: `signup`, `dashboard`, `settings`)
- **Supabase client**: server-side em `lib/supabase/server.ts`, client-side em `lib/supabase/client.ts`
- **UI components**: Radix UI + Tailwind, cores gold/emerald, animações `duration-[250ms]`
- **Anti-pattern da spec original**: NÃO esconder features por role, apenas reordenar/deprioritizar

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/auth/RoleSelectionCards.tsx` | Componente existente de seleção de role (onboarding) |
| `lib/stores/subscription-store.ts` | Padrão de Zustand store com loadX/reset |
| `components/settings/SettingsClient.tsx` | Settings page - adicionar seção de role |
| `app/app/dashboard/page.tsx` | Dashboard - adaptar com base em activeView |
| `app/app/layout.tsx` | App layout - navbar com RoleSwitcher |
| `components/layout/Navbar.tsx` | Navbar base component |
| `supabase/migrations/022_users_role.sql` | Migration existente da coluna role |

### Technical Decisions

1. **Role no signup form** (não etapa separada) — reduz fricção no cadastro
2. **Zustand + localStorage** para activeView — evita round-trip ao banco para preferência de UI
3. **RoleSwitcher como pill-button** — minimal, toggle inline na navbar
4. **Anti-pattern**: role NÃO é autorização, é personalização de UI

## Implementation Plan

### Tasks

#### Task 1: Role Store (Zustand) ✅ DONE
- Criar `lib/stores/role-store.ts`
- State: `role`, `activeView`, `loading`, `initialized`
- Actions: `loadRole()`, `toggleView()`, `setActiveView()`, `updateRole()`, `reset()`
- localStorage persistence para `activeView` (key: `pocketdm:activeView`)

#### Task 2: Signup Form — Role Selection ✅ DONE
- Adicionar 3 cards (Jogador/Mestre/Ambos) no `sign-up-form.tsx`
- Default: "Ambos"
- Passar `role` como param na URL de redirect para confirmação

#### Task 3: Confirm Route — Save Role ✅ DONE
- `app/auth/confirm/route.ts`: ler param `role` e salvar no banco após auth
- Redirect para `/app/onboarding` (não mais `/app/onboarding/role`)

#### Task 4: RoleSwitcher na Navbar ✅ DONE
- `components/layout/RoleSwitcher.tsx`: pill-toggle DM/Player
- Integrado no `rightSlot` do navbar via `app/app/layout.tsx`

#### Task 5: Dashboard Adaptation ✅ DONE
- `app/app/dashboard/page.tsx`: passar role para client component
- Criar `DashboardClient` wrapper que usa `useRoleStore`
- Player view: esconder "Nova Sessão" button e presets, mostrar campanhas com foco em personagens
- DM view: layout atual (campaigns, encounters, presets)

#### Task 6: Settings — Role Change ✅ DONE
- `components/settings/SettingsClient.tsx`: adicionar seção "Papel" na tab Preferences
- Usar mesmo visual dos 3 cards do RoleSelectionCards
- Save via `useRoleStore().updateRole()`

#### Task 7: i18n Completo ✅ DONE
- Chaves `role_switcher.*` adicionadas
- Chaves para settings role section adicionadas (`role_player_desc`, `role_dm_desc`, `role_both_desc`)

### Acceptance Criteria

**AC1 — Signup Role Selection**
- Given: usuário está no formulário de cadastro
- When: seleciona "Mestre" e cria conta
- Then: após confirmar email, `users.role` = 'dm'

**AC2 — Default Both**
- Given: usuário não altera a seleção de role no cadastro
- When: cria conta
- Then: `users.role` = 'both' (default)

**AC3 — View Switcher**
- Given: usuário logado com role = 'both'
- When: clica no RoleSwitcher na navbar
- Then: alterna entre visão "Mestre" e "Jogador"

**AC4 — View Persistence**
- Given: usuário com role 'both' selecionou visão "Jogador"
- When: recarrega a página
- Then: visão continua como "Jogador" (localStorage)

**AC5 — Dashboard Adaptation**
- Given: usuário com activeView = 'player'
- When: acessa o dashboard
- Then: não vê botão "Nova Sessão" e seção de presets

**AC6 — Settings Role Change**
- Given: usuário nas configurações
- When: altera role de 'both' para 'player'
- Then: `users.role` atualizado; RoleSwitcher desaparece da navbar

**AC7 — Single Role Users**
- Given: usuário com role = 'dm'
- When: acessa a área logada
- Then: RoleSwitcher NÃO aparece; vê sempre visão de DM

## Additional Context

### Dependencies

- Zustand 5 (já instalado)
- Migration `022_users_role.sql` (já aplicada)
- `next-intl` (já configurado)

### Testing Strategy

- **Unit**: `role-store` — load, toggle, persist
- **Integration**: signup form submits role; confirm route saves
- **E2E**: fluxo completo signup → confirm → dashboard com role correto

### Notes

- A página `/app/onboarding/role` continua existindo como fallback para usuários que não passaram pelo novo signup
- Role é estritamente UI personalization — RLS policies não mudam
