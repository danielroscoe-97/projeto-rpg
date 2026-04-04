# Estrategia de Protecao de Marca & Crescimento Internacional — Pocket DM

> **Data:** 2026-04-04
> **Status:** Planejamento Ativo
> **Prioridade:** Alta — acoes imediatas identificadas

---

## 1. REGISTRO DE MARCA — INPI (URGENTE)

### Por que agora?

"Dungeon Master" e "DM" sao trademarks da Wizards of the Coast em determinados contextos. Enquanto o Pocket DM for pequeno, ninguem liga. Mas o momento de registrar e ANTES de ter atencao — depois pode ser tarde.

### Acao: Registrar "Pocket DM" no INPI

| Item | Detalhe |
|------|---------|
| **Orgao** | INPI — Instituto Nacional da Propriedade Industrial |
| **Site** | https://www.gov.br/inpi |
| **Classe Nice** | Classe 9 (software, apps) + Classe 42 (SaaS, servicos de tecnologia) |
| **Custo estimado** | ~R$ 355 por classe (taxa basica pessoa fisica/MEI) |
| **Prazo medio** | 12-18 meses para concessao (mas protecao conta da data do deposito) |
| **O que registrar** | "POCKET DM" (mista — nome + logo crown d20) |

### Checklist de Registro

