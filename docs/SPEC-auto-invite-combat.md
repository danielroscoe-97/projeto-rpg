# SPEC — Auto-Invite pro Combate (F19)

> **Status:** Pronto para implementação
> **Origem:** Beta test session 3 (2026-04-16) — F19 / ROADMAP Onda 5
> **Escopo:** Auth-only (jogadores logados e membros ativos da campanha)
> **Parity:** Guest/Anônimo fora de escopo (Combat Parity Rule)

---

## 1. Problema

Hoje, quando o DM inicia um combate vinculado a uma campanha:

1. DM abre o botão "Compartilhar" → gera/lê token em `session_tokens` (via `lib/supabase/session-token.ts:createSessionToken`).
2. DM copia o link `{origin}/join/{token}` e o envia manualmente (WhatsApp, Discord, etc.).
3. Jogador loga na área do app, não sabe que existe combate ativo até abrir o link fora do app.
4. Jogadores já logados em `/app/dashboard` ou em `/app/campaigns/[id]` **não recebem nenhum sinal** de que o DM começou.

Evidências:
- `components/session/CombatSessionClient.tsx:678-684` (Ponto A) e `:741-747` (Ponto B): o DM só publica `session:state_sync` no canal `session:{sessionId}` — canal que o jogador logado **ainda não está assinando** (porque ele não está em `/join/{token}`).
- `app/api/broadcast/route.ts:44-55` valida posse (`sessions.owner_id`) e publica em `session:{sessionId}` via service role — **sem** canal por campanha hoje.
- `lib/realtime/campaign-membership-listener.ts` já prova que o padrão postgres_changes por campanha é viável (`campaign-members-${campaignId}`), mas cobre apenas joins de membros, não invites de combate.

Resultado: fricção fixa por sessão, queda do *Player join rate* (métrica primária §2.1 do ROADMAP).

---

## 2. Visão (desejado)

DM clica em "Iniciar combate" → em < 2s, todo jogador da campanha logado em qualquer parte de `/app/*` recebe um **toast "Seu mestre iniciou o combate — Entrar"**. 1 clique → navega para o combate com o player já registrado via `player_character_id`/`user_id` (sem form de nome).

Fallback: jogador offline/sem realtime abre o app e vê o convite pendente no `NotificationBell` + banner na campanha (Resilient Reconnection Rule).

---

## 3. Arquitetura proposta

### 3.1 Canal Realtime

**Nome:** `campaign:{campaignId}:invites`

- Não é o canal de combate (`session:{sessionId}`) — esse permanece intocado para não quebrar parity com fluxo guest/`/join`.
- Canal NOVO, dedicado a eventos de lifecycle da campanha visíveis para membros logados. Reutilizável no futuro (ex.: "DM encerrou combate", "DM agendou sessão").
- Publicado pelo server via `/api/broadcast/combat-invite` (nova rota; ver §3.5) usando `SUPABASE_SERVICE_ROLE_KEY` — mesmo pattern de `app/api/broadcast/route.ts:145-172`.
- Subscrição do lado do jogador: hook novo `useCombatInviteListener` monta o canal dentro de `app/app/layout.tsx` (sempre ativo em qualquer rota `/app/*`).

**Por que não reusar `campaign-members-${campaignId}`?** Esse canal usa `postgres_changes` em `campaign_members` — escopo diferente (joins), não broadcast de eventos. Manter os dois separados evita acoplamento.

**Validação contra o padrão atual:**
- `lib/realtime/broadcast.ts:60` usa `supabase.channel(\`session:${sessionId}\`)` — mesmo namespace `{escopo}:{id}` reaplicado aqui como `campaign:{campaignId}:invites`.
- `lib/realtime/campaign-membership-listener.ts:26` usa `campaign-members-${campaignId}` (kebab com hífen). O prefixo com `:` é o padrão vencedor (3 canais o usam), adotar `campaign:{id}:invites`.

### 3.2 Payload do broadcast

