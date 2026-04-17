# Code Review Consolidado — Beta 3 Remediation

Master HEAD: `c52365d` (pushed to origin, deploying)
Data: 2026-04-17
Revisor: adversarial, foco em integração pós-merge das 6 tracks
Revisões prévias consolidadas:
- `docs/code-review-track-a.md` (approved, recap persistence)
- `docs/code-review-track-b.md` + `docs/code-review-track-b-fixes.md` (merge-ready)
- `docs/code-review-track-c.md` + `docs/code-review-track-c-fixes.md` (approved)
- `docs/code-review-track-d.md` + `docs/code-review-track-d-fixes.md` (approved)
- `docs/code-review-track-e.md` (approved com inline fix `ba0c9d2`)
- `docs/code-review-track-f.md` + `docs/code-review-track-f-fixes.md` (approved com WAF deferred)

---

## Veredicto Final

**SAFE TO DEPLOY.**

Integração limpa. TypeScript verde (`tsc --noEmit` = 0 erros), `next build` verde (0 errors, 0 warnings), 30/30 jest suites específicas de beta3 verdes, 14 erros de lint **todos pré-existentes** em master (contagem idêntica à baseline), i18n com parity perfeita (3838 leaf keys em EN e PT-BR, zero drift, zero duplicatas). Migrations 136 → 137 → 138 aplicam em ordem sem dependência cruzada. Feature flag `ff_combatant_add_reorder` default `false` — toda mudança de Track B fica inerte até o DM flip manual.

Nenhum CRITICAL ou HIGH aberto. Os findings residuais (LOW/INFO) já estavam documentados nas revisões individuais e são aceitáveis para beta. A única observação operacional é que as 6 tracks landaram como **commits lineares** (não merge commits), o que torna rollback por-track mais trabalhoso — mitigação na seção §Rollback plan.

---

## Resumo do que landou

| Track | Commits (range) | Migration | Feature flag | Ativo em prod? |
|-------|----------------|-----------|--------------|----------------|
| **A** — Recap persistence | `1d24f9a → e0fe275` (7 commits) | `136_encounter_recap_snapshot.sql` | — | Sim (on-by-default) |
| **B** — Combatant add reorder | `b3547cb → ae2ee07` (13 commits inclui fixes) | — | `ff_combatant_add_reorder` | **NÃO** (default false) |
| **C** — Telemetria 3-tier + whitelist + F3/F5/F7 | `6881f9c → c708841` (10 commits inclui fixes) | `137_backfill_whitelist_post_114.sql` | — | Sim |
| **D** — UX H1/H2/H4/H7 | `88dba08 → 3d6079f` (7 commits inclui fixes) | — | — | Sim |
| **E** — HP CRITICAL + i18n | `78158c7, ba0c9d2` + 825a39c | — | — | Sim (48 novas keys i18n) |
| **F** — Voting `/feedback/[token]` | `5c1cc49 → cb552d9` (8 commits inclui fixes) | `138_late_vote_via_session_token.sql` | — | Sim |
| **SEO sprint 3** (usuário) | `d72f943, c52365d` | — | — | Sim (JSON-LD absolute URLs) |

Nenhum dos commits do usuário (SEO) tocou arquivos de beta3 — mudança 100% ortogonal, zero risco de integração.

---

## Cross-cutting integrity

### Shared files coherence

Arquivos tocados por múltiplas tracks, auditados no estado final em master:

