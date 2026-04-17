"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * VersionBadge — shows the D&D ruleset edition ("2014" or "2024") for a
 * monster, spell, or other SRD entity.
 *
 * Design rules (H7, beta-3):
 * - Gold highlight ONLY when `version === "2024" && isSrd === true`.
 *   This protects SRD Compliance: non-SRD 2024 content must NEVER be
 *   visually promoted on public pages.
 * - Everything else renders the NEUTRAL zinc/outline style. The matrix:
 *     - 2024 SRD          → gold (the "new edition" cue)
 *     - 2024 non-SRD (VGM/MPMM/MTF reprints, etc.) → neutral zinc
 *     - 2014 SRD          → neutral zinc
 *     - 2014 non-SRD      → neutral zinc
 * - Visual hierarchy is load-bearing: a DM scanning a list should see
 *   SRD 2024 monsters pop out while all other entries stay muted.
 */
export type RulesetVersion = "2014" | "2024" | string;

export interface VersionBadgeProps {
  version: RulesetVersion | null | undefined;
  /**
   * Whether the entity is part of the SRD 5.1 (CC-BY 4.0). Gates the gold
   * highlight — MUST be explicitly passed by callers to avoid accidentally
   * promoting non-SRD 2024 content.
   */
  isSrd?: boolean;
  className?: string;
  /**
   * Visual size. "sm" (default) is the compendium-row size; "md" is used
   * in stat-block headers where the title is larger.
   */
  size?: "sm" | "md";
}

/**
 * Small edition badge. Renders nothing if `version` is falsy.
 */
export function VersionBadge({
  version,
  isSrd = false,
  className,
  size = "sm",
}: VersionBadgeProps) {
  if (!version) return null;

  const is2024Srd = version === "2024" && isSrd === true;

  const sizeClasses =
    size === "md"
      ? "px-1.5 py-0.5 text-[11px]"
      : "px-1 py-0.5 text-[9px]";

  // Gold highlight gated on BOTH version === 2024 AND isSrd === true.
  // Everything else (incl. 2024 non-SRD) gets the neutral zinc outline.
  const toneClasses = is2024Srd
    ? "border-gold/60 bg-gold/15 text-gold"
    : "border-zinc-500/30 bg-zinc-500/5 text-zinc-400";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded font-mono font-semibold uppercase tracking-wider leading-none whitespace-nowrap border",
        sizeClasses,
        toneClasses,
        className,
      )}
      aria-label={`D&D ${version} edition`}
      title={is2024Srd ? `SRD ${version}` : `${version}`}
    >
      {version}
    </span>
  );
}
