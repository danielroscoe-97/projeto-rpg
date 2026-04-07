# Pocket DM — Índice Mestre de Documentação

> **Consulte este arquivo PRIMEIRO** para encontrar qualquer informação do projeto.
> Última atualização: 2026-03-30

---

## Documentos Fundacionais (ler primeiro)

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [project-context.md](../_bmad-output/project-context.md) | Contexto técnico para agentes AI — regras, stack, broadcast events, estrutura | atual |
| [prd.md](../_bmad-output/planning-artifacts/prd.md) | Product Requirements Document (V1 MVP) | snapshot-v1 |
| [architecture.md](../_bmad-output/planning-artifacts/architecture.md) | Arquitetura técnica (DB, auth, realtime, SRD) | precisa-revisão |
| [ux-design-specification.md](../_bmad-output/planning-artifacts/ux-design-specification.md) | Especificação UX (dual-surface, princípios, anti-patterns) | atual |
| [epics.md](../_bmad-output/planning-artifacts/epics.md) | Lista de épicos V2 (9 épicos, 41 stories) | atual |
| [epics-v2-stories.md](../_bmad-output/planning-artifacts/epics-v2-stories.md) | Stories detalhadas V2 (AC, migrations, i18n keys) | atual |
| [product-brief-projeto-rpg-2026-03-23.md](../_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md) | Product brief original | snapshot |
| [prd-validation-report.md](../_bmad-output/planning-artifacts/prd-validation-report.md) | Relatório de validação do PRD | snapshot |
| [implementation-readiness-report-2026-03-24.md](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-24.md) | Checklist de prontidão para implementação | snapshot |
| [story-dependency-map.md](../_bmad-output/planning-artifacts/story-dependency-map.md) | Mapa de dependências entre stories | atual |

---

## Produto e Negócio

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [brand-guide.md](brand-guide.md) | Guia de marca Pocket DM (logo, cores, tipografia, tom) | atual |
| [monetization-strategy.md](monetization-strategy.md) | Estratégia freemium (Pro R$14,90/mês, feature flags) | draft |
| [analytics-funnel-strategy.md](analytics-funnel-strategy.md) | Funil de conversão + queries SQL (Supabase analytics_events) | atual |
| [analytics-technical-spec.md](analytics-technical-spec.md) | Spec técnico de analytics (eventos, tracking) | atual |
| [competitive-analysis-masterapp-2026-03-30.md](competitive-analysis-masterapp-2026-03-30.md) | Análise competitiva MasterApp | atual |
| [market-research-ttrpg-2026.md](market-research-ttrpg-2026.md) | Pesquisa de mercado TTRPG 2026 (tamanho, concorrentes, pricing, pain points) | atual |
| [competitive-moats-strategy.md](competitive-moats-strategy.md) | 5 moats defensáveis, vulnerabilidades, playbook por cenário | atual |
| [value-proposition-canvas.md](value-proposition-canvas.md) | Value proposition por persona (DM, Player, Guest), messaging, anti-propostas | atual |

---

## Regras de Negócio (IMUTÁVEIS)

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [hp-status-tiers-rule.md](hp-status-tiers-rule.md) | Tiers LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — NUNCA alterar | atual |
| [monster-token-fallback-rules.md](monster-token-fallback-rules.md) | Cascata de fallback para tokens de monstro (100% coverage) | atual |

---

## Design e Visual

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [rpg-visual-language-spec.md](rpg-visual-language-spec.md) | 8 componentes visuais RPG (fire, torch, parchment, rune...) | atual |
| [rpg-visual-architecture.md](rpg-visual-architecture.md) | Arquitetura de componentes visuais RPG (APIs, file structure) | atual |
| [ux-mobile-lp-redesign.md](../_bmad-output/planning-artifacts/ux-mobile-lp-redesign.md) | Redesign mobile da landing page | atual |

---

