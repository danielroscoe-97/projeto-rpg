# A.3 — Broadcast `session:ended` para Players

**Epic:** A — Estabilidade do Realtime Player  
**Prioridade:** Alta (blocker para beta test)  
**Estimativa:** 3 SP  
**Arquivos principais:** `lib/hooks/useCombatActions.ts`, `components/player/PlayerJoinClient.tsx`

---

## Resumo

Quando o DM encerra uma sessao de combate, nenhum broadcast e enviado aos jogadores conectados. Os players continuam em polling infinito contra uma sessao morta, sem indicacao visual de que o combate terminou. Esta story adiciona o evento `session:ended` ao fluxo de encerramento do DM e o handler correspondente no lado do player, com cleanup de todos os timers/intervals e UI de "Sessao encerrada".

---

## Contexto

### Fluxo atual do DM ao encerrar

No `lib/hooks/useCombatActions.ts` (linha ~490), a funcao `handleEndEncounter` executa:

```typescript
const handleEndEncounter = useCallback(async () => {
  const { encounter_id } = useCombatStore.getState();
  if (!encounter_id) return;
  const sid = getSessionId();
  try {
    await persistEndEncounter(encounter_id);   // is_active = false no DB
    broadcastEvent(sid, {
      type: "session:state_sync",              // <-- broadcast atual
      combatants: [],
      current_turn_index: -1,
      round_number: 0,
    });
    await expireSessionTokens(sid);            // invalida tokens
    cleanupDmChannel();                        // desconecta canal DM
    onNavigate("/app/dashboard");
  } catch (err) { ... }
}, [...]);
```

**Problema:** O broadcast enviado e um `session:state_sync` com combatants vazio e turn_index -1. No lado do player (`PlayerJoinClient.tsx`, linha ~437), o handler de `session:state_sync` faz:

```typescript
.on("broadcast", { event: "session:state_sync" }, ({ payload }) => {
  updateCombatants(payload.combatants);   // array vazio
  setRound(payload.round_number);         // 0
  updateTurnIndex(payload.current_turn_index); // -1
  setActive(true);   // <-- BUG: seta active=true mesmo com sessao encerrada
  ...
})
```

O player recebe o state_sync, limpa os combatentes, mas mantem `active=true`. Resultado:
- O player ve uma tela de combate vazia (sem combatentes, sem indicacao de encerramento)
- Polling de turn-sync continua rodando (interval de 3s contra `/api/session/{id}/state`)
- Polling de fallback pode continuar caso esteja ativo
- Canal realtime permanece inscrito (sem unsubscribe)
- Se o player estava em late-join "waiting", continua esperando indefinidamente

### O que o polling retorna apos encerramento

A API `/api/session/[id]/state` busca `encounters` com `is_active=true`. Apos `persistEndEncounter`, nenhum encounter ativo existe, entao retorna `{ data: { encounter: null, combatants: [] } }`. O handler de `fetchFullState` no player nao trata encounter null — simplesmente ignora o bloco `if (data.encounter)`, deixando o estado anterior intocado.

### Timers/intervals ativos no player que precisam ser limpos

| Ref | Tipo | Proposito | Risco se nao limpo |
|-----|------|-----------|---------------------|
| `turnPollRef` | `setInterval(3s)` | Polling de turn-sync | Requests infinitos contra sessao morta |
| `pollIntervalRef` | `setInterval(2-5s)` | Polling fallback (reconexao) | Requests infinitos |
| `pollFallbackTimerRef` | `setTimeout(3s)` | Timer para iniciar polling fallback | Pode iniciar polling apos encerramento |
| `reconnectTimerRef` | `setTimeout(backoff)` | Reconexao exponencial do WebSocket | Tenta reconectar a canal ja limpo |
| `connectionTimerRef` | `setTimeout` | Debounce de status de conexao | Menor impacto, mas deve ser limpo |
| `lateJoinTimeoutRef` | `setTimeout(15s)` | Timeout de resposta do DM ao late-join | Player fica esperando |
| `lateJoinMaxTimeoutRef` | `setTimeout(2min)` | Timeout maximo do late-join | Player fica esperando |
| `hpDeltaTimerRef` | `setTimeout(1.5s)` | Visual feedback de HP delta | Impacto visual menor |
| `sessionRevokedTimerRef` | `setTimeout(5s)` | Banner de sessao revogada | Impacto visual menor |
| `audioRefreshTimerRef` | `setTimeout(50min)` | Refresh de URLs de audio | Request desnecessario |

