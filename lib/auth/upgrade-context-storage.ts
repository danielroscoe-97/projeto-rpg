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
 * deserialising bad data. TTL is 60 min — generous margin for mobile OAuth
 * flows where a user may bounce through a 2FA app + password manager +
 * account picker (each modal can take 2-3 min on mid-range phones), plus
 * normal network/app-switch latency. Shorter windows (we tried 15m) were
 * silently expiring legitimate flows. Anything older is considered stale.
 */

import type { Combatant } from "@/lib/types/combat";

export const IDENTITY_UPGRADE_CONTEXT_KEY = "identity-upgrade-context-v1";
export const IDENTITY_UPGRADE_CONTEXT_TTL_MS = 60 * 60 * 1000;

export interface PersistedUpgradeContext {
  sessionTokenId: string;
  campaignId?: string;
  guestCharacter?: Combatant;
  /**
   * Origin CTA that opened the upgrade flow (Epic 03, Story 03-C/03-D).
   *
   * Used by the auth callback (Cluster β, W#4) to fire
   * `conversion:completed` with the correct `moment` after the OAuth round
   * trip resolves. Not every persisted context has a `moment` — legacy
   * contexts written before Wave 3a will be absent, hence the field stays
   * optional and the callback guards accordingly.
   *
   * Cluster γ writes this field when creating the upgradeContext inside
   * `RecapCtaCard` / `PlayerJoinClient` / `GuestCombatClient`. The enum is
   * deliberately narrow: only anon paths (`waiting`, `recap_anon`) should
   * ever reach this storage — `recap_guest` is handled locally by
   * `RecapCtaCard` (D3b) without an upgradeContext, so it has no
   * legitimate reason to appear here.
   */
  moment?: "waiting" | "recap_anon";
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
