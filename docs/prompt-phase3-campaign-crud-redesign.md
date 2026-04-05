# PROMPT: Phase 3 — Campaign CRUD Redesign + Bag of Holding Pre-Slots

**Contexto:** Voce vai redesenhar os 4 CRUD sections do Campaign Hub (Quests, Locations, Factions, Bag of Holding) para seguir o padrao visual do NPC — que e o "gold standard" de UX no projeto. Tudo deve ser lindo, dark RPG aesthetic, com formularios modais estruturados e cards bonitos.

**Spec de referencia:** `docs/spec-campaign-hub-polish.md` (itens F1-F6, V6-V7)

---

## REGRAS ABSOLUTAS

1. **Seguir o padrao NPC** — O NpcList/NpcForm/NpcCard e a referencia. Mesma qualidade visual, mesma UX.
2. **Dark RPG aesthetic** — Gold/amber accent (`amber-400`, `amber-500`), surfaces escuros (`bg-card`, `bg-surface-tertiary`), bordas sutis (`border-border/30`), glass-morphism onde aplicavel.
3. **Formularios modais** — NUNCA campo de texto inline. Sempre `Dialog` (Radix) com campos tipados.
4. **Cards bonitos** — Similar ao NpcCard: avatar/imagem, nome em destaque, badges de metadata, expand para detalhes.
5. **i18n** — Todas as strings em `messages/pt-BR.json` e `messages/en.json` sob namespace `campaign`.
6. **Optimistic UI** — Criar item aparece imediatamente na lista. Reverter se falhar.
7. **Combat Parity** — Esses components sao DM-only para edicao, players readonly. Verificar CLAUDE.md.
8. **SRD Compliance** — Nao aplicavel aqui (conteudo user-generated, nao SRD).
9. **Nunca deletar arquivos** — Sempre mover com `mv` se precisar.
10. **Testar build** — Rodar `npx tsc --noEmit` ao final. Prefixar comandos com `rtk`.

---

## PARTE 1: QUEST REDESIGN

### 1.1 Migration SQL

Criar migration em `supabase/migrations/` (proximo numero sequencial apos o maior existente):

```sql
-- Adicionar novos campos ao campaign_quests
ALTER TABLE campaign_quests
  ADD COLUMN IF NOT EXISTS quest_type TEXT NOT NULL DEFAULT 'side'
    CHECK (quest_type IN ('main', 'side', 'bounty', 'escort', 'fetch')),
  ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS objective TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reward TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Expandir status com 'failed' e 'cancelled'
ALTER TABLE campaign_quests
  DROP CONSTRAINT IF EXISTS campaign_quests_status_check;
ALTER TABLE campaign_quests
  ADD CONSTRAINT campaign_quests_status_check
    CHECK (status IN ('available', 'active', 'completed', 'failed', 'cancelled'));
```

### 1.2 Atualizar Tipos

