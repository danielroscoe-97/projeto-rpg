# Story: Player Combat UX & Visual Feedback

Status: ready-for-dev

## Story

As a **player** in combat,
I want clear visual feedback when my HP changes, dramatic death save moments, combat history visibility, and responsive turn indicators,
so that I feel immersed in the combat and understand what is happening to my character at all times.

## Context

The player combat view is functionally complete but emotionally flat. HP changes happen silently (just a smooth CSS transition), there's no combat log despite the code being fully implemented but disabled (`{false &&}`), death saves lack dramatic feedback, the mobile bottom bar doesn't indicate "your turn", End Turn has no delivery confirmation, and session revocation is handled with a silent toast. This story adds the visual/UX layers that make combat memorable.

## Acceptance Criteria

### U1: Reactivate Combat Log
1. Re-enable the combat log in `PlayerInitiativeBoard.tsx` (remove the `{false &&}` wrapper).
2. Combat log shows last 5 entries in a collapsible section below the initiative list.
3. Entries color-coded: red = damage, green = heal, gold = turn change, purple = condition change.
4. Each entry shows relative timestamp ("2m ago", "just now").
5. Collapsible by default on mobile (expanded on desktop with space).
6. Log auto-scrolls to newest entry.

### U2: HP Delta Visual Feedback
7. When player's own character receives damage: HP number briefly flashes red, and a floating "-X" text animates upward and fades out (X = damage amount).
8. When player's own character receives healing: HP number briefly flashes green, and a floating "+X" text animates upward and fades out.
9. Delta calculated by comparing `prev_hp` vs `new_hp` on `combat:hp_update` event.
10. Animation duration: 1.5 seconds, Framer Motion.
11. Delta shows on both desktop character card AND mobile bottom bar.
12. If temp_hp changes, show in purple with "temp" label.
13. When HP reaches 0: extra dramatic flash (red pulse on entire character card, 2 iterations).

### U3: Mobile Bottom Bar Turn Indicator
14. When it is the player's turn, mobile bottom bar gets a pulsing amber/gold border (2px, animation `pulse`).
15. Background shifts subtly to amber-900/10 tint.
16. "End Turn" button appears inline in the bottom bar (right side) during player's turn.
17. When NOT player's turn: border returns to default, no End Turn button.
18. Transition: 300ms ease-in-out.

### U4: Death Save Dramatic Feedback
19. When death saves reach 3 successes (stabilized): green pulse overlay on character card, text "Stabilized!" with Framer Motion scale-in animation.
20. When death saves reach 3 failures (death): red pulse overlay on character card, text "Fallen..." with fade-in animation, card gets permanent `opacity-30` with grayscale filter.
21. Each individual death save click: button shows brief checkmark (success) or X (failure) animation before returning to normal state.
22. Death save counter dots animate in sequence (scale bounce) when a new save is recorded.

### U5: End Turn Delivery Confirmation
23. When player clicks "End Turn" and the turn successfully advances (detected by next `combat:turn_advance` broadcast), show a brief checkmark icon replacing "..." for 500ms before resetting button.
24. If 5 seconds pass after "End Turn" without receiving `combat:turn_advance`, show amber warning icon and text "Trying again..." and re-broadcast the event once.
25. If 10 seconds pass total: show red error with "Connection issue — try refreshing" message.

### B1: Session Revoked — Clear Banner
26. When `combat:session_revoked` event fires, show a full-width red banner at top: "Your session was taken over from another device."
27. Banner persists for 5 seconds, then fades.
28. Include a "Rejoin" button in the banner that navigates back to lobby with rejoin flow pre-selected.
29. Replace the current silent toast with this banner.

### B2: Late-Join Maximum Timeout
30. If late-join status is "waiting" or "polling" for more than 2 minutes, show a timeout message: "DM hasn't responded. Try refreshing the page or ask your DM."
31. Include a "Refresh" button that reloads the page.
32. Stop polling after 2-minute timeout to save resources.