---

## Criterios de Aceite

1. **Broadcast do DM:** Quando o DM clica "End Session", um broadcast `session:ended` e enviado a todos os players conectados, ANTES de `expireSessionTokens` e `cleanupDmChannel`.
2. **Overlay no player:** O player recebe o evento e exibe uma UI overlay "Sessao encerrada" (usa chave i18n existente `session_ended` / `session_ended_detail`).
3. **Cleanup de intervals:** Todos os polling intervals (turn-sync, fallback, late-join) sao limpos ao receber `session:ended`.
4. **Unsubscribe do canal:** O canal realtime e desconectado (unsubscribe) apos receber o evento.
5. **Leaderboard opcional:** Se o DM enviou `session:combat_stats` antes de `session:ended`, o player pode ver o leaderboard/resumo do combate antes do overlay final.
6. **Late-join abortado:** Se o player estava em late-join com status "waiting"/"polling", mostrar mensagem especifica: "Sessao encerrada antes de voce entrar" (nova chave i18n).
7. **Paridade anonimo/autenticado:** Tanto players anonimos (`/join/[token]`) quanto autenticados (`/invite`) recebem e tratam o evento identicamente (ambos usam `PlayerJoinClient`).

---

## Abordagem Tecnica

### 1. Novo tipo de evento realtime

Em `lib/types/realtime.ts`:

```typescript
// Adicionar ao union type RealtimeEventType:
| "session:ended"

// Nova interface:
export interface RealtimeSessionEnded {
  type: "session:ended";
  /** Motivo do encerramento — permite UI diferente no futuro */
  reason?: "dm_ended" | "session_expired";
}

// Adicionar ao union RealtimeEvent:
| RealtimeSessionEnded

// Adicionar ao union SanitizedEvent (passthrough — sem dados sensiveis):
| RealtimeSessionEnded
```

### 2. Broadcast no DM (useCombatActions.ts)

Na funcao `handleEndEncounter`, adicionar o broadcast de `session:ended` ANTES do `expireSessionTokens` e `cleanupDmChannel`:

```typescript
const handleEndEncounter = useCallback(async () => {
  const { encounter_id } = useCombatStore.getState();
  if (!encounter_id) return;
  const sid = getSessionId();
  try {
    await persistEndEncounter(encounter_id);
    // Broadcast existente de state_sync (manter para retrocompatibilidade)
    broadcastEvent(sid, {
      type: "session:state_sync",
      combatants: [],
      current_turn_index: -1,
      round_number: 0,
    });
    // NOVO: broadcast session:ended — player usa isso como sinal definitivo
    broadcastEvent(sid, {
      type: "session:ended",
      reason: "dm_ended",
    });
    await expireSessionTokens(sid);
    cleanupDmChannel();
    onNavigate("/app/dashboard");
  } catch (err) { ... }
}, [...]);
```

**Importante:** O `session:ended` deve ser enviado DEPOIS do `session:state_sync` (para o player processar o state_sync primeiro se necessario) mas ANTES de `expireSessionTokens` e `cleanupDmChannel` (para o canal ainda estar ativo).

### 3. Sanitizacao no broadcast.ts

Em `lib/realtime/broadcast.ts`, na funcao `sanitizePayload`, adicionar passthrough para o novo evento:

```typescript
// session:ended passa direto — sem dados sensiveis
if (event.type === "session:ended") return event;
```

