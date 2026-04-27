"use client";

/**
 * useAbilityRoll — Wave 3b · Story C7.
 *
 * Hook that orchestrates an ability check or save roll triggered from the
 * `AbilityChip` UI. Three responsibilities, in order:
 *
 *   1. Roll the dice via `lib/utils/dice-roller.ts` (deterministic, testable
 *      in isolation).
 *   2. Persist the result to sessionStorage so a tab refresh doesn't lose
 *      the in-session roll history (24h via expiration field on the entry).
 *   3. Best-effort broadcast a `player:ability_roll` event on the
 *      `campaign:{id}` channel so the Mestre HUD (future PR) can render the
 *      roll live. Fire-and-forget — UI never awaits the broadcast.
 *
 * ## Auth-only by design
 *
 * The roll surface itself is gated by `<AbilityChip clickable={isAuth}>`,
 * but THIS hook does NOT branch on auth — it accepts whatever inputs the
 * caller provides. If the broadcast send fails (e.g. anonymous user with
 * no campaign membership), the failure is swallowed silently and the roll
 * still appears in the local toast + sessionStorage history. The Mestre
 * just won't see it. This matches the Resilient Player Reconnection Rule:
 * the UI MUST react instantly regardless of network state.
 *
 * ## Why not use the existing `broadcastEvent`?
 *
 * `broadcastEvent` (lib/realtime/broadcast.ts) routes through the strict
 * `RealtimeEvent` union and the session-scoped DM channel. The ability-roll
 * event is:
 *   - Player-originated (the DM channel singleton is owned by the Mestre).
 *   - Campaign-scoped, not session-scoped (rolls happen out of combat too).
 *   - Auth-only / non-load-bearing (no offline queue, no journal needed).
 *
 * So we send directly via a one-shot Supabase channel using the same
 * pattern as `lib/supabase/player-identity.ts:749` — open channel, send,
 * remove. That keeps the realtime types untouched (zero risk to the
 * combat surface) and the Mestre listener (next PR) just subscribes to
 * `campaign:{id}` and filters on `event === "player:ability_roll"`.
 */

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  rollAbilityCheck,
  rollAbilitySave,
  type Ability,
  type RollMode,
  type AbilityRollResult,
} from "@/lib/utils/dice-roller";

/** Inputs to the hook — character context the chip already knows. */
export interface UseAbilityRollOptions {
  /** Campaign id for the broadcast topic. Null disables broadcast (still rolls). */
  campaignId: string | null;
  /** Character id for sessionStorage keying + broadcast payload. */
  characterId: string | null;
  /** Character display name for the broadcast payload. */
  characterName: string | null;
  /** Proficiency bonus for the character's level (PHB p.15). */
  profBonus: number;
}

/** Shape of one entry in the sessionStorage rolling history (24h TTL). */
interface RollHistoryEntry extends AbilityRollResult {
  /** Source character id — keys the history per-character. */
  characterId: string;
  /** Expiration epoch ms — entries past this are dropped on next read. */
  expiresAt: number;
}

/** sessionStorage key namespace. */
const HISTORY_KEY_PREFIX = "pdm:ability-roll-history";
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const HISTORY_MAX_ENTRIES = 50;

