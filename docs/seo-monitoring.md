# SEO Monitoring Dashboard — Pocket DM

**Rastreamento semanal + deltas 30/60/90d das métricas de SEO.**

Baseline: [seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md)
Arquitetura: [seo-architecture.md](./seo-architecture.md)
Entregas pós-baseline: [seo-delivery-report-2026-04-17.md](./seo-delivery-report-2026-04-17.md)

---

## 🗓️ Ritual de monitoramento

### Toda segunda-feira (15 min)

1. Abrir [GSC Performance](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Apocketdm.com.br)
2. Setar filtro: **Últimos 7 dias**
3. Anotar nas métricas abaixo:
   - Cliques (total da semana)
   - Impressões (total da semana)
   - CTR (%)
   - Posição média
   - Páginas indexadas ([Index > Pages](https://search.google.com/search-console/index?resource_id=sc-domain%3Apocketdm.com.br))
4. Spot check: 3 queries-âncora da tabela abaixo. Pegar posição atual. Se desceu >5 posições em 1 semana, investigar na seção "Alertas".
5. Anotar descobertas em `docs/seo-log-semanal.md` (ou GSheets se preferir — fonte única).

### No 30º dia (2026-05-17) — Comparação 30d

Preencher as colunas da tabela "Query-âncora tracking" abaixo com as posições atuais. Calcular delta. Publicar sumário na primeira linha do `seo-delivery-report-2026-04-17.md` ou abrir arquivo `seo-delivery-30d.md`.

### No 60º dia (2026-06-17) e 90º dia (2026-07-17)

Idem — mesmo ritual. Compara deltas a cada marco.

---

## 🎯 Query-âncora tracking (posição GSC)

Referência original: [seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md#top-15-queries-âncora-monitorar-semanalmente)

| Query | Baseline (2026-04-17) | 2026-05-17 (30d) | 2026-06-17 (60d) | 2026-07-17 (90d) | Δ 30d | Δ 90d | Nota |
|---|---:|---:|---:|---:|---:|---:|---|
| `bestiário d&d 5e` | 8,38 | — | — | — | — | — | Alvo: <5 (hub page criado Sprint 4) |
| `tabela de atributos d&d` | 8,5 | — | — | — | — | — | Alvo: <5 (/atributos metadata tunado Sprint 2) |
| `dm tracker` | 7 | — | — | — | — | — | Alvo: top 3 (home tem WebApplication LD) |
| `combat tracker dnd` | 38 | — | — | — | — | — | Alvo: top 10 |
| `misty step 5e` | 38,67 | — | — | — | — | — | Alvo: top 10 (detail page com stat block) |
| `helmed horror 5e` | 16 | — | — | — | — | — | Alvo: top 10 |
| `magias d&d 5e` | 30 | — | — | — | — | — | Alvo: <10 (hub /guias/lista-magias-dnd-5e) |
| `fly 5e` | 30,8 | — | — | — | — | — | Alvo: <10 |
| `invisibility 5e` | 35 | — | — | — | — | — | Alvo: <15 |
| `lemure d&d` | 71,25 | — | — | — | — | — | Long-tail — alvo: <30 |
| `cr calculator 5e` | 83 | — | — | — | — | — | Alvo: top 20 (/calculadora-encontro) |
| `encounter difficulty calculator` | 64 | — | — | — | — | — | Alvo: <30 |
| `pit fiend` | 36 | — | — | — | — | — | Alvo: <20 |
| `feather fall 5e` | 33 | — | — | — | — | — | Alvo: <20 |
| `5e lesser restoration` | 36,67 | — | — | — | — | — | Alvo: <20 |
| `monstros por CR d&d 5e` | — (não aparece) | — | — | — | — | — | Hub page novo — monitorar aparecimento |
| `lista de magias d&d 5e` | — (não aparece) | — | — | — | — | — | Hub page novo — monitorar aparecimento |

### Como preencher

1. GSC > Performance > Queries > filtrar pela query literal.
2. Pegar **Posição média** da última semana.
3. Preencher na coluna correspondente.
4. Delta = baseline − atual. Número positivo = subiu (melhor).

---

## 📈 Metas agregadas (do baseline)

Target para 2026-05-17 / 06-17 / 07-17:

| Métrica | Baseline 2026-04-17 | 30d target | 60d target | 90d target | Atual |
|---|---:|---:|---:|---:|---|
| Cliques/28d | 18 | 100+ | 300+ | 500+ | — |
| Impressões/28d | 734 | 3.000+ | 6.000+ | 10.000+ | — |
| CTR | 2,45% | 3,3% | 4,5% | 5%+ | — |
| URLs indexadas | 119 | 1.500+ | 2.500+ | 3.000+ | — |
| "Detectadas não indexadas" | 4.698 | <1.500 | <800 | <500 | — |
| Queries top 3 | 2 | 10+ | 20+ | 30+ | — |
| Queries top 10 | 8 | 30+ | 60+ | 80+ | — |

---

## 🔬 Links úteis

### Google Search Console

- **Performance (últimos 28d)**: https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Apocketdm.com.br
- **Páginas indexadas**: https://search.google.com/search-console/index?resource_id=sc-domain%3Apocketdm.com.br
- **Sitemaps**: https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Apocketdm.com.br
- **Core Web Vitals** (após T4.1 deploy): https://search.google.com/search-console/core-web-vitals?resource_id=sc-domain%3Apocketdm.com.br

### Rich Results Test (validar após deploy)

Rodar manualmente após qualquer mudança em metadata/JSON-LD:

- Home — detect WebApplication + FAQPage: https://search.google.com/test/rich-results?url=https://pocketdm.com.br/
- Monster detail — Article + BreadcrumbList: https://search.google.com/test/rich-results?url=https://pocketdm.com.br/monsters/axe-beak
- FAQ — FAQPage: https://search.google.com/test/rich-results?url=https://pocketdm.com.br/faq
- Blog post — Article + BreadcrumbList: https://search.google.com/test/rich-results?url=https://pocketdm.com.br/blog/como-usar-combat-tracker-dnd-5e
- Hub page — Article + BreadcrumbList (novo Sprint 4): https://search.google.com/test/rich-results?url=https://pocketdm.com.br/guias/bestiario-dnd-5e
- Index — BreadcrumbList (CollectionPage não é rich result): https://search.google.com/test/rich-results?url=https://pocketdm.com.br/monstros

### Core Web Vitals (T4.1 — web-vitals → Vercel Analytics)

- **Vercel Analytics Dashboard**: https://vercel.com/danielroscoe97s-projects/projeto-rpg/analytics
- Filtrar por eventos `LCP`, `CLS`, `INP`, `FCP`, `TTFB` (enviados como custom events)
- Metas:
  - LCP ≤ 2,5 s (75th percentile)
  - CLS ≤ 0,1 (75th percentile — valor enviado é CLS*1000, então ≤100)
  - INP ≤ 200 ms (75th percentile)

### Rastreamento de indexação

- Ping sitemap após deploys relevantes:
  ```
  curl "https://www.google.com/ping?sitemap=https://pocketdm.com.br/sitemap.xml"
  ```
- Request reindex direto no GSC para as páginas-âncora após mudanças grandes.

---

## 🚨 Alertas de regressão

**Se qualquer um destes gatilhos disparar, investigar em 24h:**

### Gatilho A — Posição média despenca

- Se posição média de qualquer query-âncora acima **cair >5 posições em 1 semana**, verificar:
  1. A página correspondente ainda é indexada? (`site:pocketdm.com.br/{slug}` no Google)
  2. JSON-LD continua válido? (Rich Results Test)
  3. Houve redirect quebrado? (`curl -I https://pocketdm.com.br/{slug}`)
  4. Core Web Vitals regrediram? (Vercel Analytics)

### Gatilho B — "Detectadas não indexadas" sobe

- Se a contagem de "Detectadas, mas não indexadas" no GSC **sobe ao invés de descer**, verificar:
  1. Canonical apex ainda está funcionando? (`curl -sI https://www.pocketdm.com.br` → 301 para apex)
  2. `NEXT_PUBLIC_SITE_URL=https://pocketdm.com.br` em todos os ambientes Vercel?
  3. Sitemap continua acessível e com URLs corretos? (`curl -s https://pocketdm.com.br/sitemap.xml | grep -c "<loc>"`)

### Gatilho C — CTR despenca

- Se CTR geral cair >30% relativo à média móvel de 4 semanas, verificar:
  1. Titles/descriptions foram truncados acidentalmente em algum builder de `lib/seo/metadata.ts`?
  2. Descriptions estão duplicadas em várias páginas?
  3. Alguma página está rankeando com um meta description genérico em vez do específico?

### Gatilho D — Core Web Vitals pioram

- Se LCP, CLS ou INP sobem para "Needs improvement" ou "Poor" no Vercel Analytics:
  1. Houve deploy com lib nova pesada?
  2. Alguma imagem/fonte foi adicionada sem otimização?
  3. Reverter o deploy suspeito e comparar.

---

## 📝 Log de mudanças (opcional)

Registrar aqui (ou em arquivo separado) toda mudança que pode afetar ranking. Útil para correlacionar deltas com alterações.

Formato sugerido:
```
YYYY-MM-DD — [título curto]
  Arquivos: lista
  Impacto esperado: positivo/neutro/negativo (por quê)
  Query-âncora afetada: bestiário d&d 5e, magias d&d 5e, ...
```

### Histórico recente

- 2026-04-17 — Sprint 3.6 blog JSON-LD migration (commit `67bd1234`). Impacto: positivo (blog posts agora com Article + BreadcrumbList + XSS-safe script). Afeta: queries de blog.
- 2026-04-17 — Sprint 4.1 Core Web Vitals instrumentation (commit `55e29c47`). Impacto: neutro (só mede, não corrige — mas viabiliza Gatilho D daqui em diante).
- 2026-04-17 — Sprint 4.3 Hub pages `/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e` (commit `e92ebdc2`). Impacto: positivo esperado (captura long-tail "bestiário d&d 5e", "magias d&d 5e", "monstros por CR"). Monitorar 30/60d.
- 2026-04-17 — Sprint 4.4 Monitoring doc criado (este arquivo).

---

## 🧪 Looker Studio (opcional — esforço extra, ~2h)

Para um dashboard mais poderoso conectado direto ao GSC API:

1. Acesse [Looker Studio](https://lookerstudio.google.com)
2. Criar novo relatório
3. Fonte de dados: **Search Console** (connector nativo)
4. Autorizar com a conta que tem acesso ao GSC de `pocketdm.com.br`
5. Usar templates públicos do GSC como ponto de partida (busca "GSC template" no Looker)

Benefícios: gráficos de tendência automáticos, filtros por query/página, exports PDF semanais. Desvantagem: tempo inicial de configuração ~2h + manutenção periódica.

**Recomendação**: começar com este arquivo markdown + log semanal manual. Se em 60d o volume de queries a monitorar passar de 30, migrar pra Looker.
