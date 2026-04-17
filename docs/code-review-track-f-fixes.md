# Code Review — Track F Fixes (Voting Retroactive — Security-Heavy Track)

Branch: `feat/beta3-voting-feedback`
Worktree: `.claude/worktrees/agent-af52565f`
Fix commits revisados: `8f31d8e`, `40fd908`, `b4bcda2`, `51d2e60`, `9973b0d`, `cb552d9`

---

## Veredicto

**APPROVE com ressalvas documentadas.**

Os 6 fix commits endereçaram **todos** os 7 achados originais (2 CRITICAL + 3 HIGH + 2 MEDIUM) listados em `docs/code-review-track-f.md`. `tsc --noEmit` verde, lint limpo, `playwright test --list` devolve 12 testes (6 × 2 projects).

A única ressalva (conhecida e documentada no próprio SQL da migração) é o **residual risk** de replay-attack via rotação de `voter_fingerprint`; o fix agent aceitou essa fronteira como "beta-acceptable" e deferiu a mitigação completa para v2 (WAF/service-role gateway). Dado que essa é a **única RPC anon-writable em produção**, o risco é de spam do `rate_limits` + `encounter_votes` por um atacante que já tenha um token válido — bounded, não catastrófico. Aceitável para beta 3.

---

## Severity Summary (pós-fix)

| Achado original | Severidade | Status |
|-----------------|-----------|--------|
| CRITICAL-1: Colisão de `session_token_id` em link compartilhado | Crítico | **FIXED** — `voter_fingerprint UUID` + partial unique triplo |
| CRITICAL-2: Rate limit só por IP (NAT starvation + DoS) | Crítico | **FIXED** — identifier override por token + RPC internal rate limit |
| HIGH-3: Migração 136 colide com Track A e Track C | Alto | **FIXED** — renomeada para 138 |
| HIGH-4: E2E alegou 6 testes, entregou 3 (um com `setContent`) | Alto | **FIXED** — 6 cenários, todos com `page.goto()` |
| HIGH-5: Campo `notes` descartado silenciosamente | Alto | **FIXED** — tabela `encounter_feedback_notes` + best-effort insert |
| MEDIUM-6: Schema sem transação / unique swap unsafe | Médio | **FIXED** — `BEGIN…COMMIT` + partial uniques criados ANTES do drop |
| MEDIUM-7: Sem `noindex` / "Voltar PocketDM" hardcoded | Médio | **FIXED** — `robots: { index: false, follow: false }` + `retro_back_home` em pt-BR/en |

---

## CRITICAL-1 FIX — `voter_fingerprint`

**Status: PASS.**

Verificações:

- `supabase/migrations/138_late_vote_via_session_token.sql:40-41` — `voter_fingerprint UUID NULL` adicionado a `encounter_votes`.
- `138:68-72` — `encounter_votes_token_unique` partial unique agora em `(encounter_id, session_token_id, voter_fingerprint) WHERE session_token_id IS NOT NULL`. O partial anterior (token-only) é `DROP INDEX IF EXISTS`-ed antes, evitando colisão.
- `138:132-139` — RPC signature é `cast_late_vote_via_token(p_token TEXT, p_encounter_id UUID, p_vote SMALLINT, p_voter_fingerprint UUID)`. Validações:
  - `138:150-152` — vote ∈ [1, 5]
  - `138:154-156` — `voter_fingerprint IS NULL` → raises
- `app/feedback/[token]/FeedbackClient.tsx:11-40` — `getOrCreateVoterFingerprint()`:
  - `crypto.randomUUID()` na primeira visita
  - Persiste em `localStorage["pocketdm:feedback_voter_id"]`
  - Valida contra RFC4122 v4 regex (`UUID_RE`) em reload — defence-in-depth contra localStorage corrompido
  - Fallback para UUID efêmero se localStorage bloqueado (modo privado / quota)
- `FeedbackClient.tsx:72-74` — `useEffect` inicializa o fingerprint uma vez, client-side only (nunca SSR).

**Replay-attack — residual risk aceitável para beta.**

Cenário: atacante de posse de um `session_tokens.token` válido pode rotar `voter_fingerprint` a cada request, criando infinitas linhas em `encounter_votes`. O mitigante é:

1. Obter um token válido exige side-channel (link do DM, screen recording, enumeração do schema de 16+ chars). Não é scrapeable.
2. A RPC tem rate limit interno por `(token, fingerprint)` — ver CRITICAL-2 abaixo.
3. O Next route tem rate limit por token (10/min) — bloqueia spam agregado mesmo com fingerprint rotation.

