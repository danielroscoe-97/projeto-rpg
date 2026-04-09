"use client";

import type { GrantXpResult } from "./grant-xp";

/**
 * Client-side fire-and-forget XP grant request.
 * Calls POST /api/xp/grant — server validates and inserts.
 * Never throws, never blocks the UI.
 */
export function requestXpGrant(
  actionKey: string,
  role: "dm" | "player",
  metadata?: Record<string, unknown>,
): void {
  fetch("/api/xp/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actionKey, role, metadata }),
    keepalive: true,
  }).catch(() => {
    // Silent — XP should never break the app
  });
}

/**
 * Client-side XP grant that returns the result (for toasts/animations).
 * Awaitable — use when you need the result to display UI feedback.
 */
export async function requestXpGrantWithResult(
  actionKey: string,
  role: "dm" | "player",
  metadata?: Record<string, unknown>,
): Promise<GrantXpResult> {
  try {
    const res = await fetch("/api/xp/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionKey, role, metadata }),
    });
    if (!res.ok) return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "network_error" };
    return await res.json() as GrantXpResult;
  } catch {
    return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "network_error" };
  }
}
