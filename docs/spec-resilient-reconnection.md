# Spec: Resilient Player Reconnection — Zero-Drop Connection Guarantee

**Status**: Aprovado — Regra Imutavel do Sistema  
**Data**: 2026-04-02  
**Versao**: 2.0 (pos-adversarial review)  
**Autor**: Party Mode (Winston + Amelia + Quinn + John + Sally)  
**Prioridade**: P0 — Bloqueante para qualquer release  
**Review**: Adversarial review completo com 5 furos (Quinn), 3 preocupacoes arquiteturais (Winston), 3 realidades de implementacao (Amelia), 1 simplificacao de produto (John), 1 gap de UX (Sally). Todos incorporados.

---

## 1. Contexto e Motivacao

O PocketDM e usado por jogadores sentados numa mesa de RPG com celulares. O cenario de uso real inclui:

- Trocar de app pra responder WhatsApp (15-30s fora)
- Bloquear tela enquanto DM narra (1-5min)
- Browser do Android mata tab em background por memoria
- Fechar browser sem querer no gesto de navegacao (swipe up)
- Perda momentanea de 4G/WiFi (5-30s)
- Abrir o link novamente depois de ter fechado o browser

**Em NENHUM desses cenarios o jogador deve perceber que algo aconteceu.** A reconexao DEVE ser 100% invisivel. O DM NAO deve ter que aprovar nada se o jogador voltou dentro da janela de auto-approve.

---

## 2. Diagnostico Tecnico — Gaps Atuais

### 2.1 Nenhum lifecycle handler de saida

**Arquivo**: `components/player/PlayerJoinClient.tsx:1148-1185`

O `visibilitychange` handler atual so age quando a pagina fica **visivel** (`if (document.visibilityState !== "visible") return`). Quando a tab fica hidden ou o browser fecha:
- Nenhum broadcast de desconexao e enviado
- Presence channel nao faz `untrack`
- Heartbeat continua rodando (mas throttled pelo browser)
- DM ve jogador como "online" por ate 60s apos saida real

**Eventos faltantes**: `pagehide`, `visibilitychange` para `"hidden"`

> **Nota**: `beforeunload` NAO e confiavel em mobile (iOS Safari ignora). `pagehide` e a fonte primaria.

### 2.2 Presence channel e fire-and-forget

**Arquivo**: `components/player/PlayerJoinClient.tsx:1230-1248`

Criado no `handleRegister()`, guardado em `presenceChannelRef`. Cleanup so acontece em:
- `session:ended` broadcast (linha 1009-1011) — com delay de 500ms
- useEffect cleanup (linha 1066-1068) — nao executa se browser fechar

**Resultado**: Jogador fantasma visivel pro DM por ~30s (timeout interno do Supabase Presence).

> **Realidade (Amelia)**: `presenceChannelRef.current.untrack()` e assincrono. No `pagehide`, o browser pode matar o contexto antes da promise resolver. Tratar `untrack` como **best-effort**. O broadcast `player:disconnecting` via canal e mais confiavel que o untrack (broadcast e fire-and-forget sincrono). O fallback absoluto e o timeout interno do Supabase Presence (~30s).

### 2.3 Heartbeat sem pausa em background

**Arquivo**: `components/player/PlayerJoinClient.tsx:1128-1146`

`setInterval(heartbeat, 30_000)` roda enquanto componente existir. Em background:
- iOS Safari throttle para 1-2min
- Android Chrome pode suspender completamente
- `last_seen_at` fica irregularmente "quase ativo", confundindo a deteccao de presenca

### 2.4 Reconexao depende de aprovacao humana (rejoin)

**Arquivo**: `components/player/PlayerJoinClient.tsx:1266-1346`

Se o jogador fecha o browser e reabre:
1. `signInAnonymously()` gera NOVO UUID (cookies podem ter sido limpos)
2. Token ja claimed por outro `anon_user_id`
3. Cai no fluxo de rejoin -> `combat:rejoin_request` broadcast pro DM
4. DM precisa aprovar manualmente
5. 3 retries x 15s = ate 45s esperando
6. Timeout -> jogador precisa recarregar

### 2.5 Token sem expiracao

**Arquivo**: `lib/supabase/player-registration.ts`, tabela `session_tokens`

Tokens sao eternos enquanto `is_active = true`. Sem TTL, sem expiracao automatica, sem cleanup de tokens orfaos.

### 2.6 State machine de conexao (referencia)

**Arquivo**: `components/player/PlayerJoinClient.tsx:401-443`

```
CONNECTED <-> RECONNECTING -> POLLING_FALLBACK
    ^              ^                ^
    |              |                |
  SUBSCRIBED    CLOSED/ERROR     timeout 3s
```

- `CONNECTED`: Realtime ativo, polling desligado, safety net 15s
- `RECONNECTING`: Backoff exponencial (1s->2s->4s->8s...30s), tentando reconectar canal
- `POLLING_FALLBACK`: Sem realtime, polling API (2s->4s->8s...30s backoff)

---

## 3. Regras de Produto — Imutaveis

### 3.1 Tiers de reconexao baseados em tempo de ausencia

| Tempo fora | Comportamento | Aprovacao DM |
|-----------|--------------|--------------|
| 0-5min | Reconexao silenciosa, zero atrito | Nenhuma |
| 5-30min | Reconexao automatica com toast informativo | Nenhuma |
| > 30min | Reconexao direta se token valido no localStorage | Nenhuma |
| Token expirado/revogado/inexistente | Rejoin por nome (lista de nomes do server) | Nenhuma se token ainda existe no DB |
| Token revogado + combate ativo + nome desconhecido | Rejoin completo (formulario) | DM precisa aprovar |

> **Simplificacao (John)**: DM NAO precisa aprovar reconexao em NENHUM cenario onde o token do jogador ainda existe no DB e esta ativo. A aprovacao do DM so e necessaria quando o token foi revogado/expirado E o jogador nao consegue ser identificado automaticamente. Na pratica, isso so acontece se o DM removeu o jogador manualmente.

### 3.2 Regra de ouro da UX

> O jogador na mesa NAO PODE sentir ansiedade sobre conexao.

**Indicadores de desconexao (tiers visuais)**:
- **0-3s desconectado**: NADA visivel (reconexao invisivel)
- **3-10s**: Icone sutil de "reconectando..." (spinner pequeno no header, sem banner)
- **10-30s**: Banner nao-intrusivo: "Reconectando... seu progresso esta salvo"
- **30s+**: Banner com opcao "Tentar novamente"

**Tela de reconexao no mount (Sally)**:
- NAO pode ser tela branca
- NAO pode mostrar formulario de nome (confuso — "eu ja estava logado!")
- NAO pode ser spinner generico sem contexto
- DEVE ser: skeleton do board de combate com nome do jogador ja visivel
- DEVE ter texto sutil: "Reconectando, {playerName}..."
- Se falhar em 5s (timeout) -> transicao suave para o formulario/lista de nomes

### 3.3 Regra de presenca para o DM

- DM ve status em tempo real: Online / Idle (>30s sem heartbeat) / Offline (>60s)
- Quando jogador sai, status muda para Offline em no maximo 10s (via broadcast best-effort)
- Sem "jogadores fantasma" — se desconectou, o DM sabe imediatamente

> **Fallback de deteccao (Quinn)**: broadcast e sendBeacon sao **ambos best-effort** e podem falhar (rede ja caiu, adblocker). O DM client DEVE ter um timer client-side que checa `last_seen_at` stale a cada 15s e atualiza o status para Offline automaticamente. Nao depender APENAS de broadcasts para marcar offline.

---

## 4. Arquitetura da Solucao — 3 Frentes

### Frente 1: Deteccao de Saida (best-effort cleanup)

**Objetivo**: Quando o jogador sai (fecha browser, muda tab, perde rede), avisar o DM e limpar estado o mais rapido possivel.

**Principio fundamental**: TODAS as acoes de cleanup sao best-effort. O sistema DEVE funcionar corretamente mesmo se NENHUMA delas executar. O fallback absoluto e sempre o heartbeat miss (45s).

#### 4.1.1 Handler `pagehide` (fonte primaria de deteccao de saida)

