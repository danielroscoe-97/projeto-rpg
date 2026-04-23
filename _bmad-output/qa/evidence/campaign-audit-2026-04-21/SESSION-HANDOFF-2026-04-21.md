# Session Handoff — Campaign HQ + Player HQ Redesign

**Data:** 2026-04-21 (sessão completa)
**Owner:** Dani Roscoe (`danielroscoe97@gmail.com`)
**Projeto:** Pocket DM — redesign completo da área de campanha (Mestre + Jogador)
**Status final:** spec consolidada, 26 decisões travadas, pronto pra Fase A de implementação
**Total produzido:** ~545 KB de documentação estruturada em 21 arquivos

---

## 🎯 TL;DR pra continuar em outra janela

Auditoria identificou 24 findings na Campaign HQ atual. Proposta v0.3 substitui pill bar de 13 abas por **4 modes** (3 Mestre + 1 Jogador) com shell unificado, vocabulário PT-BR travado ("Mestre" nunca "DM"), HP tiers canônicos (FULL/LIGHT/MODERATE/HEAVY/CRITICAL), quests atribuíveis via **entity graph existente** no schema (`campaign_mind_map_edges` mig 080+148+152+154), mini-wiki de notas pro Jogador (nova tabela `player_notes`), watch mode removido (Jogador entra em combate via CTA que navega pra `/combat/[id]` existente). Wireframe hi-fi: 2 de 8 subidos no Figma (bloqueado por rate limit Starter plan). Fase A de implementação (10 quick wins, 2-3 dias) pronta pra começar.

---

## 📂 ARQUIVOS RELEVANTES — Inventário completo

### 1. Pacote principal de spec (`_bmad-output/qa/evidence/campaign-audit-2026-04-21/`)

**Leia nesta ordem para retomar:**

| # | Arquivo | Tamanho | Conteúdo |
|---|---|---|---|
| 0 | `00-INDEX.md` | 11.5 KB | **Mapa de leitura por papel (dev/designer/PM/QA/Winston) + inventário completo** |
| — | `SESSION-HANDOFF-2026-04-21.md` | este | Documento que você tá lendo agora |
| 1 | `test-spec.md` | 6.7 KB | Como a auditoria Playwright foi feita |
| 2 | `findings.md` | 14.8 KB | 24 findings taggeadas (4 🔴 · 7 🟠 · 10 🟡 · 3 🔵) |
| 3 | `redesign-proposal.md` | **54.9 KB** | **v0.3 source-of-truth com 26 decisões travadas** |
| 4 | `redesign-proposal-review.md` | 19.6 KB | Review adversarial 4 lentes |
| 5 | `SPEC-REVIEW-FINAL.md` | 27.2 KB | Review final do pacote + 28 gaps + patch notes v1.1 |
| 6 | `DESIGN-SYSTEM.md` | **42.5 KB** | **Doc-mestre do DS (codinome Grimório): manifesto, 7 princípios, voice, linguagem visual, patterns, 10 mandamentos** |
| 7 | `01-design-tokens.md` | 23.3 KB | Tokens atômicos (cores, tipografia, spacing, radii, shadows, motion, breakpoints, z-index) |
| 8 | `02-component-library.md` | 48.0 KB | 20 componentes (primitives + composite + domain) com props, variants, states |
| 9 | `03-interactions-spec.md` | 41.7 KB | 12 microinterações frame-by-frame (mode switch, @-autocomplete, handout drop, reconexão) |
| 10 | `04-states-catalog.md` | 29.2 KB | States por surface × role × condição (empty/loading/error/full) |
| 11 | `05-responsive-spec.md` | 38.3 KB | 8 wireframes ASCII × 3 breakpoints = 24 combinações |
| 12 | `06-i18n-strings.md` | 50.3 KB | ~180 chaves PT-BR × EN em 16 namespaces |
| 13 | `07-accessibility-spec.md` | 20.6 KB | ARIA roles, tab order, keyboard shortcuts, contraste WCAG AA |
| 14 | `08-edge-cases-catalog.md` | 24.0 KB | ~40 cenários em 10 categorias |
| 15 | `09-implementation-guide.md` | 27.1 KB | 22 stories em 4 fases (A/B/C/D) com file paths, risk register |
| 16 | `10-modes-user-journeys.md` | **22.9 KB** | **Jornada funcional step-by-step por mode + cenário cross-mode + crítica multi-lens** |
| 17 | `figma-rebuild-script.md` | 4.0 KB | Script pronto pra quando Figma destravar |
| 18 | `screenshots/` | 16 PNGs | Evidência visual da auditoria |

