# Items Compendium Sprint — 2026-03-26

**Objetivo:** Adicionar seção de Itens ao Compêndio com dataset completo do 5e.tools, filtro Mundano/Mágico, e visual consistente com o resto da aplicação.
**Abordagem:** 4 streams sequenciais com dependência: Data → Infra → UI → Integração.

---

## Visão Geral

Nova aba "Itens" no Compêndio. Dataset de ~2.600 itens extraídos do 5e.tools (mundanos + mágicos). Filtro primário Mundano/Mágico como toggle proeminente. Layout split-panel com virtual scrolling. Card de detalhe estilo 5e.

**Spec detalhada:** `docs/quick-specs/items-compendium-spec.md`

---

## Stream 1 — Data Pipeline (Crawler + JSON)

**Escopo de arquivos:**
- `scripts/crawl-5etools-items.ts` (NOVO)
- `public/srd/items.json` (NOVO — output do crawler)

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 1.1 | Criar script `crawl-5etools-items.ts` que fetcha `items-base.json` e `items.json` do 5e.tools | ✅ Done | Node.js script, execução local |
| 1.2 | Normalizar type codes (M→melee-weapon, LA→light-armor, etc.) | ✅ Done | Mapa de conversão completo na spec |
| 1.3 | Flatten entries (converter objetos table/list em strings) | ✅ Done | Runtime não deve parsear objetos complexos |
| 1.4 | Computar `isMagic`, `id` (kebab-case), `edition` (source→classic/one) | ✅ Done | |
| 1.5 | Gerar `public/srd/items.json` consolidado | ✅ Done | Validar tamanho (~2-4MB) |
| 1.6 | Validar integridade do JSON (tipos corretos, sem nulls inesperados) | ✅ Done | |

---

## Stream 2 — Infra SRD (Loader + Cache + Search + Store)

**Escopo de arquivos:**
- `lib/srd/srd-loader.ts`
- `lib/srd/srd-cache.ts`
- `lib/srd/srd-search.ts`
- `lib/stores/srd-store.ts`
- `lib/stores/pinned-cards-store.ts`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 2.1 | Adicionar `SrdItem` interface + `ItemType` + `ItemRarity` types em `srd-loader.ts` | ✅ Done | |
| 2.2 | Adicionar `loadItems()` function em `srd-loader.ts` | ✅ Done | Fetch `/srd/items.json` |
| 2.3 | Bump DB_VERSION → 5, adicionar object store "items" em `srd-cache.ts` | ✅ Done | +getCachedItems, +setCachedItems |
| 2.4 | Adicionar `buildItemIndex()`, `searchItems()`, `getItemById()`, `getAllItems()` em `srd-search.ts` | ✅ Done | Fuse.js keys: name(0.5), type(0.3), rarity(0.2) |
| 2.5 | Adicionar `items: SrdItem[]` ao state + load em `initializeSrd()` no `srd-store.ts` | ✅ Done | Promise.all com os demais |
| 2.6 | Adicionar type `"item"` ao union de `PinnedCard.type` em `pinned-cards-store.ts` | ✅ Done | |

---

## Stream 3 — UI Components (Browser + Card)

