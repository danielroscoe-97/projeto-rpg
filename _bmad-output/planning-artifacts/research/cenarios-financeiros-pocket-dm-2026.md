# Cenarios Financeiros & Projecoes — Pocket DM

**Data:** 2026-03-27
**Horizonte:** 12 meses (Abr 2026 → Mar 2027)
**Moeda:** BRL (conversao USD 1 = R$ 5,20)
**Base:** Benchmarks verificados de mercado SaaS, VTT e apps Brasil

---

## Sumario Executivo

Este documento apresenta **3 cenarios** (Conservador, Base, Otimista) com numeros reais de custos, receita, margem, investimento necessario, ROI e payback.

**A verdade inconveniente:** 97% dos SaaS nao atingem R$ 5M ARR no primeiro ano. Mas o Pocket DM tem uma vantagem estrutural rara: **cada DM pagante expoe 4-5 jogadores gratuitamente**, criando um loop viral natural que a maioria dos SaaS nao tem.

---

## 1. Estrutura de Precos

### Plano proposto (baseado em ARPU Brasil)

| Plano | Preco/mes | Preco/ano | O que inclui |
|---|---|---|---|
| **Free** | R$ 0 | R$ 0 | Ate 6 combatentes, 1 sessao ativa, player view, share link |
| **Pro** | R$ 14,90 | R$ 119/ano (33% off) | Ilimitados combatentes, campanhas, presets, audio custom, historico |
| **Pro DM** | R$ 29,90 | R$ 239/ano | Tudo do Pro + multiplas sessoes simultaneas, API, priority support |

> **Por que R$ 14,90?** Benchmarks mostram que Brasil e mercado de "alto volume, baixo ARPU". O ARPU medio de apps no Brasil e ~R$ 25/mes (telecom). Para um nicho, R$ 14,90 e o sweet spot — abaixo do limiar psicologico de R$ 15, acima do "tao barato que parece ruim". Teste A/B entre R$ 12,90 e R$ 14,90 recomendado (Hipotese H8 do market research).

---

## 2. Custos Reais — Detalhamento Mensal

### 2.1 Infraestrutura (Custos Fixos)

| Item | Free Tier | Quando paga | Custo mensal | Notas |
|---|---|---|---|---|
| **Supabase** (DB + Realtime + Auth + Storage) | Ate 500MB DB, 2GB storage, 50K MAUs | >500MB ou >50K MAUs | R$ 130 (Pro $25) | Realtime e o core — precisa de Pro cedo |
| **Vercel** (Next.js hosting) | 100GB bandwidth | >100GB bandwidth | R$ 104 (Pro $20) | Free tier aguenta ~5-10K MAUs |
| **Dominio** (.com.br) | — | Sempre | R$ 4/mes (R$ 40/ano) | pocketdm.com.br ou similar |
| **PostHog** (analytics) | 1M eventos/mes | >1M eventos | R$ 0 → R$ 234 | Free tier dura ate ~10K MAUs |
| **Hotjar** (heatmaps) | 35 sessoes/dia | >35/dia | R$ 0 → R$ 170 | Free tier suficiente ate Fase 2 |
| **Email transacional** (Resend) | 3K emails/mes | >3K | R$ 0 → R$ 104 | Welcome emails, notificacoes |
| **Stripe** (gateway) | — | Por transacao | 2,49% + R$ 0,39/tx | Suporta Pix nativo |

### 2.2 Custos Variaveis (escalam com usuarios)

| Custo | Formula | A 1K MAUs | A 5K MAUs | A 20K MAUs |
|---|---|---|---|---|
| Supabase Realtime | ~R$ 0,002/conexao concorrente/hora | R$ 130 (Pro flat) | R$ 130 | R$ 390 (Pro + usage) |
| Vercel bandwidth | ~R$ 0,001/request apos free | R$ 0 | R$ 0 | R$ 208 |
| Stripe fees (por tx) | 2,49% + R$ 0,39 | R$ 15 | R$ 75 | R$ 300 |
| Suporte (tempo) | Estimativa horas | R$ 0 | R$ 0 | ~R$ 500 (freelancer) |

