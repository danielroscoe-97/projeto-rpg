# Epic: Player Mind Map — "O Mapa do Aventureiro"

**Projeto:** Pocket DM
**Autor:** BMAD Party (PM + Architect + UX + SM + Dev + QA)
**Data:** 2026-04-03
**Status:** Aprovado para execucao
**Dependencia:** Epic Mind Map (`docs/epic-mind-map.md`) Fases 1-4 — **JA IMPLEMENTADO**
**Dependencia:** Epic Player HQ (`docs/epic-player-hq.md`) — **JA IMPLEMENTADO**

---

## 0. Estado Atual — Inventario do Que Ja Existe

### Mind Map do DM (100% implementado)

| Componente | Arquivo | Linhas | Status |
|---|---|---|---|
| CampaignMindMap | `components/campaign/CampaignMindMap.tsx` | 799 | Producao |
| CampaignNode | `components/campaign/nodes/CampaignNode.tsx` | 30 | Producao |
| NpcNode | `components/campaign/nodes/NpcNode.tsx` | 69 | Producao |
| NoteNode | `components/campaign/nodes/NoteNode.tsx` | 91 | Producao |
| PlayerNode | `components/campaign/nodes/PlayerNode.tsx` | 38 | Producao |
| SessionNode | `components/campaign/nodes/SessionNode.tsx` | 45 | Producao |
| QuestNode | `components/campaign/nodes/QuestNode.tsx` | 57 | Producao |
| LocationNode | `components/campaign/nodes/LocationNode.tsx` | 66 | Producao |
| FactionNode | `components/campaign/nodes/FactionNode.tsx` | 60 | Producao |
| BagNode | `components/campaign/nodes/BagNode.tsx` | 38 | Producao |

**Features implementadas:**
- 8 tipos de node com visual distinto
- 13 tipos de edge com cores por relacionamento
- Layout Dagre hierarquico (TB, 60px node sep, 100px rank sep)
- Persistencia de posicao por node (`campaign_mind_map_layout`)
- Filtros toggle por tipo de node
- MiniMap color-coded
- Drag-to-connect edges
- Right-click context menu

### Player HQ (100% implementado)

| Componente | Arquivo | Status |
|---|---|---|
| PlayerHqShell (5 tabs) | `components/player-hq/PlayerHqShell.tsx` | Producao |
| CharacterStatusPanel | `components/player-hq/CharacterStatusPanel.tsx` | Producao |
| CharacterCoreStats | `components/player-hq/CharacterCoreStats.tsx` | Producao |
| HpDisplay | `components/player-hq/HpDisplay.tsx` | Producao |
| ConditionBadges | `components/player-hq/ConditionBadges.tsx` | Producao |
| SpellSlotsHq + SpellListSection | `components/player-hq/Spell*.tsx` | Producao |
| ResourceTrackerList + ResourceDots | `components/player-hq/Resource*.tsx` | Producao |
| BagOfHolding + AddItemForm | `components/player-hq/BagOf*.tsx` | Producao |
| PlayerQuestBoard + PlayerQuestCard | `components/player-hq/PlayerQuest*.tsx` | Producao |
| PlayerNotesSection (Quick/Journal/NPC) | `components/player-hq/PlayerNotesSection.tsx` | Producao |
| QuickNotesList | `components/player-hq/QuickNotesList.tsx` | Producao |
| JournalEntryCard | `components/player-hq/JournalEntryCard.tsx` | Producao |
| NpcJournal + NpcCard | `components/player-hq/Npc*.tsx` | Producao |

**23 componentes, 3.464 linhas, tudo production-ready.**

### Visibility Flags no Banco

| Entidade | Flag | Coluna DB | Toggle DM | RLS | Mind Map Visual |
|---|---|---|---|---|---|
| NPC | Visivel ao player | `campaign_npcs.is_visible_to_players` | ✅ NpcForm.tsx | ✅ | ⚠️ Parcial (borda pontilhada, sem "???") |
| Location | Descoberta | `campaign_locations.is_discovered` | ✅ LocationList.tsx | ✅ | ✅ Completo ("???" + borda tracejada) |
| Faction | Visivel ao player | `campaign_factions.is_visible_to_players` | ✅ FactionList.tsx | ✅ | ❌ Nao implementado no node |
| Quest | Visivel ao player | **NAO EXISTE** | ❌ | ❌ | ❌ |
| Notes | Compartilhada | `campaign_notes.is_shared` | ✅ NoteForm | ✅ | ✅ (icone cadeado/olho) |
| Sessions | Publico | — | N/A | ✅ | ✅ (sempre visivel) |
| Bag of Holding | Compartilhado | — | N/A | ✅ | ✅ (sempre visivel) |

### GAP PRINCIPAL: Quests nao tem `is_visible_to_players`

---

## 1. Visao do Produto

### O Problema

O player hoje tem um HQ com 5 tabs — funcional, mas **flat**. Listas de quests, listas de NPCs, listas de notas. Nao existe **conexao visual** entre as entidades. O DM tem um mind map poderoso que mostra relacoes; o player nao.

