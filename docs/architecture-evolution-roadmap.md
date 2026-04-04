# Architecture Evolution Roadmap — Pocket DM

> **Objetivo:** Mapeamento estratégico de evoluções técnicas para garantir estabilidade no presente e escalabilidade no futuro. Baseado na auditoria documental completa (2026-03-30) e análise competitiva.
>
> **Premissa:** Simplicidade radical continua sendo o norte. Cada evolução deve REDUZIR complexidade para o usuário, não aumentar.

---

## HORIZONTE 1: Estabilidade (Próximas 2-4 semanas)

_"Fazer o que existe funcionar impecavelmente antes de adicionar mais."_

### 1.1 Cobertura E2E Crítica — ⏳ IN PROGRESS

**Problema:** Playwright existe mas cobre poucos fluxos. 60 testes pre-existentes falhando no B-stream sprint indicam fragilidade.

**Ação:**
- Criar E2E para as 4 jornadas críticas do PRD (Rafael happy path, Rafael edge case, Camila player view, Admin)
- Priorizar: criar sessão → adicionar combatants → iniciar combate → player join → HP update → turn advance → encerrar
- Meta: 0 flaky tests. Cada E2E deve ser determinístico
- Rodar no CI antes de merge (Vercel preview + Playwright)

**Status (2026-04-04):** Partially done. E2E helpers refactored (`e2e/helpers/auth.ts`, `session.ts`, `combat.ts`, `db.ts`). `campaign-seed.ts` created for campaign E2E. `e2e/campaign/mind-map.spec.ts` written. CI partially blocking — Playwright pitfalls documented in memory. Remaining: full happy-path coverage for 4 PRD journeys.

**Impacto:** Confiança para fazer mudanças sem quebrar fluxos críticos.

### 1.2 Guest Mode Hard Block — ✅ DONE

**Problema:** Timer de 60 min é apenas visual (GuestBanner). Não há enforcement real — usuário pode usar indefinidamente.

**Ação:**
- ~~Adicionar verificação no `guest-combat-store` que bloqueia ações após SESSION_LIMIT_MS~~
- ~~Mostrar modal de conversão quando expirar (GuestUpsellModal já existe)~~
- Preservar estado do combate para migração pós-signup (future)

**Status (2026-04-04):** Implemented. `guest-combat-store.ts` has `guardExpired()` that checks `isGuestExpired()` and blocks ALL store actions (addCombatant, updateHP, etc.) after `SESSION_LIMIT_MS` (60 min). `isExpired` flag triggers GuestUpsellModal. State migration pós-signup deferred.

**Impacto:** Funil de conversão funcional. Sem isso, o freemium não tem gatilho.

### 1.3 Áudio Real (Substituir Placeholders) — ✅ DONE

**Problema:** Todos os 10 MP3s de SFX são placeholders idênticos. Feature existe no código mas não funciona na prática.

**Ação:**
- ~~Substituir por arquivos reais (royalty-free, <100KB cada)~~
- Validar broadcast de áudio DM→Player end-to-end
- Testar latência de playback no mobile

**Status (2026-04-04):** Audio files replaced. Now 85+ real MP3s across 3 categories: `public/sounds/sfx/` (52 files — combat, spells, UI, monsters, items), `public/sounds/ambient/` (9 files — dungeon, forest, tavern, etc.), `public/sounds/music/` (14 files — battle, exploration, suspense). Audio path fixed. Broadcast validation and mobile latency testing remain as follow-ups.

**Impacto:** Feature de imersão que diferencia de todos os concorrentes (nenhum tracker tem soundboard integrado).

### 1.4 RLS Battle-Testing — 🔲 NOT STARTED

**Problema:** Addendum do dual-role identificou bugs de RLS recursion. Migrations 032-039 adicionaram campaign_members com RLS complexo.

**Ação:**
- Criar testes E2E que validam isolamento: Player A não vê dados de Player B
- Validar que SECURITY DEFINER functions não têm race conditions
- Testar cenário: DM em campanha A é Player em campanha B (dual-role)

**Status (2026-04-04):** Not started. RLS policies exist but no dedicated battle-testing. Blocked by E2E infrastructure (1.1) being partially complete.

**Impacto:** Segurança de dados. Bug de RLS = vazamento de informação entre mesas.

---

## HORIZONTE 2: Robustez Arquitetural (1-3 meses)

_"Preparar a fundação para 10x mais usuários sem reescrever."_

### 2.1 PWA + Service Worker

**Por quê:** Mesa presencial = WiFi instável. O app precisa funcionar offline para o DM (SRD já é cached, mas combat state não é).