### 2.3 Custos de Marketing

| Canal | Investimento/mes | Esperado | Custo por Install (CPI) |
|---|---|---|---|
| TikTok organico | R$ 0 (tempo) | 500-5K views/video | R$ 0 |
| Micro-influencers (10x R$ 300) | R$ 3.000 | ~500-2K signups | R$ 1,50-6,00/signup |
| Meta Ads (Instagram/Facebook) | R$ 1.000-3.000 | ~1K-3K installs | R$ 1,00-3,00/install |
| Reddit/Discord (organico) | R$ 0 (tempo) | ~100-500 signups | R$ 0 |
| YouTube sponsors | R$ 2.000-5.000 | ~500-2K signups | R$ 2,50-10,00/signup |

> **Benchmark:** CPI medio no Brasil para apps Android e R$ 1,15-2,30 (USD $0.22-0.44). Para nichos, pode chegar a R$ 3-5. Apps organicos (TikTok viral) podem ter CPI efetivo < R$ 0,50.

### 2.4 Resumo de Custos Mensais por Fase

| Fase | Infra | Marketing | Total/mes |
|---|---|---|---|
| **Fase 0** (pre-lancamento) | R$ 134 | R$ 0 | **R$ 134** |
| **Fase 1** (0-500 MAUs) | R$ 234 | R$ 1.000 | **R$ 1.234** |
| **Fase 2** (500-5K MAUs) | R$ 368 | R$ 5.000 | **R$ 5.368** |
| **Fase 3** (5K-20K MAUs) | R$ 1.128 | R$ 10.000 | **R$ 11.128** |

---

## 3. Benchmarks de Referencia Verificados

| Metrica | Benchmark Real | Fonte |
|---|---|---|
| Free → Paid conversion | 2-5% (mediana 3,7%) | First Page Sage 2025 |
| D7 retention (apps utilidade) | 6-15% | Pushwoosh/UXCam 2025 |
| D30 retention (apps utilidade) | 3-8% | Pushwoosh/UXCam 2025 |
| Roll20 receita anual | ~USD 4-16M (~R$ 21-83M) | Growjo/CompWorth |
| Foundry VTT licencas vendidas (est.) | ~240K+ (cumulativo) | Foundry Year in Review |
| Foundry crescimento YoY | 22% mais licencas em 2025 | Foundry Year in Review |
| D&D Beyond usuarios registrados | ~20,6 milhoes | EN World |
| Mercado global TTRPG (2026) | USD 2,4B (~R$ 12,5B) | Business Research Insights |
| VTT SaaS tools (conservador) | ~USD 60M (~R$ 312M) | WorldMetrics |
| CPI Brasil Android | R$ 1,15-2,30 | Mapendo/Business of Apps |
| ARPU apps Brasil | ~R$ 25/mes (telecom) | Statista |
| Indie SaaS que atinge R$ 5M ARR em 1 ano | 3,3% | ChartMogul 2025 |
| K-factor alvo inicial | 0,15-0,25 | Saxifrage/Geckoboard |
| TikTok engagement <5K followers | 4,20% media | Social Insider 2025 |

---

## 4. Os 3 Cenarios

### Premissas Compartilhadas

- **Lancamento:** Maio 2026
- **Preco Pro:** R$ 14,90/mes (ou R$ 119/ano)
- **Preco Pro DM:** R$ 29,90/mes (5% dos pagantes)
- **Mix pagantes:** 85% Pro + 15% Pro DM
- **ARPU blended:** R$ 17,15/mes (0,85 × 14,90 + 0,15 × 29,90)
- **Churn mensal:** 8% (conservador), 6% (base), 4% (otimista)
- **Taxa Stripe:** 2,49% + R$ 0,39/tx → ~3,5% efetivo medio
- **Margem liquida pos-Stripe:** 96,5%

---

### CENARIO 1 — CONSERVADOR ("Bootstrapped Quieto")

> Sem investimento de marketing. Crescimento 100% organico. Sem viral. Um DM solo fazendo tudo.

