# EPIC: Compendium i18n — Area Logada (PT-BR)

**Data:** 2026-04-15
**Status:** Planejado
**Prioridade:** P0

---

## Resumo Executivo

O compendio publico (`/compendium/*`) ja tem i18n completo com toggle EN/PT-BR, busca bilingue e 7268 itens traduzidos. Porem o compendio da area logada (`/app/compendium`) mostra TUDO em ingles — nomes de monstros, magias, itens, talentos, antecedentes, e todas as fichas (stat blocks). Esta epic traz **paridade total** de i18n com o compendio publico.

**Principio:** A experiencia de traducao na area logada DEVE ser identica a do compendio publico — mesmos hooks, mesmos padroes visuais, mesmos toggles.

---

## Situacao Atual vs Desejada

### Hoje (area logada)
- Nomes de monstros/magias/itens: **ingles**
- Fichas de monstros (MonsterStatBlock): **ingles puro** (sem `useMonsterTranslation`)
- Fichas de magias (SpellCard): **ingles puro** (sem hook de traducao)
- Fichas de itens (ItemCard): **ingles puro**
- Busca Fuse.js: **somente ingles** (keys: name, type, cr)
- Termos D&D (size, type, alignment, damage, conditions): **ingles**
- Filtros (Creature Types, Sizes): **arrays hardcoded em ingles**
- Toggle de idioma: **inexistente**

### Desejado (espelhando o compendio publico)
- `LanguageToggle` pill button na barra de filtros de cada browser (igual PublicMonsterGrid)
- Toggle por ficha no stat block (texto + botao gold, igual PublicMonsterStatBlock)
- Nomes bilingues: primario no idioma selecionado + subtitulo no idioma alternativo (italic)
- Fichas completas em PT-BR com `STAT_LABELS` bilingue (igual PublicMonsterStatBlock)
- Busca bilingue (encontra tanto "Red Dragon" quanto "Dragao Vermelho")
- Filtros traduzidos (types, sizes, schools, etc.)
- Fallback gracioso (sem traducao → mostra ingles)

---

## Referencia: Padroes do Compendio Publico (SEGUIR EXATAMENTE)

### Padrao 1: Grid/Lista — LanguageToggle na barra de filtros
**Referencia:** `PublicMonsterGrid.tsx:239-246`, `PublicSpellGrid.tsx:300-335`, `PublicItemGrid.tsx:375-383`
```
[Search] [Filters] [...]
[Count text]                    [LanguageToggle size="sm"]
```
- `useLocalePreference(locale)` → `[descLang, setDescLang]`
- Toggle posicionado bottom-right da barra de filtros
- `LanguageToggle` pill button com gold highlight

### Padrao 2: Nome bilingue (primario + subtitulo)
**Referencia:** `PublicMonsterGrid.tsx:79-83`
```typescript
const displayName = isPt ? (m.namePt ?? m.name) : (m.nameEn ?? m.name);
const subtitleName = isPt ? m.nameEn : (m.namePt ?? null);
// subtitleName renderizado em italic, menor, abaixo do nome
```

### Padrao 3: Stat Block — Toggle com texto + botao gold
**Referencia:** `PublicMonsterStatBlock.tsx:180-212`
```
[Status text] [Toggle button gold] [Optional "Sempre PT-BR" link]
```
- Container: `"flex items-center gap-2 text-xs text-[var(--5e-text-muted)] mb-3"`
- Status: "Ficha em PT-BR" / "Ficha em ingles (RAW)"
- Botao: `"px-2 py-0.5 rounded border border-[var(--5e-accent-gold)]/30 text-[var(--5e-accent-gold)] hover:bg-[var(--5e-accent-gold)]/10"`
- Texto botao: "Ver em ingles" / "Traduzir"
- "Sempre PT-BR": link underline para setar preferencia global
- Usa `useMonsterTranslation(slug, locale)` hook

