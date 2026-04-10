# Bug: Token-Combatant Name Mismatch on Rejoin

**Date**: 2026-04-10
**Severity**: Medium (requires manual DB fix during live session)
**Status**: Documented for future fix

## The Problem

When a player joins a session, they register with a `player_name` on the `session_tokens` table.
The DM then manually creates a combatant in the encounter with whatever name they choose.

**These two names are completely independent.** There's no link between them.

### Real Incident (2026-04-10 live session)

1. Player joined via `/join/0p4a372v226w6i662y1u4h4w1j574w6c` and registered as **"Kamuy"**
2. DM created the combatant in the encounter as **"Kai"** (the actual character name)
3. App crashed (Supabase 504 cascade — see commit `34c3b94`)
4. Player tried to reconnect via same link
5. System looked for combatant named "Kamuy" in the encounter — **not found**
6. Player was stuck: token said "Kamuy", combatant was "Kai"
7. **Manual DB fix required**: updated `session_tokens.player_name` from "Kamuy" to "Kai"

### Why Late-Join Detection Failed

The late-join polling in `PlayerJoinClient.tsx` matches by exact name:

```typescript
// Line ~1327
const found = data.combatants.find(
  (c) => c.is_player && c.name === playerName  // <-- exact match
);
```

If `playerName` (from token) doesn't match `combatant.name` (set by DM), the player is never detected as "accepted".

## Root Cause

There's no foreign key or ID-based link between:
- `session_tokens.player_name` (what the player typed when joining)
- `combatants.name` (what the DM set when adding to initiative)

The match is purely by string comparison, which breaks when:
1. DM renames the combatant (e.g., uses character name instead of player name)
2. Player registers with a nickname different from their character name
3. DM creates the combatant before the player joins (pre-populated initiative)
4. Typos in either name

## How It Was Fixed (Manual)

```sql
-- Updated token player_name to match the combatant name
UPDATE session_tokens
SET player_name = 'Kai', last_seen_at = NOW()
WHERE id = '3a67b47e-fb26-47e2-9e66-6817f47c5bd4';
```

## Proposed Solutions (Future)

### Option A: Link by ID (Recommended)

Add `session_token_id` to `combatants` table. When DM accepts a late-join or adds a player from the registered list, store the token ID on the combatant.

```
combatants.session_token_id → session_tokens.id
```

Matching becomes ID-based instead of name-based. Player can be renamed freely.

### Option B: Link by anon_user_id

Add `anon_user_id` to combatants. When player registers, their anon auth ID is stored on both the token AND the combatant.

```
combatants.anon_user_id = session_tokens.anon_user_id
```

More resilient — survives even if token is replaced.

### Option C: Fuzzy Name Match (Quick Fix)

Use case-insensitive substring matching instead of exact match:

```typescript
const found = data.combatants.find(
  (c) => c.is_player && (
    c.name === playerName ||
    c.name.toLowerCase().includes(playerName.toLowerCase()) ||
    playerName.toLowerCase().includes(c.name.toLowerCase())
  )
);
```

Pros: No schema change. Cons: Still fragile, false positives possible.

### Option D: DM Explicit Link UI

When DM accepts a late-join request, show a dropdown to pick which combatant maps to this player. Store the link at acceptance time.

## Affected Files

- `components/player/PlayerJoinClient.tsx` — late-join polling name match (~line 1327)
- `session_tokens` table — `player_name` column
- `combatants` table — `name` column (no FK to tokens)
- DM combat UI — wherever combatants are created/renamed

## Related: Other Name Mismatches in Session

From the same session, "Knoknik" (token) vs "Noknik wavecaster" (combatant) also had a mismatch but was less critical because that player stayed connected.

## Impact

During a live session with real players, a name mismatch + crash = player completely locked out until DM or developer manually fixes the DB. This is unacceptable for production use at RPG bars (Taverna de Ferro, Pixel Bar demo planned for May 2026).
