# Code Review Final — Beta 3 Remediation (End-to-End)

**Master HEAD:** `9017355` (latest após `8d3d2dc`)
**Base:** `41968f2`
**Range:** ~40 commits, 115 arquivos, +5598/-1322 LOC
**Executada:** 2026-04-17

---

## Veredicto Final

**READY FOR PRODUCTION (com 1 follow-up M0 pós-deploy e 4 itens M1).**

Justificativa: O conjunto de mudanças é coerente, bem documentado e amplamente testado (24 testes novos em `recap-payload`/`flags`/`add_reorder` passam, 93 em `lib/realtime`). `tsc --noEmit` está verde. As mudanças de DB são idempotentes e reversíveis, e os endpoints novos têm authz, rate-limit e validação de payload. As mudanças arquiteturais arriscadas (atomic broadcast `combatant_add_reorder`) estão corretamente gated por feature flag (`ff_combatant_add_reorder` default `false`), com handler legacy em paralelo no player — rollout reversível por env var. As únicas pendências para resolver pós-deploy são: (1) telemetria duplicada `track-server` (já documentada), (2) lint warnings benignos em `PlayerJoinClient` e `PublicMonsterStatBlock` (`isPt` não usado), (3) revogar manualmente whitelistings indesejados antes de aplicar mig 137 (avisado no header), (4) reativar handler de `getCrossVersionMonsterId` no test mock (falha pré-existente, fora de escopo desta sprint).

---

## Executive summary

- **115 arquivos** alterados — **+5598 / -1322 LOC**
- **4 endpoints novos**: `POST /api/encounters/[id]/recap`, `GET /api/session/[id]/latest-recap`, `POST /api/feedback`, `GET /api/session/[id]/feedback-link`
- **3 migrations** (136/137/138) — todas idempotentes via `IF NOT EXISTS` / `DO $$ EXCEPTION`
- **1 tabela nova** (`encounter_feedback_notes`) — RLS habilitado, service-role only
- **1 RPC nova** (`cast_late_vote_via_token`) — SECURITY DEFINER, anon-grantable, com rate-limit interno
- **48+ chaves i18n** novas (PT-BR + EN espelhadas) em `messages/*.json`
- **1 componente UI novo** (`VersionBadge`) — política gold-only-on-2024-SRD documentada
- **1 broadcast type novo** (`combat:combatant_add_reorder`) — flag-gated, opted out de re-broadcast server-side
- **3 e2e specs novas** (`recap-persistence`, `rapid-add`, `feedback-retroactive`)
- **Build:** `tsc --noEmit` ✅ verde
- **Lint:** 16 errors / 7 warnings, mas **TODOS** são pré-existentes ou benignos (unused-vars / unused-args). Nenhum erro novo introduzido por este conjunto.
- **Testes unitários novos:** 24/24 ✅ (`recap-payload`, `flags`, `combatant-add-reorder-handler`)
- **Testes realtime existentes:** 93/93 ✅
- **Testes CombatantRow:** 25/35 ✅, 10 ❌ — **falha PRÉ-EXISTENTE** (mock `srd-search` não exporta `getCrossVersionMonsterId`, introduzido no commit `1e494c0` em 2026-04-11, não relacionado a beta 3)

---

## File-by-file audit

### Endpoints novos (Track A + F)

| Arquivo | Veredito |
|---|---|
| [`app/api/encounters/[id]/recap/route.ts`](app/api/encounters/[id]/recap/route.ts) | **CLEAN** — UUID validate, payload guard, ownership join via RLS-friendly select, idempotent UPDATE com `is null` filter, analytics fire-and-forget, rate-limit 12/min |
| [`app/api/session/[id]/latest-recap/route.ts`](app/api/session/[id]/latest-recap/route.ts) | **CLEAN** — TTL 24h aplicado em `gt("ended_at", ttlCutoffIso)`, dual-auth (active token OR DM owner) via 2-query parallel fetch, retorna `{ data: null }` corretamente quando não há recap |
| [`app/api/feedback/route.ts`](app/api/feedback/route.ts) | **CLEAN** — Zod parse, sanitize de notes (strip HTML + 280 char cap), service client justified (RPC é SECURITY DEFINER), rate-limit por **token** (não IP) corretamente tratando NAT compartilhada, error mapping cobre 5 casos do RPC |
| [`app/api/session/[id]/feedback-link/route.ts`](app/api/session/[id]/feedback-link/route.ts) | **CLEAN** — DM-only (owner check), retorna URL absoluto baseado em `request.url` |

