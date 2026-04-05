# Spec: Campaign Hub v2 — Redesign Completo da Página de Campanha (DM View)

**Status:** Spec Aprovada — Aguardando Implementação  
**Data:** 2026-04-05  
**Sessão:** Party Mode com Sally (UX), John (PM), Winston (Arquiteto), Mary (Analista), Amelia (Dev), Bob (SM), Quinn (QA), Barry (Quick Flow), Paige (Tech Writer)  
**Predecessor:** `docs/spec-campaign-page-redesign.md` (v1 — implementada)

---

## Contexto

A v1 do redesign (commits `b6d9ca2` → `e12aac6`) adicionou Quick Actions, tier visual, badges de contagem e onboarding. Mas a estrutura fundamental continua sendo **acordeões empilhados**, que não resolve os problemas de identidade, navegação e hierarquia.

## Problemas Identificados

| # | Problema | Impacto |
|---|----------|---------|
| P1 | DM abre a campanha e não sabe o estado sem clicar | Fricção alta |
| P2 | 10 acordeões com mesmo peso visual = paralisia de escolha | Sobrecarga cognitiva |
| P3 | Ações frequentes (combate, convite) exigem scroll/cliques | Produtividade baixa |
| P4 | Campanha cheia fica pesada; campanha vazia fica morta | Edge cases ruins |
| P5 | Zero identidade visual — parece painel admin, não RPG | Sem personalidade |

## Job-to-be-Done

> **"Chegar na mesa pronto para jogar."**

As 3 perguntas que o DM faz ao abrir uma campanha:
1. **"Quem tá na mesa?"** → Jogadores e presença
2. **"O que vai rolar hoje?"** → Sessão ativa / encontro preparado
3. **"Tem algo pendente?"** → Quests, notas, preparação

**Meta:** Responder as 3 perguntas em **0 cliques, < 2 segundos**.

## Benchmark

| Produto | Conceito Emprestável |
|---|---|
| **Linear** | Hero + KPI cards + tabs de trabalho |
| **Basecamp Hub** | "What's happening" + cards por área |
| **D&D Beyond** | Avatares no topo, stats agregados |
| **Notion** | Property bar + views de conteúdo |

**Diferencial PocketDM:** context-aware default, KPI cards com ação, presença real-time.

---

## Arquitetura: 2 Estados — Overview + Focus

A página de campanha tem **2 estados** controlados por `searchParams`:

### Estado 1: Overview (`/campaigns/[id]`)

O DM vê tudo de relance. Nenhuma seção está expandida.

```
┌─────────────────────────────────────────────────────────┐
│  HERO SECTION                                            │
│  ├─ ← Dashboard (breadcrumb)                            │
│  ├─ Nome da Campanha (h1, text-3xl, display)            │
│  ├─ Subtítulo: "Sessão 5 · Última: há 2 dias"          │
│  │                                                       │
│  ├─ Player Avatars Row                                   │
│  │   [🟢 Ana] [🟡 Pedro] [⚪ Lucas] [⚪ Maria] [+ Add] │
│  │    Ranger    Mago       Ladino    Clériga    Convid.  │
│  │                                                       │
│  ├─ Status Cards (KPIs clicáveis, 1 row)                │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   │🔴 Sessão │ │⚔️ Encont.│ │📜 Quests │            │
│  │   │Ativa     │ │  3 prep. │ │  5 ativas│            │
│  │   │Entrar →  │ │          │ │          │            │
│  │   └──────────┘ └──────────┘ └──────────┘            │
│  │   (zerados → viram CTA de onboarding)                │
│  │                                                       │
│  └─ Quick Actions: [⚔️ Combate] [+ Encontro] [+ Nota]  │
├─────────────────────────────────────────────────────────┤
│  CAMPAIGN STATS BAR (if >= 2 combates)                   │
│  [Combates: 8] [Rounds: 42] [Tempo: 6h] [MVP: Ana x4]  │
├─────────────────────────────────────────────────────────┤
│  SECTION GRID                                            │
│                                                          │
│  ── ⚡ Operacional ──────────────────────────────────    │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ ⚔️  Encontros    │  │ 📜  Quests      │               │
│  │  3 preparados    │  │  5 ativas       │               │
│  │  "Goblins na     │  │  "Resgatar o    │               │
│  │   Floresta"      │  │   mago preso"   │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                          │
│  ── 🌍 Mundo ─────────────────────────────────────────   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────┐ │
│  │ 👥 Jogad. │  │ 🧑 NPCs   │  │ 🗺️ Locais │  │ 🏴   │ │
│  │  5 player │  │  12 total │  │  3 locais │  │Facç. │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────┘ │
│                                                          │
│  ── 📋 Registro ──────────────────────────────────────   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ 📝 Notas  │  │ 💼 Invent.│  │ 🌐 Mapa   │           │
│  │  8 notas  │  │ do Grupo  │  │ Mental    │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Estado 2: Focus View (`/campaigns/[id]?section=npcs`)

O DM clicou num card. Hero compacta, nav bar aparece, seção ocupa full-width.

```
┌─────────────────────────────────────────────────────────┐
│  HERO COMPACTO (1 linha)                                 │
│  ← Dashboard  ⚔️ KRYNN · [🟢][🟢][🔴][⚪][⚪] · S5   │
├─────────────────────────────────────────────────────────┤
│  NAV BAR (sticky top)                                    │
│  [📋 Overview] [⚔️ Encontros] [📜 Quests] [👥 Jogad.] │
│  [🧑 NPCs●] [📝 Notas] [🗺️ Locais] [🏴 Facções]      │
│  [💼 Inventário] [🌐 Mapa]                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🧑 NPCs                                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │  (NpcList component — UNCHANGED, full width)        ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Estado 3: Campanha Vazia (onboarding)