**Premissas:**
- Crescimento: +50 MAUs/mes (boca-a-boca + Reddit organico)
- Conversao free→paid: 2%
- D30 retention: 5%
- K-factor: 0,10 (fraco)
- Marketing: R$ 0

| Mes | MAUs | Pagantes | MRR | Custo/mes | Lucro/Prejuizo | MRR Acum. |
|---|---|---|---|---|---|---|
| M1 (Mai) | 50 | 1 | R$ 17 | R$ 234 | -R$ 217 | R$ 17 |
| M2 | 100 | 2 | R$ 34 | R$ 234 | -R$ 200 | R$ 51 |
| M3 | 150 | 3 | R$ 51 | R$ 234 | -R$ 183 | R$ 102 |
| M4 | 200 | 4 | R$ 69 | R$ 234 | -R$ 165 | R$ 171 |
| M5 | 280 | 6 | R$ 103 | R$ 234 | -R$ 131 | R$ 274 |
| M6 | 380 | 8 | R$ 137 | R$ 268 | -R$ 131 | R$ 411 |
| M7 | 500 | 10 | R$ 172 | R$ 368 | -R$ 196 | R$ 583 |
| M8 | 620 | 12 | R$ 206 | R$ 368 | -R$ 162 | R$ 789 |
| M9 | 750 | 15 | R$ 257 | R$ 368 | -R$ 111 | R$ 1.046 |
| M10 | 900 | 18 | R$ 309 | R$ 368 | -R$ 59 | R$ 1.355 |
| M11 | 1.050 | 21 | R$ 360 | R$ 468 | -R$ 108 | R$ 1.715 |
| M12 | 1.200 | 24 | R$ 412 | R$ 468 | **-R$ 56** | R$ 2.127 |

**Resultado Ano 1 — Conservador:**

| Metrica | Valor |
|---|---|
| MAUs no M12 | 1.200 |
| Pagantes no M12 | 24 |
| MRR no M12 | R$ 412/mes |
| ARR projetado | R$ 4.944/ano |
| Receita total ano 1 | **R$ 2.127** |
| Custo total ano 1 | **R$ 3.838** |
| Prejuizo ano 1 | **-R$ 1.711** |
| Investimento total | R$ 3.838 (infra only) |
| Breakeven mensal | **Mes 14-16** |
| Payback | **~18 meses** |

> **Analise:** Cenario viavel para validacao. O custo e tao baixo (R$ 320/mes medio) que e sustentavel como projeto paralelo. Nao gera renda significativa, mas prova o produto.

---

### CENARIO 2 — BASE ("Lancamento Focado")

> Investimento moderado em marketing. Micro-influencers. TikTok organico ativo. 1 video viral medio.

**Premissas:**
- Crescimento organico: +80 MAUs/mes
- Boost de influencers: +200 MAUs nos meses 3, 5, 7 (campanhas)
- 1 video semi-viral (M4): +500 MAUs de uma vez
- Conversao free→paid: 3,5%
- D30 retention: 10%
- K-factor: 0,20
- Marketing: R$ 3.000/mes a partir do M3

| Mes | MAUs | Pagantes | MRR | Custo/mes | Lucro/Prejuizo | MRR Acum. |
|---|---|---|---|---|---|---|
| M1 | 80 | 2 | R$ 34 | R$ 234 | -R$ 200 | R$ 34 |
| M2 | 180 | 4 | R$ 69 | R$ 234 | -R$ 165 | R$ 103 |
| M3 | 460 | 10 | R$ 172 | R$ 3.368 | -R$ 3.196 | R$ 275 |
| M4 | 1.100 | 25 | R$ 429 | R$ 3.368 | -R$ 2.939 | R$ 704 |
| M5 | 1.500 | 38 | R$ 652 | R$ 3.568 | -R$ 2.916 | R$ 1.356 |
| M6 | 1.900 | 52 | R$ 892 | R$ 3.568 | -R$ 2.676 | R$ 2.248 |
| M7 | 2.600 | 72 | R$ 1.235 | R$ 8.368 | -R$ 7.133 | R$ 3.483 |
| M8 | 3.200 | 95 | R$ 1.629 | R$ 5.368 | -R$ 3.739 | R$ 5.112 |
| M9 | 3.900 | 120 | R$ 2.058 | R$ 5.368 | -R$ 3.310 | R$ 7.170 |
| M10 | 4.700 | 148 | R$ 2.538 | R$ 5.368 | -R$ 2.830 | R$ 9.708 |
| M11 | 5.500 | 178 | R$ 3.052 | R$ 5.568 | -R$ 2.516 | R$ 12.760 |
| M12 | 6.500 | 210 | R$ 3.602 | R$ 8.128 | **-R$ 4.526** | R$ 16.362 |

