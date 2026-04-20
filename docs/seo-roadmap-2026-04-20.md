# SEO Roadmap — Party Mode Outcome (2026-04-20)

**Contexto:** Sessão de party mode com os 9 agentes BMAD produziu este roadmap. Site novo (~16 dias), fase experimental, sem meta fixa, objetivo é **preparar terreno fértil para crescimento orgânico**. Posicionamento: autoridade SRD brasileira **+** ferramenta+SEO como canal de aquisição (ambos).

**Status do projeto à data:**
- Sprints 1, 2, 3, 3.6, 3.7, 3.8 deployados (canonical apex, JSON-LD, site-url normalizer, metadata builders, XSS-safe scripts).
- Sprint 4 (marketing): T4.1 web-vitals + T4.3 hub pages iniciais + T4.4 monitoring doc ✅. T4.2 blog MDX skip documentado.
- Fix de emergência do apex (9ba3a47f) em 2026-04-20 — `SITE_URL` agora auto-strip `www.`.
- GSC atual: 20 cliques, 1.210 impressões, CTR 1,7%, pos média 22,7 (janela de ~16 dias).

---

## 🎯 Estratégia dos próximos 30 dias

Dado que:
- Sem meta concreta → KPI implícito = **cadência de experimentação**
- Fase experimental → evitar gold-plating, preferir lean
- Ambiente multi-agente → disciplina de commit/push é crítica
- Site novo → Google ainda "descobrindo" — adicionar superfície + instrumentação é alto ROI

**Linha de ação:**
1. Destravar fundação técnica para criar conteúdo barato (Épico A)
2. Criar 5 hubs novos + otimizar conversão (Épico B)
3. Instrumentar visibilidade (Épico C)
4. Aguardar 30–60 dias de dados reais antes de otimizar CTR

---

## 🏗️ 3 Épicos

| Épico | Foco | Tempo total | Lead sugerido |
|---|---|---:|---|
| [Épico A — Fundação Técnica](./PROMPT-seo-epic-A-foundation.md) | Blog split, hub generator, validate:seo, branch discipline doc | ~10h | Winston (Arch) + Amelia (Dev) |
| [Épico B — Conteúdo + Conversão](./PROMPT-seo-epic-B-content.md) | 5 hubs novos (3 PT + 2 EN), sticky mobile CTA, CTA contextual | ~18h | Sally (UX) + Mary (Analyst) |
| [Épico C — Instrumentação](./PROMPT-seo-epic-C-instrumentation.md) | GSC export, click-flow tracking, content gap, dashboard auto | ~10h | Mary (Analyst) |

**Ordem:** A é pré-requisito hard (desbloqueia B). B e C podem rodar em paralelo.

**Total:** ~38h de trabalho. 2 agentes em paralelo = 2–3 semanas.

---

## 🤝 Consensus dos agentes (rodada 1 do party)

### 📋 John (PM)
- "Fase experimental → KPI é cadência"
- Priorizou: A → B+C paralelo
- Cortou: gold-plating em CI (concordou com Barry em reduzir A3 pra script manual)

### 🏗️ Winston (Architect)
- Blog monolith é bomba-relógio técnica
- Hub generator via JSON = escalabilidade
- Cada sprint deve resolver 1 bloqueio técnico + 1 entrega de conteúdo

### 📊 Mary (Analyst)
- Dados de 16 dias não dão pra conclusão ("não comparar com baseline de 28d")
- 83% Brasil + mobile CTR 7,87% → PT-BR + mobile first absoluto
- Instrumentação é infraestrutura, não afterthought
- Sugestão aceita: `tracked_queries` em cada hub JSON

### 🎨 Sally (UX)
- Hubs atuais não convertem agressivamente o suficiente
- CTA contextual (Tarrasca na página → "Combate com Tarrasca" em /try) ganha 2-3x
- Sticky mobile CTA não-opcional

### 📚 Paige (Tech Writer)
- Cada spec de Épico deve ter: Context, Regras imutáveis, Stories com file paths + AC + anti-patterns, Ordem, Validação
- Formato seguido em `PROMPT-seo-epic-*.md`