### A Solucao

O **Player Mind Map** e uma versao filtrada do mind map do DM que mostra a campanha **do ponto de vista do jogador**, respeitando fog of war. Ele transforma a experiencia de "listas soltas" em uma **rede visual conectada** onde o player pode navegar entre NPCs, quests, locations e suas proprias notas.

### Jobs-to-be-Done

| Job | Quando | Solucao |
|---|---|---|
| "O que tava acontecendo?" | Entre sessoes | Mind map com todas as conexoes visiveis |
| "Quem era aquele NPC?" | Revisao pos-sessao | Click no node → drawer com notas pessoais |
| "Onde fica aquele lugar?" | Planejamento | Locations descobertas com descricao |
| "Tem algo novo na campanha?" | Abertura do app | "NEW" badges em nodes recem-revelados |
| "Quero anotar algo rapido" | Durante/apos sessao | Pins pessoais no mind map |

### Principios de Design

1. **Fog of War de verdade** — Nodes ocultos nao sao "labels escondidos", sao convites pra explorar
2. **Explorar, nao planejar** — O DM usa o mind map pra planejamento; o player pra recall e exploracao
3. **Read-only com notas pessoais** — Player nao move nodes nem cria edges, mas adiciona pins privados
4. **Seguranca first** — Dados filtrados server-side (RPC), nao client-side
5. **Animacao sutil** — Reveal com pulse dourado, nao confetti

---

## 2. Modelo de Dados (Migrations)

### Migration 085 — Quest Visibility

```sql
-- 085_campaign_quests_visibility.sql

-- Adicionar flag de visibilidade para quests
ALTER TABLE campaign_quests
  ADD COLUMN IF NOT EXISTS is_visible_to_players BOOLEAN NOT NULL DEFAULT true;

-- Comentario
COMMENT ON COLUMN campaign_quests.is_visible_to_players IS
  'DM controla se quest aparece no mind map e quest board do player';

-- Atualizar RLS: players so veem quests visiveis
DROP POLICY IF EXISTS "Members can view quests" ON campaign_quests;
CREATE POLICY "Members can view quests" ON campaign_quests
  FOR SELECT USING (
    -- DM ve tudo
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_quests.campaign_id
      AND c.owner_id = auth.uid()
    )
    OR
    -- Player ve so visiveis
    (
      is_visible_to_players = true
      AND EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = campaign_quests.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'accepted'
      )
    )
  );
```

### Migration 086 — Player Mind Map Pins

```sql
-- 086_player_mind_map_pins.sql

CREATE TABLE player_mind_map_pins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  label               TEXT NOT NULL DEFAULT '',
  note                TEXT NOT NULL DEFAULT '',
  color               TEXT NOT NULL DEFAULT 'amber',
  attached_to_node    TEXT,  -- formato: 'npc:uuid', 'quest:uuid' (null = pin flutuante)
  position_x          DOUBLE PRECISION,
  position_y          DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pins_character ON player_mind_map_pins(player_character_id);
CREATE INDEX idx_pins_campaign ON player_mind_map_pins(campaign_id);

ALTER TABLE player_mind_map_pins ENABLE ROW LEVEL SECURITY;

-- Player so ve/edita os proprios pins
CREATE POLICY pins_owner ON player_mind_map_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_mind_map_pins.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_mind_map_pins.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

-- DM pode ver pins de todos os players (opcional, pra insight)
CREATE POLICY pins_dm_read ON player_mind_map_pins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = player_mind_map_pins.campaign_id
      AND c.owner_id = auth.uid()
    )
  );
```

### Migration 087 — Player Node View Tracking (para "NEW" badges)

```sql
-- 087_player_node_views.sql

CREATE TABLE player_node_views (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  node_key            TEXT NOT NULL,  -- formato: 'npc:uuid', 'location:uuid'
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_character_id, node_key)
);

CREATE INDEX idx_node_views_character ON player_node_views(player_character_id);

ALTER TABLE player_node_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY node_views_owner ON player_node_views
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_node_views.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_node_views.player_character_id
      AND pc.user_id = auth.uid()
    )
  );
```

### RPC Function — get_player_visible_nodes