**Arquitetura proposta:**
```
Service Worker
├── SRD bundles (já cached via IndexedDB)
├── App shell (HTML/CSS/JS — cache-first)
├── Combat state snapshots (background sync)
└── Audio assets (cache on first play)
```

**Benefícios:**
- DM abre o app mesmo sem internet (app shell + SRD)
- Combat actions queue localmente e sincronizam quando volta
- Player view funciona com connection intermitente
- "Add to Home Screen" no celular do jogador = retenção

**Risco:** Conflitos de estado quando reconecta. Mitigação: combat-persist.ts já tem a base — expandir com versioning de estado.

### 2.2 Edge Functions para Realtime Validation

**Por quê:** Hoje, toda sanitização de broadcast é client-side (`broadcast.ts`). Se um DM mal-intencionado modificar o JS, pode enviar dados não-sanitizados.

**Arquitetura proposta:**
```
DM action → Supabase Edge Function (server-side sanitization)
         → Broadcast para players (já sanitizado)
         → Persist no DB
```

**Benefícios:**
- Sanitização server-side = segurança real (não confiamos no client)
- Possibilita validação de regras (ex: HP não pode ser negativo)
- Base para "server authority" quando escalar para play online

**Trade-off:** Adiciona ~50ms de latência. Aceitável se ficar <100ms total.

### 2.3 Background Jobs Robustos (Trigger.dev)

**Por quê:** Trigger.dev já está instalado mas subutilizado. Vários processos precisam de execução assíncrona confiável.

**Jobs necessários:**
- `cleanup-expired-sessions` — Arquivar sessões antigas (>30 dias inativas)
- `cleanup-guest-data` — Limpar dados efêmeros de guest mode
- `trial-expiry-check` — Notificar antes de trial expirar
- `srd-bundle-regeneration` — Após admin editar conteúdo SRD
- `analytics-aggregation` — Agregar analytics_events em métricas diárias
- `campaign-invite-expiry` — Limpar invites expirados (>7 dias)

**Impacto:** O banco não cresce indefinidamente. Processos automáticos que hoje são manuais.

### 2.4 Otimização de Bundle Size

**Por quê:** SRD bundles (monsters + spells, 2014 + 2024) são carregados integralmente. À medida que adicionamos items, equipment, feats — o bundle vai crescer.

**Arquitetura proposta:**
```
Fase 1: Code splitting por versão (carregar 2024 only se selecionado)
Fase 2: Lazy loading por tipo (spells carregam no primeiro acesso ao oracle)
Fase 3: Streaming search (Fuse.js index parcial + fetch on demand)
```

**Métrica:** Manter TTI < 3s mesmo com 5x mais conteúdo.

---

## HORIZONTE 3: Plataforma (3-6 meses)

_"De combat tracker para session companion."_

### 3.1 API Pública (GraphQL ou REST)

**Por quê:** Análise competitiva mostra que nenhum tracker tem API pública. Isso seria um diferencial forte para a comunidade D&D.

**Use cases:**
- Bots de Discord que mostram status do combate
- Integração com DnDBeyond character sheets (import)
- Ferramentas de terceiros para encounter building
- OBS overlay para streams (mostrar initiative order)

**Arquitetura proposta:**
```
/api/v1/
├── sessions/          (read-only para tokens autorizados)
├── campaigns/         (CRUD para DMs autenticados)
├── srd/monsters/      (public, cached)
├── srd/spells/        (public, cached)
└── webhooks/          (session events para integrações)
```

**Decisão pendente:** REST (mais simples, alinhado com filosofia) vs GraphQL (mais flexível para consumidores diversos). Recomendação: REST com expansão de campos via query params.

### 3.2 Multi-System Support (Pathfinder 2e)

**Por quê:** PRD V2 menciona como Phase 3. A arquitetura atual é D&D-specific em vários pontos (conditions, SRD structure, CR calculator).

**Preparação arquitetural:**
```
lib/systems/
├── dnd5e/
│   ├── conditions.ts      (current conditions logic)
│   ├── hp-status.ts       (current HP tiers)
│   ├── cr-calculator.ts   (current CR logic)
│   └── srd-schema.ts      (monster/spell structure)
├── pf2e/
│   ├── conditions.ts      (Pathfinder conditions)
│   ├── hp-status.ts       (might be different thresholds)
│   └── srd-schema.ts      (different stat block structure)
└── system-registry.ts     (active system per session)
```

**Ação AGORA (sem implementar PF2e):**
- Extrair lógica D&D-specific para `lib/systems/dnd5e/`
- Criar interface `GameSystem` que define o contrato
- Session passa a ter `system: 'dnd5e'` como campo
- Quando PF2e vier, é "apenas" implementar a interface