**Total da pasta:** ~526 KB · ~6.300 linhas de documento

### 2. Schema (`_bmad-output/architecture/`)

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `schema-investigation-winston.md` | **12.5 KB** | **v2 simplificada** — descoberta do entity graph existente reduziu de 6 migrations propostas pra apenas 1 (`player_notes`). 8 perguntas pro Winston refinar. |

### 3. Vocabulário ubíquo do projeto (`docs/`)

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `docs/glossario-ubiquo.md` | **17.8 KB** | Glossário original 2026-04-16 + **adendo v0.3** com: regra "Mestre nunca DM", 4 modes canônicos, HP tiers canônicos, 18 surfaces, mini-wiki do Jogador, entity graph existente, termos renomeados |

### 4. CLAUDE.md (raiz do projeto)

| Arquivo | Mudança |
|---|---|
| `CLAUDE.md` | Adicionada seção "Vocabulário Ubíquo — REGRA IMUTÁVEL" no topo com: (1) regra "Mestre nunca DM" com exceções pragmáticas, (2) quick ref de modes canônicos, (3) quick ref de HP tiers, (4) anti-patterns proibidos |

### 5. Memórias persistentes (`~/.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/`)

| Memory | Criada/atualizada |
|---|---|
| `feedback_mestre_nao_dm.md` | **NOVA** — nunca referir Mestre como "DM" em hipótese alguma |
| `feedback_svg_sem_emojis.md` | **NOVA** — mix SVG Lucide gold + emojis narrativos (🎲 🎯 🎉 ⚠ 🎬 ⚡) |
| `feedback_hp_tier_labels.md` | Atualizada com confirmação canônica 2026-04-21 + `formatHpPct` regra |
| `feedback_linguagem_ubiqua.md` | Atualizada com ADENDO v0.3 referenciando glossário |
| `MEMORY.md` | Índice atualizado com 2 novas entries |

### 6. Figma (arquivo criado)

| Asset | URL |
|---|---|
| "Pocket DM — Campaign HQ Redesign v0.2" | https://www.figma.com/design/uBJPn1qZEPCV2LLK82QnOi |
| Status | 2 wireframes (W0b + W1) criados com emojis; bloqueado em rate limit Starter antes do rebuild com SVGs |

---

## 🔒 DECISÕES CANÔNICAS TRAVADAS (26)

**Todas vivem em `redesign-proposal.md §13`.**

### Filosofia (1-15)
1. Eliminar pill bar horizontal
2. Shell unificado Mestre + Jogador
3. Mode switcher > pill bar
4. Busca rápida (Ctrl+K) é first-class
5. Empty states têm copy por role
6. 1 CTA dominante por combate ativo
7. Mode é stateless derivado do server (nunca localStorage)
8. Matriz Surface × Auth explícita (Guest/Anônimo/Auth)
9. Read-only lock em Prep/Recap durante combate
10. Labels PT-BR na UI (Preparar Sessão/Rodar Combate/Recaps)
11. Ctrl+K primário, ⌘K alternativa Mac
12. Density budget: ≤8 elementos above-fold
13. Serif só em nomes próprios
14. SVG gold em sistema / emoji em narrativa (mix)
15. 4 killer-features committed (backlinks, tags, permissões, handouts)

### Técnicas (16-20)
16. Rotas EN curto: `/prep`, `/run`, `/recap`, `/journey`
17. Jogador anônimo vê Minha Jornada light
18. Mode switcher vertical desktop + bottom tab mobile
19. Tour dismissable com "Pular" visível
20. Backlinks `@nome` primário + `[[nome]]` alternativo

### Canônicas (21-22) — travadas tarde 2026-04-21
21. **Mode enum canônico:** `type Mode = 'prep' | 'run' | 'recap' | 'journey'` (4 modes, EN no código, PT-BR na UI). Labels: **Preparar Sessão** / **Rodar Combate** / **Recaps** / **Minha Jornada**.
22. **HP tiers canônicos:** `FULL` 100% · `LIGHT` 70-100% · `MODERATE` 40-70% · `HEAVY` 10-40% · `CRITICAL` 0-10%. Labels EN nos 2 locales. Source: `lib/utils/hp-status.ts`.

