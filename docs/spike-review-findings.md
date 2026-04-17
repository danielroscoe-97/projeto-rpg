# Review Adversarial do Spike — Findings

**Data**: 2026-04-17
**Revisor**: Adversarial reviewer (cynical mode)
**Spike alvo**: [`docs/spike-beta-test-3-2026-04-17.md`](spike-beta-test-3-2026-04-17.md)
**Protocolo**: Stress-test end-to-end, verificação file:line contra árvore atual, checagem de dados brutos em `observability/dados/2026-04-16_17/`.

---

## Severity Summary

- **[CRITICAL]** 3 — devem ser corrigidos antes da implementação (um dos fixes propostos tecnicamente não funciona como descrito; um trigger SQL fere SRD Compliance; um write pode violar RLS)
- **[HIGH]** 5 — alto risco de retrabalho ou bug em prod
- **[MEDIUM]** 6 — concerns de qualidade, gaps de teste/rollout
- **[LOW]** 4 — nice-to-haves, typos, detalhes de narrativa

---

## Claims Verified Correct

Foram verificados e se sustentam:

1. **Contagem 92 visibility_change + 15 stored_identity** — confirmado via `grep -oE '"method":...'` no `01_events_raw.json` (exatamente 92 e 15). Total `player:reconnected` = 107. Checa com SUMMARY.md.
2. **2 erros `CHANNEL_ERROR`** — confirmado em `14_error_logs.json`. Ambos na sessão `b33616aa` (Djinni), horários 23:19 e 23:24 UTC.
3. **Velociraptors adicionados às 02:34:20 / 02:34:22 / 02:34:26** — confirmado no `01_events_raw.json` (linhas 4122-4157). Janela de 6 segundos.
4. **MonsterGroupHeader agrega HP** — [`MonsterGroupHeader.tsx:47-51`](../components/combat/MonsterGroupHeader.tsx#L47-L51) exatamente como descrito.
5. **Auto-scroll guard em `data-panel-open`** — [`CombatSessionClient.tsx:1886`](../components/session/CombatSessionClient.tsx#L1886) exatamente como descrito. `CombatantRow.tsx:238` escreve o atributo.
6. **HP crítico ignora cor do texto** — [`CombatantRow.tsx:462`](../components/combat/CombatantRow.tsx#L462) usa `text-muted-foreground` sem branch para `isCritical`.
7. **`combat_reports` já existe e tem FK para encounter** — migração `085_combat_reports.sql` confirmada; nullable, RLS permite leitura pública via short_code.
8. **Lucas Galupo é `owner_id 414dd199...` em 3 sessions** — `11_sessions_involved.json` confirma as 3 (Djinni `b33616aa`, Dao `3c43f5b7`, Wolfs `62a58d57`).
9. **Broadcast tem `_seq` monotônico** — [`lib/realtime/broadcast.ts:373`](../lib/realtime/broadcast.ts#L373) injeta `_seq` incremental. Channel Supabase é FIFO por sender.
10. **Handler `visibility_change → visible` dispara `trackEvent player:reconnected` incondicionalmente** — [`PlayerJoinClient.tsx:1819, 1826`](../components/player/PlayerJoinClient.tsx#L1819). Sem checar se houve disconnect. Telemetria noise é real.

---

## Claims Wrong or Unsupported

### [CRITICAL-1] Fix do Finding 1 não funciona: endpoint `/api/session/[id]/state` filtra `is_active=true`

**Claim do spike (linhas 93-95)**: "Endpoint `/api/session/[id]/state` retorna recap. Mudar o `select` do encounter para incluir `recap_snapshot, ended_at`. No response adicionar `data.latest_recap` quando `encounter.recap_snapshot` não for null E `ended_at` for recente."

**Evidência contra**: [`app/api/session/[id]/state/route.ts:52-60`](../app/api/session/[id]/state/route.ts#L52-L60) faz `.eq("is_active", true)`. Depois de `dm_ended` o encounter tem `is_active=false` (ver `08_encounters_created.json` entrada `71a7a8ea`: `is_active: false, ended_at: 2026-04-16T00:59:13.338`). Quando o player reabrir o link DEPOIS do encerramento, o query retorna `PGRST116` (0 rows) e o código executa o path `if (!encounter)` (linha 114) que retorna `encounter: null, combatants: []` — nunca inclui `recap_snapshot`.

**Impacto**: os 5 jogadores que reabriram o link entre 00:53:00 e 00:53:18 (`stored_identity` reconnects citados como evidência do Finding 1) NÃO seriam atendidos pela solução como escrita. A solução só funcionaria se o player refizer fetch ANTES do `is_active=false` — exatamente a janela crítica que o bug captura.

**Correção obrigatória**: o fix DEVE mudar a query para:
```sql
.or("is_active.eq.true,ended_at.gte.<now - 24h>")
.order("is_active desc, ended_at desc")
.limit(1)
```
OU criar um select separado específico para `most_recent_encounter_with_recap` quando `is_active=true` query não retornar. Documentar explicitamente que o encounter retornado pode estar com `is_active=false` — e todo código downstream (client) que assume "encounter presente → combate ativo" precisa defender contra isso.

**Blast radius**: `PlayerJoinClient.fetchFullState` em [linhas 888-892](../components/player/PlayerJoinClient.tsx#L888) faz `setActive(data.encounter.is_active ?? false)`. Se o encounter retornado for `is_active=false`, o setActive(false) aciona lógica de saída de combate ao mesmo tempo que setaria o recap. Precisa de um campo `data.encounter_for_recap` SEPARADO do `data.encounter`, ou um endpoint dedicado `/api/session/[id]/latest-recap`.

---

### [CRITICAL-2] Trigger auto-whitelist viola política de gating do beta + expande superfície SRD

**Claim do spike (linhas 527-548)**: cria trigger `AFTER INSERT ON auth.users` que faz `INSERT INTO content_whitelist` para TODOS os novos signups.

**Evidência contra**:
1. **Intent da migration 114 não é universal.** [`114_whitelist_all_existing_users.sql`](../supabase/migrations/114_whitelist_all_existing_users.sql) explicitamente exclui `daniel@awsales.io` — demonstrando que a whitelist É curada, não automática. "Beta tester" tem connotação de escolha explícita.
2. **CLAUDE.md SRD Content Compliance é REGRA IMUTÁVEL.** O documento afirma "NUNCA expor conteúdo não-SRD em páginas públicas". Whitelist é o mecanismo de gating pra expor conteúdo não-SRD (items do MPMM, VGM, etc.) a usuários autenticados. Auto-whitelistar TODOS os signups nova (inclusive scraping/bots) efetivamente torna o conteúdo não-SRD acessível a qualquer conta criada, quase-público. Isso contradiz o propósito da whitelist.
3. **`SECURITY DEFINER` + `granted_by = danielroscoe97@gmail.com`** faz com que parecer que o admin convidou o usuário — falso audit trail.
4. **Nada no feedback do Lucas pede acesso full a todos os usuários**. O problema é "Lucas não está na whitelist porque criou conta depois de 114". Isso é resolvido com um UPDATE/INSERT one-shot, não um trigger permanente.

**Correção**:
- **Substituir** o trigger permanente por uma migration `115_whitelist_post_114_users.sql` idempotente que copia o INSERT da 114 novamente (pega apenas usuários criados após 114 via ON CONFLICT DO NOTHING).
- **Se** o produto realmente quer auto-whitelist durante o beta fechado, esse deve ser um feature flag explícito (ex: env `BETA_AUTO_WHITELIST=true`) com auditoria clara, e o trigger deve ser `DROP`able após o beta.
- Atualizar spike para citar a CLAUDE.md SRD Content Compliance como constraint.

---

### [CRITICAL-3] Persistência `await` do recap_snapshot antes do broadcast pode violar RLS OU bloquear UX

**Claim do spike (linha 92)**: "persistir via service client no `encounters.recap_snapshot` o `playerSafeReport` ANTES do broadcast (com `await`, não fire-and-forget). Latência aceitável: combate acabou, DM está vendo leaderboard animar."

**Evidência contra**:
1. **RLS encounters é DM-owner-only** ([`005_rls_policies.sql:120-138`](../supabase/migrations/005_rls_policies.sql#L120-L138)). Se o write for feito via client anon (browser-side com user token do DM), funciona. Se o write usar **service client** (conforme o spike "via service client"), precisa de um **endpoint novo** (ex: POST `/api/encounters/[id]/recap-snapshot`) e o DM-side não pode invocar service client diretamente do browser. O spike não especifica qual client — "via service client" sugere server, mas não há endpoint listado em "arquivos afetados".
2. **`await` bloqueia render do leaderboard**. Se a persistência falhar por 3-5s (que é o tempo típico observado em `/api/broadcast` pelo próprio beta-test-3 doc — B06), o DM vê travamento. O leaderboard animando durante o await pode ficar em estado inconsistente se o await lançar exception pós-animate.
3. **Tamanho de payload**: o `combat_reports` endpoint tem `MAX_PAYLOAD_SIZE = 100_000` ([`app/api/combat-reports/route.ts:7`](../app/api/combat-reports/route.ts#L7)). O spike estima 20-40KB mas não verificou — report com muitas narrativas + rankings + awards pode ultrapassar em combates longos (5+ rounds, 10+ combatants).

**Correção**:
- Especificar **endpoint novo** dedicado (ex: `POST /api/encounters/:id/recap`) que verifica ownership via session+user, não service client client-side.
- Usar `fire-and-forget com retry on fail` em vez de `await` puro. Persist é o fallback, broadcast é o caminho feliz — não faz sentido bloquear UX do DM pelo fallback.
- Adicionar `MAX_PAYLOAD_SIZE` check também no novo endpoint. Reusar `combat_reports.report_data` em vez de criar coluna nova pode ser melhor (já tem size guard, já tem RLS para leitura pública via short_code).

---

### [HIGH-1] Análise do "state_sync chega antes de combatant_add" é inconsistente com o código

**Claim do spike (Finding 2, linhas 174-182)**: afirma que o `state_sync` do primeiro add pode chegar DEPOIS do `combatant_add` do segundo, causando descarte como stale.

**Evidência contra**: Verifiquei [`PlayerJoinClient.tsx:991-1001`](../components/player/PlayerJoinClient.tsx#L991-L1001). O handler de `session:state_sync` faz `lastSeqRef.current = seq` **incondicionalmente** (DESYNC-FIX-2). Não rejeita state_sync com seq baixo. Só `combat:combatant_add`, `turn_advance`, etc. rejeitam via `if (seq > 0 && seq <= lastSeqRef.current) return`. Logo, state_sync NUNCA é descartado como stale — ele sempre reconcilia e reseta o contador.

**Implicação**: a race condition descrita no spike ("state_sync rejeitado como stale, deixando player com ordem errada") **não existe como descrita**. O bug real é outro:
- state_sync do 1º add chega **depois** do combatant_add do 3º add → state_sync (que contém só 1 novo combatant) é aceito, reseta lastSeq para seq2, e **reverte** a lista para só ter o 1º add — perdendo os adds 2 e 3 que já estavam no array local.
- Os próximos combatant_add seq 3, 5 podem reaparecer se chegarem depois do state_sync, mas só se tiverem seq > 2.
- **Se state_sync do 3º add chegar primeiro** (seq 6), todos os lastSeq ficam em 6, e combatant_add seq 1, 3, 5 são descartados — perfeito, porque state_sync já tem a verdade.

**Correção ao spike**: reescrever o root cause. A vulnerabilidade real é que **state_sync é o full-state authoritativo** mas broadcasts Realtime não garantem delivery. Se state_sync for PERDIDO (dropped packet, player na tab hidden no broadcast), o combatant_add deixou o player com uma lista sem reordenação. Essa é uma hipótese diferente da escrita — precisa recalibrar.

---

### [HIGH-2] Premissa "broadcast Realtime é FIFO por channel" não cobre o path server-side

**Claim do spike (linha 177)**: "Supabase Realtime garante ordem FIFO por channel".

**Evidência contra**: [`lib/realtime/broadcast.ts:412`](../lib/realtime/broadcast.ts#L412) mostra que CADA evento é enviado via DOIS paths em paralelo:
```ts
const state = (ch as unknown as { state: string }).state;
if (state === "joined") { doSend(); }
// ...
// Server-side broadcast for secure sanitization
broadcastViaServer(sessionId, event).catch(() => {});
```
O `broadcastViaServer` fire-and-forget chega via HTTP → server envia novo broadcast Supabase. Este pode chegar em ORDEM DIFERENTE do path client-direct. Se os 3 Velociraptors dispararem cada um 2 events (combatant_add + state_sync) via 2 paths = 12 mensagens com ordem parcial.

A FIFO é por (sender, channel), e há 2 senders lógicos: o DM client e o server proxy.

**Correção ao spike**: o fix proposto (broadcast único combinado) **mitiga** isso porque reduz eventos de 2 por add para 1. Mas precisa também decidir: desabilitar `broadcastViaServer` para o novo tipo `combat:combatant_add_reorder`? Ou deixar os dois? Risco: server-side envio pode chegar depois e sobrescrever estado.

---

### [HIGH-3] "107 reconnects é só telemetria ruim" subestima o sinal de degradação real

**Claim do spike (Executive Summary)**: "é um falso positivo de telemetria que mascara o sinal real de reconexão".

**Contra-evidência**:
1. **Timeline dos 5 reconnects entre 00:53:00 e 00:53:18** (logo após o DM encerrar combate às 00:52:58) — esses são stored_identity, não visibility_change. São **reentradas de app** porque os jogadores foram notificados pelo WhatsApp. Isso é sinal real de UX quebrado, não ruído. O spike trata isso corretamente em Finding 1 mas não menciona no Finding 4.
2. **Backgrounding-induced drops são uma race comum em mobile**: no iOS, quando o usuário background o app, o `visibilitychange` dispara e o WebSocket é suspendido pelo OS em ~5s. Se o user voltar em 15s, o `visible` dispara ANTES de o Realtime detectar CHANNEL_ERROR. A reconnection é disfarçada como "visibility_change" mas o canal realmente estava morto. O spike descarta isso afirmando `disconnectedAtRef.current === null`, mas `disconnectedAtRef` só é setado em callbacks de channel status, que podem não ter disparado ainda.
3. **Comparando**: na `04_timeline_hourly.json`, há picos de page:view também coincidentes com player:reconnected. Isso sugere que uma fração das reconnections é de fato reentry após app kill, não tab switch rápido.

**Correção**: o spike deveria refinar a classificação:
- **Tier 1 (ruído)**: visibility_change com `disconnectedAtRef === null` E `hiddenAtRef` curto (<30s) E `lastFetchSuccess` recente — suprimir tracking.
- **Tier 2 (sinal real)**: visibility_change com ambiguidade — manter tracking mas com property `confidence: "low"`.
- **Tier 3 (reconnection de verdade)**: CHANNEL_ERROR + stored_identity + network_recovery.

Sem essa distinção, a solução A do spike (guard `wasHiddenFor > 30_000`) pode criar blind spot: reconnections legítimas mas com `hiddenAtRef` curto são dropadas.

---

### [HIGH-4] Throttle de 5s no `fetchFullState` pode causar dessincronização em add-de-monstros-rápido

**Claim do spike (linha 387, Solução 4C)**: "não fetchar se último fetch foi <5s atrás".

**Evidência contra**: Se o DM faz 3 adds em 6s (caso real do Velociraptor), o player tem 3 combatant_add + 3 state_sync em sequência. Se algum desses for dropado (mobile backgrounding) e o player voltar visible 2s depois do último, o throttle de 5s **bloqueia** o fetch que restauraria a verdade. Player fica dessincronizado até o próximo `visibilitychange → visible` 5s+ depois.

**Mitigação já citada no próprio spike (linha 708)**: "exceção para fetches disparados por broadcasts específicos". OK, mas o texto da correção não detalha como o caller sinaliza "fetch-de-emergência". Precisa de um parâmetro `{ priority: "emergency" | "throttled" }` no `fetchFullState`.

---

### [HIGH-5] "Guest já persiste localmente" para Finding 1 é uma premissa sem evidência

**Claim do spike (linha 717)**: "Finding 1 (recap persistence) — Auth-only (guest já persiste localmente)".

**Evidência contra**: Não encontrei no `GuestCombatClient.tsx` persistência do `CombatRecap` em localStorage. [`grep -n setCombatRecapReport components/guest/GuestCombatClient.tsx`](../components/guest/GuestCombatClient.tsx) não retorna matches. O guest apenas SETA o state React via `setShowRecap` ([linha ~1541](../components/guest/GuestCombatClient.tsx#L1541)) — se o guest fechar a tab e reabrir, o recap se perde também. Guest só não tem o problema porque **guest não tem múltiplos clientes** (DM = player no single-player). Mas se o guest fecha a aba depois de encerrar combate e antes de clicar "save", perde o relatório.

**Correção**: o spike deve reescrever para "Finding 1 — Guest **tem bug equivalente** mas impacto é menor (single-user, no multi-device sync). Podemos recomendar localStorage backup no GuestCombatClient como low-hanging fruit, tratar como pequeno bucket P2".

---

## Missed Findings

### [HIGH] Duplicação de `combat:combatant_add` + `session:state_sync` pode causar combatants fantasmas no player

Quando spike propõe (Finding 2 item 2) "broadcast único combinado", não considera: **o código atual mantém `session:state_sync` sendo usado pra outros fluxos** (turn_advance, reorder, etc.). Se o novo `combat:combatant_add_reorder` convive com state_sync, pode haver condição em que state_sync chega **depois** e filtra hidden combatants diferentemente, zerando a adição.

Além disso, o spike não menciona que o handler `combat:combatant_add` em [`PlayerJoinClient.tsx:1207-1216`](../components/player/PlayerJoinClient.tsx#L1207) já tem dedup por ID (`existingIndex !== -1`). Isso sugere que já houve casos de duplicate adds na árvore de histórico. O "novo broadcast único" pode quebrar esse dedup se o formato do payload mudar.

### [MEDIUM] Spike não cobre encounters com múltiplos lifecycle ends (DM reopen / resume)

O spike assume que recap é "gerado 1 vez no encerramento". Mas não trata:
- DM pode chamar `resumeEncounter` (ver [`CombatSessionClient.tsx`](../components/session/CombatSessionClient.tsx) — buscar por "resume") se existe, re-tornar is_active=true, fazer mais rodadas, e encerrar de novo. O que acontece com `recap_snapshot`? Imutável (primeiro recap prevalece)? Sobrescrito (perde o primeiro)?
- Sobrescrever é surpreendente para quem marcou como "visto" — o sessionStorage `recap-seen-{encounterId}` considera visto o recap **antigo** enquanto há um novo pendente.

**Recomendação**: versionar recap_snapshot como array de {version, report, ended_at, ended_by}, OU explicitar política (imutável = erro ao sobrescrever).

### [MEDIUM] Spike não cobre DM reconnection / page refresh durante leaderboard

Se o DM encerra o combate às 00:52:58, começa o leaderboard animation, e **refresca a página** antes de `broadcastEvent session:combat_recap` completar (await linha 92 da solução): o broadcast pode falhar, o recap_snapshot pode estar persistido parcialmente, e nenhum player recebe. Spike não trata este edge case — é exatamente o cenário do spec-resilient-reconnection mas aplicado ao DM.

### [MEDIUM] Falta estratégia para players que nunca entraram na sessão durante o combate

Players com session_token ativo mas que só vão abrir o link NO DIA SEGUINTE (dormiram, perderam celular). O spike propõe `ended_at < 24h` como filtro. Mas não define:
- O que mostrar se um jogador reabre 25h depois — mensagem? silêncio?
- Se a whitelist de "recap já visto" é por token ou por anon_user_id (sessionStorage por device → se o player mudar de device, reabre `recap-seen-{encounterId}` não existe, vê de novo).

### [MEDIUM] Beta feedback items que o spike não endereça nem como "punt justificado"

Cross-check contra o contexto do prompt (beta test items mencionados):
1. **Compêndio — botão X de fechar muito pequeno** (spec UX Sally cobriu). Spike não menciona nem como punt. **Flag**: deve ser citado pelo menos em "outros feedbacks não cobertos por este spike, ver Sally's spec".
2. **"Richard" dice roller não clicável** — não aparece no spike. Precisa pelo menos de um punt: "fora de escopo deste spike, bucket em EPIC de interactivity".
3. **Rod of Pact Keeper / Bracers of Illusionist / Astral Shards faltando** — items não SRD faltantes. Spike menciona compendium gating mas não os items específicos. O gating ≠ catálogo; mesmo com whitelist, os items podem simplesmente não estar em `data/srd/items.json`. Precisa de verificação separada.
4. **Polymorph / transformação** (P2) — spike não menciona.
5. **Favoritos** (P2) — spike não menciona.
6. **Condições customizadas, botão Dodge** — spike não menciona (UX combat).
7. **Votação retroativa da sessão do Lucas** — não aparece no spike; o `dm_difficulty_rating: null` na `09_encounters_ended.json` Djinni sugere que o DM nem votou. O spike poderia ter mencionado que o "fallback de rating tardio" faz parte do recap fix.

**Correção**: adicionar seção "Out of scope — bucket list" listando cada punt explicitamente.

### [LOW] Spike não valida se `b33616aa` (sessão Djinni) tinha players ANON ou AUTH

A premissa do Finding 1 é "jogadores perderam o recap". Sessão `b33616aa` tem `campaign_id: null` (ver `11_sessions_involved.json`), o que é característico de sessão rápida sem convites autenticados. Isso significa: os players eram ANÔNIMOS (via `/join/<token>`), não AUTH (via `/invite/<token>`). Isso afeta a arquitetura do fix:
- Anon players têm `signInAnonymously` com cookie TTL curto. Se o cookie expirar (24h+) entre "combate encerra" e "player reabre", o fetch ao `/api/session/[id]/state` retorna 401.
- O spike propõe `ended_at < 24h` como filtro — batendo exatamente no TTL do cookie anon. **Coincidência ruim**: se o recap dura 24h, metade dos players anon vão bater 401 tentando fetchar.

**Correção**: documentar trade-off TTL recap vs TTL cookie anon. Considerar endpoint público (com token ID + encounter ID verificáveis, sem auth user check).

---

## Weak Solutions (Symptom vs Root Cause)

### Finding 4 Solução A: guard "wasHiddenFor > 30_000" trata sintoma, não causa

O root cause é: "tracking dispara sempre em visibility_change → visible, sem saber se houve reconnection real". A solução proposta só **mascara** eventos de curta duração. Mas não resolve: se o player ficar 35s em outra tab e voltar sem channel drop, ainda dispara `player:reconnected` (false positive).

**Alternativa melhor**: trackear apenas quando `disconnectedAtRef.current !== null` OU `consecutiveFailsRef.current > 0` (houve falha real detectada) OU o próprio channel state mudou. O "hidden > 30s" é uma heurística que pode trocar um falso positivo por outro.

### Finding 5 Solução 1: fechar panels no advance treats symptom

A solução propõe fechar todos os panels quando o turno avança. Mas o **root cause** do guard `data-panel-open=true` ignorando scroll é um **concern de UX original legítimo**: DM editando HP não quer scroll interromper. Fechar o panel no advance pode ser pior — DM perde o contexto do painel aberto (ex: editando condições de um combatant que acabou o turno). A Opção 3 do spike (guard por row atual) é mais defensiva. Inversão de recomendação: **fazer Opção 3 como default, Opção 1 como toggle de usuário**.

### Finding 6 Solução: auto-whitelist como "beta tem que estar aberto"

Ver [CRITICAL-2]. Se o produto vai abrir beta geral, a lógica deveria ser: **remover o whitelist check do endpoint** para conteúdo não-crítico, e manter o whitelist apenas para items de IP próprio (traduções PT-BR, lore narrativo). Trigger permanente é a solução errada para o problema certo.

---

## Hidden Risks / Edge Cases

### R1. Concurrent `encounters.recap_snapshot` writes em sessões com múltiplos encounters simultâneos

Não deveria ocorrer (1 encounter ativo por sessão), mas se o DM tiver 2 abas abertas e ambas tentarem encerrar:
- Write A: `UPDATE encounters SET recap_snapshot=... WHERE id=X`
- Write B: idem
- Sem lock, última-escrita-vence. Pouco crítico mas pode confundir.

**Mitigação**: usar `WHERE recap_snapshot IS NULL` no UPDATE (only-once semantics). Spike não menciona.

### R2. `NULL` bytes no JSONB travam PostgreSQL

PostgreSQL JSONB rejeita `\u0000` em strings. Se o report tiver nomes de monstros ou narrativas gerados por IA com caracteres de controle, o INSERT falha silenciosamente se não houver try/catch. O `combat_reports` endpoint deve ter tratamento — mas novo `recap_snapshot` via service client não tem. **Spike não menciona sanitização.**

### R3. Throttle 5s no `fetchFullState` pode encobrir falha de auto-join

O auto-join em [`PlayerJoinClient.tsx:941-960`](../components/player/PlayerJoinClient.tsx#L941-L960) depende de um `fetchFullState` que detecta a ausência do player. Se o throttle bloquear o fetch inicial após registration, o player pode ficar 5s sem auto-join (parece travado).

### R4. `visibility_change` trigger em mobile Android faz `visibilitychange` disparar 2x em sequência

Android fires `visibilitychange → hidden` + `visibilitychange → visible` em sucessão rápida quando a tela reapaga acidentalmente. Isso dispara 2 reconnects. A análise estatística (107 eventos / 8 players / 3h30) não controla para isso.

### R5. DM encerrar combate COM telefone em background

O DM LEEN poderia estar com o app em background no iPad/celular — a broadcast `session:combat_recap` no **DM** side pode não ter enviado (channel dormindo). O spike trata broadcast como "fire-and-forget best-effort" mas **o DM não detecta se deu certo**. Precisa de error toast visual se `ch.state !== "joined"` no momento do encerramento.

### R6. `ended_at: null` + `recap_snapshot: present` é estado inválido

Se persistência falhar parcialmente (recap salvo mas update de ended_at falha), temos um recap "órfão" no encounter ativo. Uma query `WHERE recap_snapshot IS NOT NULL` retornaria esse caso como válido, mostrando recap em combate ativo — desastre UX.

**Mitigação**: persistir `recap_snapshot` E `ended_at` na MESMA UPDATE.

### R7. Parity Rule: Finding 5 (auto-scroll) parcialmente aplicável ao Anon player

Spike marca "aplicar nos 3 modos" para Finding 5. Mas o Anon/Auth player **não tem o mesmo fluxo** — o auto-scroll do DM é dentro de `CombatSessionClient`, enquanto o player usa `PlayerJoinClient` (componente totalmente separado). O spike não verificou se o player tem guard similar. Precisa de verificação explícita.

---

## Gaps (Test Strategy, Rollout, Migration, Observability)

### G1. Estratégia de testes ausente para 6/7 findings

Spike só menciona test plan para Finding 2: "e2e `turn-advance.spec.ts` — DM adiciona 3 monstros em <10s". Faltam:
- **Finding 1**: nenhum teste listado. Precisa de e2e "player close tab → DM ends combat → player reopen → sees recap". Atualmente nada valida isso.
- **Finding 3**: apenas snapshot visual sugerido ("pips"). Sem teste automatizado.
- **Finding 4**: test plan = "comparar métrica no próximo beta test". Isso é observacional, não teste. Precisa de unit test que force visibility_change com mocks e valide número de trackEvents.
- **Finding 5**: "manual test" mencionado. Frágil.
- **Finding 6**: trigger SQL precisa de teste de migração (rollback test + idempotência).
- **Finding 7**: puramente visual, sem validação.

**Recomendação**: adicionar ao spike uma seção "Test Plan" com matriz `{finding, unit, integration, e2e, visual}`.

### G2. Rollout plan — zero menção de feature flags ou canary

Spike assume "deploy tudo direto pra prod". Findings como Finding 2 (novo tipo de broadcast) precisa de **feature flag** OU release coordenada (spike menciona "manter handler antigo vivo por 1 release" em Riscos — mas não no Plano de Ataque). Se DM deployar primeiro e player ainda não, players recebem broadcast desconhecido e ignoram.

**Correção**: adicionar no Plano de Ataque:
- Deploy ordem: (1) Player client primeiro com handler NOVO + mantendo OLD. (2) DM client depois, emitindo só NEW. (3) Cleanup OLD handler 1 semana depois.

### G3. Data migration backfill

Findings 1 (schema) e 6 (whitelist) envolvem migrations:
- **Finding 1**: adicionar `recap_snapshot` column. Existing rows terão `recap_snapshot: NULL`. Spike não discute se precisa backfill (provavelmente não — só para encounters futuros). **OK**.
- **Finding 6**: migration de backfill mencionado como "retroativo" (item 3 da solução) mas não detalhado. Deve estar em arquivo SQL específico, testado em staging primeiro.

### G4. Observabilidade das correções

Spike propõe corrigir métricas (Finding 4) mas não especifica:
- Quais NEW events/metrics introduzir pra monitorar se os fixes estão funcionando.
- Quais alerts/dashboards atualizar.

**Adicionar ao spike**: para cada P0, listar a métrica que deve diminuir/subir e como medir.
- Finding 1 → metric: `recap_delivery_success_rate` (recap_viewed events / encounters_ended events).
- Finding 2 → metric: `combatant_add_desync_events` (nova telemetria para quando player faz fetchFullState após combatant_add detectar mismatch).
- Finding 4 → metric: `player:reconnected` volume (deve cair para ~20 pra 8 players por sessão como esperado pelo spike).

### G5. Breaking changes para clientes antigos (mobile PWA em cache)

PWA do player pode estar no cache com código antigo. Se o DM deployar broadcast com novo tipo de evento e player antigo receber, o handler antigo não tem match e silenciosamente ignora. Spike menciona isso como "risco" mas não apresenta plano de force-refresh do cliente (service worker update check).

---

## Recommended Spike Revisions

Edições mínimas que o autor do spike deve fazer antes de entregar pra implementação:

### Edit 1 — Finding 1 Solução item 3 (CRITICAL)
Reescrever: "Endpoint `/api/session/[id]/state`" → usar endpoint SEPARADO `/api/session/[id]/latest-recap` OU modificar a query do encounter para incluir encounters ended recentemente (remover `.eq("is_active", true)` e adicionar filtro temporal explícito `OR ended_at > now() - interval '24h'`). Também mudar client para lidar com `encounter.is_active = false` que retorna dados (não pode chamar `setActive(false)` cegamente).

### Edit 2 — Finding 1 Solução item 2 (CRITICAL)
Reescrever: "persistir via service client" → especificar novo endpoint POST `/api/encounters/[id]/recap-snapshot` com ownership check por `sessions.owner_id`. Não usar service client do browser. Mudar `await` para `void` com retry (não bloquear UX do DM).

### Edit 3 — Finding 1 alternativa preferível (HIGH)
Considerar: ao invés de adicionar coluna `recap_snapshot` em `encounters`, REUSAR `combat_reports` existente com FK `encounter_id` (já existe em migration 085). O DM existente flow salva ao clicar "salvar"; o novo flow auto-salva ao encerrar. Client fetcha `combat_reports` por `encounter_id`. Benefícios: MAX_PAYLOAD_SIZE check já existe, RLS já configurado, public share via short_code ganho de graça.

### Edit 4 — Finding 6 Solução (CRITICAL)
Substituir trigger AUTO por:
- Migration 115 idempotente que replica o INSERT da 114 (pega usuários criados após 114). Não-automático, não-trigger.
- Adicionar em `docs/migration-i18n-linguagem-ubiqua.md` ou novo `docs/beta-whitelist-policy.md` a política: "auto-whitelist é OFF, add manualmente".
- Remover proposta de trigger SECURITY DEFINER.

### Edit 5 — Finding 2 root cause (HIGH)
Reescrever o parágrafo de root cause. O bug NÃO é "state_sync descartado como stale" — é "state_sync pode sobrescrever estado local quando snapshot não inclui adds que chegaram via combatant_add separado mas ainda não foram persistidos no DB". Ajustar solução de acordo.

### Edit 6 — Finding 4 (HIGH)
Substituir "107 reconnects é só noise" por "92 de 107 parecem noise, mas 15 stored_identity + 2 CHANNEL_ERROR + 132 401s AbortError são sinais reais que precisam tracking separado". Criar categorias de reconnect.

### Edit 7 — Combat Parity: Finding 1 (HIGH)
Mudar linha 717 de "guest já persiste localmente" para "guest tem bug equivalente, low impact — bucket P2 com localStorage backup".

### Edit 8 — Plano de Ataque (MEDIUM)
Adicionar:
- **Rollout order** explicitando client-first-deploy para Finding 2.
- **Feature flags** sugeridos: `PLAYER_RECAP_PERSIST_ENABLED` (Finding 1), `BETA_AUTO_WHITELIST` (Finding 6 só se for OPT-IN).
- **Test matrix** por finding.
- **Observability metrics** por finding.

### Edit 9 — Out of scope (MEDIUM)
Adicionar seção nova listando explicitamente feedbacks do Lucas que NÃO estão neste spike e por quê:
- Compêndio X button size → Sally's UX spec
- Richard dice roller → bucket UX
- Rod of Pact Keeper / Bracers / Astral Shards → bucket catalog content
- Polymorph, Favoritos, Dodge, Condições customizadas → bucket combat UX
- Votação retroativa → bucket post-combat polling

### Edit 10 — Premissas (LOW)
Adicionar:
- Sessão `b33616aa` tinha jogadores ANONYMOUS (campaign_id: null). TTL do cookie anon afeta janela útil do recap.
- `ended_at: null` em `b33616aa` indica o encounter foi criado em 04-11 e o `started_at` nunca foi escrito — investigar se é bug antigo ou mudança de schema (Finding 8 parcialmente cobre).

### Edit 11 — Finding 8 escopo (LOW)
Mudar de "0.25 dia" para "0.5 dia com investigação" — o bucket inclui descobrir por que `started_at` é null em encounter recém-criado, potencialmente múltiplos paths (DM pode resumir encounter antigo sem setar started_at).

---

## Recomendação Final

**O spike está ~70% correto em diagnóstico, 50% correto em solução.**

Pontos fortes:
- Análise de dados competente (contagens verificadas OK).
- File refs corretas em geral.
- Boa articulação de trade-offs em vários findings.

Pontos críticos de reworking obrigatório antes de qualquer dev puxar este spike:
1. Fix do endpoint state (CRITICAL-1) — a solução não funciona.
2. Trigger auto-whitelist (CRITICAL-2) — viola SRD Compliance e intent da 114.
3. Persistência do recap via service client (CRITICAL-3) — RLS/endpoint não definido.

Se implementado como está, temos alto risco de: (a) recap nunca ser entregue ao player (state endpoint filtra active-only), (b) beta-gate efetivamente removido (trigger abre compendium pra todos), (c) UX do DM travando 3-5s ao encerrar combate (await bloqueia).

**Recomendação de gate**: spike deve ter Edit 1, 2, 4 aplicados no mínimo antes de handoff para dev.
