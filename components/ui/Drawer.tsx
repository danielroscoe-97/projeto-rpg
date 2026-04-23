"use client";

/**
 * Drawer — EP-0 C0.4 consolidation primitive.
 *
 * Canonical overlay drawer shell. Consolidates `DrawerShell` plus the 6
 * concrete Player HQ drawers (NPC, Quest, Location, Faction, Pin, Session)
 * onto a single slide-in panel that owns:
 *
 * - the fixed full-viewport container + backdrop (click-to-close)
 * - the slide-in animation
 * - the close button in the header
 * - ESC-to-close keyboard shortcut
 * - a focus trap so keyboard users cannot tab out of the panel while it
 *   is mounted
 * - optional `icon` / `iconColor` slot in the header (kept for back-compat
 *   with the 6 player-hq drawers that all render a Lucide icon next to
 *   the title)
 *
 * ## Props shape
 *
 * The brief's minimum surface is `{ open, onClose, title, side?, children }`.
 * In practice we also expose `icon` + `iconColor` to avoid forcing the 6
 * existing drawers into a forked "title row" implementation; that is a
 * strict additive extension, optional for future callers.
 *
 * `open` defaults to `true` so existing callers — all of which
 * conditional-render the drawer — keep working without parent refactors.
 * When `open` is `false`, the drawer renders `null`.
 *
 * ## Side placement
 *
 * `side` controls where the drawer anchors and which axis the slide
 * animation uses. Today every caller lives on the right; we expose `left`
 * and `bottom` for forward compatibility (e.g. mobile bottom sheets) but
 * do not ship any variation in styling beyond position + animation.
 *
 * ## Focus trap behavior
 *
 * On mount the first focusable element inside the panel receives focus.
 * Tab and Shift+Tab cycle within the panel. The previously-focused
 * element is restored on unmount, provided it is still connected to the
 * document. This matches the WAI-ARIA Authoring Practices "dialog"
 * pattern and is consistent with Radix's Dialog behavior.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { X } from "lucide-react";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  /** Render state. Defaults to `true` so conditional-render callers work
   *  without refactors. When `false`, the drawer returns `null`. */
  open?: boolean;
  /** Invoked on ESC, backdrop click, and the close button. */
  onClose: () => void;
  /** Heading text, shown in the drawer header. */
  title: string;
  /** Anchor side. Defaults to `"right"`. */
  side?: DrawerSide;
  /** Optional header icon (lucide-react is the convention). */
  icon?: ReactNode;
  /** Tailwind color class for the icon (e.g. `"text-rose-400"`). */
  iconColor?: string;
  /** Optional extra class for the panel (tweak width, etc.). */
  panelClassName?: string;
  /** Aria-label for the close button. Defaults to `"Close"`. */
  closeAriaLabel?: string;
  children: ReactNode;
}

const SIDE_CONTAINER: Record<DrawerSide, string> = {
  right: "flex justify-end",
  left: "flex justify-start",
  bottom: "flex items-end justify-center",
};

const SIDE_PANEL: Record<DrawerSide, string> = {
  right:
    "relative w-full max-w-md bg-surface-overlay border-l border-border shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col",
  left:
    "relative w-full max-w-md bg-surface-overlay border-r border-border shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col",
  bottom:
    "relative w-full max-w-md bg-surface-overlay border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[90vh]",
};

/**
 * CSS selector for focusable elements inside the panel. Kept short so the
 * focus trap stays fast on mount; tweak sparingly — this string is hot.
 */
const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter((el) => {
    // Browsers already skip tabbable elements with `display: none` natively,
    // so we only need to filter out the JavaScript-observable cases that the
    // selector itself cannot express. `aria-hidden="true"` is the one signal
    // we honor here to keep "visually hidden from AT" elements out of the
    // trap. (We deliberately avoid `offsetParent === null` + `getComputed
    // Style` — jsdom always returns `null` offsetParent, so those checks
    // would break the trap entirely in unit tests.)
    if (el.getAttribute("aria-hidden") === "true") return false;
    return true;
  });
}

export function Drawer({
  open = true,
  onClose,
  title,
  side = "right",
  icon,
  iconColor,
  panelClassName,
  closeAriaLabel = "Close",
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // ESC closes the drawer. Mirrors the legacy DrawerShell behavior.
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Focus trap + initial focus + restore on unmount.
  useEffect(() => {
    if (!open) return;
    // Snapshot the previously-focused element so we can restore on close.
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const panel = panelRef.current;
    if (!panel) return;

    // Move initial focus into the drawer: first focusable element, or the
    // panel itself (via tabindex=-1) as a fallback. Using rAF so the slide-
    // in animation has a frame to paint before focus moves — mobile browsers
    // sometimes elide the animation if focus changes in the same tick.
    const rafId = requestAnimationFrame(() => {
      const focusables = getFocusableElements(panel);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    });

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTrap);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleTrap);
      // Restore focus, but only if the previous element is still in the
      // document (e.g. the parent element might have unmounted in parallel).
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [open]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${SIDE_CONTAINER[side]}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`${SIDE_PANEL[side]} ${panelClassName ?? ""}`.trim()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          {icon && <span className={iconColor}>{icon}</span>}
          <h2 className="text-sm font-semibold text-foreground flex-1 truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/5"
            aria-label={closeAriaLabel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
