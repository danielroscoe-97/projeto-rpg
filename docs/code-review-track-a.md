# Code Review — Sprint 1 Track A (Recap Persistence)

Branch: `worktree-agent-a6ef6454`
Commits: 7 (1d24f9a, 98564c9, 26f4298, de2eaa7, a240ebb, 859bd57, e0fe275)
Worktree: `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454`

## Veredicto

**APROVADO com 2 blockers administrativos** (renomeio de migration + alinhamento de DoD com jest).

A implementação em si é sólida: segurança correta nos dois endpoints, defense-in-depth via RLS, idempotência bem desenhada, fallback gracioso no cliente, observabilidade completa. Os testes unitários (6/6 jest passando) e o e2e listam 4 cenários compiláveis. `tsc --noEmit` passa limpo; `eslint` nos 5 arquivos NOVOS passa limpo (os 11 erros de lint reportados são pré-existentes em `PlayerJoinClient.tsx` e `CombatSessionClient.tsx`, nenhum nos ranges tocados pela S1.1).

**Merge só depois de**:
1. Renomear `136_encounter_recap_snapshot.sql` → **manter em 136** (veja justificativa abaixo).
2. Atualizar DoD do sprint-plan de "vitest" para "jest" (projeto não usa vitest).

## Severity Summary

| Severidade | Qtd | Itens |
|---|---|---|
| BLOCKER | 2 | Migration collision 3-way; DoD vitest vs jest |
| HIGH | 0 | — |
| MEDIUM | 2 | POST aceita persistir recap de encounter ativo (`ended_at IS NULL`); risco cosmético de false-positive no event `recap.served_from_db` após close+refresh dentro da TTL de 24h |
| LOW | 3 | Analytics event taxonomy não está na allowlist documentada; `withRateLimit` fail-open em cold-start sem Upstash ENV; `.eq("is_active", true)` omitido no POST (encounters dupla) |
| INFO | 4 | Parent repo limpo; tests 6/6 verdes; tsc limpo; lint-clean nos arquivos novos |

## Migration 136 — Colisão 3-way

Encontradas 3 instâncias de `136_*.sql` em worktrees distintos:

```
.claude/worktrees/agent-a2a4c2f8/supabase/migrations/136_backfill_whitelist_post_114.sql   (Track C)
.claude/worktrees/agent-a6ef6454/supabase/migrations/136_encounter_recap_snapshot.sql      (Track A — este review)
.claude/worktrees/agent-af52565f/supabase/migrations/136_late_vote_via_session_token.sql   (Track F)
```

No `master` o último migration é `135_audio_favorites.sql`.

### Recomendação de ordenação

| Nova # | Arquivo | Justificativa |
|---|---|---|
| **136** | `136_encounter_recap_snapshot.sql` (**Track A**) | ALTER TABLE ADD COLUMN JSONB, idempotente (`IF NOT EXISTS`), superfície mínima. Roda primeiro para destravar testes de recap. |
| **137** | `137_backfill_whitelist_post_114.sql` (Track C) | Backfill de dados sobre tabela já existente, pode rodar a qualquer momento depois de Track A. |
| **138** | `138_late_vote_via_session_token.sql` (Track F) | Mais invasiva (lógica de voto), deve ser aplicada por último na janela de deploy. |

**Justificativa para Track A manter 136**: menor diff, additivo puro, zero impacto em queries existentes (coluna nullable), e o e2e de Track A depende da coluna existir antes. Tracks C e F tocam dados ou comportamento e têm margem para shift.

## Auditoria de limpeza do repo parent

