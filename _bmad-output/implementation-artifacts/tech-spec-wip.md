---
title: 'Polimento Onboarding Mobile + Confirmação Limpar Tudo'
slug: 'onboarding-mobile-polish-clear-confirm'
created: '2026-03-29'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['Next.js', 'React 19', 'Zustand', 'next-intl', 'Tailwind CSS', 'Framer Motion']
files_to_modify:
  - 'components/srd/SrdLoadingScreen.tsx'
  - 'components/tour/TourTooltip.tsx'
  - 'components/tour/tour-steps.ts'
  - 'components/combat/CombatantSetupRow.tsx'
  - 'components/guest/GuestCombatClient.tsx'
  - 'messages/pt-BR.json'
  - 'messages/en.json'
code_patterns: ['Zustand stores', 'next-intl useTranslations', 'Tailwind responsive md:', 'Framer Motion', 'data-tour-id selectors']
test_patterns: ['Jest + React Testing Library']
---

# Tech-Spec: Polimento Onboarding Mobile + Confirmação Limpar Tudo

**Created:** 2026-03-29

## Overview

### Problem Statement

O fluxo de onboarding guiado no mobile apresenta 7 problemas de UX identificados em teste real:
1. Mensagens do loading screen se encavalando (rotação a cada 400ms, rápido demais)
2. Glow dourado no botão errado do welcome step (aparece no "Já sei como funciona" em vez do "Próximo")
3. Token do monstro não aparece no mobile na CombatantSetupRow
4. Falta hint anti-metagame no passo 4 do tour
5. Glow do passo 5 (import-hint) disposicionado — deveria ser "adição manual" primeiro
6. Add-row no mobile não tem seletor de tipo (player/NPC/monstro) funcional
7. Botão "Limpar Tudo" sem confirmação de segurança

Além disso, há um princípio transversal: **toda feature que existe no desktop DEVE funcionar no mobile e vice-versa**, respeitando boas práticas de cada plataforma (touch targets ≥44px, layout adaptado).

### Solution

Corrigir todos os 7 itens com mudanças cirúrgicas nos componentes existentes, mantendo paridade mobile/desktop.

### Scope

**In Scope:**
- Fix rotação de mensagens do SrdLoadingScreen (400ms → 1000ms)
- Fix styling do botão skip no welcome modal (remover aparência dourada, garantir focus ring neutro)
- Mostrar MonsterToken no mobile na CombatantSetupRow (tamanho compacto 24px)
- Adicionar texto anti-metagame dourado no passo 4 do tour (i18n)
- Reordenar steps 4-5: "add-row" antes de "import-hint"
- Adicionar seletor de tipo (role) na add-row do mobile
- Adicionar confirmação antes de "Limpar Tudo" (mobile + desktop)
- i18n para todas as novas strings

**Out of Scope:**
- Mudanças na lógica de combate em si
- Mudanças no tour da fase de combate (passos 7-11 estão OK)
- Mudanças no desktop que já funciona bem
- Testes E2E (gap conhecido no backlog)

## Context for Development

### Codebase Patterns

