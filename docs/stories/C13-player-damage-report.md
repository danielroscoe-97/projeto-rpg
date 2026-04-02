# C.13 — Player HP Self-Management (Dano + Cura + Temp HP)

**Epic:** C — Player Agency  
**Prioridade:** Alta  
**Estimativa:** 8 SP  
**Dependencia:** Trilha A estavel (A.1 state machine, A.2 dedup — broadcast player→DM funcional)  
**Arquivos principais:** `components/player/PlayerBottomBar.tsx`, `components/player/PlayerInitiativeBoard.tsx`, `components/player/PlayerJoinClient.tsx`, `components/session/CombatSessionClient.tsx`, `lib/types/realtime.ts`

---

## Resumo

Na mesa presencial, o jogador e o dono do proprio HP. Ele sofre dano de armadilha → ajusta. O clerigo cura ele → ajusta. O wizard da temp HP → ajusta. Pocao de cura → ajusta. Hoje, toda alteracao de HP e unidirecional: so o DM pode aplicar via `handleApplyDamage/handleApplyHealing/handleSetTempHp`. Isso obriga o DM a intermediar cada alteracao de HP de cada jogador, quebrando o fluxo da mesa.

Esta story da ao jogador **controle total sobre o proprio HP** — dano, cura, e temp HP — disponivel a qualquer momento do combate (nao apenas no proprio turno). O DM ve todas as alteracoes no log de combate em tempo real pra auditoria. O fluxo segue o pattern comprovado de `player:death_save`: player envia broadcast → DM recebe → aplica no store → re-broadcast pra todos.

---

## Decisoes de UX

> **D1:** Tres botoes inline **abaixo do HP** do proprio personagem: `[−Dano]` `[+Cura]` `[🛡Temp]`. Sempre visiveis quando personagem esta vivo. Compactos (text-xs).
>
> **D2:** Toque em qualquer botao abre **micro-popover** (Popover Radix) com input numerico + confirmar + cancelar. Popover fecha com tap outside.
>
> **D3:** Feedback visual = **delta flutuante existente** ("-8" vermelho, "+15" verde, "+10 temp" azul). Ja existe via `hpDelta` / `detectHpChanges`. Toast APENAS em erro/offline.
>
> **D4:** **Disponivel a qualquer momento** — nao apenas no turno do jogador. Motivo: dano de efeitos continuos, cura de aliados, pocoes fora de turno.
>
> **D5:** Todas as acoes sao **logadas no combat log** com tag `(self-report)` pra diferenciar de acoes do DM. DM consegue auditar tudo.

---

## Contexto Tecnico

### Pattern existente: player:death_save

O fluxo `player:death_save` (unico evento player→DM com side-effect no HP) funciona assim:

```
Player (PlayerJoinClient.tsx:1262-1292)
  → ch.send({ event: "player:death_save", payload: { player_name, combatant_id, result } })
  → Optimistic update local: updateCombatants() + deathSaveOptimisticRef timestamp

DM (CombatSessionClient.tsx:696-724)
  → handlePlayerDeathSave() recebe payload
  → Valida: combat active + payload valido
  → useCombatStore.getState().addDeathSaveSuccess/Failure(combatant_id)
  → broadcastEvent(sessionId, { type: "combat:hp_update", ... }) ← re-broadcast pra todos

Player (PlayerJoinClient.tsx:451-523)
  → Recebe combat:hp_update
  → Calcula delta visual (damage/heal/temp)
  → Atualiza estado local via updateCombatants()
  → 5s protection window impede overwrite de dados stale
```

### Funcoes de HP do DM que serao reusadas

Em `lib/hooks/useCombatActions.ts`:

| Funcao | Linhas | O que faz | Log gerado |
|--------|--------|-----------|------------|
| `handleApplyDamage(id, amount, options?)` | 150-259 | Temp absorve primeiro → current_hp reduz → broadcast + persist + concentration check + death save prompt | type: "damage", source: options.source |
| `handleApplyHealing(id, amount)` | 261-282 | current_hp = min(max_hp, current_hp + amount) → broadcast + persist | type: "heal", actorName: getCurrentActorName() |
| `handleSetTempHp(id, value)` | 284-296 | temp_hp = max(current_temp, value), cap 9999 → broadcast + persist | (sem log hoje — adicionar) |

### Decisao arquitetural: evento unico vs tres eventos

**Evento unico `player:hp_action`** com campo `action`:

