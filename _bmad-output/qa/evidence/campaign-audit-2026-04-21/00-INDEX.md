# Campaign HQ Redesign — Pacote Completo de Spec

**Data:** 2026-04-21
**Versão:** v1.0 (consolidada)
**Projeto:** Pocket DM — Campaign HQ Redesign
**Owner:** Dani (`danielroscoe97@gmail.com`)
**Status:** Spec pronta pra implementação. Schema Winston aguarda revisão. Figma 2 de 8 wireframes.

---

## 🗺️ Mapa por papel

### 👤 Dev que vai implementar
**Leia nesta ordem:**
1. [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) — alma do produto + princípios
2. [09-implementation-guide.md](./09-implementation-guide.md) — 22 stories, 4 fases, file paths
3. [01-design-tokens.md](./01-design-tokens.md) — Tailwind + CSS vars
4. [02-component-library.md](./02-component-library.md) — 20 componentes com props/states
5. [03-interactions-spec.md](./03-interactions-spec.md) — 12 microinterações frame-by-frame
6. [04-states-catalog.md](./04-states-catalog.md) — empty/loading/error por surface×role
7. [06-i18n-strings.md](./06-i18n-strings.md) — ~180 chaves PT-BR × EN
8. [07-accessibility-spec.md](./07-accessibility-spec.md) — ARIA + keyboard + contrast
9. [08-edge-cases-catalog.md](./08-edge-cases-catalog.md) — ~40 cenários

### 🎨 Designer que vai fazer hi-fi Figma
**Leia nesta ordem:**
1. [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) — voice, mood, princípios, regras de ouro
2. [05-responsive-spec.md](./05-responsive-spec.md) — 8 wireframes ASCII em 3 breakpoints
3. [01-design-tokens.md](./01-design-tokens.md) — paleta, tipografia, spacing
4. [02-component-library.md](./02-component-library.md) — componentes a construir
5. [03-interactions-spec.md](./03-interactions-spec.md) — motion
6. `screenshots/` — 16 PNGs de evidência da auditoria

### 📋 PM / Product manager
**Leia nesta ordem:**
1. [findings.md](./findings.md) — 24 problemas documentados
2. [redesign-proposal.md](./redesign-proposal.md) v0.2 — visão + jobs + decisões
3. [redesign-proposal-review.md](./redesign-proposal-review.md) — review adversarial
4. [09-implementation-guide.md](./09-implementation-guide.md) §cronograma + métricas
5. [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) §11 evolution roadmap

### 🧪 QA que vai testar
**Leia nesta ordem:**
1. [test-spec.md](./test-spec.md) — como a auditoria foi feita
2. [findings.md](./findings.md) — o que foi encontrado
3. [03-interactions-spec.md](./03-interactions-spec.md) — cenários de teste automatizados
4. [04-states-catalog.md](./04-states-catalog.md) — states a validar
5. [08-edge-cases-catalog.md](./08-edge-cases-catalog.md) — checklist pré-deploy
6. [07-accessibility-spec.md](./07-accessibility-spec.md) — a11y tests

### 🏗 Winston (Architect) — schema
**Urgente:**
1. [schema-investigation-winston.md](../../architecture/schema-investigation-winston.md) — 8 perguntas + 6 migrations propostas
2. [09-implementation-guide.md](./09-implementation-guide.md) §Fase C — o que depende

---

## 📂 Inventário completo

### Auditoria original (Fase 1-2)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| [test-spec.md](./test-spec.md) | 6.6 KB | Como a auditoria Playwright foi feita |
| [findings.md](./findings.md) | 14.6 KB | 24 findings (4 🔴 blockers, 7 🟠 highs, 10 🟡 mediums, 3 🔵 lows) |
| [screenshots/](./screenshots/) | 16 PNGs | Evidência visual (Mestre + Player, desktop + mobile) |

### Visão e proposta (Fase 3-4)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| [redesign-proposal.md](./redesign-proposal.md) | 51.7 KB | v0.2 spec source-of-truth: JTBD, IA modes+surfaces, 8 wireframes ASCII, killer-features, 20 decisões travadas |
| [redesign-proposal-review.md](./redesign-proposal-review.md) | 19.6 KB | Review adversarial 4 lentes (Blind Hunter, Edge Case, Acceptance, Design Critic) |

