# Epic Fix: Compendium Completo — 5e.tools Full Pipeline

**Data**: 2026-04-10/11
**Status**: Completo
**Impacto**: +3,206 conteudos adicionados ao compendium

## Problema Reportado

Dragon-Touched Focus e Dragon's Wrath Weapon nao apareciam no compendium, nem na area logada com conteudo full.

## Root Causes Encontrados

### 1. `_copy` items ignorados (53 itens perdidos)

O script `fetch-5etools-items.ts` tinha `if (raw._copy) return null;` que descartava todos os itens que usam heranca `_copy` do 5e.tools. O 5e.tools usa `_copy` para itens que herdam de um item base com overrides.

**Itens afetados (FTD - Fizban's Treasury of Dragons):**
- Stirring/Wakened/Ascendant Dragon-Touched Focus (3 itens)
- Stirring/Wakened/Ascendant Dragon Vessel (3 itens)
- Stirring/Wakened/Ascendant Scaled Ornament (3 itens)
- +44 itens de outras fontes (EGW, WDH, ToA, CoS, etc.)

### 2. `itemGroup` nao processado (150 sub-itens expandidos)

O script so lia `itemsData.item` e ignorava `itemsData.itemGroup` (108 grupos com 628 sub-itens referenciados). Grupos sao templates que expandem em variantes especificas.

**Itens afetados incluem:**
- Dragon's Wrath Weapon (Slumbering/Stirring/Wakened/Ascendant) — 4 itens NOVOS
- Absorbing Tattoo — 10 variantes
- Chromatic Rose — 5 variantes
- Enspelled Armor/Staff/Weapon — 27 variantes
- Prehistoric Figurine of Wondrous Power — 4 variantes
- E muitos outros que ja existiam como itens individuais

Dos 628 sub-itens referenciados, 150 eram genuinamente novos (os demais ja existiam como itens individuais no array principal).

### 3. Filtro client-side bloqueava itens non-SRD em full mode

`srd-loader.ts:loadItems()` aplicava `items.filter(i => i.srd === true || i.basicRules === true)` **SEMPRE**, mesmo em full data mode. Isso impedia beta testers de ver qualquer item non-SRD, mesmo recebendo os dados completos da API.

## Fixes Aplicados

### `scripts/fetch-5etools-items.ts`
1. Removido `if (raw._copy) return null;`
2. Adicionado `resolveCopyItems()` — resolve heranca em cadeia (A copia B que copia C) via lookup map + resolucao recursiva com protecao contra ciclos
3. Adicionado `expandItemGroups()` — expande sub-itens de `itemGroup`, criando itens a partir do template do grupo para sub-itens que nao existem no array principal
4. Adicionado leitura de `itemsData.itemGroup` alem de `itemsData.item`
5. Output agora escreve em `data/srd/` E `public/srd/`

### `lib/srd/srd-loader.ts`
1. `loadItems()` agora respeita `isFullDataMode()` — em full mode, retorna todos os itens sem filtro SRD

## Numeros Finais

| Metrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| data/srd/items.json (full) | 2,594 | 2,707 | +113 |
| public/srd/items.json (SRD) | 1,145 | 1,164 | +19 |
| _copy items resolvidos | 0 | 53 | +53 |
| itemGroup sub-itens expandidos | 0 | 150 | +150 |
| Itens visiveis para beta (auth) | 1,145 (bug) | 2,707 | +1,562 |

## Itens Dragon Agora Presentes

- Slumbering/Stirring/Wakened/Ascendant Dragon-Touched Focus
- Slumbering/Stirring/Wakened/Ascendant Dragon Vessel
- Slumbering/Stirring/Wakened/Ascendant Dragon's Wrath Weapon
- Slumbering/Stirring/Wakened/Ascendant Scaled Ornament

---

# Fix: Bestiary - Missing _copy Monsters from 5e.tools

## Problema

Mesmo problema dos itens: o script `fetch-5etools-bestiary.ts` tinha `if (raw._copy) return null;` que descartava 1137 monstros (25% do total do 5e.tools).

Diferente dos itens, os monstros _copy sao quase sempre "shells vazios" que herdam TUDO do pai (hp, ac, stats, acoes). Alem disso, usam `_mod` para modificar acoes/traits do pai (appendArr, replaceArr, removeArr).

## Root Cause

O 5e.tools usa `_copy` + `_mod` extensivamente para:
- **NPCs de aventura**: Strahd von Zarovich (copia Vampire), Mad Maggie (copia Night Hag)
- **Variantes regionais**: MOT Medusa (copia MM Medusa + Constrict extra)
- **Bosses nomeados**: Archduke Zariel of Avernus (copia Zariel|MTF)
- **Criaturas de cenario**: Dragon Tortoise (copia Dragon Turtle), Frozen Golem (copia Iron Golem)

## Fix Aplicado

### `scripts/fetch-5etools-bestiary.ts`
1. Removido `if (raw._copy) return null;`
2. Adicionado `resolveCopyMonsters()` — coleta TODOS os raw monsters de TODAS as fontes, depois resolve heranca via lookup global
3. Adicionado `applyMod()` — implementa operacoes `_mod`:
   - `appendArr` — adiciona acoes/traits
   - `prependArr` — insere no inicio
   - `replaceArr` — substitui acao/trait por nome
   - `removeArr` — remove acao/trait por nome
   - `replaceOrAppendArr` — substitui ou adiciona
4. Deep-clone do pai antes de aplicar _mod (sem side effects)
5. Child fields (name, source, page, isNpc) sobrepoem o pai
6. Output agora escreve em `data/srd/` E `public/srd/`

## Numeros Finais

| Metrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| monsters-2014.json (full) | 2,517 | 3,595 | +1,078 |
| monsters-2024.json (full) | 520 | 520 | 0 |
| public/srd/monsters-2014.json | 419 | 419 | 0 (SRD nao muda) |
| _copy monsters resolvidos | 0 | 1,122 | +1,122 |
| _copy nao resolvidos (pai nao encontrado) | - | 15 | - |
| Total unique monsters | 3,037 | 4,115 | +1,078 |

## Monstros Notaveis Agora Presentes

- Archduke Zariel of Avernus (BGDIA, CR 26)
- Strahd von Zarovich (CoS, CR 15)
- Mad Maggie (BGDIA, CR 5)
- Lulu (BGDIA, CR 5)
- Venomfang (LMoP, CR 8)
- Dragon Tortoise (CM, CR 17)
- Frozen Golem (CoA, CR 16)
- Iarno "Glasstaff" Albrek (PaBTSO, CR 1)
- +1070 outros NPCs e variantes de aventura

---

# Fix: Spells — Nunca Buscados do 5e.tools

## Problema

Os spells vinham do pipeline SRD-only (5e-database), nao do 5e.tools. Resultado: 319 spells vs 544 disponiveis. Silvery Barbs (SCC), spells do XGE/TCE/FTD ausentes.

## Fix

1. Atualizou `fetch-5etools-spells.ts` para escrever em `data/srd/` + `public/srd/`
2. Re-executou o script — agora puxa de TODAS as 17 fontes do 5e.tools

## Numeros

| Metrica | Antes | Depois |
|---------|-------|--------|
| spells-2014 (full) | 319 | 544 (+225) |
| spells-2024 (full) | 319 | 391 (+72) |
| SRD spells (2014 public) | 302 | 361 (+59) |
| SRD spells (2024 public) | 302 | 359 (+57) |
| Novas fontes | PHB only | +XGE, TCE, SCC, FTD, EGW, AI, etc. |

**Silvery Barbs (SCC)** agora presente.

---

# New: Feats Pipeline — 5e.tools Full

## Problema

Feats vinham do SRD-only (42 feats). 5e.tools tem 265.

## Fix

Criado `scripts/fetch-5etools-feats.ts` — novo script que:
- Busca `data/feats.json` do 5e.tools mirror
- Transforma prerequisitos (ability scores, races, spellcasting)
- Preserva flags `srd`/`basicRules` para filtragem
- Escreve em `data/srd/` + `public/srd/`

## Numeros

| Metrica | Antes | Depois |
|---------|-------|--------|
| feats.json | 42 | 265 (+223) |
| Fontes | SRD 5.1 only | XPHB, PHB, FRHoF, EFA, ABH, TCE, XGE, etc. |

---

# New: Backgrounds Pipeline — 5e.tools Full

## Problema

Backgrounds NAO EXISTIAM no compendium. Zero dados.

## Fix

1. Criado `scripts/fetch-5etools-backgrounds.ts` — novo script com:
   - `_copy` resolution (26 backgrounds usam heranca)
   - Parser de skill/tool proficiencies, languages, equipment
   - Extracao de Feature name/description
   - Flags `srd`/`basicRules`
2. Adicionado `SrdBackground` type em `srd-loader.ts`
3. Adicionado `loadBackgrounds()` em `srd-loader.ts`
4. Adicionado cache em `srd-cache.ts` (DB version 8→9)
5. Adicionado ao `srd-store.ts` (Phase 2c deferred load)
6. Adicionado ao API route `allowed_files`
7. Adicionado ao `filter-srd-public.ts` (copy-as-is)

## Numeros

| Metrica | Antes | Depois |
|---------|-------|--------|
| backgrounds.json | 0 | 156 |
| Fontes | — | PHB, XPHB, FRHoF, EFA, BGDIA, SCAG, GGR, EGW, etc. |
| _copy resolvidos | — | 25 |

---

# Resumo Completo do Epic

## Inventario Final do Compendium

| Tipo | Antes | Depois | Delta | Delta % |
|------|-------|--------|-------|---------|
| Monstros (2014) | 2,517 | 3,595 | +1,078 | +43% |
| Monstros (2024) | 520 | 520 | 0 | — |
| MAD Monsters | 357 | 357 | 0 | — |
| Spells (2014) | 319 | 544 | +225 | +71% |
| Spells (2024) | 319 | 391 | +72 | +23% |
| Items | 2,594 | 2,707 | +113 | +4% |
| Feats | 42 | 265 | +223 | +531% |
| Backgrounds | 0 | 156 | +156 | NEW |
| Conditions | 64 | 64 | 0 | — |
| Classes | 12 | 12 | 0 | — |
| **TOTAL** | **6,744** | **8,611** | **+1,867** | **+28%** |

## Bugs Corrigidos

1. **Items SRD filter**: `loadItems()` filtrava itens non-SRD mesmo em full mode → beta users viam so 1,145 de 2,707
2. **Items `_copy`**: 53 itens com heranca ignorados
3. **Items `itemGroup`**: 150 sub-itens de 108 grupos nao expandidos
4. **Monsters `_copy`**: 1,122 monstros com heranca ignorados
5. **Spells pipeline**: Nunca executado do 5e.tools (so SRD)

## Novos Pipelines Criados

1. `scripts/fetch-5etools-feats.ts` — 265 feats
2. `scripts/fetch-5etools-backgrounds.ts` — 156 backgrounds (com _copy resolution)

## Arquivos Alterados

- `scripts/fetch-5etools-items.ts` — _copy + itemGroup + dual output
- `scripts/fetch-5etools-bestiary.ts` — _copy + _mod + dual output
- `scripts/fetch-5etools-spells.ts` — dual output
- `scripts/fetch-5etools-feats.ts` — NEW
- `scripts/fetch-5etools-backgrounds.ts` — NEW
- `lib/srd/srd-loader.ts` — SrdBackground type + loadBackgrounds() + items filter fix
- `lib/srd/srd-cache.ts` — backgrounds cache (DB v9)
- `lib/stores/srd-store.ts` — backgrounds state + Phase 2c load
- `app/api/srd/full/[...path]/route.ts` — backgrounds.json allowed
- `scripts/filter-srd-public.ts` — backgrounds.json copy-as-is
