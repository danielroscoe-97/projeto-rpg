"use client";

/**
 * MentionPopover — Floating-UI-positioned autocomplete list.
 *
 * Anchored at the caret via a virtual reference element (just a bounding
 * rect — no DOM node needed). Parent (EntityMentionEditor) owns the query
 * string and the selected index; this component is stateless beyond what
 * Floating UI needs.
 *
 * Keyboard navigation is driven from the textarea (so typing never loses
 * focus). This component reacts to `selectedIndex` prop changes and exposes
 * `onSelect(index)` plus hover-to-preselect.
 */

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  useFloating,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  FloatingPortal,
} from "@floating-ui/react";
import type { SearchableEntity } from "@/lib/hooks/use-campaign-entity-search";

interface AnchorRect {
  top: number;
  left: number;
  /** Height of the caret line — used as the reference bottom edge. */
  height: number;
}

export interface MentionPopoverProps {
  open: boolean;
  /** Pixel position of the caret in viewport coordinates. */
  anchor: AnchorRect | null;
  results: SearchableEntity[];
  selectedIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (index: number) => void;
  emptyLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  testIdPrefix?: string;
}

const TYPE_COLOR: Record<SearchableEntity["type"], string> = {
  npc: "text-amber-300",
  location: "text-sky-300",
  faction: "text-violet-300",
  quest: "text-emerald-300",
};

// TYPE_LABEL is now resolved via next-intl inside the component body so
// English-locale DMs don't see Portuguese labels. See messages.mentions.
const TYPE_LABEL_KEY: Record<SearchableEntity["type"], string> = {
  npc: "chip_npc",
  location: "chip_location",
  faction: "chip_faction",
  quest: "chip_quest",
};

export function MentionPopover({
  open,
  anchor,
  results,
  selectedIndex,
  onHoverIndex,
  onSelect,
  emptyLabel,
  loadingLabel,
  loading,
  testIdPrefix = "mention-popover",
}: MentionPopoverProps) {
  const t = useTranslations("mentions");
  const listRef = useRef<HTMLUListElement | null>(null);

  // Virtual reference: Floating UI lets us feed it a DOMRect without needing
  // a real DOM element — perfect for caret positioning.
  const virtualRef = useMemo(() => {
    if (!anchor) return null;
    return {
      getBoundingClientRect() {
        return {
          x: anchor.left,
          y: anchor.top,
          top: anchor.top,
          left: anchor.left,
          right: anchor.left,
          bottom: anchor.top + anchor.height,
          width: 0,
          height: anchor.height,
          toJSON() {
            return this;
          },
        } as DOMRect;
      },
    };
  }, [anchor]);

  const { refs, floatingStyles, update } = useFloating({
    open,
    placement: "bottom-start",
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(320, availableHeight)}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Feed the virtual reference into Floating UI whenever the caret moves.
  useEffect(() => {
    if (!virtualRef) return;
    refs.setReference(virtualRef);
    update();
  }, [virtualRef, refs, update]);

  // Scroll the active option into view.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLLIElement>(
      `[data-index="${selectedIndex}"]`,
    );
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [open, selectedIndex, results]);

  if (!open || !anchor) return null;

  // Portal the popover out of the editor's DOM subtree. Without this, any
  // ancestor with overflow:hidden / clip-path (dialogs, scrollable panels,
  // campaign notes list) visually clips the popover at the exact moment
  // the user needs it most — near the bottom of a scroll container.
  return (
    <FloatingPortal>
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 min-w-[14rem] max-w-[20rem] overflow-hidden rounded-lg border border-white/[0.06] bg-card shadow-2xl"
      role="listbox"
      aria-label="Mention suggestions"
      data-testid={testIdPrefix}
    >
      {loading ? (
        <p
          className="px-3 py-2 text-xs text-muted-foreground"
          data-testid={`${testIdPrefix}-loading`}
        >
          {loadingLabel ?? "…"}
        </p>
      ) : results.length === 0 ? (
        <p
          className="px-3 py-2 text-xs text-muted-foreground"
          data-testid={`${testIdPrefix}-empty`}
        >
          {emptyLabel}
        </p>
      ) : (
        <ul
          ref={listRef}
          className="max-h-[16rem] overflow-y-auto py-1"
          data-testid={`${testIdPrefix}-list`}
        >
          {results.map((entity, index) => {
            const active = index === selectedIndex;
            return (
              <li
                key={`${entity.type}:${entity.id}`}
                data-index={index}
                role="option"
                aria-selected={active}
                onMouseEnter={() => onHoverIndex(index)}
                onMouseDown={(e) => {
                  // `mousedown` rather than `click` so the textarea never
                  // loses focus between the event and the insert.
                  e.preventDefault();
                  onSelect(index);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-xs transition ${
                  active
                    ? "bg-accent/20 text-foreground"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
                data-testid={`${testIdPrefix}-option-${entity.type}-${entity.id}`}
              >
                <span className="flex-1 truncate">
                  <span className="text-foreground">{entity.name}</span>
                  {entity.subtitle && (
                    <span className="ml-2 text-muted-foreground">
                      · {entity.subtitle}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${TYPE_COLOR[entity.type]}`}
                >
                  {t(TYPE_LABEL_KEY[entity.type])}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </FloatingPortal>
  );
}
