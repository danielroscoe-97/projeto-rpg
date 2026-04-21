"use client";

import { useState, useCallback, type ReactNode } from "react";
import { CombatRevisitModal, type RevisitEntry } from "./CombatRevisitModal";

/**
 * Epic 12, Story 12.10 — interactive timeline row.
 *
 * The server-rendered `CombatTimeline` hands pre-formatted header + meta text
 * so this client boundary stays small. All we do here is hold open/close
 * state for the revisit modal and let the server do the heavy data shaping.
 */
interface CombatTimelineEntryProps {
  id: string;
  header: ReactNode;
  /** Pre-formatted metadata strings rendered as "A · B · C" under the header. */
  meta: string[];
  endedAt: string;
  /** Human-readable absolute timestamp used as the <time> element's title attr. */
  absoluteTitle: string;
  revisit: RevisitEntry;
}

export function CombatTimelineEntry({
  id,
  header,
  meta,
  endedAt,
  absoluteTitle,
  revisit,
}: CombatTimelineEntryProps) {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  // Keep the full row clickable for easy access, but also expose a clear
  // button affordance so screen-reader users don't have to infer that a list
  // item is interactive. Visually it's still just the row.
  return (
    <li className="relative" data-testid={`timeline-entry-${id}`}>
      <span
        aria-hidden="true"
        className="absolute -left-[21px] top-1.5 size-3 rounded-full border-2 border-gold bg-background"
      />
      <button
        type="button"
        onClick={openModal}
        className="block w-full text-left rounded-md px-1 -mx-1 py-0.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        data-testid="timeline-entry-open"
      >
        <div className="flex flex-wrap items-center gap-2">{header}</div>
        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
          <time dateTime={endedAt} title={absoluteTitle}>{meta[0]}</time>
          {meta.slice(1).map((m, i) => (
            <span key={i} className="inline-flex items-center gap-3">
              <span aria-hidden="true">•</span>
              <span>{m}</span>
            </span>
          ))}
        </div>
      </button>

      {open && <CombatRevisitModal entry={revisit} onClose={closeModal} />}
    </li>
  );
}