```typescript
// pagehide e o evento mais confiavel em mobile para "pagina sendo descartada"
// Funciona no iOS Safari, Android Chrome, e todos os browsers modernos
// MDN: "The pagehide event is sent when the browser hides the current page 
//        in the process of presenting a different page from the session's history"
//
// NOTA: beforeunload NAO e confiavel em iOS Safari — usar pagehide.

useEffect(() => {
  if (!isRegistered || !effectiveTokenId) return;

  const handlePageHide = (e: PageTransitionEvent) => {
    // e.persisted === true -> page is in bfcache (back-forward cache)
    // e.persisted === false -> page is being unloaded/destroyed
    
    // 1. Best-effort: broadcast player:disconnecting via channel
    //    Broadcast e fire-and-forget sincrono — mais confiavel que untrack
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player:disconnecting",
        payload: {
          token_id: effectiveTokenId,
          player_name: registeredName,
          reason: e.persisted ? "bfcache" : "unload",
        },
      });
    }

    // 2. Best-effort: untrack presence (assincrono — pode nao completar)
    //    O broadcast acima e mais confiavel. Untrack e bonus.
    if (presenceChannelRef.current) {
      presenceChannelRef.current.untrack();
    }

    // 3. Best-effort: notify server via sendBeacon
    //    sendBeacon e fire-and-forget, sobrevive ao unload da pagina
    //    PODE falhar: adblockers, rede ja caiu, limite de payload
    //    NAO e a unica defesa — heartbeat miss e o fallback
    if (navigator.sendBeacon) {
      const payload = new Blob(
        [JSON.stringify({ token_id: effectiveTokenId })],
        { type: "application/json" }
      );
      navigator.sendBeacon(
        `/api/session/${sessionId}/player-disconnect`,
        payload
      );
    }
  };

  window.addEventListener("pagehide", handlePageHide);
  return () => window.removeEventListener("pagehide", handlePageHide);
}, [isRegistered, effectiveTokenId, registeredName, sessionId]);
```

#### 4.1.2 Handler `visibilitychange` bidirecional (hidden + visible)

```typescript
// Reescrita do handler existente (PlayerJoinClient.tsx:1148-1185)
// AGORA age tanto no "hidden" quanto no "visible"

useEffect(() => {
  if (!authReady || !sessionId) return;

  const handleVisibilityChange = async () => {
    if (document.visibilityState === "hidden") {
      // === HIDDEN: pausar atividade, avisar DM ===
      hiddenAtRef.current = Date.now();
      
      // Best-effort: broadcast player:idle
      if (channelRef.current && isRegisteredRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:idle",
          payload: { 
            token_id: effectiveTokenIdRef.current, 
            player_name: registeredNameRef.current,
          },
        });
      }
      return;
    }

    // === VISIBLE: reconectar e sincronizar ===
    const wasHiddenFor = hiddenAtRef.current 
      ? Date.now() - hiddenAtRef.current 
      : 0;
    hiddenAtRef.current = null;

    // Broadcast player:active para DM saber que voltou
    if (channelRef.current && isRegisteredRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player:active",
        payload: { 
          token_id: effectiveTokenIdRef.current, 
          player_name: registeredNameRef.current,
        },
      });
    }

    // Validar que token ainda pertence a este usuario
    // (resolve split-brain se bfcache restaurou pagina antiga)
    if (isRegisteredRef.current && supabaseRef.current) {
      try {
        const { data: { session: authSession } } = 
          await supabaseRef.current.auth.getSession();
        if (authSession?.user?.id) {
          const res = await fetch(`/api/session/${sessionId}/state`);
          if (res.ok) {
            const { data } = await res.json();
            // Se token foi transferido para outro UUID, este client
            // esta obsoleto (bfcache stale)
            if (data?.token_owner && data.token_owner !== authSession.user.id) {
              // Mostrar "Sessao transferida para outro dispositivo"
              setSessionRevoked(true);
              return;
            }
          }
        }
      } catch { /* best-effort — continuar reconexao normal */ }
    }

    // A.1: AWAIT fetch BEFORE reconnecting channel
    if (encounterIdRef.current) {
      await fetchFullState(encounterIdRef.current);
    }

    // Se realtime esta desconectado, forcar reconexao
    if (disconnectedAtRef.current && supabaseRef.current) {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectBackoffRef.current = 1000;
      createChannelRef.current?.();
    }
  };

  const handleOnline = () => {
    if (encounterIdRef.current) fetchFullState(encounterIdRef.current);
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
  };
}, [authReady, sessionId, fetchFullState]);
```

#### 4.1.3 Endpoint `/api/session/[id]/player-disconnect` (sendBeacon receiver)

```typescript
// Endpoint fire-and-forget — recebe POST do sendBeacon
// Atualiza last_seen_at para null (marca jogador como offline imediatamente)
// IDEMPOTENTE: se last_seen_at ja e null, o UPDATE nao causa dano
// RATE-LIMIT: Nao necessario — update idempotente no mesmo row e inofensivo

import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { token_id } = await req.json();
    
    // Validacao minima — sendBeacon nao espera resposta detalhada
    if (!token_id || typeof token_id !== "string") {
      return new Response(null, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Idempotente: se ja e null, UPDATE afeta 0 rows sem erro
    await supabase
      .from("session_tokens")
      .update({ last_seen_at: null })
      .eq("id", token_id)
      .eq("session_id", sessionId)
      .eq("is_active", true);
      
    return new Response(null, { status: 204 });
  } catch {
    // sendBeacon nao le a resposta — nao ha valor em retornar erro detalhado
    return new Response(null, { status: 204 });
  }
}
```

### Frente 2: Reconexao Resiliente (zero-friction rejoin)

**Objetivo**: Quando o jogador volta, reconectar automaticamente sem perguntar nada.

#### 4.2.1 Persistencia de identidade em sessionStorage + localStorage

```typescript
const STORAGE_KEY_PREFIX = "pocketdm:session:";

function persistPlayerIdentity(sessionId: string, tokenId: string, playerName: string) {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
  const data = {
    tokenId,
    playerName,
    registeredAt: Date.now(),
  };

  // sessionStorage — sobrevive a refresh, morre ao fechar browser
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — ignorar */ }

  // localStorage — sobrevive a fechar browser
  // NOTA (Quinn): localStorage PODE ser limpo pelo SO mobile em condicoes
  // de memoria baixa. Tratar como best-effort. Fallback: rejoin por nome.
  try {
    localStorage.setItem(key, JSON.stringify({
      ...data,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // TTL 24h
    }));
  } catch { /* quota exceeded — ignorar */ }
}

function loadPlayerIdentity(sessionId: string): { tokenId: string; playerName: string } | null {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
  
  // Prioridade: sessionStorage (mais fresco) > localStorage (mais duravel)
  const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (!raw) return null;
  
  try {
    const data = JSON.parse(raw);
    
    // Checar TTL do localStorage
    if (data.expiresAt && Date.now() > data.expiresAt) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return null;
    }
    
    if (data.tokenId && data.playerName) {
      return { tokenId: data.tokenId, playerName: data.playerName };
    }
  } catch { /* JSON corrompido */ }
  
  return null;
}

function clearPlayerIdentity(sessionId: string) {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}
```

**Quando persistir**:
- Apos `handleRegister()` bem-sucedido (novo registro)
- Apos `claimPlayerToken()` retornar `playerName` nao-null (same-device reconnect)
- Apos `rejoinAsPlayer()` bem-sucedido (cookie-less reconnect)

**Quando limpar**:
- Apos `session:ended` broadcast (sessao encerrada)
- Apos `session:revoked` broadcast (token revogado)
- Apos TTL expirar (24h)

#### 4.2.2 Fluxo de reconexao no mount — ORDEM CRITICA

> **Preocupacao (Winston)**: A ordem de operacoes e critica. Auth deve ser resolvido ANTES de tentar reconexao por storage. E todo o fluxo precisa de timeout (Amelia: 8s).