```typescript
{ type: "player:hp_action", player_name, combatant_id, action: "damage" | "heal" | "temp_hp", amount }
```

**Vantagens:** Uma interface, um handler, uma sanitization rule, um optimistic update pattern.
**Decisao:** Evento unico.

---

## Criterios de Aceite

### UI

1. **Tres botoes inline abaixo do HP do personagem.** No `PlayerBottomBar` (mobile) e no card "Own Character" do `PlayerInitiativeBoard` (desktop), abaixo do HP bar, exibir tres botoes compactos:
   - `[−Dano]` (vermelho) — reduz HP
   - `[+Cura]` (verde) — aumenta HP
   - `[🛡Temp]` (azul) — define temp HP
   
   Visiveis quando personagem esta vivo (current_hp > 0 para dano/temp, sempre para cura — cura pode tirar de 0 HP).

2. **Popover com input numerico.** Toque em qualquer botao abre Popover com:
   - Titulo contextual: "Dano sofrido" / "Cura recebida" / "Temp HP"
   - Input numerico (inteiro positivo, 1-9999, `inputMode="numeric"`)
   - Botao confirmar (✓) e cancelar (✕)
   - Enter submete, Escape cancela, tap outside fecha
   - Input com autoFocus

3. **Botoes desabilitados durante status offline.** Se `connectionStatus !== "connected"`, botoes ficam `opacity-50 pointer-events-none`.

### Broadcast & Backend

4. **Evento unico `player:hp_action` enviado ao DM.** Payload: `{ player_name, combatant_id, action: "damage" | "heal" | "temp_hp", amount }`. Segue connection check de `player:end_turn`.

5. **DM recebe e aplica automaticamente.** Handler no `CombatSessionClient.tsx` valida payload e chama a funcao correspondente:
   - `action === "damage"` → `handleApplyDamage(id, amount, { source: player_name })`
   - `action === "heal"` → `handleApplyHealing(id, amount)` (com source no log)
   - `action === "temp_hp"` → `handleSetTempHp(id, amount)` (com source no log)
   
   Cada funcao automaticamente: broadcast `combat:hp_update`, persist no DB, log no combat-log-store.

6. **Toast de notificacao no DM.** Quando DM recebe `player:hp_action`:
   - Dano: `"{name}: −{amount} HP"` (vermelho)
   - Cura: `"{name}: +{amount} HP"` (verde)
   - Temp: `"{name}: +{amount} temp HP"` (azul)

7. **Evento suprimido no sanitizePayload.** `player:hp_action` NAO e re-broadcast pra outros players. O efeito chega via `combat:hp_update` do DM.

### Optimistic Update

8. **Optimistic update local imediato.** Ao confirmar, o player ve o HP mudar antes do round-trip:
   - Dano: temp absorve → current reduz (mesma logica do DM)
   - Cura: current = min(max_hp, current + amount)
   - Temp: temp = max(current_temp, amount), cap 9999

9. **Protection window de 5s.** Ref `hpActionOptimisticRef` com timestamp. State_sync dentro de 5s nao sobrescreve o HP optimista. Identico ao pattern `deathSaveOptimisticRef`.

### Audit Log

10. **Todas as acoes logadas com tag `(self-report)`.** No combat log, entradas geradas por player HP action mostram source como `"{player_name} (self-report)"`. Exemplo:
    ```
    [R3 14:32] Thorin (self-report) → Thorin: 8 damage
    [R3 14:33] Thorin (self-report) → Thorin: +15 healing
    [R3 14:34] Thorin (self-report) → Thorin: +10 temp HP
    ```
    O DM ve essas entradas no log de combate em tempo real. Se o DM tambem aplica dano ao mesmo player, a entrada do DM NAO tem `(self-report)` — diferenciacao clara.

11. **Temp HP ganha log entry.** Hoje `handleSetTempHp` nao gera log. Adicionar entrada type "system" ou novo type "temp_hp" com details.

### Seguranca

12. **Player so pode alterar o proprio HP.** Guard no handler do DM: `combatant.is_player === true` E `combatant.name === player_name` (ou validacao por token). Rejeitar silenciosamente payloads que tentam alterar outro combatante.

13. **Amount validado server-side.** O handler valida: `typeof amount === "number" && amount > 0 && amount <= 9999 && Number.isInteger(amount)`.

---

## Abordagem Tecnica

### 1. Novo tipo de evento realtime