```sql
-- 088_rpc_player_visible_nodes.sql

CREATE OR REPLACE FUNCTION get_player_visible_nodes(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN;
BEGIN
  -- Verificar membership
  SELECT EXISTS(
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = v_user_id
    AND status = 'accepted'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN '{"error": "not_member"}'::JSONB;
  END IF;

  SELECT jsonb_build_object(
    'npcs', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'is_alive', is_alive
      )), '[]'::JSONB)
      FROM campaign_npcs
      WHERE campaign_id = p_campaign_id AND is_visible_to_players = true
    ),
    'locations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', CASE WHEN is_discovered THEN name ELSE '???' END,
        'location_type', location_type,
        'description', CASE WHEN is_discovered THEN description ELSE '' END,
        'is_discovered', is_discovered
      )), '[]'::JSONB)
      FROM campaign_locations
      WHERE campaign_id = p_campaign_id
    ),
    'factions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'alignment', alignment
      )), '[]'::JSONB)
      FROM campaign_factions
      WHERE campaign_id = p_campaign_id AND is_visible_to_players = true
    ),
    'quests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status
      )), '[]'::JSONB)
      FROM campaign_quests
      WHERE campaign_id = p_campaign_id AND is_visible_to_players = true
    ),
    'notes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'note_type', note_type
      )), '[]'::JSONB)
      FROM campaign_notes
      WHERE campaign_id = p_campaign_id AND is_shared = true
    ),
    'sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'is_active', s.is_active
      )), '[]'::JSONB)
      FROM sessions s
      WHERE s.campaign_id = p_campaign_id
    ),
    'bag_items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'item_name', item_name, 'quantity', quantity
      )), '[]'::JSONB)
      FROM party_inventory_items
      WHERE campaign_id = p_campaign_id AND status = 'active'
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cm.id, 'user_id', cm.user_id,
        'character_name', pc.name, 'character_id', pc.id
      )), '[]'::JSONB)
      FROM campaign_members cm
      LEFT JOIN player_characters pc ON pc.campaign_id = p_campaign_id AND pc.user_id = cm.user_id
      WHERE cm.campaign_id = p_campaign_id AND cm.status = 'accepted'
    ),
    'edges', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'source_type', source_type, 'source_id', source_id,
        'target_type', target_type, 'target_id', target_id,
        'relationship', relationship, 'custom_label', custom_label
      )), '[]'::JSONB)
      FROM campaign_mind_map_edges
      WHERE campaign_id = p_campaign_id
    ),
    'layout', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'node_key', node_key, 'x', x, 'y', y, 'is_collapsed', is_collapsed
      )), '[]'::JSONB)
      FROM campaign_mind_map_layout
      WHERE campaign_id = p_campaign_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

> **NOTA sobre edge filtering:** A RPC retorna TODOS os edges. O client-side filtra edges onde ambos os nodes source/target estao no set de nodes visiveis. Isso e seguro porque os dados dos nodes ja estao filtrados — o edge sozinho nao revela informacao (so IDs).

---

## 3. Arquitetura de Componentes

### Hierarquia

```
PlayerHqShell.tsx (existente, adicionar tab "Map")
├─ Tab: Map (NOVO — posicao 0, primeiro tab)
│   └─ PlayerMindMap.tsx (NOVO)
│       ├─ Reutiliza todos os Node components existentes
│       ├─ Adiciona PinNode.tsx (NOVO)
│       ├─ Props: readOnly=true, playerView=true
│       ├─ Data source: RPC get_player_visible_nodes()
│       ├─ Edge filtering: client-side (ambos nodes visiveis)
│       ├─ Layout: read-only do DM (campaign_mind_map_layout)
│       └─ Click handlers → Drawer components
│
├─ Tab: Sheet (existente)
├─ Tab: Resources (existente)
├─ Tab: Inventory (existente)
├─ Tab: Notes (existente)
└─ Tab: Quests (existente)

