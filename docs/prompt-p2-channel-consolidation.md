# Prompt — P2: Consolidar Canais Realtime pra Sair do `ChannelRateLimitReached`

**Missão:** Reduzir o número de canais Supabase Realtime que um único DM subscribe em 50-70%, eliminando o erro `ChannelRateLimitReached: Too many channels` que está causando `TIMED_OUT` no subscribe do DM em produção.

**Estimativa:** 4-6h (1 refactor grande + 2 menores + testes + validação prod via Supabase logs).

---

## 1. Contexto — por que isso

### 1.1. Evidência de produção (24h até 2026-04-22)

**Supabase Realtime logs (`mdcmjpcjkqgyxvhweoqs`):**
- 30 eventos `ChannelRateLimitReached: Too many channels` — tipo mais frequente do log
- Padrão temporal: bimodal (rajadas de 1-5 eventos agrupados a cada 3-5 minutos em horários de pico, seguidas de silêncio quando tenant idle)
- Confirma limite do Free tier: **200 canais concorrentes por projeto**

**Sentry (14 dias):**
- 58 events `Channel TIMED_OUT for session ...` em `/app/combat/[id]` — tendência **Escalating**
- 5 events adicionais em `/app/combat/new`
- 1 event `SyntaxError: Unexpected end of JSON input POST /api/broadcast` — colateral (cliente com canal morto caindo em fallback REST com body malformado)

### 1.2. Cadeia causal comprovada

```
Muitos canais abertos no mount do DM
  → projeto bate 200 canais simultâneos no tenant Supabase
  → novo phx_join é rejeitado com "ChannelRateLimitReached"
  → servidor NÃO envia resposta formatada, só fecha
  → cliente fica esperando 10-30s (SUBSCRIBE_TIMEOUT_MS)
  → callback dispara com status="TIMED_OUT"
  → DM fica "conectado" mas não recebe NENHUM broadcast
  → JoinRequestBanner nunca renderiza → player-view trava em "Aguardando aprovação"
```

### 1.3. Hardening já aplicado (commit `8c9e6825`)

O retry com backoff que está em `lib/realtime/broadcast.ts:createAndSubscribe` **mitiga** mas não resolve. Quando o tenant destensiona (outro user desconecta e libera slot), o retry pega na próxima tentativa. Enquanto o tenant está saturado, **nenhum retry funciona**. A consolidação vai **reduzir a saturação na raiz**.

---

## 2. Leitura obrigatória antes de começar (na ordem)

1. **Esse documento inteiro** — dependências entre as etapas
2. `docs/prompt-p1-dm-realtime-subscribe-fail.md` — contexto do P1 que levou a descobrir esse P2
3. `supabase-realtime-logs-mdcmjpcjkqgyxvhweoqs.csv.csv` — **confirmar que "ChannelRateLimitReached" ainda domina** (se não, reavaliar urgência)
4. `lib/realtime/broadcast.ts` — padrão atual de singleton + retry que é a base do que vamos replicar

---

## 3. Pré-requisitos

```bash
rtk git log --oneline -3
# Deve mostrar:
#   3ab5ea87 test(combat-session): add scheduleDmChannelCleanup to broadcast mock
#   8c9e6825 fix(realtime): DM channel hardening — debounced cleanup + auto-reconnect + removeChannel
#   (ou posterior, desde que 8c9e6825 esteja no histórico)
```

Se `8c9e6825` não existe, parar — o hardening anterior é pré-requisito arquitetural.

---

## 4. Arquitetura atual — mapa de canais por DM

Grepado em `components/ hooks/ lib/ app/` (excluindo tests e node_modules) — **19 pontos distintos** criando canais Supabase.

### 4.1. Canais por contexto de tela

