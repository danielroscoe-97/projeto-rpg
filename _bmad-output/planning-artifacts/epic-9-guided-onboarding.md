---
status: 'complete'
completedAt: '2026-03-28'
epic: 9
title: 'Guided Onboarding — Try Mode'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
competitiveAnalysis: 'Shieldmaiden VTT (onboarding system)'
version: '1.0'
---

# Epic 9: Guided Onboarding — Try Mode

## Resumo

Tour guiado interativo no modo `/try` (guest combat) que ensina novos visitantes a montar e executar um combate completo, culminando em CTA de conversão para criação de conta. Inspirado na análise competitiva do Shieldmaiden VTT, com melhorias significativas (spotlight SVG, branching contextual, steps interativos).

**FRs cobertos:** FR64, FR65, FR66, FR67, FR68, FR69, FR70, FR71, FR72
**Componentes:** TourProvider, TourOverlay, TourTooltip, TourProgress, tour-steps.ts, tour-store.ts
**Dependências:** GuestCombatClient, MonsterSearchPanel, guest-combat-store

---

## FR Coverage Map

| FR | Story | Descrição |
|----|-------|-----------|
| FR64 | 9.1 | Tour automático na primeira visita ao `/try` |
| FR65 | 9.1 | Spotlight overlay com SVG mask |
| FR66 | 9.2 | Steps info vs interactive com auto-advance |
| FR67 | 9.2 | Smart skip logic para condições já completadas |
| FR68 | 9.1 | Persistência localStorage via Zustand |
| FR69 | 9.3 | CTA de conversão no step final |
| FR70 | 9.1 | i18n completo pt-BR + en |
| FR71 | 9.2 | Posicionamento responsivo de tooltips |
| FR72 | 9.1 | Acessibilidade (aria-live, ESC, keyboard, touch targets) |

---

## Story 9.1: Infraestrutura do Tour — Store, Overlay e Tooltip Base

**Status:** Implementado

As a **first-time visitor** to the `/try` page,
I want to see an automatic guided tour that highlights UI elements,
So that I understand how to use the combat tracker without prior knowledge.

**FRs/NFRs:** FR64, FR65, FR68, FR70, FR72, NFR20 (WCAG 2.1 AA)
**Dependências:** Nenhuma

### Acceptance Criteria

**Given** um visitante acessa `/try` pela primeira vez (sem `guided-tour-v1` no localStorage)
**When** a página carrega completamente
**Then** o tour inicia automaticamente após 800ms de delay
**And** um overlay escuro (rgba 0,0,0,0.7) cobre a tela com um recorte spotlight no elemento alvo

**Given** o tour está ativo
**When** o step atual tem um elemento alvo visível no DOM
**Then** o spotlight SVG mask recorta um retângulo com 8px de padding e 8px de border-radius ao redor do elemento
**And** um tooltip aparece posicionado próximo ao elemento com título, descrição e controles

**Given** o tour está ativo
**When** o usuário pressiona ESC
**Then** o tour é encerrado e marcado como completo no localStorage
**And** não reaparece em visitas futuras

**Given** o tour foi completado ou pulado em uma visita anterior
**When** o usuário retorna ao `/try`
**Then** o tour NÃO inicia automaticamente

**Given** o tour está ativo em qualquer step
**When** o usuário clica "Pular tutorial"
**Then** o tour é encerrado imediatamente e `isCompleted` é `true` no store

**Given** qualquer step do tour
**Then** o tooltip possui `role="dialog"`, `aria-label` com o título do step, e `aria-live="polite"`
**And** os botões possuem `min-height: 44px` para touch targets

### Componentes

- `lib/stores/tour-store.ts` — Zustand store com persist middleware (localStorage key: `guided-tour-v1`)
- `components/tour/TourOverlay.tsx` — SVG mask overlay com AnimatePresence (Framer Motion)
- `components/tour/TourTooltip.tsx` — Tooltip posicionável com auto-placement (top/bottom/left/right)
- `components/tour/TourProgress.tsx` — Dots indicator (current/completed/pending)
- `messages/pt-BR.json` + `messages/en.json` — 15 chaves i18n no namespace `tour.*`

### Testes

- 7 testes unitários para `tour-store` (startTour, nextStep, goToStep, skipTour, completeTour, resetTour, initial state)
- 9 testes unitários para `tour-steps` (unique IDs, required fields, interactive hints, data-tour-id selectors, combat flow sequence)

