# Prompt — SEO & Page Quality Improvements

## Contexto

O Pocket DM (pocketdm.com.br) é um combat tracker para D&D 5e com compêndio público bilíngue (EN/PT-BR). As páginas públicas são a porta de entrada orgânica para o produto.

## Arquitetura de Páginas Bilíngues

### Rotas existentes (16 pares EN↔PT)

| EN Route | PT Route | Tipo |
|----------|----------|------|
| `/monsters` | `/monstros` | Index (~1122 monstros SRD+MAD) |
| `/monsters/[slug]` | `/monstros/[slug]` | Detail page |
| `/spells` | `/magias` | Index (~604 magias) |
| `/spells/[slug]` | `/magias/[slug]` | Detail page |
| `/races` | `/racas` | Index (9 raças) |
| `/races/[slug]` | `/racas/[slug]` | Detail page |
| `/classes` | — | Index (12 classes, sem PT) |
| `/classes/[slug]` | — | Detail (sem PT) |
| `/conditions` | `/condicoes` | Toggle 2014/2024 |
| `/diseases` | `/doencas` | Toggle 2014/2024 |
| `/damage-types` | `/tipos-de-dano` | Grid |
| `/ability-scores` | `/atributos` | Calculadora interativa |
| `/actions` | `/acoes-em-combate` | Grid |
| `/dice` | `/dados` | Rolador interativo |
| `/rules` | `/regras` | Referência + FAQ rich snippets |
| `/encounter-builder` | `/calculadora-encontro` | Toggle DMG 2014/2024 |

### Estrutura padrão de cada página

```
PublicNav (sticky, breadcrumbs)
  └─ main
       ├─ Componente principal (Grid/Detail/Calculator)
       ├─ PublicCTA (call-to-action para /try)
       └─ "Página disponível em English/Português" (link pro par)
  └─ footer (CC-BY-4.0 attribution)
```

### Regras de metadata (SEO)

1. **Title**: Root layout tem `template: "%s | Pocket DM"` — páginas retornam title SEM `| Pocket DM` (o template adiciona)
2. **OG/Twitter titles**: Incluir `| Pocket DM` explicitamente (template não se aplica a OG)
3. **Hreflang alternates**: Toda página com par EN↔PT deve ter `alternates.languages` com ambas URLs
4. **Acentuação**: Titles e descriptions em PT DEVEM usar acentos corretos (Condições, não Condicoes)
5. **Monster PT names**: `generateMetadata` em `/monstros/[slug]` usa `ptName` do `monster-descriptions-pt.json`

### Regras de locale

1. **Rota define o idioma default** — EN page sempre inicia em inglês, PT page sempre em português
2. **Toggle de idioma no stat block de monstros** — bidirecional em ambas as páginas (EN e PT)
3. **localStorage `pocket-dm:monster-lang-global`** — NÃO sobrescreve o locale da rota
4. **Link "Página disponível em..."** — posicionado no FINAL da página, antes do footer

### Componentes chave

| Componente | Locale | Toggle |
|-----------|--------|--------|
| `PublicMonsterStatBlock` | via `useMonsterTranslation(slug, locale)` | Bidirecional EN↔PT |
| `PublicConditionsGrid` | via prop `locale` | 2014/2024 SRD version |
| `PublicEncounterBuilder` | via prop `locale` | DMG 2014/2024 formula |
| Todos os outros | via prop `locale` | Sem estado global |

## Brand Identity

- **Paleta**: Dark bg (#0a0a0f), Gold accents (#D4A853), Cinzel font para títulos
- **Tom**: Premium, minimalista, "Radical Simplicity" — oposto de 5e.tools (bloated)
- **CTA**: "Try Free" / "Testar Grátis" sempre visível, direciona para `/try`
- **Anti-pattern**: Emojis, excesso de cor, complexidade desnecessária

## Moats competitivos

1. **Radical Simplicity** — UI limpa vs enciclopédias densas
2. **Bilíngue nativo** — PT-BR completo (competidores não traduzem)
3. **Toggle 2014/2024** — Coexistência de SRD versions (presente em conditions, encounter builder; falta em monster detail pages)
4. **Ferramentas interativas** — Calculadora de modificador, rolador de dados, encounter builder

## Issues resolvidos (não reintroduzir)

- ~~Double branding `| Pocket DM | Pocket DM`~~ — fixado via template
- ~~Monster PT title em inglês~~ — fixado com ptName no metadata
- ~~Acentuação stripping~~ — 100+ strings corrigidas
- ~~Breadcrumb overlap 1440px~~ — overflow-hidden + shrink-0
- ~~localStorage override de locale~~ — rota é source of truth

## Issues conhecidos (ainda por resolver)

- Toggle 2014/2024 ausente em **Monster Detail pages** (só badge estático "2014")
- `PublicSpellCard` não tem suporte a tradução (sempre EN)
- `/classes` não tem equivalente PT
- FAQ answers em `/regras` tem acentos mas o corpo do componente `PublicRulesReference` pode ter strings sem acento