### Padrao 4: STAT_LABELS bilingue
**Referencia:** `PublicMonsterStatBlock.tsx:84-127`
```typescript
const STAT_LABELS = {
  "en": { armorClass: "Armor Class", hitPoints: "Hit Points", speed: "Speed", ... },
  "pt-BR": { armorClass: "Classe de Armadura", hitPoints: "Pontos de Vida", speed: "Velocidade", ... },
};
const L = STAT_LABELS[translated ? "pt-BR" : "en"];
```

### Padrao 5: Termos D&D traduzidos condicionalmente
**Referencia:** `PublicMonsterStatBlock.tsx:149-173`
```typescript
const savingThrows = t ? translateSavingThrows(monster.saving_throws) : formatEN(monster.saving_throws);
const skills = t ? translateSkills(monster.skills) : formatEN(monster.skills);
const speedStr = t ? translateSpeed(monster.speed) : formatSpeed(monster.speed);
const sizeStr = t ? translateSize(monster.size) : monster.size;
const typeStr = t ? translateType(monster.type) : monster.type;
// ...todas as helpers de dnd-terms-ptbr.ts
```

---

## Arquitetura Tecnica

### Assets Existentes (Reutilizar, NAO Recriar)

| Asset | Localizacao | Uso no Public | Uso no Auth (desejado) |
|-------|-------------|---------------|------------------------|
| `useMonsterTranslation` | `lib/hooks/useMonsterTranslation.ts` | PublicMonsterStatBlock | MonsterStatBlock |
| `useLocalePreference` | `lib/hooks/useLocalePreference.ts` | Todos os Public*Grid | Todos os *Browser |
| `LanguageToggle` | `components/public/shared/LanguageToggle.tsx` | Todos os Public*Grid | Todos os *Browser |
| `STAT_LABELS` | `PublicMonsterStatBlock.tsx:84-127` | PublicMonsterStatBlock | MonsterStatBlock (extrair) |
| `dnd-terms-ptbr.ts` | `lib/i18n/dnd-terms-ptbr.ts` | PublicMonsterStatBlock | MonsterStatBlock |
| `monster-descriptions-pt.json` | `data/srd/` (4093) | useMonsterTranslation | useMonsterTranslation |
| `spell-descriptions-pt.json` | `data/srd/` (575) | PublicSpellCard | SpellCard (novo hook) |
| `item-descriptions-pt.json` | `data/srd/` (1985) | PublicItemGrid | ItemBrowser |
| `feat-descriptions-pt.json` | `data/srd/` (216) | — | FeatBrowser |
| `background-descriptions-pt.json` | `data/srd/` (145) | — | BackgroundBrowser |

### Decisoes Arquiteturais

**D1: Hooks — Reutilizar os existentes, NAO criar novos**
- `useLocalePreference` para estado global de idioma nos browsers (mesmo hook do public)
- `useMonsterTranslation` para stat block de monstro (mesmo hook do public)
- NOVO: `useSpellTranslation` (mesmo padrao do useMonsterTranslation)
- NAO criar `useCompendiumLanguage` — usar `useLocalePreference` diretamente

**D2: LanguageToggle — Mover para shared**
- Mover `components/public/shared/LanguageToggle.tsx` → `components/shared/LanguageToggle.tsx`
- Re-export no path antigo pra compatibilidade

**D3: STAT_LABELS — Extrair para modulo compartilhado**
- Extrair de `PublicMonsterStatBlock.tsx` para `lib/i18n/stat-labels.ts`
- Reutilizar no `MonsterStatBlock` (auth) e no `PublicMonsterStatBlock` (public)

**D4: Translation name loader — Centralizar**
- NOVO: `lib/srd/translation-loader.ts` — loaders com cache singleton pra todos os tipos
- Lazy-load via dynamic import (mesmo padrao do `useMonsterTranslation`)

**D5: Busca bilingue no Fuse.js**
- Adicionar `name_pt` ao index (weight 0.3, mesmo padrao de abilities)
- Rebuild quando traducoes carregam