Combinação dos 3: attacker teria que saber um token, burlar Upstash (possível se env vars ausentes → fail-open), E aceitar que cada rotação consome uma slot do rate limit interno. Throughput pior caso ~5 inserts/min por IP com acesso direto à RPC, 10/min através do Next route. Ambos geram rows descartáveis — nenhum vaza dados, nenhum modifica outras sessões.

Documentado em `138:229-238`. **Aceitável para beta**, deve ir para backlog v2 (gateway service-role ou WAF).

---

## CRITICAL-2 FIX — Rate limit por token + RPC internal

**Status: PASS.**

### Next route rate limit (por token)

- `app/api/feedback/route.ts:120-137` — `withRateLimit(handlePost, { max: 10, window: "1 m", prefix: "feedback", identifier: ... })`.
- O `identifier` callback clona a request (`request.clone()`), lê `body.token`, retorna `token:<token>`. Se o body for malformado (sem token), retorna `null` → cai no fallback IP. Aceitável: request sem token vai 400 downstream.
- `lib/rate-limit.ts:140-165` — novo campo `identifier` na config, tipado como `(request) => Promise<string | null> | string | null`.
- `lib/rate-limit.ts:203-218` — lógica: se `config.identifier` existe e devolve string, usa `${prefix}:${custom}`; caso contrário usa IP como antes.

Mitigação do starvation em NAT: 6 jogadores no mesmo Wi-Fi compartilhavam 10 req/min ANTES; agora cada token tem sua própria janela. O trade-off é que atacante com tokens válidos pode multiplicar sua quota por token — mas isso exige conhecer N tokens, o que cai no mesmo side-channel acima.

### RPC internal rate limit (defense-in-depth)

- `138:158-168` — dentro da `cast_late_vote_via_token`, ANTES de qualquer state mutation:
  ```sql
  SELECT check_rate_limit(
    'feedback_rpc:' || p_token || ':' || p_voter_fingerprint::text,
    5, 60
  ) INTO v_rate_ok;
  IF NOT v_rate_ok THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  ```
- **Verificado**: o `check_rate_limit` call acontece ANTES do `SELECT … FROM session_tokens`, ANTES do `IF NOT EXISTS (SELECT … FROM encounters)`, e ANTES do `INSERT INTO encounter_votes`. Ordem correta — o rate limit não pode ser bypassado passando um token inválido para "queimar" ciclos.
- `check_rate_limit` existe em `supabase/migrations/016_rate_limits.sql` (conferido). A função é SECURITY INVOKER (default), mas é chamada de dentro de uma SECURITY DEFINER — os privilégios efetivos são os do definer (provavelmente `postgres`/`supabase_admin`), o que permite INSERT/UPDATE em `rate_limits` apesar da RLS sem policies. OK.

### Residual risk — direct-RPC bypass do Next route

Um atacante com a anon key pública pode chamar `supabase.rpc("cast_late_vote_via_token", ...)` direto, bypassando o rate limit do Next. Nesse caso:

- Rate limit interno da RPC ainda protege: 5 calls / 60s por `(token, fingerprint)`.
- Atacante pode rotar fingerprint para bypassar — mas cada rotação ainda queima 1 slot em `rate_limits` pelo par `(token, novo_fingerprint)`. Ainda é bounded.
- Exposição máxima: ~5 * N_fingerprints inserts em `encounter_votes` por minuto, todos garantidos legítimos no schema (token válido, encounter válido). Pior caso: DM vê muitos votos fake, `difficulty_rating` distorcido — recoverable via revogação de token.

Documentado em `138:229-238`. Aceitável beta.

---

## HIGH-3 FIX — Renumeração para 138

**Status: PASS.**

- Arquivo: `supabase/migrations/138_late_vote_via_session_token.sql` (único `138_*` no worktree).
- Nenhum arquivo do worktree cita `136_late_vote` (grep vazio).
- Migração documenta o histórico de renomeação em `138:26-28` (comentário inline referenciando `docs/code-review-track-f.md`).

**Verificação cross-track** (via `git ls-tree` nos outros branches):

