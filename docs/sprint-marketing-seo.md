# Sprint Marketing/SEO + GEO — Pocket DM

> Data: 2026-04-03
> Objetivo: Indexação completa no Google + ranking para keywords PT-BR de RPG/D&D + visibilidade em IAs (ChatGPT, Claude, Gemini)

---

## Contexto de Mercado

- **TTRPG global**: USD 2.3 bi (2026), CAGR 11.88% -> USD 6.3 bi (2035)
- **D&D**: ~50 milhoes de jogadores, 60% jogam hibrido (presencial + online)
- **Brasil**: Top 10 mercados de games (US$ 2.8 bi), 82.8% dos brasileiros jogam games digitais
- **VTT adoption**: 44-48% dos jogadores de TTRPG usam plataformas digitais
- **Gap**: NENHUM combat tracker relevante em PT-BR no Google

## Competidores Mapeados

| Plataforma | Foco | Keywords Dominadas |
|---|---|---|
| D&D Beyond | Ecossistema completo | character sheet, encounter builder |
| Roll20 | VTT online | virtual tabletop, online dnd |
| Foundry VTT | VTT self-hosted | best vtt, roll20 alternative |
| Improved Initiative | Combat tracker free | initiative tracker, combat tracker free |
| Shieldmaiden | DM companion | dnd dm companion, combat tracker 5e |
| Kastark | Initiative tracker | encounter tracker, initiative tracker 5e |

## Keywords Target

### Tier 1 - PT-BR (baixa competicao, alta prioridade)

- rastreador de combate D&D
- gerenciador de combate RPG
- iniciativa D&D online
- ferramentas para mestre de RPG
- app para mestre de RPG
- monstros D&D 5e lista
- compendio de monstros D&D
- magias D&D 5e
- musica para RPG de mesa
- como organizar combate D&D

### Tier 2 - EN (competicao media, volume alto)

- dnd combat tracker
- dnd 5e initiative tracker
- encounter tracker dnd
- dnd combat tracker online free
- best dm tools 5e

### Tier 3 - Long-tail com intencao forte

- combat tracker for in-person dnd
- dnd combat tracker with music
- simple dnd combat tracker
- free dnd encounter tracker no login
- rastreador de combate RPG presencial

---

## Wave 1 - SEO Tecnico (IMPLEMENTADO 2026-04-03)

