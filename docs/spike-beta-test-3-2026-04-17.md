---
title: "Spike: Beta Test 3 — Diagnóstico e Plano de Remediação"
versão: 2.0 (revisado após adversarial review)
data: 2026-04-17
autor: Winston (Architect, BMAD)
status: Pronto para implementação após Edits 1–11 aplicados
dm: Lucas Galupo (sessão 2026-04-16 à noite)
encounters_analisados: 2 (`71a7a8ea` "Wolfs" smoke-test + `484114e7` "Djinni & Air Elementals" real); `1a2ceed2` "Dao & Earth Elemental Myrmidons" rodou no dia seguinte (17/04) e também é do Lucas
fontes:
  - observability/dados/2026-04-16_17/ (SUMMARY.md + 01..14 JSON)
  - projeto-rpg-log-export-2026-04-17T03-18-19.json (16.571 linhas Vercel)
  - docs/spec-resilient-reconnection.md (spec 2026-04-02 imutável)
  - docs/spike-review-findings.md (review adversarial 2026-04-17)
---

# Spike: Beta Test 3 — Diagnóstico e Plano de Remediação (v2)

> **Nota sobre a "duração média 18s" no SUMMARY.md**: apenas `Wolfs` (18s, smoke-test) tem `started_at`/`ended_at` válidos. O combate real (`Djinni & Air Elementals`) tem `started_at: null` — o agregador o descartou. A duração do combate do Lucas não é medível com a telemetria atual (ver Finding 8).

---

## Changelog da revisão v1 → v2

Esta versão aplica as correções derivadas do review adversarial em `docs/spike-review-findings.md`. Mudanças materiais:

- **CRITICAL-1 (Finding 1, endpoint do recap)** — o endpoint `/api/session/[id]/state` filtra `is_active=true` ([app/api/session/[id]/state/route.ts:57](app/api/session/[id]/state/route.ts#L57)) e jamais retornaria um encounter encerrado. **Solução revisada**: criar endpoint dedicado `GET /api/session/[id]/latest-recap` em vez de estender `/state`. Rationale abaixo.
- **CRITICAL-2 (Finding 6, whitelist)** — trigger `AFTER INSERT ON auth.users` removido. Substituído por migration **136 idempotente** que replica o `INSERT` da 114 pegando usuários criados depois. Adicionado processo documentado para whitelistar novos testers beta (migration manual, não trigger). Respeita SRD Content Compliance.
- **CRITICAL-3 (Finding 1, onde a persistência roda)** — especificado: persistência acontece via novo endpoint **`POST /api/encounters/[id]/recap`** chamado pelo DM client. Endpoint valida `sessions.owner_id = auth.uid()` antes de escrever. Não usa service client no browser. `await` trocado por `void + retry` para não bloquear UX.
- **HIGH-1 (Finding 2, state_sync não é stale-descartado)** — re-verificado em [PlayerJoinClient.tsx:996-997](components/player/PlayerJoinClient.tsx#L996-L997): `lastSeqRef.current = seq` é setado **incondicionalmente** (comentário DESYNC-FIX-2). Root cause reescrito: o risco não é "state_sync descartado", é "state_sync pode sobrescrever a lista local revertendo adds que chegaram via `combatant_add` separado mas ainda não atingiram o DB".
- **HIGH-2 (Finding 2, ordering)** — `broadcastViaServer` ([lib/realtime/broadcast.ts:412](lib/realtime/broadcast.ts#L412)) dispara em paralelo ao path client-direct. FIFO é por `(sender, channel)`, e há 2 senders. Análise ajustada: 3 adds produzem até 12 mensagens com ordem parcial (2 tipos × 2 paths × 3 adds).
- **HIGH-3 (Finding 4, reconnects não são só ruído)** — reclassificação em 3 tiers (ruído, ambíguo, sinal real). Os 15 `stored_identity` + 132 `401 AbortError` continuam sendo sinal real (reentries de app após encerramento de combate + unloads durante fetch).
- **HIGH-4 (Finding 4, throttle)** — throttle 5s aplica-se apenas a fetches disparados por eventos de visibility. Fetches explícitos de recovery (auto-join, fallback `combatant_add`, late-join) recebem parâmetro `{ priority: "emergency" }` e bypass do guard.
- **HIGH-5 (Finding 1, guest)** — reverificado em `GuestCombatClient.tsx`: **não** há persistência do recap em localStorage (apenas `setShowRecap` React state). Guest tem bug equivalente em impacto menor (single-device); tratamos como bucket P2.
- **H8 (cross-cutting com UX spec)** — Finding 5 **supersede** a Hotfix H8 do UX spec. O guard `data-panel-open=true` em [CombatSessionClient.tsx:1886](components/session/CombatSessionClient.tsx#L1886) é o root cause; H8 mantinha o guard e não resolveria.
- **H9 (cross-cutting com UX spec)** — Finding 3 dona da camada de **dados** (o que se calcula/armazena). UX spec H9 dona da camada de **display** (como se mostra). Split explícito na nova seção "Cross-Cutting Ownership".
- Adicionadas seções: **Test Plan**, **Rollout Plan**, **Observability pós-fix**, **Breaking Changes & PWA Cache**, **Data Backfill**, **Out of Scope**.

---

## Executive Summary

Nove achados. Três P0, dois P1, quatro P2/bucket.

1. **[P0] Recap pós-combate é _broadcast-only_**. Não há persistência nem endpoint de fetch. Quem estava com a tela bloqueada quando o DM encerrou (00:52:58 em `484114e7`) perdeu o Wrapped. Entre 00:52:56 e 00:53:18 há 6 reconnects de players voltando para lobby/board vazio.
2. **[P0] Adicionar criatura mid-combat compromete a consistência do turn order no player**. O handler DM re-sort e ajusta `current_turn_index`; o player depende de que `session:state_sync` chegue depois do `combat:combatant_add`. O bug não é descarte por staleness (state_sync sempre reconcilia lastSeq) — é que o `state_sync` pode **sobrescrever com snapshot mais antigo** e/ou `broadcastViaServer` quebrar a FIFO assumida.
3. **[P0] 107 `player:reconnected` para 8 jogadores em ~3h30 são majoritariamente ruído telemétrico (~86%)** — mas não 100%. 15 reconnects `stored_identity` + 2 `CHANNEL_ERROR` reais + 132 `401 AbortError` no `/api/broadcast` são sinal real. Correção: classificar em 3 tiers, não apenas silenciar.
4. **[P1] "Vida do grupo" é a soma das HPs dos membros ativos** — decisão de código em [MonsterGroupHeader.tsx:47-51](components/combat/MonsterGroupHeader.tsx#L47-L51) que mascara o elemental crítico. Spike é dono da camada de dados; UX spec (H9) dona da camada visual.
5. **[P1] Auto-scroll do DM silenciosamente desligado** — guard `data-panel-open="true"` em [CombatSessionClient.tsx:1886](components/session/CombatSessionClient.tsx#L1886) cancela scroll sempre que qualquer `CombatantRow` tem painel aberto. Supersede Hotfix H8 do UX spec.
6. **[P2] Compêndio full depende de whitelist manual não-backfilled** — migration 114 populou existentes com critério curado. Lucas pode ter criado conta depois. Fix: migration 136 idempotente (re-rodável). **Não criar trigger** (fere SRD Compliance).
7. **[P2] Monster stat block: resistências depois das abilities**. Padrão 5e Tools/DDB é o inverso. Reorder de bloco.
8. **[P2] HP crítico continua `text-muted-foreground`** mesmo quando row ganha glow vermelho. Legibilidade ruim no celular.
9. **[P2 observabilidade]** `/api/session/:uuid/state` com picos de 200+ req/min; 90 de 8.315 requisições com 429. Múltiplos loops de polling concorrentes. Bucket de resilience evolution.

---

## Cross-Cutting Ownership (spike vs UX spec)

Matriz explícita de quem decide o quê para evitar conflito:

| Tema | Dono (este spike) | Dono (UX spec) | Coordenação |
|------|-------------------|----------------|-------------|
| Recap persistido | Schema + endpoint + protocolo de delivery (Finding 1) | Copy do modal "Recap indisponível após 24h" | Spike define contrato; UX escreve strings |
| Group HP data | Como calcular (min/max/lista), o que persiste (Finding 3) | Como desenhar (pips, badges, cores) — H9 | Spike expõe campos; UX consome |
| Auto-scroll + panel | Fix do guard (Finding 5) — **supersede H8** | UX spec deve remover/redirecionar H8 | Este spike é authoritativo; H8 fica deprecado |
| Compêndio X button | n/a | Touch target (feedback Lucas) | UX spec only |
| Dice roller "Richard" | n/a | Interatividade | UX spec / Epic 2 |
| HP crítico cor | Lógica `isCritical` (Finding 7) | Token de cor (`--color-critical`) | Spike aplica classe; UX spec define token |
| Resistances reorder | Ordem de render (Finding 7) | Labels/iconografia | Spike reordena; UX ajusta visual |

**Ação para UX spec**: marcar Hotfix H8 como "SUPERSEDED by spike Finding 5". Não implementar a variação que preserva o guard.

---

## Finding 1 — Recap pós-combate perdido

### Sintoma

Lucas encerrou combate `484114e7` às **00:52:58**. Vários jogadores com tela bloqueada perderam o Wrapped; nunca reapareceu.

### Arquitetura atual (file:line refs verificadas)

**Broadcast único no DM**: [CombatSessionClient.tsx:295-322](components/session/CombatSessionClient.tsx#L295-L322)

```typescript
// CombatSessionClient.tsx:319-322
broadcastEvent(sid, {
  type: "session:combat_recap",
  report: playerSafeReport,
});
```

**Listener no player**: [PlayerJoinClient.tsx:1419-1424](components/player/PlayerJoinClient.tsx#L1419-L1424)

**Endpoint de recap DM-only**: [app/api/combat-reports/route.ts:1-55](app/api/combat-reports/route.ts#L1-L55) — `MAX_PAYLOAD_SIZE = 100_000` já definido. FK `encounter_id` nullable já existe (migration 085). RLS permite read pública via `short_code`.

**Endpoint `/state` filtra active-only**: [app/api/session/[id]/state/route.ts:52-60](app/api/session/[id]/state/route.ts#L52-L60) — `.eq("is_active", true)`. Encounter encerrado nunca retorna; código cai em `if (!encounter)` na [linha 114](app/api/session/[id]/state/route.ts#L114) e responde `encounter: null`.

### Root cause

O protocolo de entrega do recap é **fire-and-forget via Supabase Realtime broadcast** — _best-effort_ na semântica do próprio Supabase. Se o cliente estava com tab hidden, reconectando, ou perdeu rede na janela de 2s do broadcast, o `setCombatRecapReport` nunca roda. Não há:

1. Persistência server-side do recap final (o `combat_reports` só salva se DM clica "salvar" no UI pós-combate).
2. Endpoint que o player possa chamar no reconnect para recuperar o recap.
3. Hidratação do recap no fluxo `fetchFullState`.

Pior: `/api/session/[id]/state` filtra `is_active=true`, portanto mesmo que persistíssemos `recap_snapshot` na row do encounter, o endpoint não serviria para buscar — ele retornaria `encounter: null` assim que o DM encerra.

### Solução proposta (revisada)

Estratégia: **reusar `combat_reports`** (já tem size guard, RLS, FK) + **endpoint dedicado separado do `/state`**.

**1. DM persiste ao encerrar — novo endpoint `POST /api/encounters/[id]/recap`**

Criar `app/api/encounters/[id]/recap/route.ts`:

- Auth: `supabase.auth.getUser()`.
- Verifica ownership: `SELECT owner_id FROM sessions s JOIN encounters e ON e.session_id = s.id WHERE e.id = :id AND s.owner_id = auth.uid()`. Sem service client. Retorna 403 se não for dono.
- Reutiliza `MAX_PAYLOAD_SIZE = 100_000` e sanitização de NULL bytes (estende o que `combat-reports/route.ts` faz — adicionar `JSON.stringify(report).includes("\u0000")` check explícito; erro 400 se sim).
- Grava em `combat_reports` com `encounter_id = :id`, `owner_id = user.id`, `short_code` aleatório.
- Idempotência: `ON CONFLICT (encounter_id) DO NOTHING` — ver migration abaixo. Um recap por encounter. Se chamado de novo (ex.: DM refresh durante leaderboard), retorna 200 com o recap já existente.

**2. Migration 137 — garantir único recap por encounter**

```sql
-- 137_combat_reports_unique_encounter.sql
ALTER TABLE combat_reports
  ADD CONSTRAINT combat_reports_encounter_id_unique
  UNIQUE (encounter_id) DEFERRABLE INITIALLY DEFERRED
  WHERE encounter_id IS NOT NULL;
```

*(Checar se Postgres suporta partial unique; se não, index: `CREATE UNIQUE INDEX ... WHERE encounter_id IS NOT NULL`.)*

**3. DM client chama o novo endpoint em vez de broadcast-only**

Em [CombatSessionClient.tsx:295-322](components/session/CombatSessionClient.tsx#L295-L322):

```typescript
// BEFORE o broadcast, não bloqueando UX:
const encounterIdSnap = /* id do encounter que acabou */;
void (async () => {
  try {
    const res = await fetch(`/api/encounters/${encounterIdSnap}/recap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report: playerSafeReport }),
    });
    if (!res.ok && res.status !== 409) {
      // retry uma vez em background
      await new Promise((r) => setTimeout(r, 2000));
      await fetch(`/api/encounters/${encounterIdSnap}/recap`, { /* ... */ });
    }
  } catch { /* best-effort; broadcast segue como caminho feliz */ }
})();

// Broadcast continua (caminho feliz)
broadcastEvent(sid, { type: "session:combat_recap", report: playerSafeReport });
```

**4. Novo endpoint `GET /api/session/[id]/latest-recap`** (separado de `/state`)

Criar `app/api/session/[id]/latest-recap/route.ts`:

- Auth: player precisa ter `session_tokens` ativo (mesmo pattern de `/state/route.ts:36-45`).
- Query: `combat_reports` com `encounter_id` em `(SELECT id FROM encounters WHERE session_id = :id ORDER BY ended_at DESC LIMIT 1)` E `ended_at > now() - interval '24h'`.
- Sanitização: aplicar `sanitizeCombatantsForPlayer` aos `rankings` e reusar `mapName` para display_name (o DM já fez isso ao persistir — este endpoint pode apenas retornar o que está salvo, desde que garantido na escrita).
- Resposta: `{ data: { recap: {...}, encounter_id, ended_at } }` ou `{ data: null }` se nada.

Rationale de endpoint separado (em vez de estender `/state`):
- `/state` assume `encounter.is_active = true` em código downstream ([PlayerJoinClient.tsx:888-892](components/player/PlayerJoinClient.tsx#L888-L892) chama `setActive(data.encounter.is_active ?? false)`). Mudar semantics gera risco de regressão em 6 paths de polling.
- Endpoint separado é chamado condicionalmente apenas após sinal "combat just ended" ou no mount pós-lobby.
- TTL de 24h é política do endpoint, não contaminada com lógica de active-session.

**5. Player hidrata no mount + no `session:combat_recap` como fallback**

Em [PlayerJoinClient.tsx:886-933](components/player/PlayerJoinClient.tsx#L886-L933) (dentro de `fetchFullState` branch `!encounter`):

```typescript
if (!data.encounter) {
  // ... lobby logic existente ...

  // Novo: tentar recap recente
  try {
    const seen = sessionStorage.getItem(`recap-seen-${sessionId}`);
    if (!seen) {
      const recapRes = await fetch(`/api/session/${sessionId}/latest-recap`);
      if (recapRes.ok) {
        const { data: recapData } = await recapRes.json();
        if (recapData?.recap) {
          setCombatRecapReport(recapData.recap);
          // sessionStorage chave por encounter_id (sobrevive refresh)
          sessionStorage.setItem(`recap-session-encounter`, recapData.encounter_id);
        }
      }
    }
  } catch { /* best-effort */ }
}
```

Quando o user fecha o recap → `sessionStorage.setItem(`recap-seen-${sessionId}`, "1")`.

**6. Listener de broadcast continua intacto** como caminho feliz (delivery imediato pra quem está online). Apenas o fallback via endpoint muda.

### Edge cases cobertos (novos)

- **DM refresh durante leaderboard**: endpoint idempotente (`ON CONFLICT DO NOTHING`), retry automático. Se nem fetch nem broadcast completaram, o recap fica perdido — mitigação: DM client armazena `playerSafeReport` em `sessionStorage` e retry no mount se `/recap` ainda não tiver registro.
- **DM reopen / resume encounter**: hoje não há endpoint `resumeEncounter` (grep confirmou). Documentar política: recap é **imutável** por encounter — se o produto adicionar resume, spec separado ajusta (bucket).
- **Cookie anon expira antes do player reabrir**: `b33616aa` teve `campaign_id: null` (anon players). Cookie TTL 24h. Filtro `ended_at > now() - 24h` bate com isso. Aceitamos o trade-off: recap garantido em 24h; quem volta depois vê "combate encerrado" normal.
- **NULL bytes no JSONB**: sanitização explícita no endpoint POST.
- **Payload > 100KB**: retornar 413. Em combates muito longos, o recap pode precisar de truncation — bucket se aparecer na prática.
- **Race DM dupla-tab**: o partial unique index em `encounter_id` serializa.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/137_combat_reports_unique_encounter.sql` | CRIAR — unique partial index |
| `app/api/encounters/[id]/recap/route.ts` | CRIAR — POST persiste recap |
| `app/api/session/[id]/latest-recap/route.ts` | CRIAR — GET retorna recap recente |
| `components/session/CombatSessionClient.tsx:295-322` | MODIFICAR — `void fetch` antes do broadcast |
| `components/player/PlayerJoinClient.tsx:886-933` | MODIFICAR — hidratar recap no `!encounter` branch |
| `components/combat/CombatRecap.tsx:42` | MODIFICAR — chave `recap-seen-${sessionId}` |

### Test plan

- **Integration**: teste do endpoint POST `/api/encounters/[id]/recap` — ownership OK, não-dono 403, payload > 100KB 413, NULL byte 400, idempotência (2ª chamada = 200 com mesmo short_code).
- **Integration**: teste do endpoint GET `/api/session/[id]/latest-recap` — retorna recap se < 24h, null se > 24h, null se nenhum, 403 se não tem session_token.
- **E2E Playwright** (`e2e/features/recap-persistence.spec.ts`):
  1. DM inicia combate com 2 players; mata inimigos; encerra.
  2. Antes do broadcast chegar (simular network throttle), player 1 tem tab hidden.
  3. Player 1 reabre tab depois de 3s — vê o recap via endpoint.
  4. Player 2 (tab always visible) vê via broadcast — mesma UX.
  5. Player 1 fecha recap → sessionStorage seen → refresh → não reabre.
- **Unit**: `CombatRecap.tsx` com prop `report` hidrato vs null.

### Rollout plan

- Feature flag: nenhum necessário (endpoint novo, idempotente, não quebra clients antigos). Players antigos sem o fetch apenas dependem do broadcast (caminho atual).
- Ordem de deploy:
  1. Migration 137 + endpoint POST `/recap`.
  2. DM client (começa a persistir).
  3. Endpoint GET `/latest-recap` + player client (começa a ler).
- Rollback: revert commit do DM client + drop endpoint GET. Dados em `combat_reports` ficam — sem efeito colateral.

### Observability pós-fix

- Nova métrica `recap.persisted_success_count` (server, no endpoint POST) vs `recap.persisted_failure_count`.
- Nova métrica `recap.served_from_db` (endpoint GET, retornando not-null) vs `recap.delivered_via_broadcast` (player client, quando `session:combat_recap` dispara).
- Alerta: se `persisted_failure_count / encounters_ended > 5%` em 24h.
- Dashboard: fração de players que viram recap (delivery_rate). Baseline atual = desconhecido; target = >95%.

### Breaking changes & PWA cache

- Nenhum evento de broadcast mudou. Players antigos no PWA cache continuam funcionando (caminho feliz).
- Players antigos **não** vão hidratar recap do DB (não fazem o fetch novo). Aceitável: a feature é aditiva. Service worker atualizará o app dentro de 7 dias (configuração atual).
- DM client antigo **não** persistirá no DB. Players novos lendo `/latest-recap` verão `null` durante a janela em que o DM ainda está em versão antiga. Baixo impacto: DM atualiza quando recarrega a página.

### Data backfill

- Encounters existentes (`ended_at` null ou passado) não ganham `combat_reports` retroativamente. Decisão: **não backfillar**. O recap é ephemeral — o produto não promete histórico de 24h retroativo a encounters pre-feature.

### Esforço estimado

**1–1.5 dia** (backend + front + 2 endpoints + testes). Risco baixo-médio por ser aditivo.

---

## Finding 2 — Adicionar criatura em combate bagunça turno

### Sintoma

Lucas adicionou 3 Velociraptors em sequência (02:34:20, 02:34:22, 02:34:26; confirmado em `01_events_raw.json`). Relatou que a ordem de turno ficou incorreta para os jogadores.

### Arquitetura atual

**DM side (correto)**: [lib/hooks/useCombatActions.ts:402-442](lib/hooks/useCombatActions.ts#L402-L442) — re-sort + ajuste de `current_turn_index`.

**DM broadcasts 2 eventos por add**: [useCombatActions.ts:423-435](lib/hooks/useCombatActions.ts#L423-L435):

```typescript
broadcastEvent(getSessionId(), { type: "combat:combatant_add", combatant: added });
// ...
broadcastEvent(getSessionId(), {
  type: "session:state_sync",
  combatants: syncState.combatants,
  current_turn_index: syncState.current_turn_index,
  round_number: syncState.round_number,
  encounter_id: syncState.encounter_id!,
});
```

**`broadcastEvent` envia por 2 paths em paralelo**: [lib/realtime/broadcast.ts:401-412](lib/realtime/broadcast.ts#L401-L412) — path client-direct (ch.send) + `broadcastViaServer` (fire-and-forget HTTP→server envia novo broadcast). **FIFO é por `(sender, channel)` — há 2 senders lógicos.**

**Player side state_sync** (verificado): [PlayerJoinClient.tsx:990-1017](components/player/PlayerJoinClient.tsx#L990-L1017) — DESYNC-FIX-2 faz `lastSeqRef.current = seq` incondicional. `state_sync` **nunca** é descartado por staleness; ele **reconcilia e reseta** o contador.

**Player side combatant_add**: [PlayerJoinClient.tsx:1201-1247](components/player/PlayerJoinClient.tsx#L1201-L1247) — appenda no final; dedup por ID.

**Persistência DB**: [useCombatActions.ts:437-440](lib/hooks/useCombatActions.ts#L437-L440) — `persistNewCombatant` e `persistInitiativeOrder` em promises paralelas (sem await ordering).

### Root cause (revisado)

Três problemas compostos, o principal diferente do que a v1 descreveu:

1. **`state_sync` pode sobrescrever estado local com snapshot obsoleto** (contradiz v1: não é "descartado como stale"; é aceito e reverte). Cenário:
   - Add #1 emite `combatant_add(A)` + `state_sync([... , A])`.
   - Add #2 emite `combatant_add(B)` + `state_sync([... , A, B])`.
   - Se `state_sync` do add #1 chegar DEPOIS do `combatant_add(B)`, o player tinha `[..., A, B]`, agora recebe snapshot `[..., A]` — **B some**. Só reaparece se o `state_sync` do add #2 (que contém B) também chegar. Se aquele pacote for perdido (tab hidden, 401 AbortError), B fica invisível até o próximo `fetchFullState`.

2. **2 senders com FIFO parcial**: `broadcastViaServer` envia cada evento via servidor em paralelo ao path direto do browser. Para 3 adds temos até **12 mensagens** com ordem parcial (2 tipos × 2 paths × 3 adds). O sequence counter ajuda no channel do cliente, mas o servidor tem seu próprio counter — dois streams que se intercalam no player.

3. **Não é atômico no DB**: `persistNewCombatant` e `persistInitiativeOrder` são paralelos. Qualquer `fetchFullState` concorrente (throttled ou não) pode capturar foto inconsistente: combatant inserido sem `initiative_order` atualizado (ou vice-versa).

### Solução proposta

**1. Novo tipo de broadcast combinado**: `combat:combatant_add_reorder`

Em [lib/types/realtime.ts](lib/types/realtime.ts), adicionar:

```typescript
export type RealtimeCombatantAddReorder = {
  type: "combat:combatant_add_reorder";
  combatant: SanitizedCombatant;
  initiative_map: Array<{ id: string; initiative_order: number }>;
  current_turn_index: number;
  round_number: number;
  encounter_id: string;
};
```

Handler único insert + reorder + update turn_index atomicamente no player. Substitui o par `combatant_add + state_sync` **para este fluxo específico**; `state_sync` continua para outros paths (turn_advance, refresh).

**2. Persist sequencial no DB**

```typescript
await persistNewCombatant(snap.encounter_id, added);
await persistInitiativeOrder(sorted.map((c) => ({ id: c.id, initiative_order: c.initiative_order })));
```

`await` sequencial custa ~50-150ms adicional ao DM; aceitável em trade-off por consistência.

**3. Desabilitar `broadcastViaServer` para o novo tipo**

O server-side broadcast é necessário para sanitização anti-metagaming (em eventos que carregam dados DM-only como `is_hidden`, monster_id, etc.). O `combatant_add_reorder` deve carregar apenas `SanitizedCombatant` (já sanitized no cliente DM). Adicionar opt-out em `broadcast.ts` via flag no tipo ou check `event.type`. Reduz o sender plural para 1 — FIFO garantida.

**4. Fallback defensivo no receiver**: no handler de `combat:combatant_add_reorder`, se após o reorder detectar inconsistência (ex.: `initiative_map` contém ID que não está no array local), agendar `fetchFullState({ priority: "emergency" })` com debounce de 500ms. Bypass do throttle (ver Finding 4).

**5. Manter o handler antigo** `combat:combatant_add` vivo por 1 release — para clientes antigos ainda receberem o evento legado. Deprecar depois de verificar que o PWA atualizou.

**6. Cuidado com dedup existente**: o dedup em [PlayerJoinClient.tsx:1207-1216](components/player/PlayerJoinClient.tsx#L1207-L1216) (merge por ID) deve ser replicado no novo handler. Caso `combatant_add_reorder` chegue duplicado (ex.: retry DM), não dobrar.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `lib/types/realtime.ts` | ADICIONAR tipo `combat:combatant_add_reorder` |
| `lib/realtime/broadcast.ts:401-412` | MODIFICAR — opt-out do `broadcastViaServer` para o novo tipo |
| `lib/hooks/useCombatActions.ts:423-440` | MODIFICAR — sequenciar persists, trocar 2 broadcasts por 1 |
| `components/player/PlayerJoinClient.tsx:1201` | ADICIONAR handler de `combatant_add_reorder` |
| `e2e/combat/turn-advance.spec.ts` | ADICIONAR cenário rapid-add |

### Test plan

- **Unit**: reducer do handler novo com payload válido + inválido + dup.
- **Integration**: mock do channel, envia 3 eventos em ordem A-B-C, verifica lista final.
- **E2E Playwright** (`e2e/combat/rapid-add.spec.ts`):
  1. DM + 2 players.
  2. DM adiciona 3 monstros em janela de 6s.
  3. Player A (tab visible) deve ver lista com 3 em ordem de initiative em <3s.
  4. Player B (tab hidden 2s após cada add, visible depois) deve ver lista correta após último visible change.
- **Chaos test** (manual): desligar Wi-Fi do player entre add 1 e 2; religar; verificar recovery via `fetchFullState emergency`.

### Rollout plan

- Ordem de deploy obrigatória:
  1. Player client com handler novo + antigo coexistindo — deploy primeiro.
  2. Aguardar 24h (cliente PWA atualizar).
  3. DM client emite apenas novo tipo.
  4. 1 semana depois: cleanup do handler antigo.
- Se pular etapa 1, players antigos ignoram o broadcast novo → ficam com lista desatualizada permanentemente (até refresh).
- Feature flag no DM client: `COMBATANT_ADD_REORDER_ENABLED` (default false; liga após etapa 2).

### Observability pós-fix

- Nova métrica `combatant_add.desync_detected` (player emite quando detecta `initiative_map` inconsistente e chama recovery).
- Métrica `combatant_add.recovery_fetch_count` (chamadas emergency do fetchFullState).
- Comparar contagem vs número total de adds — target < 2% desync.

### Breaking changes & PWA cache

- Handler novo coexistindo com antigo: clientes antigos ignoram `combatant_add_reorder` (OK, não crashea — Supabase broadcast handler é opt-in por event type).
- DM antigo + player novo: player recebe `combatant_add` (append) + `state_sync` (reconcile) — comportamento v1, aceitável.
- DM novo + player antigo: player recebe `combatant_add_reorder` **e nada mais** — handler antigo não dispara. Se o player não tiver o handler novo, não atualiza. **Crítico**: emitir os 2 tipos durante a janela de transição, não substituir.

### Esforço estimado

**1 dia** (refactor + handler + testes). Risco médio por toque em broadcast pathway.

---

## Finding 3 — Vida do grupo somada

### Sintoma

Grupo de 3 Earth Elementals (encounter `1a2ceed2`, Lucas, 17/04): header mostra `360/390` (soma). Impossível ver qual elemental está crítico sem expandir.

### Arquitetura atual

[MonsterGroupHeader.tsx:47-51](components/combat/MonsterGroupHeader.tsx#L47-L51) — `activeMembers.reduce((sum, m) => sum + m.current_hp, 0)`. Render em [MonsterGroupHeader.tsx:165-178](components/combat/MonsterGroupHeader.tsx#L165-L178).

### Root cause

Decisão de design deliberada — agregar HP para "visão geral". Na prática mascara o crítico.

### Solução proposta (ownership: spike = dados; UX spec = display)

**Escopo spike**: remover o sum agregado e expor campos granulares que UX spec usa para renderizar.

Refatorar `MonsterGroupHeader.tsx` para calcular e expor via props ou hook:

```typescript
const groupHealth = {
  members: activeMembers.map(m => ({
    id: m.id,
    current_hp: m.current_hp,
    max_hp: m.max_hp,
    is_defeated: m.is_defeated,
    pct: m.max_hp > 0 ? m.current_hp / m.max_hp : 0,
    tier: m.max_hp > 0
      ? (m.current_hp / m.max_hp <= 0.25 ? "critical"
         : m.current_hp / m.max_hp <= 0.5 ? "warning"
         : "healthy")
      : "unknown",
  })),
  minHp: Math.min(...activeMembers.map(m => m.current_hp)),
  maxHp: Math.max(...activeMembers.map(m => m.current_hp)),
  criticalCount: activeMembers.filter(m => m.current_hp / m.max_hp <= 0.25).length,
  totalMembers: activeMembers.length,
};
```

**Escopo UX spec (H9)**: como renderizar — pips, badges, cores, animações. Este spike não dita o visual.

**Não mais soma**: removemos `totalCurrentHp/totalMaxHp` do render path.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `components/combat/MonsterGroupHeader.tsx:47-51` | REMOVER sum; CALCULAR `groupHealth` granular |
| `components/combat/MonsterGroupHeader.tsx:165-178` | SUBSTITUIR por render que UX spec vai especificar |

### Test plan

- **Unit**: `MonsterGroupHeader` com 3 membros variando HP (healthy/warning/critical/defeated) — verificar `groupHealth` output.
- **Visual regression** (Playwright screenshot): grupo collapsed com 1 crítico vs 0 críticos vs todos mortos.

### Rollout plan

Direct deploy. Zero backend, zero breaking.

### Observability pós-fix

- Não instrumenta — feature puramente UI.

### Breaking changes & PWA cache

- Nenhum.

### Esforço estimado

**0.25 dia** (lógica). UX visual dele é separado no UX spec.

---

## Finding 4 — Storm de reconexões (107 para 8 players)

### Sintoma

107 eventos `player:reconnected` em ~3h30 para 8 jogadores únicos (média 13/jogador). Top reconnector: `b44186d9` com 25 eventos.

### Arquitetura atual (file:line refs verificadas)

**Contagem real por método** (`01_events_raw.json`):
- `visibility_change`: **92** (86%)
- `stored_identity`: **15** (14%)

**Outras fontes de sinal** (14_error_logs.json, Vercel export):
- `CHANNEL_ERROR` reais: **2** (23:19 e 23:24 UTC na sessão `b33616aa`)
- `401 AbortError` em `/api/broadcast`: **132** (client unload durante fetch = reconexões reais de channel)
- 90 de 8.315 requisições com 429 no `/api/session/:uuid/state` (picos 02:27 = 51; 00:06 = 39)

**Handler dispara em todo `visible`**: [PlayerJoinClient.tsx:1816-1831](components/player/PlayerJoinClient.tsx#L1816-L1831):

```typescript
if (encounterIdRef.current) {
  try {
    await fetchFullState(encounterIdRef.current);
    if (isRegisteredRef.current) {
      trackEvent("player:reconnected", { session_id: sessionId, method: "visibility_change" });
    }
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await fetchFullState(encounterIdRef.current!);
      if (isRegisteredRef.current) {
        trackEvent("player:reconnected", { session_id: sessionId, method: "visibility_change" });
      }
    } catch { /* give up */ }
  }
}
```

### Root cause (revisado)

**Não é puro "bug de telemetria"**. A reclassificação correta tem 3 tiers:

- **Tier 1 (ruído, ~70 eventos estimados)**: `visibility_change` com `disconnectedAtRef === null` **E** `hiddenAtRef` curto (<30s) **E** `lastFetchSuccess` recente. Tab-switch trivial (WhatsApp quick check).
- **Tier 2 (ambíguo, ~20 eventos)**: `visibility_change` com `hiddenAtRef` médio (30s–5min). Pode ser backgrounding com WebSocket suspenso pelo iOS ou apenas tela bloqueada. Não dá pra saber sem verificar channel state.
- **Tier 3 (sinal real, ~17 eventos)**: 15 `stored_identity` + 2 `CHANNEL_ERROR` — reentries de app após WhatsApp link abertos (pós-combate do Lucas) + channel errors verdadeiros.

Os 132 `401 AbortError` são sinal separado — client unload durante fetch, ou cookies expirando. Precisa de tracking próprio.

### Solução proposta

**A. Classificar tracking em 3 tiers**:

Em [PlayerJoinClient.tsx:1816-1831](components/player/PlayerJoinClient.tsx#L1816-L1831):

```typescript
const wasDisconnected = disconnectedAtRef.current !== null;
const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
const channelState = (supabaseRef.current?.getChannels()[0] as any)?.state;

await fetchFullState(encounterIdRef.current, { priority: "emergency" });

if (!isRegisteredRef.current) return;

if (wasDisconnected || channelState !== "joined") {
  trackEvent("player:reconnected", {
    session_id: sessionId,
    method: "channel_recovery",
    hidden_ms: hiddenMs,
    confidence: "high",
  });
} else if (hiddenMs > 30_000) {
  trackEvent("player:reconnected", {
    session_id: sessionId,
    method: "long_background",
    hidden_ms: hiddenMs,
    confidence: "medium",
  });
} else {
  // Tier 1: ruído — emit separado, não polui funil de reconexão
  trackEvent("player:resumed", {
    session_id: sessionId,
    hidden_ms: hiddenMs,
  });
}
```

**B. Throttle do `fetchFullState` com bypass para recovery**:

Em [PlayerJoinClient.tsx:856-972](components/player/PlayerJoinClient.tsx#L856-L972):

```typescript
const lastFetchAtRef = useRef(0);

const fetchFullState = useCallback(async (
  _eid: string,
  opts: { priority?: "emergency" | "throttled" } = {}
) => {
  if (fetchInFlightRef.current) return;
  const priority = opts.priority ?? "throttled";
  if (priority === "throttled" && Date.now() - lastFetchAtRef.current < 5000) return;
  fetchInFlightRef.current = true;
  lastFetchAtRef.current = Date.now();
  // ...
});
```

Callers atuais — decidir por chamada:
- `visibilitychange → visible`: `{ priority: "emergency" }` (HIGH-4 mandate; recovery não pode bloquear).
- Polling lobby / turn-poll / dm-presence: `{ priority: "throttled" }`.
- `combat:combatant_add_reorder` fallback (Finding 2): `{ priority: "emergency" }`.
- Late-join CAT-1 ([PlayerJoinClient.tsx:1243](components/player/PlayerJoinClient.tsx#L1243)): `{ priority: "emergency" }`.
- Auto-join detection: `{ priority: "emergency" }`.

**C. Instrumentar os 401 AbortError separadamente**:

Em [PlayerJoinClient.tsx](components/player/PlayerJoinClient.tsx) onde `/api/broadcast` é chamado — se catch retorna `status 401`, `trackEvent("player:broadcast_auth_drop", { reason })`. Separa sinal de client unload vs session expiration.

**D. Fetch orchestrator único (bucket)**:

Hipótese: 4 loops concorrentes (lobby poll, turn-poll, late-join poll, dm-presence) + visibility fetchFullState = até 5 fetches/player/minuto por player × 8 players = 40 req/min baseline. Picos observados 200+ req/min sugerem bursting sincronizado. **Precisa de repro** com instrumentação incremental antes de refactor — **bucket 2-3 dias**.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `components/player/PlayerJoinClient.tsx:1816-1831` | MODIFICAR — 3 tiers de tracking |
| `components/player/PlayerJoinClient.tsx:856-972` | MODIFICAR — throttle com priority param |
| `components/player/PlayerJoinClient.tsx:1864-1875` | MODIFICAR — mesmo guard no network_recovery |
| `components/player/PlayerJoinClient.tsx:1243, e outros callers` | MODIFICAR — passar `{ priority: "emergency" }` |
| `lib/types/realtime.ts` | ADICIONAR type `player:resumed` |

### Test plan

- **Unit (Jest)**: mock `document.visibilityState` + `disconnectedAtRef` + `channelState`, forçar cada combinação, verificar trackEvent dispara com `method` correto.
- **E2E**: cenário ideal é difícil de automatizar (requer controle de visibilitychange). Aceitar **observacional**: próximo beta — target `player:reconnected` volume de `channel_recovery + long_background` ≤ 3 por player por hora.
- **Unit**: fetchFullState com 2 chamadas throttled em <5s → 2ª rejeitada; 1 throttled + 1 emergency → ambas rodam.

### Rollout plan

Direct deploy. Métricas mudarão — comunicar time que baseline de `player:reconnected` deverá cair de ~107/sessão para ~15–25/sessão. `player:resumed` será novo evento de alto volume (não poluir funil principal).

### Observability pós-fix

- `player:reconnected` / `player:resumed` volume: alerta se `player:reconnected` > 5/player/hora.
- `player:broadcast_auth_drop` volume: alerta se > 10/sessão.
- 429 rate no `/api/session/:uuid/state`: alerta se > 1% requests em rolling 5min.

### Breaking changes & PWA cache

- Funnel de reconexão existente (dashboards) vai caiar. Comunicar antes do deploy.
- `player:resumed` é novo evento — pipeline de analytics deve aceitar.
- Propriedades novas (`confidence`, `hidden_ms`) em `player:reconnected` — dashboards velhos ignoram graciosamente.

### Esforço estimado

**0.5 dia** (A+B+C). **D (orchestrator único) é 2-3 dias e vai para bucket**.

---

## Finding 5 — DM sem auto-scroll

### Sintoma

Lucas relatou que em toda troca de turno precisa rolar manualmente.

### Arquitetura atual (verificada)

[CombatSessionClient.tsx:1879-1890](components/session/CombatSessionClient.tsx#L1879-L1890):

```typescript
const isFirstRender = useRef(true);
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }
  requestAnimationFrame(() => {
    if (document.querySelector('[data-panel-open="true"]')) return;  // ← aborta scroll
    const el = document.querySelector(`[data-combatant-index="${currentTurnIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}, [currentTurnIndex]);
```

`data-panel-open` escrito por [CombatantRow.tsx:238](components/combat/CombatantRow.tsx#L238) — `true` quando QUALQUER row tem painel aberto.

### Root cause

Guard cancela scroll se qualquer row (não só a atual) tem painel aberto. Fluxo real DM tem quase sempre algum painel aberto.

### Solução proposta (supersede Hotfix H8 do UX spec)

**Cross-reference crítico**: UX spec v1 tem Hotfix H8 que preserva o guard `data-panel-open`. Finding 5 identifica esse guard como root cause. **Este spike supersede H8**: UX spec revision deve marcar H8 como deprecated.

**Opção escolhida**: guard mais preciso + fechamento proativo.

1. **Refinar guard** — só abortar scroll se o painel aberto for **na row do turno atual**:

```typescript
requestAnimationFrame(() => {
  const openPanel = document.querySelector('[data-panel-open="true"]') as HTMLElement | null;
  if (openPanel) {
    const openIdx = openPanel.getAttribute('data-combatant-index');
    if (openIdx !== null && parseInt(openIdx, 10) === currentTurnIndex) return;
  }
  const el = document.querySelector(`[data-combatant-index="${currentTurnIndex}"]`) as HTMLElement | null;
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
});
```

Isso requer `CombatantRow` expor `data-combatant-index` no mesmo elemento que tem `data-panel-open` (ou no pai). Verificar alinhamento em [CombatantRow.tsx:238](components/combat/CombatantRow.tsx#L238).

2. **CustomEvent `combat:turn-advanced`** — em `handleAdvanceTurn` no `useCombatActions`, disparar `window.dispatchEvent(new CustomEvent('combat:turn-advanced'))`. `CombatantRow` escuta o event e **fecha panels que não são da row do próximo turno**. Isso elimina o caso "DM editava HP do combatant X, turno avançou para X+1, painel de X continua aberto e bloqueia scroll de X+1".

Combinação 1 + 2 cobre:
- DM editando combatant atual: painel dele não fecha (UX preservada); scroll não dispara (row correta; opção 1 acima).
- DM editando combatant anterior: painel fecha (opção 2); scroll roda normal.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `components/session/CombatSessionClient.tsx:1879-1890` | MODIFICAR — guard relativo à row atual |
| `components/combat/CombatantRow.tsx` | ADICIONAR useEffect listening "combat:turn-advanced" → fechar panels de row ≠ atual |
| `lib/hooks/useCombatActions.ts` (`handleAdvanceTurn`) | ADICIONAR `window.dispatchEvent(...)` |

### Test plan

- **E2E** (`e2e/combat/dm-autoscroll.spec.ts`):
  1. DM com 5 combatants, turno no combatant 1.
  2. Abre painel do combatant 3 (simular HP edit).
  3. Avança turno → deve scrollar para combatant 2; painel do 3 fecha.
  4. Abre painel do combatant atual; avança → painel fecha (combat 3 agora) ou permanece na row atual? Decisão: fecha (CustomEvent dispara antes de setState do currentTurnIndex? Ajustar ordem).
- **Parity check (CLAUDE.md Combat Parity Rule)**: este fix é DM-only. Players não têm auto-scroll (verificado: `PlayerJoinClient.tsx` não tem análogo). **Não aplicar aos 3 modos**; é DM-side apenas.

### Rollout plan

Direct deploy.

### Observability pós-fix

- N/A — comportamento UX. Se feedback voltar no próximo beta, reabrir.

### Breaking changes & PWA cache

- Nenhum.

### Esforço estimado

**0.25 dia**.

---

## Finding 6 — Compêndio travado no SRD + whitelist

### Sintoma

Lucas relatou acesso ao compêndio travado só no SRD. Quer monstros completos durante combate.

### Estado atual (verificado)

- Endpoint auth-gated: [`app/api/srd/full/[...path]/route.ts`](app/api/srd/full/[...path]/route.ts) — checa `content_whitelist` OR `users.is_admin`.
- Toggle no layout: [app/app/layout.tsx:37-46,134](app/app/layout.tsx#L37-L46) popula `isBetaTester` e passa para `<SrdInitializer fullData={isBetaTester} />`.
- Migration populacional: [supabase/migrations/114_whitelist_all_existing_users.sql:6-16](supabase/migrations/114_whitelist_all_existing_users.sql#L6-L16). Roda uma vez, excluindo `daniel@awsales.io`. **Não há trigger para novos signups** (confirmado).

### Root cause

Lucas criou conta depois da 114 → não está na whitelist → vê só SRD.

### Solução proposta (revisada — sem trigger)

**Por que NÃO trigger** (CRITICAL-2):
- CLAUDE.md SRD Content Compliance é imutável. Whitelist é instrumento curado.
- `ON INSERT auth.users` incluiria bots/scraping/contas criadas em massa.
- Audit trail falso (granted_by = admin, mas admin não convidou).
- Pedido do Lucas é "me coloca na whitelist", não "abre pra todos".

**Solução**: migration 136 idempotente (re-rodável) com mesmo critério da 114. Quem foi criado entre 114 e 136 entra; quem já está fica intocado (`ON CONFLICT`).

**Migration 136** — `supabase/migrations/136_backfill_whitelist_post_114.sql`:

```sql
-- Migration 136: Re-whitelist users created after migration 114
-- Idempotent: pode ser re-rodada a qualquer momento. Mesmo critério da 114.
-- Excludes: daniel@awsales.io (admin)
-- Excludes: anonymous users (email IS NULL)

INSERT INTO content_whitelist (user_id, granted_by, notes)
SELECT
  au.id,
  (SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com'),
  'Beta tester — full SRD whitelist via migration 136 (backfill post-114)'
FROM auth.users au
WHERE au.email IS NOT NULL
  AND au.email != 'daniel@awsales.io'
ON CONFLICT (user_id) DO UPDATE
  SET revoked_at = NULL,
      notes = EXCLUDED.notes;
```

**Processo documentado para beta testers futuros** (adicionar em `docs/beta-whitelist-policy.md` — a criar):

1. Durante o beta fechado, o admin cria migration nova com critério explícito (ex.: lista de UUIDs, ou `WHERE created_at > ...`).
2. Migrations de whitelist são sempre idempotentes (`ON CONFLICT DO NOTHING` ou `DO UPDATE`).
3. Nunca criar trigger `ON INSERT auth.users`.
4. Quando o beta sair para público geral: rever política (remover whitelist check do endpoint? ou abrir tudo via flag global?). Bucket de decisão para PM.

**Indicador visual (opcional, bucket)**: badge "Full Compendium" no layout quando `isBetaTester = true` — nice-to-have; não bloqueia este spike.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/136_backfill_whitelist_post_114.sql` | CRIAR — INSERT idempotente |
| `docs/beta-whitelist-policy.md` | CRIAR — política documentada |

### Test plan

- **Migration test**: rodar 136 em staging snapshot, verificar count de `content_whitelist` aumenta de N para N + (users criados entre 114 e 136 com email).
- **Idempotência**: rodar 136 duas vezes; segunda execução deve ser no-op (0 novas rows).
- **Manual**: login do Lucas em staging → confirmar `isBetaTester = true` → compêndio full.

### Rollout plan

- Deploy migration em staging primeiro.
- Validar.
- Deploy produção.

### Observability pós-fix

- Contar `content_whitelist` rows antes/depois da migration.
- Nenhuma métrica contínua necessária — é one-shot.

### Breaking changes & PWA cache

- Nenhum. Layout lê whitelist no SSR a cada request.

### Esforço estimado

**0.25 dia** (SQL + doc policy). Risco mínimo.

---

## Finding 7 — Monster card: reorder resistências + HP crítico legível

### Quick win 1 — Reordenar resistências

**Estado atual**: [MonsterStatBlock.tsx:370-458](components/oracle/MonsterStatBlock.tsx#L370-L458)

Ordem atual:
1. AC → HP → Initiative → Speed
2. Divider + Ability table
3. Divider + Saving Throws → Skills → **Damage Vulnerabilities → Resistances → Immunities → Condition Immunities** → Senses → Languages → CR

**Padrão 5e Tools / D&D Beyond**:
1. AC → HP → Initiative → Speed
2. **Damage Vulnerabilities → Resistances → Immunities → Condition Immunities**
3. Senses → Languages
4. Divider + Abilities
5. Saving Throws → Skills → CR

**Mudança**: mover bloco de resistências de linhas 444-455 para DEPOIS da linha 405 (Speed), ANTES do divider da ability table (410).

### Quick win 2 — HP crítico legível

**Estado atual**: [CombatantRow.tsx:225, 459-468](components/combat/CombatantRow.tsx#L225-L468)

```typescript
const isCritical = combatant.max_hp > 0 && !combatant.is_defeated && combatant.current_hp / combatant.max_hp <= 0.1;
```

Row ganha `border-red-500 shadow animate-critical-glow`, mas o botão do HP continua `text-muted-foreground`.

**Mudança**: aplicar cor crítica ao número:

```tsx
className={`min-h-[44px] sm:min-h-[28px] inline-flex items-center ${
  isCritical ? "text-red-400 font-bold" : "text-muted-foreground"
} ${showActions ? "hover:text-gold cursor-pointer" : "cursor-default"}`}
```

Separador `/` + `max_hp` permanecem `text-muted-foreground` — foco visual no `current_hp`.

### Parity check

- Monster stat block aparece para: DM auth (CombatSessionClient), DM guest (GuestCombatClient), players (todos 3 modos via oracle). **Aplicar nos 3 modos**.
- HP crítico em CombatantRow: usado pelo DM (auth + guest) e players. **Aplicar nos 3 modos**.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `components/oracle/MonsterStatBlock.tsx:444-455` | MOVER bloco antes de 410 |
| `components/combat/CombatantRow.tsx:459-468` | APLICAR `text-red-400 font-bold` quando `isCritical` |

### Test plan

- **Visual regression** (Playwright screenshot) em stat block; before/after.
- **Manual**: inspecionar CombatantRow com HP 1/42 vs 41/42; ler à distância de ~50cm.

### Rollout plan

Direct deploy.

### Observability pós-fix

- N/A — UX.

### Breaking changes & PWA cache

- Nenhum.

### Esforço estimado

**0.25 dia** combinado.

---

## Finding 8 — Observabilidade: duração de combate não medida (bucket)

**Evidência**: encounter `484114e7` tem `started_at: null, duration_seconds: null`. Agregador descarta do `SUMMARY.md`.

**Hipótese**: `encounters.started_at` ora é populado ora não — provavelmente mudança de schema entre criação (04-11) e execução (04-16) do encounter do Lucas.

**Ação (bucket)**:
1. Auditar todos os paths onde `encounters.is_active = true` é setado — confirmar que todos escrevem `started_at = now()` se ainda null.
2. Adicionar DB trigger `BEFORE UPDATE ON encounters` que preenche `started_at` se transitioning `is_active false → true` e `started_at IS NULL`.
3. Backfill: `UPDATE encounters SET started_at = created_at WHERE started_at IS NULL AND is_active = false`. Aceitar `created_at` como proxy para encounters antigos.

### Esforço estimado

**0.5 dia** (investigação + patch + backfill). **Bucket P2**, não P0.

---

## Finding 9 — Parity bug do recap no Guest (novo, baseado no review HIGH-5)

### Sintoma

Guest fecha a tab depois de encerrar combate e antes de salvar → perde o recap permanentemente. Mesmo bug do Finding 1, em escopo reduzido.

### Arquitetura atual

`GuestCombatClient.tsx` usa apenas React state (`setShowRecap`, setas em linha ~1541). Sem localStorage. Confirmado via grep.

### Root cause

Single-user monolítico não tem multi-client sync, mas ainda assim perde o recap no refresh/close.

### Solução proposta (bucket P2)

- Ao completar `setShowRecap(true)` no `GuestCombatClient`, persistir `localStorage.setItem('guest-latest-recap', JSON.stringify({ report, ts }))`.
- No mount, se `guest-latest-recap` existir e `ts < 24h`, oferecer banner "Ver recap do último combate" não-intrusivo.
- Limpar no explicit close.

### Esforço estimado

**0.25 dia**. **Bucket P2**.

---

## Out of Scope (referência para rastreabilidade)

Feedbacks do Lucas que **não** estão neste spike — e onde vivem:

| Feedback | Bucket | Dono |
|----------|--------|------|
| Compêndio — X de fechar pequeno (touch target) | UX spec Sally — Epic 2 UX polish | UX spec |
| Richard (dice roller?) não clicável | Epic 2 — Interactivity | UX spec / product |
| Dodge button faltando | Epic 2 — Combat UX | UX spec |
| Condições customizadas escritas pelo DM | Epic 2 — Combat UX | UX spec |
| Edition badge 2014/2024 no compêndio | Epic 2 — Compendium UX | UX spec |
| Polymorph / transformação | Epic 4 — Character features roadmap | Product |
| Favoritar fichas como atalho | Epic 4 — Character features roadmap | Product |
| Rod of Pact Keeper / Bracers of Illusionist / Astral Shards faltantes | Catalog content ticket (verificar `data/srd/items.json`) | Content team |
| Votação retroativa (Lucas não votou) | Spec separado `docs/spec-feedback-retroactive-voting.md` (a criar) | Product |
| Tela inicial Full/Light/Moderate sem números | UX spec — Encounter picker | UX spec |
| Ficha monstro — X de sair do monstro difícil | UX spec Sally — touch target | UX spec |
| Remover/deletar grupo inteiro | Epic 2 — Group management | UX spec |
| Busca compêndio quebrada (Velociraptor não achado) | Bug separado — verificar search index | Engineer dedicado |

---

## Plano de Ataque v2 (ordem de execução)

```
SEMANA 1 — P0 + quick wins
├── Dia 1 (manhã) — Quick wins sem dependência:
│   ├── Finding 5 (DM auto-scroll) — 0.25d
│   ├── Finding 7 (monster card + HP crítico) — 0.25d
│   └── Finding 3 (group HP dados) — 0.25d
├── Dia 1 (tarde) — SRD:
│   └── Finding 6 (migration 136) — 0.25d
├── Dia 2 — Telemetria:
│   └── Finding 4 A+B+C (3 tiers + throttle) — 0.5d
├── Dia 3-4 — Recap persistence:
│   └── Finding 1 (schema + 2 endpoints + client) — 1.5d
└── Dia 5 — Buffer + QA

SEMANA 2 — P1 + rollout coordenado
├── Dia 1-2 — Combatant add atomic:
│   └── Finding 2 (novo broadcast tipo) — 1d
│     - Deploy player client primeiro (D1)
│     - Espera 24h cache update
│     - Deploy DM client com flag ativa (D2)
└── Dia 3-5 — Hardening + testes

BACKLOG (bucket)
├── Finding 9 (guest recap localStorage) — 0.25d
├── Finding 8 (encounter duration fix) — 0.5d
└── Finding 4D (fetch orchestrator único) — 2-3d
```

**Total P0 estimado**: ~3.5 dias dev. **Total P1 estimado**: +1 dia. **Bucket**: +3 dias.

### Ordem de deploy (resumo)

1. **Deploy A** (safe quick wins): Findings 3, 5, 7 + migration 136 (F6). Sem breaking changes.
2. **Deploy B** (telemetria): Finding 4. Métricas mudam.
3. **Deploy C** (recap): Finding 1. Migration 137 + 2 endpoints + client hidration. Aditivo.
4. **Deploy D1** (player handler): Finding 2 player client com novo handler + antigo. Espera 24h.
5. **Deploy D2** (DM broadcast): Finding 2 DM emite novo tipo. Flag on.
6. **Deploy cleanup** (D+7): remover handler antigo.

### Validação pré-próximo beta test

- e2e `recap-persistence.spec.ts`: close tab → reopen → vê recap.
- e2e `rapid-add.spec.ts`: DM adiciona 3 monstros em <10s → player vê ordem correta <3s.
- e2e `dm-autoscroll.spec.ts`: painel aberto + turno avançado → scrolla + fecha painéis antigos.
- Dashboard: `player:reconnected` volume target < 25 para sessão com 8 players (vs 107 baseline).
- Dashboard: `recap.served_from_db` + `recap.delivered_via_broadcast` > 95% de encounters encerrados.

---

## Riscos e premissas v2

### Riscos (revisados)

1. **Finding 1 — deploy assimétrico DM/player** — se DM deployar versão nova e player antigo, player ainda recebe só broadcast (caminho feliz). Aceitável porque aditivo. Se DM antigo + player novo, `/latest-recap` retorna null (nada persistido). Aceitável — player vê "combate encerrado" normal.
2. **Finding 1 — payload 100KB cap** — combates muito longos (8+ rounds, 12+ combatants) podem ultrapassar. Mitigação: endpoint retorna 413; monitorar. Se frequente, introduzir truncation no DM ao empacotar.
3. **Finding 1 — NULL bytes** — sanitização explícita no endpoint POST.
4. **Finding 1 — DM encerra combate com telefone em background** — broadcast pode falhar sem o DM saber (não há error toast hoje). Se fetch também falhar (timeout), recap perdido. Mitigação bucket: DM client salva `sessionStorage.lastUnsavedRecap` e tenta rehidratar no mount se endpoint ainda não tiver registro.
5. **Finding 2 — deploy ordem client-first obrigatório** — se DM deployar primeiro, players antigos ignoram novo tipo e ficam com lista obsoleta. Documentado em Rollout Plan.
6. **Finding 2 — `broadcastViaServer` opt-out** — ao desabilitar para `combatant_add_reorder`, perdemos a camada de sanitização server-side. Mitigação: combatant payload já é sanitized no cliente DM via `sanitizeCombatantForPlayer`. Auditar antes de deploy.
7. **Finding 4 — throttle emergency bypass** — auto-join + late-join + combatant_add fallback todos bypassam throttle. Se 3 dispararem simultaneamente, voltamos ao baseline de burst. Aceitável — são eventos raros e correlatos a cenários legítimos de recovery.
8. **Finding 4 — classificação tier 1 pode ocultar reconnects legítimos de curta duração** — se iOS suspende channel em 5s e user volta em 10s, classificamos como tier 1 (ruído). Mitigação: incluir `channelState` no guard (só tier 1 se `channelState === "joined"`).
9. **Finding 6 — migration 136 roda em produção com lock em auth.users** — Supabase pode ter latência. Rodar fora de horário de pico.
10. **PWA cache** — service worker update pode demorar 7 dias. Usuários pinned no cache antigo perdem features novas. Não há force-refresh atual; aceitar.

### Premissas (revisadas)

1. Timeline do Vercel log e do `01_events_raw.json` estão na mesma timezone (UTC) — confirmado via cruzamento de timestamps.
2. Encounter `1a2ceed2` é do DM Lucas (mesma `session.owner_id = 414dd199-...`) — confirmado.
3. Sessão `b33616aa` (Djinni) tinha players ANÔNIMOS (`campaign_id: null`, característico de `/join/<token>`). **Cookie anon TTL 24h** bate com filtro `ended_at > now() - 24h` do Finding 1. Trade-off aceito.
4. `content_whitelist` continua sendo source-of-truth para "beta access" — não há outro flag em `users` (grep confirmou).
5. Spec `docs/spec-resilient-reconnection.md` é normativo — nenhum finding desvia; apenas ajusta telemetria e cobre gaps de persistência.
6. CLAUDE.md "Combat Parity Rule" aplicação:
   - Finding 1 (recap persistence) — **Auth + Anon** (3 sessions reais); **Guest** no bucket Finding 9.
   - Finding 2 (combatant add) — **Auth + Anon**; Guest é monolítico localmente (sem broadcast).
   - Finding 3 (group HP dados) — **3 modos** (UI-ish).
   - Finding 4 (telemetria) — **Auth + Anon** (Guest não tem reconnection flow).
   - Finding 5 (auto-scroll DM) — **DM only** (guest+auth); não aplicar ao player.
   - Finding 6 (whitelist) — **Auth only** (data layer).
   - Finding 7 (monster card / HP crítico) — **3 modos**.
7. CLAUDE.md "SRD Content Compliance" respeitada: trigger rejeitado, whitelist continua curada.
8. CLAUDE.md "Resilient Reconnection" respeitada: throttle emergency bypass garante recovery não bloqueia.

### Evidências inconclusivas (needs repro)

- **Finding 2** — race concreta `state_sync` + `combatant_add` + `broadcastViaServer` não foi reproduzida localmente. Diagnóstico por leitura de código + timeline + premissas de ordering. **Requer e2e com network throttle + repeat 50x para confirmar o padrão**.
- **Finding 4D (orchestrator)** — hipótese de 4 loops concorrentes causando picos de 200+ req/min **não tem evidência direta** nos logs (sem request_id por loop). Precisa instrumentação incremental antes de refactor.
- **Finding 8** — onde/quando `encounters.started_at` é escrito hoje não foi auditado. Bucket.
- **Finding 1 — DM em background** — o quanto isso acontece na prática (DM multi-tarefa no celular) não é medido. Se for >5% dos encerramentos, sessionStorage fallback precisa subir de bucket.

---

## Anexo — referências cruzadas

| Sintoma DM | File refs chave (verificadas) |
|---|---|
| Recap perdido | CombatSessionClient:295-322 · PlayerJoinClient:1419-1424 · state/route.ts:52-60 (filtro active) · combat-reports/route.ts:1-55 |
| Turn order quebrado | useCombatActions:402-442, 423-440 · PlayerJoinClient:990-1017 (state_sync DESYNC-FIX-2), 1201-1247 (combatant_add) · broadcast.ts:401-412 (dual sender) |
| Vida do grupo somada | MonsterGroupHeader:47-51, 165-178 |
| Reconexões demais | PlayerJoinClient:1816-1831, 856-972 · spec-resilient-reconnection:210-307 |
| DM sem auto-scroll | CombatSessionClient:1879-1890 · CombatantRow:238 |
| Compêndio travado | srd-mode.ts · api/srd/full/[...path]/route.ts · app/app/layout.tsx:37-46,134 · migrations/114 |
| Resistências mal posicionadas | MonsterStatBlock:370-458 |
| HP crítico ilegível | CombatantRow:225, 231, 459-468 |

---

## Gate de handoff para dev

Este spike está pronto para implementação. Antes do primeiro commit, confirmar:

- [ ] Finding 1 — endpoints `/api/encounters/[id]/recap` (POST) e `/api/session/[id]/latest-recap` (GET) criados; query do POST NÃO usa service client; ownership check por `sessions.owner_id`.
- [ ] Finding 2 — ordem de deploy client-first respeitada; feature flag `COMBATANT_ADD_REORDER_ENABLED` no DM client.
- [ ] Finding 4 — `fetchFullState` aceita `{ priority }`; callers auditados para usar `emergency` em recovery paths.
- [ ] Finding 5 — UX spec H8 marcado como SUPERSEDED.
- [ ] Finding 6 — migration 136 é idempotente; documentação `beta-whitelist-policy.md` criada.
- [ ] Todos os findings aplicáveis respeitam Combat Parity Rule (tabela na seção Premissas).
- [ ] SRD Content Compliance não foi alterada (nenhum trigger, nenhuma mudança em whitelist além de backfill curado).
