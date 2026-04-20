# SEO Roadmap — Party Mode Outcome (2026-04-20)

**Versão:** 2026-04-20 — pós-revisão adversarial (escopo reduzido + ordem reordenada)

**Contexto:** Sessão de party mode com os 9 agentes BMAD produziu este roadmap. Uma segunda rodada adversarial (party-mode 2026-04-20) revisou os specs e cortou gold-plating + corrigiu bugs. Site novo (~16 dias), fase experimental, sem meta fixa, objetivo é **preparar terreno fértil para crescimento orgânico**. Posicionamento: autoridade SRD brasileira **+** ferramenta+SEO como canal de aquisição (ambos).

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
- **Dados guiam criação de conteúdo** — não criar hub PT sem validar query em GSC

**Linha de ação revisada:**
1. **Épico A** — destravar fundação técnica (blog split + hub JSON + bi-locale)
2. **Épico C.1** — GSC export ANTES do Épico B (dados guiam priorização)
3. **Épico B** — hubs EN obrigatórios + hubs PT condicionais (validados por GSC) + CTAs
4. **Épico C.2** — funnel tracking pra medir conversão real
5. Aguardar 30–60 dias de dados antes de otimizar CTR ou criar mais hubs

---

## 🏗️ 3 Épicos (escopo revisado)

| Épico | Foco | Tempo | Lead sugerido | Mudança |
|---|---|---:|---|---|
| [Épico A — Fundação Técnica](./PROMPT-seo-epic-A-foundation.md) | Blog split (2 commits), hub generator bi-locale, validate:seo, branch discipline doc | ~10h | Winston (Arch) + Amelia (Dev) | A1 Python→TS, A2 trava decisão EN |
| [Épico C — Instrumentação](./PROMPT-seo-epic-C-instrumentation.md) | GSC export + click-flow tracking. C3/C4 adiados. | ~6h | Mary (Analyst) | **Reduzido de 10h → 6h** (cortado gold-plating). C1 roda ANTES do Épico B idealmente. |
| [Épico B — Conteúdo + Conversão](./PROMPT-seo-epic-B-content.md) | 3 hubs obrigatórios (2 EN + CTAs) + 3 hubs PT condicionais guiados por GSC | ~9h–18h | Sally (UX) + Mary (Analyst) | **B1/B2/B3 agora condicionais** (GSC valida query antes). Só 3 obrigatórios. |

**Ordem revisada:**
```
A (fundação) → C.1 (GSC export) → B (hubs EN + CTAs + hubs PT condicionais) → C.2 (funnel)
```

**Total mínimo:** ~25h (A 10h + C 6h + B obrigatórios 9h) — vs 38h da versão inicial.
**Total máximo se todos hubs PT passarem validação:** ~34h.

---

## 🤝 Consensus dos agentes (rodada 2 do party — 2026-04-20)

### 💻 Amelia (Dev) — bugs concretos pegos
- A1 script era Python num projeto TypeScript → corrigido
- A3 referenciava `/about` que não existe → corrigido (5 URLs verificadas 200)
- C2 migration path estava errado (`migrations/XXX` vs projeto usa `supabase/migrations/00N`) → corrigido

### 🧪 Quinn (QA) — AC decorativos detectados
- A1 "bundle +5%" sem baseline capturado → adicionado A1.0 baseline obrigatório
- A1 "curl + grep" nos 21 posts à mão → automatizado via `scripts/verify-blog-parity.ts`

### 🚀 Barry (Quick Flow) — gold plating cortado
- C3 content gap analysis → **adiado** (sem 60d+ de dados é chute)
- C4 dashboard auto-update → **adiado** (ROI ruim: parsing markdown p/ 5min/sem)
- C1 setup GCP explicitado como pré-requisito humano

### 📊 Mary (Analyst) — dados antes de chute
- B1/B2/B3 (hubs PT novos) agora **condicionais** à validação GSC
- C.1 realocado para ANTES do Épico B na ordem de execução

### 🏗️ Winston (Architect) — integração travada
- A2 agora **obrigatoriamente** cria rotas bi-locale (`/guias/` + `/guides/`) pra evitar improvisação no Épico B
- A1 dividido em 2 commits (split + delete) pra revert trivial

### 📋 John (PM) — mantém KPI
- "Cadência de experimentação" segue como KPI
- Total reduzido de 38h → 25-34h libera foco

### 🎨 Sally (UX) — conversão permanece P0
- B6 (sticky mobile CTA) + B7 (contextual CTA) continuam obrigatórios/recomendados
- Sem corte

### 🏃 Bob (SM) — ordem mapeada
- Dependências: A4 → A1.0 → A1.1 → A1.2 → A3 → A2 | C.1 | B4/B5/B6/B7 | C.2
- Paralelização: C.1 pode rodar em paralelo com A ou após; B espera A mergeado

