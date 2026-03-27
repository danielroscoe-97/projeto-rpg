import { describe, it, expect } from "vitest";
import { validateBranchName, validateStoryId, toBranchSafeSlug } from "../validation.js";

describe("validation", () => {
  describe("validateBranchName", () => {
    it("should accept valid branch names", () => {
      expect(validateBranchName("feat/my-story")).toBe("feat/my-story");
      expect(validateBranchName("feat/a0-1-migration")).toBe("feat/a0-1-migration");
      expect(validateBranchName("fix/bug_123")).toBe("fix/bug_123");
      expect(validateBranchName("master")).toBe("master");
    });

    it("should reject empty branch names", () => {
      expect(() => validateBranchName("")).toThrow("empty or too long");
    });

    it("should reject branch names with unsafe characters", () => {
      expect(() => validateBranchName("feat/$(rm -rf)")).toThrow("unsafe characters");
      expect(() => validateBranchName("feat/`whoami`")).toThrow("unsafe characters");
      expect(() => validateBranchName("feat/foo bar")).toThrow("unsafe characters");
      expect(() => validateBranchName("feat/foo;echo")).toThrow("unsafe characters");
      expect(() => validateBranchName("feat/foo|cat")).toThrow("unsafe characters");
    });

    it("should reject branch names with double dots", () => {
      expect(() => validateBranchName("feat/a..b")).toThrow("reserved git pattern");
    });

    it("should reject branch names starting with dash", () => {
      expect(() => validateBranchName("-feat/story")).toThrow("reserved git pattern");
    });

    it("should reject branch names ending with .lock", () => {
      expect(() => validateBranchName("feat/branch.lock")).toThrow("reserved git pattern");
    });

    it("should reject branch names that are too long", () => {
      const longName = "a".repeat(101);
      expect(() => validateBranchName(longName)).toThrow("empty or too long");
    });
  });

  describe("validateStoryId", () => {
    it("should accept valid story IDs", () => {
      expect(validateStoryId("a0-1")).toBe("a0-1");
      expect(validateStoryId("b2-3")).toBe("b2-3");
      expect(validateStoryId("v2-1-1")).toBe("v2-1-1");
      expect(validateStoryId("c1-1-feature-flags")).toBe("c1-1-feature-flags");
    });

    it("should reject empty story IDs", () => {
      expect(() => validateStoryId("")).toThrow("empty or too long");
    });

    it("should reject story IDs with unsafe characters", () => {
      expect(() => validateStoryId("a0-1; rm -rf /")).toThrow("unsafe characters");
      expect(() => validateStoryId("$(whoami)")).toThrow("unsafe characters");
    });

    it("should reject story IDs that are too long", () => {
      const longId = "a".repeat(61);
      expect(() => validateStoryId(longId)).toThrow("empty or too long");
    });
  });

  describe("toBranchSafeSlug", () => {
    it("should convert to lowercase and replace unsafe chars with hyphens", () => {
      expect(toBranchSafeSlug("Add Combatant Mid-Combat")).toBe("add-combatant-mid-combat");
    });

    it("should strip leading and trailing hyphens", () => {
      expect(toBranchSafeSlug("---hello---")).toBe("hello");
    });

    it("should truncate to 40 chars", () => {
      const long = "a-very-long-description-that-should-be-truncated-to-forty-characters";
      expect(toBranchSafeSlug(long).length).toBeLessThanOrEqual(40);
    });

    it("should handle special characters", () => {
      expect(toBranchSafeSlug("feat: $(rm -rf /)")).toBe("feat-rm-rf");
    });
  });
});
