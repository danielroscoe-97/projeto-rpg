"use client";

/**
 * EntityMentionEditor — textarea wrapper that opens an autocomplete popover
 * when the user types `@`, and inserts `@[type:uuid]` tokens on confirm.
 *
 * Contract:
 *   - Multi-line by default (wraps a native <textarea>).
 *   - Popover opens only when:
 *       (a) the caret is immediately after an `@` OR after an `@query`
 *           whose preceding char is whitespace / start-of-line, AND
 *       (b) there is no whitespace between the `@` and the caret.
 *   - `value` / `onChange` are strictly the raw text (with `@[type:uuid]`
 *     tokens visible to the parent) — the parent stores the source of
 *     truth and re-renders through this component.
 *
 * Keyboard:
 *   - ArrowUp / ArrowDown — move highlight
 *   - Enter / Tab         — confirm, insert token, close
 *   - Escape              — close popover (leave typed `@query` in place)
 *
 * The parent passes `campaignId`; the component owns the search hook. If
 * beta-test shows the popover feels heavy on giant campaigns, search can
 * later be hoisted to a provider context.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import { useCampaignEntitySearch } from "@/lib/hooks/use-campaign-entity-search";
import {
  formatMentionToken,
  type MentionEntityType,
} from "@/lib/utils/mention-parser";
import { MentionPopover } from "./MentionPopover";
import { getCaretCoordinates } from "./getCaretCoordinates";

export interface EntityMentionEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  campaignId: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  "data-testid"?: string;
  /** Called on every keydown; useful for parent-level Submit-on-Enter handlers. */
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Called when the textarea loses focus. */
  onBlur?: () => void;
  /** Called when the textarea gains focus. */
  onFocus?: () => void;
  /** Optional aria-label for the textarea when no visible label is present. */
  "aria-label"?: string;
}

export interface EntityMentionEditorHandle {
  focus: () => void;
  blur: () => void;
}

interface TriggerState {
  /** Char index of the `@` that opened the popover. */
  atIndex: number;
  /** Char index of the current caret (end of `@query`). */
  caretIndex: number;
  /** Query string between `@` and caret (not including `@`). */
  query: string;
}

const MENTION_TYPES_SET: ReadonlySet<MentionEntityType> = new Set([
  "npc",
  "location",
  "faction",
  "quest",
]);

/**
 * Does the char at `index - 1` qualify as a "before @" boundary? We open
 * the popover only after whitespace / newline / start-of-string / common
 * punctuation, so typing an email address like `user@host` doesn't pop.
 */