| Item | Status | Arquivo |
|---|---|---|
| robots.ts | DONE | app/robots.ts |
| Meta tags layout (keywords, hreflang) | DONE | app/layout.tsx |
| Meta tags landing page | DONE | app/page.tsx |
| Organization schema (JSON-LD) | DONE | app/page.tsx |
| WebApplication schema (JSON-LD) | DONE | app/page.tsx |
| FAQSchema (5 perguntas) | DONE | app/page.tsx |
| Meta tags /monsters (PT-BR + keywords) | DONE | app/monsters/page.tsx |
| Meta tags /spells (PT-BR + keywords) | DONE | app/spells/page.tsx |
| Meta tags /pricing | DONE | app/pricing/layout.tsx |
| Sitemap expandido (+/try, +/legal/*) | DONE | app/sitemap.ts |

## Wave 1.5 — GEO / IA Search (IMPLEMENTADO 2026-04-03)

> GEO = Generative Engine Optimization — ranking em IAs (ChatGPT, Claude, Gemini, Perplexity)

### Contexto GEO

- 37% dos consumidores iniciam buscas direto na IA (jan 2026)
- ChatGPT responde por 20% do trafego de busca global
- 90% das citacoes do ChatGPT vem de paginas na posicao 21+ do Google
- 44.2% das citacoes vem dos primeiros 30% do conteudo (answer-first)
- Sites com FCP < 0.4s recebem 3x mais citacoes
- ChatGPT usa Bing pra retrieval em tempo real
- IAs citam tipicamente 2-7 dominios por resposta

### Implementado

| Item | Status | Arquivo |
|---|---|---|
| Pagina /about com entity clarity completa | DONE | app/about/page.tsx |
| Organization schema com knowsAbout | DONE | app/about/page.tsx |
| SoftwareApplication schema detalhado (12 features) | DONE | app/about/page.tsx |
| AboutPage schema (mainEntity) | DONE | app/about/page.tsx |
| Pagina /faq com 18 perguntas answer-first | DONE | app/faq/page.tsx |
| FAQPage schema com 18 Q&As | DONE | app/faq/page.tsx |
| Links About + FAQ no Footer | DONE | components/marketing/Footer.tsx |
| Bing Webmaster verification (via env var) | DONE | app/layout.tsx |
| Google Search verification (via env var) | DONE | app/layout.tsx |
| Sitemap + /about + /faq (priority 0.8) | DONE | app/sitemap.ts |
| i18n keys About/FAQ (PT-BR + EN) | DONE | messages/*.json |

### Por que /about e /faq sao criticos pra IA

- **Entity clarity**: IAs precisam saber exatamente O QUE somos, PARA QUEM e POR QUE existimos
- **Answer-first**: cada secao comeca com a resposta, depois expande (formato que IAs extraem)
- **SoftwareApplication schema**: Google e IAs entendem que somos um app, categoria, preco (gratis), features
- **FAQ format**: exatamente o formato de pergunta-resposta que IAs usam pra gerar citacoes
- **knowsAbout**: sinal semantico de expertise em D&D 5e, TTRPG, combat management

## Wave 2 - Conteudo (FUTURO)

| Item | Impacto SEO | Impacto GEO | Esforco |
|---|---|---|---|
| Blog com 3-5 artigos educacionais PT-BR | Alto | Alto | Medio |
| Guia "Como usar combat tracker na mesa" | Alto | Alto | Baixo |
| Compendio de monstros com SEO por CR/tipo | Medio | Medio | Medio |
| Pagina "Ferramentas para Mestre" (hub) | Alto | Alto | Medio |
| Video YouTube "Como usar Pocket DM" | Medio | MUITO ALTO | Alto |

## Wave 3 - Autoridade + IA (FUTURO)

| Item | Impacto SEO | Impacto GEO | Esforco |
|---|---|---|---|
| YouTube tutorial (sinal #1 pra IAs) | Medio | MUITO ALTO | Alto |
| Posts em Reddit/fóruns RPG BR | Alto | Alto | Medio |
| Reviews em blogs RPG (Arcane Eye, etc) | Alto | Alto | Alto |
| Listagem em diretórios de ferramentas | Medio | Alto | Baixo |
| Presenca em RPGCon / eventos | Alto | Medio | Alto |
| Submissao para listas "Best DM Tools 2026" | Alto | MUITO ALTO | Medio |

---

## Metricas para Acompanhar

### Google Search Console
- Impressoes por keyword
- CTR por pagina
- Posicao media por keyword target
- Paginas indexadas
- Erros de rastreamento

### Bing Webmaster Tools
- Indexacao no Bing (critico pra ChatGPT)
- Impressoes e clicks

### GEO / IA (manual por enquanto)
- Testar perguntas no ChatGPT, Claude, Gemini: "best D&D combat tracker", "rastreador de combate D&D"
- Monitorar se Pocket DM aparece nas respostas
- Ferramentas futuras: llmrefs.com, aiclicks.io, trysight.ai

## Proximos Passos

1. Deploy das mudancas Wave 1 + 1.5
2. Configurar NEXT_PUBLIC_BING_SITE_VERIFICATION no Vercel (obter codigo em bing.com/webmasters)
3. Configurar NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION no Vercel (se ainda nao feito)
4. Verificar indexacao no Google Search Console (2-7 dias)
5. Verificar indexacao no Bing Webmaster Tools (2-7 dias)
6. Testar perguntas nas IAs (ChatGPT, Claude, Gemini) e documentar resultados
7. Monitorar impressoes e posicoes iniciais
8. Planejar Wave 2 (conteudo) baseado nos dados reais

---

> Ultima atualizacao: 2026-04-03 (Wave 1 + Wave 1.5 GEO implementados)