```
┌─────────────────────────────────────────────────────────┐
│  HERO SECTION (mesma estrutura, dados zerados)           │
│  ⚔️ KRYNN · Campanha nova                               │
│  [+ Convidar primeiro jogador]                           │
│                                                          │
│  Status Cards com CTA:                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ 👥 0 Jogad.  │ │ ⚔️ 0 Encont. │ │ 📜 0 Quests  │    │
│  │ [Convidar +] │ │ [Criar +]    │ │ [Adicionar+] │    │
│  │  Passo 1/3   │ │  Passo 2/3   │ │  Passo 3/3   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  (Grid de seções NÃO aparece — KPIs são o onboarding)   │
└─────────────────────────────────────────────────────────┘
```

### Estado 4: Mobile

```
┌──────────────────────┐
│ ← Dashboard    🔔    │
├──────────────────────┤
│ ⚔️ KRYNN             │
│ S5 · Última: 2 dias  │
│ [🟢][🟢][🔴][⚪][⚪]│
│                      │
│ ┌──────────────────┐ │
│ │ 🔴 SESSÃO ATIVA  │ │
│ │ "Caverna" → Ir   │ │
│ └──────────────────┘ │
│ [⚔️ Combate] [+ Enc]│
├──────────────────────┤
│ ⚡ Operacional        │
│ ┌──────┐ ┌──────┐   │
│ │⚔️ 3  │ │📜 5  │   │
│ └──────┘ └──────┘   │
│ 🌍 Mundo             │
│ ┌──────┐ ┌──────┐   │
│ │👥 5  │ │🧑 12 │   │
│ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐   │
│ │🗺️ 3  │ │🏴 2  │   │
│ └──────┘ └──────┘   │
│ 📋 Registro          │
│ ┌──────┐ ┌──────┐   │
│ │📝 8  │ │💼    │   │
│ └──────┘ └──────┘   │
│ ┌──────┐             │
│ │🌐    │             │
│ └──────┘             │
└──────────────────────┘
```

Focus view mobile: nav bar = scrollable horizontal pills, seção full-width abaixo.

---

## Design Language

### Typography
- Campaign name: `text-3xl font-bold tracking-tight text-foreground`
- Section group headers: `text-xs font-medium text-muted-foreground uppercase tracking-wider`
- Card titles: `text-sm font-semibold text-foreground`
- Card subtitles/flavor: `text-xs text-muted-foreground`
- KPI numbers: `text-2xl font-bold text-amber-400`

### Player Avatars
- Circle: `w-10 h-10 rounded-full`
- Background: `bg-amber-500/20`
- Ring: `ring-2` com cor por status (emerald online, amber idle, border offline)
- Initials: `font-bold text-sm text-amber-400`
- With token: `object-cover rounded-full`
- Hover: `scale-105 transition-transform`
- Below: name truncado `text-[10px] text-muted-foreground`
- Click: **popover** com HP bar, AC, classe, nível, link "Editar →"

### Status Cards (KPI)
- Container: `bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-4`
- Hover: `hover:border-amber-500/30 hover:bg-white/[0.06] transition-all`
- Sessão ativa: `border-amber-500/50 bg-amber-500/10` + pulsing dot
- Clicável: navigates to `?section=X` ou abre dialog
- Zerado com CTA: mostra botão "+ Ação" e step counter