Em `lib/types/realtime.ts`:

```typescript
// Adicionar ao union RealtimeEventType:
| "player:hp_action"

// Nova interface:
export interface RealtimePlayerHpAction {
  type: "player:hp_action";
  player_name: string;
  combatant_id: string;
  action: "damage" | "heal" | "temp_hp";
  amount: number;
}

// Adicionar ao union RealtimeEvent:
| RealtimePlayerHpAction

// NAO adicionar ao SanitizedEvent — evento e suprimido
```

### 2. Sanitizacao: suprimir player:hp_action

Em `lib/realtime/broadcast.ts`, na funcao `sanitizePayload`:

```typescript
if (event.type === "player:hp_action") return null;
```

### 3. Componente reutilizavel: PlayerHpActions

Criar `components/player/PlayerHpActions.tsx` — componente com os 3 botoes e popover. Reutilizado no BottomBar (mobile) e no card Own Character (desktop).

```typescript
interface PlayerHpActionsProps {
  characterId: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  connectionStatus: string;
  onHpAction: (combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => void;
}

export function PlayerHpActions({
  characterId, currentHp, maxHp, tempHp, connectionStatus, onHpAction
}: PlayerHpActionsProps) {
  const [activeAction, setActiveAction] = useState<"damage" | "heal" | "temp_hp" | null>(null);
  const [value, setValue] = useState("");
  const isOffline = connectionStatus !== "connected";

  const actions = [
    { key: "damage" as const, label: t("hp_damage"), icon: Minus, color: "text-red-400", border: "border-red-500/30", disabled: currentHp <= 0 },
    { key: "heal" as const, label: t("hp_heal"), icon: Plus, color: "text-green-400", border: "border-green-500/30", disabled: false },
    { key: "temp_hp" as const, label: t("hp_temp"), icon: Shield, color: "text-blue-400", border: "border-blue-500/30", disabled: currentHp <= 0 },
  ];

  const handleSubmit = () => {
    const amount = parseInt(value, 10);
    if (!activeAction || !amount || amount <= 0 || amount > 9999) return;
    onHpAction(characterId, activeAction, amount);
    setActiveAction(null);
    setValue("");
  };

  return (
    <div className="flex items-center gap-1">
      {actions.map(({ key, label, icon: Icon, color, border, disabled }) => (
        <Popover
          key={key}
          open={activeAction === key}
          onOpenChange={(open) => {
            setActiveAction(open ? key : null);
            if (!open) setValue("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              disabled={isOffline || disabled}
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded border border-transparent transition-colors",
                isOffline || disabled
                  ? "opacity-30 pointer-events-none"
                  : `${color} hover:${border}`
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className={`w-auto p-2 bg-[#1a1a2e] ${border}`}>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") setActiveAction(null);
                }}
                className={`w-14 h-7 text-center text-sm font-mono bg-black/50 ${border} rounded`}
                placeholder="0"
              />
              <button type="button" onClick={handleSubmit}
                className={`h-7 px-2 text-xs font-medium rounded text-white ${
                  key === "damage" ? "bg-red-600/80" : key === "heal" ? "bg-green-600/80" : "bg-blue-600/80"
                }`}>
                ✓
              </button>
              <button type="button" onClick={() => setActiveAction(null)}
                className="h-7 px-2 text-xs font-medium bg-white/10 rounded">
                ✕
              </button>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
