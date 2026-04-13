# Spec: Optimistic Combat Actions — Auto-ACK Visual Feedback

**Status**: Rascunho  
**Data**: 2026-04-13  
**Versao**: 1.0  
**Autor**: Party Mode (Winston + Sally + John + Amelia + Quinn)  
**Prioridade**: P2 — Quality of Life, pre-demo BH  
**Escopo**: Player combat actions com feedback visual automatico

---

## 1. Contexto e Motivacao

O PocketDM permite que jogadores reportem acoes de combate (dano, cura, death saves, condicoes, reacao) diretamente do celular. Hoje, essas acoes usam **optimistic updates** — a UI muda antes do servidor confirmar.

### 1.1 Problema atual

O jogador **nunca sabe se o DM recebeu a acao**. Se o broadcast se perder (internet instavel, tab em background, DM offline), o jogador ve um valor que nao corresponde ao estado real do combate. Isso gera:

- **Dessincronia silenciosa**: HP do jogador e DM divergem sem ninguem perceber
- **Confusao no state_sync**: Quando o server corrige o valor, o jogador ve um "pulo" sem explicacao
- **Perda de confianca**: Jogador nao sabe se pode confiar nos numeros da tela

### 1.2 Descoberta chave

O DM **ja re-broadcast** o resultado de toda acao do jogador:

| Player envia | DM processa e re-broadcast |
|---|---|
| `player:hp_action` | `combat:hp_update` (com HP atualizado) |
| `player:death_save` | `combat:hp_update` (com death_saves) |
| `player:self_condition_toggle` | `combat:condition_change` (com conditions) |
| `combat:reaction_toggle` | `combat:reaction_toggle` (re-broadcast) |

**Nao precisamos de um ACK novo.** O re-broadcast do DM JA E o ACK. So precisamos:
1. Rastrear acoes pendentes no player
2. Reconhecer o re-broadcast como confirmacao
3. Mostrar feedback visual (pendente → confirmado → erro)

### 1.3 Principio

> **Zero fricao para o DM.** O DM nao faz nada, nao aprova nada, nao ve nada diferente. E maquina falando com maquina. O jogador so ve um feedback sutil que some em milissegundos.

---

## 2. Arquitetura

### 2.1 Fluxo completo (com ACK implicito)

```
HOJE:
  Player clica → update local → broadcast → 🤞 torce
  
PROPOSTO:
  Player clica → registra PendingAction → update local (estado "pending")
  → broadcast pro DM → DM processa → DM re-broadcast resultado
  → Player recebe re-broadcast → resolve PendingAction → estado "confirmed"
  
  Se timeout (5s sem re-broadcast):
  → estado "unconfirmed" → toast sutil → retry automatico (1x)
  → Se retry falha: estado "failed" → toast com instrucao
```

### 2.2 PendingAction — Estrutura

```typescript
interface PendingAction {
  id: string;              // UUID gerado no client
  type: "hp" | "death_save" | "condition" | "reaction";
  combatantId: string;
  timestamp: number;       // Date.now() do envio
  status: "pending" | "confirmed" | "unconfirmed" | "failed";
  retryCount: number;      // max 1
  payload: Record<string, unknown>; // payload original do broadcast
}
```

### 2.3 Matching — Como saber que o re-broadcast e "meu"

O player precisa correlacionar o re-broadcast do DM com a acao pendente. A logica:

| Tipo | Re-broadcast recebido | Match condition |
|---|---|---|
| HP | `combat:hp_update` | `combatant_id` igual + HP novo bate com o esperado (±tolerancia de outra acao) |
| Death Save | `combat:hp_update` com `death_saves` | `combatant_id` igual + total de saves >= total local |
| Condition | `combat:condition_change` | `combatant_id` igual + condition presente/ausente conforme esperado |
| Reaction | `combat:reaction_toggle` | `combatant_id` igual + `reaction_used` bate com valor enviado |

**Regra de tolerancia**: Se o DM fez outra acao no mesmo combatant (ex: aplicou dano enquanto player curava), o HP final pode nao bater exatamente. Nesse caso, considerar confirmado se:
- O re-broadcast chegou dentro de 5s
- O `combatant_id` bate
- O campo relevante foi modificado (HP mudou, death_save total mudou, etc.)

### 2.4 Onde vive o estado

```
usePendingActionsStore (novo Zustand store)
├── actions: Map<string, PendingAction>
├── addAction(action) → string (retorna id)
├── confirmAction(id)
├── failAction(id)
├── retryAction(id)
├── getActionsByCombatant(combatantId) → PendingAction[]
├── getPendingByType(combatantId, type) → PendingAction | null
└── cleanup() → remove confirmed/failed com >10s
```

