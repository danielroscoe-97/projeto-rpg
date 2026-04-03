# Decisoes Implementadas sem PRD Formal — 2026-04-03

> Rastreabilidade de features e iniciativas implementadas por decisao direta (sem PRD/epic formal).
> Criado para garantir que cada decisao tenha o "por que" documentado alem do commit message.
> Referencia: [bucket-future-ideas.md](bucket-future-ideas.md) | [prd-v2.md](prd-v2.md)

---

## 1. Blog Wave 2 — 5 Artigos SEO/GEO

**Commit:** `a406474` feat(blog): Wave 2 — blog com 5 artigos SEO/GEO para mestres de D&D 5e
**Data:** 2026-04-03
**Tipo:** Marketing / Content

**Por que:** Estrategia de SEO/GEO para indexacao organica no Google e ranking em IAs (ChatGPT, Perplexity, Claude). O blog serve como funil de aquisicao: mestre pesquisa "como gerenciar combate D&D" → encontra artigo → descobre Pocket DM → converte.

**O que inclui:**
- 5 artigos longform em portugues focados em keywords de cauda longa
- Otimizacao para GEO (Generative Engine Optimization) — formato que IAs citam como fonte
- Integrados ao sistema de blog existente com OG images e RSS

**Metricas de validacao:** Indexacao Google em <7 dias; apparicao em resultados de IAs em <30 dias

---

## 2. Content Access Control — Whitelist + Agreements

**Commit:** `154155d` feat(content): Epic Content Access Control — whitelist + agreements + compendium gating
**Data:** 2026-04-03
**Tipo:** Negocio / Compliance

**Por que:** O compendio de monstros inclui conteudo SRD (uso livre) e conteudo MAD (Monster a Day — comunidade). Para proteger o conteudo premium e preparar a monetizacao futura, implementamos:

1. **Whitelist de acesso:** Admin pode conceder/revogar acesso completo ao compendio por usuario
2. **Agreements:** Usuarios aceitam termos antes de acessar conteudo gated
3. **Compendium gating:** Monstros alem do SRD basico requerem whitelist ou agreement

**Decisao de negocio:** Isso prepara o terreno para o modelo freemium sem precisar implementar pagamento agora. O admin (danielroscoe97@gmail.com) gerencia manualmente durante beta.

**Migrations:** `058_content_whitelist.sql`, `059_content_agreements.sql`

---

## 3. Monster a Day Integration — 357 Monstros Comunitarios

**Commit:** `a59c450` feat(compendium): expand MAD monsters from 61 to 357 via Reddit extraction
**Commit anterior:** `de239b0` feat(compendium): Monster a Day integration — 61 community monsters
**Data:** 2026-04-02 a 2026-04-03
**Tipo:** Conteudo / Comunidade

**Por que:** O compendio SRD tem ~320 monstros. Expandir com conteudo comunitario (Monster a Day do Reddit) diferencia o Pocket DM de concorrentes que so tem SRD. Os 357 monstros MAD sao conteudo gratuito da comunidade, redistribuivel com atribuicao.

**O que inclui:**
- Extracao automatizada via script de Reddit posts
- Integracao no compendio com filtro de source (SRD/Complete/MAD)
- Dados gitignored (nao versionados) — apenas metadados e referencias no repo

---

## 4. SEO/GEO Sprint Completo

**Commit:** `6c020e6` feat(seo): Sprint Marketing/SEO + GEO — indexacao Google/Bing + ranking IAs
**Commit complementar:** `cb8426e` feat(seo): OG images premium + RSS feed + breadcrumbs + related posts
**Data:** 2026-04-03
**Tipo:** Marketing / Infraestrutura

**Por que:** O app estava em producao mas invisivel para buscadores. Sprint de SEO/GEO para:

1. **Indexacao:** Submissao a Google Search Console e Bing Webmaster Tools
2. **OG Images:** Imagens de preview premium para compartilhamento social
3. **RSS Feed:** Feed para agregadores e indexadores
4. **Breadcrumbs:** Navegacao estruturada para SEO
5. **Related Posts:** Links internos para reduzir bounce rate