```

### 4. Integrar no PlayerBottomBar (mobile)

Em `PlayerBottomBar.tsx`, adicionar abaixo do HP bar, acima das conditions:

```typescript
interface PlayerBottomBarProps {
  // ... props existentes
  onHpAction?: (combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => void;
  connectionStatus?: string;
}

// No render, abaixo do HP bar:
{onHpAction && (
  <PlayerHpActions
    characterId={character.id}
    currentHp={character.current_hp}
    maxHp={character.max_hp}
    tempHp={character.temp_hp ?? 0}
    connectionStatus={connectionStatus ?? "disconnected"}
    onHpAction={onHpAction}
  />
)}
```

### 5. Integrar no card "Own Character" (desktop)

Em `PlayerInitiativeBoard.tsx`, no card do proprio personagem (linhas 422-551):

```typescript
{onHpAction && (
  <PlayerHpActions
    characterId={primaryPlayerChar.id}
    currentHp={primaryPlayerChar.current_hp ?? 0}
    maxHp={primaryPlayerChar.max_hp ?? 0}
    tempHp={primaryPlayerChar.temp_hp ?? 0}
    connectionStatus={connectionStatus}
    onHpAction={onHpAction}
  />
)}
```

### 6. Callback no PlayerJoinClient

Em `PlayerJoinClient.tsx`:

```typescript
const hpActionOptimisticRef = useRef(0);

const handleHpAction = useCallback((combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => {
  const ch = channelRef.current;
  if (!ch || connectionStatus !== "connected") {
    toast.error(tRef.current("sync_offline"));
    return;
  }

  // Broadcast to DM
  ch.send({
    type: "broadcast",
    event: "player:hp_action",
    payload: {
      player_name: registeredName,
      combatant_id: combatantId,
      action,
      amount,
    },
  });

  // Optimistic local update
  hpActionOptimisticRef.current = Date.now();
  updateCombatants((prev) =>
    prev.map((c) => {
      if (c.id !== combatantId) return c;
      if (action === "damage") {
        let remaining = amount;
        let newTempHp = c.temp_hp ?? 0;
        if (newTempHp > 0) {
          const absorbed = Math.min(newTempHp, remaining);
          newTempHp -= absorbed;
          remaining -= absorbed;
        }
        return { ...c, current_hp: Math.max(0, (c.current_hp ?? 0) - remaining), temp_hp: newTempHp };
      }
      if (action === "heal") {
        return { ...c, current_hp: Math.min(c.max_hp ?? 0, (c.current_hp ?? 0) + amount) };
      }
      if (action === "temp_hp") {
        return { ...c, temp_hp: Math.min(9999, Math.max(c.temp_hp ?? 0, amount)) };
      }
      return c;
    })
  );
}, [connectionStatus, registeredName, updateCombatants]);
```

Passar o callback para `PlayerInitiativeBoard`:
```typescript
<PlayerInitiativeBoard
  // ... props existentes
  onHpAction={handleHpAction}
  connectionStatus={connectionStatus}
/>
```

### 7. Handler no DM (CombatSessionClient.tsx)

```typescript
const handlePlayerHpAction = ({ payload }: { payload: Record<string, unknown> }) => {
  if (!active) return;
  const { combatant_id, action, amount, player_name } = payload as {
    combatant_id: string;
    action: "damage" | "heal" | "temp_hp";
    amount: number;
    player_name: string;
  };

  // Validacoes
  if (!combatant_id || !action || !amount) return;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > 9999) return;
  if (!["damage", "heal", "temp_hp"].includes(action)) return;

  const combatant = useCombatStore.getState().combatants.find((c) => c.id === combatant_id);
  if (!combatant || !combatant.is_player) return;

  const source = `${player_name} (self-report)`;

  switch (action) {
    case "damage":
      handleApplyDamageRef.current(combatant_id, amount, { source });
      toast(`${player_name}: −${amount} HP`, { duration: 3000 });
      break;
    case "heal":
      handleApplyHealingRef.current(combatant_id, amount);
      // Log com source self-report (handleApplyHealing usa getCurrentActorName — override)
      useCombatLogStore.getState().addEntry({
        round: useCombatStore.getState().round_number,
        type: "heal",
        actorName: source,
        targetName: combatant.name,
        description: `${combatant.name} healed for ${amount} HP`,
      });
      toast(`${player_name}: +${amount} HP`, { duration: 3000 });
      break;
    case "temp_hp":
      handleSetTempHpRef.current(combatant_id, amount);
      // Log temp HP (novo — nao existe hoje)
      useCombatLogStore.getState().addEntry({
        round: useCombatStore.getState().round_number,
        type: "system",
        actorName: source,
        targetName: combatant.name,
        description: `${combatant.name} gained ${amount} temp HP`,
      });
      toast(`${player_name}: +${amount} temp HP`, { duration: 3000 });
      break;
  }
};

ch.on("broadcast", { event: "player:hp_action" }, handlePlayerHpAction);
```

**Nota sobre refs:** Adicionar refs pra `handleApplyHealing` e `handleSetTempHp` no mesmo pattern de `handleApplyDamageRef` / `handleAdvanceTurnRef`.

**Nota sobre heal log:** O `handleApplyHealing` internamente ja gera um log entry com `actorName: getCurrentActorName()` (que retorna o nome do combatente do turno atual). Pra self-report, o actorName deveria ser `source`. Duas opcoes:
- **Opcao A:** Adicionar parametro `source?` ao `handleApplyHealing` (mais limpo)
- **Opcao B:** Adicionar log entry manualmente no handler (como mostrado acima) — pode gerar log duplicado

**Decisao:** Opcao A — adicionar `source?: string` ao `handleApplyHealing`. Se presente, usa como `actorName`. Senao, usa `getCurrentActorName()`. Mudanca minima na funcao existente.

### 8. Novas chaves i18n

```json
// pt-BR
"hp_damage": "−Dano",
"hp_heal": "+Cura",
"hp_temp": "🛡Temp",
"hp_damage_placeholder": "Dano sofrido",
"hp_heal_placeholder": "Cura recebida",
"hp_temp_placeholder": "Temp HP",
"hp_self_report": "(self-report)"

// en
"hp_damage": "−Damage",
"hp_heal": "+Heal",
"hp_temp": "🛡Temp",
"hp_damage_placeholder": "Damage taken",
"hp_heal_placeholder": "Healing received",
"hp_temp_placeholder": "Temp HP",
"hp_self_report": "(self-report)"
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/realtime.ts` | Novo tipo `player:hp_action`, interface `RealtimePlayerHpAction`, union updates |
| `lib/realtime/broadcast.ts` | Suprimir `player:hp_action` em `sanitizePayload()` |
| `components/player/PlayerHpActions.tsx` (novo) | Componente reutilizavel: 3 botoes + popovers com input numerico |
| `components/player/PlayerBottomBar.tsx` | Nova prop `onHpAction` + `connectionStatus`, renderizar `PlayerHpActions` |
| `components/player/PlayerInitiativeBoard.tsx` | Nova prop `onHpAction` + `connectionStatus`, renderizar `PlayerHpActions` no card Own Character, passar pro BottomBar |
| `components/player/PlayerJoinClient.tsx` | Callback `handleHpAction`, `hpActionOptimisticRef`, passar props ao board |
| `components/session/CombatSessionClient.tsx` | Handler `handlePlayerHpAction`, refs pra healing/tempHp, toast por acao |
| `lib/hooks/useCombatActions.ts` | Adicionar `source?: string` ao `handleApplyHealing` pra log correto |
| `messages/pt-BR.json` | Chaves hp_damage, hp_heal, hp_temp, placeholders |
| `messages/en.json` | Mesmas chaves |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

**Dano (self-report)**

1. **Happy path — player aplica dano**
   - [ ] Player com 50/50 HP toca [−Dano]
   - [ ] Popover abre com input numerico e foco automatico
   - [ ] Digita "8", confirma (✓)
   - [ ] HP local atualiza imediatamente pra 42/50 (optimistic)
   - [ ] DM ve toast "{player}: −8 HP"
   - [ ] HP no DM view atualiza pra 42/50
   - [ ] Log de combate: "{player} (self-report) → {player}: 8 damage"
   - [ ] Outros players veem HP atualizado

2. **Dano com temp HP**
   - [ ] Player 30/50 HP + 10 temp → aplica 15 dano
   - [ ] Resultado: 25/50 HP + 0 temp (temp absorve 10, current perde 5)

3. **Dano que leva a 0 HP**
   - [ ] Player 5/50 HP → aplica 10 dano → HP vai a 0
   - [ ] Death save prompt no DM, death save tracker no player
   - [ ] Botao [−Dano] desabilita (current_hp === 0)
   - [ ] Botao [+Cura] continua ativo (pode curar de 0)

**Cura (self-report)**

4. **Player aplica cura**
   - [ ] Player com 30/50 HP toca [+Cura]
   - [ ] Popover verde, digita "15", confirma
   - [ ] HP sobe pra 45/50 (optimistic, delta "+15" verde)
   - [ ] DM ve toast e log

5. **Cura nao excede max HP**
   - [ ] Player 45/50 HP → aplica 20 cura → HP = 50/50 (cap em max)

6. **Cura de 0 HP (pocao, healing word)**
   - [ ] Player com 0/50 HP → [+Cura] esta ativo
   - [ ] Aplica 10 cura → HP sobe pra 10/50
   - [ ] Death save tracker desaparece
   - [ ] Botao [−Dano] reativa

**Temp HP (self-report)**

7. **Player aplica temp HP**
   - [ ] Player toca [🛡Temp], digita "10", confirma
   - [ ] Temp HP aparece no display (+10 azul)
   - [ ] DM ve toast e log

8. **Temp HP nao acumula (max)**
   - [ ] Player com 5 temp HP → aplica 10 temp → resultado: 10 temp (max, nao soma)
   - [ ] Player com 10 temp HP → aplica 5 temp → resultado: 10 temp (mantem o maior)

**Validacao & Edge Cases**

9. **Input invalido**
   - [ ] Valor vazio → nao submete
   - [ ] Valor 0 → nao submete
   - [ ] Letras → nao aceita (regex)
   - [ ] > 9999 → nao submete
   - [ ] Enter → submete, Escape → fecha, tap outside → fecha

10. **Conexao offline**
    - [ ] Botoes ficam `opacity-30` e `pointer-events-none`
    - [ ] Nenhum broadcast enviado

11. **Protection window**
    - [ ] Aplica dano → state_sync dentro de 5s NAO sobrescreve HP otimista
    - [ ] Apos 5s → state_sync aplica normalmente

12. **Seguranca**
    - [ ] Payload manipulado com combatant_id de monstro → DM ignora
    - [ ] Amount negativo → DM ignora
    - [ ] Action invalida → DM ignora

**Audit Log**

13. **DM ve todas as acoes no log**
    - [ ] Dano self-report: actorName = "{name} (self-report)"
    - [ ] Cura self-report: actorName = "{name} (self-report)"
    - [ ] Temp HP self-report: log entry do tipo "system"
    - [ ] DM aplica dano no mesmo player → log SEM "(self-report)" — diferenciacao clara

**Desktop**

14. **Card "Own Character"**
    - [ ] Tres botoes visiveis abaixo do HP no card destacado
    - [ ] Popovers funcionam identicamente ao mobile
    - [ ] Layout nao quebra

### Testes Automatizados (recomendados)

- Sanitizacao: `player:hp_action` retorna `null`
- Validacao handler DM: payloads invalidos rejeitados
- Optimistic update: damage com temp HP calcula corretamente
- Optimistic update: heal respeita max HP cap
- Optimistic update: temp HP usa max(current, new)

---

## Notas de Paridade

- **Guest Combat (DM offline):** DM aplica dano/cura/temp direto no store. Nao ha players. **Nenhuma mudanca necessaria.**
- **Player anonimo (`/join`):** Usa `PlayerJoinClient` → recebe a feature automaticamente.
- **Player autenticado (`/invite`):** Mesmo componente. **Paridade automatica.**
- **Multiplos players:** Cada player so controla o proprio combatant (guard no handler). Re-broadcast `combat:hp_update` atualiza todos.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Player aplica valor errado | DM pode ajustar HP a qualquer momento. Log mostra tudo com "(self-report)". |
| Race condition: player e DM aplicam dano simultaneamente | Zustand e sequencial — sem race. O segundo broadcast reflete o estado correto. |
| Abuso: spam de acoes | Popover fecha apos submit — rate limit natural. Se necessario, debounce de 500ms. |
| Broadcast perdido | Optimistic update local. Se DM nao recebe, HP reverter em 5s. Player pode repetir. |
| Cura explorada (player cura acima do max) | `min(max_hp, current + amount)` — cap no optimistic E no DM handler. |
| handleApplyHealing gera log duplicado | Opcao A: adicionar `source?` ao handleApplyHealing pra evitar log manual extra. |

---

## Definicao de Pronto

- [ ] Tipo `player:hp_action` adicionado em `lib/types/realtime.ts`
- [ ] Evento suprimido em `sanitizePayload`
- [ ] Componente `PlayerHpActions` criado e funcional
- [ ] Tres botoes visiveis no BottomBar (mobile) e card Own Character (desktop)
- [ ] Popover com input numerico e validacao
- [ ] Dano: optimistic + DM handler + broadcast + log "(self-report)"
- [ ] Cura: optimistic + DM handler + broadcast + log "(self-report)" + cap max_hp
- [ ] Temp HP: optimistic + DM handler + broadcast + log + regra max
- [ ] Protection window 5s contra state_sync stale
- [ ] Toast colorido por acao no DM
- [ ] Botoes desabilitados offline
- [ ] Seguranca: so o proprio combatant is_player
- [ ] handleApplyHealing aceita `source?` pra log correto
- [ ] Chaves i18n em pt-BR e en
- [ ] Testes manuais 1-14 passando
- [ ] Code review aprovado