### Revisão v0.3 (23-26) — travadas na última parte da sessão
23. **Watch mode REMOVIDO.** Jogador não tem auto-switch. Banner sticky + CTA "Entrar no Combate" + PWA push → navega pra `/app/combat/[id]` existente.
24. **Mini-wiki do Jogador** em surface `my_notes` (em `journey`). MVP: markdown + tags. v1.5: backlinks `@` filtrados por visibility.
25. **Quests atribuíveis via entity graph existente** — `campaign_mind_map_edges` já suporta polymórficas. ZERO tabelas novas pra quests. Só UI.
26. **Modes separados por papel** — Mestre tem 3, Jogador tem 1. Nunca há sobreposição.

### Regra absoluta adicional
**"Mestre", nunca "DM"** — em UI, i18n, docs, comunicação, commits, PRs, respostas em chat, comentários de código explicativos. Exceções só em código interno (`role='dm'`, `dmOnly` props, nome "Pocket DM"). Memory `feedback_mestre_nao_dm.md`.

---

## ✅ ESTADO DE PRONTIDÃO

| Pedaço | Status | Bloqueador |
|---|---|---|
| Auditoria (findings) | ✅ 100% | — |
| Visão / proposta / decisões | ✅ 100% travado | — |
| Design System (alma + princípios) | ✅ 100% | — |
| Design tokens | ✅ 100% | — |
| Component library | ✅ 100% | — |
| Interactions spec | ✅ 100% | — |
| States catalog | ✅ 100% | — |
| Responsive wireframes ASCII | ✅ 100% (8 wireframes × 3 breakpoints) | — |
| i18n strings | ✅ 100% (~180 chaves) | — |
| Accessibility | ✅ 100% | — |
| Edge cases | ✅ 100% | — |
| Implementation guide (22 stories) | ✅ 100% | — |
| User journeys funcionais | ✅ 100% | — |
| Schema investigation (Winston) | 🟡 Spec entregue, aguarda Winston responder 8 Q's | — |
| Figma hi-fi (2 de 8) | 🟡 bloqueado | Rate limit Starter plan (ou upgrade) |
| Figma Variables (design tokens) | ⬜ 0% | Rate limit |
| Figma component library | ⬜ 0% | Rate limit |

---

## 🛣️ COMO CONTINUAR

### Cenário A — "Quero começar Fase A amanhã (implementação)"
**Ordem de leitura:**
1. `DESIGN-SYSTEM.md` — entender alma
2. `09-implementation-guide.md` Fase A (10 stories, 16h estimadas)
3. `06-i18n-strings.md` pra copy PT-BR
4. `01-design-tokens.md` pra tokens Tailwind

**Não depende de:** Figma hi-fi · Winston schema · Fases B/C/D

### Cenário B — "Quero refinar a spec antes de codar"
**Ordem de leitura:**
1. `10-modes-user-journeys.md` — jornada funcional completa + crítica multi-lens
2. `redesign-proposal.md` v0.3 — decisões canônicas §13
3. `SPEC-REVIEW-FINAL.md` — 28 gaps (4 blockers fechados, 9 highs + 15 mediums/lows abertos)
4. Identificar que decisões quer ajustar

### Cenário C — "Quero mudar a Player HQ significativamente"
**Leia:** último turno da sessão atual onde listei o que é **Flexível / Semi-rígido / Rígido / Livre** antes de decidir escopo. Está registrado na conversa anterior. Resumo:
- Flexível: layout, surfaces dentro de `journey`, copy — não interfere
- Semi-rígido: cortar/expandir mini-wiki — retrabalho moderado em M1 schema
- Rígido: mudar mode enum, voltar watch, mudar rota `/journey` — cascata 8-12 docs
- Livre: tudo fora de `journey` (Mestre modes não afetados)

### Cenário D — "Quero subir pro Figma"
**Pré-req:** esperar rate limit resetar ou upgrade Figma Starter → Pro
**Depois:**
1. `figma-rebuild-script.md` — triagem emoji vs SVG + código pronto
2. Rebuild W0b + W1 com SVGs Lucide gold (Hammer, Swords, CalendarDays, etc)
3. Construir W0a, W2, W3, W4, W5, W6, W7, W8 (6 novos)
4. Criar Figma Variables (design tokens) + component library