### Design system (Onda 1 + master)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| **[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)** | **40.3 KB** | **Doc-mestre: manifesto, 7 princípios, voice & tone, linguagem visual, patterns, 10 mandamentos, roadmap** |
| [01-design-tokens.md](./01-design-tokens.md) | 22.6 KB | Tokens atômicos: cores, tipografia, spacing, radii, shadows, motion, breakpoints, z-index |
| [02-component-library.md](./02-component-library.md) | 48.0 KB | 20 componentes (primitives + composite + domain) com props, variants, states |

### Comportamento (Onda 1)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| [03-interactions-spec.md](./03-interactions-spec.md) | 41.6 KB | 12 interações frame-by-frame (mode switch, @-autocomplete, handout drop, reconexão, etc) |
| [04-states-catalog.md](./04-states-catalog.md) | 29.0 KB | 21 surfaces × 4 states (empty/loading/error/full) com copy PT-BR final |

### Resiliência (Onda 1 + Onda 2)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| [05-responsive-spec.md](./05-responsive-spec.md) | 38.2 KB | 8 wireframes ASCII × 3 breakpoints = 24 combinações |
| [06-i18n-strings.md](./06-i18n-strings.md) | 49.7 KB | ~180 chaves PT-BR × EN, organizadas em 16 namespaces |
| [07-accessibility-spec.md](./07-accessibility-spec.md) | 20.6 KB | ARIA roles, tab order, keyboard shortcuts, contraste WCAG AA |
| [08-edge-cases-catalog.md](./08-edge-cases-catalog.md) | 23.7 KB | ~40 cenários em 10 categorias (offline, arquivada, overflow, SSR, SRD) |

### Execução (Onda 2 + infra)
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| [09-implementation-guide.md](./09-implementation-guide.md) | 24.4 KB | 22 stories em 4 fases, ~25 dias de dev, file paths, risk register |
| [figma-rebuild-script.md](./figma-rebuild-script.md) | 4.0 KB | Script pronto pra rebuild dos wireframes quando Figma destravar |
| [../../architecture/schema-investigation-winston.md](../../architecture/schema-investigation-winston.md) | — | Spec pro Winston: 8 perguntas, 6 migrations propostas |

**Total da pasta:** 435+ KB de spec denso, ~5.500 linhas de documento.

---

## 🎯 Tl;DR do redesign

### Problema diagnosticado
24 findings. Campanha HQ tem pill bar de 13 abas que esconde **10 de 13 no mobile** (1157px overflow). Mestre HQ e Player HQ usam modelos incompatíveis. 4 níveis de navegação competindo. `campaign.player_hq_button` RAW na UI.

### Solução proposta
**3 modes pro Mestre (Preparar / Rodar / Recap)** + **2 modes pro Player (Minha Jornada / Assistindo)**, com shell unificado, sidebar vertical desktop + bottom tab mobile, busca rápida `Ctrl+K`, backlinks `@nome` killer-feat.

### Rumo visual (Grimório)
Dark + gold evocando manuscrito iluminado. Serif (Cinzel) **só** em nomes próprios. SVG Lucide gold em tudo funcional. Emojis preservados em decoração narrativa (🎉 🎯 ⚡). Density budget rigoroso.

### Plano de ataque
- **Fase A (2-3 dias):** 8 quick wins matam 🔴 blockers + 🟠 highs sem refactor
- **Fase B (1 sprint):** Shell novo + Preparar behind flag `CAMPAIGN_HQ_V2`
- **Fase C (2 sprints):** Rodar + Recap + 4 killer-features (backlinks, tags, permissões, handouts)
- **Fase D (1 sprint):** Remove V1, cleanup, busca rápida expandida

**Total: ~25 dias de dev focado.**

---

## ✅ Decisões travadas

**22 decisões** em [redesign-proposal.md §13](./redesign-proposal.md). Destaques:

1. Eliminar pill bar horizontal
2. Shell unificado Mestre + Player
3. Mode é stateless derivado do server (nunca localStorage)
4. Matriz explícita surface × auth (Guest / Anônimo / Auth)
5. Read-only lock em Prep/Recap durante combate
6. Vocabulário PT-BR na UI (Preparar / Rodar / Recap)
7. Ctrl+K primário (Windows)
8. Rotas EN: `/prep`, `/run`, `/recap`
9. Player anônimo vê Minha Jornada light
10. Mode switcher vertical desktop + bottom tab mobile
11. Tour dismissable com "Pular" visível
12. Backlinks `@nome` primário
13. Density budget: ≤8 elementos above-fold
14. Serif só em nomes próprios
15. SVG gold em sistema / emoji em narrativa (mix)
16. 4 killer-features committed (backlinks, tags, permissões, handouts)
17-20. Tipografia, soundboard, tokens, contribution workflow
21. **Mode enum e labels canônicos:** `type Mode = 'prep' | 'run' | 'recap' | 'journey' | 'watch'` (EN). UI labels: "Preparar Sessão" / "Rodar Combate" / "Recaps" / "Minha Jornada" / "Assistindo"
22. **HP tiers canônicos** (legacy thresholds): FULL 100% · LIGHT 70-100% · MODERATE 40-70% · HEAVY 10-40% · CRITICAL 0-10%. Labels EN nos 2 locales. Source: `lib/utils/hp-status.ts`