---

## Componentes Afetados

### Pagina Principal
- `app/app/compendium/page.tsx` — NÃO precisa de toggle aqui (toggle fica em cada browser)

### Browser Components (lista lateral) — toggle na barra de filtros
- `components/compendium/MonsterBrowser.tsx` — LanguageToggle + nomes PT + filtros traduzidos
- `components/compendium/SpellBrowser.tsx` — LanguageToggle + nomes PT + filtros traduzidos
- `components/compendium/ItemBrowser.tsx` — LanguageToggle + nomes PT + filtros traduzidos
- `components/compendium/FeatBrowser.tsx` — LanguageToggle + nomes PT
- `components/compendium/BackgroundBrowser.tsx` — LanguageToggle + nomes PT
- `components/compendium/RaceBrowser.tsx` — LanguageToggle + nomes PT (ja tem namePt nativo)
- `components/compendium/ClassBrowser.tsx` — LanguageToggle + nomes PT (ja tem name_pt nativo)
- `components/compendium/ConditionReference.tsx` — LanguageToggle + nomes/descricoes PT

### Stat Block / Detail Components — toggle por ficha
- `components/oracle/MonsterStatBlock.tsx` — toggle texto+botao gold + traducao completa (igual PublicMonsterStatBlock)
- `components/oracle/SpellCard.tsx` — toggle texto+botao gold + traducao completa
- `components/oracle/ItemCard.tsx` — traducao de nome + labels

### Infraestrutura
- `lib/srd/translation-loader.ts` — NOVO: loaders centralizados com cache
- `lib/hooks/useSpellTranslation.ts` — NOVO: spell translation hook (padrao do monster)
- `lib/i18n/stat-labels.ts` — NOVO: STAT_LABELS extraido do PublicMonsterStatBlock
- `lib/srd/srd-search.ts` — adicionar name_pt ao Fuse index
- `components/shared/LanguageToggle.tsx` — mover de public/shared

---

## Sprint Plan

### Sprint 1 — Infraestrutura + MonsterBrowser (Fundacao)

**Objetivo:** Toggle funcional nos browsers + nomes PT na lista de monstros. Experiencia identica ao PublicMonsterGrid.

#### Story 1.1: Mover LanguageToggle para shared
**Arquivos:**
- `components/public/shared/LanguageToggle.tsx` → `components/shared/LanguageToggle.tsx`
- Re-export: `components/public/shared/LanguageToggle.tsx` → `export { LanguageToggle } from "@/components/shared/LanguageToggle"`
**AC:**
- [ ] Componente movido com zero mudanca de API
- [ ] Todos os imports existentes (Public*Grid) continuam funcionando
- [ ] Zero regressao visual nas paginas publicas

#### Story 1.2: Translation name loader centralizado
**Arquivo:** `lib/srd/translation-loader.ts` (NOVO)
**AC:**
- [ ] `loadMonsterNamesPt(): Promise<Record<string, string>>` — extrai campo `name` de `monster-descriptions-pt.json`
- [ ] `loadSpellNamesPt(): Promise<Record<string, string>>` — extrai `name_pt` de `spell-descriptions-pt.json`
- [ ] `loadItemNamesPt(): Promise<Record<string, string>>` — extrai `name_pt` de `item-descriptions-pt.json`
- [ ] `loadFeatNamesPt(): Promise<Record<string, string>>` — extrai `name_pt` de `feat-descriptions-pt.json`
- [ ] `loadBackgroundNamesPt(): Promise<Record<string, string>>` — extrai `name_pt` de `background-descriptions-pt.json`
- [ ] Module-level cache singleton por tipo (carrega 1x, retorna cached nas proximas)
- [ ] Graceful fallback (catch → return `{}`)
- [ ] Helper `getNamePt(map, slug, fallback): string` — lookup com fallback

