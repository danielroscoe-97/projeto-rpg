import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process before importing worktree
vi.mock("child_process", () => ({
  execFileSync: vi.fn(() => ""),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => "{}"),
  appendFileSync: vi.fn(),
}));

import { execFileSync } from "child_process";
import { existsSync } from "fs";

const mockExecFileSync = vi.mocked(execFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe("worktree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFileSync.mockReturnValue("");
  });

  describe("createWorktree", () => {
    it("should create a worktree with correct git commands", async () => {
      const { createWorktree } = await import("../worktree.js");

      mockExistsSync.mockReturnValue(false);
      // First call: branch -D (will throw = branch doesn't exist)
      // Then: fetch, worktree add
      mockExecFileSync
        .mockImplementation((cmd, args) => {
          const argsArr = args as string[];
          if (cmd === "git" && argsArr[0] === "branch" && argsArr[1] === "-D") {
            throw new Error("branch not found");
          }
          if (cmd === "git" && argsArr[0] === "fetch") {
            return "";
          }
          return "";
        });

      const worktree = createWorktree("v2-1-1", "add-combatant-mid-combat");

      expect(worktree.branch).toMatch(/^feat\//);
      expect(worktree.storyId).toBe("v2-1-1");
      expect(worktree.path).toContain("bmad");

      // Verify git worktree add was called
      const worktreeAddCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "worktree" && (call[1] as string[])[1] === "add"
      );
      expect(worktreeAddCall).toBeDefined();
    });

    it("should remove stale worktree if directory exists", async () => {
      const { createWorktree } = await import("../worktree.js");

      mockExistsSync.mockReturnValue(true);
      mockExecFileSync.mockReturnValue("");

      createWorktree("v2-1-1", "add-combatant");

      // Should have called worktree remove for cleanup
      const removeCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "worktree" && (call[1] as string[])[1] === "remove"
      );
      expect(removeCall).toBeDefined();
    });
  });

  describe("removeWorktree", () => {
    it("should remove worktree via git command", async () => {
      const { removeWorktree } = await import("../worktree.js");

      mockExecFileSync.mockReturnValue("");

      removeWorktree({
        path: "/tmp/bmad/test-branch",
        branch: "feat/test-branch",
        storyId: "test",
      });

      // Should call git worktree remove
      const removeCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "worktree" && (call[1] as string[])[1] === "remove"
      );
      expect(removeCall).toBeDefined();

      // Should call git branch -D for cleanup
      const branchDeleteCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "branch" && (call[1] as string[])[1] === "-D"
      );
      expect(branchDeleteCall).toBeDefined();
    });
  });

  describe("listWorktrees", () => {
    it("should parse porcelain output into Worktree objects", async () => {
      const { listWorktrees } = await import("../worktree.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "worktree" && argsArr[1] === "list") {
          return [
            "worktree /main/repo",
            "HEAD abc1234",
            "branch refs/heads/master",
            "",
            "worktree /tmp/bmad/story-1-1",
            "HEAD def5678",
            "branch refs/heads/feat/story-1-1",
            "",
            "worktree /tmp/bmad/story-1-2",
            "HEAD ghi9012",
            "branch refs/heads/feat/story-1-2",
          ].join("\n");
        }
        return "";
      });

      const worktrees = listWorktrees();

      // Should NOT include the main worktree (master doesn't start with feat/)
      expect(worktrees).toHaveLength(2);
      expect(worktrees[0].branch).toBe("feat/story-1-1");
      expect(worktrees[0].path).toBe("/tmp/bmad/story-1-1");
      expect(worktrees[1].branch).toBe("feat/story-1-2");
    });

    it("should return empty array when no feat worktrees exist", async () => {
      const { listWorktrees } = await import("../worktree.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "worktree" && argsArr[1] === "list") {
          return [
            "worktree /main/repo",
            "HEAD abc1234",
            "branch refs/heads/master",
          ].join("\n");
        }
        return "";
      });

      const worktrees = listWorktrees();
      expect(worktrees).toHaveLength(0);
    });
  });

  describe("commitInWorktree", () => {
    it("should stage, commit, and return short hash", async () => {
      const { commitInWorktree } = await import("../worktree.js");

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

      const hash = commitInWorktree(
        { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" },
        "feat(test): implement"
      );

      expect(hash).toBe("abc1234");

      // Should have called git add -A with cwd
      const addCall = mockExecFileSync.mock.calls.find(
        (call) => call[0] === "git" && (call[1] as string[])[0] === "add" && (call[1] as string[])[1] === "-A"
      );
      expect(addCall).toBeDefined();
      expect((addCall![2] as { cwd: string }).cwd).toBe("/tmp/bmad/test");
    });

    it("should return 'no-changes' when nothing to commit", async () => {
      const { commitInWorktree } = await import("../worktree.js");

      mockExecFileSync.mockImplementation((cmd, args) => {
        const argsArr = args as string[];
        if (argsArr[0] === "status" && argsArr[1] === "--porcelain") {
          return "";
        }
        return "";
      });

      const hash = commitInWorktree(
        { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" },
        "feat(test): implement"
      );

      expect(hash).toBe("no-changes");
    });
  });
});
