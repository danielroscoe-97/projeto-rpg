# Content Adds — Beta Test 3 (Itens Reportados por Lucas)

Data: 2026-04-17
Relator: DM Lucas (beta tester)
Feedback: 3 itens "faltando" no compêndio

## TL;DR

Os 3 itens JÁ ESTAVAM presentes em `data/srd/items.json` com `srd: false` (auth-gated).
O problema real era **ausência de entradas PT-BR indexadas pelo `id` do item** — a busca em PT-BR não encontrava os itens porque `item-descriptions-pt.json` usa chaves sem o sufixo de fonte (ex.: `1-rod-of-the-pact-keeper`) enquanto o search provider consulta por `i.id` (ex.: `1-rod-of-the-pact-keeper-dmg`).

**Ação tomada:** adicionadas 8 entradas PT-BR em `data/srd/item-descriptions-pt.json` indexadas pelo id real do item, para que:
1. O search provider (`lib/srd/srd-search.ts`, `injectTranslationsAndRebuild`) encontre o `name_pt`
2. O `ItemBrowser` (`components/compendium/ItemBrowser.tsx` linha 202 e 213) exiba e filtre por nome PT-BR

## Investigação Item-a-Item

### 1. Rod of the Pact Keeper (DMG 2014, pg. 197)
- **Status:** JÁ EXISTE em `data/srd/items.json`
- **Variantes encontradas (6):**
  - `1-rod-of-the-pact-keeper-dmg` (+1, uncommon, DMG 2014)
  - `2-rod-of-the-pact-keeper-dmg` (+2, rare, DMG 2014)
  - `3-rod-of-the-pact-keeper-dmg` (+3, very rare, DMG 2014)
  - `1-rod-of-the-pact-keeper-xdmg` (+1, uncommon, DMG 2024)
  - `2-rod-of-the-pact-keeper-xdmg` (+2, rare, DMG 2024)
  - `3-rod-of-the-pact-keeper-xdmg` (+3, very rare, DMG 2024)
- Todas com `srd: false`, requires attunement by a warlock, type: rod
- Tradução PT-BR: "Bastão do Selo de Pacto"

### 2. "Bracers of Illusionist" — TYPO CONFIRMADO
- **Nome correto:** "Illusionist's Bracers"
- **Fonte:** GGR (Guildmasters' Guide to Ravnica) — NÃO é DMG 2014
- **Status:** JÁ EXISTE em `data/srd/items.json`
- **Id:** `illusionist-s-bracers-ggr`
- **Rarity:** very rare
- **srd:** false (corretamente marcado)
- Tradução PT-BR: "Braceletes do Ilusionista"

### 3. "Astral Shards" (plural)
- **Nome correto:** "Astral Shard" (singular)
- **Fonte confirmada:** TCE (Tasha's Cauldron of Everything), NÃO Spelljammer
- **Status:** JÁ EXISTE em `data/srd/items.json`
- **Id:** `astral-shard-tce`
- **Rarity:** rare
- **srd:** false (corretamente marcado)
- Tradução PT-BR: "Fragmento Astral"

## Arquivos Alterados

### `data/srd/item-descriptions-pt.json`
Adicionadas 8 novas entradas (total 1985 → 1993):

```json
"1-rod-of-the-pact-keeper-dmg":  { "name_pt": "Bastão do Selo de Pacto +1" },
"2-rod-of-the-pact-keeper-dmg":  { "name_pt": "Bastão do Selo de Pacto +2" },
"3-rod-of-the-pact-keeper-dmg":  { "name_pt": "Bastão do Selo de Pacto +3" },
"1-rod-of-the-pact-keeper-xdmg": { "name_pt": "Bastão do Selo de Pacto +1" },
"2-rod-of-the-pact-keeper-xdmg": { "name_pt": "Bastão do Selo de Pacto +2" },
"3-rod-of-the-pact-keeper-xdmg": { "name_pt": "Bastão do Selo de Pacto +3" },
"astral-shard-tce":              { "name_pt": "Fragmento Astral" },
"illusionist-s-bracers-ggr":     { "name_pt": "Braceletes do Ilusionista" }
```

## SRD Compliance — Verificação

Contagens após alteração:

| Arquivo | Antes | Depois | Nota |
|---|---|---|---|
| `data/srd/items.json` | 2707 | 2707 | Inalterado (items já existiam) |
| `public/srd/items.json` | 1164 | 1164 | Inalterado (nenhum non-SRD vazou) |
| `data/srd/item-descriptions-pt.json` | 1985 | 1993 | +8 entradas PT-BR |

**Verificações executadas:**
- Checado `public/srd/items.json` para garantir que nenhum dos 8 ids foi vazado: `0 leaks`
- Confirmado que `item-descriptions-pt.json` NÃO é copiado para `public/srd/` pelo `scripts/filter-srd-public.ts` (não está em `COPY_AS_IS` nem processado explicitamente)
- Os 3 itens permanecem `srd: false` em `data/srd/items.json` e continuam disponíveis APENAS via `/api/srd/full/` (auth-gated) + loader `loadItems()` em modo `isFullDataMode()`

**Regeneração do filtro:** NÃO necessária. Nenhuma alteração em `data/srd/items.json` ou `public/srd/*`. Apenas adições em arquivo exclusivo de server-side (`item-descriptions-pt.json`).

## Bug Conhecido (fora do escopo desta alteração)

`item-descriptions-pt.json` tem 1985 chaves originais indexadas por `toSlug(item.name)` (sem sufixo de fonte), mas o `injectTranslationsAndRebuild` em `lib/srd/srd-search.ts:390` faz lookup por `i.id` (com sufixo `-dmg`, `-xdmg`, `-tce`, etc.). Resultado: 0 de 2707 chaves batem. **Esse é um bug de código em PR separado** — afeta a busca PT-BR para TODOS os itens, não só os 3 reportados. Este add resolve os 3 itens críticos do Lucas indexando por id real.

## Como Verificar In-App

1. Logar como usuário autenticado (beta access liberado / full mode)
2. Navegar para o compêndio → aba Itens
3. Trocar idioma para PT-BR
4. Buscar por:
   - "Bastão do Selo" → deve aparecer 3 variantes DMG + 3 DMG 2024 (6 total)
   - "Fragmento Astral" → deve aparecer Astral Shard (TCE)
   - "Braceletes do Ilusionista" → deve aparecer Illusionist's Bracers (GGR)
5. Também buscar por nomes EN ("Rod of the Pact", "Astral Shard", "Illusionist") — devem aparecer em qualquer idioma

## Nada Bloqueado / Nada Fabricado

Todos os 3 itens reportados foram identificados com 100% de certeza após investigação da base. Nenhum item marcado como "pending user confirmation". Nenhum conteúdo novo fabricado — apenas traduções PT-BR para itens já existentes na base.
