# Quick Spec — Items Compendium

**Sprint:** Items Compendium Sprint 2026-03-26
**Prioridade:** ALTA — Nova seção do Compêndio, dataset completo do 5e.tools
**Agentes:** Winston (Arquitetura), Sally (UX), Amelia (Dev), Bob (Sprint)

---

## Visão Geral

Adicionar uma nova aba "Itens" ao Compêndio existente, seguindo os padrões já estabelecidos por MonsterBrowser e SpellBrowser. O dataset será extraído do 5e.tools (items-base.json + items.json), consolidado num único JSON estático, e carregado via o pipeline SRD existente (loader → IDB cache → Fuse.js index → Zustand store).

**Diferenciador principal:** Toggle visual proeminente Mundano vs Mágico como filtro primário.

---

## Modelo de Dados — SrdItem Interface

Baseado na análise completa do 5e.tools data model:

```typescript
export interface SrdItem {
  // --- Identificação ---
  id: string;                    // slug gerado: kebab-case do name
  name: string;
  source: string;               // "PHB", "DMG", "XPHB", "XDMG", etc.

  // --- Classificação ---
  type: ItemType;                // tipo normalizado (ver enum abaixo)
  rarity: ItemRarity;            // "none" | "common" | ... | "artifact"
  isMagic: boolean;              // computed: rarity !== "none"

  // --- Propriedades Mecânicas ---
  value?: number;                // em copper pieces (1 gp = 100 cp)
  weight?: number;               // em libras
  ac?: number;                   // armor class (armaduras/escudos)
  dmg1?: string;                 // dado de dano primário ("1d8")
  dmg2?: string;                 // dado de dano versatile ("1d10")
  dmgType?: string;              // tipo de dano: "S", "P", "B", etc.
  weaponCategory?: "simple" | "martial";
  property?: string[];           // ["V", "F", "L", "T", etc.]
  range?: string;                // "120/360"

  // --- Armadura ---
  stealth?: boolean;             // desvantagem em Stealth
  strength?: string;             // requisito de Força

  // --- Mágico ---
  reqAttune?: boolean | string;  // true ou "by a wizard"
  charges?: number;
  recharge?: string;             // "dawn", etc.
  bonusWeapon?: string;          // "+1", "+2", "+3"
  bonusAc?: string;
  wondrous?: boolean;
  curse?: boolean;
  sentient?: boolean;

  // --- Conteúdo ---
  entries: string[];             // descrição (parágrafos de texto)
  baseItem?: string;             // referência ao item base ("longsword|phb")

  // --- Meta ---
  edition?: "classic" | "one";   // 2014 vs 2024
  srd?: boolean;
  basicRules?: boolean;
}
```

### ItemType (normalizado)

```typescript
type ItemType =
  // Armas
  | "melee-weapon" | "ranged-weapon"
  // Armaduras
  | "light-armor" | "medium-armor" | "heavy-armor" | "shield"
  // Consumíveis
  | "potion" | "scroll"
  // Mágicos
  | "ring" | "wand" | "rod" | "staff"
  // Equipamento
  | "adventuring-gear" | "tool" | "instrument" | "gaming-set" | "artisan-tools"
  | "spellcasting-focus" | "ammunition"
  // Wondrous (sem type no 5e.tools + wondrous: true)
  | "wondrous"
  // Tesouro
  | "trade-good" | "art-object" | "gemstone"
  // Veículos
  | "vehicle" | "mount"
  // Outros
  | "food-drink" | "explosive" | "other";
```

### ItemRarity

```typescript
type ItemRarity =
  | "none"       // mundano
  | "common"
  | "uncommon"
  | "rare"
  | "very rare"
  | "legendary"
  | "artifact"
  | "varies"
  | "unknown";
```

---

## Crawler — Extração de Dados do 5e.tools

### Fontes

1. `https://5e.tools/data/items-base.json` → array `baseitem[]` (~230 itens mundanos)
2. `https://5e.tools/data/items.json` → array `item[]` (~2.400 itens mágicos/especiais)

### Transformações