- **Responsive**: `md:` breakpoint (768px) separa mobile de desktop. Mobile-first no player view.
- **i18n**: Toda string via `useTranslations(namespace)`. Namespaces: `tour`, `combat`, `common`, `srd_loading`
- **Touch targets**: Mínimo 44px no mobile (`min-h-[44px] min-w-[44px]`)
- **Tour system**: Steps declarativos em `tour-steps.ts`, tooltip positioning em `TourTooltip.tsx`, auto-actions em `TourProvider.tsx`
- **Anti-metagame**: Feature core do produto — jogadores NUNCA veem dados numéricos de monstros. `display_name` + silhueta são o mecanismo visual.
- **Zustand stores**: Guest combat em `guest-combat-store.ts`
- **Confirmação pattern**: Projeto usa `window.confirm()` ou dialogs inline — para este caso, usar um alert dialog inline com Tailwind (coerente com o design dark mode)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/srd/SrdLoadingScreen.tsx` | Loading screen com mensagens rotativas |
| `components/tour/TourTooltip.tsx` | Tooltip do tour — modal + anchored rendering |
| `components/tour/tour-steps.ts` | Declaração dos steps do tour |
| `components/tour/TourProvider.tsx` | Orquestrador do tour (auto-actions) |
| `components/combat/CombatantSetupRow.tsx` | Linha de combatente no setup |
| `components/guest/GuestCombatClient.tsx` | Tela de combate guest (setup + combat) |
| `components/srd/MonsterToken.tsx` | Componente de token/avatar do monstro |
| `lib/types/combat.ts` | Tipos: Combatant, CombatantRole, COMBATANT_ROLE_CYCLE |
| `messages/pt-BR.json` | Traduções português |
| `messages/en.json` | Traduções inglês |
| `tailwind.config.ts` | Shadow `gold-glow`: `0 0 15px rgba(212, 168, 83, 0.4)` |

### Technical Decisions

- **MonsterToken no mobile**: Usar size 24px (compacto) em vez de 32px (desktop). Manter clicável para abrir stat block.
- **Role selector na add-row**: Reutilizar o padrão de `ROLE_CONFIG` + `COMBATANT_ROLE_CYCLE` já usado no CombatantSetupRow. No mobile, mostrar apenas o ícone (sem label text). Setar `combatant_role` ao adicionar via add-row.
- **Confirmação "Limpar Tudo"**: Usar state local `showClearConfirm` com banner inline (não modal/dialog). Banner com texto "Tem certeza?" + botões Confirmar (vermelho) e Cancelar. Padrão leve e coerente com o design.
- **Reordenação de steps**: Mover "add-row" (step 5) para antes de "import-hint" (step 4) no array `TOUR_STEPS`. Ajustar comments dos steps.
- **Anti-metagame hint**: Adicionar parágrafo extra no step `monster-added` (passo 4) via nova key i18n `tour.monster_added_antimetagame`. Renderizar em cor dourada abaixo da descrição principal.
- **Focus ring do skip button**: Adicionar `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30` para evitar glow dourado herdado.

## Implementation Plan

### Task 1: Fix rotação de mensagens do loading (SrdLoadingScreen)
**File:** `components/srd/SrdLoadingScreen.tsx`
**Action:** Alterar intervalo de rotação de mensagens de 400ms para 1000ms.
**Change:** Linha com `setInterval` — mudar `400` para `1000`.

### Task 2: Fix glow dourado no botão skip do welcome modal (TourTooltip)
**File:** `components/tour/TourTooltip.tsx`
**Action:** Adicionar `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30` ao botão skip (class atual: `text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70`). Isso existe em dois locais: no modal (linha ~290) e no anchored tooltip (buscar o segundo skip button).
**Investigação:** O "glow dourado" reportado pode ser o browser default focus ring sobre a borda `border-gold/30` do tooltip. Garantir que o skip button tenha focus ring explícito neutro.

### Task 3: Mostrar MonsterToken no mobile (CombatantSetupRow)
**File:** `components/combat/CombatantSetupRow.tsx`
**Action:** Remover `hidden md:block` do botão/span do MonsterToken. Usar responsive sizing: `size={24}` no mobile, `size={32}` no desktop via `useMediaQuery` ou conditional class.
**Change específica:**
- Botão do token (linha ~126-144): Remover `hidden md:block`, usar classes responsivas
- Ajustar tamanho: envolver MonsterToken em div com classes responsivas `w-6 h-6 md:w-8 md:h-8`
- Spacer (linha ~146): Remover `hidden md:block`, reduzir para `w-6 md:w-8`
- Manter clicável para abrir stat block no mobile também

### Task 4: Adicionar hint anti-metagame no tour step 4 (TourTooltip + i18n)
**File:** `components/tour/tour-steps.ts` — Adicionar campo opcional `extraDescriptionKey` ao `TourStepConfig`
**File:** `components/tour/TourTooltip.tsx` — Renderizar `extraDescriptionKey` como parágrafo extra em cor dourada (`text-gold text-xs`)
**File:** `messages/pt-BR.json` — Adicionar key `tour.monster_added_antimetagame`:
> "🛡️ Barreira Anti-Metagame: você pode mudar o nome visível pros jogadores, o nome das suas anotações e a silhueta hostil de cada monstro."
**File:** `messages/en.json` — Equivalente em inglês:
> "🛡️ Anti-Metagame Shield: you can change the display name visible to players, your annotation name, and each monster's hostile silhouette."

### Task 5: Reordenar steps — "add-row" antes de "import-hint"
**File:** `components/tour/tour-steps.ts`
**Action:** No array `TOUR_STEPS`, trocar a posição dos objetos `import-hint` (atualmente index 4) e `add-row` (atualmente index 5). O `add-row` fica em index 4 e `import-hint` em index 5. Atualizar os comments correspondentes.
**Impacto:** TourProvider auto-actions referenciam por `step.id`, não por index, então não há impacto nas auto-actions.

### Task 6: Adicionar seletor de tipo (role) na add-row mobile e desktop
**File:** `components/guest/GuestCombatClient.tsx`
**Action:**
1. Adicionar state `addRowRole` do tipo `CombatantRole` (default: `"monster"`)
2. Adicionar botão de role cycle na add-row, reutilizando `ROLE_CONFIG` e `COMBATANT_ROLE_CYCLE` de `lib/types/combat.ts`
3. Posicionar o botão na mesma linha da iniciativa (antes do input de nome)
4. No `handleAddFromRow`, setar `combatant_role: addRowRole` em vez de `null`
5. Resetar `addRowRole` para `"monster"` ao limpar a row
**Layout mobile:** Botão mostra apenas ícone (44px touch target). Desktop: ícone + label text.
**Import necessário:** `ROLE_CONFIG` do CombatantSetupRow (ou extrair para arquivo compartilhado se necessário), `COMBATANT_ROLE_CYCLE` de `lib/types/combat.ts`

### Task 7: Adicionar confirmação "Limpar Tudo"
**File:** `components/guest/GuestCombatClient.tsx`
**Action:**
1. Adicionar state `showClearConfirm` (boolean, default false)
2. No onClick do botão "Limpar Tudo", setar `showClearConfirm(true)` em vez de executar reset direto
3. Renderizar banner de confirmação inline quando `showClearConfirm === true`:
   - Texto: "Tem certeza que deseja limpar todos os combatentes?" (i18n)
   - Botão "Confirmar" (vermelho) — executa o reset original
   - Botão "Cancelar" — seta `showClearConfirm(false)`
4. Mesma UI para mobile e desktop (banner inline)
**i18n keys:**
- `combat.clear_all_confirm_message`: "Tem certeza que deseja limpar todos os combatentes e iniciativas?"
- `combat.clear_all_confirm_yes`: "Sim, limpar tudo"
- `combat.clear_all_confirm_no`: "Cancelar"

### Task 8: Adicionar todas as keys i18n
**Files:** `messages/pt-BR.json`, `messages/en.json`
**Keys novas:**
| Key | pt-BR | en |
|-----|-------|----|
| `tour.monster_added_antimetagame` | "🛡️ Barreira Anti-Metagame: você pode mudar o nome visível pros jogadores, o nome das suas anotações e a silhueta hostil de cada monstro." | "🛡️ Anti-Metagame Shield: you can change the display name visible to players, your annotation name, and each monster's hostile silhouette." |
| `combat.clear_all_confirm_message` | "Tem certeza que deseja limpar todos os combatentes e iniciativas?" | "Are you sure you want to clear all combatants and initiatives?" |
| `combat.clear_all_confirm_yes` | "Sim, limpar tudo" | "Yes, clear all" |
| `combat.clear_all_confirm_no` | "Cancelar" | "Cancel" |

## Acceptance Criteria

### AC1: Loading Messages (Task 1)
- **Given** o loading screen está visível
- **When** as mensagens rotacionam
- **Then** cada mensagem fica visível por pelo menos 1 segundo antes de trocar

### AC2: Skip Button Glow (Task 2)
- **Given** o modal de welcome (step 0) está aberto
- **When** o usuário vê os botões
- **Then** "Já sei como funciona" NÃO tem glow/borda dourada
- **And** "Próximo" tem fundo dourado (bg-gold) com hover glow
- **And** focus-visible no skip mostra ring neutro (não dourado)

### AC3: Monster Token Mobile (Task 3)
- **Given** um monstro (ex: Goblin) foi adicionado ao combate no mobile (<768px)
- **When** a CombatantSetupRow renderiza
- **Then** o token/avatar do monstro aparece ao lado do nome (tamanho 24px)
- **And** o token é clicável para abrir o stat block
- **And** no desktop, o token mantém tamanho 32px

### AC4: Anti-Metagame Hint (Task 4)
- **Given** o tour está no passo 4 (monster-added)
- **When** o tooltip renderiza
- **Then** abaixo da descrição principal, aparece texto dourado explicando a barreira anti-metagame
- **And** o texto menciona: nome visível, nome de anotações, silhueta hostil

### AC5: Step Order (Task 5)
- **Given** o tour avança do passo 3 (monster-added)
- **When** o usuário clica "Próximo"
- **Then** o próximo step é "add-row" (adição manual), NÃO "import-hint"
- **And** "import-hint" aparece após "add-row"

### AC6: Role Selector na Add-Row (Task 6)
- **Given** a add-row está visível no mobile
- **When** o usuário toca no botão de role
- **Then** o tipo cicla entre player → npc → summon → monster
- **And** o ícone e cor mudam de acordo com o tipo selecionado
- **And** ao adicionar o combatente, o `combatant_role` é setado corretamente
- **And** no desktop, o botão mostra ícone + label text

### AC7: Confirmação Limpar Tudo (Task 7)
- **Given** há combatentes na lista de setup
- **When** o usuário clica "Limpar Tudo"
- **Then** aparece um banner inline perguntando confirmação
- **And** "Confirmar" (vermelho) executa o reset
- **And** "Cancelar" fecha o banner sem ação
- **And** funciona igual no mobile e desktop

## Additional Context

### Dependencies
- Nenhuma dependência externa nova
- Reutiliza `ROLE_CONFIG` e `COMBATANT_ROLE_CYCLE` já existentes
- Reutiliza `MonsterToken` já existente

### Testing Strategy
- Testes unitários para CombatantSetupRow (token visibility no mobile)
- Testes unitários para GuestCombatClient (confirmação de clear, role na add-row)
- Testes manuais no mobile real para todos os 7 itens (tour flow completo)

### Notes
- **Paridade mobile/desktop**: Princípio transversal — toda feature desktop deve funcionar no mobile. O token e role selector eram os maiores gaps.
- **MonsterToken size**: 24px no mobile é suficiente para identificação visual sem comprometer o layout de 2 linhas.
- **Step reordering**: "Adição manual" é mais relevante que "importar conteúdo externo" para o fluxo de primeiro uso, por isso vem antes.
- **Anti-metagame no onboarding**: Fundamental para o produto — o mestre precisa saber desde o primeiro combate que pode customizar o que os jogadores veem.
