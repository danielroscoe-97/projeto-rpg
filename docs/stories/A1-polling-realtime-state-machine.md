# A.1 — Coordenacao Polling/Realtime via State Machine

**Tipo:** Bug / Melhoria de infraestrutura  
**Prioridade:** Alta  
**Estimativa:** 5 pontos  
**Componente:** Player Combat Client (realtime/polling)

---

## Resumo

O `PlayerJoinClient` possui multiplos caminhos de atualizacao de estado que competem entre si sem nenhuma coordenacao central. Quando o WebSocket desconecta e reconecta, tanto polling quanto realtime rodam simultaneamente, causando animacoes de HP duplicadas, audio de death save tocando duas vezes, estado sobrescrito com dados obsoletos e duplicacao de combatentes. Esta story implementa uma state machine de conexao que coordena de forma deterministica quando cada mecanismo de atualizacao deve estar ativo.

---

## Contexto e Problema

O arquivo `components/player/PlayerJoinClient.tsx` (1297 linhas) gerencia a experiencia do jogador em combate. Ele possui **6 caminhos concorrentes** de atualizacao de estado:

| Mecanismo | Linhas | Intervalo | Quando ativo |
|---|---|---|---|
| Broadcast handlers (realtime) | 435-719 | Evento-driven | Canal SUBSCRIBED |
| Polling fallback (3s apos disconnect) | 903-907 | 2s (desktop) / 5s (mobile) | Apos `startPolling()` |
| Turn-sync polling | 913-932 | 3s (skip se broadcast < 2s) | `active === true` |
| Late-join polling | 813-859 | 5s (inicio apos 3s) | `lateJoinStatus` waiting/polling/rejected |
| Visibility change handler | 862-898 | Evento-driven | Tab visivel + desconectado |
| Full state fetch (reconnect) | 376-420 | Uma vez | Canal re-SUBSCRIBED |

### Sintomas observados

1. **Animacoes de HP delta disparando 2x** — Polling traz o novo HP ao mesmo tempo que o broadcast. Ambos calculam delta e disparam `setHpDelta`.
2. **Audio/vibracao de death save duplicados** — O handler de `combat:hp_update` (linhas 480-506) toca audio quando `death_saves` atinge 3 successos/falhas. Polling traz o mesmo estado e o handler roda novamente.
3. **Estado sobrescrito com dados obsoletos** — Polling retorna snapshot do servidor, mas o broadcast ja trouxe o dado mais recente. O polling sobrescreve de volta.
4. **Duplicacao de jogadores** — `combat:combatant_add` broadcast e polling `fetchFullState` adicionam o mesmo combatente concorrentemente.

### Causa raiz

Nao existe coordenacao entre os mecanismos. Especificamente:
- `startPolling()` (linha 903) roda independente do status do canal — nao ha verificacao se o canal voltou a SUBSCRIBED entre o timer de 3s e a execucao.
- Turn-sync polling (linha 913) roda **sempre** que `active === true`, mesmo com canal SUBSCRIBED e broadcasts chegando normalmente.
- O visibility handler (linha 868) faz `fetchFullState()` **e** tenta reconectar o canal em paralelo, sem aguardar um ou outro.
- Nao ha backoff exponencial no polling — intervalo fixo de 2s/5s.

---

## Criterios de Aceite

1. **State machine de conexao** — Criar uma state machine com estados: `CONNECTED` -> `RECONNECTING` -> `POLLING_FALLBACK` -> `CONNECTED`. O estado deve ser acessivel via ref (para evitar re-renders) e opcionalmente exposto para o `SyncIndicator`.

2. **Suprimir ALL polling quando SUBSCRIBED** — Quando o canal realtime estiver no estado `SUBSCRIBED`, **todos** os pollings devem ser suprimidos:
   - `startPolling()` (fallback) — nao deve iniciar
   - Turn-sync polling (intervalo de 3s) — nao deve executar fetch
   - Late-join polling — esse pode continuar pois tem proposito diferente (detectar aceitacao pelo DM)

3. **Visibility handler: AWAIT fetch ANTES de reconectar** — Na linha 868, o `fetchFullState()` deve ser **aguardado** (`await`) antes de chamar `createChannelRef.current?.()`. Isso garante que o estado local esta atualizado antes do canal comecar a receber broadcasts, evitando calculos de delta incorretos.

4. **Backoff exponencial no polling** — Quando em `POLLING_FALLBACK`, o intervalo de polling deve seguir backoff exponencial: `2s -> 4s -> 8s -> 16s -> max 30s`. Ao transicionar de volta para `CONNECTED`, resetar o backoff.

5. **Desabilitar turn-sync durante late-join "waiting"** — Quando `lateJoinStatus === "waiting"`, o turn-sync polling (linhas 913-932) deve ser desativado. O jogador ainda nao esta registrado no combate, entao sincronizar turno nao faz sentido e gera requests desnecessarios.