Em `lib/types/quest.ts`:
```typescript
export type QuestStatus = "available" | "active" | "completed" | "failed" | "cancelled";
export type QuestType = "main" | "side" | "bounty" | "escort" | "fetch";

export interface CampaignQuest {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  quest_type: QuestType;
  context: string;       // NOVO
  objective: string;     // NOVO
  reward: string;        // NOVO
  image_url: string | null; // NOVO
  is_visible_to_players: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

### 1.3 Criar QuestForm.tsx (Modal)

Criar `components/campaign/QuestForm.tsx` — seguir padrao do NpcForm.tsx:

**Campos do formulario:**
- Nome* (input text, required)
- Tipo (select: Main Quest, Side Quest, Bounty, Escort, Fetch)
- Status (select: Available, Active, Completed, Failed, Cancelled)
- Contexto (textarea, 3 rows, placeholder: "O que levou a essa quest...")
- Objetivo (textarea, 2 rows, placeholder: "O que precisa ser feito...")
- Recompensa (textarea, 2 rows, placeholder: "Gold, itens, favores...")
- Imagem URL (input text, opcional)
- Visibilidade (toggle Eye/EyeOff igual NPC)

**Padrao visual:**
- Dialog com `DialogContent` (usar `components/ui/dialog.tsx`)
- `space-y-4` no form
- Labels `text-sm font-medium text-foreground`
- Inputs com `bg-surface-tertiary border-input rounded-lg`
- Textareas com mesma estilizacao
- Select com `components/ui/select.tsx` (Radix)
- Dirty state tracking (igual NpcForm — AlertDialog pra confirmar descarte)
- Botao "Salvar" com `variant="gold"`
- Botao "Cancelar" com `variant="outline"`

### 1.4 Criar QuestCard.tsx (Card Display)

Criar `components/campaign/QuestCard.tsx` — seguir padrao do NpcCard.tsx:

**Layout do card:**
- Borda esquerda colorida por status:
  - available: `border-l-4 border-l-muted-foreground`
  - active: `border-l-4 border-l-amber-400`
  - completed: `border-l-4 border-l-emerald-400`
  - failed: `border-l-4 border-l-red-400`
  - cancelled: `border-l-4 border-l-zinc-500`
- Header: Icone de tipo + Nome + Badge de status + Badge de tipo
- Badges de tipo:
  - main: `bg-amber-900/30 text-amber-400` com Crown icon
  - side: `bg-blue-900/30 text-blue-400` com Compass icon
  - bounty: `bg-red-900/30 text-red-400` com Target icon
  - escort: `bg-emerald-900/30 text-emerald-400` com Shield icon
  - fetch: `bg-purple-900/30 text-purple-400` com Package icon
- Expand: Mostra contexto, objetivo, recompensa em secoes com titulos
- Imagem: Se `image_url`, mostrar thumbnail `w-16 h-16 rounded-lg object-cover` no header
- Visibilidade: Eye/EyeOff toggle (igual NPC)
- Actions: Edit (abre QuestForm) + Delete (AlertDialog)

**Estilo do card:**
```
bg-card border border-border/30 rounded-lg p-4 transition-all duration-200 hover:border-amber-400/30
```

### 1.5 Reescrever QuestBoard.tsx

Reescrever `components/campaign/QuestBoard.tsx` usando o padrao NpcList:

- **Toolbar:** Filtros por status (All / Active / Available / Completed / Failed) + Botao "+ Nova Quest"
- **Filtros ativos:** `bg-amber-400/15 text-amber-400` (igual NPC)
- **Grid:** `grid grid-cols-1 md:grid-cols-2 gap-3`
- **Empty state:** Icone ScrollText centralizado + mensagem + botao CTA
- **Botao add:** `variant="goldOutline"` com Plus icon
- **Player view:** Read-only, sem botoes de edicao/delete

### 1.6 Atualizar Hook

Em `lib/hooks/use-campaign-quests.ts`:
- Adicionar novos campos ao `createQuest` e `updateQuest`
- Manter optimistic updates

---

## PARTE 2: LOCATION REDESIGN

### 2.1 Migration SQL

```sql
ALTER TABLE campaign_locations
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_visible_to_players BOOLEAN NOT NULL DEFAULT true;
```

### 2.2 Atualizar Tipos

Em `lib/types/mind-map.ts`, adicionar a `CampaignLocation`:
```typescript
image_url: string | null;        // NOVO
is_visible_to_players: boolean;  // NOVO
```

### 2.3 Criar LocationForm.tsx (Modal)

Criar `components/campaign/LocationForm.tsx`:

**Campos:**
- Nome* (input text, required)
- Tipo (select: City, Dungeon, Wilderness, Building, Region)
- Descricao (textarea, 3 rows)
- Imagem URL (input text, opcional)
- Descoberto? (toggle — `bg-cyan-500` quando ativo, `bg-muted` quando nao)
- Visibilidade (toggle Eye/EyeOff)

**Icones por tipo no select:**
- city: Castle
- dungeon: Mountain (Skull?)
- wilderness: TreePine
- building: Building
- region: MapPin

### 2.4 Criar LocationCard.tsx

**Layout:**
- Icone de tipo (com cor por tipo) + Nome
- Badge "Discovered" (cyan) ou "Hidden" (muted)
- Imagem thumbnail se existir
- Descricao expandivel
- Actions: Edit + Delete

**Cores por tipo de location:**
- city: `bg-amber-900/30 text-amber-400`
- dungeon: `bg-red-900/30 text-red-400`
- wilderness: `bg-emerald-900/30 text-emerald-400`
- building: `bg-blue-900/30 text-blue-400`
- region: `bg-purple-900/30 text-purple-400`

### 2.5 Reescrever LocationList.tsx

Mesmo padrao NpcList:
- Toolbar com filtros (All / Discovered / Hidden) + "+ Novo Local"
- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`
- Empty state com MapPin icon

---

## PARTE 3: FACTION REDESIGN