**Resultado Ano 1 — Base:**

| Metrica | Valor |
|---|---|
| MAUs no M12 | 6.500 |
| Pagantes no M12 | 210 |
| MRR no M12 | R$ 3.602/mes |
| ARR projetado (M12 × 12) | R$ 43.224/ano |
| Receita total ano 1 | **R$ 16.362** |
| Custo total ano 1 | **R$ 52.510** |
| Investimento marketing | R$ 39.000 |
| Investimento infra | R$ 13.510 |
| Prejuizo ano 1 | **-R$ 36.148** |
| CAC (custo por pagante) | R$ 250 |
| LTV (ARPU × vida media 12 meses) | R$ 206 |
| LTV:CAC | **0,82** (negativo — precisa otimizar) |
| Breakeven mensal | **Mes 18-20** |
| Payback investimento total | **~24 meses** |

> **Analise:** Este cenario exige R$ 52K de investimento no ano 1, mas chega a R$ 3.600/mes de MRR ate o M12. O LTV:CAC esta abaixo de 1 no inicio — isso e normal para SaaS no primeiro ano. A partir do M12, se o churn cai para 5% e a conversao sobe para 4% (produto maduro), o LTV:CAC cruza 3:1 e o negocio se sustenta.

> **Ponto critico:** Se o K-factor subir de 0,20 para 0,40 (provavel com player view viral), o CAC efetivo cai pela metade e tudo muda.

---

### CENARIO 3 — OTIMISTA ("Viral + Parceria")

> Um video viral no TikTok + parceria com influencer tier 2 (Mestre Pedro ou Rakin). Tudo funciona.

**Premissas:**
- Crescimento organico: +100 MAUs/mes
- 1 video viral real (M3): +3.000 MAUs
- Parceria com influencer mid-tier (M5): +2.000 MAUs
- Parceria com Jambo (template OP RPG, M8): +5.000 MAUs
- Conversao free→paid: 4,5%
- D30 retention: 15%
- K-factor: 0,40 (forte — player view gera DMs novos)
- Marketing: R$ 8.000/mes a partir do M3

| Mes | MAUs | Pagantes | MRR | Custo/mes | Lucro/Prejuizo | MRR Acum. |
|---|---|---|---|---|---|---|
| M1 | 100 | 3 | R$ 51 | R$ 234 | -R$ 183 | R$ 51 |
| M2 | 250 | 8 | R$ 137 | R$ 234 | -R$ 97 | R$ 188 |
| M3 | 3.500 | 95 | R$ 1.629 | R$ 8.368 | -R$ 6.739 | R$ 1.817 |
| M4 | 4.200 | 140 | R$ 2.401 | R$ 8.368 | -R$ 5.967 | R$ 4.218 |
| M5 | 6.800 | 250 | R$ 4.288 | R$ 13.128 | -R$ 8.840 | R$ 8.506 |
| M6 | 8.500 | 340 | R$ 5.831 | R$ 13.128 | -R$ 7.297 | R$ 14.337 |
| M7 | 10.500 | 430 | R$ 7.375 | R$ 13.128 | -R$ 5.753 | R$ 21.712 |
| M8 | 16.000 | 620 | R$ 10.633 | R$ 19.128 | -R$ 8.495 | R$ 32.345 |
| M9 | 18.500 | 750 | R$ 12.863 | R$ 14.128 | -R$ 1.265 | R$ 45.208 |
| M10 | 21.000 | 880 | R$ 15.092 | R$ 14.128 | **+R$ 964** | R$ 60.300 |
| M11 | 24.000 | 1.020 | R$ 17.493 | R$ 14.128 | **+R$ 3.365** | R$ 77.793 |
| M12 | 28.000 | 1.180 | R$ 20.237 | R$ 14.128 | **+R$ 6.109** | R$ 98.030 |

