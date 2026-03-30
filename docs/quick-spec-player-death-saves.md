# Quick Spec: Player Marca Death Saves no Turno Dele

**Data:** 2026-03-30
**Status:** Pronto para implementação

---

## Contexto

Death saves hoje só podem ser marcados pelo DM via `DeathSaveTracker` no `CombatantRow`. O player conectado via `/join/[token]` não vê seus death saves e não pode marcá-los. Per D&D 5e, o player é quem rola seus próprios death saves no turno dele.

## O que fazer

### 1. Novo evento Realtime: `player:death_save`

**Tipo:** broadcast do player → DM

```typescript
// lib/types/realtime.ts — adicionar ao union type
| "player:death_save"

// Payload shape
interface RealtimePlayerDeathSave {
  type: "player:death_save";
  player_name: string;
  combatant_id: string;
  result: "success" | "failure";
}
```

### 2. Player View — mostrar DeathSaveTracker quando HP=0

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

**Condições para mostrar:**
- `isOwnChar === true` (é o personagem do player)
- `combatant.current_hp === 0`
- `combatant.max_hp > 0`
- `!combatant.is_defeated`

**UI:**
- Reutilizar `DeathSaveTracker` existente
- Os botões de success/failure disparam broadcast `player:death_save` via `channelRef`
- Mostrar o tracker **somente no turno do player** (quando `isCurrentTurn && isOwnChar`)
- Fora do turno: mostrar apenas os indicadores (bolinhas) sem botões — read-only

**Props necessários no PlayerInitiativeBoard:**
- `ownCharDeathSaves?: { successes: number; failures: number }` — recebido via state sync / hp_update

### 3. DM Side — listener para `player:death_save`

**Arquivo:** `components/session/CombatSessionClient.tsx`

No mesmo `useEffect` do `player:end_turn`, adicionar listener:

```typescript
ch.on("broadcast", { event: "player:death_save" }, ({ payload }) => {
  if (!active) return;
  const { combatant_id, result } = payload;
  if (result === "success") {
    useCombatStore.getState().addDeathSaveSuccess(combatant_id);
  } else {
    useCombatStore.getState().addDeathSaveFailure(combatant_id);
  }
  // Broadcast updated state to all players
  const c = useCombatStore.getState().combatants.find((x) => x.id === combatant_id);
  if (c) {
    broadcastEvent(getSessionId(), {
      type: "combat:hp_update",
      combatant_id,
      current_hp: c.current_hp,
      temp_hp: c.temp_hp,
      max_hp: c.max_hp,
      is_player: c.is_player
    });
  }
  if (c?.is_defeated) {
    broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id, is_defeated: true });
  }
});
```

### 4. Player Side — enviar broadcast

**Arquivo:** `components/player/PlayerInitiativeBoard.tsx`

```typescript
const handleDeathSave = (result: "success" | "failure") => {
  if (!channelRef?.current || !ownChar) return;
  channelRef.current.send({
    type: "broadcast",
    event: "player:death_save",
    payload: {
      player_name: registeredName,
      combatant_id: ownChar.id,
      result
    },
  });
};
```

### 5. State Sync — incluir death_saves no sync payload

**Arquivo:** `lib/realtime/broadcast.ts` (ou onde `session:state_sync` é construído)

Garantir que `death_saves` é incluído no payload de state sync para players, assim o player recebe o estado correto ao (re)conectar.

### 6. PlayerJoinClient — passar death saves pro board

**Arquivo:** `components/player/PlayerJoinClient.tsx`

Ao processar `combat:hp_update`, verificar se o combatant tem `death_saves` no state e repassar pro `PlayerInitiativeBoard`.

### 7. i18n

Adicionar em `messages/en.json` e `messages/pt-BR.json`:

```json
"death_saves_your_turn": "It's your turn — roll your Death Save!",
"death_saves_waiting": "Death Saves"
```
```json
"death_saves_your_turn": "É seu turno — role seu Teste contra Morte!",
"death_saves_waiting": "Testes contra Morte"
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `lib/types/realtime.ts` | Adicionar `"player:death_save"` ao union + interface |
| `components/player/PlayerInitiativeBoard.tsx` | Mostrar DeathSaveTracker, enviar broadcast |
| `components/player/PlayerJoinClient.tsx` | Passar death_saves pro board |
| `components/session/CombatSessionClient.tsx` | Listener para `player:death_save` |
| `lib/realtime/broadcast.ts` | Incluir `death_saves` no state_sync |
| `messages/en.json` | 2 i18n keys |
| `messages/pt-BR.json` | 2 i18n keys |

## Critérios de aceite

- [ ] Player vê DeathSaveTracker no seu personagem quando HP=0
- [ ] Player pode clicar success/failure **somente no turno dele**
- [ ] DM recebe o broadcast e atualiza o store
- [ ] DM vê as bolinhas atualizarem em tempo real
- [ ] Outros players veem o status atualizado (via hp_update broadcast)
- [ ] 3 failures → combatant marcado defeated (via store existente)
- [ ] 3 successes → "Stabilized" aparece para todos
- [ ] State sync ao reconectar inclui death_saves