```typescript
// lib/types/realtime.ts — adicionar a RealtimeEventType
interface CombatInviteEvent {
  type: "campaign:combat_invite";
  campaign_id: string;
  campaign_name: string;         // denormalizado p/ exibir sem round-trip
  session_id: string;            // sessions.id recém-criada
  encounter_id: string;          // encounters.id (para prefetch combatants)
  join_token: string;            // session_tokens.token ativo
  join_url: string;              // string absoluta: `${origin}/join/{token}`
  dm_user_id: string;            // para não notificar o próprio DM
  dm_display_name: string | null;
  encounter_name: string | null; // do preset, se houver
  started_at: string;            // ISO timestamp
  _seq?: number;                 // idêntico ao broadcast.ts:428-429
}
```

Por que `join_url` e `join_token` juntos? `join_url` cobre o link genérico (anônimo). `join_token` permite ao hook navegar para uma rota interna `/app/join/{token}` (auth-aware) que pula o form anônimo — ver §3.6.

### 3.3 Persistência paralela (fallback durável)

Para cumprir a Resilient Reconnection Rule (broadcast falha → player offline → player abre app mais tarde), o evento é **também** persistido:

1. **Insert em `player_notifications`** (tabela existente, ver `lib/types/database.ts:820-844`) — uma linha por membro ativo da campanha (exceto o DM):
   - `type: "combat_invite"`
   - `title`: i18n key `player_hq.notifications.type_combat_invite` (ex.: "Combate iniciado!")
   - `message`: `"${dm_display_name} iniciou ${encounter_name ?? 'o combate'} em ${campaign_name}"`
   - `meta: { session_id, encounter_id, join_token, join_url, campaign_id }`
   - `read_at: null`

2. `useNotifications` (já em `lib/hooks/useNotifications.ts`) já escuta INSERT em `player_notifications` via postgres_changes → o `NotificationBell` (montado em `app/app/layout.tsx:132`) ganha contador automático **sem mudança**.

**Ganhos:** (a) fallback automático (player offline recupera ao voltar); (b) integração sem refactor no NotificationFeed; (c) métrica `Player join rate` do ROADMAP mede via `meta.session_id` vs. registros em `session_tokens.player_name`.

### 3.4 Identificar membros logados

Supabase Realtime não expõe "usuários logados no domínio", apenas presence dentro de um canal. Solução de duas camadas:

- **Broadcast amplo:** publicamos em `campaign:{campaignId}:invites` — todos os subscribers (membros online no app) recebem o toast imediatamente.
- **Filtro de entrega:** lista de `user_ids` elegíveis = `campaign_members` onde `campaign_id = X AND role = 'player' AND status = 'active'` (mesma query que `app/app/session/new/page.tsx:145-150`). O server insere `player_notifications` para cada um.

O canal não precisa validar membership (apenas broadcast efêmero); o INSERT em `player_notifications` respeita RLS existente (`user_id = auth.uid()` via policy existente — verificar migration 068).

### 3.5 Fluxo E2E

1. DM clica "Iniciar combate" em `CombatSessionClient.handleStartCombat` (`components/session/CombatSessionClient.tsx:623`).
2. Caminho A (sessão existente, `store.encounter_id` já setado): após `persistInitiativeAndStartCombat` e `broadcastEvent("session:state_sync")`, **se `campaignId != null`**, chamar `dispatchCombatInvite({ sessionId, encounterId, campaignId })` — nova função em `lib/supabase/combat-invite.ts`.
3. Caminho B (nova sessão): após `createEncounterWithCombatants` + `store.setEncounterId`, chamar mesma função.
4. `dispatchCombatInvite` faz POST a `/api/combat/invite/dispatch` com `{ sessionId, encounterId }` e access token.
5. **Nova rota `/api/combat/invite/dispatch`** (`app/api/combat/invite/dispatch/route.ts`):
   a. Valida `sessions.owner_id === user.id` (mesmo pattern de `app/api/broadcast/route.ts:43-55`).
   b. `campaignId = sessions.campaign_id` — **aborta com 204** se `null` (Quick Combat não notifica).
   c. Gera/lê token via `createSessionToken(sessionId)` (já existe).
   d. Busca `campaign_members` ativos + display name do DM + nome da campanha + nome do encounter.
   e. Rate-limit: `checkRateLimit(\`combat-invite:${sessionId}\`, 3, "5 m")` — impede spam de reinicializações (§8 Riscos).
   f. Service role: `channel("campaign:{campaignId}:invites").send({ type: "broadcast", event: "campaign:combat_invite", payload })`.
   g. Bulk insert em `player_notifications` (todos os players exceto DM).