#### Story 1.3: MonsterBrowser com LanguageToggle + nomes PT
**Arquivo:** `components/compendium/MonsterBrowser.tsx`
**Referencia:** `PublicMonsterGrid.tsx:79-83, 239-246`
**AC:**
- [ ] `useLocalePreference()` no componente
- [ ] `LanguageToggle` posicionado na barra de filtros (bottom-right, apos o count text) — IGUAL PublicMonsterGrid
- [ ] Quando PT-BR: nome primario = traducao, nome EN como subtitulo italic (se diferente)
- [ ] Quando EN: nome primario = ingles (sem subtitulo)
- [ ] Lookup O(1) via mapa carregado por `loadMonsterNamesPt()`
- [ ] Funciona na lista virtual (react-window) sem degradar performance
- [ ] Preferencia persiste entre refreshes

#### Story 1.4: Extrair STAT_LABELS para modulo compartilhado
**Arquivos:**
- NOVO: `lib/i18n/stat-labels.ts`
- UPDATE: `components/public/PublicMonsterStatBlock.tsx` → importar de stat-labels.ts
**AC:**
- [ ] `STAT_LABELS` exportado de `lib/i18n/stat-labels.ts` (mesmo conteudo de PublicMonsterStatBlock:84-127)
- [ ] PublicMonsterStatBlock importa de la (nao duplica)
- [ ] Zero regressao no PublicMonsterStatBlock

#### Story 1.5: MonsterStatBlock com toggle por ficha (padrao PublicMonsterStatBlock)
**Arquivo:** `components/oracle/MonsterStatBlock.tsx`
**Referencia:** `PublicMonsterStatBlock.tsx:135-212`
**AC:**
- [ ] Nova prop `locale?: "en" | "pt-BR"` — herda de `useLocalePreference` se nao passada
- [ ] Usa `useMonsterTranslation(monster.id, locale)` (mesmo hook do public)
- [ ] Toggle no topo do stat block: status text + botao gold + "Sempre PT-BR" link
  - EXATAMENTE igual `PublicMonsterStatBlock.tsx:180-212`
  - Container: `"flex items-center gap-2 text-xs text-[var(--5e-text-muted)] mb-3"`
  - Botao: `"px-2 py-0.5 rounded border border-[var(--5e-accent-gold)]/30 text-[var(--5e-accent-gold)]..."`
  - Status: "Ficha em PT-BR" / "Ficha em ingles (RAW)"
  - Acao: "Ver em ingles" / "Traduzir"
- [ ] Labels via `STAT_LABELS` importado de `lib/i18n/stat-labels.ts`
- [ ] Termos D&D traduzidos condicionalmente (TODOS os helpers de dnd-terms-ptbr.ts):
  - `translateSize()`, `translateType()`, `translateAlignment()`
  - `translateDamageString()`, `translateConditionString()`
  - `translateSkills()`, `translateSavingThrows()`
  - `translateSenses()`, `translateSpeed()`
- [ ] Descricoes de acoes/habilidades via `getDesc(section, name, fallback)`
- [ ] Nome traduzido via `getName(monster.name)`
- [ ] Funciona nos dois variants (inline e card)

**Estimativa Sprint 1:** 5 stories, ~4-5h de implementacao

---

### Sprint 2 — Todos os Browsers + Busca Bilingue

**Objetivo:** Todos os 8 browsers com nomes PT-BR + busca funcional em ambos idiomas.

#### Story 2.1: SpellBrowser com LanguageToggle + nomes PT
**Arquivo:** `components/compendium/SpellBrowser.tsx`
**Referencia:** `PublicSpellGrid.tsx:145-169, 300-335`
**AC:**
- [ ] `useLocalePreference()` no componente
- [ ] `LanguageToggle` na barra de filtros (agrupado com edition toggle, igual PublicSpellGrid)
- [ ] Nomes de spells traduzidos via `loadSpellNamesPt()`
- [ ] Schools traduzidos (usar SPELL_SCHOOLS_PT map, igual PublicSpellGrid:42-51)
- [ ] Spell levels traduzidos (Cantrip → Truque, "3rd-level" → "3o nivel")
- [ ] Class names traduzidos

