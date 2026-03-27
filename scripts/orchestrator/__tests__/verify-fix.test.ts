import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process
vi.mock("child_process", () => ({
  execFileSync: vi.fn(() => ""),
  spawn: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => "{}"),
  readdirSync: vi.fn(() => []),
  appendFileSync: vi.fn(),
}));

// Mock slack
vi.mock("../slack.js", () => ({
  notify: vi.fn(async () => {}),
  notifyComplete: vi.fn(async () => {}),
  notifyError: vi.fn(async () => {}),
}));

// Mock claude-runner
vi.mock("../claude-runner.js", () => ({
  runClaude: vi.fn(async () => ({ output: "ALL_CRITERIA_MET", exitCode: 0 })),
}));

// Mock worktree module
vi.mock("../worktree.js", () => ({
  createWorktree: vi.fn(() => ({ path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" })),
  removeWorktree: vi.fn(),
  commitInWorktree: vi.fn(() => "abc1234"),
  pushWorktree: vi.fn(),
  createPRFromWorktree: vi.fn(() => ({ number: 1, url: "https://github.com/test/1" })),
  getChangedFilesInWorktree: vi.fn(() => ["file1.ts", "file2.ts"]),
}));

import { execFileSync } from "child_process";
import { runClaude } from "../claude-runner.js";

const mockExecFileSync = vi.mocked(execFileSync);
const mockRunClaude = vi.mocked(runClaude);

describe("verifyAndFix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass on first attempt when tests pass and QA says ALL_CRITERIA_MET", async () => {
    const { verifyAndFix } = await import("../story-queue.js");

    // Tests pass
    mockExecFileSync.mockReturnValue("Tests passed");

    // QA says all criteria met
    mockRunClaude.mockResolvedValue({ output: "ALL_CRITERIA_MET", exitCode: 0 });

    const worktree = { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" };
    const result = await verifyAndFix(worktree, "spec content");

    expect(result.passed).toBe(true);
    expect(result.fixAttempts).toBe(0);
  });

  it("should retry and pass on second attempt after fix", async () => {
    const { verifyAndFix } = await import("../story-queue.js");

    let testCallCount = 0;
    mockExecFileSync.mockImplementation((cmd, args) => {
      if (cmd === "npm") {
        testCallCount++;
        if (testCallCount === 1) {
          // First test run fails
          const error = new Error("Test failed") as Error & { stdout: string; stderr: string };
          error.stdout = "FAIL some.test.ts";
          error.stderr = "";
          throw error;
        }
        // Second test run passes
        return "Tests passed";
      }
      return "";
    });

    // First call: fix agent, second call: QA passes
    mockRunClaude
      .mockResolvedValueOnce({ output: "Fixed the issue", exitCode: 0 })  // fix
      .mockResolvedValueOnce({ output: "ALL_CRITERIA_MET", exitCode: 0 }); // QA

    const worktree = { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" };
    const result = await verifyAndFix(worktree, "spec content");

    expect(result.passed).toBe(true);
    expect(result.fixAttempts).toBe(1);
  });

  it("should fail after max attempts", async () => {
    const { verifyAndFix } = await import("../story-queue.js");

    // Tests always fail
    mockExecFileSync.mockImplementation((cmd) => {
      if (cmd === "npm") {
        const error = new Error("Test failed") as Error & { stdout: string; stderr: string };
        error.stdout = "FAIL";
        error.stderr = "";
        throw error;
      }
      return "";
    });

    // Fix agent always returns but doesn't actually fix
    mockRunClaude.mockResolvedValue({ output: "Tried to fix", exitCode: 0 });

    const worktree = { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" };
    const result = await verifyAndFix(worktree, "spec content", 3);

    expect(result.passed).toBe(false);
    expect(result.fixAttempts).toBe(3);
  });

  it("should fail when QA does not say ALL_CRITERIA_MET after max attempts", async () => {
    const { verifyAndFix } = await import("../story-queue.js");

    // Tests pass
    mockExecFileSync.mockReturnValue("Tests passed");

    // QA never says ALL_CRITERIA_MET, then fix agent runs, repeat
    mockRunClaude.mockResolvedValue({ output: "Missing criterion X", exitCode: 0 });

    const worktree = { path: "/tmp/bmad/test", branch: "feat/test", storyId: "test" };
    const result = await verifyAndFix(worktree, "spec content", 2);

    expect(result.passed).toBe(false);
    expect(result.fixAttempts).toBe(2);
  });
});