---

## 🚦 Estado de prontidão

| Componente | Status | Bloqueador |
|---|---|---|
| Spec de UX | ✅ 100% + 4 blockers fechados | — |
| Design system | ✅ 100% | — |
| Tokens / Tailwind config | ✅ 100% | — |
| Component library doc | ✅ 100% | — |
| Interações | ✅ 100% | — |
| States catalog | ✅ 100% | — |
| i18n | ✅ 100% | — |
| Acessibilidade | ✅ 100% | — |
| Edge cases | ✅ 100% | — |
| Implementation guide | ✅ 100% | — |
| Responsive wireframes ASCII | ✅ 100% | — |
| Figma wireframes (hi-fi) | 🟡 25% (2 de 8) | Rate limit Starter plan |
| Figma Variables (design tokens) | ⬜ 0% | Rate limit |
| Figma component library | ⬜ 0% | Rate limit |
| Schema (Winston) | 🟡 Spec entregue, aguarda review | Winston responder Q1-Q8 |

---

## 📞 Próximos passos sugeridos

**Agora (sem bloqueio):**
1. Fase A pode começar imediatamente — todas 8 stories têm AC
2. Winston revisa `schema-investigation-winston.md` em paralelo

**Quando Figma destravar:**
3. Criar Design Tokens como Figma Variables
4. Rebuildar W0b + W1 com SVGs gold (script pronto)
5. Construir W0a + W2 + W3 + W4 + W5 + W6 + W7 + W8 (6 novos)
6. Criar component library no Figma

**Depois da Fase A shipar:**
7. Kick-off Fase B com os 5 Mestres beta
8. Métricas setup (PostHog/Mixpanel)

---

## 🎉 Créditos

**Party mode session 2026-04-21:**
- **Sally (UX Designer)** — diagnóstico, IA, wireframes, DS master
- **John (PM)** — JTBD, métricas, roadmap
- **Mary (Analyst)** — competitive Notion/Obsidian/Roll20/Foundry, brand positioning
- **Winston (Architect)** — schema, migrations, rotas, rollback
- **Quinn (QA)** — test-spec Playwright, evidência
- **Blind Hunter** — review "Mestre iniciante"
- **Edge Case Hunter** — 10 cenários de quebra
- **Acceptance Auditor** — tracking F-01 a F-24

**Agents paralelos** (Onda 1): Agent A (DS + components), Agent B (interactions + states), Agent C (i18n + a11y + edge cases).

**Ownership:** Dani Roscoe (`danielroscoe97@gmail.com`) decidiu e travou todas as 20 decisões.

---

**Este INDEX é living document. Atualize conforme novos docs entram ou decisões mudam.**

**Changelog:**
- 2026-04-21 v1.0 — Primeira versão publicada. 15 docs, 435 KB.
- 2026-04-21 v1.1 — Spec review adversarial final rodado. 28 gaps catalogados em `SPEC-REVIEW-FINAL.md`. 4 blockers + 2 findings órfãos (F-20, F-23) fechados. Decisões canônicas #21 (mode enum + labels) e #22 (HP tiers) travadas pelo Dani.
- 2026-04-21 v1.2 — Descobertas grandes: (1) entity graph `campaign_mind_map_edges` já existe com 9 entidades × 18 rels polimórficos (migrações 080+148+152+154); spec-winston reduzida de 6 migrations pra 1 (`player_notes`). (2) Watch mode removido — Jogador tem 1 mode (`journey`) com banner "Entrar no Combate". (3) Player wiki adicionada (markdown + tags MVP, backlinks v1.5). (4) Decisões #23 (remover watch), #24 (player wiki), #25 (quests via graph), #26 (modes separados por papel) travadas. (5) Regra imutável "Mestre nunca DM" travada + aplicada via sed em 351 ocorrências em 16 docs. (6) Novo doc `10-modes-user-journeys.md` com jornada funcional completa + crítica multi-lens.