| Tela / Feature | Canais criados | Arquivo |
|---|---|---|
| **Layout `/app/*` (sempre, autenticado)** | | |
| combat-invite membership watcher | `combat-invite-mount:${userId}` | `components/notifications/CombatInviteListenerMount.tsx:64` |
| per-campanha combat invite | **`campaign:${id}:invites` × N** | `hooks/useCombatInviteListener.tsx:67` |
| notifications bell | `notifications:${userId}:random` | `lib/hooks/useNotifications.ts:45` |
| user role watcher | `user:${userId}` | `components/realtime/UserRoleListenerMount.tsx:40` |
| **Dashboard específico** | (nada próprio hoje) | |
| **`/app/campaigns/[id]` (CampaignHero, DM)** | | |
| membership joins | `campaign-members-${id}` | `lib/realtime/campaign-membership-listener.ts:26` |
| bag of holding | `bag-of-holding:${id}` | `lib/hooks/useBagOfHolding.ts:51` |
| quest board | `quest-board-${id}` | `lib/hooks/usePlayerQuestBoard.ts:45` |
| mindmap collab | `mindmap:${id}:random` | `components/campaign/CampaignMindMap.tsx:1282` |
| active combat banner | **`campaign:${id}:invites` (duplicado!)** | `components/campaign/ActiveCombatBanner.tsx:109` |
| **`/app/campaigns/[id]` (PlayerCampaignView)** | | |
| companion HP | `campaign-companions:${id}` | `components/campaign/PlayerCampaignView.tsx:196` |
| **`/app/combat/[id]`** | | |
| DM broadcast | `session:${id}` | `lib/realtime/broadcast.ts:152` |
| presence | `presence:${id}` | `components/combat-session/PlayersOnlinePanel.tsx:45` |
| DM status | `dm-status:${id}` | `lib/realtime/use-dm-channel-status.ts:30` |
| **Player (/join/[token])** | | |
| player broadcast | `session:${id}` | `components/player/PlayerJoinClient.tsx:1291` |
| player presence | `presence:${id}` | `components/player/PlayerJoinClient.tsx:2590` |
| **Per-character (quando visível)** | | |
| active effects | `active-effects:${characterId}:random` | `lib/hooks/useActiveEffects.ts:45` |
| character status | `player-character:${characterId}` | `lib/hooks/useCharacterStatus.ts:87` |

### 4.2. Conta pra um DM típico com 5 campanhas

| Cenário | Canais | Detalhe |
|---|---|---|
| DM só no dashboard | **9** | 4 fixos (combat-invite-mount + notifications + user + 1 extra) + **5** `campaign:${id}:invites` |
| + abre uma campanha | **+4** | +`campaign-members-${id}` + `bag-of-holding` + `quest-board` + `active-combat-banner` |
| + entra em combate | **+3** | +`session` + `presence` + `dm-status` |
| **Total em combate** | **16** | |

Multiplicador **por DM** do cenário atual: N campanhas. Cada campanha extra adiciona 1 canal permanente a todo DM, independente de ele estar usando a campanha ou não.

### 4.3. Escopo-alvo do refactor

| Canal | Economia se consolidar | Prioridade |
|---|---|---|
| `campaign:${id}:invites` × N | **N → 1** | 🔴 P0 — maior ROI |
| `campaign-members-${id}` | 1 → 0 ou consolidar em user-memberships | 🟡 P1 |
| `campaign-companions:${id}` | 1 → consolidar em `campaign:${id}` | 🟢 P2 |

**Fora do escopo desse refactor** (tocar depois se não resolver):
- Canais per-character (`active-effects`, `player-character`) — já são lazy (só quando char visível)
- Canais `mindmap`, `bag-of-holding`, `quest-board` — volume baixo, cada um é 1 canal singular
- `notifications`, `user`, `combat-invite-mount` — já são per-user singletons

---

## 5. Plano por etapa

### 🔴 Etapa 1 — Consolidar `campaign:${id}:invites × N` → `user-invites:${userId}` (2-3h)

**Economia esperada:** N→1 canais por DM. Se um DM tem 5 campanhas, sai de 5 canais pra 1. Com 10 DMs online no pico, economia **cumulativa de ~40 canais no tenant**. Sozinho provavelmente destensiona o rate limit.

#### 5.1.1 Contract atual

**Producer** — `app/api/combat/invite/dispatch/route.ts:218-276`
```ts
const payload: RealtimeCombatInvite = {
  type: "campaign:combat_invite",
  campaign_id: campaignId,
  campaign_name: campaignName,
  session_id: sessionId,
  encounter_id: encounterId,
  join_token: joinToken,
  join_url: joinUrl,
  dm_user_id: user.id,
  dm_display_name: dmDisplayName,
  encounter_name: encounterName,
  started_at: startedAt,
};
const channel = supabaseAdmin.channel(`campaign:${campaignId}:invites`);
channel.subscribe(status => {
  if (status === "SUBSCRIBED") {
    channel.send({ type: "broadcast", event: "campaign:combat_invite", payload });
  }
});
```

Server faz **1 broadcast** no canal da campanha. Todos os N members (exceto DM) recebem no cliente deles se estiverem subscribed naquele campaign channel.