```typescript
// Reescrita do initAuth (PlayerJoinClient.tsx:295-352)
// ORDEM: auth primeiro -> storage -> rejoin ou claim

const initAuth = async () => {
  const STORAGE_KEY = `pocketdm:session:${sessionId}`;
  const saved = loadPlayerIdentity(sessionId);

  // Se temos dados salvos, mostrar skeleton de reconexao imediatamente
  // (Sally: nao pode ser tela branca nem formulario)
  if (saved?.playerName) {
    setReconnectingAs(saved.playerName); // estado visual: "Reconectando, {name}..."
  }

  try {
    const supabase = createClient();

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), ms)
        ),
      ]);

    // PASSO 1: Resolver auth (getSession ou signInAnonymously)
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession(), 8000);

    let userId: string;
    if (!session) {
      const { data, error: authError } = await withTimeout(
        supabase.auth.signInAnonymously(),
        10000
      );
      if (authError) throw new Error(`anon-auth: ${authError.message}`);
      if (!data.user) throw new Error("anon-auth: no user returned");
      userId = data.user.id;
    } else {
      userId = session.user.id;
    }

    // PASSO 2: Se temos dados salvos, tentar reconexao rapida
    if (saved?.tokenId && saved?.playerName) {
      try {
        // Timeout de 8s para reconexao (Amelia: evita loading infinito)
        const { tokenId: rejoinedId } = await withTimeout(
          rejoinAsPlayer(sessionId, saved.playerName, userId),
          8000
        );
        
        if (!cancelled) {
          setEffectiveTokenId(rejoinedId);
          setIsRegistered(true);
          setRegisteredName(saved.playerName);
          setReconnectingAs(null); // limpar skeleton
          persistPlayerIdentity(sessionId, rejoinedId, saved.playerName);
          setAuthReady(true);
        }
        return; // Reconexao bem-sucedida — pular claimPlayerToken
      } catch {
        // Reconexao falhou (token revogado, sessao expirada, timeout)
        // Limpar storage stale e continuar fluxo normal
        clearPlayerIdentity(sessionId);
        if (!cancelled) setReconnectingAs(null);
      }
    }

    // PASSO 3: Fluxo normal — claimPlayerToken
    const { tokenId: claimedTokenId, playerName } = await withTimeout(
      claimPlayerToken(tokenId, userId),
      10000
    );
    
    if (!cancelled) {
      setEffectiveTokenId(claimedTokenId);
      if (playerName) {
        // Same-device reconnect detectado pelo server
        setIsRegistered(true);
        setRegisteredName(playerName);
        persistPlayerIdentity(sessionId, claimedTokenId, playerName);
      }
      setReconnectingAs(null);
      setAuthReady(true);
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      component: "PlayerJoinClient",
      action: "initAuth",
      category: "auth",
      extra: { tokenId },
    });
    if (!cancelled) {
      setReconnectingAs(null);
      setError(tRef.current("connection_error_detail"));
    }
  }
};
```

> **CRITICO (Quinn)**: O canal realtime so deve ser criado APOS o rejoin completar com sucesso. O useEffect existente (linha 630) ja depende de `authReady`, entao o canal so e criado depois que `setAuthReady(true)` executa. Isso garante que o jogador tem um token valido antes de se inscrever no canal. O `fetchFullState()` e chamado dentro do subscribe handler quando status === "SUBSCRIBED" (linha 1022), garantindo sincronizacao completa.

#### 4.2.3 Auto-approve rejoin (server-side) — sem dependencia do DM

> **Simplificacao (John)**: DM NAO precisa aprovar reconexao em NENHUM cenario onde o token ainda existe e esta ativo no DB.

**Mudanca em `rejoinAsPlayer` (`lib/supabase/player-registration.ts:304-360`)**:

```typescript
export async function rejoinAsPlayer(
  sessionId: string,
  playerName: string,
  anonUserId: string
): Promise<ClaimTokenResult> {
  const supabase = createServiceClient();

  const name = playerName?.trim();
  if (!name) throw new Error("Invalid name");

  // Find the token for this player in this session
  const { data: token, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, player_name, anon_user_id, last_seen_at")  // NOVO: incluir last_seen_at
    .eq("session_id", sessionId)
    .eq("player_name", name)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (tokenError || !token) {
    throw new Error("Player not found in this session");
  }

  // Ja pertence a este usuario — sem transferencia necessaria
  if (token.anon_user_id === anonUserId) {
    return { tokenId: token.id, playerName: token.player_name };
  }

  // AUTO-APPROVE: token existe e esta ativo -> transferir diretamente
  // NAO exigir aprovacao do DM. O token pertence a este jogador (match por nome).
  // Se o DM quis remover o jogador, ele revoga o token (is_active=false).
  
  // A.5: Atomic transfer — optimistic locking no anon_user_id atual
  const { data: updated, error: updateError } = await supabase
    .from("session_tokens")
    .update({
      anon_user_id: anonUserId,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", token.id)
    .eq("anon_user_id", token.anon_user_id ?? "")
    .select("id, anon_user_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Token transfer failed: ${updateError.message}`);
  }

  if (!updated) {
    throw new Error("Token ownership conflict — another device claimed this token first");
  }

  trackServerEvent("player:rejoined", {
    properties: { session_id: sessionId, token_id: token.id, player_name: name },
  });

  return { tokenId: token.id, playerName: token.player_name };
}
```

#### 4.2.4 Eliminacao da aprovacao do DM no `handleRejoin` (client-side)

**Mudanca em `handleRejoin` (`PlayerJoinClient.tsx:1266-1346`)**:

O `handleRejoin` atual tem dois caminhos:
- Sem combate ativo -> rejoin direto (ja existe)
- Com combate ativo -> `combat:rejoin_request` pro DM

**NOVO comportamento**: SEMPRE rejoin direto via `rejoinAsPlayer()`, independente de combate ativo ou nao. O server-action ja faz atomic transfer com optimistic locking — nao precisa de aprovacao do DM.

```typescript
const handleRejoin = useCallback(async (playerName: string) => {
  try {
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;
    if (!userId) throw new Error("No auth session");

    const { tokenId: rejoinedTokenId } = await rejoinAsPlayer(sessionId, playerName, userId);
    setEffectiveTokenId(rejoinedTokenId);
    setIsRegistered(true);
    setRegisteredName(playerName);
    persistPlayerIdentity(sessionId, rejoinedTokenId, playerName);

    // Broadcast para DM que jogador voltou
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player:joined",
        payload: {
          id: rejoinedTokenId,
          name: playerName,
          rejoin: true, // flag pra DM saber que e reconexao
        },
      });
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      component: "PlayerJoinClient",
      action: "rejoin",
      category: "auth",
      extra: { sessionId, playerName },
    });
    toast.error(tRef.current("rejoin_error"));
  }
}, [sessionId]);
```

> **Consequencia**: O fluxo de `combat:rejoin_request` / `combat:rejoin_response` / DM approval dialog se torna **obsoleto** para reconexoes normais. Manter apenas como fallback extremo se `rejoinAsPlayer` falhar por conflito de token E o jogador precisar ser re-criado como combatant.

#### 4.2.5 Cadeia de fallback para identificacao do jogador

> **Furo 5 da Quinn**: Se cookies E localStorage forem limpos, o jogador perde tudo.

Cadeia de fallback (em ordem de prioridade):

```
1. sessionStorage tem { tokenId, playerName }
   -> rejoinAsPlayer() direto
   
2. localStorage tem { tokenId, playerName } (TTL valido)
   -> rejoinAsPlayer() direto
   
3. Cookies de auth intactos (anon session viva)
   -> claimPlayerToken() retorna playerName (same-device reconnect)
   
4. Nenhum storage, nenhum cookie
   -> Server page envia registeredPlayerNames[]
   -> Jogador ve lista de nomes e clica no seu
   -> handleRejoin(selectedName)
   
5. Nome nao esta na lista (jogador novo ou token revogado)
   -> Formulario completo de registro
```

**NOTA**: O fallback 4 (lista de nomes) JA EXISTE no codigo atual. O server page (`app/join/[token]/page.tsx:162-164`) envia `registeredPlayerNames` e o PlayerLobby mostra os nomes para selecao. O que muda e que agora o rejoin e direto, sem aprovacao do DM.

### Frente 3: Deteccao Server-Side de Jogador Fantasma

#### 4.3.1 Semantica de `last_seen_at`

| Valor | Significado |
|-------|------------|
| `null` | Jogador explicitamente offline (enviou sendBeacon de disconnect) |
| Timestamp < 45s atras | Jogador ativo (heartbeat recente) |
| Timestamp 45s-5min atras | Jogador idle/ausente (heartbeat parou mas pode voltar) |
| Timestamp > 5min atras | Jogador provavelmente saiu |

#### 4.3.2 Reducao do ACTIVE_THRESHOLD_MS

**Arquivo**: `app/join/[token]/page.tsx:159`

```typescript
// ANTES:
const ACTIVE_THRESHOLD_MS = 60_000; // 60s

