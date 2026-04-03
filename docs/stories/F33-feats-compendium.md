# F-33 — Feats no Compendium

**Epic:** Compendium — Conteudo de Referencia  
**Prioridade:** Media  
**Estimativa:** 5 SP  
**Dependencia:** Nenhuma (compendium ja existe com 4 tabs funcionais)  
**Arquivos principais:** `components/compendium/FeatBrowser.tsx` (novo), `app/app/compendium/page.tsx`, `lib/srd/srd-loader.ts`, `lib/stores/srd-store.ts`, `public/srd/feats.json` (novo)

---

## Resumo

Jogadores e DMs consultam feats frequentemente — na criacao de personagem (ASI vs feat), no level up, e durante o jogo ("o que Sentinel faz mesmo?"). Hoje precisam sair do Pocket DM e abrir outra referencia (5e.tools, livro fisico). O compendium ja tem monsters, spells, items e conditions — feats e o gap mais obvio.

Esta story adiciona uma 5a aba "Feats" ao compendium, com ~40-50 feats SRD exibidos em cards estilo accordion (mesmo pattern do `ConditionReference`). Busca por nome e filtro basico por prerequisito. Conteudo leve — sem necessidade de virtualizacao ou split-panel.

---

## Decisoes de UX

**D1: Pattern accordion, NAO split-panel.** Feats sao conteudo curto (nome + 2-3 paragrafos). O `ConditionReference` ja usa accordion cards e funciona bem para esse tipo de conteudo. Split-panel (usado no SpellBrowser) seria overengineering.

**D2: Busca por nome + filtro de prerequisito.** Dois filtros simples:
- Input de busca por nome (case-insensitive, substring match)
- Toggle "Com prerequisito" / "Sem prerequisito" / "Todos" (3-state pill selector, mesmo pattern de tabs do ConditionReference)

**D3: Sem filtro de classe.** Feats SRD nao sao associados a classes especificas (diferente de spells). Filtro de classe seria artificial.

**D4: Sem filtro de ruleset version inicialmente.** O SRD 5.1 tem um set unico de feats. Se no futuro o SRD 2024 adicionar feats, o campo `ruleset_version` ja esta no schema. Por ora, todos os feats sao `"2014"`.

**D5: Card expandido mostra descricao completa + prerequisito destacado.** Prerequisito aparece como badge amber abaixo do nome (ex: "Prerequisito: Destreza 13 ou superior"). Descricao em texto corrido, com bullet points quando o feat tem multiplos beneficios.

**D6: Pin to combat.** Reutilizar o pattern existente de `pinCard` (via `usePinnedCardsStore`) para permitir fixar feats durante combate. Mesmo icone de pin usado em conditions e spells.

**D7: Ordenacao alfabetica por padrao.** Feats sao consultados por nome — ordem alfabetica e a mais natural. Sem opcoes de sort adicionais.

**D8: Contagem visivel.** Mostrar "X feats encontrados" abaixo dos filtros, consistente com outros browsers.

---

## Contexto Tecnico

### Compendium atual

**`app/app/compendium/page.tsx`:**
- Type `Tab = "monsters" | "spells" | "conditions" | "items"`
- Array `tabs` com 4 entradas
- URL param `?tab=` para roteamento
- Carregamento condicional por `activeTab`

**Pattern de referencia — `ConditionReference.tsx`:**
- Dados de `useSrdStore((s) => s.conditions)`
- Filtro por nome (input) + categorias (tabs internos: condition/disease/status)
- Accordion: click expande/colapsa (`expanded` state)
- Card com `border-l-4` colorido por categoria
- `usePinnedCardsStore` para pin

**SRD Store (`lib/stores/srd-store.ts`):**
- Estado: `monsters`, `spells`, `conditions`, `items`, `is_loading`, `loadedVersions`, `error`
- Loading: Phase 1 (critical) + Phase 2 (deferred via `requestIdleCallback`)
- Cache: IndexedDB via `srd-cache.ts`
- Search: `srd-search-provider.ts` com Fuse.js indexes