- [ ] Fazer busca previa no INPI (https://busca.inpi.gov.br/pePI/) para "Pocket DM" nas classes 9 e 42
- [ ] Verificar se WotC registrou "Dungeon Master" ou "DM" no Brasil (provavelmente sim para jogos, classe 28)
- [ ] Preparar logo em alta resolucao (crown d20) para registro de marca mista
- [ ] Criar conta no e-INPI (sistema eletronico)
- [ ] Depositar pedido nas classes 9 e 42
- [ ] Guardar comprovante de deposito — protecao retroage a essa data
- [ ] Acompanhar publicacao na RPI (Revista da Propriedade Industrial)

### Sobre o Risco "DM"

**Analise:**
- "DM" como abreviacao de "Dungeon Master" e trademark da WotC
- Porem, "DM" tambem significa "Direct Message" (uso generico massivo)
- "Pocket DM" como marca composta tem boa chance de ser considerada distinta
- No Brasil, a WotC registrou "Dungeons & Dragons" e "Dungeon Master" na classe 28 (jogos de tabuleiro), NAO necessariamente na classe 9/42
- Registro brasileiro protege no territorio nacional independente de trademarks americanas

**Recomendacao:** Registrar agora. Se a WotC contestar, o custo de defesa e baixo no INPI e a argumentacao e solida (classe diferente, marca composta, "DM" como termo generico no contexto tech).

### Plano B de Marca

Ter um nome alternativo pronto caso "Pocket DM" se torne insustentavel:

| Candidato | Pros | Contras |
|-----------|------|---------|
| **Pocket Table** | Sem conflito de trademark, "table" remete a mesa | Menos memoravel |
| **TableForge** | Forte, evoca criacao | Pode existir |
| **RollKeeper** | Claro, RPG-related | Generico |
| **Pocket Session** | Mantem "Pocket", sem "DM" | Menos identidade RPG |

**Acao:** NAO trocar agora. Apenas ter documentado. Se receber C&D, a transicao de marca ja esta planejada.

---

## 2. COMPLIANCE DE CONTEUDO — BLINDAGEM JURIDICA

### Status Atual (Abril 2026) ✅

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| Conteudo SRD 5.1 | ✅ Compliant | CC-BY-4.0, licenca irrevogavel |
| Filtro whitelist | ✅ Ativo | `srd-monster-whitelist.json` + `srd-spell-whitelist.json` |
| Monster-a-Day | ✅ Compliant | CC, parceria r/monsteraday |
| Atribuicao CC-BY-4.0 | ⚠️ Verificar | Precisa de link visivel no footer |
| Conteudo nao-SRD | ✅ Bloqueado | Filtros impedem exposicao publica |

### Acoes de Blindagem

- [ ] Adicionar notice de atribuicao CC-BY-4.0 no footer do site (visivel em todas as paginas publicas)
- [ ] Criar pagina `/legal/content-license` explicando fontes de conteudo e licencas
- [ ] Documentar em texto claro: "Este site usa exclusivamente conteudo do SRD 5.1 sob CC-BY-4.0"
- [ ] Revisar metadata da App Store/PWA — NAO usar "D&D" ou "Dungeons & Dragons" sem qualificador "compatible with" ou "for use with"
- [ ] Manter log de auditoria: quando whitelists foram atualizados e por quem

### Linguagem Segura para Marketing

| ❌ Evitar | ✅ Usar |
|-----------|--------|
| "D&D combat tracker" | "Combat tracker for 5e tabletop RPGs" |
| "Dungeon Master tool" | "Game Master companion for in-person play" |
| "Official D&D monsters" | "SRD 5e monsters (CC-BY-4.0)" |
| "D&D Beyond alternative" | "Tabletop RPG companion for in-person sessions" |

---

## 3. MARCOS DE CRESCIMENTO — GATILHOS DE ATENCAO

### Fase 1: Prova de Conceito (Abr-Out 2026)

**Meta:** Validar product-market fit no Brasil

| Metrica | Target | Por que importa |
|---------|--------|-----------------|
| Sessoes de combate jogadas | 1.000 | Prova que o produto e usado de verdade |
| DMs ativos semanais | 50 | Mostra recorrencia, nao curiosidade |
| NPS | > 60 | Satisfacao real |
| Retenção D7 | > 25% | Pessoas voltam |

**Acoes:**
- [ ] Demo nos bares de RPG em BH (Taverna de Ferro, Pixel Bar — meta: maio 2026)
- [ ] Programa de beta testers com 10-20 DMs influentes BR
- [ ] Implementar telemetria anonima de sessoes (eventos de combate, duracao, features usadas)
- [ ] Coletar depoimentos e screenshots de mesas reais

**Risco nessa fase:** Nenhum risco de atencao negativa. Empresa gringa nem sabe que voce existe.

---

### Fase 2: Prova de Crescimento (Out 2026 - Abr 2027)

**Meta:** Mostrar que cresce organicamente

| Metrica | Target | Por que importa |
|---------|--------|-----------------|
| MAU | 5.000 | Tamanho minimo pra ser "real" |
| Retencao D30 | > 30% | Investidor olha isso primeiro |
| Paginas indexadas ranqueando | 500+ | SEO como canal de aquisicao |
| Primeiro MRR | > R$ 1.000 | Pessoas pagam |

**Acoes:**
- [ ] Lancar versao em ingles (i18n ja existe, falta polish)
- [ ] Product Hunt launch (preparar assets, comunidade, timing)
- [ ] Primeiro modelo de monetizacao ativo (Pro tier R$ 14,90/mes)
- [ ] Presenca em 2-3 comunidades gringas (r/DMAcademy, r/dndnext, RPG Discord servers)
- [ ] Buscar 3-5 backlinks de blogs/canais de RPG

**Gatilho de atencao positiva:** Thread viral no Reddit (500+ upvotes) ou mencao em canal de RPG com 100k+ subs.

**Gatilho de atencao negativa:** Improvavel nessa fase. Manter compliance SRD.

---

### Fase 3: Prova de Negocio (Abr-Out 2027)

**Meta:** Metricas de negocio real

| Metrica | Target | Por que importa |
|---------|--------|-----------------|
| MAU | 50.000 | Radar de WotC/investidores |
| MRR | R$ 50.000 ($10k USD) | Negocio sustentavel |
| Retencao D30 | > 40% | Best-in-class para ferramentas RPG |
| Usuarios EN | > 30% do total | Tracao internacional |

**Acoes:**
- [ ] Seed round OU bootstrap rentavel (decisao estrategica)
- [ ] Presenca em convencao (CCXP Gaming, BGS, ou Gen Con como visitante)
- [ ] Parcerias com criadores de conteudo BR (Cellbit, Nao Salvo RPG, etc.)
- [ ] API publica para integracao de terceiros
- [ ] Contratar 1-2 pessoas (dev + community)

**Gatilho de atencao positiva:** Investidores buscam voce. Artigos em TechCrunch BR / Startups.com.br. Convites pra programas de aceleracao.

**Gatilho de atencao negativa:** Se "Pocket DM" aparecer acima de D&D Beyond em qualquer busca relevante, o juridico da WotC vai notar. Marca INPI ja deve estar concedida nesse ponto.

---

### Fase 4: Decisao Forcada (Out 2027+)

**Meta:** Posicao de forca

| Metrica | Target | Por que importa |
|---------|--------|-----------------|
| MAU | 100.000+ | Impossivel ignorar |
| MRR | $50k+ USD | Negocio serio |
| Marca registrada | ✅ Concedida | Protecao legal ativa |

**Cenarios possiveis nessa fase:**

1. **Proposta de aquisicao** — Ter metricas documentadas, cap table limpo, PI registrada
2. **Proposta de investimento** — Pitch deck pronto, cohort analysis, unit economics
3. **Cease & desist** — Marca registrada + compliance SRD + advogado de PI identificado
4. **Concorrencia direta** — WotC lanca "D&D Companion" presencial. Vencer por UX e comunidade

---

## 4. CENARIOS DETALHADOS

### Cenario A: Aquisicao / Acqui-hire

**Quem compraria:**
- WotC/Hasbro — consolidar ferramentas presenciais
- Fandom/D&D Beyond — expandir pra LATAM e mesa presencial
- StartupX de RPG — consolidar mercado
- Big tech (improvavel, mas possivel se RPG continuar crescendo)

**O que torna o Pocket DM atraente pra compra:**
1. Base de usuarios ativa em nicho sem dono (presencial)
2. Dataset de comportamento de mesa (como DMs brasileiros jogam)
3. Time tecnico que executa rapido (acqui-hire value)
4. Marca reconhecida no mercado BR
5. Stack moderna e escalavel

**Como se preparar:**
- [ ] Manter cap table simples e limpo (sem SAFEs confusos, equity clara)
- [ ] Documentar metricas desde o dia 1 (cohort, LTV, CAC, churn)
- [ ] PI registrada (marca INPI, dominio, codigo proprietario)
- [ ] Ter advogado de M&A identificado (nao contratar, so saber quem chamar)
- [ ] Codigo limpo e documentado (due diligence tecnica vai acontecer)

**Valuation referencia (muito rough):**
- Acqui-hire: $500k-2M (pelo time)
- Com tracao (50k MAU): $2-5M
- Com receita ($50k MRR): $5-15M (3-5x ARR)
- Se for estrategico (dataset unico): premium de 2-3x

---

### Cenario B: Investimento

**Tipos de investidor por fase:**

| Fase | Tipo | Ticket tipico | O que quer ver |
|------|------|---------------|----------------|
| Pre-seed | Angel BR | R$ 50-200k | Time + visao + MVP funcional |
| Seed | Fundo BR (Canary, Kaszek) | R$ 500k-2M | PMF + metricas de retencao |
| Seed+ | Fundo gringo | $500k-2M | Tracao EN + unit economics |
| Series A | VC | $5-15M | $100k+ MRR + crescimento 3x YoY |

**Preparacao:**
- [ ] One-pager do negocio (1 pagina, metricas + visao)
- [ ] Pitch deck (10-12 slides, padrao YC)
- [ ] Financial model basico (projecao 3 anos)
- [ ] Data room organizado (docs legais, metricas, PI)

---

### Cenario C: Atencao Juridica Negativa

**Risco 1: Cease & Desist por Trademark**

| Probabilidade | Gatilho | Severidade |
|---------------|---------|------------|
| Baixa (hoje) | Crescimento + visibilidade | Media |
| Media (50k MAU) | Busca Google competitiva | Media-alta |
| Alta (100k+ MAU) | Receita significativa | Alta |

**Defesa preparada:**
1. Marca "Pocket DM" registrada no INPI (classe 9/42, diferente de classe 28 da WotC)
2. "DM" como termo generico (Direct Message) em contexto tech
3. Marca composta — "Pocket DM" nao e "Dungeon Master"
4. Sem confusao de mercado — Pocket DM nao e produto da WotC e nunca se apresenta como tal

**Se receber C&D:**
- [ ] NAO entrar em panico. C&D nao e processo, e carta de advogado
- [ ] Consultar advogado de PI (ter contato identificado ANTES)
- [ ] Avaliar: contestar ou rebranding? (depende do custo-beneficio)
- [ ] Se rebranding: ativar Plano B de marca (nomes alternativos ja documentados acima)
- [ ] Prazo tipico de resposta: 30 dias

**Risco 2: Claim de Conteudo**

| Probabilidade | Gatilho | Severidade |
|---------------|---------|------------|
| Muito baixa | Vazamento de conteudo nao-SRD | Critica |

**Defesa:**
- Whitelist filters ativos e auditados
- 100% do conteudo publico e SRD (CC-BY-4.0) ou MAD (CC)
- Atribuicao visivel
- Pagina `/legal/content-license` documentando fontes

**Risco 3: Concorrencia Predatoria (nao juridico, mas real)**

WotC pode simplesmente lançar um "D&D Companion" presencial. Isso nao e processo, e mercado.

**Defesa:**
- Comunidade e marca estabelecida
- UX superior por foco (eles fazem 100 coisas, voce faz 1 muito bem)
- Dataset de comportamento presencial
- Preco competitivo em real (vs dolar)

---

## 5. ACOES IMEDIATAS — ABRIL 2026

### Prioridade Alta (esta semana)

- [ ] Busca previa no INPI por "Pocket DM"
- [ ] Criar conta no e-INPI
- [ ] Depositar pedido de marca nas classes 9 e 42

### Prioridade Media (este mes)

- [ ] Adicionar atribuicao CC-BY-4.0 no footer
- [ ] Criar pagina `/legal/content-license`
- [ ] Revisar metadata PWA/marketing — remover "D&D", usar "5e" ou "tabletop RPG"
- [ ] Documentar nomes alternativos de marca (Plano B)
- [ ] Identificar advogado de PI em BH (so contato, nao contratar)

### Prioridade Normal (proximo trimestre)

- [ ] Implementar telemetria anonima de sessoes
- [ ] Preparar one-pager do negocio
- [ ] Iniciar programa de beta testers com DMs influentes
- [ ] Preparar assets pra demos presenciais (BH, maio 2026)

---

## 6. CONTATOS E RECURSOS UTEIS

### Registro de Marca
- INPI busca: https://busca.inpi.gov.br/pePI/
- e-INPI: https://www.gov.br/inpi/pt-br/servicos/marcas
- Guia basico: https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico

### Licencas de Conteudo
- SRD 5.1 CC-BY-4.0: https://creativecommons.org/licenses/by/4.0/
- SRD 5.1 original: https://dnd.wizards.com/resources/systems-reference-document

### Referencia Legal
- WotC Fan Content Policy: https://company.wizards.com/fancontentpolicy
- OGL 1.0a (historico): referencia apenas, Pocket DM usa CC-BY-4.0

---

> **Nota:** Este documento deve ser revisado trimestralmente ou sempre que houver mudanca significativa em metricas, produto, ou cenario competitivo.