## Estratégia e Evolução

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [sprint-plan-stability-hardening.md](sprint-plan-stability-hardening.md) | Sprint plan completo: 10 sprints priorizados, stories, estimativas, dependências | atual |
| [architecture-evolution-roadmap.md](architecture-evolution-roadmap.md) | Roadmap de evolução arquitetural (3 horizontes: estabilidade, robustez, plataforma) | atual |
| [quick-spec-pwa-service-worker.md](quick-spec-pwa-service-worker.md) | H2.1 — PWA, service worker, offline combat queue, install prompt | pendente |
| [quick-spec-edge-functions-validation.md](quick-spec-edge-functions-validation.md) | H2.2 — Sanitização server-side via Supabase Edge Functions | pendente |
| [quick-spec-background-jobs.md](quick-spec-background-jobs.md) | H2.3 — 7 Trigger.dev jobs (cleanup, trial, analytics, invites, SRD regen) | pendente |
| [quick-spec-bundle-optimization.md](quick-spec-bundle-optimization.md) | H2.4 — Lazy load SRD, code splitting, search provider abstraction | pendente |
| [quick-spec-api-publica.md](quick-spec-api-publica.md) | H3.1 — API REST pública v1 (SRD, sessions, SSE, webhooks, Swagger) | pendente |
| [quick-spec-multi-system.md](quick-spec-multi-system.md) | H3.2 — Interface GameSystem, extração D&D 5e, preparação PF2e | pendente |
| [quick-spec-homebrew-marketplace.md](quick-spec-homebrew-marketplace.md) | H3.3 — Homebrew sharing, coleção, fork, marketplace pago (3 fases) | pendente |
| [quick-spec-ai-session-intelligence.md](quick-spec-ai-session-intelligence.md) | H3.4 — Oracle context-aware, tactical hints, session recap, leaderboard | pendente |

---

## Stack Técnico

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [tech-stack-libraries.md](tech-stack-libraries.md) | Todas as libs disponíveis com exemplos e regras para agentes | atual |
| [test-accounts.md](test-accounts.md) | Credenciais de teste para QA em produção | atual |

---

## Épicos e PRDs

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [prd-v2.md](prd-v2.md) | PRD V2 completo | atual |
| [prd-stabilization-simplification.md](prd-stabilization-simplification.md) | PRD de estabilização (bugs, UX fixes) | concluído |
| [epics-and-sprints-spec.md](epics-and-sprints-spec.md) | Framework de épicos e sprints | atual |
| [epics-stabilization-simplification.md](epics-stabilization-simplification.md) | Épico de estabilização (3 sub-épicos, 14 stories) | concluído |
| [epic-campaign-dual-role.md](epic-campaign-dual-role.md) | Épico dual-role DM+Player (6 sub-épicos, 24 stories) | atual |
| [epic-campaign-dual-role-addendum.md](epic-campaign-dual-role-addendum.md) | Adendo com 7 correções arquiteturais + 7 UX refinements | atual |
| [epic-5-sprint-report.md](epic-5-sprint-report.md) | Relatório do épico 5 (monetização) | concluído |
| [epic-9-guided-onboarding.md](../_bmad-output/planning-artifacts/epic-9-guided-onboarding.md) | Épico 9: Guided onboarding tour | concluído |
| [epic-10-content-import-engine.md](../_bmad-output/planning-artifacts/epic-10-content-import-engine.md) | Épico 10: Engine de import de conteúdo | atual |
| [v2-sprint-2-deferred-stories.md](v2-sprint-2-deferred-stories.md) | Stories diferidas do sprint V2-2 | referência |

---