### 3.1 Migration SQL

```sql
ALTER TABLE campaign_factions
  ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### 3.2 Atualizar Tipos

Em `lib/types/mind-map.ts`, adicionar a `CampaignFaction`:
```typescript
image_url: string | null; // NOVO
```

### 3.3 Criar FactionForm.tsx (Modal)

**Campos:**
- Nome* (input text, required)
- Alinhamento (select: Ally, Neutral, Hostile) — com dot colorido no select
- Descricao (textarea, 3 rows)
- Imagem URL (input text, opcional)
- Visibilidade (toggle Eye/EyeOff)

### 3.4 Criar FactionCard.tsx

**Layout:**
- Dot de alinhamento (green ally / gray neutral / red hostile) + Nome
- Badge de alinhamento colorido
- Imagem thumbnail se existir
- Descricao expandivel
- Visibilidade toggle
- Actions: Edit + Delete

**Cores por alinhamento:**
- ally: `bg-emerald-900/30 text-emerald-400`, borda `border-l-4 border-l-emerald-400`
- neutral: `bg-zinc-800/30 text-zinc-400`, borda `border-l-4 border-l-zinc-400`
- hostile: `bg-red-900/30 text-red-400`, borda `border-l-4 border-l-red-400`

### 3.5 Reescrever FactionList.tsx

Mesmo padrao NpcList:
- Toolbar com filtros (All / Allies / Neutral / Hostile) + "+ Nova Faccao"
- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`
- Empty state com Flag icon

---

## PARTE 4: BAG OF HOLDING PRE-SLOTS

### 4.1 Migration SQL

Criar tabela para essentials OU usar coluna JSON na campaigns:

```sql
-- Opcao: coluna JSON na campaigns (mais simples)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS bag_essentials JSONB NOT NULL DEFAULT '{
    "potions": {"small": 0, "greater": 0, "superior": 0, "supreme": 0},
    "goodberries": 0,
    "currency": {"gold": 0, "silver": 0, "platinum": 0},
    "components": {"diamonds": 0, "revivify_packs": 0}
  }'::jsonb;
```

### 4.2 Tipos

Criar `lib/types/bag-essentials.ts`:
```typescript
export interface BagEssentials {
  potions: {
    small: number;
    greater: number;
    superior: number;
    supreme: number;
  };
  goodberries: number;
  currency: {
    gold: number;
    silver: number;
    platinum: number;
  };
  components: {
    diamonds: number;
    revivify_packs: number;
  };
}

export const DEFAULT_BAG_ESSENTIALS: BagEssentials = {
  potions: { small: 0, greater: 0, superior: 0, supreme: 0 },
  goodberries: 0,
  currency: { gold: 0, silver: 0, platinum: 0 },
  components: { diamonds: 0, revivify_packs: 0 },
};
```

### 4.3 Redesenhar BagOfHolding.tsx

O componente fica dividido em 2 secoes:

**Secao 1: Essentials (sempre visivel, topo)**

Layout em grid compacto com campos numericos inline:

