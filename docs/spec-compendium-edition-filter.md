# Spec — Filtro de Edição 2014/2024 no Compêndio

**Data:** 2026-04-19
**Autor:** Claude (Plan agent)
**Status:** PRONTO PARA IMPLEMENTAÇÃO
**Sprint alvo:** Beta 4 pré-release
**Estimativa:** ~3h total

---

## 1. Feedback original

Áudio do DM Lucas Galupo, beta-test 3 (2026-04-16):

> "No compêndio tem que aparecer na busca de qual edição que é porque tá 'CR8 Beast Hild' aí tem que ter 'CR a 2014' ou '2024'."

**Interpretação:** ao abrir o compêndio dentro do combate e listar monstros, a linha de metadata atual mostra apenas `CR {cr} · {type} · {size}` sem dizer se o monstro vem do SRD 2014, SRD 2024 ou MAD. O DM precisa dessa informação *na linha de resultado da busca* — não só ao abrir o stat block.

---

## 2. Dados — shape real confirmada

### Monsters (`monsters-2014.json`, `monsters-2024.json`, `monsters-mad.json`)

Campos confirmados em [lib/srd/srd-loader.ts:11-62](../lib/srd/srd-loader.ts#L11-L62):

- `ruleset_version: "2014" | "2024"` — **canônico** para distinguir edição
- `source: string` (abbrev. — `"MM"`, `"VGM"`, `"XMM"`, `"MAD"`, `"IMR"`, etc.)
- `is_srd?: boolean` — true quando SRD 5.1

### Totais por arquivo

| Arquivo | Entries |
|---|---|
| `monsters-2014.json` | 3.595 |
| `monsters-2024.json` | 520 |
| `monsters-mad.json` | 357 |
| `spells-2014.json` | 544 |
| `spells-2024.json` | 391 |
| `items.json` | 2.707 |

### Items (`items.json`) — shape diferente

- `source: string` + `edition: "classic" | "one"` (NÃO usa `ruleset_version`)
- `"classic"` ≡ 2014, `"one"` ≡ 2024

### Decisão de agrupamento

Não listar 100+ `source` códigos brutos. Agrupar em 4 buckets via `getSourceCategory()` + `ruleset_version`:

1. **SRD 2014** (`is_srd && ruleset_version === "2014"`)
2. **SRD 2024** (`is_srd && ruleset_version === "2024"`)
3. **MAD** (`source === "MAD"`)
4. **Oficial não-SRD** (resto — beta-tester / full-data-mode only)

UI do filtro: 4 chips em vez de 100.

---

## 3. UI atual

### Componente principal

[components/player/PlayerCompendiumBrowser.tsx](../components/player/PlayerCompendiumBrowser.tsx) (1.804 linhas). Dialog aberto via `OracleSearchTrigger` / FAB do combate player-side.

### Row de monstro hoje (`PlayerCompendiumBrowser.tsx:1745-1779`)

- Título: `{monster.name}`
- Subtítulo: `CR {monster.cr} · {monster.type} · {monster.size}`
- Lado direito: `FavoriteStar` + `<Skull>` — **nenhum badge de edição/source**

### Row de spell hoje (`:1152-1188`)

`{level} · {school} · Conc · Ritual` — também sem badge.

### Filtros já existentes

- **Spells** — segmented "all / 2024 / 2014" em `:1107-1126`, estado `versionFilter` em `:168`
- **Monsters** — **nenhum filtro**. Só busca por nome
- **Items** — idem

### Componentes reusáveis

- [components/ui/VersionBadge.tsx](../components/ui/VersionBadge.tsx) — badge pronto com regra SRD Compliance embutida (gold só em `2024 && is_srd`, senão neutral zinc). **Usar este — não criar novo.**
- [lib/utils/monster-source.ts](../lib/utils/monster-source.ts) — `getSourceName()`, `getSourceCategory()`, `COMMUNITY_SOURCES`

### Onde `SourceFilter` já existe (não-player)

- [components/combat/MonsterSearchPanel.tsx:174](../components/combat/MonsterSearchPanel.tsx#L174) (DM encounter setup) — `"all" | "srd" | "complete" | "mad"`
- [components/compendium/MonsterBrowser.tsx:21](../components/compendium/MonsterBrowser.tsx#L21) (standalone `/oracle`)

Padrão já estabelecido — spec apenas propaga pro **player compendium**.

---

## 4. Design

### 4.1 Badge em cada card (Fase 1 — quick win)

**Monsters row** (`:1760-1767`):
- Inserir `<VersionBadge version={monster.ruleset_version} isSrd={monster.is_srd} />` antes do `CR {cr}`, flex-row com `gap-1.5`
- Para MAD: chip secundário `<span class="text-[9px] border border-purple-500/30 bg-purple-500/5 text-purple-400 rounded px-1 py-0.5 font-mono uppercase">MAD</span>`. Só renderizar se `monster.source === "MAD"`
- Resultado: `[2014] [MAD] CR 11 · aberration · Large`

**Spells row** (`:1163-1183`):
- Mesma inserção de `VersionBadge`. Não precisa MAD chip

**Items row** (`:1338-1362`):
- Opcional. Items usam `edition: "classic" | "one"` → mapear pra `"2014" | "2024"` via utility `editionToRulesetVersion()` em `lib/utils/item-edition.ts`

### 4.2 Filtro segmented (Fase 2)

**Monsters tab** — replicar padrão spells-tab:
- `type MonsterSourceFilter = "all" | "srd_2014" | "srd_2024" | "mad" | "nonsrd"`
- State: `const [monsterSourceFilter, setMonsterSourceFilter] = useState<MonsterSourceFilter>("all")`
- UI: 4 chips + "all" na toolbar do search input
- Opção `"nonsrd"` só renderizada se `useContentAccess().canAccess === true` (whitelist/beta-tester)

### 4.3 Persist

- localStorage key: `compendium.monsters.filter.v1`
- Hidratação síncrona no `useState(() => readFromLocalStorage(...))` para evitar flash
- Spells: persistir sob `compendium.spells.filter.v1` para paridade

### 4.4 Parity

- **Compêndio do combate** — foco do feedback (`PlayerCompendiumBrowser.tsx`)
- **Compêndio standalone `/oracle`** — `MonsterBrowser.tsx` já tem SourceFilter; alinhar nomenclatura
- **Encounter setup (DM)** — já coberto em `MonsterSearchPanel.tsx`
- **Favoritos tab** — filtro NÃO se aplica (user salvou explicitamente); cada favorito mostra `VersionBadge` read-only

---

## 5. Implementação

### Fase 1 — Badge (quick win, ~1h)

1. `PlayerCompendiumBrowser.tsx:5` — `import { VersionBadge } from "@/components/ui/VersionBadge"`
2. `:1760-1767` — envolver metadata em flex + adicionar `<VersionBadge>` + MAD chip
3. `:1163-1183` — mesma coisa para spells
4. Atualizar `PlayerCompendiumBrowser.favorites.test.tsx` — snapshot do row

### Fase 2 — Filtro de monstros (~1.5h)

1. `:175-176` — state `monsterSourceFilter` + hidratar do localStorage
2. `:324-333` — aplicar filtro no `filteredMonsters` memo:
   ```ts
   if (monsterSourceFilter !== "all") {
     result = result.filter((m) => matchesSource(m, monsterSourceFilter));
   }
   ```
3. Criar `lib/srd/monster-source-filter.ts`:
   ```ts
   export function matchesSource(m: SrdMonster, f: MonsterSourceFilter): boolean
   ```
4. `:~1730` — toolbar logo acima do count, espelhando spells-tab
5. Persistência via `useLocalStorageState` ou `useEffect` sync

### Fase 3 — i18n (~20min)

`messages/pt-BR.json` + `messages/en.json`, namespace `combat.*`:

- `compendium_source_all`: "Todas" / "All"
- `compendium_source_srd_2014`: "SRD 2014" / "SRD 2014"
- `compendium_source_srd_2024`: "SRD 2024" / "SRD 2024"
- `compendium_source_mad`: "Monster a Day" / "Monster a Day"
- `compendium_source_nonsrd`: "Outros livros" / "Other books"
- `compendium_source_label`: "Fonte" / "Source"

---

## 6. SRD Compliance

- [lib/hooks/use-srd-content-filter.ts](../lib/hooks/use-srd-content-filter.ts) já remove non-SRD do array quando `!canAccess || !show_non_srd_content`. MAD preservado
- Em `public/srd/` (guest/SEO) só arquivos liberados → filtro `"nonsrd"` naturalmente traz 0 resultados pra guest
- `VersionBadge` implementa regra: gold highlight **somente** quando `2024 && is_srd`. Non-SRD 2024 (XMM) renderiza neutro
- MAD chip é roxo (nossa cor) — não reproduz branding WotC
- "Outros livros" = bucket opaco para guest; não listar códigos brutos

---

## 7. Testes

### Unit — `lib/srd/monster-source-filter.test.ts`

- `matchesSource(goblin14, "srd_2014")` → true
- `matchesSource(goblin14, "srd_2024")` → false
- `matchesSource(boogieMan_mad, "mad")` → true
- `matchesSource(xmm_monster, "nonsrd")` → true
- `matchesSource(anything, "all")` → true

### Component

- `PlayerCompendiumBrowser.favorites.test.tsx` — caso: toggle filter "SRD 2024" esconde monstros 2014
- Badge renderiza string correta; MAD chip aparece só pra `source === "MAD"`

### e2e — `e2e/compendium-edition-filter.spec.ts` (novo)

- Abrir Player HQ com mesa ativa
- Abrir compêndio → tab Monsters
- Verificar primeiro row tem `[2014]` badge
- Clicar chip "SRD 2024" → contagem cai; todos rows têm badge "2024"
- Recarregar página → filtro persiste

---

## 8. Telemetry

`lib/analytics/track.ts` — novo evento:

```ts
trackEvent("compendium:filter_changed", {
  scope: "monsters" | "spells",
  filter: MonsterSourceFilter | SpellVersionFilter,
  results_count: number,
});
```

Disparado quando user troca filtro (não no mount). Adicionar em `app/api/track/route.ts` allowlist.

---

## 9. Estimativa

| Fase | Tempo |
|---|---|
| Badge em rows (monsters + spells) | 1h |
| Filtro monsters | 1.5h |
| i18n | 20min |
| Testes | 30min |
| **Total** | **~3h** |

Extensão opcional (~1h extra): estender pra spells (4 buckets unificados) + items (via `editionToRulesetVersion`).

---

## 10. Riscos

- **Visual clutter em mobile** — chips pequenos `text-[10px] px-1.5 py-0.5` mesmo padrão dos spell-version chips (cabe em `sm`)
- **MAD chip redundante?** — VersionBadge informa edição de regras, MAD chip informa origem curatorial — semânticas ortogonais, manter ambos
- **Alinhar nomenclatura com `MonsterBrowser.tsx`** — `"complete"` é confuso, follow-up fora do escopo

---

## Critical Files

- `c:/Projetos Daniel/projeto-rpg/components/player/PlayerCompendiumBrowser.tsx`
- `c:/Projetos Daniel/projeto-rpg/components/ui/VersionBadge.tsx`
- `c:/Projetos Daniel/projeto-rpg/lib/srd/srd-loader.ts`
- `c:/Projetos Daniel/projeto-rpg/lib/utils/monster-source.ts`
- `c:/Projetos Daniel/projeto-rpg/messages/pt-BR.json`