#### Story 2.2: ItemBrowser com LanguageToggle + nomes PT
**Arquivo:** `components/compendium/ItemBrowser.tsx`
**Referencia:** `PublicItemGrid.tsx:175-182, 375-383`
**AC:**
- [ ] `useLocalePreference()` + `LanguageToggle` na barra de filtros
- [ ] Nomes de itens traduzidos via `loadItemNamesPt()`
- [ ] Rarity names traduzidos (Common → Comum, etc)
- [ ] Type names traduzidos

#### Story 2.3: FeatBrowser + BackgroundBrowser nomes PT
**Arquivos:** `FeatBrowser.tsx`, `BackgroundBrowser.tsx`
**AC:**
- [ ] `useLocalePreference()` + `LanguageToggle` em ambos
- [ ] Nomes traduzidos via loaders respectivos

#### Story 2.4: RaceBrowser + ClassBrowser nomes PT
**Arquivos:** `RaceBrowser.tsx`, `ClassBrowser.tsx`
**AC:**
- [ ] `useLocalePreference()` + `LanguageToggle`
- [ ] Racas: usar `namePt` nativo dos dados (ja existe em races-data.ts)
- [ ] Classes: usar `name_pt` nativo (ja existe em classes-full.json)

#### Story 2.5: ConditionReference traduzido
**Arquivo:** `components/compendium/ConditionReference.tsx`
**Referencia:** `PublicConditionsGrid.tsx:199-327`
**AC:**
- [ ] `useLocalePreference()` + `LanguageToggle` (size="md", agrupado com version toggle)
- [ ] Nomes de condicoes traduzidos
- [ ] Descricoes traduzidas (usar maps do PublicConditionsGrid como referencia)
- [ ] Nomes bilingues (primario + subtitulo no idioma alternativo)

#### Story 2.6: Filtros traduzidos no MonsterBrowser
**Arquivo:** `components/compendium/MonsterBrowser.tsx`
**AC:**
- [ ] `CREATURE_TYPES` traduzido quando PT-BR (usar `translateType()`)
- [ ] `SIZES` traduzido (usar `translateSize()`)
- [ ] Filtragem funciona corretamente (match no valor EN, display em PT)
- [ ] Labels de filtros traduzidos

#### Story 2.7: Fuse.js busca bilingue (monsters + spells + items)
**Arquivo:** `lib/srd/srd-search.ts`
**AC:**
- [ ] Monster index: adicionar key `{ name: "name_pt", weight: 0.3 }`
- [ ] Spell index: adicionar key `{ name: "name_pt", weight: 0.3 }`
- [ ] Item index: adicionar key `{ name: "name_pt", weight: 0.3 }`
- [ ] Feat/background index: adicionar key `{ name: "name_pt", weight: 0.3 }`
- [ ] Buscar "Dragao Vermelho" encontra "Adult Red Dragon"
- [ ] Buscar "Bola de Fogo" encontra "Fireball"
- [ ] Rebuild automatico quando traducoes carregam
- [ ] Traducoes injetadas no srd-store Phase 2 (requestIdleCallback)

#### Story 2.8: Carregar traducoes no srd-store Phase 2
**Arquivo:** `lib/stores/srd-store.ts`
**AC:**
- [ ] Na Phase 2 do initializeSrd, chamar translation-loader pra todos os tipos
- [ ] Injetar `name_pt` nos objetos SrdMonster/SrdSpell/SrdItem como campo adicional
- [ ] Rebuild Fuse indexes com name_pt disponivel
- [ ] Fallback: se traducoes falharem, tudo funciona em ingles

**Estimativa Sprint 2:** 8 stories, ~5-6h de implementacao

---

### Sprint 3 — Fichas Traduzidas (SpellCard + ItemCard)

**Objetivo:** SpellCard e ItemCard com traducao completa, igual ao padrao PublicMonsterStatBlock.