---

## 3. Visual Feedback — UX

### 3.1 Estados visuais

Sally definiu 3 estados visuais, todos **sutis e nao-intrusivos**:

#### Estado: Pending (0-5s)

> O jogador acabou de agir. A UI ja mudou (optimistic). Sinal sutil de "processando".

- **HP**: O numero novo pulsa com um brilho dourado suave (1 ciclo, 1.5s) — usa a cor gold do brand
- **Death Save**: O dot novo tem um brilho sutil (ja existe animacao de bounce no DeathSaveTracker)
- **Condition**: Badge aparece com opacity 0.7 e borda tracejada
- **Reaction**: Indicador pisca 1x
- **Chat**: Mensagem aparece com opacity 0.7 (ja padrao em muitos apps)

**Nenhum spinner. Nenhum loading. Nenhum texto.** Apenas um sinal visual sutil.

#### Estado: Confirmed (apos re-broadcast)

> DM processou. Tudo certo.

- **HP**: Brilho dourado some suavemente (fade 300ms) — numero fica solido
- **Death Save**: Animacao de bounce finaliza normalmente
- **Condition**: Badge vai pra opacity 1.0 e borda solida
- **Reaction**: Indicador fica solido
- **Chat**: Mensagem vai pra opacity 1.0

**Transicao imperceptivel na maioria dos casos** (re-broadcast chega em <500ms em rede boa).

#### Estado: Unconfirmed (5s sem re-broadcast)

> Algo pode ter dado errado. Aviso sutil.

- **Todos**: Toast discreto no canto: "O mestre pode nao ter recebido sua acao. Reenviando..."
- **HP**: Numero fica com borda laranja sutil
- **Retry automatico**: Reenvia o broadcast 1x
- **Se retry confirma**: Volta pro estado "confirmed" normalmente
- **Se retry falha (mais 5s)**: Estado "failed"

#### Estado: Failed (retry esgotado)

> Definitivamente nao chegou. Instrucao clara.

- **Toast**: "Sua acao nao chegou ao mestre. Avise ele na mesa!"
- **HP**: Numero volta ao valor pre-acao com animacao suave (rollback)
- **Death Save**: Dot remove com animacao
- **Condition**: Badge some com fade
- **Reaction**: Reverte ao estado anterior

**Rollback so acontece se o player estiver offline/DM offline.** Em condicoes normais, isso nunca aparece.

### 3.2 Tabela de tratamento por acao

| Acao | Optimistic | Pending visual | ACK match | Timeout | Retry | Rollback |
|---|---|---|---|---|---|---|
| HP (dano/cura/temp) | Sim | Brilho gold | `combat:hp_update` | 5s | 1x | Sim |
| Death Save | Sim | Bounce + brilho | `combat:hp_update` com death_saves | 5s | 1x | Sim |
| Condition Toggle | Sim | Opacity 0.7 + tracejado | `combat:condition_change` | 5s | 1x | Sim |
| Reaction Toggle | Sim | Pisca 1x | `combat:reaction_toggle` | 5s | 1x | Sim |
| Chat | Sim | Opacity 0.7 | (sem ACK) | N/A | Nao | Nao |
| End Turn | Nao (fire-and-forget) | Toast | (sem ACK) | N/A | Nao | Nao |
| Player Note | Nao (fire-and-forget) | Nenhum | (sem ACK) | N/A | Nao | Nao |

### 3.3 Animacoes CSS

```css
/* Pending pulse — aplicado no numero de HP */
@keyframes pending-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(212, 175, 55, 0.4); }
}

.hp-pending {
  animation: pending-pulse 1.5s ease-in-out 1;
}

/* Confirmed fade — transicao suave */
.hp-confirmed {
  transition: box-shadow 300ms ease-out;
  box-shadow: none;
}

/* Unconfirmed warning — borda laranja */
.hp-unconfirmed {
  border: 1px solid rgba(255, 165, 0, 0.6);
  border-radius: 4px;
}

/* Condition pending */
.condition-pending {
  opacity: 0.7;
  border-style: dashed;
}

.condition-confirmed {
  opacity: 1;
  border-style: solid;
  transition: opacity 300ms, border-style 0s;
}
```

---

## 4. Implementacao — Arquivos e Mudancas

### 4.1 Novo arquivo: `lib/stores/pending-actions-store.ts`

Zustand store para rastrear acoes pendentes.

