# Spec: Redesign da Página de Campanha (DM View)

**Status:** Implementado + Deployed + Code Review OK  
**Data:** 2026-04-05  
**Sessão:** party-mode com Sally (UX), John (PM), Mary (Analyst), Amelia (Dev)

---

## Problema

A página `/app/campaigns/[id]` (visão DM) não tem hierarquia visual. Todos os acordeões são idênticos em peso — sem distinguir o que é operacional (ação imediata) do que é worldbuilding (referência futura). O DM chega na campanha sem contexto de "onde estou?" e sem quick actions claras.

**Sintomas reportados:**
- Seções abertas por padrão criam sensação de sobrecarga visual
- Não há resposta à pergunta "o que eu faço agora?"
- Ações principais (convidar jogador, novo encontro) estão escondidas
- Campanhas novas não têm onboarding — parece que nada existe

---

## Benchmark de Mercado

| Produto | Conceito Emprestável |
|---|---|
| **Linear** | Hero com contexto imediato + quick actions + seções com estado |
| **Basecamp (Project Hub)** | "What's happening" no topo + cards por área funcional |
| **World Anvil** | Hierarquia de seções (muito pesado, mas a organização é boa) |
| **Notion (Database page)** | Propriedades em destaque, views alternativas |
| **D&D Beyond (campanha)** | Jogadores visíveis no topo, stats agregados |

**Decisão de referência:** Linear + Basecamp como modelo de "dashboard de projeto com ação rápida", adaptado para RPG.

---

## Job-to-be-Done Principal

> **"Chegar na mesa pronto para jogar."**

Jobs secundários (em ordem de frequência):
1. Preparar próxima sessão → criar/revisar encontros, checar jogadores
2. Retomar contexto → ver o que mudou desde a última sessão
3. Gerenciar worldbuilding → NPCs, locais, facções (referência)

---

## Arquitetura da Nova Tela (DM View)

```
┌─────────────────── HERO SECTION ───────────────────────┐
│  ← Voltar    KRYNN                    [Novo Combate ⚔️]  │
│  5 jogadores · 5 sessões · 1 combate                     │
│                                                           │
│  [👥 Convidar Jogador]  [⚔️ Novo Encontro]  [📝 Nota]   │ ← quick actions
│                                                           │
│  [🔴 Sessão ativa: "Sessão 5" — Round 3]  (se houver)   │
└───────────────────────────────────────────────────────────┘

┌─────────────── TIER 1 — OPERACIONAL (2/3) ─────────────┐
│  👥 JOGADORES (5)                              [aberto] │
│     [cards dos personagens]                            │
│                                                         │
│  ⚔️  ENCONTROS                                [fechado] │ 
│     (DM only, subtabs builder/history)                 │
└─────────────────────────────────────────────────────────┘

┌────── TIER 1 — SIDEBAR OPERACIONAL (1/3) ──────────────┐
│  📜 QUESTS (x ativas)                         [aberto] │
│     [lista de quests]                                   │
└─────────────────────────────────────────────────────────┘

┌──── TIER 2 — CONTEXTO (grid 2-col, compacto) ──────────┐
│  🧑 NPCs · última atualização           [fechado/mini] │
│  🗺️  Locais · 3 locais                  [fechado/mini] │  
│  🏴 Facções · 2 facções                 [fechado/mini] │
│  📝 Notas da Campanha                   [fechado/mini] │
└─────────────────────────────────────────────────────────┘

┌──── TIER 3 — AVANÇADO (1 col, mais discreto) ──────────┐
│  🌐 Mapa Mental                         [fechado/mini] │
│  💼 Inventário do Grupo (DM only)       [fechado/mini] │
└─────────────────────────────────────────────────────────┘
```

---

## Decisões de Design

### 1. Hero Section — Upgrades no Header Existente

**Arquivo:** `app/app/campaigns/[id]/page.tsx` (JSX do DM View)

**Mudanças:**
- Adicionar **Quick Actions Row** abaixo dos stats:
  - `[👥 Convidar Jogador]` → abre `InvitePlayerDialog` (já existe)
  - `[⚔️ Novo Encontro]` → scroll para `#section_encounters` (anchor link)
  - `[📝 Nova Nota]` → scroll para `#section_notes` (anchor link)
- Adicionar **Active Session Banner** (se `dmActiveSession !== null`):
  - Pill dourado: `● Sessão ativa: "{nome}" · Iniciar combate`
  - Clica → abre `CombatLaunchSheet`
- Stats existentes: mantidos, apenas reposicionados

**Não mudar:** Os componentes internos de cada seção. Apenas o container.

### 2. Hierarquia Visual das Sections

**Arquivo:** `CampaignSections.tsx`

**Tier 1 — Operacional** (aparência atual, mantida):
- `section_players`: `defaultOpen={true}` ← mantém
- `section_encounters`: `defaultOpen={false}` ← mantém
- `section_quests`: `defaultOpen={true}` ← mantém (move para sidebar ao lado dos operacionais)

**Tier 2 — Contexto** (novo estilo visual: header menor, badge de contagem):
- NPCs, Locais, Facções, Notas
- Header usa `py-2` em vez de `py-3` (4px menos padding)
- Badge numérico ao lado do título (ex: "NPCs  3")
- Ícone em `text-muted-foreground` em vez de `text-amber-400` ← diferencia visualmente