Executado `git status -uno` em `c:\Projetos Daniel\projeto-rpg\`:

```
On branch seo/sprint-2-metadata
nothing to commit (use -u to show untracked files)
```

**Conclusão**: Nenhum arquivo da Track A vazou para o repo parent. O agente manteve disciplina de escrita dentro de `.claude/worktrees/agent-a6ef6454/`. **Limpo, aprovado**.

Observação: `git status` no parent mostra que o branch ativo é `seo/sprint-2-metadata`, não `master` — isso é OK porque o review é feito no worktree (`worktree-agent-a6ef6454`). Nenhum dos 7 commits da S1.1 apareceu no `seo/sprint-2-metadata`.

## Auditoria de segurança

### POST `/api/encounters/[id]/recap` — ownership

`app/api/encounters/[id]/recap/route.ts:88-109`:

1. **Auth obrigatória** — `supabase.auth.getUser()` retorna 401 se não houver usuário.
2. **Join ownership** — `encounters.sessions!inner(owner_id)` + comparação `ownerId === user.id` em JS.
3. **Defense in depth** — além do check em JS, o UPDATE usa o Supabase client do cookie do usuário (não `createServiceClient`), então RLS policy `encounters_owner_update` (em `supabase/migrations/005_rls_policies.sql:130-133`) também filtra. Se o check JS fosse bypassável, o RLS rejeitaria.
4. **Enumeration leak prevention** — encounter inexistente → 403 (não 404), evitando scan de UUIDs.
5. **Rate limit** — `withRateLimit({ max: 12, window: "1 m" })` em `route.ts:153` cobre o caso de DM malicioso/script. Fail-open se Upstash ENV ausente (aceitável em dev).

**Veredicto**: **SEGURO**. Non-owner não consegue escrever recap em encounter alheio nem enumerar IDs.

### GET `/api/session/[id]/latest-recap` — escopo público?

Resposta curta: **NÃO é público**. O agente afirma TTL 24h, mas o endpoint **EXIGE autenticação** + ownership-ou-token.

`app/api/session/[id]/latest-recap/route.ts:39-76`:

1. **401 sem usuário logado** — `supabase.auth.getUser()` → 401 obrigatório.
2. **403 sem acesso** — exige `session_tokens` ativo COM `anon_user_id = user.id`, OU ser o `sessions.owner_id`.
3. **Service client (bom)** — espelha `/api/session/[id]/state`, necessário porque anon JWTs não conseguem ler `session_tokens`/`encounters` via RLS.
4. **TTL 24h** — `.gt("ended_at", ttlCutoffIso)` + `.not("ended_at", "is", null)` + `.not("recap_snapshot", "is", null)`.
5. **Defensivo** — `ended_at NULL` é rejeitado explicitamente (caso edge raro).

**Quem é "anon_user_id"?** Player anônimo que fez login via `signInAnonymously` e registrou token na sessão. Isso NÃO é "qualquer um que conheça o UUID" — precisa ter o token provisioned pelo DM primeiro (via `/join/[token]` ou `/invite/[token]`).

**Veredicto**: **SEGURO, mas rotule bem**. A afirmação do agente de "public-ish" é imprecisa — o endpoint é **auth-gated igual ao `/state`**. Só é "público" no sentido de "player anônimo registrado também acessa", não no sentido de "qualquer unauthenticated user".

### Payload — size + NUL bytes

`lib/combat/recap-payload.ts`:

- `MAX_RECAP_PAYLOAD_SIZE = 100_000` — bate com `app/api/combat-reports/route.ts:7` (mesma constante). Uniforme.
- NUL guard: checa `\u0000` raw E `/\\u0000/i` escaped. Cobre o caso documentado no spec (Postgres JSONB rejeita NUL).
- Circular refs → `null_bytes` status (degrade gracioso, 400 ao cliente).

**Edge case não coberto**: UTF-16 surrogate pair solto (ex: `\uD800` sem par) — `JSON.stringify` serializa sem falhar, mas Postgres pode reclamar dependendo da versão. Baixo risco (input vem de CombatReport tipado), mas vale adicionar teste de sanity futuro.

### Idempotência — UPDATE ... WHERE recap_snapshot IS NULL

`app/api/encounters/[id]/recap/route.ts:113-119`: write-once por design.

**Intencional?** Sim, confirmado pela spec (Beta 3 Finding 1). Segundo POST retorna `{ ok: true, persisted: false }` e emite `recap.persisted_noop`. DM double-click / retry são no-op.

**Consequência conhecida**: Se o DM "re-encerrar" combate ou quiser um recap atualizado (ex: correção manual via UI futura), o UPDATE não sobrescreve. Spec aceita isso — feature de edição manual não está no escopo da S1.1. Se/quando vier, precisa de um endpoint dedicado `PATCH` (não reutilizar o POST).

## Findings por commit

### 1d24f9a — `supabase/migrations/136_encounter_recap_snapshot.sql`

- Additivo puro: `ADD COLUMN IF NOT EXISTS recap_snapshot JSONB`.
- COMMENT ON COLUMN bem descritivo (linhas 22-23).
- **Colisão de número** — resolver conforme seção acima.
- ✅ Sem índice — aceitável porque o GET usa `session_id` + `ended_at` (ambos já indexados, presumível via FK e timestamps).

### 98564c9 — `lib/combat/recap-payload.ts` + 6 jest tests

- Helper bem isolado, testável, 54 linhas.
- Cobertura: happy path, too_large, null_bytes, circular ref, boundary (< MAX), off-by-one (MAX+1).
- Tests passam em **0.722s**, 6/6 verdes.
- ⚠️ **LOW** — faltam casos:
  - UTF-16 surrogate solto (ex: `"\uD800"` sem par baixo).
  - Deep-nested JSON que exceda `JSON.stringify` stack depth (não acontece com CombatReport real, mas teste defensivo seria bom).

### 26f4298 — `app/api/encounters/[id]/recap/route.ts` (POST)

- UUID regex gate antes de qualquer DB call (`route.ts:36,44`).
- Validação estrutural: `r.summary && r.awards && r.rankings` (`route.ts:62`).
- Ownership via join + comparação JS + RLS defense-in-depth.
- `.is("recap_snapshot", null)` garante idempotência.
- ⚠️ **MEDIUM** — **não verifica se encounter está `ended`** (sem `.not("ended_at", "is", null)` e sem `.eq("is_active", false)`). Um DM poderia POSTar recap sobre encounter ainda ativo, resultando em snapshot precoce que o GET serviria se o player reconectasse antes do verdadeiro end-of-combat. Mitigação atual: só o DM consegue fazer o POST, e o cliente DM só chama após construir `playerSafeReport` no handler de `combat:ended`. Risco real baixo, mas a validação serverside seria barata. **Recomendação**: adicionar `.not("ended_at", "is", null)` na UPDATE (`route.ts:113-119`) para fail-closed.
- ⚠️ **LOW** — eventos `recap.persisted_success` / `recap.persisted_noop` podem não estar na allowlist de `lib/analytics/track-server.ts` (a allowlist de tipos aceitos não foi validada aqui). Verificar `trackServerEvent` signature aceita arbitrary strings — se aceitar, OK.

### de2eaa7 — `app/api/session/[id]/latest-recap/route.ts` (GET)

- Espelha o pattern do `/state` — service client + token OR owner check.
- TTL 24h bem desenhado (`route.ts:81,89`).
- `!is_active=true` filter bug (mencionado no spike) está corretamente evitado — usa `ended_at NOT NULL` em vez de `is_active`.
- `.maybeSingle()` em vez de `.single()` para tolerar "zero rows" como sucesso retornando `{ data: null }`.
- Rate limit: 30/min — generoso para mount-effects + retries de player.
- ✅ Conforme CLAUDE.md "Resilient Reconnection" — endpoint é best-effort, cliente trata `!res.ok` como fallback silencioso.

### a240ebb — `components/session/CombatSessionClient.tsx` (DM wire)

- `void (async () => { ... })()` antes do broadcast — não bloqueia UX (`CombatSessionClient.tsx:326`).
- 1 retry após 2s APENAS em 5xx; 4xx terminam (correto — POST 400/401/403/413 não devem retry).
- 409 tratado como sucesso (embora o POST atual nunca retorne 409 — mas é defensive para evolução futura).
- ✅ Ordem correta: POST dispara PRIMEIRO, broadcast DEPOIS. Se broadcast chegar primeiro no player + player depois ver durable recap, a segunda entrega é absorvida pela guarda `combatRecapReport` no cliente.

**Race analysis (claim do agente: "final state consistent")**:
- **Cenário A — broadcast antes do fetch completar**: `combatRecapReport` é seteado pelo listener de broadcast; quando `/latest-recap` response chega, a guarda `if (combatRecapReport) return;` no effect (`PlayerJoinClient.tsx:1725,1744`) impede overwrite. ✅
- **Cenário B — fetch resolve antes do broadcast**: durable hydrate seta `combatRecapReport`; quando broadcast chega, o listener faria `setCombatRecapReport(...)` com os mesmos dados. Re-render, mas state final é idêntico. ✅
- **Cenário C — POST falha totalmente, broadcast funciona**: player online vê recap. Player desconectado não vê nada (pior cenário — igual ao estado pré-S1.1). ✅
- **Cenário D — POST sucesso, broadcast falha**: player online vê recap via `/latest-recap` hydrate no próximo mount/refresh. ✅

### 859bd57 — `components/player/PlayerJoinClient.tsx` (player wire)

- Effect bem posicionado (`PlayerJoinClient.tsx:1722-1772`), deps corretas (`[authReady, sessionId, active, combatRecapReport]`).
- `cancelled` flag previne setState em unmount.
- `hydratedRecapEncounterIdRef` (linha 208) limpa em duas paths de close (`:2278, :2292`).
- `sessionStorage["recap-seen-${sessionId}-${encounterId}"]` protege contra reopen pós-refresh.
- ⚠️ **MEDIUM — `recap.served_from_db` emitido mesmo quando broadcast-then-durable**. Se o player viu o recap via broadcast, fechou a modal, e refresh dentro de 24h com sessionStorage limpo (ex: incognito fecha), o effect chama fetch, pega durable recap, mas falha a guarda `sessionStorage.getItem(seenKey)` (na linha 1739 — se retornar truthy, ele bails). Porém, se o player fechou a aba SEM fechar a modal explicitamente, `recap-seen` nunca foi setado. Aí o fetch vai retornar o mesmo recap, state setter vai disparar, e o evento vai firar como "served_from_db". Isso não é bug funcional (UX idêntica), mas o evento vai inflacionar o "durable delivery" metric do dashboard (CLAUDE.md diz alvo ≥95% — vai parecer melhor do que é).
- ⚠️ **LOW** — eventual race: se o broadcast setar `combatRecapReport` entre `await fetch(...)` e `setCombatRecapReport(recap)` (dentro do `hydrate()`), o `if (combatRecapReport) return;` da linha 1744 usa o VALOR CAPTURADO no closure, não o estado atual. Isso significa que o second `setCombatRecapReport(recap)` rodaria mesmo com broadcast já tendo setado. Resultado: `setState` com valor idêntico = no-op React. **Consistente, mas não elegante** — seria melhor usar um ref + `setState(prev => prev ?? recap)` pattern.

### e0fe275 — `e2e/features/recap-persistence.spec.ts`

- `test.describe.serial` + `test.slow()` — prudente para multi-player + reconnect.
- Cenário principal bem desenhado: P1 online (broadcast), P2 offline-reconnect-late (durable).
- Fechamento de context via `p2OfflineContext.close()` simula dispositivo/aba fechados.
- Segundo teste cobre o 400/401/403 para session inexistente/bad-UUID.
- ✅ `--list` retornou 4 tests em 2 projects (desktop-chrome + mobile-safari) compilando sem erros.
- ⚠️ **LOW** — o teste espera `RECAP_TESTID` em 30s. Se a hidratação falhar silenciosamente, o diagnóstico do failure será "elemento não apareceu" — sem log do que aconteceu. Considerar adicionar `page.waitForResponse(/latest-recap/)` para tornar o failure mais informativo.

## Auditoria de race conditions

| Race | Verificação | Resultado |
|---|---|---|
| Broadcast antes de POST DB | Ordem: POST dispara (fire-and-forget), broadcast depois. DM client `CombatSessionClient.tsx:326-346` | Broadcast independente do POST — player online recebe recap direto. Durable é fallback para late-reconnect. ✅ |
| Fetch resolve antes do broadcast | Player effect `PlayerJoinClient.tsx:1722-1772` | Seta state; se broadcast chegar depois, re-seta com mesmo valor = no-op. ✅ |
| Idempotência POST duplo | `UPDATE ... WHERE recap_snapshot IS NULL` | Primeiro POST persiste, segundo vira no-op com event `recap.persisted_noop`. ✅ |
| DM retry em 5xx | `CombatSessionClient.tsx:338-341` — 1 retry após 2s | Se primeiro POST eventually succeeds + retry POST também chega, o segundo pega `persisted=false` sem erro. Convergente. ✅ |
| sessionStorage disabled | `try { sessionStorage.getItem(...) } catch { /* proceed */ }` | Graceful fallback — hidrata recap mesmo sem storage (recap pode reaparecer após refresh, mas aceitável). ✅ |
| Closure capture de `combatRecapReport` | Linha 1744 captura valor antigo | No-op (valor idêntico) mas não elegante. Ver MEDIUM acima. ⚠️ |

## Verificação de DoD

| Item DoD | Status | Evidência |
|---|---|---|
| `tsc --noEmit` verde | ✅ | Exit 0, zero output. |
| Lint dos arquivos novos verde | ✅ | 5 arquivos novos (`recap-payload.ts`, `.test.ts`, POST/GET routes, e2e) lint-clean. |
| Lint dos arquivos modificados | ⚠️ 11 erros, todos **pré-existentes** | PlayerJoinClient.tsx linha 305/307/791 e CombatSessionClient.tsx linhas 6/11/49/63/125/126/365/401/1440 — nenhum nos ranges tocados pela S1.1. |
| Tests 6/6 jest passando | ✅ | `Tests: 6 passed, 6 total` em 0.722s. |
| Playwright e2e compila | ✅ | `--list` mostra 4 tests (2 cenários × 2 projects). |
| Parity documentada | ✅ | Commit `859bd57` diz "Combat Parity: Anon ✅ + Auth ✅ (both modes use PlayerJoinClient). Guest N/A — Finding 9 bucket (S5.2)." |
| Observability em 3 pontos | ✅ | `recap.persisted_success`, `recap.persisted_noop` em POST; `recap.served_from_db` em player hydrate. |
| Docstrings spec refs | ✅ | POST e GET citam `docs/spike-beta-test-3-2026-04-17.md Finding 1 (C1/C3)`. |
| **DoD dizia vitest, projeto usa jest** | 🚫 **BLOCKER admin** | `package.json:"test":"jest"`, `jest.config.ts` existe. Atualizar `docs/sprint-plan-beta3-remediation.md`. |

## Recomendações antes do merge

### BLOCKERS

1. **[BLOCKER-1] Renomeio de migration** — Coordenar com Tracks C e F: Track A fica em `136_encounter_recap_snapshot.sql`, Track C muda para `137_backfill_whitelist_post_114.sql`, Track F muda para `138_late_vote_via_session_token.sql`.
2. **[BLOCKER-2] DoD divergence** — atualizar `docs/sprint-plan-beta3-remediation.md` para referenciar `jest` (projeto não tem vitest instalado).

### NÃO-BLOQUEANTES (para follow-up em S1.2 ou bugfix rápido)

3. **[MEDIUM]** Adicionar `.not("ended_at", "is", null)` na UPDATE do POST para fail-closed em encounters ativos (`app/api/encounters/[id]/recap/route.ts:113-119`).
4. **[MEDIUM]** `recap.served_from_db` pode inflar metric quando for broadcast-then-refresh. Considerar adicionar um `delivery_mode: 'durable' | 'durable_after_broadcast'` property para segmentação honesta no dashboard.
5. **[LOW]** Adicionar teste jest para UTF-16 surrogate solto em `recap-payload.test.ts`.
6. **[LOW]** Verificar que `recap.persisted_success|recap.persisted_noop|recap.served_from_db` estão na allowlist de event names (se o sistema tiver uma).
7. **[LOW]** No effect de hidratação, usar `setCombatRecapReport(prev => prev ?? recap)` para eliminar o closure-capture non-elegance (linha 1757).
8. **[LOW]** `page.waitForResponse(/latest-recap/)` no e2e para diagnóstico mais informativo quando failing.

### Apertos administrativos

9. Parent repo em `seo/sprint-2-metadata` — antes de mergear Track A em master, confirmar que o branch do worktree (`worktree-agent-a6ef6454`) está rebased em master, não em `seo/sprint-2-metadata`.

## Arquivos relevantes para o merge

- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\supabase\migrations\136_encounter_recap_snapshot.sql`
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\lib\combat\recap-payload.ts`
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\lib\__tests__\recap-payload.test.ts`
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\app\api\encounters\[id]\recap\route.ts`
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\app\api\session\[id]\latest-recap\route.ts`
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\components\session\CombatSessionClient.tsx` (+29 linhas)
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\components\player\PlayerJoinClient.tsx` (+80 linhas)
- `c:\Projetos Daniel\projeto-rpg\.claude\worktrees\agent-a6ef6454\e2e\features\recap-persistence.spec.ts`