**Trade-off:** Refactor de ~15 arquivos. Investimento de ~8h que economiza semanas depois.

### 3.3 Homebrew Marketplace

**Por quê:** Monetization strategy menciona marketplace (70/30). O `homebrew` table já existe. Falta a camada social.

**Evolução:**
```
Fase 1 (atual): Homebrew privado (DM cria para uso próprio)
Fase 2: Homebrew compartilhável (link público, CC-BY)
Fase 3: Marketplace (upload, review, install, revenue share)
```

**Preparação arquitetural:**
- `homebrew` table já existe — adicionar `is_public`, `downloads_count`, `rating`
- Supabase Storage já em uso (session files) — expandir para homebrew assets
- Review system: simples thumbs up/down (não precisa de comments no V1)

### 3.4 AI Session Intelligence

**Por quê:** Oracle AI (Gemini) já existe para rules lookup. A evolução natural é AI que entende o contexto da sessão.

**Evolução progressiva:**
```
Nível 1 (atual): Rules lookup (perguntas genéricas sobre D&D)
Nível 2: Context-aware (AI sabe quem está no combate, HP atual, condições)
Nível 3: Proactive (sugere ações baseado no estado — "o wizard pode usar Counterspell")
Nível 4: Session recap (gera resumo pós-sessão para o DM)
```

**Preparação:**
- `combat-log-store.ts` já existe — é a base para session recap
- Expandir o system prompt do Oracle AI com combatant context
- Rate limit cuidadoso (Gemini API tem custo)

---

## DECISÕES ARQUITETURAIS PENDENTES

Estas decisões precisam ser tomadas antes de avançar nos Horizontes 2-3:

| # | Decisão | Opções | Recomendação | Impacto |
|---|---------|--------|--------------|---------|
| A1 | Onde sanitizar broadcasts? | Client (atual) vs Edge Function | Edge Function (H2.2) | Segurança |
| A2 | PWA scope | App shell only vs Full offline combat | Full offline (H2.1) | UX offline |
| A3 | API pública formato | REST vs GraphQL | REST (simplicidade) | Ecossistema |
| A4 | Multi-system timing | Refactor agora vs quando PF2e for prioridade | Refactor agora (interface only) | Velocidade futura |
| A5 | Stripe activation timing | Ativar antes de 100 users vs esperar PMF signal | Esperar 100+ DMs ativos | Revenue |
| A6 | WebSocket scaling | Supabase Realtime (atual) vs Custom (Ably/Pusher) | Supabase até 1000 sessions | Custo vs controle |

---

## MÉTRICAS DE SAÚDE TÉCNICA

Para monitorar se a arquitetura está saudável conforme escala:

| Métrica | Target Atual | Target 10x | Como medir |
|---------|-------------|------------|------------|
| FCP | ≤1.5s | ≤1.2s | Vercel Analytics |
| TTI | ≤3s | ≤2s | Lighthouse CI |
| WS latency | ≤500ms | ≤200ms | Custom analytics event |
| Bundle size (JS) | <500KB | <400KB | `next build` output |
| Test coverage | 558 tests | 1000+ | Jest --coverage |
| E2E coverage | ~5 flows | 20+ flows | Playwright report |
| DB query time (p95) | <200ms | <100ms | Supabase dashboard |
| Error rate | <1% | <0.1% | Sentry |
| Uptime | 99.5% | 99.9% | Vercel/Supabase status |

---

## SEQUÊNCIA RECOMENDADA

```
AGORA (Sprint atual)
  └─► 1.1 E2E críticos + 1.2 Guest hard block + 1.3 Áudio real

Semana 2-3
  └─► 1.4 RLS battle-testing
  └─► 2.3 Background jobs (Trigger.dev activation)
  └─► Ativar Stripe em staging

Mês 2
  └─► 2.1 PWA + Service Worker
  └─► 2.4 Bundle optimization
  └─► 3.2 Refactor para system-agnostic (interface only)

Mês 3
  └─► 2.2 Edge Functions para sanitização
  └─► 3.4 AI context-aware (Nível 2)
  └─► 3.1 API v1 (read-only, SRD + sessions)

Mês 4-6
  └─► 3.3 Homebrew sharing
  └─► 3.1 API v1 completa
  └─► 3.2 Pathfinder 2e (se demanda validada)
```

---

**Data:** 2026-03-30
**Baseado em:** Auditoria documental completa, análise competitiva, estado real do código

**Last reviewed:** 2026-04-04. Horizon 1 progress updated. 1.2 Guest Hard Block DONE, 1.3 Audio DONE (85+ real MP3s), 1.1 E2E partially done (helpers refactored, campaign-seed created), 1.4 RLS not started.