// DEPOIS:
const ACTIVE_THRESHOLD_MS = 45_000; // 45s — mais responsivo
```

#### 4.3.3 Server page deve enviar `lastSeenAt` bruto

> **Preocupacao (Winston)**: O client precisa do timestamp bruto de `last_seen_at` para decidir se mostra skeleton de reconexao ou formulario.

**Mudanca em `app/join/[token]/page.tsx:166-173`**:

```typescript
const registeredPlayersWithStatus = (registeredTokens ?? [])
  .filter((t) => t.player_name)
  .map((t) => ({
    name: t.player_name!,
    isActive: t.last_seen_at
      ? now - new Date(t.last_seen_at).getTime() < ACTIVE_THRESHOLD_MS
      : false,
    lastSeenAt: t.last_seen_at ?? null,  // NOVO: timestamp bruto
  }));
```

E a interface `PlayerJoinClientProps` precisa refletir:

```typescript
registeredPlayersWithStatus?: Array<{ 
  name: string; 
  isActive: boolean;
  lastSeenAt: string | null;  // NOVO
}>;
```

#### 4.3.4 Heartbeat com awareness de visibility

```typescript
// Heartbeat DEVE pausar quando tab esta hidden (economiza bateria + evita confusao)
useEffect(() => {
  if (!isRegistered || !active || !effectiveTokenId) return;
  const supabase = createClient();
  
  const heartbeat = async () => {
    // Nao enviar heartbeat se tab esta hidden
    // (browser throttle torna isso unreliable de qualquer forma)
    if (document.visibilityState === "hidden") return;
    
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user?.id) return;
      await supabase
        .from("session_tokens")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", effectiveTokenId)
        .eq("anon_user_id", authSession.user.id); // guard: nao renovar se transferido
    } catch { /* best-effort */ }
  };
  
  heartbeat(); // imediato
  const id = setInterval(heartbeat, 30_000);
  return () => clearInterval(id);
}, [isRegistered, active, effectiveTokenId]);
```

#### 4.3.5 DM client-side stale detection timer

> **Quinn**: DM DEVE ter timer client-side que detecta `last_seen_at` stale.

No dashboard do DM (SessionDashboard ou equivalente):

```typescript
// Timer de 15s que checa presence de jogadores via last_seen_at
// NAO depende de broadcasts — funciona mesmo se todos falharem
useEffect(() => {
  const checkPresence = async () => {
    const { data: tokens } = await supabase
      .from("session_tokens")
      .select("id, player_name, last_seen_at")
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .not("player_name", "is", null);
    
    // Atualizar status de cada jogador baseado em last_seen_at
    const now = Date.now();
    const statuses = (tokens ?? []).map(t => ({
      name: t.player_name!,
      status: !t.last_seen_at ? "offline" as const
        : now - new Date(t.last_seen_at).getTime() < 45_000 ? "online" as const
        : now - new Date(t.last_seen_at).getTime() < 300_000 ? "idle" as const
        : "offline" as const,
    }));
    setPlayerStatuses(statuses);
  };

  checkPresence();
  const id = setInterval(checkPresence, 15_000);
  return () => clearInterval(id);
}, [sessionId]);
```

#### 4.3.6 DM recebe broadcasts `player:disconnecting` / `player:idle` / `player:active`

No canal de realtime do DM, escutar:
- `player:disconnecting` -> marcar jogador como Offline **imediatamente** (sem esperar timer)
- `player:idle` -> marcar jogador como Idle
- `player:active` -> marcar jogador como Online
- `player:joined` (existente) -> marcar como Online

**Prioridade**: broadcast recebido > timer de 15s. Se broadcast diz "offline", atualizar estado sem esperar proximo ciclo do timer.

---

## 5. Resolucao de Split-Brain (bfcache)

> **Furo 4 da Quinn**: Jogador A fecha browser. Token fica com UUID_1. Jogador A reabre -> novo UUID_2 (rejoin). Mas o browser original pode restaurar a pagina do bfcache com UUID_1.

### 5.1 Solucao: Validacao de ownership no `visibilitychange`

> **Amelia**: Mais simples que session_nonce — no `visibilitychange` para "visible", SEMPRE validar que o token ainda pertence ao UUID atual.

Implementado no handler `visibilitychange` da secao 4.1.2:

```typescript
// Dentro do handler "visible":
// Fetch state e verificar token_owner
const res = await fetch(`/api/session/${sessionId}/state`);
const { data } = await res.json();
if (data?.token_owner && data.token_owner !== authSession.user.id) {
  setSessionRevoked(true); // "Sessao transferida para outro dispositivo"
  return;
}
```

### 5.2 Mudanca necessaria no `/api/session/[id]/state`

O endpoint de state precisa retornar `token_owner` (o `anon_user_id` atual do token) para que o client possa detectar split-brain.

Isso requer que o client envie seu `effectiveTokenId` como query param:

```
GET /api/session/{id}/state?token_id={tokenId}
```

Response adiciona:

```json
{
  "data": {
    "encounter": { ... },
    "combatants": [ ... ],
    "token_owner": "uuid-of-current-owner-or-null"
  }
}
```

---

## 6. Fluxo Completo — Cenario por Cenario (REVISADO)

### 6.1 Jogador fecha browser no celular (swipe up) — volta em 30s

```
1. pagehide dispara
2. broadcast player:disconnecting (best-effort)
3. sendBeacon POST /api/.../player-disconnect -> last_seen_at = null (best-effort)
4. Presence untrack (best-effort, assincrono, pode nao completar)
5. DM recebe broadcast -> ve jogador como Offline em < 2s
   FALLBACK: se broadcast + sendBeacon falharam -> DM timer de 15s detecta stale

6. Jogador reabre o link (30s depois):
7. Mount -> initAuth -> checa sessionStorage (vazio — browser fechou)
8. Checa localStorage -> encontra { tokenId, playerName }
9. Mostra skeleton: "Reconectando, Gandalf..."
10. getSession() -> sem sessao -> signInAnonymously() (novo UUID)
11. rejoinAsPlayer("Gandalf", newUUID) -> auto-approve, atomic transfer
12. setAuthReady(true) -> canal realtime cria
13. Canal SUBSCRIBED -> fetchFullState() sincroniza combate
14. Skeleton desaparece -> board de combate aparece
15. DM ve jogador como Online
16. Jogador esta de volta — zero friction
```

### 6.2 Jogador troca de app (WhatsApp) por 20s

```
1. visibilitychange -> "hidden"
2. broadcast player:idle -> DM ve jogador como Idle
3. Heartbeat PAUSA (tab hidden check)
4. 20s se passam

5. Jogador volta ao browser:
6. visibilitychange -> "visible"
7. broadcast player:active -> DM ve jogador como Online
8. Valida token ownership (anti-split-brain)
9. Heartbeat RETOMA imediatamente
10. fetchFullState() sincroniza estado
11. Se canal realtime morreu -> removeChannel + createChannel
12. Reconexao invisivel — jogador nao percebe nada
```

### 6.3 Perda de 4G por 15s

```
1. WebSocket cai -> status "CLOSED" 
2. transitionTo("RECONNECTING")
3. Backoff: 1s, 2s, 4s, 8s (tenta reconectar canal)
4. 0-3s: NADA visivel pro jogador
5. 3-10s: spinner sutil no header
6. 10s+: banner "Reconectando..."