### B3: Progressive Reveal — Recalculate on New Combatant
33. When `combat:combatant_add` fires during Round 1, recalculate `maxRevealedIndex` to include the new combatant if their initiative places them at or before the current turn position.
34. Newly added combatant mid-Round-1 gets the same entrance animation as other revealed combatants.

## Tasks / Subtasks

- [ ] Task 1: Reactivate Combat Log (AC: #1-6)
  - [ ] In `PlayerInitiativeBoard.tsx` line ~490, remove the `{false &&}` wrapper
  - [ ] Add collapsible container with ChevronDown toggle
  - [ ] Style entries by type (damage=red, heal=green, turn=gold, condition=purple)
  - [ ] Auto-scroll to bottom on new entry
  - [ ] Default collapsed on mobile (`lg:` expanded)
  - [ ] Limit display to 5 most recent entries

- [ ] Task 2: HP Delta Visual Feedback (AC: #7-13)
  - [ ] In `PlayerJoinClient.tsx` `combat:hp_update` handler (line ~370):
    - [ ] Store `prevHp` before update, calculate `delta = new_hp - prev_hp`
    - [ ] Set `hpDelta` state: `{ combatantId, delta, type: "damage"|"heal"|"temp", timestamp }`
  - [ ] Pass `hpDelta` to `PlayerInitiativeBoard` as prop
  - [ ] In own-character card (desktop, line ~424):
    - [ ] AnimatePresence: floating "+X" / "-X" text with y-axis exit animation
    - [ ] HP number flash: red bg-flash for damage, green for heal (150ms × 2)
  - [ ] In `PlayerBottomBar.tsx`:
    - [ ] Same floating delta text, positioned above HP bar
    - [ ] Same HP number flash
  - [ ] HP=0 special: red pulse on entire card border (2 iterations, 500ms each)
  - [ ] Auto-clear delta after 1.5s timeout

- [ ] Task 3: Mobile Bottom Bar Turn Indicator (AC: #14-18)
  - [ ] Add `isPlayerTurn` prop to `PlayerBottomBar`
  - [ ] Conditional classes: `border-amber-500 animate-pulse bg-amber-900/10` when active
  - [ ] Add "End Turn" button (same handler as desktop)
  - [ ] Pass `onEndTurn` and `isEndTurnPending` props to bottom bar
  - [ ] Transition: `transition-all duration-300 ease-in-out`

- [ ] Task 4: Death Save Dramatic Feedback (AC: #19-22)
  - [ ] In `PlayerJoinClient.tsx`, detect death save resolution:
    - [ ] Compare prev vs new `death_saves` on `combat:hp_update`
    - [ ] Set `deathSaveResolution` state: `"stabilized" | "fallen" | null`
  - [ ] In `PlayerInitiativeBoard.tsx`, render overlay on resolution:
    - [ ] Stabilized: green ring pulse + "Stabilized!" text (Framer scale 0.5→1)
    - [ ] Fallen: red ring pulse + "Fallen..." text (Framer fade 0→1), card goes `opacity-30 grayscale`
  - [ ] In `DeathSaveTracker.tsx`:
    - [ ] Button click: brief checkmark/X icon animation (200ms)
    - [ ] Counter dots: scale bounce (1→1.3→1) on new save

- [ ] Task 5: End Turn Delivery Confirmation (AC: #23-25)
  - [ ] In `PlayerInitiativeBoard.tsx`, track `endTurnSentAt` timestamp
  - [ ] On `combat:turn_advance` received: if pending, show checkmark 500ms → reset
  - [ ] `setTimeout(5000)`: if still pending, show amber retry + re-broadcast
  - [ ] `setTimeout(10000)`: if still pending, show red error message
  - [ ] Clear all timers on unmount or on successful turn advance

- [ ] Task 6: Session Revoked Banner (AC: #26-29)
  - [ ] In `PlayerJoinClient.tsx` session_revoked handler (line ~532):
    - [ ] Replace `toast.error` with `setSessionRevokedBanner(true)`
    - [ ] Render full-width red banner component at top of view
    - [ ] "Rejoin" button: navigate to lobby with `rejoinStatus: "idle"`
    - [ ] Auto-dismiss after 5 seconds with fade-out

- [ ] Task 7: Late-Join Timeout (AC: #30-32)
  - [ ] In `PlayerLobby.tsx`, add 2-minute maximum timeout
  - [ ] `setTimeout(120000)` on entering "waiting" state
  - [ ] On timeout: set status to "timeout", stop polling
  - [ ] Show message with "Refresh" button (`window.location.reload()`)

- [ ] Task 8: Progressive Reveal Fix (AC: #33-34)
  - [ ] In `PlayerInitiativeBoard.tsx` progressive reveal logic (line ~214):
    - [ ] On `combatants` array change during Round 1, recalculate `maxRevealedIndex`
    - [ ] If new combatant's position ≤ current turn index, include in revealed set
    - [ ] Apply same `revealedIds` entrance animation to late-added combatant

## Dev Notes

### Files to Create/Modify
- Modify: `components/player/PlayerInitiativeBoard.tsx` (combat log, HP delta, death save overlay, end turn confirmation, progressive reveal fix)
- Modify: `components/player/PlayerBottomBar.tsx` (turn indicator, HP delta, end turn button)
- Modify: `components/player/PlayerJoinClient.tsx` (HP delta calculation, death save detection, session revoked banner, pass new props)
- Modify: `components/player/PlayerLobby.tsx` (late-join timeout)
- Modify: `components/combat/DeathSaveTracker.tsx` (button animation, dot bounce)

### HP Delta Implementation Pattern
```typescript
// In PlayerJoinClient combat:hp_update handler
const prevHp = existingCombatant.current_hp ?? 0;
const newHp = payload.current_hp;
const delta = newHp - prevHp;
if (delta !== 0) {
  setHpDelta({
    combatantId: payload.combatant_id,
    delta,
    type: delta < 0 ? "damage" : "heal",
    timestamp: Date.now(),
  });
}
```

### Floating Delta Animation Pattern
```typescript
<AnimatePresence>
  {hpDelta && (
    <motion.span
      key={hpDelta.timestamp}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: -20 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 1.5 }}
      className={hpDelta.type === "damage" ? "text-red-400" : "text-green-400"}
    >
      {hpDelta.delta > 0 ? "+" : ""}{hpDelta.delta}
    </motion.span>
  )}
</AnimatePresence>
```

### Key References
- Combat log code (disabled): `PlayerInitiativeBoard.tsx:490-492, 678`
- Combat log generation: `PlayerJoinClient.tsx:254-298`
- HP update handler: `PlayerJoinClient.tsx:370-387`
- Session revoked handler: `PlayerJoinClient.tsx:532-540`
- Late-join timeout: `PlayerJoinClient.tsx:898-939`
- Progressive reveal: `PlayerInitiativeBoard.tsx:214-254`
- Mobile bottom bar: `PlayerBottomBar.tsx:1-140`
- End turn handler: `PlayerJoinClient.tsx:1072-1083`
- Death save tracker: `DeathSaveTracker.tsx:1-96`
- End turn button (desktop): `PlayerInitiativeBoard.tsx:364-374`

### Testing Notes
- Test HP delta with rapid successive damage/heal events (debounce correctly)
- Test combat log on mobile (should be collapsed by default)
- Test End Turn timeout recovery by throttling network in DevTools
- Test session revoked by opening same join link in two tabs
- Test late-join 2-minute timeout by not responding as DM
- Test progressive reveal by adding combatant mid-Round-1 as DM
- Test death save resolution overlay timing with rapid save clicks
- Test mobile bottom bar End Turn button matches desktop behavior exactly
