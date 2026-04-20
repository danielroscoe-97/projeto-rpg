"use client";

/**
 * MentionChipRenderer — pure read-only renderer.
 *
 * Takes a raw text body containing `@[type:uuid]` tokens and a lookup map
 * (key = `${type}:${id}`) and returns an array of React nodes suitable for
 * dropping into any container. Plain text segments become `<span>`s, each
 * mention becomes a styled chip. Unresolved mentions (entity deleted or
 * out of scope for the current viewer) render as a neutral "Referência
 * removida" pill so readers still see something sane.
 *
 * Kept deliberately free of hooks so it can be used inside memoized lists
 * without reruns.
 */

import { memo, useMemo, type ReactNode } from "react";
import { parseMentions, type MentionEntityType } from "@/lib/utils/mention-parser";

export interface MentionLookupEntry {
  type: MentionEntityType;
  id: string;
  name: string;
}

export type MentionLookupMap = ReadonlyMap<string, MentionLookupEntry>;

export interface MentionChipRendererProps {
  text: string;
  lookup: MentionLookupMap;
  /**
   * Optional click handler invoked when a chip is clicked. Receives the
   * entity ref so callers can route to the entity page / open a side panel
   * / etc. Missing (orphan) chips are never clickable.
   */
  onChipClick?: (entity: MentionLookupEntry) => void;
  className?: string;
  /** Optional test id prefix; defaults to "mention-renderer". */
  testIdPrefix?: string;
}

/**
 * Tailwind classes per entity type. Amber matches the existing EntityTag-
 * Selector chip style (components/campaign/EntityTagSelector.tsx line 205),
 * others use the color taxonomy called out in the Fase B spec.
 */
const CHIP_CLASSES: Record<MentionEntityType, string> = {
  npc: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  location: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  faction: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
  quest: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
};

const ORPHAN_CLASSES =
  "bg-white/[0.04] text-muted-foreground ring-white/[0.08] italic";

export const MentionChipRenderer = memo(function MentionChipRenderer({
  text,
  lookup,
  onChipClick,
  className,
  testIdPrefix = "mention-renderer",
}: MentionChipRendererProps) {
  const nodes = useMemo<ReactNode[]>(() => {
    const tokens = parseMentions(text);
    const out: ReactNode[] = [];

    tokens.forEach((token, i) => {
      if (token.kind === "text") {
        out.push(
          <span key={`t-${i}`} className="whitespace-pre-wrap">
            {token.text}
          </span>,
        );
        return;
      }

      const key = `${token.entityType}:${token.id}`;
      const entity = lookup.get(key);
      const chipKey = `m-${i}-${token.id}`;
      const baseTestId = `mention-chip-${token.entityType}-${token.id}`;

      if (!entity) {
        out.push(
          <span
            key={chipKey}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${ORPHAN_CLASSES}`}
            data-testid={`${baseTestId}-orphan`}
            aria-label="Referência removida"
          >
            Referência removida
          </span>,
        );
        return;
      }

      const classes = `inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${CHIP_CLASSES[token.entityType]}`;

      if (onChipClick) {
        out.push(
          <button
            key={chipKey}
            type="button"
            onClick={() => onChipClick(entity)}
            className={`${classes} hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition`}
            data-testid={baseTestId}
          >
            {entity.name}
          </button>,
        );
      } else {
        out.push(
          <span key={chipKey} className={classes} data-testid={baseTestId}>
            {entity.name}
          </span>,
        );
      }
    });

    return out;
  }, [text, lookup, onChipClick]);

  return (
    <div className={className} data-testid={testIdPrefix}>
      {nodes}
    </div>
  );
});