```typescript
// Estrutura core
interface PendingActionsState {
  actions: Map<string, PendingAction>;
  addAction: (action: Omit<PendingAction, "id" | "status" | "retryCount">) => string;
  confirmAction: (id: string) => void;
  failAction: (id: string) => void;
  retryAction: (id: string) => void;
  getPendingByType: (combatantId: string, type: PendingAction["type"]) => PendingAction | undefined;
  cleanup: () => void;
}
```

**Cleanup**: Timer de 10s remove acoes confirmed/failed antigas para nao acumular.

### 4.2 Novo arquivo: `hooks/use-action-ack.ts`

Hook que conecta o store de pending actions com os broadcasts recebidos do DM.

```typescript
// Logica core
function useActionAck(channelRef: RefObject<RealtimeChannel | null>) {
  // Escuta re-broadcasts do DM
  // Quando combat:hp_update chega → procura PendingAction de HP pro combatant_id
  // Quando combat:condition_change chega → procura PendingAction de condition
  // Quando combat:reaction_toggle chega → procura PendingAction de reaction
  // Marca como confirmed se match

  // Timer de 5s para cada pending action
  // Se timeout → marca como unconfirmed → retry 1x
  // Se retry timeout → marca como failed → rollback
}
```

### 4.3 Modificacao: `components/player/PlayerJoinClient.tsx`

**Linhas afetadas**: handlers de HP, death save, condition, reaction

Mudancas por handler:

#### handleHpAction (~linha 670)
```diff
+ const actionId = usePendingActionsStore.getState().addAction({
+   type: "hp",
+   combatantId,
+   timestamp: Date.now(),
+   payload: { action, amount },
+ });

  ch.send({ type: "broadcast", event: "player:hp_action", payload: { ... } });

  // Optimistic update (ja existe) — manter como esta
  hpActionOptimisticRef.current = Date.now();
  lastHpActionCombatantRef.current = combatantId;
```

#### onDeathSave (~linha 2487)
```diff
+ const actionId = usePendingActionsStore.getState().addAction({
+   type: "death_save",
+   combatantId,
+   timestamp: Date.now(),
+   payload: { result },
+ });

  ch.send({ type: "broadcast", event: "player:death_save", payload: { ... } });
  deathSaveOptimisticRef.current = Date.now();
```

#### onSelfConditionToggle (~linha 2535)
```diff
+ const actionId = usePendingActionsStore.getState().addAction({
+   type: "condition",
+   combatantId,
+   timestamp: Date.now(),
+   payload: { condition },
+ });

  ch.send({ type: "broadcast", event: "player:self_condition_toggle", payload: { ... } });
  conditionOptimisticRef.current = Date.now();
```

#### onToggleReaction (~linha 2568)
```diff
+ const actionId = usePendingActionsStore.getState().addAction({
+   type: "reaction",
+   combatantId,
+   timestamp: Date.now(),
+   payload: { reaction_used: newValue },
+ });

  ch.send({ type: "broadcast", event: "combat:reaction_toggle", payload: { ... } });
```

### 4.4 Modificacao: `components/combat/CombatantRow.tsx`

Adicionar classes CSS condicionais baseadas no estado de pending actions:

```typescript
// Novo prop (opcional — so passado no modo auth)
interface CombatantRowProps {
  // ... existing props
  pendingState?: {
    hp?: "pending" | "confirmed" | "unconfirmed" | "failed";
    deathSave?: "pending" | "confirmed" | "unconfirmed" | "failed";
    condition?: "pending" | "confirmed" | "unconfirmed" | "failed";
    reaction?: "pending" | "confirmed" | "unconfirmed" | "failed";
  };
}
```

**Guest mode**: `pendingState` e `undefined` → nenhuma classe CSS aplicada → zero impacto.

### 4.5 Modificacao: `components/player/PlayerInitiativeBoard.tsx`

Conectar o `usePendingActionsStore` e passar `pendingState` para cada CombatantRow do jogador.

### 4.6 Modificacao: `components/combat/DeathSaveTracker.tsx`

Adicionar classe `death-save-pending` no dot recem-adicionado (ja tem animacao de bounce, so adicionar o brilho sutil).

### 4.7 Modificacao: `components/combat/ConditionBadge.tsx` (ou equivalente)

Adicionar classe `condition-pending` / `condition-confirmed`.

### 4.8 Novo arquivo: `styles/pending-actions.css` (ou inline Tailwind)

Classes CSS do item 3.3.

---

## 5. Guard de 5s — Evolucao

### 5.1 Situacao atual