## Quick Specs (Features)

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [quick-spec-combat-ux-batch2.md](quick-spec-combat-ux-batch2.md) | 9 melhorias de combat UX (timers, conditions, groups) | concluído |
| [quick-spec-combat-ux-fixes.md](quick-spec-combat-ux-fixes.md) | 5 fixes de combat (dice history, defeat, spacebar) | aprovado |
| [quick-spec-dm-soundboard.md](quick-spec-dm-soundboard.md) | DM audio soundboard (9 ambient + 10 SFX) | pendente |
| [quick-spec-rejoin-dm-approval.md](quick-spec-rejoin-dm-approval.md) | Reconexão de jogador com aprovação do DM | concluído |
| [quick-spec-player-death-saves.md](quick-spec-player-death-saves.md) | Death saves para jogadores | em-progresso |
| [quick-spec-security-hardening.md](quick-spec-security-hardening.md) | Rate limiting, ErrorBoundary, indexes, security headers | pendente |
| [quick-spec-e2e-critical-journeys.md](quick-spec-e2e-critical-journeys.md) | Playwright E2E para 4 jornadas críticas do PRD | pendente |
| [quick-spec-guest-hard-block.md](quick-spec-guest-hard-block.md) | Enforce 60min guest limit + modal conversão + state migration | pendente |
| [quick-spec-rls-battle-testing.md](quick-spec-rls-battle-testing.md) | Testes de isolamento RLS, SECURITY DEFINER, broadcast sanitization | pendente |
| [quick-spec-audio-validation.md](quick-spec-audio-validation.md) | Validação de áudio, broadcast E2E, mobile autoplay | pendente |
| [spec-M1.1-oracle-modal-mobile-fix.md](spec-M1.1-oracle-modal-mobile-fix.md) | Fix do oracle modal no mobile | referência |
| [spec-M1.2-player-dm-notes.md](spec-M1.2-player-dm-notes.md) | DM notes no player view | referência |
| [spec-M2-campaign-experience.md](spec-M2-campaign-experience.md) | Experiência de campanha | referência |
| [spec-M3-engagement-analytics.md](spec-M3-engagement-analytics.md) | Analytics de engajamento | referência |

### Quick Specs (subfolder)

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [epic-1-integridade-acessibilidade.md](quick-specs/epic-1-integridade-acessibilidade.md) | 6 stories de acessibilidade e integridade | pendente |
| [epic-2-consistencia-visual.md](quick-specs/epic-2-consistencia-visual.md) | 6 stories de consistência visual | pendente |
| [epic-3-polish-conversao.md](quick-specs/epic-3-polish-conversao.md) | 6 stories de polish e conversão | pendente |
| [fire-trail-full-page-spec.md](quick-specs/fire-trail-full-page-spec.md) | Pixel art fire trail para landing page | pendente |
| [items-compendium-spec.md](quick-specs/items-compendium-spec.md) | Spec do compêndio de itens | pendente |
| [lp-pricing-section-decisions.md](quick-specs/lp-pricing-section-decisions.md) | Decisões da seção de pricing na LP | referência |

---

## Sprint Reports

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [sprint-plan-2026-03-30.md](sprint-plan-2026-03-30.md) | Plano do sprint atual | em-progresso |
| [v2-sprint-2026-03-27.md](v2-sprint-2026-03-27.md) | Sprint V2: 19 stories, 3 streams (display names, billing, campaigns) | concluído |
| [b-stream-sprint-2026-03-27.md](b-stream-sprint-2026-03-27.md) | B-stream: 18 stories (combat, player UX, collaboration) | concluído |
| [sprint-3-streams-2026-03-27.md](sprint-3-streams-2026-03-27.md) | Sprint 3 streams paralelos | concluído |
| [sprint-final-stories-2026-03-27.md](sprint-final-stories-2026-03-27.md) | Stories finais do sprint | concluído |
| [sprint-audio-feedback-2026-03-28.md](sprint-audio-feedback-2026-03-28.md) | Sprint de audio feedback (3 sub-sprints, ~30h) | planejado |
| [sprint-stabilization-execution-report.md](sprint-stabilization-execution-report.md) | Relatório de execução da estabilização (12/14 stories) | concluído |
| [quality-sprint-2026-03-26.md](quality-sprint-2026-03-26.md) | Sprint de qualidade (5 streams paralelos) | planejado |
| [player-companion-sprint-2026-03-26.md](player-companion-sprint-2026-03-26.md) | Sprint de player companion | concluído |
| [items-compendium-sprint-2026-03-26.md](items-compendium-sprint-2026-03-26.md) | Sprint de compêndio de itens | planejado |
| [parallel-stream-srd-seo-parser-2026-03-28.md](parallel-stream-srd-seo-parser-2026-03-28.md) | Stream paralelo: SRD SEO + parser | concluído |

---

