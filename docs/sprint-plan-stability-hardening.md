# Sprint Plan: Stability & Hardening Roadmap

> **Objetivo:** Sequência de execução dos 3 horizontes, com sprints priorizados e dependências claras.
> **Data:** 2026-03-30
> **Referência:** architecture-evolution-roadmap.md + 13 quick specs

---

## Visão Geral

```
Sprint 1  ──► Sprint 2  ──► Sprint 3  ──► Sprint 4  ──► Sprint 5  ──► Sprint 6  ──► Sprint 7  ──► Sprint 8+
Security     E2E           RLS +         Background    Bundle +      Multi-       Edge          API, AI,
+ Guest      Critical      Audio         Jobs          PWA           System       Functions     Homebrew
~10h         ~8h           ~9h           ~8h           ~18h          ~8h          ~10h          ~58h
```

---

## HORIZONTE 1 — Estabilidade

### Sprint 1: Security Hardening + Guest Hard Block (~10h)

**Quick specs:** `quick-spec-security-hardening.md` + `quick-spec-guest-hard-block.md`

**Por que primeiro:** Sem rate limiting, endpoints estão expostos. Sem guest hard block, funil de conversão não existe. São pré-requisitos para qualquer tração real.

| # | Story | Spec | Estimativa | Dependência |
|---|-------|------|------------|-------------|
| 1.1 | Rate limiting em todos os API endpoints | security-hardening S1 | 2h | Nenhuma |
| 1.2 | ErrorBoundary em todas as rotas | security-hardening S2 | 2h | Nenhuma |
| 1.3 | Database indexes V2 (migration 040) | security-hardening S3 | 1h | Nenhuma |
| 1.4 | Security headers audit | security-hardening S4 | 1h | Nenhuma |
| 1.5 | Guest store enforcement (block após 60min) | guest-hard-block S1 | 1.5h | Nenhuma |
| 1.6 | Modal de conversão (expiry) | guest-hard-block S2 | 1.5h | 1.5 |
| 1.7 | State migration pós-signup | guest-hard-block S3 | 1.5h | 1.6 |
| 1.8 | Analytics de conversão guest | guest-hard-block S4 | 0.5h | 1.5 |

**Paralelismo:** Stories 1.1-1.4 são independentes (podem rodar em paralelo). Stories 1.5-1.8 são sequenciais.

**Definition of Done:**
- [ ] Todos os 12 endpoints (exceto Stripe webhook) têm rate limiting
- [ ] Toda rota de página tem error boundary
- [ ] Migration 040 aplicada sem erro
- [ ] Security headers nota A no securityheaders.com
- [ ] Guest mode bloqueia ações após 60 min
- [ ] Modal de conversão aparece e é blocking
- [ ] Estado guest preservado para migração pós-signup

---

### Sprint 2: E2E Critical Journeys (~8h)

**Quick spec:** `quick-spec-e2e-critical-journeys.md`

**Por que segundo:** Dá confiança para todas as mudanças futuras. Sem E2E, qualquer sprint pode quebrar silenciosamente uma jornada crítica.

| # | Story | Estimativa | Dependência |
|---|-------|------------|-------------|
| 2.1 | Setup infra E2E (config, fixtures, helpers) | 2h | Nenhuma |
| 2.2 | Jornada Rafael — DM happy path | 1.5h | 2.1 |
| 2.3 | Jornada Rafael — DM reconnect | 1h | 2.1 |
| 2.4 | Jornada Camila — Player view mobile | 1.5h | 2.1 |
| 2.5 | Jornada Guest — Try mode | 1h | 2.1 |
| 2.6 | CI integration (Playwright no pipeline) | 1h | 2.2-2.5 |

**Paralelismo:** Stories 2.2-2.5 são independentes (podem rodar em paralelo após 2.1).

**Definition of Done:**
- [ ] 4 jornadas cobertas com E2E determinísticos
- [ ] Zero flaky tests
- [ ] CI roda E2E automaticamente (ou manual trigger)
- [ ] Screenshots em caso de falha

---

### Sprint 3: RLS Battle-Testing + Audio Validation (~9h)

**Quick specs:** `quick-spec-rls-battle-testing.md` + `quick-spec-audio-validation.md`

**Por que terceiro:** Valida segurança do sistema de campanhas (V2) e confirma que feature de áudio funciona de verdade.

| # | Story | Spec | Estimativa | Dependência |
|---|-------|------|------------|-------------|
| 3.1 | Testes de isolamento por role (15+ cenários) | rls S1 | 2.5h | Nenhuma |
| 3.2 | Testes SECURITY DEFINER (7 cenários) | rls S2 | 1.5h | Nenhuma |
| 3.3 | Broadcast sanitization E2E (8 cenários) | rls S3 | 1.5h | Sprint 2 done |
| 3.4 | Script audit-rls.ts | rls S4 | 1h | Nenhuma |
| 3.5 | Validação arquivos de áudio (script) | audio S1 | 0.5h | Nenhuma |
| 3.6 | Validação audio presets vs arquivos | audio S2 | 0.5h | 3.5 |
| 3.7 | Broadcast áudio E2E (DM→Player) | audio S3 | 1h | Sprint 2 done |
| 3.8 | Mobile autoplay validation | audio S4 | 0.5h | 3.7 |