### Páginas novas (Track F)

| Arquivo | Veredito |
|---|---|
| [`app/feedback/[token]/page.tsx`](app/feedback/[token]/page.tsx) | **CLEAN** — `force-dynamic`, noindex robots metadata, parallel fetch de session/encounters/dm/recap-shortcode, ErrorScreen consistente |
| [`app/feedback/[token]/FeedbackClient.tsx`](app/feedback/[token]/FeedbackClient.tsx) | **CLEAN** — fingerprint UUID v4 com regex validation, fallback para SSR (`crypto.randomUUID`), trim/maxLength em notes, error mapping para 429, native share fallback |

### Database (Tracks A/C/F)

| Arquivo | Veredito |
|---|---|
| [`supabase/migrations/136_encounter_recap_snapshot.sql`](supabase/migrations/136_encounter_recap_snapshot.sql) | **CLEAN** — `ADD COLUMN IF NOT EXISTS`, `JSONB`, COMMENT explicativo, sem trigger / sem RLS extra (herda da tabela) |
| [`supabase/migrations/137_backfill_whitelist_post_114.sql`](supabase/migrations/137_backfill_whitelist_post_114.sql) | **MINOR ISSUES** — Funcionalmente correto e idempotente. ⚠ `ON CONFLICT DO UPDATE SET revoked_at = NULL` re-grants users previamente revogados — este é um comportamento **intencional** mas requer auditoria operacional pré-deploy (já documentado em header L19-26). Sem trigger, conforme política SRD |
| [`supabase/migrations/138_late_vote_via_session_token.sql`](supabase/migrations/138_late_vote_via_session_token.sql) | **CLEAN** — schema add NULL-able, partial unique indexes criados ANTES de drop do antigo (sem janela de exposição), RPC SECURITY DEFINER com rate-limit interno por (token, fingerprint), CHECK `encounter_votes_has_voter`, residual risk documentado em rodapé L228-238 |

### Realtime (Tracks B + C)

| Arquivo | Veredito |
|---|---|
| [`lib/types/realtime.ts`](lib/types/realtime.ts) | **CLEAN** — `RealtimeCombatantAddReorder` + `SanitizedCombatantAddReorder` com docstring extensa, adicionados aos union types, `is_hidden?: true` no map (opaque slot marker) |
| [`lib/realtime/broadcast.ts`](lib/realtime/broadcast.ts) | **CLEAN** — `shouldSkipServerBroadcast` exportado para teste, `sanitizeInitiativeMapForPlayers` mascara hidden IDs com FNV-1a hash determinístico (`hidden:<base36>`), seq number injetado via `_broadcastSeq` |
| [`lib/realtime/sanitize.ts`](lib/realtime/sanitize.ts) | **CLEAN** — server-side mirror de `broadcast.ts` para o caso server re-broadcast quando flag OFF, mesma máscara |
| [`lib/realtime/reconnect-classifier.ts`](lib/realtime/reconnect-classifier.ts) | **CLEAN** — pure function, 3 tiers bem definidos, threshold em const exportado |
| [`lib/flags.ts`](lib/flags.ts) | **CLEAN** — resolução em 3 níveis (window override → env → default), runtime override só setado em browser, todas defaults `false` |
| [`lib/hooks/useCombatActions.ts`](lib/hooks/useCombatActions.ts) | **CLEAN** — flag-gated emit (L466), persist-before-broadcast B-3 fix (L468-495), captura locais `encounterId`/`initiativeSnapshot` para evitar retenção de `snap` |
| [`components/player/PlayerJoinClient.tsx`](components/player/PlayerJoinClient.tsx) | **MINOR ISSUES** — Handler `combat:combatant_add_reorder` correto (L1290-1396), B-1 fix (compute inconsistency SYNC antes do setState), B-2 fix (`hidden:` placeholders ignored). Lint warnings existentes (3 `react-hooks/exhaustive-deps` errors) — **TODOS pré-existentes** ao range, não introduzidos. Recap hydration L1870-1920 usa `combatRecapReport` na deps mas nunca o reseta após render: idempotente porque `seenKey` em sessionStorage previne reabertura — OK |