1. **Merge** ambas as fontes em um único array
2. **Normalizar type** do código curto (ex: `"M"` → `"melee-weapon"`, `"LA"` → `"light-armor"`)
3. **Remover sufixo de source** do type (ex: `"RG|DMG"` → `"ring"`)
4. **Computar `isMagic`**: `rarity !== "none"`
5. **Gerar `id`**: kebab-case de `name + source` (ex: `"longsword-phb"`)
6. **Flatten `entries`**: converter objetos complexos (tables, lists) em strings legíveis
7. **Mapear `edition`**: items com source `"XPHB"`, `"XDMG"` → `"one"` (2024), resto → `"classic"` (2014)

### Output

- `public/srd/items.json` — array consolidado SrdItem[]
- Estimativa: ~2.600 itens, ~2-4 MB JSON

---

## UX Design — ItemBrowser

### Filtro Primário: Toggle Mundano / Mágico

Posição: **topo do filter bar**, antes do campo de busca. Visual proeminente com dois botões estilo segmented control:

```
[ 🔨 Mundano ] [ ✨ Mágico ] [ Todos ]
```

- **Mundano**: filtra `isMagic === false`, visual clean com cores neutras
- **Mágico**: filtra `isMagic === true`, borda esquerda colorida por raridade
- **Todos**: sem filtro de tipo (default)

### Filtros Secundários (collapsible)

| Filtro | Valores | Notas |
|--------|---------|-------|
| Tipo | Arma, Armadura, Poção, Pergaminho, Anel, Varinha, Bastão, Maravilhoso, Equipamento, Munição, Ferramenta | Chips multi-select |
| Raridade | Common → Artifact | Só visível quando "Mágico" ou "Todos" ativo |
| Attunement | Toggle sim/não | Só visível quando "Mágico" ou "Todos" |
| Categoria de Arma | Simples / Marcial | Só visível quando tipo "Arma" selecionado |
| Versão | Ambas / 2014 / 2024 | Segmented control |

### Sort Options

- Nome (A-Z) — default
- Valor (gp)
- Raridade (none → artifact)

### Layout

- **Desktop**: Split-panel (lista 2fr + detalhe 3fr), igual MonsterBrowser/SpellBrowser
- **Mobile**: Lista com "Load More" + toggle detalhe, igual SpellBrowser
- **Virtual scrolling**: react-window (2.600+ itens exige virtualização)

### Left Border Color (por raridade)

| Raridade | Cor |
|----------|-----|
| none | `border-l-gray-500` |
| common | `border-l-gray-400` |
| uncommon | `border-l-green-500` |
| rare | `border-l-blue-500` |
| very rare | `border-l-purple-500` |
| legendary | `border-l-gold` |
| artifact | `border-l-red-500` |

### Item Row (lista)

```
[cor-rarity] Nome do Item                    Tipo · Raridade  [2024]
```

### Keyboard Navigation

- `j`/`k` ou `↑`/`↓` para navegar lista
- Seleção automática limpa quando filtrado

---

## ItemCard — Componente de Detalhe

Segue o padrão visual `stat-card-5e.css`. Duas variantes:

### Mundano

```
┌─────────────────────────────┐
│  Longsword                  │
│  Melee Weapon               │
├─────────────────────────────┤
│  Type: Martial weapon       │
│  Cost: 15 gp                │
│  Weight: 3 lb.              │
│  Damage: 1d8 slashing       │
│  Properties: Versatile (1d10│
├─────────────────────────────┤
│  [Descrição se houver]      │
└─────────────────────────────┘
```

### Mágico

```
┌─────────────────────────────┐
│  Flame Tongue               │  ← border-top por raridade
│  Weapon (longsword), rare   │
│  (requires attunement)      │
├─────────────────────────────┤
│  Type: Martial weapon       │
│  Damage: 1d8 slashing       │
│  Properties: Versatile      │
│  Charges: —                 │
├─────────────────────────────┤
│  [Descrição completa]       │
│  [Entradas do 5e.tools]     │
└─────────────────────────────┘
```

---

## Arquivos Impactados

### Novos

| Arquivo | Propósito |
|---------|-----------|
| `scripts/crawl-5etools-items.ts` | Crawler Node.js para gerar items.json |
| `public/srd/items.json` | Dataset estático consolidado |
| `components/compendium/ItemBrowser.tsx` | Browser com filtros e split-panel |
| `components/oracle/ItemCard.tsx` | Card de detalhe do item |

### Modificados

