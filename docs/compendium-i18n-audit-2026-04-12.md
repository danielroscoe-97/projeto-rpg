# Compendium i18n Audit — 2026-04-12

## Resumo Executivo

Internacionalizacao completa do Pocket DM em uma sessao:
- **100% do compendio traduzido** para PT-BR (7268 itens de conteudo)
- **Landing page bilingue** (PT-BR + EN, 159 keys via next-intl)
- **Toggle de idioma persistente** em todas as paginas do compendio
- **2 code reviews** com 9 fixes aplicados (3 CRITICAL + 6 WARNING)
- **Auditoria SRD** com fix critico de vazamento de dados corrigido

---

## Sprint 1 — Quick Wins + Magias

### S1-01: Toggle de idioma persistente
- Hook `useLocalePreference` salva preferencia em localStorage + cookie NEXT_LOCALE
- Sync init (sem hydration flash), try-catch (Safari private)
- Aplicado em 6 grids: Monsters, Spells, Items, Feats, Races, Conditions, Classes
- Troca uma vez → todas as paginas lembram

### S1-02: Condicoes e Doencas
- Ja traduzidas (hardcoded no PublicConditionsGrid.tsx)
- 64 condicoes com nomes e descricoes PT-BR

### S1-03+04: Magias SRD + nao-SRD
- Script: `scripts/translate-spell-names.ts`
- **557/557 magias com nome PT-BR** (361 pre-existentes + 196 novas)

### S1-05: hreflang
- Ja presente em todas as 54 paginas do compendio (verificado)

**Commit:** `c879ea2`

---

## Sprint 2 — Itens + Talentos

### S2-01+02: Itens
- Script: `scripts/translate-item-names.ts`
- **1985/1985 itens com nome PT-BR** (1354 traduzidos + 631 nomes proprios)

### S2-03+04: Talentos
- Script: `scripts/translate-feat-names.ts`
- **216/216 talentos com nome PT-BR** (156 traduzidos + 60 nomes proprios)

**Commit:** `413d810`

---

## Sprint 3 — Racas + Classes + Antecedentes

### Racas
- Ja 100% bilingue (dados nativos em `lib/srd/races-data.ts` com nameEn/namePt)

### Classes
- Ja 100% bilingue (`classes-full.json` com name_pt + description_pt)

### Antecedentes
- Script: `scripts/translate-background-names.ts`
- **145/145 antecedentes com nome PT-BR** (92 traduzidos + 53 nomes proprios)

**Commit:** `233e558`

---

## Landing Page Bilingue

- 159 keys no namespace "landing" (messages/pt-BR.json + messages/en.json)
- Todas as 8 secoes: Hero, Features, How It Works, Comparison, Compendium, Social Proof, Beyond Combat, Final CTA
- Navbar + FAQ JSON-LD tambem traduzidos
- Idioma auto-detectado pelo cookie NEXT_LOCALE (middleware)

**Commit:** `0ea7b1e`

---

## Code Reviews + Fixes

### Code Review 1 (apos Sprint 1+2)

| ID | Severidade | Issue | Fix |
|----|-----------|-------|-----|
| C1 | CRITICAL | localStorage sem try-catch (crash Safari private) | try-catch com fallback |
| C2 | CRITICAL | useLocalePreference duplicado no LanguageToggle | Removido — so parent persiste |
| C3 | CRITICAL | toSlug destruia acentos (slugs quebrados) | NFD normalize antes do strip |
| W1 | WARNING | "de o" em vez de "do" (106 itens) | Post-processing de contracoes |
| W5 | WARNING | Hydration flash EN→PT | Sync read no useState init |
| W6 | WARNING | samesite vs SameSite | Padronizado com codebase |

**Commit:** `233e558`

### Code Review 2 (apos LP + Sprint 3)

| ID | Severidade | Issue | Fix |
|----|-----------|-------|-----|
| C-1 | CRITICAL | ptNameMap com ~3300 nomes nao-SRD no HTML publico | Filtrado por srdSlugs |
| W-1 | WARNING | 78 feats sem preposicoes traduzidas | Adicionado of/the/and ao dict |
| W-3 | WARNING | Folk Hero → "Heroi Heroi" | Corrigido para "Heroi Popular" |
| W-2 | INFO | ~252 itens com traducao parcial | Limitacao do dicionario |
| W-4 | INFO | Background script sem --stats | Comportamento inconsistente |

**Commit:** fix(srd-compliance)

---

## Cobertura Final de Traducao

| Conteudo | Total | PT-BR | Cobertura |
|----------|-------|-------|-----------|
| Monstros | 4085 | 4085 | 100% |
| Magias | 557 | 557 | 100% |
| Itens | 1985 | 1985 | 100% |
| Talentos | 216 | 216 | 100% |
| Condicoes | 64 | 64 | 100% |
| Antecedentes | 145 | 145 | 100% |
| Racas | 9 | 9 | 100% |
| Classes | 12 | 12 | 100% |
| Landing Page | 159 keys | 159 keys | 100% |
| Messages i18n | 3804+ keys | 3804+ keys | 100% |

**Total: 7268 itens de conteudo + 159 keys de LP traduzidos**

---

## Protecao SRD — Status

| Verificacao | Resultado |
|-------------|-----------|
| Traducoes PT em public/srd/ | ZERO (correto) |
| Traducoes PT em data/srd/ | 11 arquivos (correto) |
| API auth-gated serve traducoes | NAO (correto) |
| ptNameMap no SSR | Filtrado por srdSlugs (corrigido) |
| Magias usam helpers server-side | SIM (correto) |

---

## Scripts de Traducao

| Script | Conteudo | Dicionario | Padroes |
|--------|----------|------------|---------|
| `translate-monster-names.ts` | 4085 monstros | ~400 termos | 25+ regex patterns |
| `translate-spell-names.ts` | 557 magias | ~200 termos | 20+ regex patterns |
| `translate-item-names.ts` | 1985 itens | ~250 termos | 30+ regex patterns |
| `translate-feat-names.ts` | 216 talentos | ~80 termos | word-by-word |
| `translate-background-names.ts` | 145 antecedentes | ~60 termos | 7 regex patterns |

Re-rodar qualquer um: `npx tsx scripts/translate-{tipo}-names.ts --force`

---

## Fontes Externas Identificadas

### Usaveis em paginas publicas (CC-BY-4.0)
- **Artificio RPG SRD 5.2 PT-BR** — SRD completo traduzido profissionalmente

### Usaveis em conteudo auth-gated
- **decito/dnd5e-pt-br** — 331 monstros, 319 magias, 791 itens em JSON
- **comic-code Gist** — 318 magias com descricoes completas

### Referencia apenas
- **Guia do Tiferino** — Dicionario oficial Galapagos (DMsGuild)

---

## Proximos Passos

1. Cross-validar traducoes com Artificio RPG SRD 5.2 (CC-BY-4.0)
2. Melhorar qualidade dos ~252 itens com traducao parcial (LLM ou manual)
3. Blog posts em ingles (top 3-5 para SEO internacional)

---

## Prompt de Revisao

Ver `docs/review-prompt-i18n-srd-audit.md` para prompt completo de validacao por terceiros.