7. 4G volta (15s):
8. Canal reconecta -> "SUBSCRIBED"
9. transitionTo("CONNECTED")
10. fetchFullState() reconcilia
11. Spinner/banner desaparece
12. Reconexao transparente
```

### 6.4 Jogador volta depois de 2 horas

```
1. Mount -> checa localStorage
2. Encontra dados salvos, TTL (24h) ainda valido
3. Mostra skeleton: "Reconectando, Gandalf..."
4. signInAnonymously() (novo UUID)
5. rejoinAsPlayer("Gandalf", newUUID) -> auto-approve (token ativo no DB)
6. Token transferido atomicamente
7. Canal realtime reconecta
8. fetchFullState() sincroniza combate
9. Jogador esta de volta — sem aprovacao do DM
```

### 6.5 Dois dispositivos simultaneos

```
1. Jogador A no celular, Jogador A abre no tablet
2. Tablet faz signInAnonymously() (UUID diferente)
3. rejoinAsPlayer() -> atomic transfer com optimistic locking
4. Tablet ganha o token (UUID_2)
5. Celular ainda esta conectado (UUID_1, canal vivo)
6. Celular faz visibilitychange -> valida token_owner -> UUID_2 != UUID_1
7. Celular mostra "Sessao transferida para outro dispositivo"
8. Sem conflito — um dispositivo sempre vence
```

### 6.6 Cookies E localStorage limpos (pior caso)

```
1. Mount -> sessionStorage vazio, localStorage vazio
2. NAO mostra skeleton (nao sabe quem e o jogador)
3. signInAnonymously() (novo UUID)
4. claimPlayerToken() -> token ja claimed -> cria novo token
5. Jogador ve o formulario de nome
6. MAS: lista de registeredPlayerNames aparece embaixo
7. Jogador clica "Gandalf" (seu nome)
8. handleRejoin("Gandalf") -> rejoinAsPlayer() direto, sem DM approval
9. Token transferido, canal reconecta, state synced
10. Jogador esta de volta — 1 clique
```

### 6.7 DM removeu jogador manualmente (token revogado)

```
1. DM revogou token (is_active = false)
2. Jogador reabre o link
3. localStorage tem tokenId, mas rejoinAsPlayer() falha ("Player not found")
4. clearPlayerIdentity() — limpa storage stale
5. claimPlayerToken() -> cria novo token
6. Jogador ve formulario de registro completo
7. Jogador registra de novo -> DM recebe late_join_request
8. DM aprova -> jogador entra no combate
9. Este e o UNICO cenario que exige aprovacao do DM
```

---

## 7. Arquivos Afetados

| Arquivo | Mudanca | Tipo |
|---------|---------|------|
| `components/player/PlayerJoinClient.tsx` | pagehide handler, visibilitychange bidirecional, heartbeat visibility-aware, storage persist/load, reconnect-from-storage no mount, handleRejoin simplificado, skeleton de reconexao, refs novos (hiddenAtRef, reconnectingAs) | MODIFICAR |
| `lib/supabase/player-registration.ts` | rejoinAsPlayer sem janela de aprovacao — sempre auto-approve se token ativo | MODIFICAR |
| `app/join/[token]/page.tsx` | ACTIVE_THRESHOLD_MS 60->45s, incluir lastSeenAt bruto no registeredPlayersWithStatus | MODIFICAR |
| `app/api/session/[id]/player-disconnect/route.ts` | Endpoint sendBeacon receiver (idempotente) | CRIAR |
| `app/api/session/[id]/state/route.ts` | Retornar token_owner no response (anti-split-brain) | MODIFICAR |
| `messages/en.json` + `messages/pt-BR.json` | Strings: "Reconectando, {name}...", "Sessao transferida", tiers de banner | MODIFICAR |
| DM dashboard (broadcast listeners) | Escutar player:disconnecting, player:idle, player:active + timer 15s de stale detection | MODIFICAR |

---

## 8. Broadcast Events — Novos

| Event | Direcao | Payload | Quando | Confiabilidade |
|-------|---------|---------|--------|----------------|
| `player:disconnecting` | Player -> DM | `{ token_id, player_name, reason }` | pagehide / unload | Best-effort (pode falhar se rede ja caiu) |
| `player:idle` | Player -> DM | `{ token_id, player_name }` | visibilitychange -> hidden | Best-effort |
| `player:active` | Player -> DM | `{ token_id, player_name }` | visibilitychange -> visible | Alta (tab esta ativa, rede provavelmente OK) |

> **Principio (Quinn)**: Broadcasts de saida sao SEMPRE best-effort. O sistema NUNCA deve depender exclusivamente deles. O timer de stale detection no DM (secao 4.3.5) e o fallback absoluto.

---

## 9. Storage Schema

### sessionStorage (per-session, dies with browser)

```json
{
  "key": "pocketdm:session:{sessionId}",
  "value": {
    "tokenId": "uuid",
    "playerName": "Gandalf",
    "registeredAt": 1712000000000
  }
}
```

### localStorage (per-session, 24h TTL, best-effort — SO mobile pode limpar)

```json
{
  "key": "pocketdm:session:{sessionId}",
  "value": {
    "tokenId": "uuid",
    "playerName": "Gandalf",
    "registeredAt": 1712000000000,
    "expiresAt": 1712086400000
  }
}
```

---

## 10. Criterios de Aceite

### Obrigatorios (P0)

- [ ] Jogador fecha browser e volta em < 5min -> reconexao silenciosa, sem aprovacao DM
- [ ] Jogador troca de app por 30s -> estado sincroniza ao voltar, sem banner de erro
- [ ] Perda de rede por < 10s -> reconexao invisivel (nenhum indicador visual)
- [ ] DM detecta jogador offline em < 45s (via broadcast OU timer de stale detection)
- [ ] Heartbeat pausa quando tab fica hidden (economia de bateria)
- [ ] Dados de reconnect persistidos em sessionStorage + localStorage
- [ ] rejoinAsPlayer() auto-approve SEMPRE que token existe e esta ativo
- [ ] sendBeacon endpoint funciona com POST fire-and-forget e e idempotente
- [ ] Zero regressao nos fluxos existentes (late-join, session:ended, death saves)
- [ ] Split-brain (bfcache) detectado e resolvido — client stale mostra "sessao transferida"
- [ ] Fallback de rejoin por lista de nomes funciona quando storage esta vazio
- [ ] Skeleton de reconexao mostrado no mount quando storage tem playerName

### Desejaveis (P1)

- [ ] UX de desconexao com tiers (0-3s nada, 3-10s spinner, 10-30s banner, 30s+ retry)
- [ ] DM ve Online/Idle/Offline status por jogador no painel
- [ ] localStorage TTL de 24h limpa tokens expirados automaticamente
- [ ] DM recebe broadcast best-effort -> atualiza status imediatamente (< 2s)

---

## 11. Testes de Validacao

| # | Cenario | Dispositivo | Passo | Resultado Esperado |
|---|---------|-------------|-------|-------------------|
| T1 | Fechar browser, reabrir em 10s | iOS Safari | Swipe up, reabrir link | Skeleton -> reconecta silenciosamente |
| T2 | Fechar browser, reabrir em 2min | Android Chrome | Fechar app, reabrir link | Skeleton -> reconecta silenciosamente |
| T3 | Trocar de app 30s | iOS Safari | Ir pro WhatsApp, voltar | Estado sincronizado, sem banner |
| T4 | Perda de 4G 15s | Qualquer mobile | Modo aviao 15s, desligar | Reconecta, spinner sutil desaparece |
| T5 | Lock screen 1min | Android | Bloquear, desbloquear | Heartbeat retoma, presenca OK |
| T6 | Dois dispositivos | Mobile + Desktop | Abrir mesmo link nos dois | Um recebe "sessao transferida" |
| T7 | DM fecha sessao offline | Mobile | DM encerra enquanto jogador offline | Ao voltar, ve "sessao encerrada" |
| T8 | Volta apos 2h | Desktop | Fechar browser, abrir depois | localStorage -> reconecta sem DM |
| T9 | Cookies + localStorage limpos | Mobile | Limpar dados browser, reabrir | Lista de nomes -> 1 clique rejoin |
| T10 | DM ve desconexao via broadcast | DM desktop | Jogador fecha browser | DM ve Offline em < 2s (broadcast) |
| T11 | DM ve desconexao via timer | DM desktop | Jogador perde rede (sem broadcast) | DM ve Offline em < 45s (timer) |
| T12 | bfcache split-brain | iOS Safari | Navegar back apos rejoin em outro device | Mostra "sessao transferida" |
| T13 | Reconexao timeout 8s | Rede lenta | Abrir link com Supabase lento | Skeleton 5s -> fallback formulario |
| T14 | Token revogado pelo DM | Qualquer | DM revoga, jogador reabre | Formulario completo, DM aprova late-join |
| T15 | Heartbeat pausa em hidden | Qualquer | Tab hidden -> verificar DB | last_seen_at para de atualizar |

---

## 12. Anti-Patterns — PROIBIDO

```
// NUNCA depender APENAS de visibilitychange em mobile
// NUNCA assumir que beforeunload dispara no iOS
// NUNCA exigir aprovacao do DM para reconexao (exceto token revogado)
// NUNCA mostrar banner de "desconectado" nos primeiros 3s
// NUNCA rodar heartbeat quando tab esta hidden
// NUNCA deixar jogador fantasma visivel pro DM por > 45s
// NUNCA depender APENAS de cookies para identidade (use localStorage)
// NUNCA depender APENAS de broadcasts para deteccao de offline (use timer)
// NUNCA fazer reconexao que apaga o estado local do jogador
// NUNCA mostrar tela branca ou formulario durante reconexao (use skeleton)
// NUNCA assumir que localStorage persiste (SO mobile pode limpar)
// NUNCA assumir que sendBeacon funciona (adblockers, rede morta)
// NUNCA fazer operacao assincrona blocking no pagehide (pode nao completar)
```

---

## 13. Compatibilidade de Browser

| Browser | pagehide | sendBeacon | visibilitychange | sessionStorage | localStorage |
|---------|----------|------------|------------------|----------------|-------------|
| iOS Safari 15+ | Sim | Sim | Sim (unreliable on bg) | Sim | Sim (pode ser limpo pelo SO) |
| Android Chrome 90+ | Sim | Sim | Sim | Sim | Sim |
| Samsung Internet | Sim | Sim | Sim | Sim | Sim |
| Firefox Mobile | Sim | Sim | Sim | Sim | Sim |
| Desktop Chrome/Firefox/Edge | Sim | Sim | Sim | Sim | Sim |

---

## 14. Diagrama de Fallbacks — Defense in Depth

```
DETECCAO DE SAIDA (DM sabe que jogador saiu):
  Layer 1: broadcast player:disconnecting     (< 2s, best-effort)
  Layer 2: sendBeacon -> last_seen_at = null   (< 2s, best-effort)
  Layer 3: Presence untrack timeout            (~ 30s, Supabase interno)
  Layer 4: DM timer stale detection            (< 45s, confiavel)
  Layer 5: Heartbeat miss                      (< 45s, confiavel)