#### Story 3.1: `useSpellTranslation` hook
**Arquivo:** `lib/hooks/useSpellTranslation.ts` (NOVO)
**Referencia:** `useMonsterTranslation.ts` (seguir MESMO padrao)
**AC:**
- [ ] Lazy-load de `spell-descriptions-pt.json`
- [ ] Module-level cache singleton
- [ ] `getName(fallback)` → nome PT-BR
- [ ] `getDescription(fallback)` → descricao PT-BR completa
- [ ] `getHigherLevels(fallback)` → texto de upcasting PT-BR
- [ ] `toggle()` para alternancia por ficha
- [ ] Global preference key: `"pocket-dm:spell-lang-global"`
- [ ] Mesmo padrao de translated/globalPtBR/toggle/setGlobalPtBR

#### Story 3.2: SpellCard com traducao completa
**Arquivo:** `components/oracle/SpellCard.tsx`
**Referencia:** `PublicSpellCard.tsx:59-185`
**AC:**
- [ ] Nova prop `locale?: "en" | "pt-BR"`
- [ ] Toggle por ficha no topo (mesmo visual do MonsterStatBlock — texto + botao gold)
- [ ] Nome traduzido
- [ ] Descricao completa traduzida
- [ ] Higher levels traduzido
- [ ] Labels traduzidos: Casting Time → "Tempo de Conjuracao", Range → "Alcance",
  Components → "Componentes", Duration → "Duracao"
- [ ] School names traduzidos (usar SCHOOL_PT map do PublicSpellCard)
- [ ] Spell level format: "Truque de Evocacao" / "Abjuracao de 3o nivel"
- [ ] Classes traduzidos

#### Story 3.3: ItemCard com traducao
**Arquivo:** `components/oracle/ItemCard.tsx`
**AC:**
- [ ] Nome traduzido via `loadItemNamesPt()` map
- [ ] Labels traduzidos (AC → CA, Damage → Dano, Range → Alcance, Weight → Peso, Value → Valor)
- [ ] Rarity names traduzidos (Common → Comum, Rare → Raro, etc)
- [ ] Type names traduzidos
- [ ] Prop `locale?: "en" | "pt-BR"` herdada do browser

#### Story 3.4: SPELL_LABELS bilingue
**Arquivo:** `lib/i18n/spell-labels.ts` (NOVO)
**AC:**
- [ ] SPELL_LABELS com keys EN e PT-BR (Casting Time, Range, Components, Duration, Classes)
- [ ] SCHOOL_PT map (extraido de PublicSpellCard)
- [ ] SPELL_LEVELS_PT map (extraido de PublicSpellGrid)
- [ ] CLASS_PT map (extraido de PublicSpellGrid)
- [ ] Reutilizado por SpellCard (auth) e PublicSpellCard (public)

#### Story 3.5: ITEM_LABELS bilingue
**Arquivo:** `lib/i18n/item-labels.ts` (NOVO)
**AC:**
- [ ] ITEM_LABELS com keys EN e PT-BR
- [ ] RARITY_PT map
- [ ] ITEM_TYPE_PT map
- [ ] Reutilizado por ItemCard (auth) e PublicItemGrid (public)

**Estimativa Sprint 3:** 5 stories, ~4-5h de implementacao

---

### Sprint 4 — Polish + Integracao

**Objetivo:** Refinamento, sync Supabase, edge cases.

#### Story 4.1: Fallback visual com badge `EN`
**AC:**
- [ ] Quando nao existe traducao pra um item, mostra nome ingles sem subtitulo
- [ ] Indicacao sutil que nao tem traducao (opacity reduzida ou badge `EN` 10px cinza)
- [ ] Nao intrusivo, consistente em todos os browsers

#### Story 4.2: Sync preferencia com Supabase
**AC:**
- [ ] Quando user logado muda idioma, salvar em `users.preferred_language` via `/api/user/language`
- [ ] Na inicializacao, ler preferencia do Supabase (endpoint GET ja existe)
- [ ] localStorage tem prioridade (resposta imediata), Supabase e backup