### 4. Handler no player (PlayerJoinClient.tsx)

Adicionar novo listener de broadcast no bloco de setup do canal (apos os listeners existentes):

```typescript
.on("broadcast", { event: "session:ended" }, ({ payload }) => {
  // 1. Setar estado de sessao encerrada
  setSessionEnded(true);
  setActive(false);

  // 2. Se estava em late-join waiting, marcar como "session ended"
  if (["waiting", "polling"].includes(lateJoinStatus)) {
    setLateJoinStatus("idle"); // Resetar para sair do fluxo de late-join
    setSessionEndedDuringLateJoin(true);
  }

  // 3. Limpar TODOS os timers e intervals
  clearAllTimers();

  // 4. Unsubscribe do canal realtime (com delay para garantir processamento)
  setTimeout(() => {
    if (channelRef.current) {
      supabaseRef.current?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabaseRef.current?.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
  }, 500);
})
```

### 5. Funcao de cleanup centralizada

Extrair uma funcao `clearAllTimers()` para evitar duplicacao com o cleanup do useEffect:

```typescript
const clearAllTimers = useCallback(() => {
  if (turnPollRef.current) { clearInterval(turnPollRef.current); turnPollRef.current = null; }
  if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  if (pollFallbackTimerRef.current) { clearTimeout(pollFallbackTimerRef.current); pollFallbackTimerRef.current = null; }
  if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
  if (connectionTimerRef.current) { clearTimeout(connectionTimerRef.current); connectionTimerRef.current = null; }
  if (lateJoinTimeoutRef.current) { clearTimeout(lateJoinTimeoutRef.current); lateJoinTimeoutRef.current = null; }
  if (lateJoinMaxTimeoutRef.current) { clearTimeout(lateJoinMaxTimeoutRef.current); lateJoinMaxTimeoutRef.current = null; }
  if (hpDeltaTimerRef.current) { clearTimeout(hpDeltaTimerRef.current); hpDeltaTimerRef.current = null; }
  if (sessionRevokedTimerRef.current) { clearTimeout(sessionRevokedTimerRef.current); sessionRevokedTimerRef.current = null; }
  if (audioRefreshTimerRef.current) { clearTimeout(audioRefreshTimerRef.current); audioRefreshTimerRef.current = null; }
}, []);
```

**Nota:** A funcao de cleanup existente no `return` do useEffect (linhas ~778-806) deve ser refatorada para chamar `clearAllTimers()` tambem, eliminando duplicacao.

### 6. Novos estados React

```typescript
const [sessionEnded, setSessionEnded] = useState(false);
const [sessionEndedDuringLateJoin, setSessionEndedDuringLateJoin] = useState(false);
```

### 7. UI overlay de sessao encerrada

**Decisoes de UX (Party Mode 2026-04-02):**

| Decisao | Resolucao |
|---------|-----------|
| **Tipo** | Modal bloqueante full-screen, `bg-black/80` backdrop, board visivel desfocado por tras |
| **CTA** | Botao unico: **"Voltar ao inicio"** → redireciona para `/` (todos os modos) |
| **Transicao** | Overlay aparece SOBRE o board (board nao some), fade-in 300ms via Framer Motion |
| **Reload pos-ended** | Redireciona para `/` — sem tela de erro |
| **Msg late-join waiting** | *"O combate foi encerrado pelo mestre. Voce pode tentar novamente na proxima sessao."* + mesmo CTA "Voltar ao inicio" |

Adicionar antes do return principal do componente, DEPOIS do check de leaderboard existente (`session:combat_stats`) para que o player possa ver o leaderboard primeiro:

```typescript
if (sessionEnded && !combatStatsData) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="text-center space-y-4">
        <h1 className="text-foreground text-xl font-semibold">
          {t("session_ended")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {sessionEndedDuringLateJoin
            ? t("session_ended_before_join")
            : t("session_ended_detail")}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-2 bg-gold text-black rounded-md font-medium hover:bg-gold/90 transition-colors"
        >
          {t("back_to_home")}
        </button>
      </div>
    </motion.div>
  );
}
```

