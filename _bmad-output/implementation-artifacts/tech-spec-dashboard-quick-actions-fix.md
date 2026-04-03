---
title: 'Dashboard Quick Actions — NPC Dialog, Invite Picker & Title Fix'
slug: 'dashboard-quick-actions-fix'
created: '2026-04-03'
status: 'implemented'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [next-intl, supabase, shadcn-dialog, zustand]
files_to_modify:
  - supabase/migrations/074_global_npcs.sql
  - lib/types/campaign-npcs.ts
  - lib/supabase/campaign-npcs.ts
  - components/campaign/NpcForm.tsx
  - components/dashboard/QuickActions.tsx
  - components/dashboard/DashboardOverview.tsx
  - app/app/dashboard/page.tsx
  - components/dashboard/__tests__/QuickActions.test.tsx
  - messages/en.json
  - messages/pt-BR.json
code_patterns: [server-to-client translation passthrough, shadcn Dialog, supabase RLS]
test_patterns: [jest + RTL unit tests]
---

# Tech-Spec: Dashboard Quick Actions — NPC Dialog, Invite Picker & Title Fix

**Created:** 2026-04-03

## Overview

### Problem Statement

Os 3 botoes de "Acoes Rapidas" no dashboard estao com fluxos quebrados ou inadequados:
1. **Criar NPC** redireciona para `/app/presets` (pagina de presets de combate) — nao tem relacao com NPCs
2. **Convidar Jogador** redireciona para lista generica de campanhas — nao pergunta QUAL campanha
3. **Titulo "Combate Rapido"** aparece sobre combates ativos em andamento — label errado
4. NPCs so existem vinculados a campanhas — nao ha conceito de NPC global reutilizavel

### Solution

1. Converter "Criar NPC" de link para botao que abre Dialog com 2 opcoes: NPC Global (conta do usuario) ou NPC de Campanha (com seletor)
2. Converter "Convidar Jogador" de link para botao com seletor de campanha (ou navegacao direta se so tem 1)
3. Renomear titulo da secao para "Combates em Andamento"
4. Migration: tornar `campaign_npcs.campaign_id` nullable e adicionar `user_id` para NPCs globais

### Scope

**In Scope:**
- Dialog de escopo NPC (global vs campanha) com lista de campanhas do usuario
- Dialog de seletor de campanha para convite (com shortcut se 1 campanha)
- NpcForm aceita `campaignId` opcional (null = global)
- Migration 074: `campaign_id` nullable, `user_id` NOT NULL com backfill, RLS atualizado
- Funcao `getGlobalNpcs()` no supabase client
- Funcao `createNpc()` agora obtem `user.id` via auth
- Titulo "Combates em Andamento" (pt-BR) / "Ongoing Combats" (en)
- 10 novas translation keys em ambos idiomas
- Testes unitarios atualizados

**Out of Scope:**
- Pagina dedicada de gerenciamento de NPCs globais
- Atribuicao retroativa de NPC global a uma campanha
- Envio de email de convite direto pelo dialog
- Toast de sucesso apos criacao de NPC

## Context for Development

### Codebase Patterns

