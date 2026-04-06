# Feature: Reaction Tracker (Bolinha de Reação)

**Data**: 2026-04-05
**Status**: Implementado

## Resumo

Indicador visual de **reação** (D&D 5e) para todos os combatentes — monstros e jogadores. Similar ao tracker de Legendary Actions, mas com lógica simplificada (boolean em vez de contador).

## Comportamento

| Aspecto | Detalhe |
|---------|---------|
| **Visual** | Bolinha única (dot) — verde/vazia = disponível, vermelho/preenchida = usada |
| **Reset** | Automático quando o turno do combatente começa |
| **DM** | Controle total — pode toggle em qualquer combatente |
| **Jogador** | Pode toggle na própria reação via player view |
| **Broadcast** | Reação é visível para todos os jogadores (diferente de Legendary Actions que é DM-only) |
| **Guest** | DM guest controla reações localmente (sem realtime) |

## Parity Check (CLAUDE.md rule)

- [x] **Guest (`/try`)** — DM guest toggle local, reset no turno
- [x] **Anônimo (`/join`)** — Jogador vê reação de todos, toggle na própria
- [x] **Autenticado (`/invite`)** — Mesmo que anônimo

## Arquivos Alterados

### Tipos e Estado
- `lib/types/combat.ts` — `reaction_used: boolean` no Combatant, `toggleReaction` + `setReactionUsed` no CombatActions
- `lib/types/realtime.ts` — `combat:reaction_toggle` event type + `RealtimeReactionToggle` interface
- `lib/stores/combat-store.ts` — actions + reset no `advanceTurn()`
- `lib/stores/guest-combat-store.ts` — mesmas actions + reset

### UI (DM)
- `components/combat/CombatantRow.tsx` — bolinha de reação após legendary actions
- `components/session/CombatSessionClient.tsx` — wiring do toggle + broadcast + handler de player toggle

### UI (Player)
- `components/player/PlayerInitiativeBoard.tsx` — bolinha (toggle para own char, read-only para outros)
- `components/player/PlayerJoinClient.tsx` — handler de `combat:reaction_toggle` + toggle broadcast para DM

### Guest
- `components/guest/GuestCombatClient.tsx` — toggle wiring + `reaction_used: false` em todos os pontos de criação

### Broadcast/Sanitização
- `lib/realtime/sanitize.ts` — `combat:reaction_toggle` passa para jogadores (hidden combatants suprimidos)
- `lib/realtime/broadcast.ts` — `reaction_used` NÃO é sanitizado (jogadores veem)

### i18n
- `messages/en.json` — `reaction_inline`, `reaction_available`, `reaction_used`
- `messages/pt-BR.json` — `reaction_inline` (Reação), `reaction_available` (Disponível), `reaction_used` (Usada)

### Criação de Combatentes (reaction_used: false)
- `constants/sample-encounter.ts`
- `components/combat/EncounterSetup.tsx` (11 pontos)
- `components/combat/AddCombatantForm.tsx`
- `lib/utils/lair-action.ts`
- `lib/supabase/encounter.ts`
- `lib/realtime/reconnect.ts`
- `app/api/broadcast/route.ts`
- `app/app/session/[id]/page.tsx`

## Diferenças vs Legendary Actions

| Aspecto | Legendary Actions | Reaction |
|---------|-------------------|----------|
| Tipo | `number` (counter 0..N) | `boolean` (used/available) |
| Reset | Quando **round** completa (todos jogaram) | Quando **turno** do combatente começa |
| Visibilidade | DM-only (sanitizado do broadcast) | Todos veem (passa no broadcast) |
| Quem toggle | Só DM | DM + jogador (own char) |
| Quem tem | Só monstros com LA | Todos os combatentes |