**SRD Loader (`lib/srd/srd-loader.ts`):**
- Interfaces: `SrdMonster`, `SrdSpell`, `SrdCondition`, `SrdItem`
- Pattern: fetch JSON, cache promise, type-safe return
- Arquivos em `/public/srd/`: `monsters-2024.json`, `spells-2024.json`, `items.json`, `conditions.json`

### Dados de feats

O SRD 5.1 (CC-BY-4.0) inclui os seguintes feats que podem ser distribuidos livremente:

- Alert, Athlete, Actor, Charger, Crossbow Expert, Defensive Duelist, Dual Wielder, Dungeon Delver, Durable, Elemental Adept, Grappler, Great Weapon Master, Healer, Heavily Armored, Heavy Armor Master, Inspiring Leader, Keen Mind, Lightly Armored, Linguist, Lucky, Mage Slayer, Magic Initiate, Martial Adept, Medium Armor Master, Mobile, Moderately Armored, Mounted Combatant, Observant, Polearm Master, Resilient, Ritual Caster, Savage Attacker, Sentinel, Sharpshooter, Shield Master, Skilled, Skulker, Spell Sniper, Tavern Brawler, Tough, War Caster, Weapon Master

Total: ~42 feats. Dataset pequeno — nao precisa de virtualizacao nem paginacao.

---

## Criterios de Aceite

### Dados

1. Arquivo `public/srd/feats.json` criado com todos os feats SRD 5.1 (CC-BY-4.0).
2. Cada feat tem: `id`, `name`, `description` (markdown-like, com bullets), `prerequisite` (string | null), `source` ("SRD 5.1"), `ruleset_version` ("2014").
3. Descripcoes sao fieis ao texto do SRD 5.1 — sem invencoes, sem conteudo non-SRD.

### Interface e Loader

4. Interface `SrdFeat` definida em `lib/srd/srd-loader.ts`.
5. Funcao `loadFeats()` em `srd-loader.ts` seguindo o mesmo pattern de `loadConditions()`.
6. `srd-store.ts` tem campo `feats: SrdFeat[]` no state.
7. Feats sao carregados na Phase 2 (deferred, via `requestIdleCallback`) — nao atrasam o carregamento inicial.

### Cache (IndexedDB)

8. Funcoes `getCachedFeats()` e `setCachedFeats()` em `srd-cache.ts` seguindo pattern existente.
9. Apos primeiro load, feats sao servidos do cache sem fetch.

### Compendium UI

10. Nova aba "Feats" no compendium (`app/app/compendium/page.tsx`).
11. Type `Tab` atualizado para incluir `"feats"`.
12. Tab aparece apos "Items" e antes de "Conditions" na ordem visual.

### FeatBrowser

13. `FeatBrowser.tsx` renderiza lista de feats em cards accordion.
14. Input de busca por nome (debounce 200ms, case-insensitive, substring match).
15. Pill selector com 3 opcoes: "Todos" (default) | "Com Prerequisito" | "Sem Prerequisito".
16. Contagem visivel: "{N} feats encontrados".
17. Cards ordenados alfabeticamente.
18. Card colapsado mostra: nome + badge de prerequisito (se houver).
19. Card expandido mostra: nome, prerequisito destacado (badge amber), descricao completa com formatacao.
20. Botao de pin (fixar para combate) usando `usePinnedCardsStore`.

### i18n

21. Todas as strings em `messages/pt-BR.json` e `messages/en.json`.
22. Chaves no namespace `compendium`: `tab_feats`, `feats_search_placeholder`, `feats_filter_all`, `feats_filter_has_prereq`, `feats_filter_no_prereq`, `feats_count`, `feats_prerequisite`, `feats_pin`.

### Acessibilidade

23. Cards accordion usam `button` com `aria-expanded`.
24. Descricao do feat tem `role="region"` com `aria-labelledby` apontando para o nome.
25. Input de busca tem `aria-label` descritivo.

---