### Cenário E — "Quero alimentar o Winston (architect)"
**Entregar pra ele:**
- `schema-investigation-winston.md` v2 (8 perguntas novas focadas em `player_notes` + backlinks parser)
- Confirmação de que `campaign_mind_map_edges` cobre quests atribuíveis
- Confirmar se `notes.tags[]`, `sessions.recap_body` já existem

---

## ❓ PERGUNTAS ABERTAS (pra retomar a conversa)

### Estrategicas
- **Q-STR-1:** "Mudança completa na Player HQ" que Dani mencionou — qual é o escopo real? Refino, reescopo ou reconceituação?
- **Q-STR-2:** Figma: esperar rate limit (24h) ou upgrade?
- **Q-STR-3:** Fase A pode começar amanhã ou querer alinhar mais antes?

### Técnicas (pro Winston responder)
- **Q-WIN-1:** `player` como source_type no graph — refere a `auth.users.id`, `characters.id` ou `campaign_members.id`?
- **Q-WIN-2:** `player_notes` dual-auth (user_id XOR session_token_id) seguindo mig 069?
- **Q-WIN-3:** Backlinks `@` parser — frontend, trigger Postgres, ou worker async?
- **Q-WIN-4:** Performance de queries polimórficas em `campaign_mind_map_edges` (50+ NPCs × 20+ quests)
- **Q-WIN-5:** Anon player no graph (sem `auth.users.id`)
- **Q-WIN-6:** `encounter` como source pra "Cena" panel de Rodar Combate — usar `participated_in` ou novo `in_scene`?
- **Q-WIN-7:** Policy de broken links quando entidade é deletada (remove chip? flag?)
- **Q-WIN-8:** Criar component `<EntityAttachmentChips>` reutilizável?

### UX (decisões pendentes)
- **Q-UX-1:** Broken link policy em notas (NPC deletada citada em recap passado) — remove, "???", ou flag?
- **Q-UX-2:** Auto-gerar rascunho de recap com events do combate (v2.0+)?
- **Q-UX-3:** Banner "combate iniciado" pro Jogador — PWA push automático ou opt-in?
- **Q-UX-4:** Template de notas pro Jogador (v1.5)?
- **Q-UX-5:** Notificação "recap publicado" — in-app + push ou só in-app?

---

## 🎁 BÔNUS — comandos úteis pra retomar

### Rodar dev com flag nova
```bash
NEXT_PUBLIC_CAMPAIGN_HQ_V2=true npm run dev
```

### Abrir a pasta no VS Code
```bash
cd "c:/Projetos Daniel/projeto-rpg" && code "_bmad-output/qa/evidence/campaign-audit-2026-04-21"
```

### Ver changelog da sessão atual
```bash
cat "_bmad-output/qa/evidence/campaign-audit-2026-04-21/00-INDEX.md" | grep -A 20 "Changelog"
```

### Conferir decisões travadas
```bash
grep -n "^[0-9]\+\. ✅" "_bmad-output/qa/evidence/campaign-audit-2026-04-21/redesign-proposal.md"
```

---

## 🎭 CRÉDITOS DA SESSÃO

**Party mode com:**
- Sally (UX Designer) — diagnóstico, IA, DS master, wireframes
- Mary (Analyst) — competitive Notion/Obsidian/Roll20/Foundry, brand
- Winston (Architect) — schema, migrations, rotas, entity graph reuse
- John (PM) — JTBD, métricas, roadmap, escopo MVP vs v1.5
- Quinn (QA) — test-spec Playwright, evidência
- Blind Hunter — review "Mestre iniciante"
- Edge Case Hunter — cenários de quebra
- Acceptance Auditor — tracking F-01 a F-24

**Agents paralelos (Onda 1):**
- Agent A: Design tokens + Component library
- Agent B: Interactions + States catalog
- Agent C: i18n + Accessibility + Edge cases
- Spec Auditor final (adversarial review do pacote completo)

**Decisor único:** Dani Roscoe

---

**Fim do handoff. Próxima janela pode começar lendo este arquivo + `00-INDEX.md`.**
