# Compendium Overhaul Plan

**Data**: 2026-04-10
**Objetivo**: Refatorar e embelezar todo o compendium publico do Pocket DM
**Escopo**: 26 componentes (~11.800 linhas) em `components/public/`

---

## Diagnostico

### Problemas Criticos
- **100+ instancias de `#D4A853` hardcoded** — tokens `text-gold`, `bg-gold` existem no Tailwind config mas nao sao usados
- **3 notacoes diferentes** para a mesma cor: `text-[#D4A853]`, `text-[var(--5e-accent-gold)]`, `text-amber-400`
- **Dados inline gigantes** — 4 componentes sao 50-63% arrays estaticos misturados com JSX
- **6 padroes duplicados** em quase todos os componentes (LanguageToggle, FilterChips, SearchIcon, toSlug, parseCR, collapse)
- **23+ gaps de acessibilidade** (aria-expanded, aria-pressed, labels, contraste)
- **Inconsistencia visual** entre paginas (hover glow, filtros, empty states, toggle posicao)

### Metricas Alvo
- Zero `#D4A853` hardcoded (usar `gold` tokens)
- Zero `#922610` / `#7a200d` hardcoded (usar `srd.*` tokens)
- Zero `#F5F0E8` hardcoded (usar `foreground` ou `text-primary`)
- Componentes shared reutilizados em 6+ grids
- Dados extraidos: ~1.000 linhas removidas de componentes
- ARIA compliance em todos os interativos

---

## Grafo de Dependencias

```
Onda 1 (Fundacao) ───┬──► Onda 2 (Shared Components)
                     ├──► Onda 3 (Visual Polish)
                     ├──► Onda 4 (Data Extraction)
                     └──► Onda 5 (Accessibility)
```

Ondas 2-5 sao independentes entre si e podem rodar em paralelo.

---

## Onda 1 — Fundacao (BLOQUEANTE)

### 1A. Novos tokens no Tailwind config

Adicionar em `tailwind.config.ts`:
- `boxShadow.gold-subtle`: hover glow padrao dos cards
- `boxShadow.gold-card`: card hover elevado
- Keyframe `card-hover-up`: translateY(-2px) + shadow expand

Adicionar em `globals.css`:
- Classe utilitaria `.card-hover` com transicao padrao
- Classe `.gold-divider` para divisores gold gradient
- Classe `.section-header-srd` para headers vermelhos SRD

### 1B. Find-replace em 26 arquivos

| De | Para |
|----|------|
| `text-[#D4A853]` | `text-gold` |
| `bg-[#D4A853]` | `bg-gold` |
| `border-[#D4A853]` | `border-gold` |
| `hover:text-[#D4A853]` | `hover:text-gold` |
| `hover:bg-[#D4A853]` | `hover:bg-gold` |
| `hover:border-[#D4A853]` | `hover:border-gold` |
| `ring-[#D4A853]` | `ring-gold` |
| `shadow-[#D4A853]` | `shadow-gold` |
| `from-[#D4A853]` | `from-gold` |
| `to-[#D4A853]` | `to-gold` |
| `via-[#D4A853]` | `via-gold` |
| `text-[#922610]` | `text-srd-accent` |
| `bg-[#922610]` | `bg-srd-accent` |
| `border-[#922610]` | `border-srd-accent` |
| `text-[#F5F0E8]` | `text-foreground` |
| `bg-[#1A1A28]` | `bg-surface-secondary` |
| `bg-[#13131E]` | `bg-surface-primary` |
| `bg-[#0e0e18]` | `bg-surface-deep` |
| `bg-[#222234]` | `bg-surface-tertiary` |

### Arquivos afetados (Onda 1B)
- PublicMonsterGrid.tsx
- PublicMonsterStatBlock.tsx
- PublicMonsterSearch.tsx
- PublicSpellGrid.tsx
- PublicSpellCard.tsx
- PublicSpellSearch.tsx
- PublicClassesIndex.tsx
- PublicClassFullDetail.tsx
- PublicSubclassDetail.tsx
- PublicRacesIndex.tsx
- PublicRaceDetail.tsx
- PublicConditionsGrid.tsx
- PublicDiceRoller.tsx
- PublicRulesReference.tsx
- PublicEncounterBuilder.tsx
- PublicAbilityScoresGrid.tsx
- PublicActionsGrid.tsx
- PublicDamageTypesGrid.tsx
- PublicDiseasesGrid.tsx
- PublicNav.tsx
- PublicFooter.tsx
- PublicCTA.tsx

### Done criteria
- [ ] Zero `#D4A853` em componentes public/
- [ ] Zero `#922610` em componentes public/
- [ ] Zero `#F5F0E8` em componentes public/
- [ ] Build passa sem erros

---

## Onda 2 — Componentes Shared

### Novos componentes em `components/public/shared/`

#### LanguageToggle.tsx
- Props: `locale`, `onToggle`, `size?`
- Substitui 6 implementacoes identicas
- Visual: botoes EN/PT com gold active state

#### FilterChips.tsx
- Props: `options`, `selected`, `onSelect`, `multi?`
- Substitui 5 implementacoes de filter buttons
- Visual: chips com gold active, count badge

#### CompendiumSearchInput.tsx
- Props: `placeholder`, `value`, `onChange`, `onClear?`
- SVG icon embutido, focus ring gold
- Substitui 4+ inputs de busca duplicados

#### CollapseSection.tsx
- Props: `open`, `children`, `className?`
- Animacao padrao: grid-template-rows 0fr/1fr
- Substitui 3 tecnicas de collapse diferentes

