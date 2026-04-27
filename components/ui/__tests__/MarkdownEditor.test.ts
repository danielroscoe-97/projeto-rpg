/**
 * Pure-helper unit coverage for `MarkdownEditor` (Wave 3c D2).
 *
 * The component renders fine in JSDOM but selection/range manipulation
 * happens in `applyWrap`, which is exported. We assert each toolbar
 * branch returns the correct (next, newStart, newEnd) tuple so the
 * caret restoration in the React layer stays predictable.
 */

import { applyWrap } from "@/components/ui/markdown-editor-utils";

describe("applyWrap", () => {
  it("wraps a selection in bold markers and shifts the selection past the prefix", () => {
    const { next, newStart, newEnd } = applyWrap("foo bar baz", 4, 7, "bold");
    expect(next).toBe("foo **bar** baz");
    expect(newStart).toBe(6);
    expect(newEnd).toBe(9);
  });

  it("wraps a selection in italic markers", () => {
    const { next } = applyWrap("hello world", 0, 5, "italic");
    expect(next).toBe("*hello* world");
  });

  it("wraps a selection in inline code", () => {
    const { next } = applyWrap("call foo()", 5, 10, "code");
    expect(next).toBe("call `foo()`");
  });

  it("inserts placeholder when no selection (bold)", () => {
    const { next, newStart, newEnd } = applyWrap("abc", 1, 1, "bold");
    expect(next).toBe("a**texto**bc");
    // Placeholder spans the inner range so user can type to overwrite.
    expect(newStart).toBe(3);
    expect(newEnd).toBe(8);
  });

  it("inserts > prefix at line start when quote is used without selection", () => {
    const { next, newStart, newEnd } = applyWrap(
      "first\nsecond line",
      8,
      8,
      "quote",
    );
    // Caret was inside "second line"; quote inserts at start of that line.
    expect(next).toBe("first\n> citaçãosecond line");
    expect(newStart).toBe(8); // after "first\n> "
    expect(newEnd).toBe(8 + "citação".length);
  });

  it("prefixes every line of a multi-line selection with > when quote is used", () => {
    const value = "line A\nline B\nline C";
    const { next } = applyWrap(value, 0, value.length, "quote");
    expect(next).toBe("> line A\n> line B\n> line C");
  });
});