**Tier 3 — Avançado** (mais discreto ainda):
- Mapa Mental, Inventário do Grupo
- Mesma lógica do Tier 2, mas com borda `border-border/50` (mais sutil)

### 3. Badge de Contagem por Seção

Cada seção do Tier 2+ recebe um badge estático com contagem via `count` SSR:

```tsx
// No page.tsx (DM View), buscar contagens em paralelo:
const [npcCount, locationCount, factionCount] = await Promise.all([
  supabase.from('npcs').select('*', {count:'exact', head:true}).eq('campaign_id', id),
  supabase.from('locations').select('*', {count:'exact', head:true}).eq('campaign_id', id),
  supabase.from('factions').select('*', {count:'exact', head:true}).eq('campaign_id', id),
])
```

Passa como prop para `CampaignSections`. Se count = 0, mostra "Vazio" em muted.

### 4. Empty State de Onboarding

**Condição:** `playerCount === 0 AND sessionCount === 0` (campanha nova)

**Onde:** Entre o Hero Section e as Seções, substitui todo o conteúdo principal.

```tsx
// Checklist de "Primeiros passos":
const steps = [
  { done: playerCount > 0,   label: "Convide seu primeiro jogador",  action: → InvitePlayerDialog },
  { done: sessionCount > 0,  label: "Crie sua primeira sessão",      action: → Novo Combate },
  { done: hasQuest,          label: "Adicione uma quest ou objetivo", action: → scroll #section_quests },
]
```

Visual: 3 cards horizontais com checkmark quando completo. Desaparece quando todos os 3 estão feitos (`playerCount > 0 && sessionCount > 0 && hasQuest`).

---

## Mudanças em Arquivos

| Arquivo | Tipo de Mudança |
|---|---|
| `app/app/campaigns/[id]/page.tsx` | Header upgrades, active session banner, quick actions, SSR counts, onboarding condition |
| `app/app/campaigns/[id]/CampaignSections.tsx` | Props para counts, visual hierarchy (Tier 2/3 estilo), badge de contagem |
| `components/campaign/CampaignQuickActions.tsx` | **NOVO** — barra de quick actions (3 botões) |
| `components/campaign/CampaignOnboarding.tsx` | **NOVO** — checklist de onboarding (3 steps) |

**Não tocamos:**
- Componentes internos de cada seção (PlayerCharacterManager, QuestBoard, etc.)
- Lógica de dados existente
- Player View (`PlayerCampaignView`) — fora do escopo

---

## i18n

Chaves novas em `messages/pt-BR/campaign.json` e `messages/en/campaign.json`:

```json
"quick_action_invite": "Convidar Jogador",
"quick_action_encounter": "Novo Encontro",
"quick_action_note": "Nova Nota",
"active_session_banner": "Sessão ativa",
"onboarding_title": "Primeiros passos",
"onboarding_step_invite": "Convide seu primeiro jogador",
"onboarding_step_session": "Crie seu primeiro encontro",
"onboarding_step_quest": "Adicione uma quest"
```

---

## Fora de Escopo (Bucket)

- Aba de "Atividade Recente" (timeline de mudanças)
- Sessão agendável com data/hora
- Notificações por seção
- Cover image da campanha no hero
- Player View redesign (ticket separado)

---

## Critérios de Aceite — Fases 1–3

- [x] DM vê quick actions (Convidar, Novo Encontro, Nova Nota) no topo sem scroll
- [x] Sessão ativa aparece como banner dourado se existir
- [x] Tier 1 sections visualmente mais proeminentes que Tier 2/3
- [x] Seções Tier 2 mostram badge de contagem (ou "Vazio")
- [x] Nenhum componente interno de seção foi modificado
- [x] Build passa sem erros de TypeScript
- [x] Funciona em mobile (responsive)

## Critérios de Aceite — Fase 4 (Onboarding)

- [x] Campanha nova (0 jogadores, 0 sessões) mostra onboarding de 3 passos
- [x] Onboarding desaparece após completar os 3 passos

---

## Code Review — 2026-04-05

**Revisor:** Claude (party-mode session)  
**Status:** Aprovado — todos os critérios atendidos, deployed em produção

### Commits de Implementação

| Commit | Fase | Descrição |
|---|---|---|
| `b6d9ca2` | F2 | Visual tier hierarchy (Section component com tier prop) |
| `2dbcb95` | F1+F3 | Quick actions, active session banner, SSR count badges |
| `9f1c4c2` | F4 | Code review patches + Fase 4 onboarding |
| `e12aac6` | F4 | Onboarding guard, section visibility, cleanup |

### Arquivos Novos

- `components/campaign/CampaignQuickActions.tsx` — 3 botões de ação rápida
- `components/campaign/CampaignCombatTriggers.tsx` — stats + banner sessão ativa + combat sheet controlado
- `components/campaign/CampaignOnboarding.tsx` — checklist 3 passos para campanha nova

### Achado Menor (bucket)

Quick actions "Novo Encontro" e "Nova Nota" scrollam para sections que estão hidden em campanhas vazias. Impacto zero — onboarding domina a tela nesse estado. Corrigível futuramente.
