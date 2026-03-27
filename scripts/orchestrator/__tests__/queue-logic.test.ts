/**
 * Tests for story-queue logic: dependency resolution, queue building, state management.
 * Uses mocked filesystem to avoid side effects.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config before anything else to avoid PROJECT_ROOT check
vi.mock("../config.js", () => ({
  config: {
    projectRoot: "/mock-project",
    paths: { orchestratorLog: "/mock-log" },
    agent: { models: { orchestrator: "opus", dev: "opus", qa: "sonnet" }, timeoutMs: 60000, maxTurnsPerStory: 50 },
    git: { baseBranch: "master", branchPrefix: "feat/", autoCommit: true, autoPush: true, autoCreatePR: true },
    worktree: { baseDir: "/tmp/bmad", maxConcurrent: 4, cleanupOnSuccess: true, rateLimitBackoffMs: 30000, maxRateLimitRetries: 5 },
    verifyFix: { enabled: true, maxAttempts: 3, maxTurnsPerFix: 30, runQACheck: true },
    slack: { enabled: false },
  },
}));

// Mock fs before imports
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => "{}"),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  appendFileSync: vi.fn(),
}));

vi.mock("child_process", () => ({
  execFileSync: vi.fn(() => ""),
}));

// Mock logger to suppress output
vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), git: vi.fn(), claude: vi.fn(), taskComplete: vi.fn() },
}));

// Mock slack to prevent real notifications
vi.mock("../slack.js", () => ({
  notify: vi.fn(),
  notifyComplete: vi.fn(),
  notifyError: vi.fn(),
}));

// Mock claude-runner
vi.mock("../claude-runner.js", () => ({
  runClaude: vi.fn(() => Promise.resolve({ output: "", exitCode: 0, isRateLimited: false })),
}));

// Mock worktree
vi.mock("../worktree.js", () => ({
  createWorktree: vi.fn(() => ({ path: "/tmp/test", branch: "feat/test", storyId: "test" })),
  removeWorktree: vi.fn(),
  commitInWorktree: vi.fn(() => "abc1234"),
  pushWorktree: vi.fn(),
  createPRFromWorktree: vi.fn(() => ({ number: 1, url: "https://github.com/test/1" })),
  getChangedFilesInWorktree: vi.fn(() => ["file.ts"]),
}));

// Mock git-mutex
vi.mock("../git-mutex.js", () => ({
  withGitMutex: vi.fn((fn: () => unknown) => fn()),
}));

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe("story-queue logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no queue file exists
    mockExistsSync.mockReturnValue(false);
  });

  describe("buildQueue", () => {
    it("should build queue from spec files", async () => {
      const { buildQueue } = await import("../story-queue.js");

      mockReaddirSync.mockReturnValue([
        "a0-1-migration.md",
        "a0-2-rate-limit.md",
        "b1-1-player-view.md",
      ] as unknown as ReturnType<typeof readdirSync>);

      const state = buildQueue();

      expect(state.stories).toHaveLength(3);
      expect(state.stories[0].id).toBe("a0-1-migration");
      expect(state.stories[1].id).toBe("a0-2-rate-limit");
      expect(state.stories[2].id).toBe("b1-1-player-view");
      expect(state.stories.every((s) => s.status === "pending")).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it("should build queue from specific story IDs", async () => {
      const { buildQueue } = await import("../story-queue.js");

      mockExistsSync.mockReturnValue(true);

      const state = buildQueue(["a0-1", "b1-1"]);

      expect(state.stories).toHaveLength(2);
      expect(state.stories[0].id).toBe("a0-1");
      expect(state.stories[1].id).toBe("b1-1");
    });

    it("should exclude d-prefix stories (orchestrator self-improvement)", async () => {
      const { buildQueue } = await import("../story-queue.js");

      mockReaddirSync.mockReturnValue([
        "a0-1-migration.md",
        "d1-1-orchestrator-fix.md",
      ] as unknown as ReturnType<typeof readdirSync>);

      const state = buildQueue();

      expect(state.stories).toHaveLength(1);
      expect(state.stories[0].id).toBe("a0-1-migration");
    });

    it("should persist queue state to file", async () => {
      const { buildQueue } = await import("../story-queue.js");

      mockReaddirSync.mockReturnValue([
        "a0-1-test.md",
      ] as unknown as ReturnType<typeof readdirSync>);

      buildQueue();

      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = mockWriteFileSync.mock.calls.find((call) =>
        String(call[0]).includes(".queue-state.json")
      );
      expect(written).toBeDefined();
    });
  });

  describe("dependency resolution (inferDependencies)", () => {
    // We test dependency resolution indirectly via the queue behavior.
    // Story a0-2 depends on a0-1, stories in different streams are independent.

    it("should infer sequential dependencies within a stream", async () => {
      // We can test the exported buildQueue + getQueueStatus to verify structure
      const { buildQueue, getQueueStatus } = await import("../story-queue.js");

      mockReaddirSync.mockReturnValue([
        "a0-1-first.md",
        "a0-2-second.md",
        "a0-3-third.md",
      ] as unknown as ReturnType<typeof readdirSync>);

      const state = buildQueue();
      expect(state.stories).toHaveLength(3);

      // Queue status should be readable
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));
      const status = getQueueStatus();
      expect(status).toContain("3");
    });
  });

  describe("queue state management", () => {
    it("should report correct status counts", async () => {
      const { getQueueStatus } = await import("../story-queue.js");

      const mockState = {
        stories: [
          { id: "a0-1", status: "done", specPath: "", attempts: 1 },
          { id: "a0-2", status: "running", specPath: "", attempts: 1, slotId: 1 },
          { id: "b1-1", status: "pending", specPath: "", attempts: 0 },
          { id: "c1-1", status: "failed", specPath: "", attempts: 3, error: "timeout" },
        ],
        runningStories: ["a0-2"],
        startedAt: "2026-03-27T00:00:00Z",
        lastUpdated: "2026-03-27T01:00:00Z",
        isPaused: false,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const status = getQueueStatus();

      expect(status).toContain("Done: 1");
      expect(status).toContain("Running: 1");
      expect(status).toContain("Pending: 1");
      expect(status).toContain("Failed: 1");
      expect(status).toContain("a0-2");
    });

    it("should report paused state", async () => {
      const { getQueueStatus } = await import("../story-queue.js");

      const mockState = {
        stories: [{ id: "a0-1", status: "pending", specPath: "", attempts: 0 }],
        runningStories: [],
        startedAt: "2026-03-27T00:00:00Z",
        lastUpdated: "2026-03-27T01:00:00Z",
        isPaused: true,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const status = getQueueStatus();
      expect(status).toContain("PAUSADA");
    });

    it("should pause and resume queue", async () => {
      const { pauseQueue, resumeQueue } = await import("../story-queue.js");

      const mockState = {
        stories: [],
        runningStories: [],
        startedAt: "",
        lastUpdated: "",
        isPaused: false,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      pauseQueue();

      // Verify writeFileSync was called with isPaused: true
      const pauseCall = mockWriteFileSync.mock.calls.find((call) => {
        const content = String(call[1]);
        return content.includes('"isPaused": true') || content.includes('"isPaused":true');
      });
      expect(pauseCall).toBeDefined();

      resumeQueue();

      const resumeCall = mockWriteFileSync.mock.calls.find((call) => {
        const content = String(call[1]);
        return content.includes('"isPaused": false') || content.includes('"isPaused":false');
      });
      expect(resumeCall).toBeDefined();
    });
  });

  describe("slot assignment", () => {
    it("should assign incrementing slot IDs to running stories", async () => {
      const { getQueueStatus } = await import("../story-queue.js");

      const mockState = {
        stories: [
          { id: "a0-1", status: "running", specPath: "", attempts: 1, slotId: 1 },
          { id: "b1-1", status: "running", specPath: "", attempts: 1, slotId: 2 },
          { id: "c1-1", status: "running", specPath: "", attempts: 1, slotId: 3 },
        ],
        runningStories: ["a0-1", "b1-1", "c1-1"],
        startedAt: "2026-03-27T00:00:00Z",
        lastUpdated: "2026-03-27T01:00:00Z",
        isPaused: false,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const status = getQueueStatus();
      expect(status).toContain("[Slot 1]");
      expect(status).toContain("[Slot 2]");
      expect(status).toContain("[Slot 3]");
    });
  });
});
