# EPIC MÃE: Player Identity & Continuity

> **Status:** Aprovado para execução em big-bang (review adversarial 2026-04-19)
> **Prioridade:** Crítica — maior iniciativa de retenção/conversão do Q2
> **Origem:** Party Mode session 2026-04-19 (Dani_, John, Mary, Sally, Winston, Bob, Paige, Quinn)
> **Release strategy:** Big-bang (4 épicos filhos entram em produção juntos)
> **Sprint estimate total:** ~9-11 sprints (52-70 dias úteis somados)
> **Agentes principais:** Winston (arquitetura), Sally (UX), John (PM), Paige (copy), Quinn (QA), Bob (SM)

---

## Visão

A **Player Identity & Continuity** é a iniciativa que resolve o maior gargalo de produto identificado no Beta Test 3: players anônimos vivem uma sessão, saem da plataforma, e a experiência termina. Sem persistência de personagem, sem histórico, sem caminho para se tornar DM. Em 4 épicos encadeados, transformamos essa jornada ponta-a-ponta.

### Hipóteses (validadas por Dani_ em 2026-04-19)

| # | Hipótese | O que valida |
|---|---|---|
| **H1** | Reduzir atrito da próxima sessão do player | Player volta mais rápido porque entra já autenticado |
| **H2** | Retenção/conversão de anônimo em conta | Conta ganha lead, funil aquecido, possibilidade de upsell player→DM |
| **H3** | Continuidade narrativa: personagem, campanha, histórico persistem | Player sente que tem "progresso" — identificação emocional com o personagem sobrevive |

### Cenários principais cobertos

- **Cenário A:** guest em `/try` vira conta pós-recap, leva personagem (Épicos 01, 03)
- **Cenário B:** anon em `/join` vira conta na sala de espera ou pós-recap, mantém combate ativo (Épicos 01, 02, 03)
- **Cenário C:** player logado recebe invite de campanha NOVA, escolhe personagem standalone existente (cenário 5) (Épicos 01, 02)
- **Cenário D:** player logado, após N sessões, descobre que pode virar DM e convida amigos ex-companheiros (Épico 04)

---

## Arquitetura dos 4 Épicos Filhos

```
Épico 01 — Identity Foundation (BACKEND, invisível)
  │
  ├─ Schema (session_tokens.user_id, claimed_by_session_token, users enriquecido)
  ├─ upgradePlayerIdentity() via auth.updateUser (preserva UUID)
  ├─ migrateGuestCharacterToAuth()
  ├─ claimCampaignCharacter() + listClaimableCharacters() paginado
  └─ Glossário ubíquo (Story #1 da iniciativa)
        ↓
Épico 02 — Player Dashboard & Invite Inteligente (UI)
  │
  ├─ Smart landing por rota (/invite vs /join, token namespaces separados)
  ├─ CharacterPickerModal reusável (paginado)
  ├─ AuthModal reusável (com upgradeContext)
  └─ Dashboard player enriquecido (4 seções novas)
        ↓
Épico 03 — Momentos de Conversão (UI + copy)
  │
  ├─ Waiting room CTA (anon)
  ├─ Recap CTA anon (upgrade)
  ├─ Recap CTA guest (signup + migrate character)
  ├─ Turn-safety (modal nunca perde turno do player) — Quinn não-negociável
  ├─ Dismissal memory
  └─ Analytics funil conversion_*
        ↓
Épico 04 — Player-as-DM Upsell (growth, maior do conjunto)
  │
  ├─ CTA "Virar DM" após 2+ sessões jogadas
  ├─ Materialized view v_player_sessions_played
  ├─ BecomeDmWizard + DmTourProvider (novo tour)
  ├─ Campaign templates (seed de 3 iniciais) + clone RPC
  ├─ v_past_companions + invite bulk contextual
  └─ Dashboard admin player_dm_funnel
```

### Estimativa agregada

| Épico | Esforço | Dependências |
|---|---|---|
| 01 | 12-17 dias | Nenhuma |
| 02 | 22-29 dias | Épico 01 em staging |
| 03 | 12-16 dias | Épicos 01, 02 em staging |
| 04 | 25-32 dias | Épicos 01, 02, 03 em staging |
| **Total** | **71-94 dias úteis (~9-11 sprints)** | Sequencial com paralelismo interno |

---

## Decisões Arquiteturais Cross-cutting

### DC1 — Supabase auth upgrade via `updateUser`, NÃO `signUp`

Preserva UUID do anon user, elimina necessidade de UPDATE ... WHERE anon_user_id = X. Saga é **idempotent forward-recovery**, não rollback-based.

### DC2 — `session_tokens.id` é o identificador estável

`anon_user_id` pode regenerar em cookie loss (spec-resilient-reconnection). Todas as cross-references usam `session_tokens.id`.

### DC3 — Rotas `/invite` e `/join` permanecem separadas

Token namespaces disjuntos (`campaign_invites.token` vs `session_tokens.token`). Unificação proposta originalmente foi **rejeitada** no code review. Cada rota ganha `detect*State` próprio.

### DC4 — Posse total pós-claim

Decisão de Dani_: `claimCampaignCharacter` transfere posse completa; player edita nome, stats, classe, tudo. Sem campos travados pelo fato de ter sido DM-created.

### DC5 — Big-bang release sem opt-out parcial

Tentativa inicial de "opt-out se Épico 02 atrasar" foi revogada no review: primitives sem consumidores em prod são inválidas. Se cronograma apertar, **atrasamos o release inteiro**, não fatiamos.

### DC6 — Linguagem ubíqua é Story #1 da iniciativa

