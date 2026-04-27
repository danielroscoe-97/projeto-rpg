"use client";

/**
 * MarkdownEditor — MVP markdown textarea with toolbar + preview toggle
 * (Wave 3c D2 / spec 05-wireframe-diario.md §4.1).
 *
 * Scope (MVP):
 *  - Plain `<textarea>` source-of-truth (no rich editing, no @ autocomplete —
 *    the @ parser is D3, scheduled separately).
 *  - Toolbar: bold / italic / inline-code / blockquote — wraps current
 *    selection; if no selection, inserts a placeholder.
 *  - Preview toggle: renders content via react-markdown (already in deps).
 *  - Auto-save: parent owns persistence. We call `onAutoSave(value)` on a
 *    debounced timer; the wrapping component decides what to do (typically
 *    pipes into useMinhasNotas.update). Default debounce 30 s; overridable
 *    via `autoSaveDebounceMs` prop so tests can force fast flushes.
 *
 * Not in scope (deferred to D3+):
 *  - `@` mentions / autocomplete
 *  - Image upload / paste handling
 *  - Slash commands
 *  - Live preview side-by-side
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bold, Italic, Code as CodeIcon, Quote, Eye, EyeOff } from "lucide-react";
import { applyWrap, type WrapKind } from "./markdown-editor-utils";

const DEFAULT_AUTOSAVE_MS = 30_000;

export interface MarkdownEditorProps {
  /** Current value (controlled). */
  value: string;
  /** Live change handler. Called on every keystroke. */
  onChange: (next: string) => void;
  /**
   * Auto-save callback. Fired on a debounced timer; receives the latest
   * value. Parent decides whether to short-circuit when value hasn't
   * changed since the last save.
   */
  onAutoSave?: (value: string) => void;
  /** Debounce window in ms. Defaults to 30 000. */
  autoSaveDebounceMs?: number;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Optional aria label for the textarea. */
  ariaLabel?: string;
  /** Test id base — toolbar buttons + textarea derive `${testId}-*`. */
  testId?: string;
  /** Min textarea height (px). Defaults to 240. */
  minHeight?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  onAutoSave,
  autoSaveDebounceMs = DEFAULT_AUTOSAVE_MS,
  placeholder,
  ariaLabel,
  testId = "markdown-editor",
  minHeight = 240,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(value);

  // Schedule auto-save whenever value changes.
  useEffect(() => {
    if (!onAutoSave) return;
    if (value === lastSavedRef.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      lastSavedRef.current = value;
      onAutoSave(value);
    }, autoSaveDebounceMs);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, onAutoSave, autoSaveDebounceMs]);

  // Flush pending auto-save on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        if (
          onAutoSave &&
          textareaRef.current &&
          textareaRef.current.value !== lastSavedRef.current
        ) {
          onAutoSave(textareaRef.current.value);
        }
      }
    };
    // Intentionally empty deps — we only want unmount semantics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWrap = useCallback(
    (kind: WrapKind) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { selectionStart, selectionEnd } = ta;
      const { next, newStart, newEnd } = applyWrap(
        value,
        selectionStart,
        selectionEnd,
        kind,
      );
      onChange(next);
      // Restore caret/selection after React applies the new value.
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newStart, newEnd);
      });
    },
    [value, onChange],
  );

  return (
    <div
      className="rounded-lg border border-border bg-card/40"
      data-testid={testId}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b border-border/60"
        role="toolbar"
        aria-label="Markdown formatting"
      >
        <ToolbarButton
          label="Bold"
          icon={Bold}
          onClick={() => handleWrap("bold")}
          testId={`${testId}-bold`}
          disabled={showPreview}
        />
        <ToolbarButton
          label="Italic"
          icon={Italic}
          onClick={() => handleWrap("italic")}
          testId={`${testId}-italic`}
          disabled={showPreview}
        />
        <ToolbarButton
          label="Inline code"
          icon={CodeIcon}
          onClick={() => handleWrap("code")}
          testId={`${testId}-code`}
          disabled={showPreview}
        />
        <ToolbarButton
          label="Quote"
          icon={Quote}
          onClick={() => handleWrap("quote")}
          testId={`${testId}-quote`}
          disabled={showPreview}
        />
        <div className="ml-auto" />
        <ToolbarButton
          label={showPreview ? "Edit" : "Preview"}
          icon={showPreview ? EyeOff : Eye}
          onClick={() => setShowPreview((s) => !s)}
          testId={`${testId}-toggle-preview`}
          pressed={showPreview}
        />
      </div>

      {showPreview ? (
        <div
          className="px-3 py-3 text-sm text-foreground prose prose-invert max-w-none"
          style={{ minHeight }}
          data-testid={`${testId}-preview`}
        >
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground/60 italic">
              {placeholder ?? "(vazio)"}
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? "Markdown editor"}
          data-testid={`${testId}-textarea`}
          className="block w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-y px-3 py-3"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  testId,
  disabled,
  pressed,
}: {
  label: string;
  icon: typeof Bold;
  onClick: () => void;
  testId: string;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={`min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed ${
        pressed ? "bg-white/10 text-foreground" : ""
      }`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}