### Arquivos a refatorar
- PublicMonsterGrid.tsx — usar LanguageToggle, FilterChips, SearchInput
- PublicSpellGrid.tsx — usar LanguageToggle, FilterChips, SearchInput
- PublicClassesIndex.tsx — usar LanguageToggle, FilterChips
- PublicRacesIndex.tsx — usar LanguageToggle, FilterChips, SearchInput
- PublicConditionsGrid.tsx — usar LanguageToggle, FilterChips
- PublicMonsterSearch.tsx — usar SearchInput, FilterChips

### Done criteria
- [ ] 4 componentes shared criados
- [ ] 6 grids refatorados para usar shared
- [ ] Zero duplicacao de LanguageToggle
- [ ] Build passa

---

## Onda 3 — Visual Polish Premium

### 3A. Card System
- Borda superior com gradiente gold → transparente (2px)
- Hover: translateY(-2px) + shadow-gold-subtle + border-gold/20
- Transicao suave (200ms ease-out)
- Background: surface-secondary com micro noise herdado do body

### 3B. Tipografia
- H1/H2: Cinzel com letter-spacing 0.05em
- Subtitulos PT-BR: italic, text-muted-foreground
- Badges/counts: font-mono com tabular-nums
- Body: line-height 1.7 nas descricoes longas

### 3C. Divisores e Secoes
- Gold divider: gradiente transparente → gold → transparente (1px height)
- Section headers SRD: italic, uppercase, Cinzel, text-srd-accent, com line abaixo
- Spacing entre secoes: min 2rem

### 3D. Animacoes
- Shimmer sweep nos badges de CR/nivel
- Rune pulse sutil nos icones de secao
- Fade-in staggered nos cards do grid (50ms delay entre cards)
- Transicao suave no toggle de filtros

### 3E. Empty States
- Icone tematico (espada, pergaminho, etc.)
- Mensagem amigavel com sugestao
- Botao "Limpar filtros" com gold outline
- Consistente em TODOS os grids

### 3F. Paginas Especificas
- **Monsters/Spells index**: cards com CR/level badge shimmer
- **Class detail**: TOC com dot indicators animados, feature cards com level badge gold
- **Race detail**: trait cards com icone de raca, ability bonuses coloridos
- **Conditions**: icones SVG maiores, categorias com cor de borda mais forte
- **Dice Roller**: dados com animacao de roll, resultado com pulse
- **Rules Reference**: combat flow visual melhorado, interactive trackers polidos

### Done criteria
- [ ] Cards com hover premium em todos os grids
- [ ] Divisores gold consistentes
- [ ] Tipografia hierarquica aplicada
- [ ] Empty states em todos os grids
- [ ] Animacoes sutis funcionando
- [ ] Visualmente coeso entre todas as paginas

---

## Onda 4 — Extracao de Dados

### Novos arquivos em `lib/data/`

| Arquivo | Origem | Linhas removidas |
|---------|--------|-----------------|
| `lib/data/combat-actions.ts` | PublicActionsGrid.tsx L95-460 | ~366 |
| `lib/data/ability-scores.ts` | PublicAbilityScoresGrid.tsx L40-239 | ~200 |
| `lib/data/damage-types.ts` | PublicDamageTypesGrid.tsx L44-415 | ~371 |
| `lib/data/rules-labels.ts` | PublicRulesReference.tsx L114-255 | ~140 |
| `lib/data/dice-presets.ts` | PublicDiceRoller.tsx L42-138 | ~97 |
| **Total** | | **~1.174 linhas** |

### Utilitarios compartilhados em `lib/utils/`

| Arquivo | Funcoes | Origem |
|---------|---------|--------|
| `lib/utils/monster.ts` | `parseCR()`, `toSlug()`, `formatSpeed()` | MonsterGrid, MonsterSearch, StatBlock |
| `lib/utils/compendium.ts` | `displayName()`, `getTranslation()` | Todos os grids |

### Done criteria
- [ ] 5 arquivos de dados criados em lib/data/
- [ ] 2 arquivos de utils criados
- [ ] Componentes reduzidos em ~1.174 linhas
- [ ] Build passa

---

## Onda 5 — Acessibilidade

### ARIA Attributes
- `aria-expanded` em todos os botoes de collapse (6 componentes)
- `aria-pressed` em todos os filter chips (5 componentes)
- `aria-live="polite"` em contadores de resultados (5 componentes)
- `role="tab"` + `aria-selected` no PublicCTA
- `aria-label` em inputs de busca sem label visivel

### Contraste
- `text-gray-500` → `text-gray-400` em fundos escuros (8+ locais)
- Verificar gold sobre dark bg (ratio minimo 4.5:1)

### Semantica HTML
- Ability table no MonsterStatBlock: `<div>` grid → `<table>` real
- Ability blocks: `<strong>` → `<dt>`/`<dd>` (definition list)
- Results count: `<p>` → `<div role="status">`

### Keyboard
- Focus visible em todos os filter chips
- Tab order logico em dropdowns (EncounterBuilder search)

### Done criteria
- [ ] Zero interactive sem ARIA label/state
- [ ] Contraste WCAG AA em todos os textos
- [ ] Semantica HTML correta em tabelas e listas
- [ ] Focus visible em todos os interativos

---

## Ordem de Execucao

1. **Onda 1** (bloqueante) — ~30min
2. **Ondas 2+3+4+5** em paralelo — ~2h total
3. **Build check final** — ~5min
4. **Commit atomico por onda**