## Abordagem Tecnica

### Passo 1: Criar arquivo de dados

**`public/srd/feats.json`:**

```json
[
  {
    "id": "alert",
    "name": "Alert",
    "description": "Always on the lookout for danger, you gain the following benefits:\n- You gain a +5 bonus to initiative.\n- You can't be surprised while you are conscious.\n- Other creatures don't gain advantage on attack rolls against you as a result of being unseen by you.",
    "prerequisite": null,
    "source": "SRD 5.1",
    "ruleset_version": "2014"
  },
  {
    "id": "great-weapon-master",
    "name": "Great Weapon Master",
    "description": "You've learned to put the weight of a weapon to your advantage...",
    "prerequisite": null,
    "source": "SRD 5.1",
    "ruleset_version": "2014"
  }
]
```

**Importante:** O conteudo das descricoes deve ser extraido diretamente do SRD 5.1 (documento CC-BY-4.0 disponivel publicamente). Cada feat precisa de `description` fiel ao texto original, com bullets para beneficios multiplos.

### Passo 2: Interface e Loader

**`lib/srd/srd-loader.ts`** — adicionar:

```typescript
export interface SrdFeat {
  id: string;
  name: string;
  description: string;
  prerequisite: string | null;
  source: string;
  ruleset_version: RulesetVersion;
}

const featCache = new Map<string, Promise<SrdFeat[]>>();

export function loadFeats(): Promise<SrdFeat[]> {
  const key = "all";
  const cached = featCache.get(key);
  if (cached) return cached;
  const promise = fetch("/srd/feats.json").then((res) => {
    if (!res.ok) {
      featCache.delete(key);
      throw new Error(`Failed to load SRD feats: ${res.status}`);
    }
    return res.json() as Promise<SrdFeat[]>;
  });
  featCache.set(key, promise);
  return promise;
}
```

### Passo 3: Cache IndexedDB

**`lib/srd/srd-cache.ts`** — adicionar funcoes seguindo pattern existente:

```typescript
export async function getCachedFeats(): Promise<SrdFeat[] | null> {
  // Mesmo pattern de getCachedConditions
}

export async function setCachedFeats(data: SrdFeat[]): Promise<void> {
  // Mesmo pattern de setCachedConditions
}
```

### Passo 4: Atualizar SRD Store

**`lib/stores/srd-store.ts`:**

```typescript
// State
interface SrdState {
  // ... existente ...
  feats: SrdFeat[];
}

// Initial state
const initialState: SrdState = {
  // ... existente ...
  feats: [],
};

// No initializeSrd, Phase 2 (deferred):
scheduleDeferred(async () => {
  try {
    const feats = await loadWithCache(
      () => getCachedFeats(),
      (d) => setCachedFeats(d),
      () => loadFeats()
    );
    set({ feats });
  } catch {
    // Feats load failure is non-critical
  }
});
```

### Passo 5: FeatBrowser component

**`components/compendium/FeatBrowser.tsx`:**

