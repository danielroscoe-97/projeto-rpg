import { describe, expect, it } from "vitest";
import { getSessionDate } from "./session-date";

describe("getSessionDate", () => {
  it("formats a mid-year date as YYYY-MM-DD", () => {
    const d = new Date(2026, 5, 15, 10, 30, 0); // 2026-06-15 (local)
    expect(getSessionDate(d)).toBe("2026-06-15");
  });

  it("pads single-digit months", () => {
    const d = new Date(2026, 0, 15, 10, 30, 0); // January
    expect(getSessionDate(d)).toBe("2026-01-15");
  });

  it("pads single-digit days", () => {
    const d = new Date(2026, 11, 3, 10, 30, 0); // December 3rd
    expect(getSessionDate(d)).toBe("2026-12-03");
  });

  it("handles January 1", () => {
    const d = new Date(2026, 0, 1, 0, 0, 0);
    expect(getSessionDate(d)).toBe("2026-01-01");
  });

  it("handles December 31", () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(getSessionDate(d)).toBe("2026-12-31");
  });

  it("handles leap day", () => {
    const d = new Date(2028, 1, 29, 12, 0, 0); // 2028-02-29
    expect(getSessionDate(d)).toBe("2028-02-29");
  });

  it("defaults to current date when no argument is provided", () => {
    const before = new Date();
    const result = getSessionDate();
    const after = new Date();
    // Result should match today's local date (between "before" and "after").
    const expected = `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, "0")}-${String(before.getDate()).padStart(2, "0")}`;
    const expectedAfter = `${after.getFullYear()}-${String(after.getMonth() + 1).padStart(2, "0")}-${String(after.getDate()).padStart(2, "0")}`;
    expect([expected, expectedAfter]).toContain(result);
  });

  it("is timezone-agnostic — uses local getters", () => {
    // Constructing via local args means getSessionDate reads local parts.
    const d = new Date(2026, 3, 20, 2, 0, 0); // 2026-04-20 local
    expect(getSessionDate(d)).toBe("2026-04-20");
  });
});