- **Translation passthrough**: Server component (`page.tsx`) chama `getTranslations()`, monta objeto flat, passa para client component via props
- **Dialog pattern**: Projeto usa shadcn `Dialog` com `DialogContent/DialogHeader/DialogTitle`
- **Supabase client**: Funcoes em `lib/supabase/` usam `createClient()` (browser client), nao server client
- **RLS**: Policies em migration files, owner = `auth.uid()` via campaigns ou direto
- **NpcForm**: Modal dialog standalone, recebe `campaignId` + `onSave` callback

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/dashboard/QuickActions.tsx` | Componente principal reescrito — de links para dialogs |
| `components/dashboard/DashboardOverview.tsx` | Orquestra QuickActions, passa campaigns array e translations |
| `app/app/dashboard/page.tsx` | Server component que busca campanhas e traduz keys |
| `components/campaign/NpcForm.tsx` | Form de NPC — `campaignId` agora opcional |
| `lib/types/campaign-npcs.ts` | `CampaignNpc.campaign_id` agora `string \| null`, novo `user_id` |
| `lib/supabase/campaign-npcs.ts` | `createNpc` pega user via auth, nova `getGlobalNpcs()` |
| `supabase/migrations/074_global_npcs.sql` | Schema change + RLS |
| `supabase/migrations/043_campaign_npcs.sql` | Schema original (referencia) |

### Technical Decisions

1. **`campaign_id` nullable vs tabela separada**: Nullable e mais simples, evita duplicacao de schema/RLS. NPCs globais e de campanha compartilham mesma tabela.
2. **`user_id` via `auth.getUser()` no client**: Mais explicito que trigger. O app code seta `user_id` no insert.
3. **RLS simplificado**: Policy owner mudou de `campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid())` para `user_id = auth.uid()`. Cobre ambos os casos.
4. **Invite shortcut**: Se usuario tem exatamente 1 campanha, pula o dialog e navega direto.

## Implementation Plan

### Tasks

1. **Migration `074_global_npcs.sql`** (DB)
   - ADD COLUMN `user_id UUID REFERENCES auth.users(id)` (nullable)
   - UPDATE backfill de `user_id` via JOIN com `campaigns.owner_id`
   - ALTER `user_id` SET NOT NULL
   - ALTER `campaign_id` DROP NOT NULL
   - CREATE INDEX `idx_campaign_npcs_user`
   - DROP + CREATE POLICY `campaign_npcs_owner` usando `user_id = auth.uid()`

2. **Types `lib/types/campaign-npcs.ts`**
   - `CampaignNpc.campaign_id`: `string` -> `string | null`
   - ADD `user_id: string`
   - `CampaignNpcInsert`: Omit inclui `user_id`
   - `CampaignNpcUpdate`: Omit inclui `user_id`

3. **Supabase `lib/supabase/campaign-npcs.ts`**
   - `mapRow`: adicionar `user_id`, `campaign_id` com `?? null`
   - `createNpc`: obter `user` via `supabase.auth.getUser()`, incluir `user_id` no insert
   - ADD `getGlobalNpcs()`: filtra `user_id = user.id` AND `campaign_id IS NULL`

4. **NpcForm `components/campaign/NpcForm.tsx`**
   - `campaignId` prop: `string` -> `string | null | undefined`
   - Submit: `campaign_id: campaignId ?? null`

5. **QuickActions `components/dashboard/QuickActions.tsx`** (reescrita)
   - Remove array ACTIONS com links estaticos
   - "Novo Combate": Link (sem mudanca)
   - "Criar NPC": button -> abre NPC Scope Dialog (Global + campanhas)
   - "Convidar Jogador": button -> se 1 campanha navega direto, senao abre Invite Dialog
   - NPC Scope Dialog: opcao Global (Globe icon, blue) + lista campanhas (Map icon, amber)
   - Invite Dialog: lista campanhas (Map icon, emerald) + empty state
   - NpcForm inline: abre apos selecao de escopo

6. **DashboardOverview `components/dashboard/DashboardOverview.tsx`**
   - Props: adicionar 10 novas translation keys
   - QuickActions: passar `campaigns` array (nao so `campaignId`)
   - Titulo combates: `t.quick_combat` -> `t.ongoing_combats`

7. **Dashboard page `app/app/dashboard/page.tsx`**
   - Adicionar 10 translation keys ao objeto `translations`

8. **Translations `messages/{en,pt-BR}.json`**
   - 10 novas keys em `dashboard`: `ongoing_combats`, `npc_dialog_title`, `npc_global_title`, `npc_global_desc`, `npc_for_campaign`, `npc_created_success`, `invite_dialog_title`, `invite_select_campaign`, `no_campaigns_yet`, `no_campaigns_create`

9. **Tests `__tests__/QuickActions.test.tsx`**
   - Atualizar mocks (next-intl, campaign-npcs)
   - Atualizar translations fixture com novas keys
   - Adicionar campaigns fixture
   - Teste: Create NPC abre scope dialog
   - Teste: Invite Player com 1 campanha navega direto
   - Teste: Invite Player com N campanhas abre picker

### Acceptance Criteria

**AC1: Criar NPC abre dialog de escopo**
- GIVEN usuario logado no dashboard com campanhas
- WHEN clica "Criar NPC"
- THEN dialog abre com opcao "NPC Global" e lista de campanhas

**AC2: NPC Global cria sem campaign_id**
- GIVEN usuario selecionou "NPC Global" no dialog
- WHEN preenche e salva o NpcForm
- THEN NPC e criado com `campaign_id = null` e `user_id = auth.uid()`

**AC3: NPC de Campanha cria com campaign_id**
- GIVEN usuario selecionou uma campanha no dialog
- WHEN preenche e salva o NpcForm
- THEN NPC e criado com `campaign_id = id_selecionado` e `user_id = auth.uid()`

**AC4: Convidar Jogador com 1 campanha**
- GIVEN usuario tem exatamente 1 campanha
- WHEN clica "Convidar Jogador"
- THEN navega diretamente para `/app/campaigns/{id}`

**AC5: Convidar Jogador com N campanhas**
- GIVEN usuario tem 2+ campanhas
- WHEN clica "Convidar Jogador"
- THEN dialog abre com lista de campanhas para selecionar

**AC6: Convidar Jogador sem campanhas**
- GIVEN usuario nao tem campanhas
- WHEN clica "Convidar Jogador"
- THEN dialog mostra empty state "Nenhuma campanha ainda"

**AC7: Titulo da secao de combates**
- GIVEN dashboard com combates ativos
- WHEN renderiza
- THEN titulo da secao e "Combates em Andamento" (pt-BR) / "Ongoing Combats" (en)

**AC8: Migration nao quebra dados existentes**
- GIVEN NPCs existentes com campaign_id preenchido
- WHEN migration roda
- THEN todos recebem `user_id` do owner da campanha, `campaign_id` mantido

## Additional Context

### Dependencies

- Migration 074 deve rodar ANTES do deploy (senao `user_id` column nao existe)
- Nenhuma dependencia de pacote nova

### Testing Strategy

- Unit tests: QuickActions (jest + RTL) — dialogs abrem, navegacao funciona
- Manual QA: testar com 0, 1, e N campanhas
- Migration: testar em staging antes de prod

### Notes

- `npc_created_success` translation key foi adicionada mas nao esta sendo usada (sem toast). Pode ser usado em follow-up.
- `getGlobalNpcs()` foi criada mas nao tem UI de listagem ainda (fora de escopo).