/** Read+prune the history for a character. Safe in SSR (returns []). */
function readHistory(characterId: string): RollHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(`${HISTORY_KEY_PREFIX}:${characterId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RollHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((e) => e.expiresAt > now);
  } catch {
    // Corrupt JSON / quota error — start fresh. Better than throwing in UI.
    return [];
  }
}

/** Write the history for a character. Caps at HISTORY_MAX_ENTRIES. */
function writeHistory(characterId: string, entries: RollHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.slice(-HISTORY_MAX_ENTRIES);
    window.sessionStorage.setItem(
      `${HISTORY_KEY_PREFIX}:${characterId}`,
      JSON.stringify(trimmed),
    );
  } catch {
    // Quota / private mode — silent. The UI already showed the toast; the
    // history is a "nice to have", not a correctness invariant.
  }
}

/**
 * Append one roll to a character's history. Pure side-effect; called from
 * the hook after a successful roll.
 */
function appendHistory(characterId: string, result: AbilityRollResult): void {
  const existing = readHistory(characterId);
  const entry: RollHistoryEntry = {
    ...result,
    characterId,
    expiresAt: Date.now() + HISTORY_TTL_MS,
  };
  writeHistory(characterId, [...existing, entry]);
}

/**
 * Fire-and-forget broadcast on the `campaign:{id}` topic. NEVER throws.
 *
 * Pattern: open a one-shot channel, send, remove. Avoids subscribing
 * (subscribe would block on `phx_join` and waste a slot of the 200-channel
 * budget — see `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md`).
 *
 * Sending without subscribing is supported by Supabase Realtime: `send()`
 * returns "ok" / "error" / "timed out" without requiring an active
 * subscription on the sender side. The receiver (DM HUD listener) does
 * subscribe and gets the message.
 */
async function broadcastRollFireAndForget(args: {
  campaignId: string;
  characterId: string;
  characterName: string;
  result: AbilityRollResult;
}): Promise<void> {
  try {
    const supabase = createClient();
    const channel = supabase.channel(`campaign:${args.campaignId}`);
    try {
      await channel.send({
        type: "broadcast",
        event: "player:ability_roll",
        payload: {
          event: "player:ability_roll",
          characterId: args.characterId,
          characterName: args.characterName,
          ability: args.result.ability,
          rollType: args.result.rollType,
          result: args.result.total,
          modifier: args.result.modifier,
          proficient: args.result.proficient,
          mode: args.result.mode,
          formula: args.result.formula,
          rolls: args.result.rolls,
          keptIndex: args.result.keptIndex,
          timestamp: args.result.timestamp,
        },
      });
    } finally {
      await supabase.removeChannel(channel).catch(() => {});
    }
  } catch {
    // Broadcast is bonus — never break UI on failure.
  }
}

/** Hook return surface. The chip wires `rollCheck` / `rollSave` to its zones. */
export interface UseAbilityRollReturn {
  /**
   * Roll an ability check. Returns the result synchronously (the broadcast
   * is fired but not awaited). Caller renders the toast from the return
   * value — UI never waits on network.
   */
  rollCheck: (args: { ability: Ability; abilityMod: number; mode?: RollMode }) => AbilityRollResult;
  /**
   * Roll an ability save (with optional proficiency from the chip prop).
   * Same fire-and-forget broadcast contract as `rollCheck`.
   */
  rollSave: (args: { ability: Ability; abilityMod: number; proficient: boolean; mode?: RollMode }) => AbilityRollResult;
  /** Read history for the configured character (for future history viewer). */
  getHistory: () => AbilityRollResult[];
}

/**
 * Main hook. Memoizes the roll callbacks against (campaignId, characterId,
 * profBonus) so re-renders of the parent (CharacterCoreStats) don't cause
 * unnecessary callback recreation in each chip.
 */
export function useAbilityRoll(options: UseAbilityRollOptions): UseAbilityRollReturn {
  const { campaignId, characterId, characterName, profBonus } = options;

  const rollCheck = useCallback<UseAbilityRollReturn["rollCheck"]>(
    ({ ability, abilityMod, mode = "normal" }) => {
      const result = rollAbilityCheck(ability, abilityMod, mode);
      if (characterId) appendHistory(characterId, result);
      if (campaignId && characterId && characterName) {
        // Fire-and-forget — `void` makes the linter accept the missing await.
        void broadcastRollFireAndForget({
          campaignId,
          characterId,
          characterName,
          result,
        });
      }
      return result;
    },
    [campaignId, characterId, characterName],
  );

  const rollSave = useCallback<UseAbilityRollReturn["rollSave"]>(
    ({ ability, abilityMod, proficient, mode = "normal" }) => {
      const result = rollAbilitySave(ability, abilityMod, profBonus, proficient, mode);
      if (characterId) appendHistory(characterId, result);
      if (campaignId && characterId && characterName) {
        void broadcastRollFireAndForget({
          campaignId,
          characterId,
          characterName,
          result,
        });
      }
      return result;
    },
    [campaignId, characterId, characterName, profBonus],
  );

  const getHistory = useCallback<UseAbilityRollReturn["getHistory"]>(() => {
    if (!characterId) return [];
    // Strip the storage-only fields before returning to consumers.
    return readHistory(characterId).map(({ characterId: _cid, expiresAt: _exp, ...rest }) => rest);
  }, [characterId]);

  return { rollCheck, rollSave, getHistory };
}

/** Test-only export — clears the history for a given character id. */
export function __clearAbilityRollHistory(characterId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${HISTORY_KEY_PREFIX}:${characterId}`);
  } catch {
    // ignore
  }
}