### 8. Novas chaves i18n

Em `messages/pt-BR.json` e `messages/en.json`, adicionar:

```json
"session_ended_before_join": "O combate foi encerrado pelo mestre. Voce pode tentar novamente na proxima sessao.",
"back_to_home": "Voltar ao inicio"
```

```json
"session_ended_before_join": "The combat was ended by the DM. You can try again next session.",
"back_to_home": "Back to home"
```

### 9. Guest Combat (GuestCombatClient) — sem impacto

O `GuestCombatClient.tsx` nao usa broadcasts. A funcao `handleEndEncounter` no guest (linha ~1134) apenas mostra leaderboard e chama `resetCombat()` localmente. Nenhum canal realtime precisa ser notificado porque o guest e um modo single-player local. **Nenhuma mudanca necessaria.**

### 10. CombatSessionClient.tsx — broadcast de stats antes de ended

No `CombatSessionClient.tsx`, o fluxo de encerramento envolve:
1. DM clica "End Session" → `handleEndEncounter` (interceptado para modal de nome)
2. Modal de nome salvo → `proceedAfterNaming` → broadcast `session:combat_stats` → mostra leaderboard local
3. DM fecha leaderboard → `handleDismissLeaderboard` → chama `doEndEncounter` (que e `handleEndEncounter` de `useCombatActions`)