**Resultado Ano 1 — Otimista:**

| Metrica | Valor |
|---|---|
| MAUs no M12 | 28.000 |
| Pagantes no M12 | 1.180 |
| MRR no M12 | R$ 20.237/mes |
| ARR projetado (M12 × 12) | R$ 242.844/ano |
| Receita total ano 1 | **R$ 98.030** |
| Custo total ano 1 | **R$ 132.148** |
| Investimento marketing | R$ 96.000 |
| Investimento infra | R$ 36.148 |
| Prejuizo ano 1 | **-R$ 34.118** |
| CAC medio | R$ 112 |
| LTV (15 meses × R$ 17,15) | R$ 257 |
| LTV:CAC | **2,3** (positivo e melhorando) |
| Breakeven mensal | **Mes 10** |
| Payback investimento total | **~16 meses** |

> **Analise:** Com R$ 132K de investimento total (a maioria em marketing), este cenario atinge lucratividade mensal no M10 e gera R$ 20K/mes de MRR ao final do ano. O payback ocorre no M16 (ano 2). A partir do M12, o negocio e autossustentavel.

---

## 5. Comparativo dos 3 Cenarios

| Metrica | Conservador | Base | Otimista |
|---|---|---|---|
| **Investimento total Ano 1** | R$ 3.838 | R$ 52.510 | R$ 132.148 |
| **MAUs no M12** | 1.200 | 6.500 | 28.000 |
| **Pagantes no M12** | 24 | 210 | 1.180 |
| **MRR no M12** | R$ 412 | R$ 3.602 | R$ 20.237 |
| **ARR projetado** | R$ 4.944 | R$ 43.224 | R$ 242.844 |
| **Receita total Ano 1** | R$ 2.127 | R$ 16.362 | R$ 98.030 |
| **Prejuizo Ano 1** | -R$ 1.711 | -R$ 36.148 | -R$ 34.118 |
| **Breakeven mensal** | M14-16 | M18-20 | **M10** |
| **Payback** | ~18 meses | ~24 meses | **~16 meses** |
| **LTV:CAC** | N/A (organico) | 0,82 → 3:1 (M18) | 2,3 → 4:1 (M18) |
| **Risco principal** | Nao cresce | CAC alto | Viral nao acontece |

---

## 6. Analise de Margem por Plano

### Margem por usuario pagante

| Item | % da receita |
|---|---|
| Receita bruta (R$ 14,90 ou R$ 29,90) | 100% |
| - Stripe/Pix fees (3,5% efetivo) | -3,5% |
| - Supabase rateado (~R$ 0,10/MAU) | -0,7% |
| - Vercel rateado (~R$ 0,03/MAU) | -0,2% |
| **= Margem bruta** | **~95,6%** |
| - Marketing rateado (varia por cenario) | -30% a -60% |
| **= Margem liquida** | **35% a 65%** |

> **Por que a margem bruta e tao alta?** Porque o Pocket DM e um SaaS web puro — nao tem servidores de jogo, nao tem CDN de video, nao tem LLM API calls. O custo marginal por usuario e quase zero ate ~50K MAUs. Esse e o moat economico de um combat tracker vs. um VTT completo (que precisa de hosting pesado para mapas e dynamic lighting).

### Breakdown: para onde vai cada R$ 1 de receita

```
Para cada R$ 1,00 de receita Pro:

Cenario Base (M12):
├── R$ 0,035  Stripe/Pix
├── R$ 0,010  Supabase
├── R$ 0,005  Vercel
├── R$ 0,350  Marketing (CAC rateado)
├── R$ 0,100  Overhead (dominio, emails, ferramentas)
└── R$ 0,500  → Lucro operacional (50%)

Cenario Otimista (M12):
├── R$ 0,035  Stripe/Pix
├── R$ 0,010  Supabase
├── R$ 0,005  Vercel
├── R$ 0,200  Marketing (CAC rateado — viral reduz)
├── R$ 0,080  Overhead
└── R$ 0,670  → Lucro operacional (67%)
```