| Arquivo | Tracks | Estado final |
|---------|--------|--------------|
| `components/player/PlayerJoinClient.tsx` | A + B + C + `4092715` | **Coerente.** Recap hydration effect em `1870-1920` usa guards de `authReady + sessionId + !active + !combatRecapReport`; reducer de Track B em `1265-1340` usa `combatantsRef.current` síncrono + skip de `"hidden:"` prefix; telemetria Track C captura `hiddenMs` em linhas `1820-1821` ANTES do reset. Três responsabilidades ortogonais convivem sem overlap. |
| `components/session/CombatSessionClient.tsx` | A + C + F | **Coerente.** POST recap em ~line 326-346 (A), guard de auto-scroll em `1893-1898` com `data-combatant-index` (C), share feedback link (F). 8 erros de lint pré-existentes, todos são imports não-usados/deps exhaustivas — nada introduzido pelas tracks. |
| `components/combat/CombatantRow.tsx` | C (QW2) + E (test fix) | **Coerente.** Listener de `combat:turn-advancing` em `166-186` (C), HP CRITICAL `text-white font-semibold` em `495-512` (C), test fix `bg-red-600` em test suite (E). Nenhum conflito. |
| `components/oracle/MonsterStatBlock.tsx` | C (reorder) + D (color-coded) + D (H7 badge) | **Coerente.** Badge em linha 376-381 com gate `isSrd={monster.is_srd}` + `size="md"`; resistances em `439-450` antes de abilities. |
| `components/public/PublicMonsterStatBlock.tsx` | C (reorder via `4c1e148`) + D | **Coerente.** Mesma estrutura do authenticated variant; `isPt` param reportado como unused em lint (pre-existing). |
| `lib/hooks/useCombatActions.ts` | B (add reorder) + C (turn-advancing dispatch) | **Coerente.** Turn-advancing em `82-92` (antes de `advanceTurn()`), turn-advanced em `103-113` (depois), handleAddCombatant em `434-497` com persist-antes-de-broadcast. Warning de lint em linha 297 (`t` missing dep) é pré-existente. |
| `messages/pt-BR.json` / `messages/en.json` | E (48 new keys) + F (feedback keys) | **Coerente.** 3838 leaf keys cada, parity perfeita, 0 duplicatas, namespaces `combat.*`, `compendium.*`, `feedback.*`, `__doc` raiz. Verificado via node script. |

### Migration sequence

Ordem em master:
```
135_audio_favorites.sql                       (pre-existing)
136_encounter_recap_snapshot.sql              (Track A)
137_backfill_whitelist_post_114.sql           (Track C)
138_late_vote_via_session_token.sql           (Track F)
```

**Verificação de dependências cruzadas:**
- `136` — additivo puro (`ALTER TABLE encounters ADD COLUMN IF NOT EXISTS recap_snapshot JSONB`). Nenhuma dependência em outras migrations além da existência da tabela `encounters` (migration 005).
- `137` — idempotente via `INSERT … ON CONFLICT (user_id) DO UPDATE`. Depende de `content_whitelist` (migration 114) já aplicada em master.
- `138` — schema + RPC. Depende de `session_tokens` (004), `encounters` (005/060) e `check_rate_limit` (016) — todas em master. Usa `BEGIN;` … `COMMIT;` e ordena criação de partial uniques ANTES do drop do composite antigo. Safe em concorrência dentro da tx.

Aplicam em ordem em um DB limpo ou em um DB em master + 135. Nenhum require shadow/downtime.

**Migrations adicionais detectadas**: nenhuma além dessas 3 no range 136-138. Verificado via `ls supabase/migrations/ | tail`.

### Build/types/tests

| Verificação | Comando | Resultado |
|-------------|---------|-----------|
| TypeScript | `rtk tsc --noEmit` | `TypeScript compilation completed` — **0 erros** |
| Next.js build | `rtk next build` | **Errors: 0 | Warnings: 0** |
| ESLint (shared files) | `npx eslint` em 6 arquivos multi-track | **14 erros, todos pré-existentes** (contagem idêntica aos reviews individuais + baseline master anterior) |
| Jest (beta3-specific suites) | `npx jest reconnect-classifier|recap-payload|flags|MonsterGroupHeader|combatant-add-reorder` | **30/30 passed** |
| i18n integrity | node script flatten | 3838 EN = 3838 PT, 0 drift, 0 duplicatas |

**Warning operacional (não-bloqueador)**: jest-haste-map emite `duplicate manual mock found: styleMock` porque as worktrees em `.claude/worktrees/agent-*` ainda contêm cópias. Não afeta build (`.vercelignore:51` exclui `.claude`) nem runtime, mas polui output local. Limpar worktrees após deploy.

---

## New risks introduced by integration

Coisas só visíveis pós-merge (não pegas nos reviews individuais):