6. Jogador (em qualquer `/app/*`) tem o hook ativo → recebe broadcast → mostra toast com ação "Entrar".
7. Clique no toast → `router.push("/app/join/${join_token}")` (rota auth-aware nova) **ou** fallback direto para `/join/${join_token}` se a rota interna não existir ainda (MVP).

### 3.6 Componente hook

```typescript
// hooks/useCombatInviteListener.ts
export function useCombatInviteListener({
  userId,            // auth.uid() — usado para filtrar auto-convite do DM
  campaignIds,       // string[] — campanhas onde user é member ativo
}: { userId: string | null; campaignIds: string[] }): void
```

Montado em `DashboardLayout`/`AppLayout` (decidir em §4):

- Cria um canal por campaignId (reuso do pattern de `subscribeToDashboardMembers` em `lib/realtime/campaign-membership-listener.ts:73-82`).
- Dedup por `session_id` (Map em ref): se mesmo `session_id` chega 2x (múltiplas abas, server + client path), mostra só 1 toast.
- Ignora se `payload.dm_user_id === userId` (DM que iniciou).
- Dispara `toast.custom(...)` via `sonner` (já em uso em `lib/hooks/useNotifications.ts:30`).

### 3.7 Contrato do toast (componente)

```typescript
// components/notifications/CombatInviteToast.tsx
interface CombatInviteToastProps {
  campaignName: string;
  dmDisplayName: string | null;
  encounterName: string | null;
  onJoin: () => void;      // router.push(`/app/join/${token}`)
  onDismiss: () => void;   // persist apenas — notificação permanece em player_notifications
}
```

Usa `sonner` com `duration: Infinity` e botão primário dourado (tokens já existentes `bg-gold`). Dismissible manualmente.

---

## 4. UX — onde o player vê o convite

### 4.1 Player em `/app/dashboard`

- Toast sonner top-right, persistente (sem auto-dismiss).
- Título: "**{DM}** iniciou o combate" / Subtítulo: "*{encounterName ?? 'Combate'}* — {campaignName}".
- Botão primário: "Entrar no combate" → navega.
- Badge no `NotificationBell` já incrementa via `useNotifications` (sem código extra).

### 4.2 Player em `/app/campaigns/[id]` (mesma campanha do convite)

- Toast normal **+** banner permanente no topo do `CampaignFocusView` enquanto `is_active = true` no backend.
- Banner: cor `bg-red-500/20`, texto "Combate em andamento" + CTA "Entrar agora".
- Query de apoio: `SELECT id FROM sessions WHERE campaign_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1` (mount-time; puramente fallback quando broadcast falha).

### 4.3 Player em outra campanha / outra rota `/app/*`

- Toast low-key (prefixado com "**{campaignName}:**"), 15s auto-dismiss.
- Notificação persiste no Bell (resilient fallback).

### 4.4 Player fecha o toast sem entrar

- Toast some; `player_notifications` row fica (não criada pelo dismiss, criada no momento do dispatch).
- Player pode clicar no Bell depois e ver a notificação com link para o combate.

### 4.5 Player offline quando DM inicia

- Sem realtime → nenhum toast.
- Próximo open do app → `useNotifications` fetcha 50 últimas → badge aparece → click no Bell mostra convite, com ação "Entrar".
- Clique → navega para join.

---

## 5. Resiliência

### 5.1 Broadcast falha (rede/Supabase)

- Server `/api/combat/invite/dispatch` tenta o `channel.send` com timeout 5s (mesmo pattern de `app/api/broadcast/route.ts:151-172`).
- **Mas** o insert em `player_notifications` acontece **antes** do broadcast no server (try/catch separado). Se broadcast falhar, notificação persistida dá o fallback completo.
- Client: o hook `useCombatInviteListener` também verifica `player_notifications` ao montar (já feito por `useNotifications`). Zero-drop garantido por defense-in-depth.

