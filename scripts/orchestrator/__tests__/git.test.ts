/**
 * Tests for git.ts — safe git operations.
 * Validates that all commands use execFileSync (no shell injection).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config before anything else to avoid PROJECT_ROOT check
vi.mock("../config.js", () => ({
  config: {
    projectRoot: "/mock-project",
    paths: { orchestratorLog: "/mock-log" },
    git: { baseBranch: "master", branchPrefix: "feat/", autoCommit: true, autoPush: true, autoCreatePR: true },
    slack: { enabled: false },
  },
}));

vi.mock("child_process", () => ({
  execFileSync: vi.fn(() => ""),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn(() => "{}"),
  appendFileSync: vi.fn(),
}));

// Mock logger to suppress output
vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), git: vi.fn() },
}));

import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const mockExecFileSync = vi.mocked(execFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);

describe("git operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFileSync.mockReturnValue("");
  });

  describe("createBranch", () => {
    it("should create a branch with sanitized slug", async () => {
      const { createBranch } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (cmd === "git" && argsArr[0] === "branch" && argsArr[1] === "--show-current") {
          return "feat/my-story";
        }
        return "";
      });

      const branch = createBranch("a0-1", "Add Migration Renumbering");
      expect(branch).toMatch(/^feat\//);
      expect(branch).toContain("add-migration-renumbering");
    });

    it("should reject story IDs with injection attempts", async () => {
      const { createBranch } = await import("../git.js");

      expect(() => createBranch("$(rm -rf /)", "test")).toThrow("unsafe characters");
      expect(() => createBranch("a0-1; echo pwned", "test")).toThrow("unsafe characters");
    });

    it("should never call execFileSync with shell: true", async () => {
      const { createBranch } = await import("../git.js");

      mockExecFileSync.mockReturnValue("");

      createBranch("a0-1", "test-story");

      // Verify no call has shell: true
      for (const call of mockExecFileSync.mock.calls) {
        const options = call[2] as Record<string, unknown> | undefined;
        expect(options?.shell).toBeUndefined();
      }
    });
  });

  describe("commit", () => {
    it("should write commit message to temp file", async () => {
      const { commit } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "status" && argsArr[1] === "--porcelain") {
          return "M file.ts\n";
        }
        if (argsArr[0] === "rev-parse") {
          return "abc1234";
        }
        return "";
      });

      const hash = commit("feat(a0-1): implement story");
      expect(hash).toBe("abc1234");

      // Verify message was written to file, not passed as arg
      const writeCall = mockWriteFileSync.mock.calls.find((call) =>
        String(call[0]).includes("BMAD_COMMIT_MSG")
      );
      expect(writeCall).toBeDefined();
      expect(String(writeCall![1])).toContain("feat(a0-1)");
      expect(String(writeCall![1])).toContain("Co-Authored-By");

      // Verify git commit used --file
      const commitCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "commit"
      );
      expect(commitCall).toBeDefined();
      expect((commitCall![1] as string[])).toContain("--file");
    });

    it("should cleanup temp file even on error", async () => {
      const { commit } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "status" && argsArr[1] === "--porcelain") {
          return "M file.ts\n";
        }
        if (argsArr[0] === "commit") {
          throw new Error("commit failed");
        }
        return "";
      });

      expect(() => commit("test")).toThrow("commit failed");
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should return 'no-changes' when nothing to commit", async () => {
      const { commit } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "status" && argsArr[1] === "--porcelain") {
          return "";
        }
        return "";
      });

      expect(commit("test")).toBe("no-changes");
    });
  });

  describe("createPR", () => {
    it("should write PR body to temp file", async () => {
      const { createPR } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (cmd === "gh") {
          return JSON.stringify({ number: 42, url: "https://github.com/test/42" });
        }
        return "";
      });

      const pr = createPR("feat: test PR", "## Summary\nTest body");
      expect(pr.number).toBe(42);

      // Verify body was written to file
      const bodyWrite = mockWriteFileSync.mock.calls.find((call) =>
        String(call[0]).includes("BMAD_PR_BODY")
      );
      expect(bodyWrite).toBeDefined();
      expect(String(bodyWrite![1])).toContain("Test body");

      // Verify gh used --body-file
      const ghCall = mockExecFileSync.mock.calls.find((call) => call[0] === "gh");
      expect(ghCall).toBeDefined();
      expect((ghCall![1] as string[])).toContain("--body-file");
    });
  });

  describe("getStatus", () => {
    it("should return branch, changed files count, and ahead count", async () => {
      const { getStatus } = await import("../git.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "branch" && argsArr[1] === "--show-current") {
          return "feat/test";
        }
        if (argsArr[0] === "status" && argsArr[1] === "--porcelain") {
          return "M file1.ts\nM file2.ts";
        }
        if (argsArr[0] === "rev-list") {
          return "3";
        }
        return "";
      });

      const status = getStatus();
      expect(status.branch).toBe("feat/test");
      expect(status.changedFiles).toBe(2);
      expect(status.ahead).toBe(3);
    });
  });
});