| Arquivo | Mudança |
|---------|---------|
| `lib/srd/srd-loader.ts` | +SrdItem interface, +loadItems() |
| `lib/srd/srd-cache.ts` | +object store "items" no IDB, +get/setCachedItems, bump DB_VERSION |
| `lib/srd/srd-search.ts` | +buildItemIndex(), +searchItems(), +getItemById(), +getAllItems() |
| `lib/stores/srd-store.ts` | +items state, +loadItems no initializeSrd() |
| `lib/stores/pinned-cards-store.ts` | +type "item" no PinnedCard union |
| `app/app/compendium/page.tsx` | +tab "items", +import ItemBrowser |
| `messages/pt-BR.json` | +i18n keys namespace compendium |
| `messages/en.json` | +i18n keys namespace compendium |

---

## i18n Keys Adicionadas

### compendium namespace

```json
{
  "tab_items": "Itens",
  "select_item": "Selecione um item da lista para ver seus detalhes",
  "items_found_aria": "{count} itens encontrados",
  "filter_mundane": "Mundano",
  "filter_magic": "Mágico",
  "filter_all": "Todos",
  "filter_rarity": "Raridade",
  "filter_attunement": "Sintonia",
  "filter_weapon_category": "Categoria",
  "sort_value": "Valor",
  "sort_rarity": "Raridade",
  "item_type_melee_weapon": "Arma Corpo a Corpo",
  "item_type_ranged_weapon": "Arma à Distância",
  "item_type_light_armor": "Armadura Leve",
  "item_type_medium_armor": "Armadura Média",
  "item_type_heavy_armor": "Armadura Pesada",
  "item_type_shield": "Escudo",
  "item_type_potion": "Poção",
  "item_type_scroll": "Pergaminho",
  "item_type_ring": "Anel",
  "item_type_wand": "Varinha",
  "item_type_rod": "Bastão",
  "item_type_staff": "Cajado",
  "item_type_wondrous": "Maravilhoso",
  "item_type_adventuring_gear": "Equipamento",
  "item_type_tool": "Ferramenta",
  "item_type_instrument": "Instrumento",
  "item_type_ammunition": "Munição",
  "item_type_trade_good": "Mercadoria",
  "item_type_art_object": "Objeto de Arte",
  "item_type_gemstone": "Gema",
  "item_type_vehicle": "Veículo",
  "item_type_mount": "Montaria",
  "item_type_food_drink": "Comida/Bebida",
  "item_type_other": "Outro",
  "item_cost": "Custo",
  "item_weight": "Peso",
  "item_damage": "Dano",
  "item_properties": "Propriedades",
  "item_requires_attunement": "requer sintonia",
  "item_charges": "Cargas",
  "item_recharge": "Recarga",
  "item_rarity_none": "Mundano",
  "item_rarity_common": "Comum",
  "item_rarity_uncommon": "Incomum",
  "item_rarity_rare": "Raro",
  "item_rarity_very_rare": "Muito Raro",
  "item_rarity_legendary": "Lendário",
  "item_rarity_artifact": "Artefato",
  "item_rarity_varies": "Variável",
  "item_rarity_unknown": "Desconhecido",
  "item_weapon_simple": "Simples",
  "item_weapon_martial": "Marcial"
}
```

---

## Decisões de Design

1. **JSON único consolidado** — Mundanos e mágicos no mesmo arquivo, campo `isMagic` computado no crawler. Simplifica cache, store e search.
2. **Virtual scrolling obrigatório** — 2.600+ itens. Usar react-window como MonsterBrowser.
3. **Toggle Mundano/Mágico como filtro primário** — O caso de uso mais comum é "quero equipar" vs "quero ver magia". Proeminente no topo.
4. **Filtros contextuais** — Raridade e Attunement só aparecem em modo Mágico/Todos. Categoria de arma só aparece quando tipo Arma selecionado.
5. **Cores de raridade na borda** — Consistente com SpellBrowser (borda por level), agora borda por raridade.
6. **Entries como string[]** — Flatten do modelo complexo do 5e.tools no crawler, não no runtime.
7. **Dataset completo** — Todos os itens do 5e.tools, sem filtro SRD-only.
8. **Edition derivada da source** — XPHB/XDMG = 2024, PHB/DMG = 2014.