6. **Transicao POLLING_FALLBACK -> CONNECTED** — Ao transicionar de volta para CONNECTED (canal SUBSCRIBED):
   - Executar **um unico** `fetchFullState()` final para reconciliar
   - Parar **todos** os intervals de polling imediatamente
   - Resetar backoff
   - A partir deste ponto, apenas broadcasts atualizam o estado

7. **Logging de estado de conexao** — Adicionar `console.debug` (nao `console.log`) com prefixo `[PocketDM:conn]` para transicoes de estado. Exemplos:
   - `[PocketDM:conn] CONNECTED -> RECONNECTING (CHANNEL_ERROR)`
   - `[PocketDM:conn] RECONNECTING -> POLLING_FALLBACK (timeout 3s)`
   - `[PocketDM:conn] POLLING_FALLBACK -> CONNECTED (SUBSCRIBED)`
   - `[PocketDM:conn] polling suppressed — channel SUBSCRIBED`

---

## Abordagem Tecnica

### 1. Definicao da State Machine

```typescript
type ConnectionState = "CONNECTED" | "RECONNECTING" | "POLLING_FALLBACK";

// Ref-based para evitar re-renders em cada transicao
const connStateRef = useRef<ConnectionState>("RECONNECTING");

function transitionTo(next: ConnectionState, reason?: string) {
  const prev = connStateRef.current;
  if (prev === next) return;
  console.debug(`[PocketDM:conn] ${prev} -> ${next}${reason ? ` (${reason})` : ""}`);
  connStateRef.current = next;
  // Efeitos colaterais por transicao:
  if (next === "CONNECTED") {
    stopAllPolling();
    resetBackoff();
  }
  if (next === "POLLING_FALLBACK") {
    startPollingWithBackoff(encounterIdRef.current);
  }
}
```

### 2. Integracao no subscribe callback (linhas 727-768)

```
SUBSCRIBED  -> transitionTo("CONNECTED", "SUBSCRIBED")
              -> fetchFullState (uma vez, reconciliacao)
              -> stopAllPolling()

CLOSED / CHANNEL_ERROR  -> transitionTo("RECONNECTING", status)
                         -> agendar transicao para POLLING_FALLBACK apos 3s
                         -> iniciar reconnect com backoff exponencial

TIMED_OUT  -> mesmo tratamento de CLOSED
```

### 3. Guard no turn-sync polling (linhas 913-932)

Adicionar verificacao no inicio do `setInterval` callback:

```typescript
// Dentro do setInterval:
if (connStateRef.current === "CONNECTED") {
  // Broadcast esta funcionando — skip polling
  if (Date.now() - lastTurnBroadcastRef.current < 2000) return;
  // Nenhum broadcast recente — fetch como safety net
  fetchFullState(eid);
} else if (connStateRef.current === "POLLING_FALLBACK") {
  fetchFullState(eid);
}
// RECONNECTING — nao fazer nada, aguardar transicao
```

**Alternativa preferida:** Quando `CONNECTED`, o turn-sync polling pode rodar com intervalo muito maior (15s) como safety net, em vez de 3s. Isso reduz chamadas de API em ~80% durante operacao normal.

### 4. Visibility handler corrigido (linhas 862-898)

```typescript
const handleVisibilityChange = async () => {
  if (document.visibilityState !== "visible") return;
  
  // 1. Buscar estado atualizado PRIMEIRO
  if (encounterIdRef.current) {
    await fetchFullState(encounterIdRef.current);
  }
  
  // 2. SO ENTAO reconectar canal (se necessario)
  if (disconnectedAtRef.current && supabaseRef.current) {
    // ... reconexao do canal
  }
};
```

### 5. Polling com backoff exponencial

```typescript
const pollBackoffRef = useRef(2000);

function startPollingWithBackoff(eid: string | null) {
  if (!eid) return;
  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  
  const poll = () => {
    if (connStateRef.current !== "POLLING_FALLBACK") return;
    fetchFullState(eid);
    // Aumentar intervalo para proximo poll
    pollBackoffRef.current = Math.min(pollBackoffRef.current * 2, 30000);
    // Re-agendar com novo intervalo
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(poll, pollBackoffRef.current);
  };
  
  pollBackoffRef.current = 2000;
  pollIntervalRef.current = setInterval(poll, pollBackoffRef.current);
}
```

### 6. Diagrama de transicoes