### 📚 Paige (Tech Writer) — formato preservado
- Specs mantêm estrutura Context / Regras / Stories / AC / Anti-patterns
- Campo "Status de validação" adicionado em hubs PT condicionais

---

## 📋 Decisões travadas (não reverter)

| Decisão | Valor | Por quê |
|---|---|---|
| Blog split vs MDX migration | **Split** (21 React components) | MDX = risco de regressão URL |
| Script language | **TypeScript** (todos scripts) | Projeto é TS; Python vira dívida |
| A1 commit strategy | **2 commits** (split + delete) | Revert trivial se necessário |
| A2 locale routing | **Rota dinâmica bi-locale** (`/guias/[slug]` + `/guides/[slug]` sharing JSON) | Evita duplicação no Épico B |
| Hubs PT condicionais | **Validar GSC antes** (≥30 impressões/28d) | Não criar hub pra query sem volume |
| Épico C escopo | **Só C1 + C2** | C3/C4 são gold-plating pra 16d de dados |
| C1 ordem | **Antes do Épico B** (se GCP pronto) | Dados guiam priorização de hubs |
| Migration convention | **`supabase/migrations/00N_nome.sql`** | Padrão real do projeto |
| CTA contextual vs uniforme | **Ambos** (contextual em detail, uniforme em hub) | Intent diferente |
| CI Rich Results gate | **Não — script manual** | Gold plating pra fase experimental |

---

## 🔜 Depois dos 3 épicos

**NÃO especificado neste roadmap (intencionalmente):**
- Rewrite de title/description pra CTR rescue → **aguardar 30+ dias de dados**
- Hub pages 6–10 → criar baseado em C3 (quando rodar, pós-60d)
- Per-route OG images → depois de tráfego estabilizar
- Looker Studio dashboard → só se >30 queries exigirem
- **C3 content gap analysis** → rodar quando tiver 60d+ de GSC data
- **C4 dashboard auto-update** → revisitar se ritual manual virar gargalo real

**Gatilhos para revisitar:**
1. Pós-Épico A completo → re-avaliar se split do blog revelou necessidades extras
2. Pós-Épico C.1 rodado → usar data/seo/gsc-*.json pra validar queries do Épico B
3. Pós-Épico B 30d → comparar tracked_queries dos hubs com performance real
4. Pós-Épico C.2 7d → primeira vista de funnel real (que query converte pra signup)
5. Pós-60d de GSC data → considerar reativar C3 content gap

---

## 📂 Docs gerados/atualizados nesta sessão

- [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md) — Épico A (rev 2026-04-20)
- [docs/PROMPT-seo-epic-B-content.md](./PROMPT-seo-epic-B-content.md) — Épico B (rev 2026-04-20)
- [docs/PROMPT-seo-epic-C-instrumentation.md](./PROMPT-seo-epic-C-instrumentation.md) — Épico C (rev 2026-04-20, escopo reduzido)
- [docs/seo-roadmap-2026-04-20.md](./seo-roadmap-2026-04-20.md) — este arquivo (master index)

**Docs referenciados (existentes):**
- [docs/seo-architecture.md](./seo-architecture.md)
- [docs/seo-delivery-report-2026-04-17.md](./seo-delivery-report-2026-04-17.md)
- [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md)
- [docs/seo-monitoring.md](./seo-monitoring.md)

---

## Como delegar

### Opção 1 — Sequencial (1 agente, recomendado)
Ordem ideal respeita dependências e aproveita C.1 pra guiar B:
1. Cole [PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md) → "executa"
2. **[Humano]** Executa setup GCP/GSC (~30min) — documentado em C1 pré-req
3. Cole [PROMPT-seo-epic-C-instrumentation.md](./PROMPT-seo-epic-C-instrumentation.md) e diga **"executa só a story C1 por enquanto"**
4. Cole [PROMPT-seo-epic-B-content.md](./PROMPT-seo-epic-B-content.md) → "executa os P0 (B4, B5, B6) e depois avalia B1/B2/B3 contra o GSC data"
5. Cole PROMPT-C de novo: "agora executa C2"

### Opção 2 — 2 agentes (após Épico A)
Depois do Épico A em master:
- Agente 1: Épico C (C1 → C2 sequencial)
- Agente 2: Épico B (começa pelos P0; pausa pra aguardar C1 antes de B1/B2/B3)

### Opção 3 — Se setup GCP atrasar
- Épico A → Épico B (só P0 + P1) → Épico C2 (sem C1) → Épico C1 quando GCP pronto

---

## Owner

Daniel Roscoe (`daniel@awsales.io`)

Revisado por: os 9 agentes BMAD em party mode, 2026-04-20 (rodada 1) + revisão adversarial 2026-04-20 (rodada 2).

🧙‍♂️