Glossário (`docs/glossario-ubiquo.md`) é atualizado ANTES de qualquer código. Evita dívida de naming em migrations, funções, copy. Ownership: Paige.

### DC7 — Testing Contract é parte do épico, não bolt-on

Quinn define matriz (unit/integration/E2E) dentro de cada épico filho. Turn-safety (Épico 03) e atomic claim (Épico 01) são testes não-negociáveis.

### DC8 — `player_characters` é o nome da tabela (NÃO `characters`)

Identificado no code review. Toda SQL/migration/função refere `player_characters`. A ROTA pública é `/app/characters/[id]` (URL friendly), mas a tabela é `player_characters`.

---

## Épicos Filhos — Índice

| # | Doc | Responsável | Esforço | Visível ao user? |
|---|---|---|---|---|
| 01 | [epic-01-identity-foundation.md](epics/player-identity/epic-01-identity-foundation.md) | Winston | 12-17 dias | Não (backend) |
| 02 | [epic-02-player-dashboard-invite.md](epics/player-identity/epic-02-player-dashboard-invite.md) | Sally | 22-29 dias | Sim |
| 03 | [epic-03-conversion-moments.md](epics/player-identity/epic-03-conversion-moments.md) | Sally + Paige | 12-16 dias | Sim |
| 04 | [epic-04-player-as-dm-upsell.md](epics/player-identity/epic-04-player-as-dm-upsell.md) | John | 25-32 dias | Sim |

**Docs relacionados:**
- [docs/EPIC-player-hq-standalone.md](EPIC-player-hq-standalone.md) — Player HQ standalone (consome `player_characters.user_id IS NOT NULL AND campaign_id IS NULL`)
- [docs/spec-resilient-reconnection.md](spec-resilient-reconnection.md) — ganha §4 sobre identity upgrade
- [docs/glossario-ubiquo.md](glossario-ubiquo.md) — atualizado na Story 01-A com 7 termos novos

---

## Riscos Principais da Iniciativa

| Risco | Severidade | Mitigação |
|---|---|---|
| **Big-bang release com 71-94 dias de trabalho** sem valor em prod até o fim | **Alta** | Shipping interno a cada story; staging validado a cada sprint; revisão do cronograma a cada sprint; atrasar release inteiro se necessário (DC5) |
| Épico 04 é o maior e pode atrasar o release | **Alta** | Áreas 4-5 do Épico 04 são cortáveis (templates, viral invite); Áreas 1-3 são must-have |
| Code review v3 do Épico 01 encontrou 25+ bugs na v1/v2 — mais podem surgir em 02/03/04 | Média | Review adversarial foi aplicado em 01 e 02; 03 e 04 herdam mesma disciplina; considerar segunda rodada de review pós-v1 de 03 e 04 |
| Turn-safety (Épico 03 Área 4) é complexo e testes E2E podem revelar race conditions | Média | Quinn é rigoroso; flag em bloco; se não bater parity perfeita, desabilita CTA no waiting room em favor de só-recap |
| Materialized view do Épico 04 sofre em campanhas muito ativas | Média | Cron pg_cron como fallback; otimização é sprint futuro |
| Migração de identity (Épico 01 Área 2) não funciona em produção como esperado | Alta | 8+ testes + E2E obrigatório; recovery endpoint coberto; failure flag `upgrade_failed_at` permite cleanup manual |
| Estimativas otimistas para épicos tão grandes | Alta | Buffer implícito de 20% nos intervalos (ex: 12-17 em vez de 12-15); revisar estimativa real após Story 01-A |

---

## Métricas de Sucesso

**Pós-lançamento (30 dias, 60 dias, 90 dias):**

| Métrica | Target 30d | Target 60d | Target 90d |
|---|---|---|---|
| Taxa de conversão anon→auth em recap (Épico 03) | 10% | 15% | 20% |
| Taxa de conversão anon→auth em waiting room (Épico 03) | 5% | 8% | 12% |
| Retenção player D7 pós-conta (H1) | 25% | 30% | 35% |
| Players retornando a D14+ com mesmo personagem (H3) | 40% | 50% | 55% |
| Players virando DM após 2+ sessões (Épico 04) | 2% | 5% | 8% |
| Novo DM com ≥1 player convidado via past companions (Épico 04) | 30% | 40% | 50% |

**Dashboard de acompanhamento:** `/app/admin/player-dm-funnel` (criado no Épico 04 Área 6) agrega todos os eventos de funil das 4 épicos.

---

## Owner da Iniciativa

**Product Owner:** Dani_
**PM lead:** John (BMAD)
**Technical lead:** Winston (BMAD)
**QA lead:** Quinn (BMAD)
**Scrum master:** Bob (BMAD)

Revisão de progresso: **a cada sprint** com o time completo. Revisão de direção: **após staging de cada épico** (não esperar big-bang para ajustar curso).

---

## Changelog desta iniciativa

| Data | Ação | Resultado |
|---|---|---|
| 2026-04-19 | Party Mode — descoberta inicial | 4 hipóteses → 4 épicos decomposto |
| 2026-04-19 | Drafting Épicos 01, 02 v1 | Docs criados |
| 2026-04-19 | Code review adversarial v1/v2 | 25+ issues encontrados (5 críticos, 6 altos, 7 médios, 7 baixos) |
| 2026-04-19 | Épicos 01, 02 v3 pós-review | Todos issues endereçados |
| 2026-04-19 | Drafting Épicos 03, 04 | Docs criados (incorporam disciplina do review v3) |
| 2026-04-19 | Este épico mãe criado | Índice consolidado |

**Próximo marco:** Story 01-A (Glossário) em execução.