Drawer Components (NOVOS):
├─ PlayerNpcDrawer.tsx — Nome + notas pessoais do player
├─ PlayerQuestDrawer.tsx — Quest details + nota pessoal + favorito
├─ PlayerLocationDrawer.tsx — Descricao (se discovered)
├─ PlayerFactionDrawer.tsx — Nome + alignment + notas
├─ PlayerSessionDrawer.tsx — Resumo da sessao
└─ PlayerPinDrawer.tsx — Editar/deletar pin pessoal
```

### Novos Componentes

| Componente | Responsabilidade | Estimativa |
|---|---|---|
| `PlayerMindMap.tsx` | Wrapper read-only sobre CampaignMindMap com fog of war | ~300 linhas |
| `PinNode.tsx` | Node de pin pessoal (StickyNote icon, cor customizavel) | ~50 linhas |
| `PlayerNpcDrawer.tsx` | Drawer lateral com info do NPC + notas do player | ~120 linhas |
| `PlayerQuestDrawer.tsx` | Drawer com quest details + nota pessoal | ~120 linhas |
| `PlayerLocationDrawer.tsx` | Drawer com descricao da location | ~80 linhas |
| `PlayerFactionDrawer.tsx` | Drawer com info da faction | ~80 linhas |
| `PlayerSessionDrawer.tsx` | Drawer com resumo da sessao | ~80 linhas |
| `PlayerPinDrawer.tsx` | Drawer de edicao/delecao de pin | ~100 linhas |
| `NewBadge.tsx` | Badge "NEW" reutilizavel com auto-dismiss | ~30 linhas |

### Hooks Novos

| Hook | Responsabilidade |
|---|---|
| `usePlayerMindMap(campaignId)` | Fetch via RPC + edge filtering + realtime sub |
| `usePlayerPins(characterId, campaignId)` | CRUD de pins pessoais |
| `useNodeViews(characterId)` | Track/query "NEW" status de nodes |

---

## 4. Wireframes Textuais

### Player Mind Map (Tab principal)

```
┌─────────────────────────────────────────────────────────┐
│  [Map*] [Sheet] [Resources] [Inventory] [Notes] [Quests]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filter: [NPC ●] [Quest ●] [Location ●] [Faction ●]   │
│          [Session ○] [Bag ○] [Pins ●]                  │
│                                                         │
│  ┌──────────────────────────────────────────────┐       │
│  │                                              │       │
│  │        ┌──────────┐                          │       │
│  │        │ 👑       │                          │       │
│  │        │ Campaign │                          │       │
│  │        │  Name    │                          │       │
│  │        └─────┬────┘                          │       │
│  │         ╱    │    ╲                          │       │
│  │   ┌────┴──┐ │ ┌──┴─────┐                    │       │
│  │   │ 👤    │ │ │ 🎯 NEW │                    │       │
│  │   │ Elara │ │ │ Find   │                    │       │
│  │   │       │ │ │ Dragon │                    │       │
│  │   └───────┘ │ └────────┘                    │       │
│  │             │                               │       │
│  │       ┌─────┴─────┐    ┌──────────┐         │       │
│  │       │ 📍        │    │ 📍       │         │       │
│  │       │ Ironforge  │───│  ???     │         │       │
│  │       │           │    │ ┈┈┈┈┈┈┈ │         │       │
│  │       └───────────┘    └──────────┘         │       │
│  │                                              │       │
│  │   ┌─────────┐   📌 "Investigar isso"        │       │
│  │   │ 🚩     │    (pin pessoal)               │       │
│  │   │ Guild  │                                 │       │
│  │   │ ally   │                                 │       │
│  │   └────────┘                                 │       │
│  │                              [MiniMap]       │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│  [+ Add Pin]                                            │
└─────────────────────────────────────────────────────────┘
```

### Drawer (click em NPC node)

```
┌───────────────────────────────────────────┐
│  Mind Map                    │  NPC Detail │
│                              │             │
│  (mapa ao fundo, dimmed)     │  👤 Elara   │
│                              │  ──────────│
│                              │             │
│                              │  Relacao:   │
│                              │  [Ally ▾]   │
│                              │             │
│                              │  Suas notas:│
│                              │  ┌─────────┐│
│                              │  │ Elara   ││
│                              │  │ nos deu ││
│                              │  │ a quest ││
│                              │  │ do drag ││
│                              │  └─────────┘│
│                              │             │
│                              │  [Salvar]   │
│                              │  [Fechar]   │
│                              │             │
└──────────────────────────────┴─────────────┘
```

### Fog of War — Location "???"

```
┌─────────────────┐     ┌─────────────────┐
│ 📍 Ironforge    │     │ ❓  ???          │
│ city            │     │ ┈ ┈ ┈ ┈ ┈ ┈ ┈  │
│ ─────────────── │     │  (borda tracejada│
│ (borda solida,  │     │   opacity 30%,   │
│  cyan brilhante)│     │   texto italico) │
└─────────────────┘     └─────────────────┘
   DISCOVERED              UNDISCOVERED
```

### Reveal Animation

```
Node "???" → DM marca is_discovered = true

Frame 1: Node ainda mostra "???"
Frame 2: Pulse dourado (ring amber-400, scale 1.05, 600ms)
Frame 3: Fade do "???" → nome real (300ms crossfade)
Frame 4: Badge "NEW" aparece (amber glow, persiste 48h)
Frame 5: Node estavel com badge "NEW"

