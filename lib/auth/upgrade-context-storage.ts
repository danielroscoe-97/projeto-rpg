/**
 * Persist the `upgradeContext` across a Google OAuth full-page redirect.
 *
 * Why localStorage: the OAuth flow is a hard navigation (document reload via
 * Supabase hosted pages → our `/auth/callback`). Neither React state nor
 * sessionStorage (scoped to the original browsing context) survives reliably.
 * localStorage is the lowest-friction place that both tabs and the callback
 * page can read.
 *
 * Why versioned key: if we ever change shape, we bump `-v2` instead of
 * deserialising bad data. TTL is 15 min — anything older is assumed stale
 * (user abandoned OAuth mid-flow) and gets ignored on read.
 */

import type { Combatant } from "@/lib/types/combat";

export const IDENTITY_UPGRADE_CONTEXT_KEY = "identity-upgrade-context-v1";
export const IDENTITY_UPGRADE_CONTEXT_TTL_MS = 15 * 60 * 1000;

export interface PersistedUpgradeContext {
  sessionTokenId: string;
  campaignId?: string;
  guestCharacter?: Combatant;
  /** Epoch ms — used to reject stale entries. */
  savedAt: number;
}

export function savePersistedUpgradeContext(
  context: PersistedUpgradeContext,
): boolean {
  try {
    localStorage.setItem(
      IDENTITY_UPGRADE_CONTEXT_KEY,
      JSON.stringify(context),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Read-and-consume — returns the persisted context if fresh, else `null`.
 * Always clears the entry so the next navigation doesn't re-trigger.
 */
export function consumePersistedUpgradeContext(): PersistedUpgradeContext | null {
  try {
    const raw = localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY);
    if (!raw) return null;
    // Clear first — even on parse error we want to remove the corrupt entry.
    localStorage.removeItem(IDENTITY_UPGRADE_CONTEXT_KEY);
    const parsed = JSON.parse(raw) as PersistedUpgradeContext;
    if (
      !parsed ||
      typeof parsed.sessionTokenId !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > IDENTITY_UPGRADE_CONTEXT_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedUpgradeContext(): void {
  try {
    localStorage.removeItem(IDENTITY_UPGRADE_CONTEXT_KEY);
  } catch {
    // ignore
  }
}