RECONEXAO DO JOGADOR (jogador volta ao combate):
  Layer 1: sessionStorage (mesmo browser, tab restore)
  Layer 2: localStorage (browser fechou e abriu, 24h TTL)
  Layer 3: Cookie auth (anon session viva, same-device)
  Layer 4: Lista de nomes (server-side, 1 clique)
  Layer 5: Formulario completo (ultimo recurso)

DETECCAO DE SPLIT-BRAIN (bfcache stale):
  Layer 1: visibilitychange -> validate token_owner
  Layer 2: session:revoked broadcast (se outro device fez rejoin)
```

---

## 15. Referencia — Codigo Atual (antes das mudancas)

### State machine de conexao
- `PlayerJoinClient.tsx:401-443` — CONNECTED/RECONNECTING/POLLING_FALLBACK
- `PlayerJoinClient.tsx:1015-1053` — subscribe handler (SUBSCRIBED/CLOSED/CHANNEL_ERROR)

### Heartbeat
- `PlayerJoinClient.tsx:1128-1146` — setInterval 30s, update last_seen_at

### Visibility handler
- `PlayerJoinClient.tsx:1148-1185` — so "visible", sem "hidden"

### Presence
- `PlayerJoinClient.tsx:1230-1248` — track no register, sem untrack

### Rejoin
- `PlayerJoinClient.tsx:1266-1346` — handleRejoin com DM approval (sera simplificado)
- `lib/supabase/player-registration.ts:304-360` — rejoinAsPlayer atomic transfer

### Timer cleanup
- `PlayerJoinClient.tsx:362-375` — clearAllTimers
- `PlayerJoinClient.tsx:1061-1074` — useEffect cleanup

### Auth init
- `PlayerJoinClient.tsx:295-352` — signInAnonymously + claimPlayerToken

---

## 16. Identity Upgrade — Cenario Especial de Reconexao

> **Contexto**: Story 01-E do Epic `player-identity` (`docs/epics/player-identity/epic-01-identity-foundation.md` Area 2) introduz a saga de **upgrade anon -> auth**. Esta secao documenta como esse upgrade se encaixa no modelo de reconexao resiliente SEM violar nenhuma das regras imutaveis das secoes anteriores.
>
> **Principio fundamental**: o upgrade NAO e uma reconexao — e uma **promocao de identidade in-place**. A UUID (`auth.uid()`) e preservada por contrato (Epic 01 D1), portanto o canal realtime, presence, storage e `session_tokens.id` continuam validos. O "blip" de reconexao e apenas um reissue de JWT.
>
> **Referencia de implementacao**: `lib/supabase/player-identity.ts` (saga Phase 1 + Phase 3 idempotente, forward-recovery).

### 16.1 Trigger e contrato com Phase 2

`supabase.auth.updateUser({ email, password })` e chamado client-side com o JWT anonimo do proprio usuario (Phase 2 da saga — `lib/supabase/player-identity.ts:14-20`). O Supabase:

1. Preserva `auth.users.id` (contrato D1 do Epic 01 — **UUID NAO muda**)
2. Reissua JWT com `aud` promovido de "authenticated (anon)" para "authenticated (auth)"
3. Grava email+password em `auth.users`

Imediatamente apos o sucesso de `updateUser`, o client chama `POST /api/player-identity/upgrade` com o novo JWT. Server action executa `upgradePlayerIdentity()` (`lib/supabase/player-identity.ts:166-284`) que valida Phase 1 e dispara Phase 3.

### 16.2 O que muda (e o que NAO muda) no upgrade

| Superficie | Antes do upgrade | Depois do upgrade | Impacto reconexao |
|---|---|---|---|
| JWT `aud` | `authenticated` (classe anon) | `authenticated` (classe auth) | Realtime re-autentica canal (~500ms) |
| `auth.uid()` | UUID anon | **MESMA UUID** (D1 preservada) | **Zero impacto** |
| `session_tokens.id` | Estavel | Estavel | **Chave imutavel** — storage valido |
| `session_tokens.user_id` | `NULL` | `= auth.uid()` | Hard-claim |
| `session_tokens.anon_user_id` | Preenchido | Preservado (audit) | Split-brain fallback funciona |
| `public.users` row | Pode nao existir | `INSERT ... role='player'` | Novo perfil |
| `player_characters.user_id` | `NULL` (soft-claim) | `= auth.uid()` (hard) | Owner transferido |
| `player_characters.claimed_by_session_token` | Preenchido (soft) | `NULL` (promovido) | Cleanup |
| `campaign_members` | Pode nao existir | Inserido `role='player'` | Nova membership |
| Storage `pocketdm:session:{sid}` | `{ tokenId, playerName }` | **Inalterado** | Reconnect-from-storage continua valido |
| Presence channel | `track({ name, token_id })` | Mesmo track | **Nao interrompe** |

**Consequencia chave**: as regras das secoes 4.2.1 (storage), 4.2.2 (mount ordem), e 4.2.5 (cadeia de fallback) **nao requerem nenhuma mudanca**. Storage nunca e limpo durante o upgrade.

### 16.3 Perspectiva do DM

- DM recebe broadcast `player:identity-upgraded` no canal `campaign:{campaignId}` (payload em `lib/supabase/player-identity.ts:700-738`):
  ```json
  {
    "event": "player:identity-upgraded",
    "sessionTokenId": "uuid-estavel",
    "userId": "auth-uid",
    "campaignId": "uuid",
    "playerName": "Gandalf",
    "displayName": "Daniel R.",
    "timestamp": "2026-04-20T..."
  }
  ```
- `PlayerStatus` renderiza `users.display_name` (nova fonte de verdade) em vez de `session_tokens.player_name`
- **Presence permanece "online"** — upgrade e sinal de rename/badge, NAO um evento de reconexao
- `combatants.player_character_id` permanece intacto — combate em andamento nao e afetado
- Broadcast e **best-effort** (consistente com secao 3.3 / Quinn): se falhar, DM re-hidrata no proximo ciclo de stale detection (15s) ou no proximo fetchFullState

### 16.4 Cadeia de reconexao durante upgrade (paralela a secao 4.2.5)

```
L1 — HAPPY PATH (~50ms, best case):
  updateUser() success -> POST /upgrade -> Phase 3 success
  -> broadcast player:identity-upgraded
  -> DM ve rename. Presence ininterrupta. Player ve nada.

L2 — REALTIME BLIP (~500ms, esperado):
  updateUser() success -> canal realtime reconecta com novo JWT
  -> untrack ~500ms -> re-track imediato
  -> DM ve breve idle -> online. Player ve skeleton/spinner < 1s.

