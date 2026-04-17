import { sanitizeReturnUrl } from "./returnUrl";

describe("sanitizeReturnUrl", () => {
  describe("allowed internal paths", () => {
    it("allows a simple root path", () => {
      expect(sanitizeReturnUrl("/")).toBe("/");
    });

    it("allows a first-level path", () => {
      expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    });

    it("allows deep nested paths with query + hash", () => {
      expect(sanitizeReturnUrl("/feedback/abc123")).toBe("/feedback/abc123");
      expect(sanitizeReturnUrl("/join/token-xyz?v=1#top")).toBe("/join/token-xyz?v=1#top");
    });

    it("allows the guest-combat path", () => {
      expect(sanitizeReturnUrl("/try")).toBe("/try");
    });
  });

  describe("rejected inputs (fallback to /)", () => {
    it("rejects empty string", () => {
      expect(sanitizeReturnUrl("")).toBe("/");
    });

    it("rejects undefined", () => {
      expect(sanitizeReturnUrl(undefined)).toBe("/");
    });

    it("rejects null", () => {
      expect(sanitizeReturnUrl(null)).toBe("/");
    });

    it("rejects absolute https URL", () => {
      expect(sanitizeReturnUrl("https://evil.com")).toBe("/");
    });

    it("rejects absolute http URL", () => {
      expect(sanitizeReturnUrl("http://evil.com/path")).toBe("/");
    });

    it("rejects protocol-relative URL (// → external origin)", () => {
      expect(sanitizeReturnUrl("//evil.com")).toBe("/");
      expect(sanitizeReturnUrl("//evil.com/path")).toBe("/");
    });

    it("rejects javascript: pseudo-protocol", () => {
      expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
    });

    it("rejects data: URI", () => {
      expect(sanitizeReturnUrl("data:text/html,<script>")).toBe("/");
    });

    it("rejects path with @ (userinfo host trick)", () => {
      expect(sanitizeReturnUrl("/@evil.com")).toBe("/");
    });

    it("rejects backslash bypass", () => {
      expect(sanitizeReturnUrl("/\\evil.com")).toBe("/");
    });

    it("rejects relative path without leading slash", () => {
      expect(sanitizeReturnUrl("dashboard")).toBe("/");
    });

    it("rejects control characters", () => {
      expect(sanitizeReturnUrl("/path\n/evil")).toBe("/");
      expect(sanitizeReturnUrl("/\x00")).toBe("/");
    });

    it("rejects non-string input", () => {
      expect(sanitizeReturnUrl(42 as unknown as string)).toBe("/");
      expect(sanitizeReturnUrl({} as unknown as string)).toBe("/");
    });
  });
});