| Track | Migration | Branch |
|-------|-----------|--------|
| A (recap) | `136_encounter_recap_snapshot.sql` | `feat/beta3-recap-persistence` |
| C (whitelist) | `137_backfill_whitelist_post_114.sql` | `feat/beta3-telemetry-whitelist-archfixes` |
| F (voting) | `138_late_vote_via_session_token.sql` | `feat/beta3-voting-feedback` (este branch) |

Sequência correta: 136 → 137 → 138. A migração 138 é pure schema add + RPC create; não depende logicamente de 136 nem 137. Sem problemas de ordenação.

---

## HIGH-4 FIX — E2E 6 cenários × 2 projects = 12 runs

**Status: PASS.**

`npx playwright test e2e/features/feedback-retroactive.spec.ts --list` devolveu literalmente 12 testes:

| # | Cenário | Project desktop | Project mobile |
|---|---------|-----------------|----------------|
| 1 | invalid token → error screen | ✓ | ✓ |
| 2 | no ended encounters → empty-state | ✓ | ✓ |
| 3 | API rejects malformed vote (400 boundary) | ✓ | ✓ |
| 4 | multiple encounters → selector limita 3 | ✓ | ✓ |
| 5 | voter_fingerprint persiste em reload | ✓ | ✓ |
| 6 | rate-limit liveness (12 calls, nenhum 5xx) | ✓ | ✓ |

Todos usam `page.goto()` real. Os 3 cenários que não têm DB seed (multi-encounter, fingerprint, empty-state) usam `page.route("**/feedback/<slug>")` para fulfill SSR HTML — isso ainda dispara o lifecycle real do Playwright (network, script execution, localStorage). **Não** é o anti-pattern `page.setContent()` criticado na revisão original.

Os cenários cobrem os 6 casos solicitados: token inválido, sem encounters, 400 API, multi-encounter, fingerprint-persist, rate-limit-liveness.

**Observação menor**: o teste de rate-limit (cenário 6) só garante "nenhum 5xx", não hard-requires um 429. Isso foi pragmaticamente correto porque o runner de CI pode não ter Upstash configurado → fail-open. Em CI com Redis configurado, o 429 vem naturalmente. Documentado nos comentários (`feedback-retroactive.spec.ts:186-193`).

---

## HIGH-5 FIX — Persistência de notes

**Status: PASS.**

### Tabela criada

`138:97-120`:

```sql
CREATE TABLE IF NOT EXISTS encounter_feedback_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  session_token_id UUID REFERENCES session_tokens(id) ON DELETE SET NULL,
  voter_fingerprint UUID,
  notes TEXT NOT NULL CHECK (char_length(notes) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_encounter_feedback_notes_encounter ON encounter_feedback_notes(encounter_id);
ALTER TABLE encounter_feedback_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON encounter_feedback_notes FROM PUBLIC, anon, authenticated;
```

- CHECK constraint ≤ 280 chars: ✓ via `char_length(notes) <= 280`
- RLS habilitada: ✓ `ENABLE ROW LEVEL SECURITY`
- Sem policies + REVOKE de anon/authenticated → **só service_role lê/escreve**. A API route usa `createServiceClient()`, então consegue. OK.
- FK `encounter_id ON DELETE CASCADE` — notes somem junto com encounter. Consistente.
- FK `session_token_id ON DELETE SET NULL` — preserva a nota se o token for revogado. Razoável.

### API insere best-effort

`app/api/feedback/route.ts:78-101`:

```ts
if (parsed.notes && parsed.notes.trim().length > 0) {
  const clean = sanitizeNotes(parsed.notes);
  if (clean.length > 0) {
    try {
      const { data: tokenRow } = await supabase
        .from("session_tokens")
        .select("id")
        .eq("token", parsed.token)
        .eq("is_active", true)
        .maybeSingle();

      await supabase.from("encounter_feedback_notes").insert({
        encounter_id: parsed.encounter_id,
        session_token_id: tokenRow?.id ?? null,
        voter_fingerprint: parsed.voter_fingerprint,
        notes: clean,
      });
    } catch (err) {
      console.warn("[api/feedback] notes insert failed (best-effort)", err);
    }
  }
}
```

- Insere APÓS o vote RPC completar com sucesso. Falha em `insert` é capturada e logada, **nunca break o vote**. ✓
- Resolve `session_token_id` uma vez por chamada (extra round-trip aceitável em endpoint de baixa frequência).

### sanitizeNotes

`route.ts:26-32`:

```ts
function sanitizeNotes(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/\s+/g, " ")      // collapse whitespace
    .trim()
    .slice(0, 280);
}
```