L3 — SAGA PARTIAL FAILURE (~2s + recovery):
  updateUser() success, Phase 3 falha em step 6-11
  -> server marca users.upgrade_failed_at = now()
     (`lib/supabase/player-identity.ts:675-690`)
  -> client recebe 207 com retryable=true
  -> no proximo mount (ou botao "Tentar novamente"), client dispara
     POST /api/player-identity/upgrade-recovery
  -> recovery chama recoverUpgradePlayerIdentity()
     (`lib/supabase/player-identity.ts:587-669`)
  -> DM nao ve mudanca ate recovery completar.
  -> Player permanece funcional com identidade auth (JWT valido).

L4 — CLIENT CRASHA MID-SAGA (entre updateUser e POST /upgrade):
  updateUser() completou mas server saga nunca disparou.
  - users.upgrade_failed_at e NULL (server nunca soube)
  - session_tokens.user_id e NULL
  - Mas auth.uid() ja e a identidade auth
  -> No proximo mount: sessionStorage/localStorage ainda tem { tokenId }
  -> reconnect-from-storage (4.2.2) dispara rejoinAsPlayer()
  -> rejoinAsPlayer encontra token ativo, auto-approve
  -> Client detecta "upgrade never completed" via session_tokens.user_id
     IS NULL + auth.uid() matching session_tokens.anon_user_id
     (preservada via D1!)
  -> Client re-dispara POST /upgrade. Phase 1 idempotency check
     (`lib/supabase/player-identity.ts:242-271`) reconhece estado parcial.

L5 — TOTAL DISASTER (tudo crasha, storage limpo):
  Tudo crashou entre updateUser success e client reabrindo.
  localStorage + sessionStorage vazios.
  -> User loga fresh (email+password) -> novo JWT auth
  -> auth.uid() STILL matches session_tokens.anon_user_id (D1 preservada!)
  -> Client detecta "upgrade never completed" via
     session_tokens.user_id IS NULL AND auth.uid() matches anon_user_id
  -> Auto-fires recovery endpoint no mount.
  -> Saga Phase 3 completa backfill.
