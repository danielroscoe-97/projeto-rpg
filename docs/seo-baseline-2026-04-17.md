# SEO Baseline — 2026-04-17

Snapshot before Sprint 1 (Canonical Foundation). Use this to measure delta over 30/60/90 days.

## Search Console (últimos 28 dias, corte 2026-04-17)

### Performance geral

| Métrica | Valor |
|---|---|
| Cliques | 18 |
| Impressões | 734 |
| CTR | 2,45% |
| Posição média | ~28 |

### Cobertura (indexação)

| Status | Páginas |
|---|---|
| Indexadas | 119 |
| Detectadas, mas não indexadas | **4.698** |
| Rastreadas, mas não indexadas | 2 |
| Erros de redirecionamento | 18 |
| Página alternativa com canônica adequada | 8 |
| Página com redirecionamento | 1 |

### Top 10 páginas por cliques

| Página | Cliques | Impressões | CTR | Posição |
|---|---|---|---|---|
| `/` (www) | 5 | 10 | 50% | 8,9 |
| `/monsters` | 3 | 63 | 4,76% | 17,48 |
| `/` (http apex) | 3 | 7 | 42,86% | 2,43 |
| `/spells` | 2 | 54 | 3,7% | 15,61 |
| `/monstros` | 2 | 47 | 4,26% | 16,45 |
| `/encounter-builder` | 1 | 45 | 2,22% | 61,02 |
| `/spells/fly` | 1 | 13 | 7,69% | 26 |
| `/about` | 1 | 9 | 11,11% | 9,11 |
| `/itens` | 1 | 5 | 20% | 7,8 |

### Top 15 queries-âncora (monitorar semanalmente)

| Query | Pos | Impr | CTR |
|---|---|---|---|
| `bestiário d&d 5e` | **8,38** | 8 | 0% |
| `tabela de atributos d&d` | **8,5** | 4 | 0% |
| `dm tracker` | **7** | 2 | 0% |
| `combat tracker dnd` | 38 | 1 | 100% |
| `misty step 5e` | 38,67 | 9 | 0% |
| `helmed horror 5e` | 16 | 5 | 0% |
| `magias d&d 5e` | 30 | 5 | 0% |
| `fly 5e` | 30,8 | 5 | 0% |
| `invisibility 5e` | 35 | 4 | 0% |
| `lemure d&d` | 71,25 | 4 | 0% |
| `cr calculator 5e` | 83 | 4 | 0% |
| `encounter difficulty calculator` | 64 | 3 | 0% |
| `pit fiend` | 36 | 3 | 0% |
| `feather fall 5e` | 33 | 3 | 0% |
| `5e lesser restoration` | 36,67 | 3 | 0% |

### Distribuição geográfica

| País | Cliques | Impressões |
|---|---|---|
| Brasil | 15 | 242 |
| Estados Unidos | 1 | 243 |
| Finlândia | 1 | 5 |
| Peru | 1 | 1 |

### Dispositivos

| Tipo | Cliques | Impressões | CTR | Posição |
|---|---|---|---|---|
| Celular | 10 | 127 | 7,87% | 11,2 |
| Computador | 8 | 606 | 1,32% | 27,71 |
| Tablet | 0 | 1 | 0% | 10 |

## Estado do projeto antes do Sprint 1

### Domain canonical
- ✅ Redirects 301/308 configurados na Vercel (2026-04-17)
- ✅ Canônico decidido: **apex** (`https://pocketdm.com.br`, sem www)
- Pendente: atualizar `NEXT_PUBLIC_SITE_URL` no Vercel → apex
- Pendente: reenviar `sitemap.xml` no GSC

### robots.txt (antes do Sprint 1)
```
disallow: /app/ /admin/ /auth/ /api/ /join/ /invite/ /try/combat/ /srd/
```
- Sem host declarado
- Sem disallow para `/r/` (short URLs de combate)
- Sem bloqueio a parâmetros de URL

### sitemap.xml (antes do Sprint 1)
- ~2.000 URLs totais
- `lastModified: new Date()` para TUDO (Google ignora)
- `changeFrequency: "monthly"` para tudo, incluindo SRD estático
- 2 indexes listados 2x (`condicoes`/`conditions`) — conflito

### Metadata
- `metadataBase` usa env var com fallback apex ✅
- ~130 URLs hardcoded `https://pocketdm.com.br` (todos apex, alinhados) — tech debt
- SRD detail pages sem `generateMetadata` customizado (Sprint 2)
- hreflang ambíguo PT/EN (Sprint 2)

### Structured Data
- Blog: `Article` + `BreadcrumbList` ✅
- Homepage: sem `Organization`/`WebSite`/`SoftwareApplication` (Sprint 3)
- SRD detail: sem JSON-LD (Sprint 3)

## Metas de Sprint

| Sprint | 30d (2026-05-17) | 60d (2026-06-17) | 90d (2026-07-17) |
|---|---|---|---|
| Cliques/28d | 100+ | 300+ | 500+ |
| Impressões/28d | 3.000+ | 6.000+ | 10.000+ |
| CTR | 3,3% | 4,5% | 5%+ |
| URLs indexadas | 1.500+ | 2.500+ | 3.000+ |
| Queries top 3 | 10+ | 20+ | 30+ |
| Queries top 10 | 30+ | 60+ | 80+ |

## Queries de oportunidade imediata (Sprint 2 alvo)

Queries já em top 10 com CTR 0% — metadata rewrite = ganho garantido:

1. `bestiário d&d 5e` (pos 8,38) → `/monstros`
2. `tabela de atributos d&d` (pos 8,5) → `/atributos`
3. `dm tracker` (pos 7) → `/`
4. `axe beak stat block` (pos 7,5) → `/monsters/axe-beak`
5. `cleric city domain` (pos 8) → `/monsters/city-domain-cleric`
6. `fog cloud 2024` (pos 8,5) → `/spells/fog-cloud-2024`
7. `helmed horror 5e stats` (pos 9,5) → `/monsters/helmed-horror`

## Notas

- **Split-brain www/apex**: GSC ainda tem propriedades separadas para `www.pocketdm.com.br` e `pocketdm.com.br`. Após consolidação, dados vão migrar progressivamente para apex.
- **US = 243 impressões, 1 clique**: queries EN estão aparecendo no US mas posição ruim (36,48). Mercado secundário — não priorizar ainda.
- **Brasil = 83% dos cliques**: foco PT-BR continua estratégico. Inglês complementar.
- **Mobile > Desktop**: mobile CTR 7,87% vs desktop 1,32%. Garantir performance mobile em todas as sprints.