## QA e Testes

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [qa-audit-2026-03-27.md](qa-audit-2026-03-27.md) | Auditoria QA geral | concluído |
| [qa-e2e-results-2026-03-27.md](qa-e2e-results-2026-03-27.md) | Resultados E2E (Playwright) — dia 27 | concluído |
| [qa-e2e-results-2026-03-28.md](qa-e2e-results-2026-03-28.md) | Resultados E2E (Playwright) — dia 28 | concluído |
| [qa-mobile-e2e-report-2026-03-29.md](qa-mobile-e2e-report-2026-03-29.md) | E2E mobile report | concluído |
| [qa-journeys-matrix-2026-03-27.md](qa-journeys-matrix-2026-03-27.md) | Matriz de jornadas de teste | concluído |
| [qa-floating-cards-lock-focus.md](qa-floating-cards-lock-focus.md) | QA floating cards + lock focus | concluído |
| [qa-results-sprint-m1m2-2026-03-28.md](qa-results-sprint-m1m2-2026-03-28.md) | Resultados QA sprint M1/M2 | concluído |
| [qa-roteiro-sprint-m1m2-resilience-2026-03-28.md](qa-roteiro-sprint-m1m2-resilience-2026-03-28.md) | Roteiro QA resilience | concluído |
| [qa-resultados-sprint-m1m2-resilience-2026-03-28.md](qa-resultados-sprint-m1m2-resilience-2026-03-28.md) | Resultados QA resilience | concluído |
| [postmortem-e2e-failures-2026-03-27.md](postmortem-e2e-failures-2026-03-27.md) | Postmortem de falhas E2E | concluído |
| [ROTEIRO-TESTE-JORNADAS-CRITICAS.md](../_bmad-output/planning-artifacts/ROTEIRO-TESTE-JORNADAS-CRITICAS.md) | Roteiro de teste de jornadas críticas | atual |

---

## Discovery e Auditorias

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [discovery-audio-feedback-2026-03-28.md](discovery-audio-feedback-2026-03-28.md) | Discovery de áudio e feedback | concluído |
| [discovery-mobile-bugs-campaigns-2026-03-28.md](discovery-mobile-bugs-campaigns-2026-03-28.md) | Bugs mobile em campanhas | concluído |
| [bugfix-dashboard-welcome-loader-2026-04-07.md](bugfix-dashboard-welcome-loader-2026-04-07.md) | Welcome loader do dashboard passa a aparecer apenas na primeira entrada da sessão | concluído |
| [fix-guided-tour-mobile-2026-03-28.md](fix-guided-tour-mobile-2026-03-28.md) | Fix guided tour no mobile | concluído |
| [lp-mobile-party-mode-audit-2026-03-29.md](lp-mobile-party-mode-audit-2026-03-29.md) | Auditoria LP mobile + party mode | concluído |
| [mobile-audit-report.md](mobile-audit-report.md) | Relatório de auditoria mobile geral | concluído |
| [ux-audit-sprint-2026-03-26.md](ux-audit-sprint-2026-03-26.md) | Auditoria UX | concluído |
| [ux-bugfix-sprint-2026-03-27.md](ux-bugfix-sprint-2026-03-27.md) | Sprint de bugfix UX | concluído |
| [bucket-future-ideas.md](bucket-future-ideas.md) | Bucket de ideias futuras | referência |

---

## Prompts (Templates para Agentes)

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [PROMPT-doc-audit-agent.md](PROMPT-doc-audit-agent.md) | Prompt para auditoria documental | referência |
| [PROMPT-player-death-saves.md](PROMPT-player-death-saves.md) | Prompt para implementar death saves | referência |
| [prompt-fix-cat1-player-join.md](prompt-fix-cat1-player-join.md) | Prompt para fix player join | referência |
| [prompt-fix-failing-e2e.md](prompt-fix-failing-e2e.md) | Prompt para fix E2E failing | referência |
| [prompt-qa-agent-full-sweep.md](prompt-qa-agent-full-sweep.md) | Prompt para QA agent sweep | referência |
| [prompt-qa-sprint-audio-feedback.md](prompt-qa-sprint-audio-feedback.md) | Prompt para QA sprint audio | referência |
