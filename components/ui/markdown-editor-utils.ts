/**
 * Pure helpers for `MarkdownEditor` (Wave 3c D2).
 * Lives in its own file so unit tests can import it without dragging in
 * `react-markdown` (ESM-only — breaks ts-jest's CJS pipeline).
 */

export type WrapKind = "bold" | "italic" | "code" | "quote";

interface WrapSpec {
  prefix: string;
  suffix: string;
  placeholder: string;
  /**
   * Quote is a line-mode wrap (inserts `> ` at the start of each selected
   * line) — handled with a dedicated branch.
   */
  lineMode?: boolean;
}

export const WRAPS: Record<WrapKind, WrapSpec> = {
  bold: { prefix: "**", suffix: "**", placeholder: "texto" },
  italic: { prefix: "*", suffix: "*", placeholder: "texto" },
  code: { prefix: "`", suffix: "`", placeholder: "código" },
  quote: { prefix: "> ", suffix: "", placeholder: "citação", lineMode: true },
};

/**
 * Apply a wrap to a (value, range) tuple and return the new value plus the
 * new caret/selection range.
 */
export function applyWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: WrapKind,
): { next: string; newStart: number; newEnd: number } {
  const spec = WRAPS[kind];
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  if (spec.lineMode) {
    if (!selected) {
      const lineStart = before.lastIndexOf("\n") + 1;
      const next =
        value.slice(0, lineStart) +
        spec.prefix +
        spec.placeholder +
        value.slice(lineStart);
      return {
        next,
        newStart: lineStart + spec.prefix.length,
        newEnd: lineStart + spec.prefix.length + spec.placeholder.length,
      };
    }
    const replaced = selected
      .split("\n")
      .map((line) => spec.prefix + line)
      .join("\n");
    const next = before + replaced + after;
    return {
      next,
      newStart: selectionStart,
      newEnd: selectionStart + replaced.length,
    };
  }

  if (!selected) {
    const next =
      before + spec.prefix + spec.placeholder + spec.suffix + after;
    return {
      next,
      newStart: selectionStart + spec.prefix.length,
      newEnd: selectionStart + spec.prefix.length + spec.placeholder.length,
    };
  }

  const next = before + spec.prefix + selected + spec.suffix + after;
  return {
    next,
    newStart: selectionStart + spec.prefix.length,
    newEnd: selectionEnd + spec.prefix.length,
  };
}