**Consumer** — `hooks/useCombatInviteListener.tsx:65-147`
```ts
for (const campaignId of campaignIds) {
  const channel = supabase.channel(`campaign:${campaignId}:invites`);
  channel.on("broadcast", { event: "campaign:combat_invite" }, (msg) => { ... });
  channel.subscribe();
  channels.push(channel);
}
```

Cliente cria **1 canal POR campanha** em que o user é active member.

#### 5.1.2 Nova arquitetura

**Producer** (novo) — broadcast **N vezes em canais por user**, uma vez por player_user_id:
```ts
// Dentro do for dos members.filter(m => m.user_id !== user.id):
for (const playerUserId of playerUserIds) {
  const ch = supabaseAdmin.channel(`user-invites:${playerUserId}`);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("subscribe timeout")), 5000);
    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "user:combat_invite", payload }).then(() => {
          clearTimeout(timeout); resolve();
        }).catch(reject);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout); reject(new Error(`${status}`));
      }
    });
  });
  supabaseAdmin.removeChannel(ch);
}
```

**⚠️ IMPORTANTE — Use o endpoint REST, não `channel.subscribe() + send()`:**

O código atual do dispatch route faz `supabaseAdmin.channel(x).subscribe().send()`, que **cria um canal server-side toda vez**. Se fizermos loop por N players, são **N canais server-side efêmeros** — que também contam pro limite do tenant. Em campanhas grandes isso pode reintroduzir o problema.

Solução correta: **Supabase Realtime HTTP Broadcast API** — envia N mensagens em 1 request, sem abrir canal nenhum:

```ts
// Em app/api/combat/invite/dispatch/route.ts, substituir a subscribe-then-send dance por:
const messages = playerUserIds.map(uid => ({
  topic: `user-invites:${uid}`,
  event: "user:combat_invite",
  payload,
  private: false,
}));

const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
  {
    method: "POST",
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  }
);
if (!res.ok) {
  captureError(new Error(`Realtime broadcast failed: ${res.status}`), { ... });
}
```

Docs: https://supabase.com/docs/guides/realtime/broadcast#rest-api

**Essa API:**
- Não cria canais server-side (zero impacto no teto de canais concorrentes)
- Aceita até 100 messages por request
- É idempotente / sem necessidade de `await subscribe → send`
- Latência similar ao channel.send (single HTTP round-trip)

**Trade-off**: exige o SERVICE_ROLE_KEY (já temos no env). Não há downside conhecido.

**Consumer** (novo) — **1 canal único** `user-invites:${userId}`:
```ts
// Arquivo NOVO: hooks/useUserInviteListener.ts (substitui useCombatInviteListener)
export function useUserInviteListener({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`user-invites:${userId}`);
    channel.on("broadcast", { event: "user:combat_invite" }, (msg) => {
      const payload = msg.payload as RealtimeCombatInvite;
      // ... mesma lógica de dedup, toast, navegação (copiar de useCombatInviteListener.tsx:73-143)
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
```

#### 5.1.3 Checklist da etapa

- [ ] Criar `hooks/useUserInviteListener.ts` com mesma lógica de `useCombatInviteListener.tsx:73-143` (dedup por `session_id`, filtros de auto-invite, toast, navegação) — **não deletar ainda** o listener antigo.
- [ ] Atualizar `app/api/combat/invite/dispatch/route.ts` pra broadcast em **`user-invites:${playerUserId}`** com event `user:combat_invite` usando a **Realtime HTTP Broadcast API** (ver §5.1.2 acima — NÃO usar `channel.subscribe().send()`). Manter broadcast no canal antigo `campaign:${id}:invites` durante rollout pra não quebrar clientes não atualizados.
- [ ] Atualizar `components/campaign/ActiveCombatBanner.tsx:109` — também lê de `campaign:${id}:invites`. Dois caminhos:
  - **Opção A**: deletar a subscrição desse banner (só dashboard precisa desse evento, banner já tem o active_session via polling)
  - **Opção B**: migrar banner pro mesmo `user-invites:${userId}` single-channel
  - **Recomendado**: A (simplifica; verificar se banner realmente precisa de realtime)
- [ ] Atualizar mount point: `components/notifications/CombatInviteListenerMount.tsx` hoje carrega `campaignIds` e chama `useCombatInviteListener({userId, campaignIds})`. Com user-scoped channel, mount vira simples — só precisa do `userId`. **Renomear** o arquivo pra `UserInviteListenerMount.tsx` ou manter nome mas mudar conteúdo.
- [ ] Deletar `campaignIds` query no `CombatInviteListenerMount` — não precisa mais saber das campanhas do user no cliente (servidor resolve lista de players via `campaign_members`).
- [ ] Smoke test manual: DM em conta A dispara combat invite; player em conta B (member da mesma campanha) recebe toast.
- [ ] Após validação em staging: **remover broadcast antigo em `campaign:${id}:invites`** do dispatch route (etapa de cleanup — commit separado, ~1 semana depois).
- [ ] Deletar `useCombatInviteListener.tsx` + `subscribeToDashboardMembers` (já está morta, ver §5.2).

