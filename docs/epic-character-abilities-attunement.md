# Epic: Character Abilities & Attunement Tracking

**Data**: 2026-04-11
**Status**: Em execução
**Objetivo**: Sistema persistente de ficha de personagem com tracking de abilities (class features, racial traits, feats) e attunement de itens mágicos (3 slots), com dados SRD + adição manual, persistidos entre sessões.

---

## Escopo

### 1. Character Abilities (Tab nova no Player HQ)
- Nova tabela `character_abilities` no Supabase
- Índice SRD consolidado: class features (12 classes × 20 levels) + racial traits (9 raças) + feats (42) + subclass features (12)
- Dialog de adicionar ability com autocomplete SRD + manual
- Card de ability com dots recarregáveis (short/long rest)
- Filtros por tipo: All / Class / Racial / Feats
- Integração com RestResetPanel para reset automático

### 2. Item Attunement (Seção no Inventory tab)
- Expandir `character_inventory_items` com campos de attunement
- Seção visual de 3 slots de attunement no topo do inventário
- Picker para attune: itens do inventário + busca SRD + manual
- Badges de raridade e magia nos itens

---

## Arquitetura de Dados

### Nova tabela: `character_abilities`

```sql
CREATE TABLE character_abilities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_pt             TEXT,
  description         TEXT,
  description_pt      TEXT,
  ability_type        TEXT NOT NULL DEFAULT 'manual'
    CHECK (ability_type IN ('class_feature','racial_trait','feat','subclass_feature','manual')),
  source_class        TEXT,
  source_race         TEXT,
  level_acquired      INTEGER,
  max_uses            INTEGER,          -- null = passiva/ilimitada
  current_uses        INTEGER DEFAULT 0,
  reset_type          TEXT CHECK (reset_type IN ('short_rest','long_rest','dawn','manual') OR reset_type IS NULL),
  srd_ref             TEXT,
  source              TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('srd','manual')),
  display_order       INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

### Expandir `character_inventory_items`

```sql
ALTER TABLE character_inventory_items
  ADD COLUMN is_attuned    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN rarity        TEXT,
  ADD COLUMN is_magic      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN attune_notes  TEXT,
  ADD COLUMN srd_ref       TEXT;
```

---

## UI Architecture

### Player HQ Tabs (nova ordem)

```
Map | Sheet | Resources | ⚡ Abilities | Inventory | Notes | Quests
```

### Abilities Tab Layout

```
┌─────────────────────────────────────┐
│ [All] [Class] [Racial] [Feats]      │  ← Filtros
│                                      │
│ ── CLASS FEATURES ──────────────    │
│ ┌────────────────────────────────┐  │
│ │ ⚔ Second Wind           [SRD] │  │
│ │ Fighter · Level 1              │  │
│ │ ● ○  (1/2)  · Short Rest      │  │
│ │ > Bonus action: regain HP...   │  │
│ └────────────────────────────────┘  │
│                                      │
│ ── FEATS ────────────────────────   │
│ ┌────────────────────────────────┐  │
│ │ 🎲 Lucky                [SRD] │  │
│ │ Feat · Long Rest               │  │
│ │ ● ● ○  (2/3 luck points)      │  │
│ │ > 3 luck points. Reroll...     │  │
│ └────────────────────────────────┘  │
│                                      │
│ [+ Add Ability]                      │
└──────────────────────────────────────┘
```

### Attunement Section (topo do Inventory tab)

```
┌─ ATTUNEMENT ─────────────── 2/3 ──┐
│ ⬡ +1 Arcane Grimoire    [unlink]  │
│   Uncommon · Wizard only           │
│ ⬡ Cloak of Protection   [unlink]  │
│   Uncommon                         │
│ ◇ ── slot vazio ── [+ Attune]     │
└─────────────────────────────────────┘
```

---

## Stories

### Sprint 1 — Abilities Core

| ID | Título | Deps |
|----|--------|------|
| AB-01 | Migration `character_abilities` + types + RLS | - |
| AB-02 | SRD ability index consolidado (class features + racial + feats) | - |
| AB-03 | Hook `useCharacterAbilities` (CRUD + reset) | AB-01 |
| AB-04 | `AbilityCard` component com dots recarregáveis | - |
| AB-05 | `AddAbilityDialog` (SRD autocomplete + manual) | AB-02 |
| AB-06 | Abilities Tab no `PlayerHqShell` | AB-03, AB-04, AB-05 |
| AB-07 | Integrar abilities no `RestResetPanel` | AB-03 |

### Sprint 2 — Attunement

| ID | Título | Deps |
|----|--------|------|
| AT-01 | Migration expand `character_inventory_items` | - |
| AT-02 | Hook `useAttunement` + expand `usePersonalInventory` | AT-01 |
| AT-03 | `AttunementSection` component (3 slots visuais) | AT-02 |
| AT-04 | `AttuneItemPicker` (inventário + SRD + manual) | AT-02 |

### Sprint 3 — Polish

| ID | Título | Deps |
|----|--------|------|
| PL-01 | i18n PT-BR/EN completo | AB-06, AT-03 |
| PL-02 | DM visibility (abilities + attunement dos players) | AB-01, AT-01 |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| SRD compliance (class features não-SRD) | Filtrar por `source: "SRD 5.1"` no público |
| Performance (200+ features no autocomplete) | Fuse.js com lazy-load, mesma abordagem dos monsters |
| Attunement max 3 no DB | App-layer enforcement (`items.filter(i => i.is_attuned).length < 3`) |
| Combat parity (Guest mode) | Guest = manual only, sem SRD browse (inferior by design) |

---

## SRD Data Sources

| Fonte | Arquivo | Qtd |
|-------|---------|-----|
| Feats | `data/srd/feats.json` | 42 |
| Class Features | `data/srd/class-*.json` (12) | ~200+ |
| Subclass Features | `data/srd/subclasses-srd.json` | 12 subclasses |
| Racial Traits | `lib/srd/races-data.ts` | 9 raças |
| Items (attunement) | `data/srd/items.json` | 962 com reqAttune |