---

## 7. Investimento Necessario e ROI

### Opcao A — Bootstrapped (R$ 0 investimento externo)

| Metrica | Valor |
|---|---|
| Investimento pessoal | R$ 3.838 (custo de infra Ano 1) |
| Horas de trabalho | ~500h (marketing + suporte + dev) |
| Custo de oportunidade | ~R$ 50.000 (se vc ganha R$ 100/h) |
| Investimento real total | **R$ 53.838** |
| Retorno Ano 1 | R$ 2.127 (Conservador) a R$ 16.362 (Base) |
| ROI financeiro Ano 1 | **-96% a -70%** |
| ROI com equity value | Depende de valuation |

> **Realidade:** Bootstrapping nao gera ROI financeiro no Ano 1. O valor esta em equity (se o produto ganha tracao) e aprendizado.

### Opcao B — Investimento Proprio Moderado (R$ 50K)

| Metrica | Valor |
|---|---|
| Investimento total | R$ 50.000 |
| Alocacao: Infra | R$ 13.510 (27%) |
| Alocacao: Marketing | R$ 36.490 (73%) |
| Cenario esperado | Base |
| MRR no M12 | R$ 3.602 |
| Receita total Ano 1 | R$ 16.362 |
| Prejuizo Ano 1 | -R$ 33.638 |
| **ROI Ano 1** | **-67%** |
| Valor se vender no M12 (5x ARR) | R$ 216.120 |
| **ROI com exit** | **+332%** |
| **Payback** | **~24 meses** |

### Opcao C — Investimento Agressivo (R$ 130K)

| Metrica | Valor |
|---|---|
| Investimento total | R$ 130.000 |
| Alocacao: Infra | R$ 36.148 (28%) |
| Alocacao: Marketing | R$ 93.852 (72%) |
| Cenario esperado | Otimista |
| MRR no M12 | R$ 20.237 |
| Receita total Ano 1 | R$ 98.030 |
| Prejuizo Ano 1 | -R$ 31.970 |
| **ROI Ano 1** | **-25%** |
| Valor se vender no M12 (5x ARR) | R$ 1.214.220 |
| **ROI com exit** | **+834%** |
| **Payback** | **~16 meses** |

---

## 8. Analise de Sensibilidade — O Que Muda Tudo

### Alavancas de maior impacto (cenario Base)

| Se isso mudar... | ...o resultado muda assim: |
|---|---|
| Conversao sobe de 3,5% → 5% | MRR M12: R$ 3.602 → R$ 5.145 (+43%) |
| K-factor sobe de 0,20 → 0,40 | CAC cai 50%, payback cai para 16 meses |
| Churn cai de 6% → 4% | LTV sobe 50%, LTV:CAC cruza 3:1 no M12 |
| 1 video viral (3K MAUs de uma vez) | Antecipa breakeven em 3-4 meses |
| Parceria com Jambo/OP RPG | +5K-10K MAUs, zero CAC |
| Preco sobe de R$ 14,90 → R$ 19,90 | MRR +34%, mas conversao pode cair 15% |
| Preco cai de R$ 14,90 → R$ 9,90 | Conversao pode subir 20%, mas MRR cai 33% |

### O cenario "tudo da errado"

| Se... | Impacto |
|---|---|
| Conversao fica em 1% | MRR M12 = R$ 1.029. Nao sustenta. |
| D30 retention = 3% | Base de MAUs nao cresce — estagna em ~2K |
| Nenhum viral | Crescimento 100% linear — cenario Conservador |
| D&D Beyond lanca tracker PT-BR | Competidor com 20M usuarios. Diferenciacao urgente. |
| Supabase aumenta precos 3x | Infra sobe para R$ 400/mes. Ainda viavel. |

### O cenario "sorte grande"

