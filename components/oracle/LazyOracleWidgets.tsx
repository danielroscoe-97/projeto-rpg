"use client";

import dynamic from "next/dynamic";

// Lazy-load heavy Oracle components — they use @dnd-kit, Fuse.js, etc.
// and are not needed for initial page render. ssr:false is only valid
// inside a Client Component (Next.js 16 Turbopack constraint).
const FloatingCardContainer = dynamic(
  () => import("@/components/oracle/FloatingCardContainer").then(m => ({ default: m.FloatingCardContainer })),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("@/components/oracle/CommandPalette").then(m => ({ default: m.CommandPalette })),
  { ssr: false }
);
const OracleAIModal = dynamic(
  () => import("@/components/oracle/OracleAIModal").then(m => ({ default: m.OracleAIModal })),
  { ssr: false }
);
const DiceHistoryPanel = dynamic(
  () => import("@/components/dice/DiceHistoryPanel").then(m => ({ default: m.DiceHistoryPanel })),
  { ssr: false }
);

/** Client-only wrapper that lazy-loads all Oracle widgets. */
export function LazyOracleWidgets() {
  return (
    <>
      <FloatingCardContainer />
      <CommandPalette />
      <OracleAIModal />
      <DiceHistoryPanel />
    </>
  );
}