---

## Story 9.2: Steps Interativos e Smart Skip Logic

**Status:** Implementado

As a **first-time visitor** completing the tour,
I want the tour to advance automatically when I complete each action,
So that I learn by doing rather than just reading instructions.

**FRs/NFRs:** FR66, FR67, FR71
**Dependências:** Story 9.1

### Acceptance Criteria

**Given** o tour está no step "Pesquise Monstros" (interactive)
**When** o usuário digita ≥3 caracteres no campo de busca
**Then** o tour avança automaticamente para o próximo step após 600ms

**Given** o tour está no step "Adicione ao Combate" (interactive)
**When** o usuário clica em um monstro da lista de resultados e `combatants.length` aumenta
**Then** o tour avança automaticamente para o próximo step

**Given** o tour está no step "Role a Iniciativa" (interactive)
**When** todos os combatentes possuem `initiative !== null`
**Then** o tour avança automaticamente após 500ms

**Given** o tour está no step "Iniciar Combate" (interactive)
**When** o `phase` do guest-combat-store muda para `"combat"`
**Then** o tour avança automaticamente após 800ms (aguarda renderização)

**Given** o usuário já adicionou monstros antes do tour chegar ao step "Adicione ao Combate"
**When** o tour tenta avançar para esse step
**Then** o step é automaticamente pulado via `shouldSkipStep()` e o tour avança para o próximo válido

**Given** a viewport é < 768px (mobile)
**When** o tooltip é posicionado
**Then** apenas posições top/bottom são consideradas (nunca left/right)
**And** a largura máxima do tooltip é `min(340px, viewport - 32px)`

**Given** o step é do tipo "interactive"
**When** o overlay está ativo
**Then** a área do spotlight permite pointer events (click-through) para que o usuário interaja com o elemento

### Steps Configurados

| # | ID | Tipo | Alvo | Condição de Avanço |
|---|-----|------|------|--------------------|
| 0 | welcome | info | Container principal | Botão "Próximo" |
| 1 | monster-search | interactive | Campo de busca SRD | Input ≥ 3 caracteres |
| 2 | monster-result | interactive | Primeiro resultado | combatants.length aumenta |
| 3 | add-row | info | Linha de adição manual | Botão "Próximo" |
| 4 | roll-initiative | interactive | Botão "Rolar Tudo" | Todos com initiative !== null |
| 5 | start-combat | interactive | Botão "Iniciar Combate" | phase === "combat" |
| 6 | combat-controls | info | Controles de combate | Botão "Próximo" |
| 7 | tour-complete | info | Container combate | Botão "Concluir" |

### Componentes

- `components/tour/TourProvider.tsx` — Orquestra steps, subscribe no guest-combat-store, smart skip, DOM polling
- `components/tour/tour-steps.ts` — Configuração declarativa dos 8 steps

---

## Story 9.3: CTA de Conversão e Integração no Layout

**Status:** Implementado

As a **visitor who completed the tour**,
I want to see a clear call-to-action to create an account,
So that I can save my combat, share sessions, and unlock full features.

**FRs/NFRs:** FR69
**Dependências:** Story 9.1, Story 9.2

### Acceptance Criteria

**Given** o tour chega ao step final ("tour-complete")
**When** o tooltip é renderizado
**Then** a descrição inclui texto incentivando criação de conta com benefícios listados (salvar combates, compartilhar sessões)

**Given** o tour está ativo
**When** o `TourProvider` é renderizado
**Then** ele está montado no `app/try/layout.tsx` e se sobrepõe a todo o conteúdo da página via z-index 10000/10001

### Componentes

- `app/try/layout.tsx` — `<TourProvider />` integrado no layout
- `components/guest/GuestCombatClient.tsx` — 8 `data-tour-id` attributes nos elementos alvo

---

## Story 9.4: Melhorias Pós-Análise Competitiva (Shieldmaiden) — PENDENTE

As a **product team**,
We want to incorporate best practices from the Shieldmaiden competitive analysis,
So that our onboarding exceeds industry standards.

**FRs/NFRs:** Enhancement de FR64-FR72
**Dependências:** Stories 9.1, 9.2, 9.3 (implementadas)

### Melhorias Planejadas (baseadas na análise do Shieldmaiden)

