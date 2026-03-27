import { sanitizeText, sanitizeRecord } from "./sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<script>alert('xss')</script>Hello")).toBe("alert('xss')Hello");
  });

  it("strips nested HTML", () => {
    expect(sanitizeText("<b><i>Bold Italic</i></b>")).toBe("Bold Italic");
  });

  it("preserves HTML entities as-is", () => {
    expect(sanitizeText("Hello&amp;World")).toBe("Hello&amp;World");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("passes through clean text unchanged", () => {
    expect(sanitizeText("Aragorn the Ranger")).toBe("Aragorn the Ranger");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });
});

describe("sanitizeRecord", () => {
  it("sanitizes string values", () => {
    const result = sanitizeRecord({
      name: "<b>Goblin</b>",
      hp: 7,
    });
    expect(result.name).toBe("Goblin");
    expect(result.hp).toBe(7);
  });

  it("leaves non-string values unchanged", () => {
    const result = sanitizeRecord({
      count: 42,
      active: true,
      data: null,
    });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.data).toBeNull();
  });
});