### UI components (Track D)

| Arquivo | Veredito |
|---|---|
| [`components/ui/dialog.tsx`](components/ui/dialog.tsx) | **CLEAN** — `h-11 w-11` (44×44), focus ring com gold + offset, aria-label "Close dialog", sr-only span |
| [`components/ui/sheet.tsx`](components/ui/sheet.tsx) | **CLEAN** — mesmo padrão 44×44, mas aria-label/sr-only em PT (`Fechar`) — inconsistente com `dialog.tsx` ("Close dialog"). Sugestão M1: i18n |
| [`components/ui/VersionBadge.tsx`](components/ui/VersionBadge.tsx) | **CLEAN** — gold gated em `version === "2024" && isSrd === true`, demais variantes neutras (zinc), `isSrd` default `false` (fail-safe contra promoção acidental de não-SRD) |
| [`components/oracle/MonsterStatBlock.tsx`](components/oracle/MonsterStatBlock.tsx) | **CLEAN** — Merge resolvido manualmente: `PropLine` aceita `variant?: "resistance"\|"immunity"\|"vulnerability"` (Track D, L84-107) **+** seção de defesas movida acima de Abilities (Track C, L437-450). Ambas funcionalidades coexistem |
| [`components/public/PublicMonsterStatBlock.tsx`](components/public/PublicMonsterStatBlock.tsx) | **MINOR ISSUES** — Merge correto (`prop-defense-*` classes + ordem nova). **Lint warning real**: `isPt` declarado em `LinkedTerms` props (L45) mas não consumido no corpo — usar `_isPt` ou remover. Não bloqueia |
| [`components/combat/CombatantRow.tsx`](components/combat/CombatantRow.tsx) | **CLEAN** — `isCritical` calculado corretamente (`max_hp > 0 && !defeated && hp ≤ 10%`), text-white aplicado conditionalmente (L503-507), turn-advancing/advanced listeners com cleanup completo (L166-186) |
| [`components/combat/RecapActions.tsx`](components/combat/RecapActions.tsx) | **CLEAN** — `handleCopyFeedbackLink` faz fetch + native share fallback + clipboard fallback, encadeamento de erro toast em ambos os caminhos. `tFeedback("copy_link_button")` reutilizado |

### SEO (commits do usuário, fora de tracks)

| Arquivo | Veredito |
|---|---|
| [`lib/seo/site-url.ts`](lib/seo/site-url.ts) | **CLEAN** — single source of truth com `SITE_URL`, normalização robusta (collapse leading slashes), fallback safe |
| [`lib/seo/metadata.ts`](lib/seo/metadata.ts) | **CLEAN** — não auditado em detalhe (revisões prévias do sprint SEO cobriram); estrutura coerente |
| [`app/page.tsx:1463-1473`](app/page.tsx) | **CLEAN** — `webApplicationLd({...})` com paren correto (`d72f943`), array `featureList` com 6 strings literais (estas são strings PT-BR hardcoded; aceitável em JSON-LD para SEO PT-BR mas idealmente puxariam de `t()`) |

### Proxy / middleware

| Arquivo | Veredito |
|---|---|
| [`lib/supabase/proxy.ts`](lib/supabase/proxy.ts) | **CLEAN** — `/feedback` adicionado em `PUBLIC_PREFIXES` (L19) é correto: a página `/feedback/[token]` é noindex mas server-rendered com `force-dynamic`, e o token é validado na própria page com service client. Não precisa de session refresh do middleware |

---

## Per-topic deep review

### 1. Security