### 5.2 Múltiplas abas do mesmo player

- Cada aba instancia seu próprio canal, mas todos os INSERTs em `player_notifications` compartilham `user_id` → `useNotifications` dedup por `id` (já faz). O toast do `useCombatInviteListener` dedupa por `session_id` em um Map local por aba — cada aba mostra 1 toast (aceitável).
- **Opção avançada (P3):** `BroadcastChannel` API para coordenar entre abas (fora de escopo).

### 5.3 Player já está em outro combate ativo

- Toast mostra normalmente. Ao clicar "Entrar", `/app/join/{token}` carrega a nova sessão; player decide se troca.
- Não bloqueamos — DM pode conduzir duas campanhas; player pode ter duas fichas. Avisar por `toast.warning` se detectar outra sessão ativa no localStorage (`pocketdm_combat_start_snapshot`, ver `CombatSessionClient.tsx:666`).

### 5.4 DM inicia, cancela, reinicia (spam)

- Rate-limit 3 dispatches / 5 min por `session_id` (§3.5e).
- Dedup no client por `session_id` (ver §5.2) — reinício da mesma sessão não regera toast.
- Novos combates em sessions diferentes (mesma campanha) passam por novo `session_id` → toast novo (correto).

### 5.5 Player não é mais membro ativo

- Query de `campaign_members` filtra `status = 'active'` — banidos/inativos não recebem INSERT nem veriam broadcast relevante (toast seria emitido, mas hook filtra por `campaignIds` do próprio usuário).

---

## 6. Componentes a criar / modificar

### 6.1 Criar

- `hooks/useCombatInviteListener.ts` — hook de subscrição multi-campanha + dedup + toast trigger.
- `components/notifications/CombatInviteToast.tsx` — JSX do toast com CTA dourado.
- `lib/supabase/combat-invite.ts` — `dispatchCombatInvite({ sessionId })` (client helper) + tipos.
- `app/api/combat/invite/dispatch/route.ts` — endpoint server, pattern espelhado de `app/api/broadcast/route.ts`.
- Migration opcional: adicionar `INDEX idx_player_notifications_user_created` se ainda não existir (performance do feed).

### 6.2 Modificar

- `components/session/CombatSessionClient.tsx` — após os dois `broadcastEvent("session:state_sync")` (linhas ~678 e ~741), chamar `dispatchCombatInvite` se `campaignId` está presente. Fire-and-forget (como `fetch("/api/first-combat-check", ...)` em `:722-730`).
- `app/app/layout.tsx` — montar `<CombatInviteListenerMount userId={user.id} />` (componente client wrapper que busca `campaign_members` do user e passa IDs ao hook).
- `lib/types/realtime.ts` — adicionar `campaign:combat_invite` a `RealtimeEventType` e payload.
- `messages/pt-BR.json` + `messages/en.json` — chaves `player_hq.notifications.type_combat_invite`, `player_hq.notifications.combat_invite_message`, `combat_invite_toast.title`, `combat_invite_toast.cta_join`.
- `components/notifications/NotificationBell.tsx` — adicionar ícone (Swords/Sword de lucide) e rota de click quando `type === "combat_invite"`: navegar para `meta.join_token`.

### 6.3 Rotas

- **Nova (P1):** `/app/join/[token]` (auth-aware wrapper) — opcional no MVP. No MVP inicial usar `/join/[token]` direto (ver `app/join/[token]/page.tsx` — já suporta auth user via `authUser` em linha 47 e pré-preenche character em linha 107-115).

---

## 7. Critérios de aceitação

