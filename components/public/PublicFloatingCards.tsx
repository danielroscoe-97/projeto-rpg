"use client";

import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";

/**
 * Mounts the FloatingCardContainer on public pages so that pinned
 * monster stat blocks, spell cards, item cards, and feat cards
 * opened from the PublicCommandPalette work correctly.
 *
 * FloatingCardContainer portals into `#floating-cards-root` which
 * already exists in the root layout.tsx. It reads from
 * usePinnedCardsStore (Zustand) — no auth required.
 */
export function PublicFloatingCards() {
  return <FloatingCardContainer />;
}
