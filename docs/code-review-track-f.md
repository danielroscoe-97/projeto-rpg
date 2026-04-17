# Code Review — Track F (Voting Retroactive)

Branch: `worktree-agent-af52565f`
Commits: `5c1cc49` (migration), `fb72770` (page+client), `7c5afd7` (APIs), `60d576d` (recap button), `dcd9574` (i18n + e2e)

---

## Veredicto

**BLOCK** — tem um bug arquitetural de produto (colisão de `session_token_id` no upsert quando DM compartilha UM link com o grupo), inconsistência de rate limit (IP ≠ spec que diz "por token"), fail-open silencioso do Upstash no env atual, e discrepância de QA (agent reportou 6 e2e tests; só existem 3).

Razões para bloquear antes do merge:

1. **Arquitetural / UX crítico:** `/api/session/[id]/feedback-link` retorna UM `session_tokens.token` aleatório da sessão (`limit(1)`). O DM copia esse UM link e manda no grupo. Resultado: todos os 6 jogadores entram em `/feedback/<mesmo-token>` e competem pelo MESMO `session_token_id`. O `ON CONFLICT (encounter_id, session_token_id) DO UPDATE` substitui silenciosamente o voto anterior — o 6º voto apaga os 5 primeiros. O spec (linha 306) assumiu que cada player usa SEU próprio `/join/[token]`, não um link compartilhado. Ou (a) a copy-link CTA precisa gerar/retornar um token novo tipo "feedback_share" desacoplado da identidade de player, ou (b) o schema precisa permitir voto por `(encounter_id, session_token_id, ip_hash | fingerprint)` — ou (c) aceitar explicitamente "último voto ganha por link compartilhado" e documentar na UI. Do jeito que está, o DM acha que coletou 6 opiniões e na verdade coletou 1.
2. **Rate limit desalinhado do spec:** spec.md linha 183 diz "IP-based, 10 req/min **por token**". Implementação ([lib/rate-limit.ts:194-195](../lib/rate-limit.ts#L194-L195)) usa `identifier = ${prefix}:${ip}` — só IP, token ignorado. Em NAT compartilhado (casa, café, universidade), 6 jogadores dividem a mesma quota de 10 req/min. Também abre vetor de DoS: um atacante com uma lista de 100 tokens pode testar todos com 10 req/min por IP, não 10 req/min por token.
3. **Colisão de migração 136:** Track C (`689f67f`) criou `136_backfill_whitelist_post_114.sql`. Track F criou `136_late_vote_via_session_token.sql`. Só um sobrevive ao merge. Recomendação abaixo.
4. **QA alegado ≠ QA entregue:** commit message `dcd9574` + handoff fala em "6 tests enumerated"; o arquivo só tem 3 casos de `test(...)` e um deles é um mock de `page.setContent` que NÃO exercita a page real.

Nenhum dos itens acima é irrecuperável — com as correções do §Recomendações o PR fica aprovável.

---

## Severity Summary

| Sev | # | Categoria |
|-----|---|-----------|
| Crítico | 2 | Arquitetura do link compartilhado · Rate limit IP-only |
| Alto | 3 | Migração 136 colide · E2E tests insuficientes · Discrepância schema/Zod (notes) |
| Médio | 4 | SSR leak de `sessionName`+`dmName` em link público · "Voltar PocketDM" hardcoded · RPC aceita anon direto (bypass do Next route) · `/feedback/[token]` sem `robots` noindex |
| Baixo | 3 | Analytics sem catch de falha · `force-dynamic` sem ISR fallback · CTA share com texto genérico |

---

## Migration 136 collision (known)

Dependências:

| Track | Arquivo | Depende de | É dependência de |
|-------|---------|-----------|------------------|
| C | `136_backfill_whitelist_post_114.sql` | `114_content_whitelist.sql` (já aplicada em master) | Nada. Pure data backfill idempotente via `INSERT ... ON CONFLICT DO UPDATE`. |
| F | `136_late_vote_via_session_token.sql` | `060_encounter_votes.sql` + `004_session_tokens.sql` (ambas aplicadas em master) | Nada. Adiciona coluna + RPC. |

Nenhuma delas depende da outra. Qualquer uma pode virar 137.

**Recomendação: Track C (whitelist) renomeia para 137.**

Razões:
1. Track C é **pure data backfill** (zero DDL relevante além do `ON CONFLICT DO UPDATE`). Rodar antes ou depois de Track F é indiferente — Track C só toca `content_whitelist`, Track F só toca `encounter_votes` + `session_tokens`. Sem ordem lógica exigida.
2. Track F introduz **schema + RPC novo** (superfície maior, mais visível no histórico). O nome `136_late_vote_via_session_token.sql` é mais distintivo para auditoria futura do que `137_backfill_whitelist_post_114.sql`.
3. Track C já está idempotente; renumerar não muda nada operacional.
4. (Contra-argumento fraco: Track C foi commitado ~2min antes em wall-clock; isso não é critério técnico.)

Ação: quem mergear o segundo (provavelmente Track C dado o item 2 acima) faz `git mv 136_backfill_whitelist_post_114.sql 137_backfill_whitelist_post_114.sql` e atualiza qualquer referência em docs.

---

## Security audit (RPC + public route)

### RPC `cast_late_vote_via_token` — [supabase/migrations/136_late_vote_via_session_token.sql:52-122](../supabase/migrations/136_late_vote_via_session_token.sql#L52-L122)

**SECURITY DEFINER + GRANT EXECUTE TO anon** — superfície extremamente sensível. Auditoria item a item:

| Verificação | Status | Linhas | Nota |
|---|---|---|---|
| Valida `is_active = true` | **OK** | L75-80 | `WHERE token = p_token AND is_active = true` |
| Valida encounter pertence à sessão do token | **OK** | L83-88 | `WHERE id = p_encounter_id AND session_id = v_session_id` |
| Valida range de vote | **OK** | L70-72 | `p_vote < 1 OR p_vote > 5` + CHECK constraint na coluna (060:6) |
| SQL injection | **OK** | todas | Parâmetros passados via `$1/$2/$3`, sem string concat |
| ON CONFLICT previne duplicata de voto por token | **OK arquitetural, BUG operacional** | L93-95 | Ver "Colisão de link compartilhado" abaixo |
| Audit logs / IP leak via SECURITY DEFINER | **OK** | — | RPC não grava logs; `voted_at` é um timestamp, não IP |
| REVOKE FROM PUBLIC | **OK** | L118 | Correto — primeiro revoga tudo, depois GRANT explícito |
| GRANT TO anon | **OK (intencional)** | L119-120 | Necessário para fluxo sem auth |

**FLAG #1 (Crítico) — Colisão de `session_token_id` em link compartilhado.**

O `ON CONFLICT (encounter_id, session_token_id) DO UPDATE SET vote = EXCLUDED.vote, voted_at = now()` garante "um voto por token", mas não "um voto por player". O DM copia UM link via `/api/session/[id]/feedback-link` e compartilha com o grupo todo. Todos os players abrem a mesma URL. Todos os votos vão para o mesmo `session_token_id`. O último sobrescreve todos os anteriores.

Impacto:
- DM pensa que coletou N votos → coletou 1.
- `difficulty_votes = GREATEST(v_ev_count, v_existing_count)` só mascara o problema: se havia votos em tempo real pra aquele encounter, `v_existing_count` continua alto mesmo com 1 só em `encounter_votes`. Se não havia, o count mostra "1 voto" — inconsistente com a expectativa.
- `difficulty_rating` vira o voto do último clicante, não a média.

O spec (linha 306) registra isso como R3 baixo, mas **assume cada player usando seu próprio `/join/[token]`**. A copy-link CTA ([RecapActions.tsx:71-99](../components/combat/RecapActions.tsx#L71-L99)) quebra essa premissa.

Opções de correção (listadas por esforço):
- **A (mínima, aceita o limite):** UI no `/feedback/[token]` informa "você já votou, clique em atualizar para mudar" quando detecta que `session_token_id` já tem voto. Transparente sobre o comportamento.
- **B (correta):** adicionar um segundo identificador discriminador na chave única — ex. `(encounter_id, session_token_id, voter_fingerprint)` onde `voter_fingerprint` = hash estável do cliente (localStorage UUID gerado no primeiro acesso à página). Ou usar `player_name` obrigatório na tela de feedback.
- **C (nova rota):** gerar um token do tipo `feedback_share` na tabela `session_tokens` com `player_name = NULL` e comportamento explícito "um voto por IP/fingerprint", separado dos tokens de player.

Preferência: **B**. É 20 linhas de código — um UUID em `localStorage.getItem("feedback_voter_id")` passado no body, colunda nova `voter_fingerprint TEXT` em `encounter_votes`, partial unique ajustada.

**FLAG #2 (Crítico) — Rate limit IP-based, não token-based.**

[app/api/feedback/route.ts:68-72](../app/api/feedback/route.ts#L68-L72):
```ts
export const POST = withRateLimit(handlePost, {
  max: 10,
  window: "1 m",
  prefix: "feedback",
});
```

[lib/rate-limit.ts:194-195](../lib/rate-limit.ts#L194-L195):
```ts
const prefix = config.prefix || request.nextUrl.pathname;
const identifier = `${prefix}:${ip}`;
```

Identifier é `feedback:<ip>` — só IP, token ignorado. Spec linha 183 dizia "10 req/min **por token**".

Impactos:
- Família/mesa de 6 players na mesma casa (NAT único) compartilha quota de 10 req/min. Viável em condições normais (eles só votam 1x cada), mas se houver retries ou rage-clicks, o 7º vira 429 e vê mensagem "muitas tentativas".
- Um atacante pode enumerar 100 tokens via 10 req/min por IP — só precisa de 10 IPs (trivial) para testar tudo simultaneamente. Com rate limit por token, 10 IPs contra o mesmo token não passam.
- `withRateLimit` também tem **fail-open** se `UPSTASH_REDIS_REST_URL` não estiver setado ([lib/rate-limit.ts:24-29](../lib/rate-limit.ts#L24-L29)). Não vi confirmação de que o env de prod tem Upstash configurado; validar antes do merge.

Correção (5 linhas): mover a extração do `token` do body para `handlePost`, chamar `checkRateLimit` manualmente com identifier `feedback:<token>`, retornar 429 se `limited`. Ou adicionar opção `prefix` aceitando função.

**FLAG #3 (Médio) — RPC exposta a anon direto.**

`GRANT EXECUTE ... TO anon` significa que qualquer cliente com a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou seja, **qualquer browser que já foi em outra página pública do pocketdm**) pode chamar `supabase.rpc('cast_late_vote_via_token', {...})` diretamente, **bypassando completamente o Next route e, portanto, o rate limiting**.

A chave anon é pública por design do Supabase — não é segredo. O atacante não precisa descobrir nada.

Mitigações possíveis:
- (a) Implementar rate limit no próprio RPC via `pg_stat_statements` + `now() - voted_at < interval '6 seconds'` check antes do upsert. Melhor opção.
- (b) Mover a RPC para `SECURITY DEFINER` + `REVOKE FROM anon` + criar uma wrapper function que exige claim JWT específico injetado pelo Next route. Complexo demais pro beta.
- (c) Aceitar esse vetor como "o pior que acontece é spam de votos", monitorar via telemetria. Documentar risco.

Para o beta é aceitável, mas precisa estar documentado no spec + monitorado.

### Rota SSR `/feedback/[token]` — [app/feedback/[token]/page.tsx](../app/feedback/[token]/page.tsx)

**FLAG #4 (Médio) — Info leakage em página pública.**

L95-108 expõe `sessionName` + `dmName` para qualquer um que souber um `session_tokens.token` válido. Mesmo risco do `/join/[token]` já existente (aceitável), **mas**:

1. A página NÃO tem `robots: { index: false }` no metadata. Se o Google indexar (improvável dado o schema `/feedback/[random-token]`, mas `force-dynamic` não impede crawling), vaza nome do DM + sessão.
2. Não tem canonical tag, não tem `noindex`. Adicionar explicitamente:
   ```tsx
   export const metadata = { robots: { index: false, follow: false } };
   ```
3. `"Voltar para a PocketDM"` em `page.tsx:134` está **hardcoded em português** dentro de `ErrorScreen`. Quebra i18n.

### Rota DM-only `/api/session/[id]/feedback-link` — [app/api/session/[id]/feedback-link/route.ts](../app/api/session/[id]/feedback-link/route.ts)

Auditoria auth:
- `createClient()` (L22) → `auth.getUser()` (L23) → 401 se sem user ✅
- Verifica `session.owner_id === user.id` (L44) com service client ✅ (não spoofable via cookie)
- UUID regex (L17-20) antes de tocar o DB ✅
- Rate limit 30/min (L74-77) ✅ — DM-only, aceitável
- **PORÉM:** retorna token via `limit(1)` (L56-62), sem critério consistente. Se o DM tiver 6 players, tá pegando um aleatório dentre os 6 tokens. É esse token "aleatório" que vira o link compartilhado — agravando FLAG #1. O DM nem sabe de quem é o token que saiu copiado.

### Schema

**FLAG #5 (Médio) — Window entre DROP constraint e CREATE partial index.**

[136_late_vote_via_session_token.sql:33-46](../supabase/migrations/136_late_vote_via_session_token.sql#L33-L46):
```sql
ALTER TABLE encounter_votes
  DROP CONSTRAINT IF EXISTS encounter_votes_encounter_id_user_id_key;
DROP INDEX IF EXISTS encounter_votes_encounter_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_user_unique
  ON encounter_votes(encounter_id, user_id)
  WHERE user_id IS NOT NULL;
```

A ordem **drop-then-create** abre uma janela (milissegundos em prática, mas não zero) onde NENHUMA unique existe sobre `(encounter_id, user_id)`. Se um INSERT duplicado cair exatamente nessa janela, passa. Cenário pouco realista em migração, mas:

Correção segura: criar o partial unique ANTES de dropar a constraint. Postgres aceita o índice parcial conviver com o unique composto (ambos podem existir — o parcial é só sobre `user_id IS NOT NULL`, o composto era sobre todos). Ordem recomendada:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_user_unique ...; -- novo partial
ALTER TABLE ... DROP CONSTRAINT ...;                                 -- só depois
DROP INDEX IF EXISTS encounter_votes_encounter_id_user_id_key;
```

### `/api/feedback` — [app/api/feedback/route.ts](../app/api/feedback/route.ts)

**FLAG #6 (Alto) — `notes` aceito em Zod, silenciosamente descartado.**

L6-14 Zod schema tem `notes: z.string().max(280).optional()`. L36-40 monta o `supabase.rpc(...)` com apenas `p_token`, `p_encounter_id`, `p_vote`. Notes nunca é persistido. Commit message do `fb72770` confirma: "Optional notes textarea ... accepted client-side but deferred for persistence until an encounter_feedback_notes table exists."

Problemas:
- UI aceita e acena com sucesso (`phase = "done"`), player sai pensando que mandou comentário. Feedback silencioso é **anti-pattern de produto** — o player reclama de um bug ("mestre cruel, não deu dano certo") e ninguém vê.
- Dado LGPD-relevante (nome do mestre, dinâmica de grupo) pode ir pro textarea e não ter destino definido.

Correções:
- Remover o textarea até a tabela existir.
- OU salvar imediatamente num `supabase.from("encounter_feedback_notes_draft").insert({...})` mesmo que temporário.
- OU (mínimo aceitável) toast: "Comentário não salvo nesta versão — só o voto é contado" antes do submit.

### `/api/feedback` — sanitização de erro

L37-56 faz `string.includes('invalid or inactive')` pra mapear mensagens de erro do Postgres pra HTTP status. Funciona, mas é frágil — se alguém trocar o texto da RAISE EXCEPTION em migração futura, quebra silenciosamente (cai no fallback 500). Preferível: `RAISE EXCEPTION USING ERRCODE = 'PF001'` no SQL e matching por errcode. Baixa prioridade.

---

## Findings por commit

### `5c1cc49` — migração 136

| # | Sev | Issue |
|---|-----|-------|
| 1 | Alto | Colide com Track C (ver §Migration 136 collision) |
| 2 | Médio | Window entre DROP constraint + CREATE partial index (ver FLAG #5) |
| 3 | Info | `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN NULL END $$` (L21-28) swallows ALL errors. Não é idempotência, é "engole o que cair". Se ALTER falhar por outro motivo (ex. lock timeout), o script continua e a coluna fica inconsistente. Trocar `WHEN OTHERS` por `WHEN undefined_column` especifica melhor. |

### `fb72770` — page + client

| # | Sev | Issue |
|---|-----|-------|
| 4 | Médio | `"Voltar para a PocketDM"` hardcoded (page.tsx:134), quebra i18n |
| 5 | Médio | Sem `metadata: { robots: { index: false } }` |
| 6 | Alto | `notes` coletado mas descartado silenciosamente (FeedbackClient.tsx:78) |
| 7 | Baixo | `trackEvent` sem catch — se analytics quebrar, submit quebra |
| 8 | Info | `useMemo` pra `selectedEncounter` com deps `[data.encounters, selectedEncounterId]` — data é stable, só selectedEncounterId importa. Não é bug. |

### `7c5afd7` — APIs

| # | Sev | Issue |
|---|-----|-------|
| 9 | Crítico | Rate limit IP-only ≠ spec (ver FLAG #2) |
| 10 | Médio | `feedback-link` retorna token aleatório via `limit(1)` (ver FLAG #1) |
| 11 | Médio | `string.includes(msg)` error mapping frágil |
| 12 | Info | `console.warn` vaza `error` completo — em vercel logs tá OK, mas se algum campo tiver PII vai pro log agregado. Preferir `error.code + error.hint`. |

### `60d576d` — copy-link button

| # | Sev | Issue |
|---|-----|-------|
| 13 | Médio | `navigator.share` com `text: "Copiar link"` — texto não-descritivo (RecapActions.tsx:86). O share-sheet mostra "Copiar link" como preview; preferível uma copy tipo "Me conta como foi esse combate: <url>" |
| 14 | Baixo | Fallback silencioso do `navigator.share` cancelado → cai pra `navigator.clipboard` SEM avisar. Se o user cancelou intencionalmente, ele é surpreendido com "link copiado". Adicionar check no erro do share: se `err.name === 'AbortError'`, não fallback. |
| 15 | Info | `sessionId` prop em `CombatRecap` é opcional ✅ — sem breaking change para Guest/Player callers. Verificado em `GuestCombatClient.tsx:1940` e `PlayerJoinClient.tsx:2144` (nenhum passa `sessionId`). |

### `dcd9574` — i18n + e2e

| # | Sev | Issue |
|---|-----|-------|
| 16 | Alto | **3 tests, não 6** (handoff alega 6). Verificado via `grep -c '^\s*test(' e2e/features/feedback-retroactive.spec.ts` |
| 17 | Alto | Test "happy path" (L32-60) usa `page.setContent` com HTML inline — **não exercita a page real**. Só verifica que um botão existe no DOM que o próprio teste injetou. Zero valor de regressão. |
| 18 | Médio | Test "invalid link" (L13-30) não distingue `retro_error_invalid_title` vs `retro_error_expired_title` — usa regex `/inválido|expirado|invalid|expired/i`. Se regredir para mostrar "expirado" quando devia ser "inválido", passa silenciosamente. |
| 19 | OK | i18n parity PT↔EN verificada: 37 keys em cada arquivo, 0 diffs |

---

## Edge case coverage

| Cenário | Tratado? | Local | Nota |
|---------|----------|-------|------|
| Token inativo após submit | **Não** | RPC retorna exception, client cai em `retro_error_submit` | Devia mapear pra `retro_error_expired_*`. Hoje vira "Erro ao enviar". |
| Sessão com 0 ended encounters | **OK** | page.tsx:85-92 | Render correto do `retro_no_encounters_*` |
| Sessão com 1 encounter | **OK** | FeedbackClient.tsx:170 | `{data.encounters.length > 1 && <select>...}` — single encounter esconde seletor |
| Sessão com N > 3 encounters | **OK arquitetural** | page.tsx:70 `.limit(3)` | Só mostra top 3. Spec OK. |
| User vota de 2 devices com mesmo token | **BUG** | 2º device sobrescreve voto do 1º silenciosamente | Ver FLAG #1 |
| User vota de 2 devices com mesmo token → muda de ideia | **Ambíguo** | Mesma coisa — não há distinção "mudou de ideia" vs "é outra pessoa" | Ver FLAG #1 |
| Concurrent upsert (race) | **OK** | Postgres garante via partial unique | `ON CONFLICT` cobre |
| Rate limit por-NAT | **BUG** | Ver FLAG #2 | |
| i18n key missing | **Provavelmente quebra** | next-intl default behavior é lançar erro em dev, fallback string em prod | Não testado. |
| `navigator.share` cancelado em mobile | **Parcial** | Cai no clipboard mas sem distinguir AbortError | Ver item #14 |
| Upstash Redis offline | **OK (fail-open)** | rate-limit.ts:90-92 | Mas significa ZERO rate limit — combinar com FLAG #3 isso deixa a RPC muito exposta |
| Supabase service role env faltando | **500** | `createServiceClient` explode com `SUPABASE_SERVICE_ROLE_KEY!` non-null assertion | Aceitável; env de prod tem. |

---

## DoD verification

| Claim do agent | Verificação | Status |
|----------------|-------------|--------|
| tsc verde | `rtk tsc` → "TypeScript compilation completed", sem erros | ✅ |
| lint verde | 455 problems no repo, **nenhum** nos arquivos Track F (app/feedback, app/api/feedback, app/api/session/[id]/feedback-link, RecapActions, CombatRecap) | ✅ (ressalvas pré-existentes) |
| 6 e2e tests | `grep -c '^\s*test(' e2e/features/feedback-retroactive.spec.ts` = **3** | ❌ |
| i18n PT + EN | 37 keys em cada, match perfeito | ✅ |
| Migration idempotente | IF NOT EXISTS + DO $$ EXCEPTION blocks presentes | ✅ |
| RPC anon-accessible | `GRANT EXECUTE TO anon, authenticated` | ✅ |
| Recap button non-breaking | `sessionId` opcional, callers guest/player não passam, button gated | ✅ |
| Rate limit 10/min por token | **IP-based, não token-based** | ❌ |
| Notes persisted | **Descartado silenciosamente** | ❌ |

---

## Recomendações antes do merge

Em ordem de prioridade (1 = bloqueante, 4 = pode ficar pra follow-up):

**1. Bloqueante — decidir a arquitetura do link compartilhado (FLAG #1).**
Opções: (a) adicionar `voter_fingerprint` (UUID em localStorage) ao body + schema; (b) exigir `player_name` na UI como discriminador; (c) aceitar "último voto ganha" e banner explícito "você está usando um link compartilhado — só seu voto mais recente conta". Preferência do reviewer: (a). 20 linhas + 1 coluna + migration patch.

**2. Bloqueante — mover rate limit para token-based (FLAG #2).**
Extrair token antes de `withRateLimit` OU adicionar opção `identifier: (req, body) => string` em `withRateLimit`. 15 linhas.

**3. Bloqueante — renomear migration de Track C para 137** (§Migration 136 collision). Qualquer track que mergear primeiro fica em 136; o outro vira 137. Recomendação: Track C → 137 porque é pure data backfill sem dependência temporal.

**4. Alto — decidir sobre `notes`** (FLAG #6). Das três opções documentadas: (a) remover textarea; (b) persistir numa tabela nova; (c) toast avisando. Preferência: (a) até spec definir destino — textarea dá falsa sensação de "meu comentário chegou no mestre". Se manter, crítico adicionar o toast.

**5. Alto — re-fazer e2e tests** (itens 16–18). Precisa de pelo menos: (i) SSR real com fixture de session_tokens, (ii) happy path real submit → 200 → tela de thanks, (iii) vote inválido → 400, (iv) token expirado → 404 → tela correta, (v) rate limit → 429 → mensagem correta, (vi) i18n switch EN. Os 3 atuais passam mas não defendem contra regressão.

**6. Médio — `noindex` + `"Voltar"` i18n** em `/feedback/[token]` (itens 4, 5). Metadata `{ robots: { index: false } }` + `t("common.back_to_pocketdm")` + key nova no i18n.

**7. Médio — reverter ordem DROP/CREATE na migration** (FLAG #5). Criar partial unique antes de drop da old unique.

**8. Médio — documentar / mitigar RPC exposta a anon** (FLAG #3). Mínimo: comentário em CLAUDE.md ou spec dizendo "spam de vote é aceitável no beta, monitorar via telemetria `feedback:vote_submitted`". Ideal: rate limit server-side dentro da RPC.

**9. Baixo — share text + AbortError handling** (itens 13, 14). Texto descritivo em `copy_link_button_share`; checar `err.name === 'AbortError'` antes de fallback pra clipboard.

**10. Info — `feedback-link` retornar metadata do token** (agrava FLAG #1). Se mantiver "um token aleatório" como MVP, retornar `{ url, token, player_name }` pra UI avisar "este é o link do Carlos — os votos vão se misturar". Pior: faz a gravidade do bug visível no recap do DM.

---

## Anexo — arquivos revisados

- [supabase/migrations/136_late_vote_via_session_token.sql](../supabase/migrations/136_late_vote_via_session_token.sql) (143 linhas, commit 5c1cc49)
- [app/feedback/[token]/page.tsx](../app/feedback/[token]/page.tsx) (139 linhas, commit fb72770)
- [app/feedback/[token]/FeedbackClient.tsx](../app/feedback/[token]/FeedbackClient.tsx) (255 linhas, commit fb72770)
- [app/api/feedback/route.ts](../app/api/feedback/route.ts) (72 linhas, commit 7c5afd7)
- [app/api/session/[id]/feedback-link/route.ts](../app/api/session/[id]/feedback-link/route.ts) (75 linhas, commit 7c5afd7)
- [components/combat/CombatRecap.tsx](../components/combat/CombatRecap.tsx) (5 linhas de diff, commit 60d576d)
- [components/combat/RecapActions.tsx](../components/combat/RecapActions.tsx) (54 linhas de diff, commit 60d576d)
- [components/session/CombatSessionClient.tsx](../components/session/CombatSessionClient.tsx) (1 linha de diff, commit 60d576d)
- [e2e/features/feedback-retroactive.spec.ts](../e2e/features/feedback-retroactive.spec.ts) (73 linhas, commit dcd9574)
- [messages/pt-BR.json](../messages/pt-BR.json) (+26 linhas em `feedback`, commit dcd9574)
- [messages/en.json](../messages/en.json) (+24 linhas em `feedback`, commit dcd9574)

Referência cruzada:
- [supabase/migrations/060_encounter_votes.sql](../supabase/migrations/060_encounter_votes.sql) — schema original, RPC original
- [supabase/migrations/004_session_tokens.sql](../supabase/migrations/004_session_tokens.sql) — schema de tokens
- [lib/rate-limit.ts](../lib/rate-limit.ts) — wrapper usado pelas APIs
- [docs/spec-feedback-retroactive-voting.md](./spec-feedback-retroactive-voting.md) — spec original