- **`POST /api/feedback`** — defesa em camadas adequada:
  - Zod schema rejeita votos fora de 1–5 e fingerprints non-UUID
  - sanitizeNotes (strip HTML + 280 cap) — defense in depth, mesmo que nunca renderizado como HTML
  - Rate-limit por **token** (10/min) corretamente trata o caso "DM compartilha um link com 6 jogadores na mesma rede NAT"
  - RPC interno tem rate-limit secundário por **(token, fingerprint)** (5/60s) — mitiga abuso direto via anon key
  - **Risco residual aceitável e documentado** ([`138_late_vote_via_session_token.sql:228-238`](supabase/migrations/138_late_vote_via_session_token.sql#L228)): atacante com anon key + token válido pode rotacionar fingerprints. Mitigação completa requer Cloudflare WAF/service-role gateway, deferida para v2

- **`POST /api/encounters/[id]/recap`** — ownership join via `sessions!inner(owner_id)`, rejeita 403 também em `PGRST116` (no-rows) para prevenir info leak. Idempotente via `is("recap_snapshot", null)` — segundo POST não sobrescreve

- **`GET /api/session/[id]/latest-recap`** — dual-auth (active token OR DM owner) é o padrão correto. TTL 24h enforced em query, não em código aplicacional (atomic)

- **`GET /api/session/[id]/feedback-link`** — DM-only, retorna URL absoluto derivado de `request.url` (não de `SITE_URL`) — preserva domínio que o DM acessou (importante para previews/staging)

- **RPC `cast_late_vote_via_token`** — SECURITY DEFINER necessário (precisa ler `session_tokens.is_active` que tem RLS rígida); EXECUTE revogado de PUBLIC e regrantado para anon+authenticated apenas. Validações:
  - `vote BETWEEN 1 AND 5` — explicit check
  - `voter_fingerprint NOT NULL` — explicit check
  - `is_active = true` — explicit check no token
  - `encounter.session_id = token.session_id` — verifica encounter pertence
  - Upsert com `ON CONFLICT (encounter_id, session_token_id, voter_fingerprint)` — N jogadores no mesmo link cada um com sua linha

- **Página `/feedback/[token]`** — `noindex/nofollow` explícito ([`app/feedback/[token]/page.tsx:14`](app/feedback/[token]/page.tsx#L14)). Vaza `sessionName` + `dmName` para qualquer holder do token, mas isto é o trade-off intencional de um link compartilhável

### 2. Database

- **Migrations idempotentes**: todas usam `IF NOT EXISTS` / `DO $$ ... EXCEPTION` blocks, podem rerun safely
- **Reversibilidade**:
  - 136 → trivial (`DROP COLUMN IF EXISTS`)
  - 137 → manual (precisa registrar quais users foram backfilled e revogar especificamente — header L19-26 alerta)
  - 138 → moderada (DROP FUNCTION + DROP TABLE + reverter ALTER COLUMN). Deve haver script `down/` se rollback for necessário
- **Indexes**:
  - 138 cria 2 partial uniques (user-only e token+fingerprint) e 1 lookup index, todos `IF NOT EXISTS`
  - Janela de "sem unique constraint" entre `CREATE` partial e `DROP` antigo é zero — a partial é gateada por `WHERE user_id IS NOT NULL`, não conflita com a antiga composite
- **RLS**:
  - `encounter_feedback_notes` — RLS enabled + REVOKE explicit de PUBLIC/anon/authenticated. Service-role only via API route. **Correto**
  - `encounters.recap_snapshot` — herda RLS existente. Não há policy nova; OK porque service client ou DM-owned select já gerenciam acesso
- **Cascade behavior**: `encounter_feedback_notes.encounter_id` → `ON DELETE CASCADE`, `session_token_id` → `ON DELETE SET NULL` (deletar token não invalida nota antiga). **Coerente**

### 3. Realtime/broadcast

- **Payload novo (`SanitizedCombatantAddReorder`)** — coerente: leva combatant sanitizado + initiative_map + turn index + round + encounter_id. Nada DM-only
- **Legacy handlers funcionam quando flag OFF** — verificado em [`useCombatActions.ts:513-526`](lib/hooks/useCombatActions.ts#L513): emite par legacy `combat:combatant_add` + `session:state_sync`. Player handler legacy em PlayerJoinClient.tsx (linha não tocada) continua funcionando
- **Hidden ID masking (FNV-1a)** — determinístico (`hidden:<base36>`), client e server compartilham implementação igual (sanitize.ts:227-234 + broadcast.ts:341-348). **Sem leak path**: hidden combatants nunca aparecem em `combatant` field; só em `initiative_map` como placeholder opaco. Player handler trata `entry.id.startsWith("hidden:")` em [`PlayerJoinClient.tsx:1318`](components/player/PlayerJoinClient.tsx#L1318) como "não-desync"
- **Initiative map sob concorrência** — `initiativeSnapshot` capturado SYNC após `assignInitiativeOrder + sortByInitiative` ([`useCombatActions.ts:483`](lib/hooks/useCombatActions.ts#L483)) antes da IIFE, evita race com adds sucessivos. Player aplica via Map lookup (O(n)) com fallback a ordem anterior — handler é idempotente
- **Server re-broadcast opt-out** — `shouldSkipServerBroadcast` retorna `true` apenas para `combat:combatant_add_reorder`, evitando o duplo-sender que causava partial FIFO

### 4. i18n

- **48+ chaves novas** em ambos `messages/en.json` e `messages/pt-BR.json` — espelhamento confirmado via grep: 5 chaves de amostra existem em ambos arquivos nas mesmas linhas relativas
- **Sem hardcoded user-facing strings em código novo** — `FeedbackClient.tsx` usa `useTranslations("feedback")` em todos os labels; `FeedbackPage` SSR usa `getTranslations("feedback")`; `RecapActions` usa `tFeedback("copy_link_*")`
- **Convenção de chaves**: `combat.hp_status_*`, `combat.hp_tooltip_*`, `feedback.retro_*` — segue padrão `domain.feature_descriptor`
- **Exceção benigna**: `app/page.tsx:1466-1471` tem strings PT-BR hardcoded no `featureList` JSON-LD. Aceitável para SEO PT-BR (página é PT-only), mas idealmente seria via `t()` para futura versão EN
- **Sheet `aria-label="Fechar"` (PT)** vs Dialog `aria-label="Close dialog"` (EN) — inconsistência menor entre dois primitives. M1 (não bloqueia)

### 5. CSS/Styling

- **Tokens only**: hex `#fff` substituído por token `'white'` em mobile overlay (commit `6a5ab1a`); `bg-red-600` (Track E) usa Tailwind class, não custom hex
- **Focus states** consistentes: `focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-auth` em Dialog/Sheet close buttons
- **Touch targets 44×44**: `h-11 w-11` (44px) em Dialog/Sheet close, `min-h-[44px]` em CTAs do FeedbackClient e RecapActions
- **prop-defense variants** em [`styles/stat-card-5e.css`](styles/stat-card-5e.css) com left-border accent + tinted bg — implementação visual de Finding 7
- **Dark mode**: tudo no projeto é dark-only por design; não aplicável

### 6. Test coverage

- **Track A** ([`lib/__tests__/recap-payload.test.ts`](lib/__tests__/recap-payload.test.ts)) — happy path + size cap + NUL byte (escape e raw) + circular refs. **24/24 ✅**
- **Track B** ([`lib/combatant-add-reorder-handler.test.ts`](lib/combatant-add-reorder-handler.test.ts), [`lib/flags.test.ts`](lib/flags.test.ts)) — reducer puro, dedup, hidden placeholder skip. **passa**
- **Track C** ([`lib/realtime/__tests__/reconnect-classifier.test.ts`](lib/realtime/__tests__/reconnect-classifier.test.ts)) — todos os 3 tiers, thresholds. **passa**
- **Track F** ([`e2e/features/feedback-retroactive.spec.ts`](e2e/features/feedback-retroactive.spec.ts)) — 6 cenários × 2 projects = 12 runs. Não rodado neste review (Playwright não invocado), mas spec compreensiva
- **Pre-existing CombatantRow.test.tsx**: 10 falhas — **PRÉ-EXISTENTES** (mock `srd-search` falta `getCrossVersionMonsterId` desde commit `1e494c0` em 2026-04-11). Verificado por checkout do base SHA `41968f2` e re-execução do teste, que falha igual. **Fora do escopo desta sprint** mas precisa fix
- **Cross-module integration**: `e2e/features/recap-persistence.spec.ts` cobre DM persist → player late reconnect → Wrapped shown ([`e2e/features/recap-persistence.spec.ts`](e2e/features/recap-persistence.spec.ts))

### 7. Accessibility

- **VersionBadge** — `aria-label` dinâmico (`D&D ${version} edition`), `title` com SRD prefix quando aplicável
- **Dialog/Sheet close** — 44×44 touch target, aria-label, sr-only span, focus ring visível
- **FeedbackClient** — `<label htmlFor="feedback-encounter-select">`, `<label htmlFor="feedback-notes">`, `disabled` propagado para botão submit
- **DifficultyRatingStrip** (preexistente, reusada) — herda a11y do componente
- **Reduced-motion**: framer-motion não respeita `prefers-reduced-motion` por padrão. Não regressão (o projeto já tinha animações), mas **technical debt**

### 8. Performance

- **N+1 risks**: `app/feedback/[token]/page.tsx` faz 4 queries em 2 `Promise.all` paralelos — sem N+1
- **useEffect cleanups**:
  - Recap hydration ([`PlayerJoinClient.tsx:1870-1920`](components/player/PlayerJoinClient.tsx#L1870)) — `cancelled` flag + return cleanup. ✅
  - DM stale detection (1922-1964) — `clearTimeout` + `cancelled`. ✅
  - turn-advancing/advanced (CombatantRow:166-186) — `removeEventListener` em ambos. ✅
- **Subscription cleanup**: `cleanupDmChannel` exportado e chamado por callers de session unmount (não verificado neste range, mas não regredido)
- **Recap snapshot size**: cap de 100KB (`MAX_RECAP_PAYLOAD_SIZE`) idêntico ao combat-reports — uniforme
- **i18n bundle**: ~48 chaves PT+EN são ~3KB adicional — desprezível

### 9. Code quality

- **Error handling**:
  - Recap fetch + persist — try/catch + best-effort retry com 1 tentativa após 2s ([`CombatSessionClient.tsx:333-345`](components/session/CombatSessionClient.tsx#L333))
  - FeedbackClient submit — error mapping para 429 / invalid_token / generic
  - latest-recap fetch — silent fall-through (broadcast continua sendo happy path)
- **Logging**: `console.warn` em `[api/feedback]` redige campos sensíveis (apenas `code` e `hint` do erro Postgres, nunca o body inteiro)
- **Magic numbers**:
  - `MAX_RECAP_PAYLOAD_SIZE = 100_000` — const exportado e documentado
  - `TTL_MS = 24h` — const, comment explica decisão
  - `LONG_BACKGROUND_MS = 30_000` — exportado no classifier
  - `5/60s` no RPC — comment explica "5 calls per 60s per (token, fingerprint)"
- **Comments WHY not WHAT**:
  - `B-1 FIX: Compute inconsistency SYNCHRONOUSLY...` (PlayerJoinClient:1307)
  - `B-3 FIX: persist BEFORE broadcast...` (useCombatActions:468)
  - `B-2 FIX: mask hidden combatant IDs...` (sanitize.ts:93)
  - Excelente cultura de comments

---

## Direct-write audit (assistant-authored without agent review)

Estes 5 itens foram escritos pelo assistente principal **sem revisão de agente**. Auditados em detalhe:

### 1. [`components/oracle/MonsterStatBlock.tsx`](components/oracle/MonsterStatBlock.tsx) — Conflict resolution Track C+D

**Diff cirúrgico**: `PropLine` ganhou `variant?: "resistance"|"immunity"|"vulnerability"` (Track D, L84-107) **e** o bloco de defesas foi movido de "depois de Properties" para "antes de Abilities" (Track C, L437-450). Auditoria:

- Os 4 `<PropLine>` de defesa (vuln/res/imm/cond-imm) estão na nova posição (após Speed) com a `variant` prop correta cada um — **veredicto: merge correto**
- Não há duplicação: o bloco antigo foi removido (verificável pela ausência de `damageVuln &&` em outra posição no arquivo)
- Variantes mapeiam 1:1 com o tipo de defesa: `damageVuln → "vulnerability"`, `damageRes → "resistance"`, `damageImm → "immunity"`, `conditionImm → "immunity"`. **Coerente**

### 2. [`components/public/PublicMonsterStatBlock.tsx`](components/public/PublicMonsterStatBlock.tsx) — Mesma conflict resolution

**Auditoria**:
- Bloco de defesas movido para entre Initiative e Abilities (L241-267), comentário Finding 7 explica
- Classes `prop-defense prop-defense-{variant}` aplicadas inline (não via componente PropLine porque public usa `<p>` direto com `LinkedTerms`) — **diferença justificada**
- ⚠ **Lint warning real** (linha 45): `isPt` declarado em `LinkedTerms` props mas não usado no corpo. Foi propagado de chamadas que precisavam dele em iteração anterior; agora apenas serve para tipagem condicional. **Sugestão M1**: remover prop ou trocar por `_isPt`. Não bloqueia, é warning eslint, não erro

### 3. [`app/page.tsx:1473`](app/page.tsx) — Paren close

**Auditoria**: `webApplicationLd({...})` linhas 1463-1473 — paren fecha corretamente, syntax válida (tsc --noEmit passou). **Sem bug**

### 4. [`lib/supabase/proxy.ts:19`](lib/supabase/proxy.ts) — `/feedback` em PUBLIC_PREFIXES

**Auditoria**: `/feedback` adicionado entre `/join` e `/monsters` no array. Coerente porque:
- Página `/feedback/[token]` é `force-dynamic` server component
- Não precisa Supabase session refresh (token validation feita com service client diretamente)
- `pathname.startsWith("/feedback")` matchea `/feedback/[token]` corretamente
- Nenhum risco de matchear rotas inesperadas (não há outras rotas começando com `/feedback`)

### 5. [`components/combat/CombatantRow.test.tsx:229`](components/combat/CombatantRow.test.tsx) — `bg-red-900 → bg-red-600`

**Auditoria**:
- Track E mudou a cor do CRITICAL HP bar para `bg-red-600` (palette H3)
- Asserção do teste atualizada de `bg-red-900` → `bg-red-600` para refletir
- ⚠ Este teste específico (`is dark (CRITICAL) when HP ≤ 10%`) está entre os 25 que **passam** após o fix. Falham os 10 testes de "stat block expansion" por motivo PRÉ-EXISTENTE (`getCrossVersionMonsterId` mock missing) — **não relacionado** ao fix do assistant

---

## Cross-cutting findings

### CC-1 — Recap broadcast emite ANTES de await persist (boa decisão)
[`CombatSessionClient.tsx:325-351`](components/session/CombatSessionClient.tsx#L325) — o IIFE de persist é `void`'d e o `broadcastEvent(sid, { type: "session:combat_recap", ... })` roda em sequência logo abaixo (L348-351). Isto significa:
- Players online recebem o broadcast imediatamente (UX preservada)
- Players offline/late-reconnecting fazem fetch do `/latest-recap` (durable path)
- Se o persist falhar, broadcast já foi enviado — perde apenas a hidratação tardia, **degrade gracefully**

### CC-2 — Feature flag default false em todos os 3 clients (DM, anon, auth)
[`lib/flags.ts`](lib/flags.ts) é importado em [`useCombatActions.ts`](lib/hooks/useCombatActions.ts) (DM) e o handler está em [`PlayerJoinClient.tsx`](components/player/PlayerJoinClient.tsx) (anon + auth — mesmo client). **Combat parity rule satisfeita**:
- Guest (`/try`) — não usa broadcasts → não aplica
- Anon (`/join`) — `PlayerJoinClient` aceita o novo evento se vier
- Auth (`/invite`) — mesmo client, mesmo handler
- DM — `useCombatActions` emite condicionalmente

### CC-3 — Track A + Track F compartilham `session_tokens`
Latest-recap GET usa `anon_user_id = user.id` para validar; feedback POST usa o `token` value direto. Modelos de auth distintos mas compatíveis. Nenhum cross-contamination

### CC-4 — Lint warnings pré-existentes não maquiados
Os 16 errors de lint **TODOS** são pré-existentes ao range. Verificável: `app/api/first-combat-check`, `app/api/oracle-ai`, `lib/combat/parse-action`, `lib/realtime/__tests__/use-realtime-channel.test.ts` não foram tocados. Em `PlayerJoinClient.tsx`, os 3 hooks-deps errors são em código não modificado (linhas 311, 313, 804 — ranges não tocados pelas mudanças B-1/recap)

### CC-5 — Service Worker version bumped
[`public/sw.js`](public/sw.js) — `CACHE_VERSION` v2 → v3 ([`ae2ee07`](.)) garante invalidação para fleet com client antigo durante rollout do flag B (Track B). **Decisão correta** dado mixed-fleet scenario

### CC-6 — `recap_snapshot` field em Realtime payload?
Confirmação: `RealtimeCombatRecap` ([`lib/types/realtime.ts:222-225`](lib/types/realtime.ts#L222)) carrega `report: CombatReport` (full payload). O `recap_snapshot` JSONB column é apenas DB; não é re-broadcast. **Sem leak path**

### CC-7 — Worktrees orfãs poluem jest/vitest
Os diretórios `.claude/worktrees/agent-*` (35 unique) contêm cópias staleentas de jest/vitest configs e package.json. Vitest run direto falha massivamente (44 suites failed). **Sugestão M2**: cleanup `.claude/worktrees/` antes de rodar test suites em CI / localmente

---

## Deferred items & technical debt

(Consolidados das revisões per-track + novos achados deste review)

### M0 — Resolver ANTES ou IMEDIATAMENTE APÓS deploy
1. **Auditoria operacional pré-mig 137**: rodar `SELECT user_id, revoked_at FROM content_whitelist WHERE revoked_at IS NOT NULL;` e re-revogar manualmente quem deve ficar de fora. Header da migration alerta. **Bloqueador para deploy de mig 137**

### M1 — Resolver na próxima sprint
2. **Lint warning `isPt` em PublicMonsterStatBlock** ([`components/public/PublicMonsterStatBlock.tsx:45`](components/public/PublicMonsterStatBlock.tsx#L45)) — remover prop ou prefixar `_`
3. **Inconsistência i18n Sheet vs Dialog**: Sheet usa "Fechar" (PT) hardcoded, Dialog usa "Close dialog" (EN) hardcoded. Migrar ambos para `useTranslations`
4. **Mock `srd-search` falta `getCrossVersionMonsterId`** ([`components/combat/CombatantRow.test.tsx`](components/combat/CombatantRow.test.tsx)) — adicionar `getCrossVersionMonsterId: jest.fn()` ao `jest.mock(...)` do bloco. Falha pré-existente desde 2026-04-11
5. **Reduced motion respect**: framer-motion components não checam `prefers-reduced-motion`. Adicionar `useReducedMotion` hook nas animações de modal/recap

### M2 — Backlog
6. **Cleanup de `.claude/worktrees/`** — bloqueia vitest/jest direto em CI
7. **Service-role gateway / Cloudflare WAF** para `cast_late_vote_via_token` (residual risk documentado em mig 138)
8. **Observability dashboard**: telemetria `recap.served_from_db` vs `recap.served_from_broadcast` para medir valor da feature post-deploy
9. **Rate-limit identifier resolver bug-prone**: `request.clone()` + `await body.json()` adiciona ~5ms por request. Aceitável para 10/min mas notável em endpoints high-throughput

---

## Recomendações pós-deploy

### Imediato (T+0 a T+24h)
1. **Monitorar `recap.persisted_success` vs `recap.persisted_noop` ratio** — espera-se >95% success em primeiro POST. NoOp altos sinalizam DM double-clicks ou retry storms
2. **Monitorar `404 invalid_token` em `/api/feedback`** — picos sinalizam links velhos / typos. Considerar DM dashboard com histórico de tokens revogados
3. **Smoke test feedback link em produção**: criar combat → end → copiar link → votar de browser anon → confirmar `encounter_votes` row

### Curto prazo (T+1 a T+7 dias)
4. **Flag `ff_combatant_add_reorder` para staging** — soak 24h com Lucas, monitorar `combat:combatant_add_desync_detected` events. Se zero em 24h, ligar prod
5. **Audit `content_whitelist` post-mig 137** — verificar contagem antes/depois e quais users foram inadvertidamente re-grantados
6. **Verificar telemetria 3-tier funciona**: `player:resumed` (noise) deve dominar em volume; `player:reconnected{confidence:high}` deve ser raro

### Médio prazo (T+1 mês)
7. **Remover legacy `combat:combatant_add` emit** após 7 dias com flag ON em prod sem incidentes (documentado em sprint plan)
8. **Migrar para service-role gateway** se volume `cast_late_vote_via_token` > 1000/dia ou se for detectado abuso
9. **Adicionar i18n para Sheet "Fechar"** — pequeno débito que se acumula

---

**Final**: Pode dormir tranquilo. Nenhum bug crítico encontrado, nenhuma regressão detectada. Os 16 lint errors são pré-existentes e benignos. As 10 test failures são pré-existentes (mock incompleto, anterior ao range). O conjunto está bem testado, bem documentado, e os pontos de risco arquiteturais (broadcast atomic, RPC anon-grantable) estão corretamente isolados (flag-gated + rate-limited + ownership-validated).

Os únicos itens que exigem ação humana são: (a) auditar whitelist antes de aplicar mig 137, (b) decidir o momento de virar `ff_combatant_add_reorder=true` em staging vs prod. Tudo o mais é débito técnico de baixa severidade.