**Definition of Done:**
- [ ] Zero vazamento de dados cross-session/campaign
- [ ] accept_campaign_invite race condition testada
- [ ] dm_notes nunca acessível por player
- [ ] 64 arquivos de áudio validados (únicos, não placeholders)
- [ ] Broadcast áudio funciona DM→Player
- [ ] Autoplay funciona no mobile (com unlock)

---

## HORIZONTE 2 — Robustez

### Sprint 4: Background Jobs — Trigger.dev (~8h)

**Quick spec:** `quick-spec-background-jobs.md`

| # | Story | Estimativa |
|---|-------|------------|
| 4.1 | Setup Trigger.dev | 1h |
| 4.2 | Cleanup sessões antigas | 1.5h |
| 4.3 | Cleanup guest data | 1h |
| 4.4 | Trial expiry check + Novu notification | 1.5h |
| 4.5 | Campaign invite expiry | 0.5h |
| 4.6 | Analytics aggregation + migration analytics_daily | 1.5h |
| 4.7 | SRD bundle regeneration (triggered) | 1h |

---

### Sprint 5: Bundle Optimization + PWA (~18h)

**Quick specs:** `quick-spec-bundle-optimization.md` + `quick-spec-pwa-service-worker.md`

| # | Story | Spec | Estimativa |
|---|-------|------|------------|
| 5.1 | Bundle audit baseline | bundle S1 | 1h |
| 5.2 | Lazy loading SRD por versão | bundle S2 | 2h |
| 5.3 | Code splitting por feature | bundle S3 | 2h |
| 5.4 | Search provider abstraction | bundle S4 | 1h |
| 5.5 | Web App Manifest + ícones | pwa S1 | 2h |
| 5.6 | Service Worker — app shell caching | pwa S2 | 4h |
| 5.7 | Offline combat actions queue | pwa S3 | 4h |
| 5.8 | Install prompt estratégico | pwa S4 | 2h |

---

### Sprint 6: Multi-System Refactor (~8h)

**Quick spec:** `quick-spec-multi-system.md`

| # | Story | Estimativa |
|---|-------|------------|
| 6.1 | Interface GameSystem + types | 2h |
| 6.2 | Extrair D&D 5e para dnd5eSystem | 3h |
| 6.3 | useGameSystem() hook + refactor consumers | 2h |
| 6.4 | Session system field (migration 042) | 1h |

---

### Sprint 7: Edge Functions (~10h)

**Quick spec:** `quick-spec-edge-functions-validation.md`

| # | Story | Estimativa |
|---|-------|------------|
| 7.1 | Channels duplos + Edge Function de broadcast | 4h |
| 7.2 | Validação de regras server-side | 2h |
| 7.3 | Rate limiting por channel | 1h |
| 7.4 | Migration path (dual mode → feature flag → full) | 3h |

---

## HORIZONTE 3 — Plataforma

### Sprint 8+: API Pública (~16h)
**Quick spec:** `quick-spec-api-publica.md`

### Sprint 9+: AI Session Intelligence (~14h)
**Quick spec:** `quick-spec-ai-session-intelligence.md`

### Sprint 10+: Homebrew Marketplace (~20h, 3 fases)
**Quick spec:** `quick-spec-homebrew-marketplace.md`

---

## Métricas de Progresso

| Marco | Quando | Signal de sucesso |
|-------|--------|-------------------|
| Sprint 1 done | Semana 1 | 0 endpoints sem rate limit, funil guest ativo |
| Sprint 2 done | Semana 2 | 4 jornadas E2E passando no CI |
| Sprint 3 done | Semana 3 | 0 vazamentos RLS, áudio validado |
| H1 completo | Semana 3 | Produto estável e seguro para tração |
| Sprint 5 done | Mês 2 | PWA instalável, funciona offline |
| H2 completo | Mês 3 | Robustez para 10x users |
| H3 iniciado | Mês 4+ | API pública, multi-system, marketplace |

---

## Regras de Execução

1. **Não pular sprint.** A sequência é intencional — cada sprint depende dos anteriores.
2. **Definition of Done rigoroso.** Todos os checkboxes marcados antes de avançar.
3. **E2E protege tudo.** Após Sprint 2, todo sprint novo deve manter E2E passando.
4. **Documentar decisões.** Cada sprint gera report em `docs/sprint-{tipo}-{data}.md`.
5. **Perguntar quando em dúvida.** Specs são guias, não mandamentos — adaptar conforme aprendizados.

---

## Data de criação
2026-03-30
