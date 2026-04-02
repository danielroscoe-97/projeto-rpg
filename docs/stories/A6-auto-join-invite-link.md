# A.6 — Auto-Join Players via Invite Link

**Épica:** A — Realtime & Sincronização de Estado  
**Prioridade:** BLOQUEADOR  
**Estimativa:** M (Médio — 2–4h)  
**Superfície:** Player (`/join/[token]` anônimo + `/invite` autenticado)  
**Fora do escopo:** `/try` (modo Guest/DM — sem canal de jogador)

---

## Resumo

Jogadores que já estão na página `/join` com registro concluído (`isRegistered = true`) **não são adicionados automaticamente ao combate** quando o DM inicia a sessão. O resultado prático: o player fica parado no lobby enquanto o combate começa sem ele — obrigando refresh manual ou re-entrada no link a cada início de sessão.

Este é um bug de fluxo crítico que ocorre **no início de toda sessão**, afetando 100% das partidas que usam convite de link.

---

## Contexto (Achados da Investigação)

### O que acontece hoje

A investigação revelou que a infraestrutura de broadcast **já existe parcialmente**, mas há uma lacuna de lógica no lado do jogador.

#### 1. Como o DM inicia o combate (`CombatSessionClient.tsx`, linhas 246–260 e 276–290)

Existem dois pontos de partida de combate no `CombatSessionClient.tsx`:

**Ponto A — combate iniciado da página de setup (nova sessão):**
```ts
await persistInitiativeAndStartCombat(store.encounter_id, sorted);
store.startCombat();
broadcastEvent(sessionId ?? "", {
  type: "session:state_sync",
  combatants: sorted,
  current_turn_index: 0,
  round_number: 1,
  encounter_id: store.encounter_id!,
});
```

**Ponto B — combate iniciado da página de sessão existente (nova encounter):**
```ts
await persistInitiativeAndStartCombat(encounter_id, sorted);
store.startCombat();
broadcastEvent(session_id, {
  type: "session:state_sync",
  combatants: sorted,
  current_turn_index: 0,
  round_number: 1,
  encounter_id: encounter_id,
});
router.replace(`/app/session/${session_id}`);
```

O DM, portanto, **já emite `session:state_sync` com `encounter_id`** no momento de start. Não existe um evento separado `combat:started` sendo emitido pelo DM — o sinal de início é o próprio `session:state_sync`.

> Nota: Existe um handler `combat:started` no `PlayerJoinClient.tsx` (linha 720), mas esse evento **nunca é emitido** pelo DM (confirmado: nenhum `broadcastEvent` com `type: "combat:started"` existe no codebase). É letra morta.

#### 2. Como o jogador recebe o sinal (`PlayerJoinClient.tsx`, linhas 435–443)

```ts
.on("broadcast", { event: "session:state_sync" }, ({ payload }) => {
  if (payload.combatants) updateCombatants(payload.combatants);
  if (payload.round_number !== undefined) setRound(payload.round_number);
  if (payload.current_turn_index !== undefined) updateTurnIndex(payload.current_turn_index);
  setNextCombatantId(null);
  // state_sync means combat is active — update state to exit lobby
  setActive(true);
  if (payload.encounter_id) setCurrentEncounterId(payload.encounter_id);
})
```

O handler **atualiza `active = true` e `currentEncounterId`** — o que teoricamente deveria tirar o jogador do lobby (a condição de renderização é `if (!active || !currentEncounterId)`).

#### 3. A lacuna real — o jogador registrado não vira combatant

O problema está aqui: quando `session:state_sync` chega com a lista de combatants do DM (`sorted`), essa lista contém **apenas NPCs e monstros que o DM adicionou**. O jogador que está no lobby com `isRegistered = true` **não está nessa lista**.

O handler do `session:state_sync` substitui `combatants` com o payload do DM — e o jogador some. Ainda pior: como o jogador **ainda não foi inserido na tabela `combatants`** no banco (o `registerPlayerCombatant` só é chamado quando o form é submetido), ele não aparece no lado do DM.

#### 4. Como `registerPlayerCombatant` funciona hoje

A função `registerPlayerCombatant` (`lib/supabase/player-registration.ts`, linha 108) é chamada apenas via `handleRegister`, que é acionado pelo **submit do formulário do lobby**. Ela:
1. Valida o token
2. Busca o encounter ativo da sessão
3. Insere o combatant na tabela `combatants`
4. Marca `player_name` no token

O fluxo de registro **não é acionado automaticamente** quando o combat começa.

#### 5. Por que o lobby às vezes não transita mesmo recebendo `state_sync`

Há dois cenários de falha:

**Cenário A — Timing:** O jogador abre o link, o canal Realtime ainda não está subscrito quando o DM dispara o `state_sync`. O evento é perdido e o lobby fica parado.