(Click no node remove badge imediatamente)
```

---

## 5. User Stories

### Fase 0 — Completar Controles DM (Pre-requisito)

#### F0-S1: Migration quest visibility + RLS
**Como** DM, **quero** poder controlar quais quests sao visiveis pros players **para** criar fog of war narrativo.

**Acceptance Criteria:**
- [ ] Migration 085 aplicada: `is_visible_to_players` em `campaign_quests` (default: `true`)
- [ ] RLS atualizado: players so veem quests com `is_visible_to_players = true`
- [ ] DM continua vendo todas as quests
- [ ] Quests existentes migram com `is_visible_to_players = true` (sem breaking change)

**Estimativa:** P (2h)
**Trilha:** W1 (Backend)

---

#### F0-S2: Toggle de visibility no QuestBoard do DM
**Como** DM, **quero** um toggle de olho em cada quest no QuestBoard **para** controlar o que os players veem.

**Acceptance Criteria:**
- [ ] Icone Eye/EyeOff em cada quest card (mesmo padrao de LocationList e FactionList)
- [ ] Click no icone togga `is_visible_to_players`
- [ ] Quest oculta mostra opacity reduzida na lista do DM
- [ ] i18n: labels em pt-BR e en

**Estimativa:** P (2h)
**Trilha:** W2 (Frontend)

---

#### F0-S3: Visual de visibility no Mind Map do DM
**Como** DM, **quero** ver no mind map quais nodes estao ocultos pros players **para** ter controle visual do fog of war.

**Acceptance Criteria:**
- [ ] NpcNode: quando `isHidden=true`, mostrar "???" alem da borda pontilhada (alinhar com LocationNode)
- [ ] QuestNode: quando `isHidden=true`, mostrar borda tracejada + opacity 50%
- [ ] FactionNode: quando `isHidden=true`, mostrar borda tracejada + opacity 50%
- [ ] CampaignMindMap.tsx: passar `isHidden` prop baseado nos flags de visibility
- [ ] Legenda visual no filter bar indicando "nodes sombreados = ocultos pro player"

**Estimativa:** M (4h)
**Trilha:** W2 (Frontend)

---

### Fase 1 — Player Mind Map Core

#### F1-S1: RPC function get_player_visible_nodes
**Como** sistema, **quero** uma RPC function no Supabase que retorna apenas nodes visiveis ao player **para** garantir fog of war server-side.

**Acceptance Criteria:**
- [ ] Migration 088 com a function `get_player_visible_nodes`
- [ ] Verifica membership do caller
- [ ] NPCs filtrados por `is_visible_to_players = true`
- [ ] Locations: retorna todas, mas com name="???" e description="" quando `is_discovered = false`
- [ ] Factions filtradas por `is_visible_to_players = true`
- [ ] Quests filtradas por `is_visible_to_players = true`
- [ ] Notes filtradas por `is_shared = true`
- [ ] Sessions, Bag items, Members: retorna todos (publicos)
- [ ] Edges: retorna todos (filtering client-side)
- [ ] Layout: retorna todas as posicoes do DM
- [ ] Retorna erro se user nao e member

**Estimativa:** M (4h)
**Trilha:** W1 (Backend)

---

#### F1-S2: Hook usePlayerMindMap
**Como** desenvolvedor, **quero** um hook que busca dados do mind map filtrados e aplica edge filtering **para** alimentar o PlayerMindMap component.

**Acceptance Criteria:**
- [ ] `usePlayerMindMap(campaignId)` chama RPC `get_player_visible_nodes`
- [ ] Converte resposta JSONB em ReactFlow nodes e edges
- [ ] Filtra edges: so mostra edge se AMBOS source e target estao no set de nodes visiveis
- [ ] Aplica posicoes do DM (layout read-only)
- [ ] Fallback Dagre layout se posicao nao salva
- [ ] Loading state e error handling
- [ ] Realtime subscription em `campaign_npcs`, `campaign_locations`, `campaign_factions`, `campaign_quests` (para is_visible/is_discovered changes)

**Estimativa:** G (6h)
**Trilha:** W1 (Backend/Hook)

---

#### F1-S3: PlayerMindMap.tsx — Componente principal
**Como** player, **quero** ver um mind map da campanha do meu ponto de vista **para** entender as conexoes entre NPCs, quests, locations e factions.

**Acceptance Criteria:**
- [ ] `PlayerMindMap.tsx` como wrapper que reutiliza Node components existentes
- [ ] Props: `campaignId`, `campaignName`, `characterId`
- [ ] Modo read-only: nodes nao sao draggable, sem drag-to-connect
- [ ] Usa dados do `usePlayerMindMap` hook
- [ ] Filter bar com toggles por tipo (mesmo visual do DM, sem opcao de edit)
- [ ] MiniMap color-coded
- [ ] Fit-to-view no mount
- [ ] Fog of war visual: LocationNode com "???" para undiscovered (ja implementado no componente)
- [ ] NpcNode hidden nao aparece (filtrado server-side)
- [ ] Container responsivo (mobile: full-height minus tab bar)

**Estimativa:** G (6h)
**Trilha:** W2 (Frontend)

---

#### F1-S4: Drawer components para click em nodes
**Como** player, **quero** clicar em um node no mind map e ver detalhes + minhas notas pessoais **para** acessar informacao rapidamente por contexto visual.

**Acceptance Criteria:**
- [ ] Click em NPC → `PlayerNpcDrawer`: nome, relacao (do NpcJournal), notas pessoais editaveis
- [ ] Click em Quest → `PlayerQuestDrawer`: titulo, descricao, status, nota pessoal (do PlayerQuestCard), toggle favorito
- [ ] Click em Location → `PlayerLocationDrawer`: nome, tipo, descricao (se discovered), "Nao descoberto" se undiscovered
- [ ] Click em Faction → `PlayerFactionDrawer`: nome, alignment badge, descricao
- [ ] Click em Session → `PlayerSessionDrawer`: nome, status (ativa/encerrada), data
- [ ] Drawer abre da direita, 400px desktop / full-width mobile
- [ ] Drawer tem botao de fechar e click-outside-to-close
- [ ] Reutiliza dados/hooks existentes do PlayerHQ (usePlayerNotes, useNpcJournal, usePlayerQuestBoard)
- [ ] i18n completo

**Estimativa:** G (8h)
**Trilha:** W2 (Frontend)

---

#### F1-S5: Integrar PlayerMindMap como tab no PlayerHqShell
**Como** player, **quero** o mind map como primeira tab do meu HQ **para** ter a visao conectada como landing page.

**Acceptance Criteria:**
- [ ] Nova tab "Map" (Network icon) como posicao 0 no PlayerHqShell
- [ ] Tab order: Map, Sheet, Resources, Inventory, Notes, Quests
- [ ] Map e o tab default quando player abre o HQ
- [ ] PlayerMindMap recebe characterId e campaignId do shell
- [ ] Mobile: mind map ocupa area completa (sem padding extra)
- [ ] Transicao suave entre tabs mantida
- [ ] i18n: "Map" / "Mapa"

**Estimativa:** P (2h)
**Trilha:** W2 (Frontend)

---

### Fase 2 — Interatividade + Realtime

#### F2-S1: Tabela player_mind_map_pins + hook
**Como** player, **quero** adicionar pins pessoais no mind map **para** anotar coisas rapidas ligadas a nodes ou posicoes.

**Acceptance Criteria:**
- [ ] Migration 086 aplicada: `player_mind_map_pins` com RLS
- [ ] `usePlayerPins(characterId, campaignId)` hook com CRUD
- [ ] Pin pode ser "attached" a um node (referencia por node_key) ou "floating" (posicao x,y)
- [ ] Cores disponiveis: amber, blue, green, red, purple (5 opcoes)
- [ ] Max 20 pins por player por campanha

**Estimativa:** M (4h)
**Trilha:** W1 (Backend)

---

#### F2-S2: UI de pins no PlayerMindMap
**Como** player, **quero** ver e interagir com meus pins no mind map **para** navegar minhas anotacoes visualmente.

**Acceptance Criteria:**
- [ ] `PinNode.tsx`: StickyNote icon, cor customizavel, label truncado
- [ ] Botao "+ Add Pin" no canto inferior do mapa
- [ ] Click em area vazia + "Add Pin" = pin flutuante naquela posicao
- [ ] Click em node existente + "Add Pin" = pin attached ao node
- [ ] Click em pin → `PlayerPinDrawer`: editar label, nota, cor, ou deletar
- [ ] Pins aparecem no filter bar como toggle (default: ligado)
- [ ] Pins sao visiveis APENAS pro dono (outros players nao veem)

**Estimativa:** M (4h)
**Trilha:** W2 (Frontend)

---

#### F2-S3: "NEW" badges com tracking
**Como** player, **quero** ver quais nodes sao novos ou mudaram **para** saber o que explorar.

**Acceptance Criteria:**
- [ ] Migration 087 aplicada: `player_node_views` com tracking
- [ ] `useNodeViews(characterId)` hook que tracked "last seen" por node
- [ ] `NewBadge.tsx` componente: badge amber com "NEW", posicionado top-right do node
- [ ] Node ganha badge "NEW" quando:
  - Location muda de `is_discovered = false` para `true`
  - NPC muda de `is_visible_to_players = false` para `true`
  - Quest muda de status
  - Nova quest aparece com `is_visible_to_players = true`
- [ ] Badge desaparece quando player clica no node (upsert em player_node_views)
- [ ] Badge desaparece automaticamente apos 48h (client-side check)

**Estimativa:** M (4h)
**Trilha:** W1 (Backend) + W2 (Frontend)

---

#### F2-S4: Realtime subscriptions
**Como** player, **quero** que o mind map atualize em tempo real quando o DM muda visibilidade **para** ver mudancas sem refresh.

**Acceptance Criteria:**
- [ ] Subscribe em `campaign_npcs` (changes em is_visible_to_players, is_alive)
- [ ] Subscribe em `campaign_locations` (changes em is_discovered)
- [ ] Subscribe em `campaign_factions` (changes em is_visible_to_players)
- [ ] Subscribe em `campaign_quests` (changes em is_visible_to_players, status)
- [ ] Subscribe em `campaign_mind_map_edges` (insert/delete)
- [ ] Node que aparece: fade-in com pulse dourado (300ms)
- [ ] Node que desaparece: fade-out suave (300ms)
- [ ] Edge segue o node (aparece/desaparece junto)
- [ ] Debounce de 500ms pra nao flickar durante edicoes rapidas do DM

**Estimativa:** M (5h)
**Trilha:** W1 (Backend/Hook)

---

#### F2-S5: Animacao de reveal
**Como** player, **quero** ver uma animacao sutil quando algo novo aparece no mapa **para** sentir o momento de descoberta.

**Acceptance Criteria:**
- [ ] Node que era "???" e vira revelado: ring pulse amber-400, scale 1.0→1.05→1.0 (600ms)
- [ ] Crossfade de "???" → nome real (300ms, opacity transition)
- [ ] Badge "NEW" aparece com fade-in (200ms delay apos reveal)
- [ ] Animacoes usam CSS transitions/keyframes (nao JS animation library)
- [ ] Animacoes respeitam `prefers-reduced-motion` (desligam se usuario prefere)
- [ ] Performance: nao causar re-render de todo o mapa (animar so o node afetado)

**Estimativa:** P (3h)
**Trilha:** W2 (Frontend)

---

### Fase 3 — Player HQ Integration

#### F3-S1: Quick access node → secao HQ
**Como** player, **quero** que o drawer de cada node tenha um link direto para a secao relevante do HQ **para** navegar do mapa pro detalhe com 1 click.

**Acceptance Criteria:**
- [ ] Drawer de Quest → botao "Ver no Quest Board" → muda pra tab Quests, scroll ate a quest
- [ ] Drawer de NPC → botao "Ver no Journal" → muda pra tab Notes > NPC tab
- [ ] Drawer de Bag → botao "Ver Inventario" → muda pra tab Inventory
- [ ] Transicao suave entre tabs ao clicar no link
- [ ] Mobile: drawer fecha, tab muda

**Estimativa:** P (3h)
**Trilha:** W2 (Frontend)

---

#### F3-S2: Recap "O que mudou" no Player HQ
**Como** player, **quero** ver um resumo do que mudou na campanha desde minha ultima visita **para** me atualizar rapidamente.

**Acceptance Criteria:**
- [ ] Seção colapsavel no topo do Mind Map tab: "Novidades desde [data]"
- [ ] Lista de mudancas: "Location X descoberta", "Nova quest: Y", "NPC Z apareceu"
- [ ] Dados baseados em `player_node_views.last_seen_at` vs `updated_at` das entidades
- [ ] Max 10 items, ordenados por data desc
- [ ] Botao "Marcar todas como vistas" → atualiza todos os node_views
- [ ] Se nao ha mudancas, nao mostra a seção

**Estimativa:** M (5h)
**Trilha:** W2 (Frontend)

---

## 6. Sprint Planning — 2 Context Windows Paralelas

### Convencoes

- **W1** = Context Window 1 (Backend: migrations, RPC, hooks, realtime)
- **W2** = Context Window 2 (Frontend: componentes, drawers, UI, animacoes)
- **SYNC** = Ponto de sincronizacao (W2 precisa do output de W1)

---

### Sprint 1 — Foundation (DM Controls + RPC + Player Mind Map Core)

```
TIMELINE:
─────────────────────────────────────────────────────────────