| Se... | Impacto |
|---|---|
| Cellbit menciona o app organicamente | +50K-200K MAUs em 1 semana. Tudo muda. |
| Template oficial OP RPG (parceria Jambo) | +10K DMs em 1 mes. Lock-in real. |
| Video TikTok atinge 1M views | +5K-15K signups. CPI = R$ 0,00. |
| Conversao atinge 6% | MRR M12 > R$ 30K. Lucrativo no M8. |

---

## 9. Unit Economics Detalhada

### Quanto vale 1 DM pagante?

```
1 DM pagante (Pro R$ 14,90/mes)
├── Paga: R$ 14,90/mes
├── Vida media: 12 meses (churn 8%) a 25 meses (churn 4%)
├── LTV: R$ 179 (pessimista) a R$ 373 (otimista)
├── Margem bruta: 95,6%
├── LTV liquido: R$ 171 a R$ 357
│
├── Traz consigo: 4 jogadores gratuitos
│   ├── 1 desses jogadores vira DM em outra mesa (K-factor)
│   │   └── Esse novo DM traz mais 4 jogadores → loop
│   └── Jogadores compartilham no TikTok (probabilidade: 5-10%)
│       └── 1 post = 500-5K views = 5-50 signups = 0,2-2 novos pagantes
│
└── Valor indireto total: R$ 40-120 (via referrals + viral)

VALOR TOTAL DE 1 DM PAGANTE:
  Pessimista: R$ 179 + R$ 40 = R$ 219
  Base:       R$ 257 + R$ 80 = R$ 337
  Otimista:   R$ 373 + R$ 120 = R$ 493
```

### Quanto custa adquirir 1 DM pagante?

| Canal | CPI (install) | Install→Signup | Signup→Paid | CAC por pagante |
|---|---|---|---|---|
| TikTok organico | R$ 0 | 25% | 3,5% | **R$ 0** (tempo) |
| Micro-influencer | R$ 2,00 | 40% | 4% | **R$ 125** |
| Meta Ads | R$ 2,00 | 20% | 3% | **R$ 333** |
| Reddit organico | R$ 0 | 30% | 5% | **R$ 0** (tempo) |
| YouTube sponsor | R$ 5,00 | 35% | 3,5% | **R$ 408** |
| Boca-a-boca | R$ 0 | 50% | 4% | **R$ 0** |

> **Conclusao:** Os canais organicos (TikTok, Reddit, boca-a-boca) sao dramaticamente mais eficientes. Marketing pago so faz sentido APOS validar o produto e otimizar a conversao. R$ 1 em micro-influencer gera ~3x mais que R$ 1 em Meta Ads.

---

## 10. Projecao Ano 2 (Apenas Cenario Base)

Se o Ano 1 seguir o cenario Base e as melhorias de produto aumentarem conversao e retencao:

| Trimestre | MAUs | Pagantes | MRR | Lucro mensal |
|---|---|---|---|---|
| Q1 Y2 (M13-15) | 8.000-10.000 | 300-400 | R$ 5.145-6.860 | R$ 0 a +R$ 2.000 |
| Q2 Y2 (M16-18) | 12.000-15.000 | 500-650 | R$ 8.575-11.148 | +R$ 3.000-5.000 |
| Q3 Y2 (M19-21) | 16.000-20.000 | 700-900 | R$ 12.005-15.435 | +R$ 6.000-9.000 |
| Q4 Y2 (M22-24) | 22.000-28.000 | 950-1.200 | R$ 16.293-20.580 | +R$ 8.000-12.000 |

**Ano 2 projetado:**
- Receita: R$ 120.000 - R$ 180.000
- Custo: R$ 90.000 - R$ 120.000
- **Lucro Ano 2: R$ 30.000 - R$ 60.000**
- **Payback total: atingido entre M18-M24**

---

## 11. Decisao: Qual Cenario Perseguir?

### Recomendacao

**Comecar pelo Conservador (Fase 0-1), acelerar para o Base (Fase 2) quando validar conversao.**