#### Story 4.3: Keyboard shortcut para toggle
**AC:**
- [ ] `Ctrl+Shift+L` / `Cmd+Shift+L` alterna idioma no compendio
- [ ] Toast discreto: "Idioma: Portugues" / "Language: English"

#### Story 4.4: Testes E2E
**AC:**
- [ ] Toggle global muda idioma de todos os browsers
- [ ] Busca bilingue encontra em ambos idiomas
- [ ] Toggle por ficha funciona independente do global
- [ ] Preferencia persiste entre refreshes
- [ ] Zero regressao nas paginas publicas

#### Story 4.5: Code review — paridade com public
**AC:**
- [ ] Comparar visual do toggle em cada browser (auth vs public) — deve ser identico
- [ ] Comparar visual do stat block toggle (auth vs public) — deve ser identico
- [ ] Verificar que todos os helpers de dnd-terms-ptbr.ts estao aplicados
- [ ] Verificar que nenhum STAT_LABELS esta duplicado (tudo importado de stat-labels.ts)

**Estimativa Sprint 4:** 5 stories, ~3-4h de implementacao

---

## Ordem de Execucao

```
Sprint 1 (Fundacao)         → ~4-5h
  1.1 Mover LanguageToggle para shared
  1.2 Translation name loader centralizado
  1.3 MonsterBrowser com toggle + nomes PT
  1.4 Extrair STAT_LABELS
  1.5 MonsterStatBlock com toggle por ficha (igual PublicMonsterStatBlock)

Sprint 2 (Amplitude)        → ~5-6h
  2.1 SpellBrowser com toggle + nomes PT + filtros
  2.2 ItemBrowser com toggle + nomes PT
  2.3 FeatBrowser + BackgroundBrowser
  2.4 RaceBrowser + ClassBrowser
  2.5 ConditionReference traduzido
  2.6 MonsterBrowser filtros traduzidos
  2.7 Fuse.js busca bilingue
  2.8 Traducoes no srd-store Phase 2

Sprint 3 (Profundidade)     → ~4-5h
  3.1 useSpellTranslation hook
  3.2 SpellCard traducao completa + toggle por ficha
  3.3 ItemCard traducao
  3.4 SPELL_LABELS extraidos
  3.5 ITEM_LABELS extraidos

Sprint 4 (Polish)           → ~3-4h
  4.1 Fallback badge EN
  4.2 Sync Supabase
  4.3 Keyboard shortcut
  4.4 Testes E2E
  4.5 Code review paridade
```

**Total: 23 stories, ~16-20h de implementacao**

---

## Riscos e Mitigacoes

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Performance: lazy-load JSONs grandes | Media | Medio | Module-level cache, carrega 1x |
| Fuse.js rebuild com name_pt | Baixa | Baixo | Abilities ja faz isso, ~50ms |
| Hydration flash no toggle | Media | Medio | Leitura sincrona no useState init (padrao existente) |
| Traducao faltante (MAD monsters) | Alta | Baixo | Fallback EN, badge visual |
| react-window re-render | Media | Medio | useMemo nos nomes resolvidos |
| Duplicacao de codigo (public vs auth) | Media | Alto | Extrair STAT_LABELS/SPELL_LABELS pra modulos shared |

---

## Metricas de Sucesso

- [ ] 100% dos 8 browsers mostram nomes em PT-BR quando toggle ativo
- [ ] Busca bilingue encontra conteudo em ambos idiomas
- [ ] MonsterStatBlock identico visualmente ao PublicMonsterStatBlock quando traduzido
- [ ] SpellCard identico visualmente ao PublicSpellCard quando traduzido
- [ ] Zero regressao de performance (lista virtual, busca)
- [ ] Zero regressao nas paginas publicas
- [ ] Preferencia persiste entre sessoes
- [ ] Toggle por ficha funciona independente do global