W1 (Backend)                    W2 (Frontend)
──────────────────              ──────────────────
F0-S1: Migration 085            F0-S2: Quest visibility toggle
  quest visibility                no QuestBoard do DM
  + RLS update                    (Eye/EyeOff icon)
  [2h]                            [2h]
        │                               │
        ▼                               ▼
F1-S1: Migration 088            F0-S3: Visual de visibility
  RPC get_player_visible_nodes     no Mind Map do DM
  [4h]                             (NPC/Quest/Faction "???")
        │                              [4h]
        ▼                               │
F1-S2: Hook usePlayerMindMap            │
  + edge filtering                      │
  + realtime sub skeleton               │
  [6h]                                  │
        │                               │
        ├───── SYNC POINT 1 ────────────┤
        │  (W2 precisa do hook pronto)  │
        ▼                               ▼
                                F1-S3: PlayerMindMap.tsx
                                  componente principal
                                  [6h]
                                        │
                                        ▼
                                F1-S4: Drawer components
                                  (NPC, Quest, Location,
                                   Faction, Session)
                                  [8h]
                                        │
                                        ▼
                                F1-S5: Integrar tab no
                                  PlayerHqShell
                                  [2h]

TOTAL W1: ~12h
TOTAL W2: ~22h
SYNC POINTS: 1
```

**Deliverable Sprint 1:** Player Mind Map funcional com fog of war, read-only, drawers, como primeira tab do HQ.

---

### Sprint 2 — Interactivity (Pins + Badges + Realtime + Animation)

```
TIMELINE:
─────────────────────────────────────────────────────────────