1. **`/feedback/[token]` não está em `PUBLIC_PREFIXES`** (`lib/supabase/proxy.ts:11-58`)
   - Severidade: LOW (perf, não segurança).
   - Rota pública via session_token, mas o middleware roda Supabase session refresh com timeout de 3s (`proxy.ts:123-125`). Não bloqueia, não redireciona (rota não match `/app/*` nem `/admin/*`), mas consome latência desnecessária.
   - Recomendação pós-deploy: adicionar `"/feedback"` ao `PUBLIC_PREFIXES`. Fix de 1 linha, pode ir no próximo deploy normal.

2. **Commits lineares dificultam rollback por-track**
   - Severidade: MEDIUM (operacional).
   - As 6 tracks foram squash-rebased em master como 50+ commits lineares, sem merge commits. Revert cirúrgico por track exige `git revert` de range — factível mas trabalhoso. Ver seção §Rollback plan.

3. **Feature flag `ff_combatant_add_reorder` requer acoplamento fleet-wide ao flip**
   - Severidade: LOW (documentado, flag default-off).
   - Antes de flip em prod, **todos** os players precisam ter o SW `v3` instalado (commit `ae2ee07` bumpou). Se algum player estiver no SW `v2` cached, não tem o handler `combat:combatant_add_reorder` e o add vai sumir para ele. Runbook: soak 24h pós-deploy antes do flip (documentado em `lib/hooks/useCombatActions.ts:461-465`).

