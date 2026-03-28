# Story B.1.8: Hidden NPCs with Dramatic Reveal

Status: ready-for-dev

## Story

**Como** DM, **quero** marcar NPCs como ocultos na iniciativa **para que** jogadores não vejam emboscadas até o momento dramático da revelação.

## Context

Atualmente todos os combatants na iniciativa são visíveis para o player view via broadcast. O DM não tem como preparar emboscadas sem adicionar os monstros DURANTE o combate (quebrando a imersão).

A Shieldmaiden permite "Hidden" NPCs que participam da iniciativa mas são invisíveis no player screen até revelados.

**UX Assessment:** VERDE — Risco BAIXO. Um boolean no combatant + ícone de olho discreto no CombatantRow. A complexidade está no broadcast filter, não na UI.

## Acceptance Criteria

1. Add `is_hidden` field to Combatant type:
   ```typescript
   // In lib/types/combat.ts, add to Combatant interface:
   /** Hidden from player view (for ambushes). DM-only visibility. */
   is_hidden: boolean;
   ```
   - Default: `false`
   - Only relevant for non-player combatants (`is_player === false`)

2. Update combat-store with `toggleHidden` action:
   ```typescript
   toggleHidden: (id: string) => void;
   ```
   - Toggles `is_hidden` on the combatant
   - Pushes to undo stack: `{ type: "hidden", combatantId, wasHidden }`

3. DM UI — CombatantRow changes:
   - Add eye icon button (👁️/👁️‍🗨️) next to the defeat button for non-player combatants
   - When hidden: eye icon is slashed (EyeOff from lucide), row has subtle dashed border and opacity 0.7
   - When visible: eye icon is normal (Eye from lucide), no special styling
   - Click toggles hidden state
   - Tooltip: "Ocultar dos jogadores" / "Revelar aos jogadores"
   - Hidden combatants still participate in initiative order and turns (DM plays them)

4. Player View filtering:
   - In `sanitizeCombatant()` in `broadcast.ts`: skip combatants where `is_hidden === true`
   - In `session:state_sync`: filter out hidden combatants from the array
   - In `combat:combatant_add`: don't broadcast if combatant is hidden
   - When DM reveals (toggles hidden OFF): broadcast `combat:combatant_add` for that combatant

5. Reveal animation on Player View:
   - When a previously-hidden combatant appears via `combat:combatant_add`:
     - Animate with a dramatic entrance: scale from 0.8 + fade-in + brief red flash
     - Optional: play a subtle "whoosh" sound effect if audio is enabled
   - The reveal should feel like a "surprise!" moment

6. Encounter Setup integration:
   - In EncounterSetup / AddCombatantForm: add "Oculto" checkbox when adding monsters
   - This lets the DM pre-configure ambush monsters before combat starts

7. Turn handling for hidden combatants:
   - When a hidden combatant's turn comes:
     - DM sees the turn normally (can act, roll, etc.)
     - Player view skips over hidden combatants (shows next visible combatant's turn)
     - Auto-advance for players: if current turn is a hidden NPC, player view shows "DM's turn" generic indicator

8. Keyboard shortcut:
   - `H` while focused on a combatant row → toggle hidden

## i18n Keys

- `combat.hide_from_players`: "Ocultar dos jogadores" / "Hide from players"
- `combat.reveal_to_players`: "Revelar aos jogadores" / "Reveal to players"
- `combat.hidden_indicator`: "Oculto" / "Hidden"
- `combat.dm_turn`: "Turno do Mestre" / "DM's Turn"

## Technical Notes

- `is_hidden` must be added to the DB schema (`combatants` table) — default false, nullable for backwards compat
- The broadcast sanitization layer is the key filter point — hidden combatants never reach the player channel
- When DM reveals: generate a `combat:combatant_add` event (same as adding mid-combat)
- Turn advance broadcast must account for hidden NPCs: if the new current turn is hidden, send the next visible combatant's index to players
- State sync on reconnect: filter hidden combatants from the sync payload

## Out of Scope

- Partial reveal (showing silhouette but not identity) — future enhancement
- Auto-reveal on attack (when hidden NPC attacks, auto-reveal) — nice-to-have for V2
- Multiple visibility levels (hidden/obscured/visible) — overkill for V1