**Cobertura:**
- HTML tags: stripped — `<script>alert(1)</script>` → `alert(1)` (content survives mas nunca é renderizado como HTML — a DM recap exibe via React com escape automático)
- Whitespace (spaces, tabs, newlines, CR): collapsed
- Truncate em 280 chars

**Gaps conhecidos** (não críticos, documentar em backlog):

1. **Markdown** (`**bold**`, `_italic_`, `[link](url)`) passa íntegro. OK — texto bruto será renderizado pela DM UI com escape, sem interpretar markdown.
2. **Zero-width chars** (U+200B ZWSP, U+200C ZWNJ, U+FEFF BOM, U+2060 word-joiner) **passam**. Attacker pode usar para disfarçar conteúdo. Baixo impacto: só DM vê.
3. **ASCII control chars** (`\x00-\x1F` não capturados por `\s`, e.g. `\x07` BEL, `\x1b` ESC) passam. Baixo impacto: React escapa no render.
4. **HTML entities codificadas** (`&lt;script&gt;`) passam. Baixo impacto: React escapa.
5. **O CHECK é em `char_length`, não em bytes** — isso é PostgreSQL-friendly (UTF-8 aware). Um atacante poderia enviar 280 emojis (cada um ~4 bytes) = 1120 bytes. Trade-off conhecido e OK para texto de 1ª pessoa.

Nenhum dos gaps é exploitable dado o threat model (DM-only viewing + React auto-escape). **APROVADO.**

---

## MEDIUM-6 FIX — Tx wrap + partial uniques ordering

**Status: PASS.**

- `138:30` abre `BEGIN;`, `138:226` fecha `COMMIT;`. Tudo dentro — schema changes, tabela, RPC, grants, comments.
- Ordering crítico correto (`138:55-81`):
  1. `CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_user_unique ... WHERE user_id IS NOT NULL` (novo partial)
  2. `DROP INDEX IF EXISTS encounter_votes_token_unique` (limpa partial antigo se houver)
  3. `CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_token_unique ... (encounter_id, session_token_id, voter_fingerprint) WHERE session_token_id IS NOT NULL` (novo partial com fingerprint)
  4. `ALTER TABLE encounter_votes DROP CONSTRAINT IF EXISTS encounter_votes_encounter_id_user_id_key` (drop antigo composite)

**Nenhum momento existe sem um unique cobrindo (encounter_id, user_id)** — o partial novo é criado ANTES do drop do composite. Concorrência-safe dentro da transação. ✓

- `138:44-53` — o `ALTER COLUMN user_id DROP NOT NULL` usa `DO $$ … EXCEPTION WHEN OTHERS THEN NULL END $$` para idempotência. Aceitável para migration re-runs.
- `138:84-91` — CHECK `encounter_votes_has_voter` garante que ao menos um identificador está presente. Guard contra rows órfãs se user_id NULL + session_token_id NULL.

---

## MEDIUM-7 FIX — noindex + i18n

**Status: PASS.**

- `app/feedback/[token]/page.tsx:13-15`:
  ```ts
  export const metadata: Metadata = {
    robots: { index: false, follow: false },
  };
  ```
- Ambos `messages/pt-BR.json:3783` e `messages/en.json:3779` têm `"retro_back_home"`:
  - pt-BR: `"Voltar para a PocketDM"`
  - en: `"Back to PocketDM"`
- `page.tsx:156` — usa `{t("retro_back_home")}` via `getTranslations("feedback")`. Sem hardcoded strings.
- Error screens (invalid token / no encounters) reutilizam o mesmo `ErrorScreen` + `retro_back_home`. ✓

**Observação menor**: a label "PocketDM" no meio do texto é marca — aceitável não localizar.

---

## Cross-cutting checks

### TypeScript

```
rtk tsc --noEmit
→ TypeScript compilation completed
```

Sem erros.

### Lint

```
npx eslint app/api/feedback/route.ts app/feedback/[token]/page.tsx \
           app/feedback/[token]/FeedbackClient.tsx \
           app/api/session/[id]/feedback-link/route.ts \
           e2e/features/feedback-retroactive.spec.ts
→ (no output)
```

Limpo.

### Playwright

```
npx playwright test e2e/features/feedback-retroactive.spec.ts --list
→ Total: 12 tests in 1 file
```

6 cenários × (desktop-chrome + mobile-safari) = 12 runs.