Os 3 refs atuais (`hpActionOptimisticRef`, `deathSaveOptimisticRef`, `conditionOptimisticRef`) protegem contra state_sync por 5 segundos. Reaction nao tem guard.

### 5.2 Proposta

**Manter os refs existentes como estao.** Eles protegem contra state_sync. O novo sistema de pending actions e **complementar**, nao substituto:

- **Refs**: Protegem state_sync de sobrescrever optimistic (logica de merge)
- **Pending Actions**: Rastreiam se o DM confirmou a acao (feedback visual)

Quando uma PendingAction e confirmada, o ref pode ser resetado antecipadamente (nao precisa esperar os 5s). Quando falha, o rollback invalida o ref e permite que o proximo state_sync corrija.

### 5.3 Reaction — Adicionar guard

Reaction toggle hoje NAO tem guard de state_sync. Adicionar:

```typescript
const reactionOptimisticRef = useRef<number>(0);
const lastReactionCombatantRef = useRef<string | null>(null);
```

E na logica de merge do state_sync, preservar `reaction_used` quando dentro da janela de 5s (mesmo pattern de HP).

---

## 6. Retry — Logica

### 6.1 Quando fazer retry

- PendingAction com `status: "pending"` ha mais de 5 segundos
- `retryCount < 1` (maximo 1 retry)
- `connectionStatus === "connected"` (nao tentar retry se offline)

### 6.2 Como fazer retry

Reenviar exatamente o mesmo broadcast com o mesmo payload. O DM processa idempotentemente:
- HP: `handleApplyDamage/Healing` e idempotente? **NAO** — dano e acumulativo. 
  
**CUIDADO**: Retry de HP pode aplicar dano/cura duplicado no DM.

### 6.3 Solucao para idempotencia de HP

Adicionar `action_id` no payload do broadcast. O DM rastreia `lastProcessedActionIds` (Set com TTL de 30s). Se o `action_id` ja foi processado, ignora o retry.

```typescript
// Player envia:
payload: {
  player_name, combatant_id, action, amount, sender_token_id,
  action_id: "uuid-gerado-no-client"  // NOVO
}

// DM verifica:
if (processedActionIds.has(payload.action_id)) return; // duplicata, ignorar
processedActionIds.add(payload.action_id);
// ... processar normalmente
```

**Limpeza**: `setTimeout(() => processedActionIds.delete(id), 30_000)` — 30s e suficiente.

### 6.4 Aplicar idempotencia nas 4 acoes

| Acao | Precisa de idempotencia? | Motivo |
|---|---|---|
| HP (dano/cura) | **SIM** | Dano/cura acumulativo — retry duplicaria |
| HP (temp_hp) | NAO | `setTempHp` e idempotente (set, nao add) |
| Death Save | **SIM** | `addDeathSaveSuccess/Failure` acumula |
| Condition | NAO | `toggleCondition` e idempotente |
| Reaction | NAO | `setReactionUsed(bool)` e idempotente |

---

## 7. Parity Check — Guest / Anonimo / Autenticado

### 7.1 Guest (`/try`)

- **Nenhuma mudanca necessaria.** Guest e 100% local, sem broadcasts, sem ACK.
- `pendingState` nao e passado para CombatantRow → zero impacto visual.

### 7.2 Anonimo (`/join`) e Autenticado (`/invite`)

- **Ambos usam PlayerJoinClient.tsx** — mesma implementacao, mesmas mudancas.
- Pending actions store funciona identicamente para ambos.

### 7.3 DM side

- **Unica mudanca no DM**: Adicionar deduplicacao por `action_id` nos handlers de `player:hp_action` e `player:death_save` em `CombatSessionClient.tsx`.
- Zero mudanca visual no DM.

---

## 8. Plano de Implementacao

### Sprint: 3 fases, estimativa ~1 dia de trabalho

#### Fase 1: Infraestrutura (store + hook)

| # | Tarefa | Arquivo | Complexidade |
|---|--------|---------|-------------|
| 1.1 | Criar `usePendingActionsStore` | `lib/stores/pending-actions-store.ts` (novo) | Baixa |
| 1.2 | Criar `useActionAck` hook | `hooks/use-action-ack.ts` (novo) | Media |
| 1.3 | Adicionar `action_id` nos payloads de broadcast | `PlayerJoinClient.tsx` (~4 handlers) | Baixa |
| 1.4 | Adicionar deduplicacao `action_id` no DM | `CombatSessionClient.tsx` (~2 handlers) | Baixa |

#### Fase 2: Integracao (conectar nos handlers)