#### 5.1.4 Teste de aceitação

```bash
# Com 2 browser contexts:
# DM context: login + start combat na campanha X (2+ players)
# Player context: dashboard aberto (sem abrir a campanha X)
# → Toast "combat invite" renderiza no player dashboard em <3s
```

---

### 🟡 Etapa 2 — Auditoria de `campaign-members-${id}` (30min — pode fechar como "no-op")

**Descoberta durante investigação**: esse canal **já é criado 1x apenas** (em `CampaignHero` quando DM abre `/app/campaigns/[id]`). Não é N×N. Mas:

- `lib/realtime/campaign-membership-listener.ts:73-82` exporta `subscribeToDashboardMembers(campaignIds)` que **não é chamado em lugar nenhum do código ativo** (grep retorna só a definição + comentários em notes). Código morto.

#### 5.2.1 Checklist

- [ ] Confirmar via grep que `subscribeToDashboardMembers` não é chamado: `grep -rn "subscribeToDashboardMembers" components/ hooks/ app/ lib/` → esperado: só `campaign-membership-listener.ts:73` (definição).
- [ ] Deletar `subscribeToDashboardMembers` de `lib/realtime/campaign-membership-listener.ts`.
- [ ] Atualizar comentário de `subscribeToCampaignMembers` removendo referência à função deletada.
- [ ] **Não tem refactor de canal aqui** — o canal `campaign-members-${id}` fica como está (já é single-channel scoped ao viewport ativo).

**Justificativa pra não consolidar**: o evento é `postgres_changes` (não broadcast), então consolidar em `user-memberships:${userId}` exigiria mover a filtragem pro cliente + abrir channel global (que vê toda table) — isso **piora** a postura de segurança e de carga (cliente recebe INSERTs de campanhas alheias mesmo com RLS). Fica como está.

---

### 🟢 Etapa 3 — Consolidar `campaign-companions:${id}` → `campaign:${id}` (1h)

Escopo menor. `campaign-companions:${id}` é 1 canal postgres_changes no PlayerCampaignView que escuta updates em `player_characters`. Pode ser consolidado num canal único `campaign:${id}` que cobre **todos** os postgres_changes da campanha (companions, futuros).

#### 5.3.1 Checklist

- [ ] Em `components/campaign/PlayerCampaignView.tsx:196`, renomear tópico pra `campaign:${campaignId}` (removendo o sufixo `-companions`).
- [ ] Adicionar comentário explicando: "Shared channel for all postgres_changes subscriptions on this campaign. Future listeners (quest updates, note changes, etc) should attach `.on()` handlers to the same channel instead of creating their own."
- [ ] Validar que nenhum outro canal existe com o tópico `campaign:${campaignId}` (conflitaria — grep).
- [ ] **Se** no futuro outro hook precisar postgres_changes em `/app/campaigns/[id]`, esse hook deve receber o canal como parâmetro OU usar o mesmo tópico (novo handler via `.on()`).

**Economia**: pequena isoladamente (1 canal por player viewing campaign), mas estabelece o padrão "1 canal por campanha, não 1 por feature" que vai evitar proliferação futura.

---

## 6. Validação pós-deploy

### 6.1 Smoke tests E2E (antes do merge)

```bash
# Spec canônico que exercita invites:
npx playwright test e2e/combat/invite-flow.spec.ts --project=desktop-chrome
# (Se não existe, criar: DM inicia combate → player em outra tab recebe toast)

# Specs afetados por mudança em CombatInviteListenerMount:
npx playwright test e2e/journeys/j5-share-link.spec.ts --project=desktop-chrome
```

### 6.2 Monitoramento em produção (24-48h após deploy)

**Critério de sucesso duro:**
- Supabase Realtime logs: **`ChannelRateLimitReached` cai pra < 5 eventos/24h** (hoje: 30).
- Sentry: `Channel TIMED_OUT` estabiliza ou cai (hoje: tendência "Escalating").