#### A. Branching Contextual por Tipo de Entidade
**Inspiração:** Shieldmaiden ramifica o tutorial baseado no tipo de entidade (jogador vs monstro), mostrando steps diferentes conforme o contexto.
**Implementação proposta:**
- Após adicionar um combatente, verificar se é monstro ou jogador
- Mostrar steps específicos: para monstro → "Veja o stat block"; para jogador → "Ajuste HP e AC"
- Requer: novo campo `branch` no `TourStepConfig`, lógica de branching no `TourProvider`

#### B. Pré-requisitos Dinâmicos
**Inspiração:** Shieldmaiden interrompe o fluxo quando uma ação exige pré-requisito (ex: selecionar alvo antes de atacar).
**Implementação proposta:**
- Adicionar campo `requires` no `TourStepConfig` (ex: `requires: "hasCombatants"`)
- Se o requisito não está satisfeito, inserir step intermediário automaticamente
- Evita frustração de "o tutorial mandou fazer X mas preciso fazer Y primeiro"

#### C. Stepper Lateral de Progresso
**Inspiração:** Shieldmaiden tem um drawer lateral com stepper vertical mostrando todos os steps.
**Implementação proposta:**
- Componente `TourStepper` com drawer colapsável
- Mostra todos os steps com ícones de check/pending
- Botão "Show me" que foca no step e fecha o drawer
- Botão "Reset tutorial" para recomeçar

#### D. Botão de Reset Persistente
**Inspiração:** Shieldmaiden permite resetar e refazer o tutorial a qualquer momento.
**Implementação proposta:**
- Ícone "?" flutuante no canto inferior direito do `/try`
- Ao clicar, mostra opção "Refazer tutorial"
- Chama `useTourStore.getState().resetTour()` + `startTour()`

#### E. Animações de Destaque no Elemento Alvo
**Gap no Shieldmaiden:** Não tem highlight visual além do popover.
**Nossa vantagem:** Já temos spotlight SVG. Podemos adicionar:
- Pulse animation (ring dourado pulsante) ao redor do spotlight
- Seta animada apontando para o elemento em steps interativos
- Framer Motion `layoutId` para transição suave entre spotlights

#### F. Banner de Demo Persistente
**Inspiração:** Shieldmaiden tem banner fixo na parte inferior com CTA de conversão.
**Implementação proposta:**
- Após completar o tour, mostrar banner minimalista no bottom
- Minimizável para ícone circular
- Texto diferente se usuário já está logado vs não logado

### Acceptance Criteria (Story 9.4)

**Given** o tour atinge um step onde o combatente adicionado é um monstro
**When** o branching contextual está habilitado
**Then** steps específicos de monstro são inseridos (ex: "Expanda o stat block")

**Given** o tour está em qualquer step
**When** o usuário clica no botão "?" no canto inferior
**Then** um popover mostra "Refazer tutorial" e "Ver atalhos"

**Given** o tour foi completado
**When** o banner de conversão é exibido
**Then** o banner é minimizável para um ícone circular e não bloqueia a interface

**Given** o stepper lateral está aberto
**When** o usuário clica "Show me" em um step
**Then** o drawer fecha e o tour navega para aquele step

---

## Análise Competitiva: Shieldmaiden VTT

### Pontos Fortes (Referência)
1. Demo sem fricção — `/demo` funciona sem conta
2. Tutorial contextual com branching por tipo de entidade
3. Pré-requisitos dinâmicos entre steps
4. Contador de progresso visível ("5/12")
5. Keyboard shortcuts ensinados no contexto
6. Stepper pós-cadastro reativo (detecta estado real dos dados)
7. Reset de tutorial disponível a qualquer momento

### Pontos Fracos (Onde Superamos)
1. Sem spotlight/dimming — Nós temos SVG mask com spotlight
2. Sem vídeos ou animações — Nós usamos Framer Motion
3. Tutorial só na demo — Potencial para expandir ao modo autenticado
4. Popovers pequenos (max-width 200px) — Nossos tooltips são 340px
5. Sem personalização por nível de experiência
6. Sem onboarding por email/notificação pós-cadastro

### Nosso Diferencial
- **Spotlight SVG real** com dimming e click-through interativo
- **Auto-advance** em steps interativos (learn by doing)
- **Smart skip** para usuários que já completaram condições
- **Framer Motion** para transições suaves
- **i18n nativo** (pt-BR + en)
- **WCAG 2.1 AA** desde o início
