# Sprint: Stream Paralela — SRD Feature Flag + SEO + Parser

**Data:** 2026-03-28
**Branch:** `claude/setup-cloud-storage-MtDHl`
**Status:** Completo (CR + QA passed)

---

## O que foi entregue

### 1. Feature Flag SRD/non-SRD (Kill Switch Legal)

**Objetivo:** Permitir remover conteúdo non-SRD do compendium com um deploy instantâneo.

**Implementação:**
- **Migration 029** (`supabase/migrations/029_srd_source_type.sql`): campo `source_type` nas tabelas `monsters` e `spells` + feature flag `show_non_srd_content`
- **Script de classificação** (`scripts/classify-srd-content.ts`): marca conteúdo SRD nos JSON bundles com campo `is_srd`
  - 419 monstros SRD (MM minus deny-list de IPs protegidas)
  - 361 magias SRD (PHB)
- **Hook `useSrdContentFilter`** (`lib/hooks/use-srd-content-filter.ts`): filtra conteúdo nos browsers do compendium quando flag desligada
- **Browsers atualizados**: `MonsterBrowser.tsx` e `SpellBrowser.tsx` agora usam o filtro

**Como usar o kill switch:**
1. Na tabela `feature_flags`, mudar `show_non_srd_content` → `enabled: false`
2. Compendium passa a mostrar apenas conteúdo SRD automaticamente
3. Páginas SEO públicas **sempre** mostram apenas SRD, independente da flag

**Classificação SRD (deny-list):**
Monstros do MM que são IP protegida (NÃO SRD): Beholder, Mind Flayer, Displacer Beast, Githyanki/Githzerai, Yuan-ti, Carrion Crawler, Umber Hulk, Slaadi, Kuo-toa, e outros. Lista completa em `scripts/classify-srd-content.ts`.

---

### 2. Páginas SEO (780+ páginas indexáveis)

**Objetivo:** Cada monstro e magia SRD como página web indexável pelo Google.

**Rotas:**
- `/monsters` — Índice de todos os monstros SRD, agrupado por letra, com navegação alfabética
- `/monsters/[slug]` — Stat block completo com SSG + ISR 24h (ex: `/monsters/ancient-red-dragon`)
- `/spells` — Índice de magias SRD, agrupado por nível
- `/spells/[slug]` — Ficha completa da magia (ex: `/spells/fireball`)

**SEO técnico:**
- `app/sitemap.ts` — Sitemap dinâmico com todas as páginas
- JSON-LD schema markup (Article) em cada página
- Meta tags: title, description, Open Graph, Twitter Card
- Canonical URLs
- CTAs para o combat tracker em todas as páginas
- Atribuição CC-BY-4.0 no footer

**Arquitetura:**
- `lib/srd/srd-data-server.ts` — Loader server-side que lê JSON estáticos (com try-catch e cache)
- `generateStaticParams()` com dedup de slugs para evitar colisões
- ISR com revalidação a cada 24h

---

### 3. Parser de Stat Blocks

**Objetivo:** Permitir que o mestre cole um stat block de qualquer fonte e traga pro combate.

**Parser** (`lib/parser/stat-block-parser.ts`):
- ~500 linhas de regex puro, zero dependências externas
- Parseia: nome, AC, HP, ability scores, speed, saving throws, skills, resistências, imunidades, senses, languages, CR, XP, special abilities, actions, legendary actions, reactions
- Tolerante a: tabs, espaços extras, PDFs com formatação quebrada, D&D Beyond, smart quotes
- 54 testes unitários cobrindo: Ancient Red Dragon, Goblin, Lich, Knight (reactions), edge cases

**UI** (`components/homebrew/StatBlockImporter.tsx`):
- Fluxo: Colar → Parse → Preview/Edit → Salvar no Homebrew
- Campos editáveis inline com destaque para campos não parseados
- Warnings visuais para campos faltando
- Salva em `homebrew_monsters` com `source_type: "homebrew_imported"`
- i18n: PT-BR e EN

---

## Code Review (BMAD Adversarial)

7 patches encontrados e corrigidos:

| # | Issue | Fix |
|---|-------|-----|
| 1 | Feature flag race: non-SRD durante loading | Filtra SRD-only enquanto loading |
| 2 | Slug collision no SSG | Dedup via `getSrdMonstersDeduped()` |
| 3 | `spell.classes.length` sem null guard | Optional chaining `?.` |
| 4 | `readFileSync` sem try-catch | Graceful fallback `[]` |
| 5 | Meta description null | Null guard no `.slice()` |
| 6 | Speed parser `{}` sem fallback | Default `{ walk: "30 ft." }` |
| 7 | AC 0 tratado como missing | `== null` em vez de falsy |

---

## QA

- **TypeScript:** 0 erros
- **Testes:** 644/645 passando (1 falha pré-existente em `initiative.test.ts`)
- **Parser:** 54/54 testes passando

---

## Próximos passos

1. **Refinar classificação SRD:** A deny-list cobre os monstros mais óbvios. Adicionar validação com lista exata do SRD 5.1 (ou modificar `fetch-5etools-bestiary.ts` para preservar campo `srd` da fonte)
2. **Integrar parser no combate:** Botão "Import" no MonsterSearchPanel para uso durante sessão
3. **Pricing internacional:** Setup Stripe USD + plano anual
4. **Métricas viral loop:** Tracking de player view → mestre conversion
5. **Blog/conteúdo SEO:** Artigos pra meio de funil