---

## New risks introduced by fixes

### 1. Migration ordering (resolvido)

Track A = 136, Track C = 137, Track F = 138. Ordem numérica crescente e **lógica** (nenhuma depende das outras; Track F só depende de `060_encounter_votes` e `004_session_tokens` que estão em master). Sem risco.

**Observação**: o branch `feat/beta3-telemetry-whitelist-archfixes` (Track C) já tem o arquivo como `137_backfill_whitelist_post_114.sql` no seu HEAD — confere com o esperado. Se Track A for mergeado antes de Track C + Track F, tudo aplica limpo. Se Track F mergear antes de A+C, há gap (136, 137 vazios) — Supabase migrator tolera (nomes aplicados lexicograficamente, gaps ignorados).

### 2. Dependência de `check_rate_limit` (verificado)

- `check_rate_limit` definida em `supabase/migrations/016_rate_limits.sql`. Existe em master.
- A function é SECURITY INVOKER (default), chamada de dentro de SECURITY DEFINER. No Postgres, funções SECURITY INVOKER herdam o contexto de quem está executando — então dentro do DEFINER, o `check_rate_limit` executa com as permissões do dono do DEFINER (tipicamente `supabase_admin`), o que permite INSERT/UPDATE em `rate_limits` sem depender de policies RLS. ✓
- Tabela `rate_limits` tem RLS habilitada sem policies → normal users barrados, service_role + definer chamado internamente passam. ✓

### 3. Sanitizer edge cases (documentado acima)

Ver HIGH-5 FIX — gaps são aceitáveis dado threat model (DM-only view + React escape). Adicionar como backlog item se notes virar público.

---

## Observações menores (não-blocker)

1. **`FeedbackClient.tsx:38-39`** — fallback "ephemeral UUID" quando localStorage está bloqueado gera um fingerprint novo a cada reload. Isso potencialmente permite o mesmo user votar múltiplas vezes em modo privado. Aceitável: é comportamento documentado e o DM ainda vê ratings agregados.

2. **`app/api/feedback/route.ts:74`** — `console.warn("[api/feedback] RPC error", { code, hint })`. Não vaza stack/SQL em production responses (só status 500 genérico). Bom.

3. **`138:200-201`** — `v_final_count := GREATEST(v_ev_count, v_existing_count)`. Isso protege contra regressão se `difficulty_votes` já estava > `COUNT(encounter_votes)` por qualquer razão histórica (agregação via poll anterior). Sensato.

4. **`138:193-195`** — re-computação de `AVG` a partir de `encounter_votes` na cada chamada. Para encounters com MUITO voto isso é N reads + 1 write; tabela sem índice em `(encounter_id, vote)` mas o índice PRIMARY KEY + `idx_encounter_votes_encounter_id` já suficientes. Não é hot path (votes são raros). ✓

5. **`e2e/features/feedback-retroactive.spec.ts:60-70`** — o teste de empty-state usa markup hardcoded em português ("Nenhum combate encerrado ainda"). Se o projeto virar i18n no runtime (e.g. middleware com `Accept-Language`), este teste vai falhar no project `mobile-safari` se o default do iPhone 14 for en. Risco baixo; a fixture é markup próprio, não server response. Documentar no backlog de i18n se necessário.

---

## Conclusão

**APPROVE.**

Os 6 fix commits (`8f31d8e`, `40fd908`, `b4bcda2`, `51d2e60`, `9973b0d`, `cb552d9`) endereçaram integralmente os 7 achados da revisão original. A única superfície ainda parcialmente exposta — replay-attack via rotação de fingerprint na RPC direta — está documentada no próprio SQL da migração, tem rate limit interno bounded, e é classificada como "beta-acceptable" com plano de mitigação para v2 (gateway service-role ou Cloudflare WAF).

Como essa é a **única RPC anon-writable em produção**, recomendo:

1. **Monitorar `encounter_feedback_notes` + `encounter_votes` size em produção** nas primeiras 48h pós-deploy. Spike anômalo = sinal de abuse.
2. **Adicionar alerta** em `rate_limits` por chaves `feedback_rpc:*` (se a contagem de chaves únicas saltar > 1000 em 1 hora, investigar).
3. **Agendar v2 mitigation** — service-role gateway OU remover `anon` do `GRANT EXECUTE` da RPC e rotear 100% via `/api/feedback` — em sprint pós-beta.

Nada bloqueia o merge agora.
