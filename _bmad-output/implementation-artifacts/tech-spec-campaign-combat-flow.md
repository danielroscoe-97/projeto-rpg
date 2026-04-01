---
title: 'Fluxo Rápido de Combate nas Campanhas'
slug: 'campaign-combat-flow'
created: '2026-04-01'
status: 'ready'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Next.js, TypeScript, Supabase, Tailwind, Radix Dialog]
files_to_modify:
  - app/app/campaigns/[id]/page.tsx
  - components/campaign/CombatLaunchSheet.tsx (new)
  - messages/pt-BR.json
  - messages/en.json
code_patterns: [bottom-sheet-mobile, modal-desktop, supabase-rpc]
test_patterns: [component-render, user-interaction]
---

# Tech-Spec: Fluxo Rápido de Combate nas Campanhas

**Created:** 2026-04-01

## Overview

### Problem Statement

O DM precisa sair da tela da campanha e navegar até `/app/session/new` para iniciar um combate. São muitos cliques para uma ação frequente. O botão "Novo Combate" na página da campanha deveria oferecer opções rápidas.

### Solution

Ao clicar no botão "Novo Combate" na página de detalhes da campanha, abre um bottom sheet (mobile) / modal (desktop) com 4 opções de combate:

1. **⚔️ Novo Combate** — Cria sessão vinculada à campanha, com toggles para rolar iniciativa automática e enviar link por email
2. **📧 Enviar Link** — Envia link da sessão ativa por email para os jogadores
3. **⚡ Combate Rápido** — Cria combate direto sem setup
4. **📦 Carregar Preset** — Placeholder para futura feature de presets de encontro

### Scope

**In Scope:**
- Bottom sheet/modal com as 4 opções
- Opção 1: criar sessão de combate com toggle de iniciativa + envio de email
- Opção 2: enviar link da sessão ativa (só aparece se há sessão ativa)
- Opção 3: criar combate rápido (redirect direto para `/app/session/new?campaign={id}&quick=true`)
- Opção 4: UI de placeholder com badge "Em breve"

**Out of Scope:**
- Automação WhatsApp (bucket futuro)
- Sistema de presets de encontro/combate (feature futura)
- Rolar iniciativa automaticamente no backend (usa o fluxo existente)

## Context for Development

### Codebase Patterns

- Campanhas usam rota `/app/campaigns/[id]/page.tsx` com server component
- Sessão de combate é criada via `/app/session/new/page.tsx` — picker de campanha
- Bottom sheets podem usar `@radix-ui/react-dialog` (já no projeto) com CSS adaptativo
- i18n via `next-intl` com namespaces em `messages/{locale}.json`
- Componentes de campanha em `components/campaign/`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/app/campaigns/[id]/page.tsx` | Página de detalhe da campanha (DM view) |
| `app/app/campaigns/[id]/CampaignSections.tsx` | Seções da campanha |
| `app/app/session/new/page.tsx` | Fluxo atual de criação de combate |
| `components/ui/dialog.tsx` | Dialog/modal base (Radix) |
| `components/campaign/EncounterHistory.tsx` | Histórico de encontros existente |

### Technical Decisions

- Usar `Dialog` do Radix com classes responsive: modal no desktop, bottom sheet no mobile (via CSS `fixed bottom-0` em telas sm)
- Opção "Enviar Link" só aparece se `campaign.active_session_id` existe
- Combate Rápido redireciona para `/app/session/new?campaign={id}&quick=true` — o page.tsx de session/new já aceita `campaign` query param
- Email usa infraestrutura existente (se houver) ou apenas copia link para clipboard como fallback

## Implementation Plan

### Tasks

#### Task 1: Criar componente `CombatLaunchSheet`
**File:** `components/campaign/CombatLaunchSheet.tsx` (new)

- Componente client com Dialog/Sheet do Radix
- Props: `campaignId: string`, `campaignName: string`, `playerEmails: string[]`, `activeSessionId?: string`
- 4 opções em grid/lista com ícone + título + descrição
- Mobile: bottom sheet (fixed bottom-0, rounded-t-xl, drag handle)
- Desktop: centered modal

#### Task 2: Opção "Novo Combate" — sub-dialog com toggles
- Toggle: "Rolar iniciativa automaticamente" (default off)
- Toggle: "Enviar link por email para jogadores" (default on)
- Botão "Iniciar Combate" → redirect para `/app/session/new?campaign={id}`
- Se toggle de email ativo, trigger email após redirect (pode ser via query param `&notify=true`)

#### Task 3: Opção "Enviar Link"
- Só visível se `activeSessionId` presente
- Mostra lista de jogadores com checkbox (todos selecionados por default)
- Botão "Enviar" → chama API de email OU copia link para clipboard
- Fallback: botão "Copiar Link" sempre disponível

#### Task 4: Opção "Combate Rápido"
- Click direto → redirect para `/app/session/new?campaign={id}&quick=true`
- Sem modal adicional

#### Task 5: Opção "Carregar Preset" (placeholder)
- Card com badge "Em breve" / "Coming soon"
- Disabled state, cor muted
- Tooltip ou text explicativo

#### Task 6: Integrar na página da campanha
- Substituir/complementar botão "Novo Combate" existente na CampaignSections
- Abrir `CombatLaunchSheet` ao clicar

#### Task 7: i18n
- Adicionar strings em `messages/pt-BR.json` e `messages/en.json` no namespace `campaign_combat`

### Acceptance Criteria

**AC1: Bottom sheet abre ao clicar em "Novo Combate"**
- Given: DM está na página de detalhe de uma campanha
- When: Clica no botão "Novo Combate"
- Then: Bottom sheet (mobile) ou modal (desktop) abre com 4 opções

**AC2: Novo Combate cria sessão com opções**
- Given: Bottom sheet aberto
- When: DM seleciona "Novo Combate" e configura toggles
- Then: Redirect para `/app/session/new?campaign={id}` com params adequados

**AC3: Combate Rápido redireciona direto**
- Given: Bottom sheet aberto
- When: DM clica em "Combate Rápido"
- Then: Redirect imediato para `/app/session/new?campaign={id}&quick=true`

**AC4: Enviar Link só aparece com sessão ativa**
- Given: Campanha sem sessão ativa
- When: Bottom sheet abre
- Then: Opção "Enviar Link" não aparece ou está desabilitada

**AC5: Carregar Preset mostra "Em breve"**
- Given: Bottom sheet aberto
- When: DM vê opção "Carregar Preset"
- Then: Card aparece com badge "Em breve" e estado disabled

## Additional Context

### Dependencies
- Radix Dialog (já instalado)
- next-intl (já instalado)
- Fluxo de criação de sessão existente em `/app/session/new`

### Bucket Futuro
- **WhatsApp**: Integração WhatsApp Business API para enviar link no grupo do mestre automaticamente
- **Presets de Encontro**: Salvar/carregar configurações de combate (monstros, mapa, condições)

### Notes
- O email de convite pode reutilizar a infraestrutura de convite de jogadores existente
- A opção "Enviar Link" é útil para sessões que já estão rolando e novos jogadores precisam entrar