**Cenário B — Sem fallback para combate iniciado:** O `fetchFullState` (polling fallback) busca `/api/session/[id]/state` que retorna o encounter ativo — mas só é chamado quando `encounterIdRef.current` já está setado. Se o jogador chegou antes do combate, `encounterIdRef.current` é `null`, então o fallback não é acionado.

#### 6. O `session:state_sync` carrega combatants NÃO sanitizados

O broadcast no `CombatSessionClient.tsx` emite `broadcastEvent(sid, { type: "session:state_sync", combatants: sorted, ... })` onde `sorted` é o array interno do DM com **dados completos** (HP exato, AC, notas do DM). A função `broadcastEvent` em `lib/realtime/broadcast.ts` precisa ser verificada para confirmar se sanitiza antes de publicar — isso é relevante para a solução.

#### 7. Handler `combat:started` — letra morta

O handler na linha 720 do `PlayerJoinClient`:
```ts
.on("broadcast", { event: "combat:started" }, ({ payload }) => {
  setActive(true);
  if (payload?.encounter_id) {
    setCurrentEncounterId(payload.encounter_id);
    fetchFullState(payload.encounter_id);
  }
})
```
Este handler só transita a UI — não registra o jogador como combatant. E o evento nunca é emitido pelo DM. Ambos os problemas precisam ser corrigidos.

---

## Critérios de Aceite

1. **Jogador registrado no lobby é automaticamente adicionado ao combate** quando o DM inicia — sem nenhuma ação manual (sem refresh, sem re-entrar no link).
2. **Transição suave:** lobby → tela de combate sem reload de página.
3. **Jogador aparece na lista de combatants do DM** com nome e stats corretos após o auto-join.
4. **Jogador que ainda não registrou** (só abriu o link) permanece no lobby; pode ainda se registrar e então cai no fluxo de late-join existente.
5. **Funciona para jogadores anônimos** (`/join/[token]`) e **autenticados** (`/invite`).
6. **Funciona mesmo se o `session:state_sync` chegar antes do canal Realtime estar subscrito** — deve haver fallback por polling.
7. **Não duplica o combatant** se o jogador já estava registrado em um encounter anterior da mesma sessão.

---

## Abordagem Técnica

### Avaliação das Opções

#### Opção A — Usar `session:state_sync` existente (recomendada)

O DM já emite `session:state_sync` com `encounter_id` no start. O handler no `PlayerJoinClient` já atualiza `active` e `currentEncounterId`. A correção é **adicionar a lógica de auto-registro** dentro desse handler: quando `isRegistered = true` e o jogador não está na lista de combatants recebida, chamar `registerPlayerCombatant` automaticamente.

**Vantagem:** Reutiliza infraestrutura 100% existente. Zero novos eventos.  
**Risco:** Race condition se `registerPlayerCombatant` for lento — mitigar com loading state ou otimismo.

#### Opção B — Ativar o evento `combat:started` (letra morta)

Fazer o DM emitir `combat:started` além do `session:state_sync`, e usar o handler já existente (linha 720) para disparar `registerPlayerCombatant`.

**Vantagem:** Separação clara de responsabilidades.  
**Desvantagem:** Requer mudança em dois lugares (DM e player). O handler existente ainda precisa da lógica de auto-registro — não resolve só com o evento.

#### Opção C — Polling detecta `encounter.is_active = true` (parcialmente existente)

O `fetchFullState` já busca o estado do encounter. Adicionar lógica: se `data.encounter` retornar `is_active = true` e `isRegistered = true` e o jogador não estiver nos combatants → auto-registrar.

**Vantagem:** Fallback robusto para casos onde o broadcast falhou.  
**Desvantagem:** Latência de até 5s (intervalo de polling). Não deve ser o caminho principal, mas é o fallback ideal.

### Decisão: Opção A como caminho principal + Opção C como fallback

A combinação A+C requer o menor código novo e aproveita toda a infraestrutura existente:

1. No handler `session:state_sync` do `PlayerJoinClient`, após atualizar `active` e `currentEncounterId`, verificar se `isRegisteredRef.current === true` e se o jogador não está nos `payload.combatants`. Se sim, chamar `registerPlayerCombatant` com os dados já guardados no token/estado.

2. No `fetchFullState` (polling fallback), aplicar a mesma verificação: se `data.encounter.is_active` e `isRegistered` e jogador ausente → auto-registrar.

### Detalhe de Implementação

O `handleRegister` atual exige que o usuário submeta um formulário com nome, HP, AC, initiative. Para o auto-join, os dados **já existem** — foram submetidos antes do combate iniciar. O problema é que eles não foram persistidos como combatant no banco. Duas abordagens:

**Sub-opção 1 (preferida):** Guardar os dados de registro em um `ref` (`pendingRegistrationRef`) no momento do `handleRegister`. Se `active` se tornar `true` e o jogador ainda não estiver nos combatants, usar esses dados guardados para chamar `registerPlayerCombatant`.

**Sub-opção 2:** Fazer o `handleRegister` chamar `registerPlayerCombatant` imediatamente mesmo sem encounter ativo — a função já tem lógica para isso (`registerPlayerCombatant` busca o encounter mais recente, não exige que seja ativo). Verificar se isso criaria combatants órfãos.

> Atenção: `registerPlayerCombatant` valida que `initiative` esteja entre 1–30. Garantir que o dado guardado no `ref` satisfaça essa validação.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `components/player/PlayerJoinClient.tsx` | (1) Adicionar `pendingRegistrationRef` para guardar dados do form após `handleRegister`. (2) No handler `session:state_sync`: se `isRegistered && !combatantsInclludeMe` → chamar `registerPlayerCombatant`. (3) No `fetchFullState`: mesma verificação. (4) Opcionalmente limpar o handler `combat:started` morto ou ativá-lo como fallback adicional. |
| `components/session/CombatSessionClient.tsx` | Opcional: emitir `combat:started` além de `session:state_sync` para manter semântica explícita. Não obrigatório para a correção principal. |
| `lib/types/realtime.ts` | Opcional: adicionar `"combat:started"` ao union `RealtimeEventType` se decidir ativar o evento. |

---

## Plano de Testes

### Testes Manuais (QA)

**Cenário principal (AC 1–3, 5):**
1. DM cria sessão e compartilha link com 2 jogadores
2. Jogadores abrem o link → preenchem nome, HP, AC, initiative → clicam em "Entrar"
3. `isRegistered = true` — ambos veem tela de espera no lobby
4. DM inicia o combate
5. Verificar: ambos os jogadores transitam automaticamente para a tela de combate sem refresh
6. Verificar: ambos aparecem na lista de combatants do DM com stats corretos

**Cenário de não-registrado (AC 4):**
1. DM inicia combate enquanto um jogador ainda está no formulário (não submeteu)
2. Verificar: jogador permanece no lobby; após submeter, cai no fluxo de late-join existente

**Cenário de fallback de broadcast (AC 6):**
1. Simular perda de Realtime (bloquear WebSocket no DevTools antes de o DM iniciar)
2. DM inicia combate
3. Aguardar até 5s (intervalo de polling)
4. Verificar: jogador transita automaticamente quando o poll detecta `is_active = true`

**Cenário de não-duplicação (AC 7):**
1. Jogador registra em Sessão A, DM encerra, DM inicia Sessão B (nova encounter)
2. Verificar: jogador não aparece com combatant duplicado na nova encounter

**Cenário anônimo vs autenticado (AC 5):**
- Repetir cenário principal com jogador anônimo (`/join/[token]`)
- Repetir com jogador autenticado (`/invite`)

### Testes Automatizados (E2E)

Adicionar em `e2e/` (seguindo padrão dos helpers em `e2e/helpers/combat.ts`):

```
describe("A6 — auto-join via invite link")
  it("player registered in lobby auto-joins when DM starts combat")
  it("unregistered player stays in lobby after combat starts")
  it("player appears in DM combatant list after auto-join")
```

---

## Notas de Paridade

- **`/try` (Guest/DM):** Não afetado. O `GuestCombatClient` é o DM jogando sozinho no modo demo — não tem canal de jogador.
- **`/join/[token]` anônimo:** Afetado — caminho principal desta story.
- **`/invite` (autenticado):** Afetado — usa o mesmo `PlayerJoinClient`. Verificar se `prefilledCharacters` introduz alguma diferença no fluxo de registro.
- **Modo de encerramento:** O `session:state_sync` com `combatants: []` e `current_turn_index: -1` já é usado para encerrar o combate (linha 497–501 do `useCombatActions.ts`). A nova lógica de auto-join **não deve** disparar nesse caso — adicionar guard `if (payload.encounter_id && payload.combatants.length > 0)`.

---

## Definição de Pronto

- [ ] Jogador registrado no lobby transita automaticamente para o combate quando DM inicia — sem refresh
- [ ] Jogador aparece nos combatants do DM com nome e HP/AC/initiative corretos
- [ ] Jogador não-registrado permanece no lobby até submeter o formulário
- [ ] Não há duplicação de combatants na mesma encounter
- [ ] Funciona para jogadores anônimos e autenticados
- [ ] Fallback por polling cobre o caso de broadcast perdido (≤ 5s de latência)
- [ ] Nenhuma regressão nos fluxos existentes: late-join, rejoin, session revoked
- [ ] Testes E2E cobrindo o cenário principal passando em CI
- [ ] Evidence de QA com screenshots em `qa-evidence/`