### Section Cards (Grid)
- Card: `bg-card border border-border/60 rounded-xl p-4`
- Hover: `hover:border-amber-500/30 hover:shadow-sm transition-all cursor-pointer`
- Ícone: `text-amber-400 w-5 h-5`
- Operacionais: `col-span-1` grid, maiores (mais padding, flavor text)
- Worldbuilding: grid 4 cols desktop, mais compactos
- Registro: grid 3 cols desktop, compactos
- Click: `router.push(?section=X)` via shallow navigation

### Nav Bar (Focus View)
- Container: `sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 py-2 px-4`
- Pills: mesma estilização dos encounter sub-tabs (pill buttons)
- Active: `border-amber-500 text-amber-400 bg-amber-500/10`
- Scroll horizontal em mobile: `overflow-x-auto flex gap-1`

### Hero Compacto (Focus View)
- 1 linha: nome da campanha + avatares mini (`w-6 h-6`) + sessão badge
- Background: `bg-card border-b border-border`

---

## Seções e seus Dados

Cada card no grid mostra informações SERVER-RENDERED:

| Seção | ID | Ícone | Contagem | Flavor Text | Componente Interno |
|-------|----|-------|----------|-------------|-------------------|
| Encontros | `encounters` | Swords | `finishedEncounterCount` + presets | Último encontro nome | `CampaignEncounterBuilder` + `EncounterHistory` |
| Quests | `quests` | ScrollText | `questCount` (ativas) | Nome da quest mais recente | `QuestBoard` |
| Jogadores | `players` | Users | `playerCount` | — | `PlayerCharacterManager` |
| NPCs | `npcs` | UserCircle | `npcCount` | — | `NpcList` |
| Locais | `locations` | MapPin | `locationCount` | — | `LocationList` |
| Facções | `factions` | Flag | `factionCount` | — | `FactionList` |
| Notas | `notes` | FileText | `noteCount` | — | `CampaignNotes` |
| Inventário | `inventory` | Package | — | — | `BagOfHolding` |
| Mapa Mental | `mindmap` | Network | — | — | `CampaignMindMap` |

**NENHUM componente interno é modificado.** Apenas o container/layout muda.

---

## Mudanças em Arquivos

### Arquivos NOVOS

| Arquivo | Tipo | Propósito |
|---------|------|-----------|
| `app/app/campaigns/[id]/CampaignHero.tsx` | Server Component | Hero section com nome, subtítulo, avatares (server), KPIs, quick actions |
| `app/app/campaigns/[id]/CampaignGrid.tsx` | Client Component | Grid de cards compactos agrupados (Overview) |
| `app/app/campaigns/[id]/CampaignFocusView.tsx` | Client Component | Nav bar sticky + renderização da seção selecionada |
| `components/campaign/CampaignPlayerAvatars.tsx` | Client Component | Avatares com popover (hover/click para mini-stats) |
| `components/campaign/CampaignNavBar.tsx` | Client Component | Barra horizontal de pills para trocar seção |
| `components/campaign/CampaignGridCard.tsx` | Client Component | Card individual com ícone, contagem, flavor, click handler |
| `components/campaign/CampaignHeroCompact.tsx` | Client Component | Hero compacto para Focus View (1 linha) |
| `components/campaign/CampaignStatusCards.tsx` | Client Component | KPI cards com lógica de onboarding integrada |

### Arquivos que MUDAM

| Arquivo | Mudança |
|---------|---------|
| `app/app/campaigns/[id]/page.tsx` | Refatora DM View: roteamento Overview vs Focus via searchParams, novo layout |
| `messages/pt-BR.json` | Novas chaves i18n (group headers, KPI labels, nav labels, flavor) |
| `messages/en.json` | Novas chaves i18n (mesmas chaves, tradução EN) |

### Arquivos DEPRECIADOS (remover na F5)

| Arquivo | Motivo |
|---------|--------|
| `app/app/campaigns/[id]/CampaignSections.tsx` | Substituído por CampaignGrid + CampaignFocusView |
| `components/campaign/CampaignQuickActions.tsx` | Quick actions integradas no CampaignHero |
| `components/campaign/CampaignCombatTriggers.tsx` | Split: stats → StatusCards, combat → Hero |
| `components/campaign/CampaignOnboarding.tsx` | Onboarding integrado nos StatusCards (KPIs zerados = CTA) |

### Arquivos que NÃO MUDAM