W1 (Backend)                    W2 (Frontend)
──────────────────              ──────────────────
F2-S1: Migrations 086+087       F2-S5: Animacao de reveal
  pins + node_views               (CSS keyframes, pulse
  + hooks (usePlayerPins,          dourado, crossfade)
    useNodeViews)                  [3h]
  [4h]                                  │
        │                               │
        ▼                               │
F2-S4: Realtime subscriptions           │
  (visibility changes,                  │
   edge changes, debounce)              │
  [5h]                                  │
        │                               │
        ├───── SYNC POINT 2 ────────────┤
        │                               │
        ▼                               ▼
F2-S3: "NEW" badges logic       F2-S2: UI de pins
  (tracking + auto-dismiss)       (PinNode, Add Pin flow,
  [4h — split W1+W2]             PinDrawer)
                                  [4h]
                                        │
                                        ▼
                                F3-S1: Quick access
                                  node → secao HQ
                                  [3h]
                                        │
                                        ▼
                                F3-S2: Recap "O que mudou"
                                  [5h]

TOTAL W1: ~13h
TOTAL W2: ~15h
SYNC POINTS: 1
```

**Deliverable Sprint 2:** Pins pessoais, "NEW" badges, realtime updates, animacao de reveal, recap de mudancas.

---

## 7. Regras de Paridade (Guest / Anon / Auth)

| Feature | Guest (`/try`) | Anonimo (`/join`) | Autenticado |
|---|---|---|---|
| Player Mind Map | NAO | NAO | SIM |
| Pins pessoais | NAO | NAO | SIM |
| "NEW" badges | NAO | NAO | SIM |
| Drawers com notas | NAO | NAO | SIM |
| Realtime updates | NAO | NAO | SIM |
| Mind Map do DM | NAO | NAO | SIM (DM only) |
| DM visibility toggles | SIM (Guest DM) | NAO | SIM (DM only) |

> **NOTA:** Player Mind Map e 100% Auth-only — requer conta + membership em campanha + personagem criado. Guest mode nao tem campanhas. Anon mode (`/join`) e combat-only.
> **EXCECAO:** F0-S2 e F0-S3 (DM visibility controls) devem funcionar no Guest Combat se o DM usa mind map no modo guest — MAS o mind map so existe pra campanhas, entao na pratica e Auth-only tambem.

---

## 8. Dependencias Tecnicas

### Migrations (ordem)

```
085_campaign_quests_visibility.sql     ← Fase 0 (pre-requisito)
086_player_mind_map_pins.sql           ← Fase 2
087_player_node_views.sql              ← Fase 2
088_rpc_player_visible_nodes.sql       ← Fase 1 (pode rodar apos 085)
```

> **NOTA:** Usar proximo numero disponivel na hora de implementar. Os numeros acima sao indicativos.

### Pacotes (nenhum novo)

Todos os pacotes necessarios ja estao instalados:
- `@xyflow/react` v12.10.2 — ReactFlow
- `@dagrejs/dagre` v3.0.0 — Layout engine
- `lucide-react` — Icons
- `next-intl` — i18n
- `@supabase/supabase-js` — Realtime subscriptions

### RLS Updates

| Tabela | Mudanca |
|---|---|
| `campaign_quests` | Adicionar filtro `is_visible_to_players` na policy de SELECT para members |
| `campaign_mind_map_layout` | Adicionar policy de SELECT para members (read-only) |

---

## 9. Metricas de Sucesso

| Metrica | Target | Como medir |
|---|---|---|
| Player abre Mind Map | >60% dos players logados | Analytics: tab "Map" como primeira interacao |
| Tempo de contextualizacao | <30s (vs minutos em tabs) | User testing qualitativo |
| Pins criados por player | >2 por campanha em media | COUNT em player_mind_map_pins |
| Retorno entre sessoes | >40% dos players abrem app entre sessoes | Analytics: sessoes fora de horario de jogo |
| Feedback qualitativo | "Agora eu entendo a campanha" | Beta test feedback |

---

## 10. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Mind map pesado em mobile | Performance ruim, frustração | Limitar nodes renderizados a 50; viewport culling do ReactFlow ja faz isso |
| DM nao usa visibility flags | Player vê tudo ou nada | Default `is_visible_to_players = true` para quests; onboarding tooltip pro DM |
| Player confuso com "???" | Frustração, acha que é bug | Tooltip no hover: "Este local ainda nao foi descoberto" |
| Realtime latencia | Player nao vê mudança imediata | Debounce de 500ms + skeleton state durante refetch |
| Layout do DM ruim para player | Mind map confuso | Dagre fallback quando posicoes do DM nao existem |

---

## 11. Checklist Pre-Implementacao

- [ ] Confirmar proximo numero de migration disponivel no Supabase
- [ ] Verificar que `campaign_mind_map_layout` tem SELECT policy pra members (se nao, adicionar na migration 085)
- [ ] Verificar que NpcNode.tsx recebe `isHidden` corretamente do CampaignMindMap.tsx
- [ ] Verificar que QuestNode.tsx pode receber prop `isHidden` (adicionar se necessario)
- [ ] Confirmar que FactionNode.tsx pode receber prop `isHidden` (adicionar se necessario)
- [ ] Revisar namespaces i18n existentes (`player_hq.*`, `campaign.*`) pra nao conflitar

---

## 12. Glossario

| Termo | Significado |
|---|---|
| **Fog of War** | Sistema onde o DM controla o que o player vê. Entidades ocultas aparecem como "???" ou nao aparecem. |
| **Pin** | Nota pessoal do player fixada no mind map, visivel apenas pra ele. |
| **Reveal** | Momento em que o DM torna uma entidade visivel ao player (toggle de flag). |
| **Node Key** | Identificador unico de um node no mind map. Formato: `tipo:uuid` (ex: `npc:abc123`). |
| **Edge** | Conexao entre dois nodes no mind map. Tipos: linked_to, lives_in, gave_quest, etc. |
| **Drawer** | Painel lateral que abre ao clicar em um node, mostrando detalhes + notas do player. |