function isBoundaryChar(text: string, index: number): boolean {
  if (index <= 0) return true;
  const ch = text.charAt(index - 1);
  return /[\s(\[{,.;:!?]/u.test(ch);
}

/**
 * Examine `text` with caret at `caretIndex`; if the caret is inside an
 * `@query` (no whitespace since the `@`, `@` sits on a boundary), return
 * the trigger state, else null.
 */
function detectTrigger(text: string, caretIndex: number): TriggerState | null {
  if (caretIndex <= 0) return null;

  // Walk backward from the caret until we either find the `@` or hit
  // whitespace/newline (in which case there's no active trigger).
  for (let i = caretIndex - 1; i >= 0; i--) {
    const ch = text.charAt(i);
    if (ch === "@") {
      // Guard: previous char must be a boundary, otherwise this `@` is
      // embedded in a word (e.g. email).
      if (!isBoundaryChar(text, i)) return null;
      const query = text.slice(i + 1, caretIndex);
      // Reject queries that already contain `[` or `:` — those look like
      // the user is editing a pasted canonical token, so we leave them
      // alone.
      if (query.includes("[") || query.includes("]")) return null;
      return { atIndex: i, caretIndex, query };
    }
    if (/\s/u.test(ch)) return null;
    // Allow alphanumerics, hyphens, apostrophes, and accents — reasonable
    // names. Stop on any other punctuation.
    if (!/[\p{L}\p{N}\-'’.]/u.test(ch)) return null;
  }
  return null;
}

export const EntityMentionEditor = forwardRef<
  EntityMentionEditorHandle,
  EntityMentionEditorProps
>(function EntityMentionEditor(
  {
    value,
    onChange,
    placeholder,
    campaignId,
    disabled,
    className,
    rows = 4,
    onKeyDown,
    onBlur,
    onFocus,
    "data-testid": testId,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const t = useTranslations("mentions");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { search, loading: searchLoading } = useCampaignEntitySearch(campaignId);

  const [trigger, setTrigger] = useState<TriggerState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }),
    [],
  );

  const results = useMemo(() => {
    if (!trigger) return [];
    return search(trigger.query);
  }, [trigger, search]);

  // Reset highlight when the result set changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [trigger?.query, results.length]);

  const updateAnchor = useCallback((caretIndex: number) => {
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const caret = getCaretCoordinates(el, caretIndex);
    setAnchor({
      left: rect.left + caret.left,
      top: rect.top + caret.top,
      height: caret.height,
    });
  }, []);

  const recomputeTrigger = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      setTrigger(null);
      setAnchor(null);
      return;
    }
    const caret = el.selectionStart ?? el.value.length;
    const next = detectTrigger(el.value, caret);
    setTrigger(next);
    if (next) {
      updateAnchor(next.atIndex);
    } else {
      setAnchor(null);
    }
  }, [updateAnchor]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Defer trigger detection until React commits the new value into the
      // DOM so `selectionStart` is accurate.
      queueMicrotask(recomputeTrigger);
    },
    [onChange, recomputeTrigger],
  );

  const insertMention = useCallback(
    (type: MentionEntityType, id: string) => {
      const el = textareaRef.current;
      if (!el || !trigger) return;
      if (!MENTION_TYPES_SET.has(type)) return;

      const token = formatMentionToken(type, id);
      const before = value.slice(0, trigger.atIndex);
      const after = value.slice(trigger.caretIndex);
      // Append a trailing space so the user can keep typing.
      const needsSpace = !after.startsWith(" ") && !after.startsWith("\n");
      const insertion = needsSpace ? `${token} ` : token;
      const next = `${before}${insertion}${after}`;
      onChange(next);

      // Restore focus + place caret after the inserted token.
      const nextCaret = (before + insertion).length;
      requestAnimationFrame(() => {
        const elNow = textareaRef.current;
        if (!elNow) return;
        elNow.focus();
        elNow.setSelectionRange(nextCaret, nextCaret);
      });

      setTrigger(null);
      setAnchor(null);
    },
    [trigger, value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (trigger && results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % results.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (i) => (i - 1 + results.length) % results.length,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const pick = results[selectedIndex];
          if (pick) insertMention(pick.type, pick.id);
          return;
        }
      }
      if (trigger && e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        setAnchor(null);
        return;
      }
      onKeyDown?.(e);
    },
    [trigger, results, selectedIndex, insertMention, onKeyDown],
  );

  const handleSelect = useCallback(() => {
    // Caret may have moved via arrow keys / click — recompute the trigger.
    recomputeTrigger();
  }, [recomputeTrigger]);

  const handleBlur = useCallback(() => {
    // Close on blur; mousedown on a popover item uses preventDefault so
    // the textarea never actually blurs before the insert.
    setTrigger(null);
    setAnchor(null);
    onBlur?.();
  }, [onBlur]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onClick={handleSelect}
        onBlur={handleBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={trigger !== null}
      />
      <MentionPopover
        open={trigger !== null && !disabled}
        anchor={anchor}
        results={results}
        selectedIndex={selectedIndex}
        onHoverIndex={setSelectedIndex}
        onSelect={(index) => {
          const pick = results[index];
          if (pick) insertMention(pick.type, pick.id);
        }}
        emptyLabel={t("no_results")}
        loadingLabel={t("loading")}
        loading={searchLoading && results.length === 0}
        testIdPrefix={testId ? `${testId}-popover` : undefined}
      />
    </div>
  );
});