```

### 16.5 Protecao split-brain (Tab A + Tab B durante upgrade)

A secao 5 documenta split-brain para bfcache. Upgrade adiciona um vetor novo: multiplas tabs da mesma sessao durante a saga.

**Cenario**: Tab A faz upgrade, Tab B estava idle/hidden.

1. **Tab A** completa `updateUser()` -> JWT novo no cookie compartilhado
2. **Tab A** chama POST /upgrade -> Phase 3 executa -> `session_tokens.user_id = X`
3. **Tab B** (ainda hidden, com JWT antigo em memoria):
   - Proximo heartbeat: JWT em memoria e anon, mas cookie tem JWT auth
   - `supabase.auth.getSession()` retorna o novo session (cookie wins)
   - `auth.uid()` ainda e X (preservado por D1) -> heartbeat succeeds
4. **Tab B** proximo `visibilitychange` -> "visible":
   - Handler da secao 4.1.2 valida `token_owner`
   - `token_owner` (`session_tokens.anon_user_id`) ainda == X
   - `session_tokens.user_id` tambem == X
   - `auth.uid()` == X -> **tudo bate**, continua normalmente

**Phase 1 server-side reforca isso** (`lib/supabase/player-identity.ts:231-240`):
```
ownsViaAnon = tokenRow.anon_user_id === callerUserId
ownsViaAuth = tokenRow.user_id === callerUserId
if (!ownsViaAnon && !ownsViaAuth) -> reject
```
Isto aceita caller vindo **ou** pela identidade anon **ou** pela auth — ambas validas durante a transicao.

**Zero intervencao manual**. Nenhuma tab ve tela de "sessao transferida" porque a UUID e unica e preservada.

### 16.6 Edge cases

| Cenario | Comportamento |
|---|---|
| Cookie loss durante saga (cookies limpos entre updateUser e POST /upgrade) | JWT anon do client invalida. Client reconecta via sessionStorage (secao 4.2.1 — `{ tokenId }` ainda valido). Se getSession() retornar null -> signInAnonymously() -> **novo anon UUID** -> rejoinAsPlayer() via nome -> auto-approve transfer -> client detecta upgrade pendente e dispara recovery. Saga completa. |
| Nova tab abre durante saga | Tab A mid-saga, Tab B fresca. Tab B ve cookie JWT — pode ser anon (pre-updateUser) ou auth (pos-updateUser), depende do timing. Em ambos os casos, `auth.uid()` == X (D1). Tab B se registra normalmente. Quando broadcast `player:identity-upgraded` dispara, Tab B re-renderiza com `users.display_name` (ou ignora se ainda nao esta autenticada — UI degrada graciosamente). |
| User revoga token mid-saga | DM revoga `is_active=false` durante Phase 3. Phase 3 usa service client — **bypassa RLS**, UPDATE completa. Revogacao afeta heartbeats futuros, NAO a saga em voo. Apos saga, client ve `session:revoked` broadcast e segue fluxo padrao da secao 6.7. |
| `claimed_by_session_token` orfao | Se saga abortou antes do step 8 (`lib/supabase/player-identity.ts:352-397`), `player_characters.claimed_by_session_token` ainda aponta para o token. Recovery endpoint re-executa step 8 — WHERE clause `IN (SELECT id FROM session_tokens WHERE user_id = auth.uid())` trata o estado parcial. Idempotente. |
| `updateUser` falha (email ja existe) | Phase 2 aborta antes do POST /upgrade. Nenhum side-effect server-side. Anon session permanece valida. Client mostra erro "email ja cadastrado", usuario pode trocar email ou cancelar. Zero cleanup necessario. |
| Guest character migration falha (step 10) | `migrateGuestCharacterToAuth` lanca erro, saga retorna `migration_partial_failure` com `failed_step: 10`. Steps 6-9 ja commitaram (idempotentes). Recovery endpoint **omite** `guestCharacter` deliberadamente (`lib/supabase/player-identity.ts:658-660`) — evita double-insert. Usuario pode re-tentar guest character import manualmente pelo dashboard Epic 02. |

### 16.7 Anti-patterns especificos do upgrade

```
// NUNCA mostrar "voce foi desconectado" durante upgrade
//   -> JWT reissue e < 3s, dentro do tier silent-handle (secao 3.2)
// NUNCA forcar signOut/signIn como parte do upgrade
//   -> updateUser refresh e transparente, session_token_id preservado
// NUNCA limpar pocketdm:session:{sid} do storage durante upgrade
//   -> UUID preservada (D1), storage continua valido
// NUNCA assumir que anon_user_id muda no upgrade
//   -> Preservado por D1; e usado para audit + split-brain recovery (L4/L5)
// NUNCA invalidar session_token_id em storage apos upgrade
//   -> session_tokens.id e estavel; user_id e hard-claim adicional
// NUNCA fazer o broadcast player:identity-upgraded bloquear Phase 3
//   -> Broadcast e best-effort (`lib/supabase/player-identity.ts:565-568`),
//      saga nao falha se realtime estiver caido
// NUNCA chamar supabase.auth.updateUser server-side
//   -> Phase 2 DEVE ser client-side (JWT proprio). Server faz so Phase 1+3.
// NUNCA deixar Phase 3 nao-idempotente
//   -> Todo step usa ON CONFLICT ou WHERE filter que no-op apos sucesso
//      (ver `lib/supabase/player-identity.ts:26-39` — contrato explicito)
```

### 16.8 Integracao com criterios de aceite existentes (secao 10)

Nenhum criterio P0/P1 da secao 10 precisa mudar. Adicionar aos testes de validacao (secao 11):

| # | Cenario | Dispositivo | Passo | Resultado Esperado |
|---|---------|-------------|-------|-------------------|
| T16 | Upgrade anon->auth happy path | Desktop | Fluxo normal updateUser + POST /upgrade | < 1s, sem reconexao visivel, DM ve rename |
| T17 | Upgrade com realtime blip | Rede lenta | updateUser -> canal reconecta com novo JWT | Skeleton < 1s, depois online |
| T18 | Upgrade com saga partial failure | Qualquer | Forcar falha em step 9 (campaign_members) | Client recebe retryable=true, dispara recovery no proximo mount |
| T19 | Client crash entre updateUser e POST | Qualquer | Fechar aba apos updateUser | No proximo mount: client detecta upgrade pendente e dispara recovery automaticamente |
| T20 | Upgrade com total storage loss | Mobile + SO agressivo | Limpar storage apos updateUser, reabrir | Login fresh -> auth.uid() matches anon_user_id -> recovery dispara |
| T21 | Split-brain tab A completa, tab B idle | Desktop | Tab A faz upgrade, tab B volta apos 2min | Tab B reconecta transparente, sem "sessao transferida" |

---

## 17. Changelog da Review

| # | Origem | Problema | Resolucao |
|---|--------|----------|-----------|
| F1 | Quinn | sendBeacon nao e garantido | Documentado como best-effort. DM timer de stale detection (15s) como fallback absoluto (secao 4.3.5) |
| F2 | Quinn | Race condition reconnect-from-storage (token OK, canal morto) | Canal so cria apos authReady=true. fetchFullState no SUBSCRIBED. Ordem documentada (secao 4.2.2 nota) |
| F3 | Quinn | localStorage pode ser limpo pelo SO mobile | Tratado como best-effort. Fallback: rejoin por nome (secao 4.2.5, layer 4) |
| F4 | Quinn | Split-brain com bfcache | Validacao de token_owner no visibilitychange (secao 5). Sem session_nonce (Amelia: mais simples) |
| F5 | Quinn | Cookies + localStorage ambos limpos | Cadeia de 5 fallbacks documentada (secao 4.2.5). Rejoin por lista de nomes como layer 4 |
| W1 | Winston | player-disconnect precisa rate-limit | Endpoint idempotente — UPDATE no mesmo row e inofensivo (secao 4.1.3) |
| W2 | Winston | Client precisa lastSeenAt bruto | Server page envia lastSeenAt no registeredPlayersWithStatus (secao 4.3.3) |
| W3 | Winston | Ordem de operacoes no mount | Documentada: auth -> storage -> rejoin ou claim (secao 4.2.2) |
| A1 | Amelia | untrack() assincrono pode nao completar | Tratado como best-effort. Broadcast e mais confiavel (secao 4.1.1, secao 2.2 nota) |
| A2 | Amelia | session_nonce vs fetchFullState | Descartado nonce. Usa validacao de token_owner no visibilitychange (secao 5) |
| A3 | Amelia | reconnect-from-storage precisa timeout | Timeout de 8s no rejoinAsPlayer, fallback para fluxo normal (secao 4.2.2) |
| J1 | John | Overengineering tier > 30min | Simplificado: NUNCA exigir DM approval se token ativo. Eliminado tier intermediario (secao 3.1) |
| P1 | Paige (2026-04-20) | Story 01-E — identity upgrade nao documentado no spec | Adicionada secao 16 "Identity Upgrade — Cenario Especial de Reconexao" cobrindo trigger/phase 2 split, matriz de mudancas, perspectiva DM, cadeia de fallbacks L1-L5, split-brain multi-tab, edge cases, anti-patterns, testes T16-T21 |
| S1 | Sally | UX durante reconnect loading | Skeleton com nome + "Reconectando..." + fallback 5s para formulario (secao 3.2) |
| CR03-AC11 | Estabilidade Combate sprint (2026-04-26) | Silencio narrativo intencional do Mestre durante reconexao do jogador | Documentado abaixo (secao 18) |
| CR03-AC7 | Estabilidade Combate review (2026-04-26) | Mestre-side useEventResume nao implementado por restricao arquitetural | Documentado abaixo (secao 19) |

---

## 18. Silencio Narrativo do Mestre (CR-03 AC11)

**Regra Imutavel:** durante a reconexao de um jogador (qualquer cadeia L1-L5), o **Mestre NAO recebe qualquer notificacao** de que esse jogador caiu, esta reconectando, ou voltou. A reconexao acontece em silencio total do lado do Mestre.

### Por que essa regra existe

1. **Continuidade narrativa** — se o Mestre fosse alertado a cada blip de Wi-Fi de um jogador (mobile 4G no celular causa 5-10 transitorios em uma sessao de 3h), ele perderia foco do narrative beat para gerenciar conexoes.
2. **Falibilidade da deteccao** — a maioria das "desconexoes" sao transitorios sub-3s que se resolvem antes do Mestre poder reagir. Notificar cria fadiga de notificacao.
3. **Convivencia com presence** — o Mestre JA tem visibilidade do estado de cada jogador via lista de jogadores (last_seen_at + 45s threshold). Se quiser saber, olha. Sem notificacao push.

### O que conta como "notificacao" (proibido)

- Toast "Jogador X reconectou" — proibido.
- Som de notificacao — proibido.
- Banner persistente — proibido.
- Linha no log de combate — proibido.
- Mudanca visual no nome do jogador no momento exato do reconnect — proibido (a UI ja indica "active/inactive" via dot color baseado em last_seen_at, e isso e SUFICIENTE).

### O que e permitido

- Stale-detection passiva (last_seen_at > 45s vira o dot vermelho na lista) — permitida.
- Aprovacao explicita pra reconnect quando token foi revogado — permitida (e necessaria, ver L5).
- Aprovacao de late-join (jogador NOVO entrando mid-combat) — permitida (e diferente de reconnect).

### Implementacao verificada

- `lib/realtime/use-event-resume.ts` — fetch de `/events?since_seq=N` e fire-and-forget, nenhum side-effect alcanca o Mestre.
- `components/player/ReconnectingSkeleton.tsx` — skeleton e local ao componente do JOGADOR, nunca renderiza no lado do Mestre.
- `components/player/PlayerJoinClient.tsx:269-318` — skeleton timer arma quando `connectionStatus !== "connected"`, hide quando "connected". Sem broadcast de transicao.

---

## 19. Mestre-Side Resume — Restricao Arquitetural (CR-03 AC7)

**Status:** AC7 do CR-03 (story file linha 79) foi escrita assumindo que `useEventResume` poderia ser wired tanto em `PlayerJoinClient.tsx` (jogador) quanto em `CombatSessionClient.tsx` (Mestre) com a mesma API. **Apos a revisao Caminho A (2026-04-26), tres restricoes arquiteturais impedem isso na pratica:**

### 19.1 Endpoint /events e token-gated (jogador)

`/api/combat/[encounterId]/events?token=<plain>` valida o `token` query param contra `session_tokens.token` (mesma autenticacao do `/state`). O Mestre nao tem uma row em `session_tokens` — ele autentica via cookies Supabase auth. Pra o Mestre usar /events, o endpoint precisaria de:

- Path Bearer auth como alternativa (Authorization: Bearer <jwt>)
- Validacao de session ownership (sessions.owner_id === user.id)

Ambos sao mudancas nao-triviais e exigiriam novos testes de seguranca.

### 19.2 broadcast: { self: false } no canal do Mestre

`getDmChannel` cria o canal com `config: { broadcast: { self: false } }` ([lib/realtime/broadcast.ts:160-162](../lib/realtime/broadcast.ts#L160)). O Mestre **nunca recebe suas proprias broadcasts** — quem broadcasta nao recebe back. Logo o `noteSeqFromBroadcast` (que avanca o cursor) nunca seria chamado no Mestre. Cursor ficaria em 0; toda reconexao chamaria `/events?since_seq=0` retornando todos os 100 eventos do journal.

### 19.3 Mestre ja tem reconciliacao DB-driven

`useCombatResilience.reconnectAndSync()` ([lib/hooks/useCombatResilience.ts:194-218](../lib/hooks/useCombatResilience.ts#L194)) ja faz **defesa em profundidade pra reconnect do Mestre**:

- `replayOfflineQueue(sessionId)` — re-broadcasta acoes acumuladas
- `broadcastEvent("session:state_sync", ...)` — push do estado atual pra TODOS os jogadores (substitui o que o resume hook faria)
- `reconcileFullState(...)` — pull do estado autoritativo do DB

Isso ja entrega o resultado equivalente de um resume hook (sincronizar estado pos-reconnect) sem depender do journal endpoint que o Mestre nao acessa.

### 19.4 Decisao

**AC7 e considerado satisfeito via `useCombatResilience.reconnectAndSync`** em vez de via `useEventResume`. Esta decisao e:

- Documentada em [`_bmad-output/estabilidade-combate/01-TECH-SPEC.md`](../_bmad-output/estabilidade-combate/01-TECH-SPEC.md) §3.5
- Deferida pra Sprint 2: se a observabilidade pos-Beta-5 mostrar dessincronia frequente do Mestre, o trabalho sera (a) extender `/events` com Bearer auth path, (b) considerar broadcast: self enabled num canal dedicado, (c) wirear `useEventResume` no `CombatSessionClient.tsx`.

Ate la, a regra "Mestre nao perde estado em reconnect" continua valida — apenas implementada por mecanismo diferente do jogador.
