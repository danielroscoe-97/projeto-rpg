# Epic: Mind Map da Campanha — "Teia do Destino"

**Status**: Em implementacao
**Prioridade**: Alta — feature diferenciadora do Pocket DM
**Data**: 2026-04-03

---

## Visao Geral

O Mind Map da Campanha e a ferramenta visual central do DM para entender, planejar e navegar todas as entidades e relacoes da campanha. Ele transforma dados fragmentados (NPCs, quests, notes, sessions, inventario) em uma **rede viva e interativa**.

### Principios de Design
1. **Dados existentes primeiro** — Fase 1 usa apenas dados ja presentes no banco
2. **Color coding consistente** — Cada tipo de entidade tem cor unica e reconhecivel
3. **Progressive disclosure** — De simples (Fase 1) a completo (Fase 5)
4. **DM-first** — O mapa e ferramenta do DM; versao do player vem na Fase 5
5. **Nao e diagrama tecnico** — E o tabuleiro do mestre, com personalidade RPG

---

## Inventario de Entidades (14 tipos)

| # | Entidade | Tabela DB | Status DB | Icone | Cor | Fase |
|---|----------|-----------|-----------|-------|-----|------|
| 1 | Campaign | hub central | Existe | Crown | Gold/Amber | 1 |
| 2 | NPC | `campaign_npcs` | Existe | UserCircle | Roxo (#a78bfa) | 1 |
| 3 | Note (tipada) | `campaign_notes` + note_type | Parcial | Varia por tipo | Azul (#60a5fa) | 1+2 |
| 4 | Player | `campaign_members` | Existe | User | Verde (#34d399) | 1 |
| 5 | Session | `sessions` | Existe | Scroll | Vermelho (#ef4444) | 1 |
| 6 | Quest | `campaign_quests` | Existe | Target | Amarelo (#eab308) | 1 |
| 7 | Bag of Holding | `party_inventory_items` | Existe | Backpack | Laranja (#f97316) | 1 |
| 8 | Encounter | `encounters` | Existe | Swords | Vermelho escuro (#b91c1c) | 1 |
| 9 | Location | `campaign_locations` | Nova tabela | MapPin | Cyan (#22d3ee) | 3 |
| 10 | Faction | `campaign_factions` | Nova tabela | Flag | Rose (#fb7185) | 3 |
| 11 | Item Especial | Bag items com flag | Extensao | Gem | Laranja brilhante | 4 |
| 12 | Lore Entry | Note tipo "lore" | Via note_type | BookOpen | Indigo (#818cf8) | 2 |
| 13 | Secret | Note tipo "secret" | Via note_type | EyeOff | Cinza escuro | 2 |
| 14 | Plot Hook | Note tipo "plot_hook" | Via note_type | Lightbulb | Amarelo claro | 2 |

---

## Fases de Implementacao

### FASE 1 — "O Mapa Ganha Vida" (dados existentes, ZERO migrations)

**Objetivo**: O mind map mostra TUDO que ja existe no banco.

#### Novos Custom Nodes

| Node | Cor | Dados | Icone |
|------|-----|-------|-------|
| SessionNode | Vermelho | Nome, is_active (badge ativa/encerrada) | Scroll |
| QuestNode | Amarelo | Titulo, status badge (available/active/completed) | Target |
| BagNode | Laranja | "Bag of Holding" + count de itens ativos | Backpack |
| EncounterNode | Vermelho escuro | Nome do encounter (sub-no de Session) | Swords |

#### Novas Queries (Promise.all)

```typescript
// Adicionar ao load() existente:
supabase.from('sessions').select('id, name, is_active').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
supabase.from('campaign_quests').select('id, title, status').eq('campaign_id', campaignId),
supabase.from('party_inventory_items').select('id, item_name').eq('campaign_id', campaignId).eq('status', 'active'),
```

#### Edges Implicitos

| Source | Target | Tipo | Visual |
|--------|--------|------|--------|
| Campaign -> Session | Direto | Gold, 1.5px | Solido |
| Campaign -> Quest | Direto | Gold, 1.5px | Solido |
| Campaign -> Bag | Direto | Gold, 1.5px | Solido |
| Session -> NPC | Via combatants | Vermelho, 1px | Tracejado |
| Quest -> (futuro) | Via edges genericos | Amarelo, 1px | Animado |

#### Filter Bar

Toggle chips no topo do mapa para ligar/desligar cada tipo de no:
- NPCs (roxo) | Notes (azul) | Players (verde) | Sessions (vermelho) | Quests (amarelo) | Bag (laranja)

#### Arquivos Modificados
- `components/campaign/CampaignMindMap.tsx` — queries expandidas, novos node types, filter bar
- `components/campaign/nodes/SessionNode.tsx` — NOVO
- `components/campaign/nodes/QuestNode.tsx` — NOVO
- `components/campaign/nodes/BagNode.tsx` — NOVO
- `messages/en.json` + `messages/pt-BR.json` — novas keys

---

### FASE 2 — "Tipagem e Relacoes" (schema light)

**Objetivo**: Notes ganham tipo, edges viram explicitos, DM pode criar conexoes.

#### Migrations

**Migration: `note_type` em campaign_notes**
```sql
ALTER TABLE campaign_notes 
ADD COLUMN note_type text NOT NULL DEFAULT 'general'
CHECK (note_type IN ('general','lore','location','npc','session_recap','secret','plot_hook'));
```

**Migration: `campaign_mind_map_edges`**
```sql
CREATE TABLE campaign_mind_map_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'linked_to',
  custom_label text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, source_type, source_id, target_type, target_id)
);
-- CHECK constraints para source_type e target_type
-- RLS: owner da campaign pode CRUD, members podem SELECT
```

#### Features
- NoteNode muda visual por note_type (icone, cor, label)
- Drag-to-connect entre nos cria edge na tabela generica
- Mini-panel lateral ao selecionar no (detalhes + conexoes)
- Migrar dados de `note_npc_links` para `campaign_mind_map_edges`

---

### FASE 3 — "O Mundo da Campanha" (entidades novas)

**Objetivo**: Locations e Factions como entidades proprias com CRUD.

#### Migrations

**Migration: `campaign_locations`**
```sql
CREATE TABLE campaign_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  location_type text NOT NULL DEFAULT 'building'
    CHECK (location_type IN ('city','dungeon','wilderness','building','region')),
  parent_location_id uuid REFERENCES campaign_locations(id) ON DELETE SET NULL,
  is_discovered boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Migration: `campaign_factions`**
```sql
CREATE TABLE campaign_factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  alignment text NOT NULL DEFAULT 'neutral'
    CHECK (alignment IN ('ally','neutral','hostile')),
  is_visible_to_players boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Features
- LocationNode (cyan, MapPin, hierarquia visual parent->child)
- FactionNode (rose, Flag, borda muda por alignment)
- CRUD components fora do mind map (abas na campanha)
- Edges: NPC -> Location ("mora em"), NPC -> Faction ("membro de"), Quest -> Location ("acontece em")

---

### FASE 4 — "Polimento e Inteligencia" (UX premium)

**Objetivo**: O mind map e a ferramenta central do DM.

#### Migrations

**Migration: `campaign_mind_map_layout`**
```sql
CREATE TABLE campaign_mind_map_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  node_key text NOT NULL, -- formato: 'npc:uuid', 'quest:uuid'
  x float NOT NULL DEFAULT 0,
  y float NOT NULL DEFAULT 0,
  is_collapsed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, node_key)
);
```

**Migration: `is_alive` em campaign_npcs**
```sql
ALTER TABLE campaign_npcs ADD COLUMN is_alive boolean NOT NULL DEFAULT true;
```

#### Features
- Persistencia de posicao (salva ao soltar no)
- Status visual completo:
  - Quest: badge ?, !, check por status
  - NPC morto: borda vermelha tracejada, skull overlay
  - NPC hidden: borda pontilhada, icone olho fechado
  - Session ativa: glow vermelho sutil
  - Location nao descoberta: "?" no icone
  - Faction: borda verde/cinza/vermelha por alignment
- Group nodes colapsiveis (container por tipo)
- Right-click context menu (editar, deletar link, criar note linkada)
- Hover tooltip com preview rapido
- Opcoes de layout: Dagre (hierarquico), Forca (organico), Radial
- Realtime sync via Supabase Realtime

---

### FASE 5 — "O Mapa do Jogador" (player-facing)

**Objetivo**: Players veem SUA versao filtrada do mind map.

#### Features
- Player Mind Map: so entidades com `is_visible_to_players`
- Fog of War: Locations nao descobertas como "?"
- Player connections: quests do player, NPCs conhecidos
- Shared notes no mapa
- Quest path highlight: selecionar quest mostra o caminho (location -> npc -> item)

---

## Regras Visuais (Todas as Fases)

### Cores por Entidade
| Entidade | Borda | Texto | Handle | MiniMap |
|----------|-------|-------|--------|---------|
| Campaign | amber-400 | amber-400 | amber-400 | #f59e0b |
| NPC | purple-400/60 | purple-400 | purple-400 | #a78bfa |
| Note | blue-400/60 | blue-400 | blue-400 | #60a5fa |
| Player | emerald-400/60 | emerald-400 | emerald-400 | #34d399 |
| Session | red-400/60 | red-400 | red-400 | #ef4444 |
| Quest | yellow-400/60 | yellow-400 | yellow-400 | #eab308 |
| Bag | orange-400/60 | orange-400 | orange-400 | #f97316 |
| Encounter | red-700/60 | red-300 | red-700 | #b91c1c |
| Location | cyan-400/60 | cyan-400 | cyan-400 | #22d3ee |
| Faction | rose-400/60 | rose-400 | rose-400 | #fb7185 |

### Edges por Tipo
| Edge | Cor | Largura | Estilo |
|------|-----|---------|--------|
| Campaign -> entidade | #d4a44a | 1.5px | Solido, opacity 0.6 |
| Note <-> NPC (cross-link) | #a78bfa | 1px | Animado, opacity 0.4 |
| Session -> NPC (participou) | #ef4444 | 1px | Tracejado, opacity 0.4 |
| Quest -> entidade | #eab308 | 1px | Animado, opacity 0.4 |
| Location -> entidade | #22d3ee | 1px | Pontilhado, opacity 0.4 |
| Faction -> NPC | #fb7185 | 1px | Solido, opacity 0.4 |

### Dimensoes
- Node width: 180px (campaign: 200px)
- Node height: 70px (com stats: 90px)
- Node separation: 60px
- Rank separation: 100px
- Container height: 500px (expandivel)

---

## Tipagem de Notes (Fase 2)

| Tipo | Valor DB | Icone | Cor borda | Descricao |
|------|----------|-------|-----------|-----------|
| General | `general` | FileText | blue-400/60 | Default, como hoje |
| Lore | `lore` | BookOpen | indigo-400/60 | Historia do mundo, backstory |
| Location | `location` | MapPin | cyan-400/60 | Descricao de lugar |
| NPC | `npc` | UserCircle | purple-400/60 | Bio de NPC |
| Session Recap | `session_recap` | Scroll | orange-400/60 | Resumo da sessao |
| Secret | `secret` | EyeOff | gray-600/60 | Revelacao futura (DM only) |
| Plot Hook | `plot_hook` | Lightbulb | yellow-400/60 | Gancho narrativo |

---

## Referencias Tecnicas

### Stack
- **Visualizacao**: @xyflow/react v12.10.2
- **Layout**: @dagrejs/dagre v3.0.0
- **Icones**: lucide-react
- **DB**: Supabase (PostgreSQL)
- **i18n**: next-intl
- **State**: React useState + useCallback (local ao componente)

### Arquivos Existentes
| Arquivo | Responsabilidade |
|---------|-----------------|
| `components/campaign/CampaignMindMap.tsx` | Componente principal (350 linhas) |
| `components/campaign/nodes/CampaignNode.tsx` | No central da campanha |
| `components/campaign/nodes/NpcNode.tsx` | No de NPC com stats |
| `components/campaign/nodes/NoteNode.tsx` | No de nota com shared/private |
| `components/campaign/nodes/PlayerNode.tsx` | No de membro com personagem |
| `components/campaign/CampaignSections.tsx` | Container (section colapsavel) |
| `lib/supabase/note-npc-links.ts` | Helper de cross-links |

### Tabelas Existentes Usadas
| Tabela | Campos relevantes pro mind map |
|--------|-------------------------------|
| `campaign_npcs` | id, name, stats (hp, ac), is_visible_to_players |
| `campaign_notes` | id, title, is_shared, folder_id |
| `campaign_members` | id, user_id, role, status |
| `note_npc_links` | note_id, npc_id |
| `sessions` | id, campaign_id, name, is_active |
| `encounters` | id, session_id, name, is_active |
| `campaign_quests` | id, title, status (available/active/completed) |
| `party_inventory_items` | id, item_name, quantity, status |