```
┌─────────────────────────────────────────────────────┐
│ 🧪 POCOES DE CURA                                   │
│ ┌──────────────┐ ┌──────────────┐                   │
│ │ Small    [3] │ │ Greater  [1] │                   │
│ └──────────────┘ └──────────────┘                   │
│ ┌──────────────┐ ┌──────────────┐                   │
│ │ Superior [0] │ │ Supreme  [0] │                   │
│ └──────────────┘ └──────────────┘                   │
├─────────────────────────────────────────────────────┤
│ 🫐 CONSUMIVEIS        💰 MOEDAS                     │
│ ┌──────────────┐      ┌──────────────┐              │
│ │ Goodberries [5]│    │ Gold    [150]│              │
│ └──────────────┘      ├──────────────┤              │
│                       │ Silver   [30]│              │
│ 💎 COMPONENTES        ├──────────────┤              │
│ ┌──────────────┐      │ Platinum  [2]│              │
│ │ Diamonds  [3]│      └──────────────┘              │
│ ├──────────────┤                                    │
│ │ Revivify  [1]│                                    │
│ └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

**Estilo dos campos numericos:**
- Cada item: `flex items-center justify-between` em mini card
- Mini card: `bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2`
- Label: `text-xs text-muted-foreground`
- Input number: `w-16 text-right bg-transparent border-none text-amber-400 font-mono font-bold`
- Secao header: `text-xs uppercase tracking-wider text-muted-foreground` com emoji
- Grid: `grid grid-cols-2 gap-2` dentro de cada secao
- Secoes agrupadas: `grid grid-cols-1 md:grid-cols-2 gap-4` para o layout 2x2

**Comportamento:**
- Debounce de 800ms no save (igual quest description pattern)
- Salvar no Supabase: `UPDATE campaigns SET bag_essentials = $1 WHERE id = $2`
- Loading skeleton no mount
- DM pode editar, player readonly (mostra valores sem input)

**Secao 2: Itens Custom (abaixo dos essentials)**

Manter a logica existente do BagOfHolding (add item, removal workflow, etc.) mas melhorar o visual:
- Titulo "Outros Itens" com contagem
- Botao "+ Adicionar Item" com `variant="goldOutline"`
- Cards de item com estilo melhorado (seguir padrao de cards do projeto)

### 4.4 Hook

Criar `lib/hooks/use-bag-essentials.ts`:
- Fetch: `SELECT bag_essentials FROM campaigns WHERE id = $1`
- Update: debounced PATCH para `bag_essentials`
- Optimistic local state

---

## PARTE 5: i18n KEYS

Adicionar em `messages/pt-BR.json` e `messages/en.json` sob namespace `campaign`:

```json
// Quest
"quest_form_title_new": "Nova Quest",
"quest_form_title_edit": "Editar Quest",
"quest_field_name": "Nome da Quest",
"quest_field_type": "Tipo",
"quest_field_status": "Status",
"quest_field_context": "Contexto",
"quest_field_context_placeholder": "O que levou a essa quest...",
"quest_field_objective": "Objetivo",
"quest_field_objective_placeholder": "O que precisa ser feito...",
"quest_field_reward": "Recompensa",
"quest_field_reward_placeholder": "Gold, itens, favores...",
"quest_field_image": "URL da Imagem",
"quest_type_main": "Quest Principal",
"quest_type_side": "Quest Secundaria",
"quest_type_bounty": "Recompensa",
"quest_type_escort": "Escolta",
"quest_type_fetch": "Busca",
"quest_status_available": "Disponivel",
"quest_status_active": "Ativa",
"quest_status_completed": "Concluida",
"quest_status_failed": "Falhada",
"quest_status_cancelled": "Cancelada",
"quest_empty": "Nenhuma quest ainda",
"quest_empty_cta": "Criar a primeira quest da campanha",

// Location
"location_form_title_new": "Novo Local",
"location_form_title_edit": "Editar Local",
"location_field_name": "Nome do Local",
"location_field_type": "Tipo",
"location_field_description": "Descricao",
"location_field_image": "URL da Imagem",
"location_field_discovered": "Descoberto",
"location_type_city": "Cidade",
"location_type_dungeon": "Masmorra",
"location_type_wilderness": "Selva",
"location_type_building": "Edificio",
"location_type_region": "Regiao",
"location_empty": "Nenhum local ainda",
"location_empty_cta": "Criar o primeiro local da campanha",

// Faction
"faction_form_title_new": "Nova Faccao",
"faction_form_title_edit": "Editar Faccao",
"faction_field_name": "Nome da Faccao",
"faction_field_alignment": "Alinhamento",
"faction_field_description": "Descricao",
"faction_field_image": "URL da Imagem",
"faction_alignment_ally": "Aliada",
"faction_alignment_neutral": "Neutra",
"faction_alignment_hostile": "Hostil",
"faction_empty": "Nenhuma faccao ainda",
"faction_empty_cta": "Criar a primeira faccao da campanha",

// Bag of Holding
"bag_essentials_title": "Essenciais",
"bag_essentials_potions": "Pocoes de Cura",
"bag_essentials_potion_small": "Small",
"bag_essentials_potion_greater": "Greater",
"bag_essentials_potion_superior": "Superior",
"bag_essentials_potion_supreme": "Supreme",
"bag_essentials_consumables": "Consumiveis",
"bag_essentials_goodberries": "Goodberries",
"bag_essentials_currency": "Moedas",
"bag_essentials_gold": "Gold",
"bag_essentials_silver": "Silver",
"bag_essentials_platinum": "Platinum",
"bag_essentials_components": "Componentes",
"bag_essentials_diamonds": "Diamantes",
"bag_essentials_revivify": "Revivify Pack",
"bag_custom_title": "Outros Itens",
"bag_custom_add": "Adicionar Item",