```
                    subscribe("SUBSCRIBED")
                  +--------------------------+
                  |                          |
                  v                          |
  +----------+   |   +---------------+      |   +-------------------+
  | CONNECTED |<--+   | RECONNECTING  |------+   | POLLING_FALLBACK  |
  +----------+       +---------------+           +-------------------+
       |                    ^    |                       ^
       |   CLOSED/ERROR     |    |  timer 3s             |
       +------------------->+    +---------------------->+
                                                         |
                            +----------------------------+
                            | subscribe("SUBSCRIBED")
                            v
                      +----------+
                      | CONNECTED |
                      +----------+
                      (fetchFullState + stopPolling)
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---|---|
| `components/player/PlayerJoinClient.tsx` | Principal — adicionar state machine, guards nos pollings, corrigir visibility handler |
| `lib/realtime/use-realtime-channel.ts` | Verificar se o hook externo precisa expor estado de conexao de forma compativel (linhas 75-96). **Nota:** PlayerJoinClient nao usa este hook — ele monta o canal inline. Nao modificar este arquivo a menos que se decida extrair a logica para ca. |
| `components/player/SyncIndicator.tsx` | (Opcional) Se quiser mostrar estado `RECONNECTING` vs `POLLING_FALLBACK` de forma diferente no indicador visual |

---

## Plano de Testes

### Testes manuais (obrigatorios)

1. **Desconexao simples** — Abrir player view, desabilitar wifi por 5s, reabilitar.
   - [ ] Verificar que transicao foi: CONNECTED -> RECONNECTING -> CONNECTED
   - [ ] Verificar que nao houve polling (desconexao < 3s)
   - [ ] Verificar que `fetchFullState` foi chamado uma vez na reconexao

2. **Desconexao longa (>3s)** — Desabilitar wifi por 10s, reabilitar.
   - [ ] Verificar transicao: CONNECTED -> RECONNECTING -> POLLING_FALLBACK -> CONNECTED
   - [ ] Verificar backoff exponencial nos logs (2s, 4s, 8s...)
   - [ ] Verificar que polling parou ao reconectar

3. **HP update durante polling** — Enquanto em POLLING_FALLBACK, DM altera HP de um jogador.
   - [ ] Verificar que animacao de delta HP aparece apenas uma vez (nao duplicada)
   - [ ] Verificar que audio de death save toca apenas uma vez

4. **Visibility change (telefone bloqueado)** — Bloquear telefone por 30s durante combate, desbloquear.
   - [ ] Verificar que `fetchFullState` completa ANTES de reconectar canal
   - [ ] Verificar que estado do board esta correto apos desbloquear

5. **Late-join durante desconexao** — Iniciar late-join, desconectar wifi.
   - [ ] Verificar que late-join polling continua funcionando independente
   - [ ] Verificar que turn-sync polling NAO roda enquanto `lateJoinStatus === "waiting"`

6. **Reconexao rapida** — Desconectar e reconectar wifi rapidamente (< 1s).
   - [ ] Verificar que nenhum polling foi iniciado
   - [ ] Verificar que nao ha duplicacao de canais

### Testes automatizados (recomendados)

- **Unit test** para a logica da state machine (transicoes e efeitos colaterais)
- **Unit test** para o backoff exponencial (2s -> 4s -> 8s -> 16s -> 30s cap)
- **Unit test** para guard do turn-sync polling (skip quando CONNECTED com broadcast recente)

### Verificacao de logs

Em todos os testes acima, verificar no console do browser que as mensagens `[PocketDM:conn]` aparecem corretamente com as transicoes esperadas.

---

## Notas de Paridade

- **Escopo:** Esta mudanca afeta **apenas** o `PlayerJoinClient` (visao do jogador conectado via realtime).
- **Guest combat** (`GuestCombatClient`) usa Zustand store localmente, sem realtime — **nao e afetado**.
- **DM view** (`DMEncounterPanel`) e o emissor de broadcasts, nao receptor — **nao e afetado**.
- O hook `lib/realtime/use-realtime-channel.ts` nao e usado pelo `PlayerJoinClient` (que monta o canal inline). Avaliar se faz sentido migrar para o hook ou manter inline com a state machine.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| State machine adiciona complexidade ao componente ja grande (1297 linhas) | Manter a state machine como ref + funcao pura `transitionTo()`. Se crescer, extrair para hook `useConnectionStateMachine()` em `lib/realtime/`. |
| Suprimir turn-sync polling pode causar dessincronizacao se broadcast for silenciosamente perdido | Manter turn-sync como safety net com intervalo maior (15s) quando CONNECTED, em vez de desabilitar completamente. |
| `await fetchFullState()` no visibility handler pode atrasar reconexao visual | O fetch leva ~200-500ms tipicamente. O `SyncIndicator` ja mostra "reconectando", entao UX nao e impactada. |
| Backoff exponencial pode deixar jogador sem updates por 30s em cenario extremo | Cap de 30s e aceitavel — se o jogador esta offline ha 30s+, o polling e apenas best-effort. |

---

## Definition of Done

- [ ] State machine implementada com transicoes CONNECTED / RECONNECTING / POLLING_FALLBACK
- [ ] Turn-sync polling suprimido (ou intervalo 15s) quando canal SUBSCRIBED
- [ ] Visibility handler aguarda fetchFullState antes de reconectar
- [ ] Backoff exponencial no polling (2s -> 30s cap)
- [ ] Turn-sync desativado durante late-join "waiting"
- [ ] Transicao POLLING_FALLBACK -> CONNECTED faz fetch final e para polling
- [ ] Logs `[PocketDM:conn]` em todas as transicoes
- [ ] Testes manuais 1-6 passando
- [ ] Nenhuma regressao na visao do guest ou do DM