- `PlayerCharacterManager.tsx` — renderizado dentro de Focus View
- `CampaignEncounterBuilder.tsx` — renderizado dentro de Focus View
- `EncounterHistory.tsx` — renderizado dentro de Focus View
- `NpcList.tsx`, `QuestBoard.tsx`, `LocationList.tsx`, `FactionList.tsx`
- `CampaignNotes.tsx`, `CampaignMindMap.tsx`, `BagOfHolding.tsx`
- `CampaignStatsBar.tsx` — mantido, apenas reposicionado
- `PlayerCampaignView.tsx` — Player View fora de escopo
- `InvitePlayerDialog.tsx`, `CombatLaunchSheet.tsx` — reutilizados

---

## i18n — Chaves Novas

```json
{
  "campaign": {
    "hub_subtitle_session": "Sessão {number}",
    "hub_subtitle_last": "Última sessão: {days}",
    "hub_subtitle_new": "Campanha nova",
    "hub_group_operational": "Operacional",
    "hub_group_world": "Mundo",
    "hub_group_journal": "Registro",
    "hub_nav_overview": "Visão Geral",
    "hub_card_encounters": "Encontros",
    "hub_card_quests": "Quests",
    "hub_card_players": "Jogadores",
    "hub_card_npcs": "NPCs",
    "hub_card_locations": "Locais",
    "hub_card_factions": "Facções",
    "hub_card_notes": "Notas",
    "hub_card_inventory": "Inventário do Grupo",
    "hub_card_mindmap": "Mapa Mental",
    "hub_card_empty": "Nenhum ainda",
    "hub_card_active_quests": "{count} {count, plural, one {ativa} other {ativas}}",
    "hub_card_prepared": "{count} {count, plural, one {preparado} other {preparados}}",
    "hub_kpi_session_active": "Sessão Ativa",
    "hub_kpi_session_enter": "Continuar →",
    "hub_kpi_encounters": "Encontros",
    "hub_kpi_quests": "Quests Ativas",
    "hub_onboard_step": "Passo {current}/{total}",
    "hub_onboard_invite_cta": "Convidar",
    "hub_onboard_encounter_cta": "Criar",
    "hub_onboard_quest_cta": "Adicionar",
    "hub_avatar_online": "Online",
    "hub_avatar_idle": "Ausente",
    "hub_avatar_offline": "Offline",
    "hub_avatar_edit": "Editar personagem"
  }
}
```

---

## Fora de Escopo (Bucket)

- Player View redesign (ticket separado)
- Presença real-time via Supabase Presence (fase futura — avatars são estáticos na v2)
- Cover image / banner personalizado da campanha
- Atividade recente (timeline)
- Sessão agendável com data/hora
- Notificações push por seção
- Drag-and-drop pra reordenar cards

---

## Critérios de Aceite

### Hero
- [ ] Nome da campanha em `text-3xl font-bold`
- [ ] Subtítulo contextual (sessão ativa / última sessão / campanha nova)
- [ ] Avatares dos jogadores inline com initial/foto + nome + classe
- [ ] Popover no avatar com HP, AC, classe, nível
- [ ] KPI cards clicáveis (sessão ativa, encontros, quests)
- [ ] KPIs zerados viram CTA de onboarding (substitui CampaignOnboarding)
- [ ] Quick actions (Novo Combate, Novo Encontro, Nova Nota)
- [ ] Sessão ativa como card dominante com pulsing dot

### Grid (Overview)
- [ ] Cards agrupados: Operacional (2 cols), Mundo (4 cols), Registro (3 cols)
- [ ] Section group headers (texto uppercase sutil)
- [ ] Cada card mostra ícone + título + contagem + flavor text
- [ ] Click no card navega para `?section=X`
- [ ] Responsivo: desktop 2-4 cols → mobile 2 cols
- [ ] Campanha vazia: grid não aparece, KPIs com onboarding dominam

### Focus View
- [ ] Hero compacta para 1 linha
- [ ] Nav bar sticky horizontal com todas as seções + "Overview"
- [ ] Seção ativa renderizada full-width
- [ ] Lazy loading via Suspense boundary
- [ ] Deep linking: `?section=encounters` abre direto
- [ ] Browser back funciona (URL state)
- [ ] Mobile: nav bar com scroll horizontal

### Performance
- [ ] Overview: < 1s load (apenas contagens SSR, sem dados pesados)
- [ ] Focus View: < 2s load com skeleton placeholder
- [ ] Build passa sem erros TypeScript

### Não-regressão
- [ ] Nenhum componente interno de seção modificado
- [ ] Player View inalterada
- [ ] CombatLaunchSheet e InvitePlayerDialog funcionam
- [ ] Mobile responsivo em todos os estados