- [ ] DM inicia combate numa campanha com 2+ players logados → ambos recebem toast em < 2s (P95).
- [ ] Toast tem botão "Entrar" que navega e carrega o combate com character já registrado.
- [ ] DM que iniciou **não** recebe toast próprio (`dm_user_id === userId` filter).
- [ ] Player offline abre o app depois → vê convite no `NotificationBell` com badge.
- [ ] Player na própria campanha (`/app/campaigns/[id]`) vê banner permanente enquanto `sessions.is_active = true`.
- [ ] Player em outra campanha vê toast low-key prefixado com nome da campanha.
- [ ] Quick Combat (`campaign_id = null`) **não** dispara invite (`204 No Content` do endpoint).
- [ ] DM guest (sessão anônima em `/try`) **não** dispara invite (sem auth = sem access token no `dispatch`).
- [ ] Rate-limit: 4ª tentativa em 5 min retorna 429 e não cria notificações duplicadas.
- [ ] Múltiplas abas do player → 1 toast por aba, 1 row em `player_notifications`.
- [ ] `rtk tsc` limpo, `rtk vitest` passando, `rtk playwright` — teste E2E novo cobrindo fluxo DM start → player toast → click → join.
- [ ] Combat Parity Rule documentada: feature marcada Auth-only no bucket `/invite`.

---

## 8. Riscos

- **Realtime instabilidade:** mitigação via persistência em `player_notifications` (§3.3). Broadcast é o happy path; DB é o safety net.
- **Privacidade:** canal `campaign:{campaignId}:invites` é broadcast amplo — qualquer um que conheça o `campaignId` poderia assinar e escutar. Mitigação: `campaignId` já é UUID não enumerável; payload não contém HP/stats; bloquear RLS em `player_notifications` garante que só membros veem persistência. Aceitável (mesmo modelo de risco de `session:{sessionId}`).
- **Spam/reinício:** rate-limit por `session_id` + dedup client-side por `session_id` (§5.4).
- **Performance:** bulk insert de `player_notifications` para campanhas com 10+ players — usar `insert([...])` single roundtrip. Zero risco até ~100 membros.
- **`/api/broadcast` estava 404-ando no beta test (B01 do beta report):** verificar se a rota está registrada no deploy atual ANTES de adicionar `/api/combat/invite/dispatch` no mesmo contexto. B01 é pré-requisito de Onda 0.

---

## 9. Fora de escopo

- Web push notifications (service worker) — feature separada, pós-launch.
- SMS/email para player não-logado — fora (Combat Parity: guest = sem conta).
- Som de notificação configurável — P3 polish (pode adicionar padrão sutil via `useNotifications` existente — `navigator.vibrate` já está lá em `lib/hooks/useNotifications.ts:59-61`).
- Dashboard "campanhas com combate ativo" widget — pode reutilizar a query de fallback (§4.2); deixar para Onda 2 (Dashboard informativo, gap #3 do ROADMAP).
- Rota `/app/join/[token]` auth-aware — MVP usa `/join/[token]` que já detecta `authUser`. Rota nova é P2.

---

## 10. Sequência de implementação (sugestão de PRs)

1. **PR 1 — Backend dispatch** (`/api/combat/invite/dispatch` + `lib/supabase/combat-invite.ts` + tipos) com teste de unidade em `__tests__/broadcast.test.ts` stub.
2. **PR 2 — Hook + Listener mount** (`useCombatInviteListener` + montagem em `app/app/layout.tsx`) com teste Jest (mock de canal).
3. **PR 3 — Wire CombatSessionClient** — chamar `dispatchCombatInvite` nos dois caminhos; teste E2E Playwright.
4. **PR 4 — Banner em `/app/campaigns/[id]`** (fallback persistente §4.2).
5. **PR 5 — i18n + polish do toast** + NotificationBell ícone + navegação do bell.

---

## 11. Decisões abertas (validar com PM)

1. Rota de entrada: `/join/{token}` (existente, suporta auth) vs. nova `/app/join/{token}` (UX mais limpa, sem leaving `/app`). **Recomendação:** MVP usa existente; Onda 6 polish cria auth-aware.
2. O DM recebe confirmação visual de "convites enviados para N players"? **Recomendação:** sim, toast discreto pós-dispatch ("3 jogadores notificados").
3. `player_notifications.meta.join_token` — expira quando `session_tokens.is_active = false` (DM finaliza combate). Mostrar notificação antiga como "expirada"? **Recomendação:** sim, UI grey-out + disable CTA.