### 💻 Amelia (Dev)
- Alerta sobre merge conflicts em multi-agente
- Branch strategy clara = pré-req (virou story A4)
- Hub generator via `generateStaticParams` + `fs.readdirSync` (não rota individual scaffolded)

### 🧪 Quinn (QA)
- Rich Results Test automatizado pedido mas reduzido a script manual (Barry-pragmatism)
- Acceptance criteria rigorosos em cada story

### 🚀 Barry (Quick Flow)
- Constante "isso é gold plating" pra trazer escopo ao chão
- Mediu tempo agressivo (9h/início, 3h/semana steady)

### 🏃 Bob (SM)
- Breakdown em 3 épicos × stories de 2–4h executáveis por 1 agente
- Dependência mapeada: A4 → A1+A3 → A2 → B (paralelo com C)

---

## 📋 Pontos de debate — resoluções

| Debate | Resolução | Por quê |
|---|---|---|
| Blog split vs MDX migration | **Split** (manter React components em 21 arquivos) | MDX = risco de regressão URL em 21 posts com tráfego (Sprint 4 T4.2 reasoning) |
| Quantos hubs criar? | **3 PT + 2 EN (5 total) no Épico B** | Barry propôs 4/semana, Bob 3+2, Mary "dados guiam". 5 no Épico B dá pra observar por 30d antes de decidir mais. |
| CTA contextual vs uniforme | **Ambos — contextual em detail pages, uniforme em hubs** | Detail page quem chegou busca entidade específica; hub quem chegou busca visão geral |
| CI Rich Results gate | **Não — script manual** | Gold plating pra fase experimental (Barry). Revisitar se regressão recorrente |
| Branch strategy | **Worktree quando master tem commits não-pushed de outros agentes; branch normal caso contrário** | Captured em story A4 + memory `feedback_multi_agent_commits.md` |

---

## 🔜 Depois dos 3 épicos

**NÃO especificado neste roadmap (intencionalmente):**
- Rewrite de title/description pra CTR rescue → **aguardar 30+ dias de dados**, GSC mostra títulos que funcionam
- Hub pages 6–10 → criar baseado em output do content gap analysis (C3)
- Per-route OG images → depois de tráfego estabilizar (CTR social ≠ SEO CTR)
- Looker Studio dashboard → só se >30 queries exigirem

**Gatilhos para revisitar:**
1. Pós-Épico A completo → re-avaliar se split do blog revelou necessidades extras
2. Pós-Épico B 30d → rodar C3 (content gap) e decidir próximos hubs
3. Pós-Épico C 7d → primeira vista de funnel real (que query converte pra signup)

---

## 📂 Docs gerados nesta sessão

- [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md) — Épico A spec executável
- [docs/PROMPT-seo-epic-B-content.md](./PROMPT-seo-epic-B-content.md) — Épico B spec executável
- [docs/PROMPT-seo-epic-C-instrumentation.md](./PROMPT-seo-epic-C-instrumentation.md) — Épico C spec executável
- [docs/seo-roadmap-2026-04-20.md](./seo-roadmap-2026-04-20.md) — este arquivo (master index)

**Docs referenciados (existentes):**
- [docs/seo-architecture.md](./seo-architecture.md)
- [docs/seo-delivery-report-2026-04-17.md](./seo-delivery-report-2026-04-17.md)
- [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md)
- [docs/seo-monitoring.md](./seo-monitoring.md)

---

## Como delegar

### Opção 1 — 1 agente executa sequencial
Cole o conteúdo de `PROMPT-seo-epic-A-foundation.md` e diga "executa". Quando terminar, repita com B e C.

### Opção 2 — 2 agentes em paralelo (após A)
Depois do Épico A mergeado em master:
- Agente 1: `PROMPT-seo-epic-B-content.md`
- Agente 2: `PROMPT-seo-epic-C-instrumentation.md`

### Opção 3 — 3 agentes agora
Arriscado (merge conflicts). Só se Épico A for dividido em A4→A1 (agente 1) e A3→A2 (agente 2), e B/C esperarem A mergeado.

---

## Owner

Daniel Roscoe (`daniel@awsales.io`)

Revisado por: os 9 agentes BMAD em party mode, 2026-04-20.

🧙‍♂️