Isso significa que `session:combat_stats` ja e enviado ANTES de `session:ended`, que e o comportamento correto. O player recebe stats, mostra leaderboard, e depois recebe `session:ended` para transicionar para o overlay final.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/realtime.ts` | Novo tipo `session:ended` no union `RealtimeEventType`, nova interface `RealtimeSessionEnded`, adicionar aos unions `RealtimeEvent` e `SanitizedEvent` |
| `lib/realtime/broadcast.ts` | Passthrough de `session:ended` em `sanitizePayload()` |
| `lib/hooks/useCombatActions.ts` | Broadcast `session:ended` em `handleEndEncounter`, apos state_sync e antes de expireTokens |
| `components/player/PlayerJoinClient.tsx` | Handler de `session:ended`, estados `sessionEnded`/`sessionEndedDuringLateJoin`, funcao `clearAllTimers()`, UI overlay, refatorar cleanup do useEffect |
| `messages/pt-BR.json` | Nova chave `session_ended_before_join` |
| `messages/en.json` | Nova chave `session_ended_before_join` |
| `lib/realtime/__tests__/broadcast-sanitization.test.ts` | Teste de passthrough para `session:ended` |

---

## Plano de Testes

### Testes Unitarios

1. **Sanitizacao (broadcast-sanitization.test.ts):** Evento `session:ended` passa por `sanitizePayload` sem alteracao.
2. **Tipo (compile-time):** `RealtimeSessionEnded` e aceito em `broadcastEvent` sem erro de TypeScript.

### Testes de Integracao (manual ou E2E)

1. **Fluxo basico — DM encerra, player ve overlay:**
   - Abrir DM em aba 1, player em aba 2 (via `/join/[token]`)
   - DM inicia combate, player ve combatentes
   - DM clica "End Session" → nomeia encounter → ve leaderboard → fecha
   - Player ve leaderboard (se houver stats) e em seguida overlay "Sessao encerrada"
   - Verificar no DevTools do player: nenhum request periodico apos overlay

2. **Late-join interrompido:**
   - Player entra em late-join (status "waiting" ou "polling")
   - DM encerra sessao antes de aprovar/rejeitar
   - Player ve mensagem especifica: "Sessao encerrada antes de voce entrar"

3. **Player autenticado (via /invite):**
   - Repetir teste 1 com player logado via fluxo de convite
   - Comportamento deve ser identico ao anonimo

4. **Reconexao pos-encerramento:**
   - Player perde conexao (DevTools > Offline) ANTES do DM encerrar
   - DM encerra sessao
   - Player reconecta → polling busca state → encounter=null
   - Verificar que o player nao fica em limbo (deve cair no overlay ou lobby)

5. **Canal limpo:**
   - Apos overlay, verificar no DevTools (WebSocket frames) que nao ha mais mensagens no canal
   - Verificar que `channelRef.current` e `presenceChannelRef.current` sao null

6. **Multiplos players:**
   - 2+ players conectados
   - DM encerra → TODOS os players veem overlay simultaneamente

### Edge Cases

7. **DM encerra sem stats:** Se nao houve dano/cura (leaderboard vazio), player deve ir direto para overlay sem leaderboard.
8. **DM encerra muito rapido:** DM inicia e encerra combate em <5 segundos — player nao deve crashar.
9. **Broadcast perdido:** Se o broadcast `session:ended` nao chega (rede instavel), o polling fallback eventualmente detecta `encounter=null` e deve tratar como encerramento. Isso e um **cenario nao coberto por esta story** — deve ser tratado em A.1 (State Machine) ou story futura.

---

## Notas de Paridade

- **Guest Combat (`GuestCombatClient`):** Modo single-player local, sem canal realtime, sem players conectados. O DM e o unico usuario. `handleEndEncounter` no guest apenas mostra leaderboard e reseta estado local. **Nenhuma mudanca necessaria.**
- **DM Combat (`CombatSessionClient`):** O DM e o emissor do `session:ended`, nao o receptor. O broadcast tem `self: false`, entao o DM nao recebe de volta. O fluxo de encerramento do DM ja esta correto (navega para dashboard). **Nenhuma mudanca necessaria.**
- **Player anonimo vs autenticado:** Ambos usam `PlayerJoinClient.tsx` como componente principal. O handler de `session:ended` e registrado no mesmo local para ambos. **Paridade automatica.**
- **Fluxo /join vs /invite:** A pagina `/join/[token]/page.tsx` ja tem um render condicional para `session_ended` quando a sessao e carregada como inativa no server-side. O novo overlay cobre o caso de encerramento em tempo real (enquanto o player esta conectado). Os dois fluxos sao complementares, nao duplicados.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Broadcast `session:ended` nao chega (rede instavel) | Edge case documentado — polling fallback deveria detectar encounter=null, mas nao trata hoje. Mitigacao futura em A.1 ou story separada. |
| Race condition entre `session:ended` e `expireSessionTokens` | O broadcast e enviado ANTES de expirar tokens, e o unsubscribe no player tem delay de 500ms, garantindo que o evento chega antes da invalidacao. |
| Ordem dos broadcasts (state_sync antes de ended) | Supabase Realtime envia na ordem de chamada. O state_sync e chamado antes de ended no codigo, garantindo a ordem. |
| Player abre aba antiga apos encerramento | O server-side render em `/join/[token]/page.tsx` ja verifica `is_active` e mostra tela estatica de sessao encerrada. Coberto. |

---

## Definicao de Pronto

- [ ] Tipo `session:ended` adicionado em `lib/types/realtime.ts` (EventType + interface + unions)
- [ ] Passthrough em `sanitizePayload` no `broadcast.ts`
- [ ] Broadcast `session:ended` emitido em `handleEndEncounter` no `useCombatActions.ts`
- [ ] Handler `session:ended` no `PlayerJoinClient.tsx` com cleanup de timers e unsubscribe
- [ ] UI overlay "Sessao encerrada" exibida ao player
- [ ] Mensagem diferenciada para late-join interrompido
- [ ] Chaves i18n adicionadas em pt-BR e en
- [ ] Teste de sanitizacao passando
- [ ] QA manual: DM encerra → player ve overlay, polling para, canal desconecta
- [ ] QA manual: late-join interrompido mostra mensagem correta
- [ ] QA manual: multiplos players recebem overlay simultaneamente
- [ ] Code review aprovado