**Justificativa:** Pre-requisito para o funil de aquisicao organica. Sem SEO, o blog e a landing page nao geram trafego.

---

## 5. Projecao de Crescimento 2026-2027

**Commit:** `788623d` docs: projecao completa de crescimento 2026-2027
**Data:** 2026-04-03
**Tipo:** Estrategia / Planejamento

**Por que:** Documento estrategico com projecoes de crescimento para pitch a investidores e planejamento interno. Nao e feature — e documentacao de negocio.

**Arquivo:** `docs/projecao-crescimento-2026-2027.md`

---

## 6. Redesign Text Pages + Bilingual Attribution

**Commit:** `d13426b` feat(ux): redesign all text pages + bilingual attribution + fix footer Pipers layout
**Data:** 2026-04-03
**Tipo:** UX Polish

**Por que:** Paginas de texto (About, FAQ, Terms) estavam com layout basico e sem consistencia com a identidade visual do produto. Redesign para:

1. **Consistencia visual:** Mesmo estilo dark+gold das paginas principais
2. **Atribuicao bilingue:** Creditos em pt-BR e en para compliance
3. **Footer Pipers:** Fix do layout do logo dos Pipers no footer

**Decisao UX:** Paginas de texto sao a "porta de entrada" para usuarios vindos do Google. Primeira impressao importa.

---

## 7. F-43 — Unificar Jogadores + Membros

**Commit:** `476177e` feat(campaigns): F-43 — unify Jogadores + Membros into single section
**Data:** 2026-04-03
**Tipo:** UX / Simplificacao

**Por que:** A tela de campanha tinha duas secoes separadas: "Jogadores" (da sessao ativa) e "Membros" (da campanha). Isso confundia DMs — "qual e a diferenca?". Unificamos em uma unica secao com status dinamic (online/offline/convidado).

**Filosofia:** Alinhado com o principio do Pocket DM — simplificar, nao complicar. Se o DM precisa pensar "qual secao uso?", a UX falhou.

---

## Migrations Aplicadas sem PRD

| Migration | Conteudo | PRD | Justificativa |
|-----------|----------|-----|---------------|
| 058_content_whitelist.sql | Tabela de whitelist de conteudo | Sem PRD | Content Access Control (item 2 acima) |
| 059_content_agreements.sql | Tabela de agreements/termos | Sem PRD | Content Access Control (item 2 acima) |
| 060_encounter_votes.sql | Votos de dificuldade pos-combate | Backlog BT C.15 | Enquete pos-combate |
| 070_reconcile_combat_state.sql | Reconciliacao de estado de combate | Spec reconnection | Resilient reconnection |
| 071_dm_heartbeat.sql | Heartbeat do DM para stale detection | Spec reconnection | Resilient reconnection |

---

## Player HQ — 4 Sprints (64 SP)

> O Player HQ TEM PRD formal: [epic-player-hq.md](epic-player-hq.md) + [sprint-plan-player-hq-2026-04-03.md](sprint-plan-player-hq-2026-04-03.md)
> Listado aqui apenas como referencia cruzada — o epic e o sprint plan sao a fonte de verdade.

| Sprint | Stories | SP | Status |
|--------|---------|-----|--------|
| Sprint 1 — Co-Piloto de Mesa | F1, F3, F4, F5, F6, F8, F12 | 25 | ✅ Commitado (`b381519`) |
| Sprint 2 — Bag of Holding (Stream A) | F2, F9, F10, F11 | 18 | ✅ Commitado (`b543d13`) |
| Sprint 3 — Notes & Journal (Stream B) | F14, F15 | 8 | ✅ Commitado (`b543d13`) |
| Sprint 3 — Quest Board (Stream C) | F16 | 3 | ✅ Commitado (`685dccd`) |
| Sprint 4 — SRD + Spell List (Stream D) | F7, F13 | 10 | ✅ Commitado (`69063fc`) |

---

> **Criado:** 2026-04-03
> **Revisado por:** Dani_ + BMAD Party Mode (John, Mary, Winston, Bob, Quinn)
> **Proxima revisao:** Pre-beta test sessao #2