```
Mes 1-3: Investir R$ 700 total (infra)
├── Validar: "DMs reais usam mais de 1 vez?"
├── Validar: "Players adoram o player view?"
└── Medir: D7 retention, conversao, share rate

Se D7 retention > 15% E conversao > 2%:
├── Mes 4-6: Investir R$ 3.000/mes em micro-influencers
├── Mes 7-9: Investir R$ 5.000/mes em mix de canais
└── Mes 10-12: Investir R$ 8.000/mes se MRR > R$ 2.000

Se D7 retention < 10% OU conversao < 1%:
├── PARAR marketing
├── Voltar para produto
└── Resolver dores antes de gastar dinheiro
```

> **Perspectiva de John:** Nunca invista em marketing um produto que as pessoas nao retornam. Se a retencao esta ruim, o problema e o produto, nao a divulgacao. Gaste R$ 700 nos primeiros 3 meses, valide, e so depois gaste R$ 36K+.

> **Perspectiva de Sally:** O momento que define tudo e quando um jogador abre o link no celular pela primeira vez e diz "uau". Se esse momento nao existe, nenhum investimento de marketing salva. Foque em polir essa experiencia antes de qualquer outra coisa.

---

## 12. Riscos Legais e Compliance

> **Nota de John e Sally sobre riscos legais:**

| Risco | Mitigacao |
|---|---|
| **SRD/OGL compliance** | Usar apenas conteudo SRD 5.1 (licenca aberta). NAO usar conteudo fechado do Player's Handbook. |
| **Ordem Paranormal IP** | Templates de OP RPG so com autorizacao escrita da Jambo. Nao usar nome/arte sem permissao. |
| **LGPD (dados BR)** | Politica de privacidade clara. Dados no Supabase (AWS Sao Paulo preferivel). Consentimento de cookies. |
| **Stripe/Pix compliance** | Stripe e PCI compliant. Nao armazenar dados de cartao localmente. |
| **Menores de idade** | RPG tem publico 16+. Termos de uso devem exigir 16+ ou consentimento dos pais. |
| **Direitos de imagem (influencers)** | Contrato por escrito para qualquer uso de imagem/nome em marketing. |

---

## Fontes dos Benchmarks

- [First Page Sage - SaaS Freemium Conversion Rates](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
- [Pushwoosh - App Retention Benchmarks 2025](https://www.pushwoosh.com/blog/increase-user-retention-rate/)
- [UXCam - Mobile App Retention Benchmarks 2025](https://uxcam.com/blog/mobile-app-retention-benchmarks/)
- [Growjo - Roll20 Revenue Estimate](https://growjo.com/company/Roll20)
- [Foundry VTT - Year in Review 2025](https://foundryvtt.com/article/year-in-review-2025/)
- [EN World - Hasbro Reports / D&D Beyond Users](https://www.enworld.org/threads/some-takeaways-from-hasbros-latest-reports.707558/)
- [Business Research Insights - TTRPG Market](https://www.businessresearchinsights.com/market-reports/tabletop-role-playing-game-ttrpg-market-110856)
- [WorldMetrics - TTRPG Statistics](https://worldmetrics.org/ttrpg-industry-statistics/)
- [ChartMogul - SaaS Growth Report 2025](https://chartmogul.com/reports/saas-growth-the-odds-of-making-it/)
- [SaaS Capital - Bootstrapped Benchmarks](https://www.saas-capital.com/blog-posts/benchmarking-metrics-for-bootstrapped-saas-companies/)
- [Mapendo - CPI by Country 2025](https://mapendo.co/blog/cost-per-install-by-country-2025)
- [Social Insider - TikTok Benchmarks 2025](https://www.socialinsider.io/social-media-benchmarks/tiktok)
- [Saxifrage - K-Factor Benchmarks](https://www.saxifrage.xyz/post/k-factor-benchmarks)
- [Statista - Brazil Mobile ARPU](https://www.statista.com/statistics/524038/wireless-services-arpu-in-brazil/)

---

**Compilado em:** 2026-03-27
**Versao:** 1.0
**Proxima revisao:** Apos 3 meses de dados reais (Ago 2026)