**Escopo de arquivos:**
- `components/compendium/ItemBrowser.tsx` (NOVO)
- `components/oracle/ItemCard.tsx` (NOVO)

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 3.1 | Criar `ItemBrowser.tsx` — base clonada do SpellBrowser | ✅ Done | |
| 3.2 | Implementar toggle Mundano/Mágico/Todos como filtro primário | ✅ Done | Segmented control proeminente |
| 3.3 | Implementar filtros secundários: Tipo, Raridade, Attunement, Categoria Arma, Versão | ✅ Done | Filtros contextuais (raridade só em mágico) |
| 3.4 | Implementar sort: Nome, Valor, Raridade | ✅ Done | |
| 3.5 | Implementar virtual scrolling com react-window | ✅ Done | Obrigatório para 2.600+ itens |
| 3.6 | Implementar layout split-panel desktop + mobile stacked | ✅ Done | |
| 3.7 | Implementar keyboard nav (j/k, ↑/↓) | ✅ Done | |
| 3.8 | Implementar borda esquerda colorida por raridade | ✅ Done | Consistente com SpellBrowser level colors |
| 3.9 | Criar `ItemCard.tsx` — variante mundana e mágica | ✅ Done | Usar stat-card-5e.css |
| 3.10 | ItemCard: exibir propriedades mecânicas (custo, peso, dano, AC, propriedades) | ✅ Done | |
| 3.11 | ItemCard: exibir propriedades mágicas (attunement, cargas, recarga, bônus) | ✅ Done | |
| 3.12 | ItemCard: renderizar entries (descrição) | ✅ Done | |
| 3.13 | Aria-labels e roles para acessibilidade | ✅ Done | role="listbox", aria-live regions |

---

## Stream 4 — Integração (Tab + i18n + Polish)

**Escopo de arquivos:**
- `app/app/compendium/page.tsx`
- `messages/pt-BR.json`
- `messages/en.json`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 4.1 | Adicionar tab "Itens" ao `page.tsx` do compêndio | ✅ Done | Tab type union: + "items" |
| 4.2 | Adicionar i18n keys (compendium namespace) em `pt-BR.json` | ✅ Done | ~50 keys listadas na spec |
| 4.3 | Adicionar i18n keys (compendium namespace) em `en.json` | ✅ Done | |
| 4.4 | Integrar pinned cards — ItemCard no FloatingCardContainer | ✅ Done | Verificar se auto-resolve pelo type |
| 4.5 | Testar fluxo completo: load → filter → select → pin → mobile | ✅ Done | |
| 4.6 | Verificar performance com dataset completo (~2.600 itens) | ✅ Done | Medir initial load, filter responsiveness |

---

## Ordem de Execução

1. **Stream 1** (Data) — pré-requisito para tudo
2. **Stream 2** (Infra) — depende do JSON gerado
3. **Stream 3** (UI) — depende da infra
4. **Stream 4** (Integração) — depende de tudo acima

**Streams 3 e 4 podem parcialmente se sobrepor** — i18n keys podem ser adicionadas em paralelo com UI.

---

## Critérios de Aceite

- [x] Tab "Itens" visível no Compêndio
- [x] ~2.600 itens carregam sem erro
- [x] Toggle Mundano/Mágico filtra corretamente
- [x] Filtros secundários funcionam (tipo, raridade, attunement, versão)
- [x] Sort por nome, valor e raridade funciona
- [x] Layout split-panel funciona em desktop
- [x] Layout mobile com load more funciona
- [x] ItemCard exibe todas as propriedades relevantes
- [x] Borda colorida por raridade visível na lista
- [x] Pinned cards funcionam para itens
- [x] Keyboard nav funciona (j/k/↑/↓)
- [x] i18n completo (pt-BR + en)
- [x] Virtual scrolling sem lag com dataset completo
- [x] Cache IndexedDB funciona (second load é instantâneo)

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| JSON muito grande (>5MB) | Load lento | Gzip + lazy load (tab ativa só carrega quando acessada) |
| 5e.tools muda API | Crawler quebra | Script idempotente, JSON commitado no repo |
| Entries complexos demais | Renderização quebrada | Flatten robusto no crawler, fallback string |
| Performance com 2.600 itens | UI trava | react-window + debounce nos filtros |

---

## Backlog (Pós-Sprint)

- [x] Busca fuzzy na Command Palette para itens
- [x] Oracle AI responde sobre itens
- [x] Item images/icons (se disponíveis no 5e.tools)
- [x] Integração com character sheets (equipar item)
- [x] Filtro por source book
- [x] Comparar itens side-by-side
- [x] Admin ContentEditor para itens (Supabase sync)