| # | Tarefa | Arquivo | Complexidade |
|---|--------|---------|-------------|
| 2.1 | Registrar PendingAction em cada handler | `PlayerJoinClient.tsx` | Baixa |
| 2.2 | Inicializar `useActionAck` no PlayerJoinClient | `PlayerJoinClient.tsx` | Baixa |
| 2.3 | Adicionar guard de reaction no state_sync merge | `PlayerJoinClient.tsx` (~linha 840) | Baixa |
| 2.4 | Passar `pendingState` para PlayerInitiativeBoard | `PlayerJoinClient.tsx` | Baixa |
| 2.5 | Consumir `pendingState` no CombatantRow | `CombatantRow.tsx` | Baixa |

#### Fase 3: Visual feedback (CSS + animacoes)

| # | Tarefa | Arquivo | Complexidade |
|---|--------|---------|-------------|
| 3.1 | Classes CSS pending/confirmed/unconfirmed/failed | Tailwind ou CSS module | Baixa |
| 3.2 | HP pending pulse animation | `CombatantRow.tsx` | Baixa |
| 3.3 | Condition pending/confirmed visual | `ConditionBadge` ou equivalente | Baixa |
| 3.4 | Death save pending brilho | `DeathSaveTracker.tsx` | Baixa |
| 3.5 | Toast para unconfirmed/failed | `PlayerJoinClient.tsx` | Baixa |
| 3.6 | Rollback animation para failed | `PlayerJoinClient.tsx` + `CombatantRow.tsx` | Media |

---

## 9. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Retry duplica dano no DM | Alta (sem idempotencia) | Alto | `action_id` dedup no DM (Fase 1.4) |
| Re-broadcast do DM chega antes do pending ser registrado | Baixa | Baixo | Registrar pending ANTES do broadcast send |
| Multiplas acoes rapidas no mesmo combatant confundem match | Media | Medio | Match por tipo + combatant_id, FIFO (mais antigo primeiro) |
| DM offline nao re-broadcast | Media | Alto | Fallback: se DM offline flag ativo, nao mostrar pending (ja sabe que nao vai chegar) |
| Guest mode afetado por mudancas em CombatantRow | Baixa | Medio | `pendingState` e opcional, guest nao passa → zero impacto |

---

## 10. Criterios de Aceite

### Cenario feliz (95% dos casos)
- [ ] Jogador aplica dano → HP muda com brilho dourado → brilho some em <1s (DM confirmou)
- [ ] Jogador faz death save → dot aparece com bounce → estabiliza normalmente
- [ ] Jogador toggle condition → badge aparece em 0.7 opacity → vai pra 1.0
- [ ] Jogador toggle reaction → pisca 1x → fica solido
- [ ] DM nao ve nenhuma diferenca na experiencia dele
- [ ] Guest mode inalterado

### Cenario de falha (5% dos casos)
- [ ] Broadcast se perde → apos 5s toast "reenviando..." → retry automatico
- [ ] Retry funciona → toast some, estado normaliza
- [ ] Retry falha → toast "avise o mestre" → rollback visual suave
- [ ] HP rollback nao causa "pulo" — animacao suave de volta ao valor anterior

### Idempotencia
- [ ] DM recebe mesmo `action_id` 2x → processa so 1x
- [ ] Dano nao duplica no retry
- [ ] Death save nao duplica no retry

### Performance
- [ ] Pending actions store nao acumula (cleanup a cada 10s)
- [ ] Nenhum timer extra no DM (usa dedup passivo via Set)
- [ ] CSS animations usam `will-change: box-shadow` para GPU acceleration

---

## 11. Fora de Escopo (para agora)

- Chat ACK (baixo impacto, mensagem perdida nao quebra jogo)
- End Turn ACK (fire-and-forget e suficiente)
- Player Note ACK (one-way, sem expectativa de resposta)
- Event sourcing / conflict resolution avancado (overkill para mesa de RPG)
- Offline queue (se esta offline, espera voltar — nao e um app bancario)

---

## 12. Glossario

| Termo | Significado |
|---|---|
| **Optimistic update** | UI muda antes do servidor confirmar |
| **ACK (acknowledge)** | Confirmacao de que a mensagem chegou |
| **Re-broadcast** | DM recebe acao do player e broadcast o resultado para todos |
| **Pending action** | Acao que o player enviou mas ainda nao recebeu confirmacao |
| **Rollback** | Reverter a UI pro estado anterior quando acao falha |
| **Idempotente** | Operacao que pode ser executada varias vezes com o mesmo resultado |
| **Guard/Ref** | Protecao temporal que impede state_sync de sobrescrever optimistic |