// Shared
"form_save": "Salvar",
"form_cancel": "Cancelar",
"form_delete_confirm": "Tem certeza?",
"form_unsaved_title": "Alteracoes nao salvas",
"form_unsaved_description": "Voce tem alteracoes nao salvas. Deseja descartar?",
"form_unsaved_discard": "Descartar",
"form_unsaved_keep": "Continuar editando",
"visibility_visible": "Visivel para jogadores",
"visibility_hidden": "Oculto dos jogadores"
```

E as versoes em ingles correspondentes.

---

## PARTE 6: DESIGN REFERENCE

### Paleta de cores (extraida do projeto)

- Surface primary: `#13131E` (bg)
- Surface secondary: `#1A1A28` (panels)
- Surface tertiary: `#222234` (cards, inputs)
- Gold accent: `#D4A853` / `amber-400`
- Border: `border-border/30` (cards), `border-white/[0.08]` (glass)
- Text primary: `text-foreground` (#E8E6E0)
- Text secondary: `text-muted-foreground` (#9896A0)

### Component library

- Dialog: `components/ui/dialog.tsx` (Radix)
- AlertDialog: `components/ui/alert-dialog.tsx` (Radix)
- Select: `components/ui/select.tsx` (Radix)
- Input: `components/ui/input.tsx`
- Button: `components/ui/button.tsx` — variants: `gold`, `goldOutline`, `outline`, `destructive`
- Switch: `components/ui/switch.tsx`

### Padrao NPC (referencia visual exata)

**NpcCard classes:**
```
Card: bg-card border border-border rounded-lg p-4 transition-all duration-200 hover:border-amber-400/30
Avatar: w-12 h-12 rounded-full bg-amber-500/20 ring-2 ring-amber-400/30
Name: text-sm font-semibold text-foreground line-clamp-2
Badge: inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
```

**NpcForm classes:**
```
Form: space-y-4
Label: text-sm font-medium text-foreground
Input: bg-surface-tertiary border-input rounded-lg px-3 py-2
Textarea: bg-surface-tertiary border-input rounded-lg px-3 py-2
Stats grid: grid grid-cols-2 gap-3
Toggle active: bg-emerald-500
Toggle inactive: bg-muted
```

**NpcList toolbar:**
```
Toolbar: flex items-center justify-between flex-wrap gap-2
Filter active: bg-amber-400/15 text-amber-400
Filter inactive: text-muted-foreground hover:text-foreground
Filter container: rounded-lg border border-border overflow-hidden
Add button: variant="goldOutline" + Plus icon
Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3
Empty: rounded-lg border border-border bg-card p-8 text-center
```

---

## ORDEM DE EXECUCAO

1. Criar migrations SQL (quests, locations, factions, bag_essentials)
2. Aplicar migrations no Supabase: `npx supabase db push` ou instruir o usuario
3. Atualizar tipos TypeScript (quest.ts, mind-map.ts, bag-essentials.ts)
4. Atualizar hooks (use-campaign-quests, use-campaign-locations, use-campaign-factions, use-bag-essentials)
5. Criar Form components (QuestForm, LocationForm, FactionForm)
6. Criar Card components (QuestCard, LocationCard, FactionCard)
7. Reescrever List components (QuestBoard, LocationList, FactionList)
8. Redesenhar BagOfHolding com pre-slots
9. Adicionar todas i18n keys (pt-BR + en)
10. Verificar build: `rtk npx tsc --noEmit`
11. Testar visualmente cada secao

---

## CHECKLIST FINAL

- [ ] QuestForm modal com todos os campos
- [ ] QuestCard com borda colorida por status + badges de tipo
- [ ] QuestBoard com filtros + grid + empty state
- [ ] LocationForm modal com campos + imagem
- [ ] LocationCard com icone de tipo + badges
- [ ] LocationList com filtros + grid + empty state
- [ ] FactionForm modal com alinhamento + imagem
- [ ] FactionCard com dot colorido + borda lateral
- [ ] FactionList com filtros + grid + empty state
- [ ] BagOfHolding essentials pre-slots (pocoes, moedas, diamantes)
- [ ] BagOfHolding custom items mantidos
- [ ] i18n pt-BR + en completo
- [ ] Migrations SQL prontas
- [ ] Tipos atualizados
- [ ] Hooks atualizados
- [ ] Build OK (`tsc --noEmit`)
- [ ] Player view readonly verificado em todos os 4 components
