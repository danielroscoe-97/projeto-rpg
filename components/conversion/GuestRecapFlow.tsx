"use client";

/**
 * GuestRecapFlow — STUB placeholder created by Story 03-D (agent B).
 *
 * TODO(03-E, agent C): Implementation in Wave 3a agent C.
 *
 * Agent C will replace this file entirely with the real guest
 * upgrade flow (AuthModal signup + POST /api/player-identity/
 * migrate-guest-character). The contract below is IMMUTABLE — agent C
 * must keep the same props shape so `RecapCtaCard` (agent B) compiles
 * without changes.
 *
 * Reference: docs/epics/player-identity/epic-03-conversion-moments.md
 * §Story 03-E (linhas 650-700+) and §D3b.
 */

import type { ReactElement } from "react";
import type { SaveSignupContext } from "./types";

export interface GuestRecapFlowProps {
  /** Discriminated-union context; guaranteed `mode === "guest"` at call site. */
  context: SaveSignupContext;
  /** Fired when the flow completes successfully — caller can close recap. */
  onComplete?: () => void;
}

/**
 * STUB — returns null until agent C ships the real implementation.
 * The props contract is what matters here; do not rely on any runtime
 * behavior from this file.
 */
export function GuestRecapFlow(
  _props: GuestRecapFlowProps,
): ReactElement | null {
  // TODO(03-E, agent C): Implementation in Wave 3a agent C
  return null;
}