4. **`player:resumed` eventos podem inflar métrica se broadcast-then-refresh acontecer**
   - Severidade: LOW (já chamado no review individual A, item MEDIUM #2).
   - Se player viu recap via broadcast, fechou tab sem fechar modal, reabriu dentro de 24h com sessionStorage limpo → `recap.served_from_db` firá mesmo sendo "durable_after_broadcast". Dashboard vai parecer melhor que a realidade.

5. **Worktrees `.claude/worktrees/agent-*` ainda no filesystem**
   - Severidade: INFO (apenas polui jest output local).
   - Excluídos do deploy via `.vercelignore:51`. Safe a deletar após confirmar deploy ok.

Nenhum risco HIGH/CRITICAL introduzido pela integração.

---

## Deferred items (next sprint)

Consolidado dos "nice-to-have" residuais não-bloqueadores:

### Segurança / arquitetura
- **F (voting)**: WAF ou service-role gateway em frente à RPC `cast_late_vote_via_token` — mitigação completa do replay-attack via fingerprint rotation. Documentado em `138_late_vote_via_session_token.sql:229-238`.
- **B (broadcast)**: adicionar `combat:combatant_add_reorder` ao `NEEDS_COMBATANT_CONTEXT` E ao reject-list de `app/api/broadcast/route.ts` para defense-in-depth (N-1, N-2 em review B fixes).
- **A (recap)**: `.not("ended_at", "is", null)` no UPDATE do POST para fail-closed em encounters ativos (MEDIUM #3 em review A).

### Observabilidade
- **A**: adicionar `delivery_mode: 'durable' | 'durable_after_broadcast'` ao event `recap.served_from_db` para segmentação honesta do dashboard.
- **C**: `fetchState:throttle_dropped` event para visibilidade de drops throttled.
- **C**: trocar `(channelRef.current as any).state` por ref atualizado via `channel.subscribe((status) => ...)` (TODO já inserido no código).

### Testes
- **B**: cobertura hidden-only + hidden→visible transitions (F-2).
- **A**: UTF-16 surrogate solto em `recap-payload.test.ts` (LOW #5).
- **B**: integration test do batching `updateCombatants + updateTurnIndex + setRound`.

### UX / polimento
- **D**: extrair bloco inline `style` do `FloatingCardContainer.tsx:720-745` para classe CSS `.floating-mobile-close` (ainda tem hex em `rgba()`).
- **D**: `aria-label` unificado para `"Fechar"` no Dialog (hoje Sheet é PT-BR, Dialog é EN).
- **E**: decidir sobre `defenses_header` flat vs `combat.sheet.*` sub-namespace.

### Operações
- **Integração**: adicionar `/feedback` ao `PUBLIC_PREFIXES` de `lib/supabase/proxy.ts` (ver risco #1).
- **Integração**: limpar worktrees `.claude/worktrees/agent-*` após confirmar deploy estável.

---

## Dispatch pack readiness

Para Lucas votar retroativamente via link compartilhado:

| Verificação | Status | Evidência |
|-------------|--------|-----------|
| Migration 138 applied-ready? | ✅ | `supabase/migrations/138_late_vote_via_session_token.sql` em master, ordem correta (136 → 137 → 138), BEGIN/COMMIT wrap, idempotente |
| Rota `/feedback/[token]` funciona? | ✅ | `app/feedback/[token]/page.tsx` (SSR, force-dynamic), `FeedbackClient.tsx` (client com fingerprint + vote UI), `app/api/feedback/route.ts` (POST RPC proxy), `app/api/session/[id]/feedback-link/route.ts` (DM gen link) |
| Middleware bloqueia? | ✅ (mas com overhead) | Rota não está em `PUBLIC_PREFIXES`, mas também não é `/app/*` nem `/admin/*` — passa através. Ver risco #1 para fix futuro |
| URL format bate com sprint plan? | ✅ | `${origin}/feedback/${tokenRow.token}` em `app/api/session/[id]/feedback-link/route.ts:66` — formato exato pedido |
| noindex robots? | ✅ | `export const metadata: Metadata = { robots: { index: false, follow: false } }` em `app/feedback/[token]/page.tsx:13-15` |
| i18n completo? | ✅ | `feedback.*` namespace presente em ambos locales, `retro_back_home` como pedido no review F fixes |
| Rate limit ativo? | ✅ | `withRateLimit({ max: 10, window: "1m", prefix: "feedback", identifier: body.token })` + RPC interno 5/60s por (token, fingerprint) |
| Voter fingerprint funcional? | ✅ | `getOrCreateVoterFingerprint()` em `FeedbackClient.tsx:11-40` com localStorage `pocketdm:feedback_voter_id`, RFC4122 v4 regex validation, fallback efêmero |

**Flow completo dispatch**:

1. DM abre recap de combate encerrado na sessão do Lucas
2. Clica "Copy feedback link" → chama `GET /api/session/[id]/feedback-link` → retorna `https://pocketdm.com.br/feedback/<session_token>`
3. DM cola no WhatsApp / grupo
4. Lucas abre no celular → SSR valida token → mostra encounters encerrados (limit 3)
5. Lucas vota 1-5 → `POST /api/feedback` com `{token, encounter_id, vote, voter_fingerprint, notes}`
6. RPC `cast_late_vote_via_token` upserts em `encounter_votes` por `(encounter_id, token_id, fingerprint)` — múltiplos players no mesmo link não sobrescrevem voto um do outro
7. Notes persistem em `encounter_feedback_notes` (best-effort, service-role only)

**Dispatch pronto para Lucas.**

---

## Rollback plan

**Contexto**: commits lineares, não merge commits. Revert por track exige range de revert.

### Reversibilidade por track (fácil → difícil)

| Track | Facilidade | Estratégia |
|-------|-----------|-----------|
| **SEO** (d72f943, c52365d) | Trivial | `git revert c52365d d72f943` — arquivos isolados em `app/*/page.tsx` + `lib/seo/metadata.ts` |
| **B** (combatant add reorder) | Trivial (flag) | **Não precisa git revert** — flag `NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER` default false. Se flip em prod causar bug, remover env var no Vercel e redeploy = kill switch instantâneo. Código novo fica dormente. |
| **D** (UX) | Fácil | `git revert 3d6079f 6a5ab1a 216e23c f6cec21 88dba08 6b304d1 bb14360` — arquivos UI isolados, zero backend. Zero risco de data loss. |
| **E** (HP CRITICAL + i18n) | Fácil | `git revert ba0c9d2 78158c7 825a39c` — i18n keys unused se UI não consome; paleta HP visual-only. |
| **A** (recap persistence) | Médio | `git revert` dos 7 commits de recap + migration rollback (`ALTER TABLE encounters DROP COLUMN recap_snapshot`). **Cuidado**: se produção já tiver recaps persistidos, o DROP perde dados. Em emergência, só reverter o código e deixar a coluna — é nullable, não quebra nada. |
| **C** (telemetria + whitelist) | Médio | Revert de código trivial. Migration 137 é data backfill: reverter = correr `DELETE FROM content_whitelist WHERE notes LIKE '%migration 137%'` — mas isso TAMBÉM mata o acesso dos beta testers. Melhor não reverter, aceitar a whitelist como estado base. |
| **F** (voting) | **Difícil** | Schema changes: `session_token_id`, `voter_fingerprint` columns + partial uniques + `encounter_feedback_notes` table + RPC. Revert = `DROP FUNCTION cast_late_vote_via_token` + `ALTER TABLE encounter_votes DROP COLUMN ...` + `DROP TABLE encounter_feedback_notes`. **Risco**: se votos anon foram inseridos, eles somem. Estratégia segura = disable feature via remover `/feedback/[token]` rota (ficar 404) e manter schema. |

### Kill switches sem código revert

| Feature | Kill switch |
|---------|-------------|
| Track B (add reorder) | Unset `NEXT_PUBLIC_FF_COMBATANT_ADD_REORDER` em Vercel env |
| Track F (voting retroativo) | Manual: `REVOKE EXECUTE ON FUNCTION cast_late_vote_via_token FROM anon, authenticated` em Supabase (5s, zero downtime) |
| Track A (recap persist) | Manual: `UPDATE encounters SET recap_snapshot = NULL` stoppa hydration; ou remover rota `/api/session/[id]/latest-recap` via deploy (route 404 = client fallback silencioso) |

### Track de maior risco de rollback

**Track F** é o mais arriscado: schema changes em tabela `encounter_votes` com dados históricos. O mitigante é que partial uniques foram criados ANTES do drop do composite antigo (`138:55-81`), então em concorrência/rollback a table permanece íntegra. Estratégia preferencial de rollback: **NÃO tocar schema, desativar feature por REVOKE da RPC + remover rota `/feedback` por deploy**.

---

## Recomendações pós-deploy

### Monitoring — primeiras 48h

1. **Sentry / error log**
   - Filtrar por rotas: `/api/feedback`, `/api/session/[id]/feedback-link`, `/api/encounters/[id]/recap`, `/api/session/[id]/latest-recap`, `/feedback/[token]`.
   - Alertar em any 500 em qualquer dessas — são superfícies novas.

2. **Supabase dashboard**
   - Query watch: `SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM encounter_feedback_notes;` — se crescer > 1000 em 1h sem campanha ativa, investigar abuse.
   - `SELECT COUNT(*), COUNT(DISTINCT voter_fingerprint) FROM encounter_votes WHERE voter_fingerprint IS NOT NULL;` — ratio voters/votes deve ser ~1 (1 fingerprint = N votes no mesmo encounter é OK, mas N votes em N encounters diferentes é suspeito).
   - `rate_limits` tabela: alertar em `SELECT COUNT(*) FROM rate_limits WHERE identifier LIKE 'feedback_rpc:%'` > 1000 em 1 hora.

3. **Analytics events (beta3-novos)**
   - `recap.persisted_success` vs `recap.persisted_noop` — ratio deve ser ~1:0 em produção (combates únicos).
   - `recap.served_from_db` — target ≥95% dos players que reconectam pós-end-of-combat (per CLAUDE.md).
   - `player:reconnected` confidence distribution — se `long_background` > 80%, investigar (pode indicar problema de SW install).
   - `combat:combatant_add_desync_detected` — target < 5% dos adds após flag-on em prod. Se > 20%, voltar flag para off.

### Manual smoke tests — imediatamente pós-deploy

1. **Recap durable (Track A)**
   - Abrir sessão de teste, iniciar combate, `/join/<token>` em aba anônima
   - DM encerra combate
   - Player fecha aba → reabre após 30s → **Wrapped deve aparecer**

2. **Dispatch Lucas (Track F)**
   - DM autenticado, abrir recap de qualquer combate encerrado
   - Clicar "Copy feedback link" → colar URL em browser incógnito mobile
   - Votar 1-5 em 1 encounter → deve retornar `{ok: true, avg, count}`
   - Recarregar → fingerprint persiste → voto anterior reflete

3. **Combat UX (Tracks D + E)**
   - Abrir `/try` guest, clicar em card monstro → Dialog X deve ter 44x44 touch target
   - HP < 10% em combatant → número fica branco bold, badge vermelho no player
   - Monster 2024-SRD → VersionBadge aparece em dourado; 2014 → zinc neutro
   - Resistances/immunities aparecem antes das abilities no statblock

4. **Telemetria classification (Track C)**
   - Player no `/join` → trocar de tab por 45s → voltar
   - Expected event: `player:reconnected` com `confidence: "medium"` e `method: "long_background"`
   - Tab switch curto (<5s): `player:resumed` com `confidence: "noise"`

### Alertas recomendados (próximos 7 dias)

- **Error rate spike em `/api/feedback`**: > 5% em 5min window.
- **Database lock contention em `encounter_votes`**: Supabase dashboard watch.
- **CSP violations em `/feedback/[token]`**: report-uri se configurado; validar scripts inline não criam false-positive.
- **SW install rate**: Vercel Analytics / custom event — se < 50% dos players tiver `CACHE_VERSION=v3` após 48h, NÃO flipar `ff_combatant_add_reorder`.

### Cleanup pós-deploy estável

Após 48h sem incidentes:
1. Deletar worktrees: `rm -rf .claude/worktrees/agent-*` (libera 6 cópias do repo).
2. Adicionar `/feedback` ao `PUBLIC_PREFIXES` em `lib/supabase/proxy.ts` (fix do risco #1).
3. Considerar flip `ff_combatant_add_reorder` em staging para 1 DM piloto antes de prod.

---

## Arquivos relevantes

### Implementação (adicionados/modificados em beta3)
- `supabase/migrations/136_encounter_recap_snapshot.sql`
- `supabase/migrations/137_backfill_whitelist_post_114.sql`
- `supabase/migrations/138_late_vote_via_session_token.sql`
- `app/feedback/[token]/page.tsx`
- `app/feedback/[token]/FeedbackClient.tsx`
- `app/api/feedback/route.ts`
- `app/api/session/[id]/feedback-link/route.ts`
- `app/api/session/[id]/latest-recap/route.ts`
- `app/api/encounters/[id]/recap/route.ts`
- `lib/flags.ts` + `lib/flags.test.ts`
- `lib/realtime/reconnect-classifier.ts`
- `lib/combat/recap-payload.ts`
- `components/ui/VersionBadge.tsx`
- `components/ui/dialog.tsx` (H1)
- `components/ui/sheet.tsx` (H1 propagation)
- `messages/pt-BR.json` + `messages/en.json` (+48 Track E keys + Track F feedback.*)
- `public/sw.js` (CACHE_VERSION v3)
- `.env.example` (flags doc)

### Multi-track integration
- `components/player/PlayerJoinClient.tsx` (A + B + C)
- `components/session/CombatSessionClient.tsx` (A + C + F)
- `components/combat/CombatantRow.tsx` (C + E)
- `components/oracle/MonsterStatBlock.tsx` (C + D)
- `components/public/PublicMonsterStatBlock.tsx` (C + D)
- `lib/hooks/useCombatActions.ts` (B + C)

### SEO sprint 3 (c52365d)
- `lib/seo/metadata.ts` (+131 lines)
- `app/page.tsx`, `app/faq/page.tsx`, 14 compendium index pages

---

## Conclusão

Merge integrado está coerente, build/types/tests verdes, nenhum CRITICAL ou HIGH aberto. As 6 tracks + SEO sprint estão prontas para deploy em produção via Vercel auto-push.

A linha de defesa adicional é que **Track B, o maior risco arquitetural, está behind feature flag default false** — zero impacto funcional até o flip manual. Tracks A/C/D/E/F são additivas ou correcoes, com kill switches viáveis em minutos (§Rollback plan).

**SAFE TO DEPLOY.** Proceder com monitoring descrito acima nas primeiras 48h.