```typescript
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { Search, Pin, ChevronDown, ChevronRight } from "lucide-react";

type PrereqFilter = "all" | "has_prereq" | "no_prereq";

export function FeatBrowser() {
  const t = useTranslations("compendium");
  const feats = useSrdStore((s) => s.feats);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [nameFilter, setNameFilter] = useState("");
  const [prereqFilter, setPrereqFilter] = useState<PrereqFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = feats;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }
    if (prereqFilter === "has_prereq") {
      result = result.filter((f) => f.prerequisite != null);
    } else if (prereqFilter === "no_prereq") {
      result = result.filter((f) => f.prerequisite == null);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [feats, nameFilter, prereqFilter]);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("feats_search_placeholder")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
            aria-label={t("feats_search_placeholder")}
          />
        </div>
        {/* Prereq pills */}
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04]">
          {(["all", "has_prereq", "no_prereq"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPrereqFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                prereqFilter === key
                  ? "bg-white/[0.1] text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t(`feats_filter_${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {t("feats_count", { count: filtered.length })}
      </p>

      {/* Feat Cards */}
      <div className="space-y-2">
        {filtered.map((feat) => (
          <div
            key={feat.id}
            className="border border-white/[0.08] rounded-lg bg-white/[0.02] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === feat.id ? null : feat.id)}
              aria-expanded={expanded === feat.id}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              {expanded === feat.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium text-foreground text-sm">{feat.name}</span>
              {feat.prerequisite && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  {t("feats_prerequisite")}
                </span>
              )}
            </button>

            {expanded === feat.id && (
              <div
                className="px-4 pb-4 pt-1 border-t border-white/[0.06]"
                role="region"
                aria-labelledby={`feat-${feat.id}`}
              >
                {feat.prerequisite && (
                  <p className="text-xs text-amber-400 mb-2 font-medium">
                    {t("feats_prerequisite")}: {feat.prerequisite}
                  </p>
                )}
                <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                  {feat.description}
                </div>
                <button
                  type="button"
                  onClick={() => pinCard({ type: "feat", id: feat.id, name: feat.name })}
                  className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors"
                  aria-label={`${t("feats_pin")} ${feat.name}`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {t("feats_pin")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Passo 6: Atualizar pagina do compendium

**`app/app/compendium/page.tsx`:**

```typescript
import { FeatBrowser } from "@/components/compendium/FeatBrowser";

type Tab = "monsters" | "spells" | "items" | "feats" | "conditions";

// No array tabs:
{ key: "feats", label: t("tab_feats") },

// No render condicional:
{activeTab === "feats" && <FeatBrowser />}
```

### Passo 7: i18n strings

**`messages/pt-BR.json`** (namespace `compendium`):
```json
"tab_feats": "Talentos",
"feats_search_placeholder": "Buscar talento...",
"feats_filter_all": "Todos",
"feats_filter_has_prereq": "Com Pre-requisito",
"feats_filter_no_prereq": "Sem Pre-requisito",
"feats_count": "{count} talentos encontrados",
"feats_prerequisite": "Pre-requisito",
"feats_pin": "Fixar no combate"
```

**`messages/en.json`** (namespace `compendium`):
```json
"tab_feats": "Feats",
"feats_search_placeholder": "Search feat...",
"feats_filter_all": "All",
"feats_filter_has_prereq": "Has Prerequisite",
"feats_filter_no_prereq": "No Prerequisite",
"feats_count": "{count} feats found",
"feats_prerequisite": "Prerequisite",
"feats_pin": "Pin to combat"
```

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `public/srd/feats.json` | **Criar** | Dataset JSON com ~42 feats SRD 5.1 |
| `lib/srd/srd-loader.ts` | Editar | Interface `SrdFeat` + funcao `loadFeats()` |
| `lib/srd/srd-cache.ts` | Editar | Funcoes `getCachedFeats()` / `setCachedFeats()` |
| `lib/stores/srd-store.ts` | Editar | Adicionar `feats` ao state + load na Phase 2 |
| `components/compendium/FeatBrowser.tsx` | **Criar** | Componente browser com accordion + filtros |
| `app/app/compendium/page.tsx` | Editar | Adicionar aba "Feats" + import FeatBrowser |
| `messages/pt-BR.json` | Editar | Strings i18n (namespace compendium) |
| `messages/en.json` | Editar | Strings i18n (namespace compendium) |

---

## Plano de Testes

### Testes Manuais

1. **Tab visivel:** Abrir compendium, verificar 5a aba "Talentos" / "Feats".
2. **Lista completa:** Clicar na aba, verificar ~42 feats listados em ordem alfabetica.
3. **Busca:** Digitar "war" — deve filtrar para War Caster, Weapon Master, etc.
4. **Filtro prerequisito:** Selecionar "Com Pre-requisito" — mostra apenas feats com prerequisite nao-nulo.
5. **Accordion:** Clicar em feat colapsado — expande mostrando descricao. Clicar novamente — colapsa.
6. **Prerequisito visual:** Feats com prerequisito mostram badge amber no card colapsado e texto completo no expandido.
7. **Pin:** Clicar em "Fixar no combate" — verificar que feat aparece nos pinned cards.
8. **Contagem:** Verificar "{N} feats encontrados" atualiza ao filtrar.
9. **Cache:** Recarregar pagina — feats carregam instantaneamente do IndexedDB (sem flash de loading).
10. **i18n:** Alternar idioma — verificar strings em pt-BR e en.
11. **URL:** Navegar para `/app/compendium?tab=feats` — deve abrir direto na aba de feats.

### Testes Automatizados

```typescript
// FeatBrowser.test.tsx
describe("FeatBrowser", () => {
  it("renders all feats sorted alphabetically", () => { /* ... */ });
  it("filters by name search", () => { /* ... */ });
  it("filters feats with prerequisites", () => { /* ... */ });
  it("filters feats without prerequisites", () => { /* ... */ });
  it("expands and collapses feat cards", () => { /* ... */ });
  it("shows prerequisite badge on cards with prerequisites", () => { /* ... */ });
  it("shows count of filtered feats", () => { /* ... */ });
  it("calls pinCard when pin button is clicked", () => { /* ... */ });
});

// srd-loader.test.ts — adicionar
describe("loadFeats", () => {
  it("fetches and returns feats from /srd/feats.json", () => { /* ... */ });
  it("caches the promise for subsequent calls", () => { /* ... */ });
});
```

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|------|---------|---------------|
| **Guest (`/try`)** | NAO | Compendium e Auth-only (rota `/app/compendium` requer login). Guest nao tem acesso. |
| **Anonimo (`/join`)** | NAO | Player anonimo so ve a combat view. Nao tem acesso ao compendium. |
| **Autenticado (`/invite` + `/app`)** | SIM | Unico modo com acesso ao compendium. Feature Auth-only. |

**Nenhuma alteracao necessaria em `GuestCombatClient.tsx` ou `PlayerJoinClient.tsx`.**

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Texto de feats fora do SRD (copyright) | Media | Alto | Usar APENAS o documento SRD 5.1 CC-BY-4.0 como fonte. Revisar cada descricao. |
| Tab bar overflow com 5 tabs em mobile | Baixa | Medio | Tab bar ja tem `overflow-x-auto` — funciona com scroll horizontal. Testar em telas 320px. |
| Feats load lento por nao estar no cache ainda | Baixa | Baixo | Phase 2 + IndexedDB cache. Primeira visita: ~50KB fetch (trivial). Visitas seguintes: instantaneo. |
| `usePinnedCardsStore` nao suporta tipo "feat" | Media | Baixo | Verificar se o store aceita tipos arbitrarios ou se precisa ser estendido. Adicionar `"feat"` ao union type se necessario. |
| Descricoes com markdown nao renderizando bullets | Baixa | Baixo | Usar `whitespace-pre-line` para newlines. Se bullets nao renderizarem, processar `\n-` como `<li>`. |

---

## Definicao de Pronto

- [ ] `feats.json` criado com ~42 feats SRD 5.1 (texto verificado contra documento oficial)
- [ ] Interface `SrdFeat` e `loadFeats()` implementados em `srd-loader.ts`
- [ ] Cache IndexedDB para feats funcional
- [ ] SRD store carrega feats na Phase 2 (deferred)
- [ ] `FeatBrowser` renderiza lista com accordion, busca, e filtro de prerequisito
- [ ] Aba "Feats" visivel no compendium (entre Items e Conditions)
- [ ] Pin to combat funcional
- [ ] Strings i18n em pt-BR e en
- [ ] Testes unitarios para FeatBrowser (render, filtros, accordion, pin)
- [ ] Teste manual: fluxo completo aba → busca → filtro → expand → pin
- [ ] URL routing funciona (`?tab=feats`)
- [ ] Nenhuma regressao nas 4 tabs existentes
- [ ] Build passa sem erros (`next build`)