**Como medir:**
1. Baixar CSV de logs do Supabase (Project Settings → Logs → Realtime → last 24h) antes e depois.
2. Rodar: `grep -c "ChannelRateLimitReached" <csv>` — deve cair drasticamente.
3. Acompanhar Sentry issue `Channel TIMED_OUT for session` — trend deve virar "Resolved" ou "Regressed" (falsificável).

### 6.3 Se não resolver

**Próximos passos caso os rate limits persistam:**
1. Upgrade Supabase Free → Pro ($25/mo, 500 canais concorrentes vs 200). Resolve de uma vez.
2. Aprofundar consolidação nos canais per-character (`active-effects`, `player-character`) — deixados fora do escopo.
3. Investigar se `combat-invite-mount:${userId}` (que faz `postgres_changes` de `campaign_members`) pode ser fundido com o `user:${userId}` channel em vez de ser separado.

---

## 7. Riscos e como mitigar

| Risco | Mitigação |
|---|---|
| Broadcast per-user no server fica lento se campaign tem 10+ players | Criar canais em paralelo (`Promise.all`), não sequencial. Já roda em Next.js serverless que tem concurrent execution. |
| Player já logado em tab antiga (sem o novo código) não recebe invite | Manter broadcast dual (antigo + novo) por 7 dias. Deletar antigo em commit separado após tempo de graça. |
| Dedup por `session_id` entra em conflito se 2 DMs criarem sessões com mesmo session_id | Impossível — `sessions.id` é UUID gerado no Postgres. |
| Mudança no dispatch route precisa re-validar RLS de players podendo RECEBER broadcast | Canal `user-invites:${userId}` é broadcast simples, não filtered por RLS. Auth via presence check no client side (já existe via `userId` check em `useCombatInviteListener:82`). |
| Um DM que for também player de outra campanha recebe invite por canal `user-invites:${his_own_userId}` | Já coberto: `payload.dm_user_id === userId` bloqueia auto-invite. |

---

## 8. Arquivos tocados (esperado)

| Arquivo | Mudança |
|---|---|
| `app/api/combat/invite/dispatch/route.ts` | Adicionar broadcast dual (novo `user-invites:*` + antigo `campaign:*:invites` durante grace period) |
| `hooks/useUserInviteListener.ts` | **NOVO** — substitui `useCombatInviteListener` |
| `components/notifications/CombatInviteListenerMount.tsx` | Simplificar — só precisa de `userId`, não mais da query de `campaignIds` |
| `components/campaign/ActiveCombatBanner.tsx` | Deletar subscrição a `campaign:${id}:invites` (ou migrar pro new channel) |
| `lib/realtime/campaign-membership-listener.ts` | Deletar `subscribeToDashboardMembers` (dead code) |
| `components/campaign/PlayerCampaignView.tsx` | Renomear tópico pra `campaign:${id}` genérico |
| `hooks/useCombatInviteListener.tsx` | **DELETAR** após rollout validar (commit separado) |
| `lib/types/realtime.ts` | Adicionar event type `"user:combat_invite"` no union se necessário (mesma payload shape) |

---

## 9. Commit strategy

3 commits pequenos, cada um independente e reversível:

```
commit 1:
  feat(realtime): consolidate per-campaign invite channels into user-scoped channel
  - New user-invites:${userId} channel
  - Server broadcasts to both old + new during grace period
  - New useUserInviteListener hook
  - Old useCombatInviteListener kept for backward compat

commit 2:
  chore(realtime): remove dead subscribeToDashboardMembers + rename campaign-companions topic
  - Deletes unused subscribeToDashboardMembers
  - Renames campaign-companions:${id} to campaign:${id} (shared topic)

commit 3: (deploy+monitor 7 days later)
  chore(realtime): remove legacy campaign:${id}:invites broadcast path
  - After logs confirm new channel is working
  - Deletes old per-campaign broadcast + useCombatInviteListener hook
```

---

## 10. Kickoff message pra próxima sessão

```
Li docs/prompt-p2-channel-consolidation.md inteiro.
Confirmei commit 8c9e6825 existe (hardening prerequisite).

Plano: começar pela Etapa 1 (campaign:${id}:invites → user-invites:${userId}).
Vou criar hooks/useUserInviteListener.ts novo, modificar
app/api/combat/invite/dispatch/route.ts pra broadcast dual, e atualizar
o mount point CombatInviteListenerMount.tsx pra não depender mais de
campaignIds.

Manter o canal antigo vivo por 7 dias pra grace period de clientes
não-atualizados. Etapa 2 + 3 só depois de validar Etapa 1 em staging.

Começando pela leitura do useCombatInviteListener.tsx atual + route handler
pra confirmar contract shape antes de duplicar.
```
