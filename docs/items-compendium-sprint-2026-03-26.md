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
| 1.1 | Criar script `crawl-5etools-items.ts` que fetcha `items-base.json` e `items.json` do 5e.tools | ⬜ Pending | Node.js script, execução local |
| 1.2 | Normalizar type codes (M→melee-weapon, LA→light-armor, etc.) | ⬜ Pending | Mapa de conversão completo na spec |
| 1.3 | Flatten entries (converter objetos table/list em strings) | ⬜ Pending | Runtime não deve parsear objetos complexos |
| 1.4 | Computar `isMagic`, `id` (kebab-case), `edition` (source→classic/one) | ⬜ Pending | |
| 1.5 | Gerar `public/srd/items.json` consolidado | ⬜ Pending | Validar tamanho (~2-4MB) |
| 1.6 | Validar integridade do JSON (tipos corretos, sem nulls inesperados) | ⬜ Pending | |

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
| 2.1 | Adicionar `SrdItem` interface + `ItemType` + `ItemRarity` types em `srd-loader.ts` | ⬜ Pending | |
| 2.2 | Adicionar `loadItems()` function em `srd-loader.ts` | ⬜ Pending | Fetch `/srd/items.json` |
| 2.3 | Bump DB_VERSION → 5, adicionar object store "items" em `srd-cache.ts` | ⬜ Pending | +getCachedItems, +setCachedItems |
| 2.4 | Adicionar `buildItemIndex()`, `searchItems()`, `getItemById()`, `getAllItems()` em `srd-search.ts` | ⬜ Pending | Fuse.js keys: name(0.5), type(0.3), rarity(0.2) |
| 2.5 | Adicionar `items: SrdItem[]` ao state + load em `initializeSrd()` no `srd-store.ts` | ⬜ Pending | Promise.all com os demais |
| 2.6 | Adicionar type `"item"` ao union de `PinnedCard.type` em `pinned-cards-store.ts` | ⬜ Pending | |

---

## Stream 3 — UI Components (Browser + Card)

**Escopo de arquivos:**
- `components/compendium/ItemBrowser.tsx` (NOVO)
- `components/oracle/ItemCard.tsx` (NOVO)

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 3.1 | Criar `ItemBrowser.tsx` — base clonada do SpellBrowser | ⬜ Pending | |
| 3.2 | Implementar toggle Mundano/Mágico/Todos como filtro primário | ⬜ Pending | Segmented control proeminente |
| 3.3 | Implementar filtros secundários: Tipo, Raridade, Attunement, Categoria Arma, Versão | ⬜ Pending | Filtros contextuais (raridade só em mágico) |
| 3.4 | Implementar sort: Nome, Valor, Raridade | ⬜ Pending | |
| 3.5 | Implementar virtual scrolling com react-window | ⬜ Pending | Obrigatório para 2.600+ itens |
| 3.6 | Implementar layout split-panel desktop + mobile stacked | ⬜ Pending | |
| 3.7 | Implementar keyboard nav (j/k, ↑/↓) | ⬜ Pending | |
| 3.8 | Implementar borda esquerda colorida por raridade | ⬜ Pending | Consistente com SpellBrowser level colors |
| 3.9 | Criar `ItemCard.tsx` — variante mundana e mágica | ⬜ Pending | Usar stat-card-5e.css |
| 3.10 | ItemCard: exibir propriedades mecânicas (custo, peso, dano, AC, propriedades) | ⬜ Pending | |
| 3.11 | ItemCard: exibir propriedades mágicas (attunement, cargas, recarga, bônus) | ⬜ Pending | |
| 3.12 | ItemCard: renderizar entries (descrição) | ⬜ Pending | |
| 3.13 | Aria-labels e roles para acessibilidade | ⬜ Pending | role="listbox", aria-live regions |

---

## Stream 4 — Integração (Tab + i18n + Polish)

**Escopo de arquivos:**
- `app/app/compendium/page.tsx`
- `messages/pt-BR.json`
- `messages/en.json`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 4.1 | Adicionar tab "Itens" ao `page.tsx` do compêndio | ⬜ Pending | Tab type union: + "items" |
| 4.2 | Adicionar i18n keys (compendium namespace) em `pt-BR.json` | ⬜ Pending | ~50 keys listadas na spec |
| 4.3 | Adicionar i18n keys (compendium namespace) em `en.json` | ⬜ Pending | |
| 4.4 | Integrar pinned cards — ItemCard no FloatingCardContainer | ⬜ Pending | Verificar se auto-resolve pelo type |
| 4.5 | Testar fluxo completo: load → filter → select → pin → mobile | ⬜ Pending | |
| 4.6 | Verificar performance com dataset completo (~2.600 itens) | ⬜ Pending | Medir initial load, filter responsiveness |

---

## Ordem de Execução

1. **Stream 1** (Data) — pré-requisito para tudo
2. **Stream 2** (Infra) — depende do JSON gerado
3. **Stream 3** (UI) — depende da infra
4. **Stream 4** (Integração) — depende de tudo acima

**Streams 3 e 4 podem parcialmente se sobrepor** — i18n keys podem ser adicionadas em paralelo com UI.

---

## Critérios de Aceite

- [ ] Tab "Itens" visível no Compêndio
- [ ] ~2.600 itens carregam sem erro
- [ ] Toggle Mundano/Mágico filtra corretamente
- [ ] Filtros secundários funcionam (tipo, raridade, attunement, versão)
- [ ] Sort por nome, valor e raridade funciona
- [ ] Layout split-panel funciona em desktop
- [ ] Layout mobile com load more funciona
- [ ] ItemCard exibe todas as propriedades relevantes
- [ ] Borda colorida por raridade visível na lista
- [ ] Pinned cards funcionam para itens
- [ ] Keyboard nav funciona (j/k/↑/↓)
- [ ] i18n completo (pt-BR + en)
- [ ] Virtual scrolling sem lag com dataset completo
- [ ] Cache IndexedDB funciona (second load é instantâneo)

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

- [ ] Busca fuzzy na Command Palette para itens
- [ ] Oracle AI responde sobre itens
- [ ] Item images/icons (se disponíveis no 5e.tools)
- [ ] Integração com character sheets (equipar item)
- [ ] Filtro por source book
- [ ] Comparar itens side-by-side
- [ ] Admin ContentEditor para itens (Supabase sync)
