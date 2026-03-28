/**
 * BMAD Orchestrator — Queue Integration Test
 *
 * Calls the REAL buildQueue() + runQueue() from story-queue.ts.
 * Only external I/O is mocked (Claude CLI, git worktrees, Slack, git commands).
 * Everything else — config, fs, semaphore, dependency resolution, state machine,
 * queue persistence — runs for real.
 *
 * ## How to run
 *
 *   cd scripts/orchestrator
 *   npx vitest run __tests__/queue-integration.test.ts
 *
 * ## What it does
 *
 * 1. Creates 5 real spec files on disk (e2e-a0-1, e2e-a0-2, e2e-b0-1, e2e-b0-2, e2e-c0-1)
 * 2. Calls buildQueue(["e2e-a0-1-...", ...]) → creates real .queue-state.json
 * 3. Calls runQueue() → processes all stories with real semaphore + dep resolution
 * 4. Reads .queue-state.json from disk and validates:
 *    - All stories reached "done"
 *    - Metrics are correct (storiesCompleted, avgStoryDurationMs)
 *    - Dependencies were respected (a0-2 started after a0-1 via execution log)
 *    - Parallelism happened (max concurrency >= 2)
 * 5. Cleans up all created files
 *
 * ## What is mocked
 *
 * | Module          | Why                                      |
 * |-----------------|------------------------------------------|
 * | claude-runner   | No real Claude CLI calls                 |
 * | worktree        | No real git worktree/branch operations   |
 * | slack           | No real Slack notifications              |
 * | child_process   | No real git/gh/npx commands              |
 * | git-mutex       | Pass-through (no contention in test)     |
 *
 * ## What is REAL
 *
 * | Module          | Why                                         |
 * |-----------------|---------------------------------------------|
 * | config          | Real projectRoot, real maxConcurrent         |
 * | fs              | Real file reads/writes for specs + queue     |
 * | semaphore       | Real concurrency limiting                   |
 * | story-queue     | Real buildQueue, runQueue, dep resolution   |
 * | logger          | Real structured logging (writes to logs/)   |
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Execution tracking ─────────────────────────────────────────────────────

interface ExecEvent { id: string; event: "start" | "end"; time: number }
const execLog: ExecEvent[] = [];

// Story IDs that the dependency parser understands (z0-*, z1-*, z2-* streams)
const STORY_PREFIXES = ["z0-1", "z0-2", "z1-1", "z1-2", "z2-1"];

// ─── Mock: claude-runner (fast fake work) ───────────────────────────────────

vi.mock("../claude-runner.js", () => ({
  runClaude: vi.fn(async (opts: { cwd?: string; prompt?: string }) => {
    const p = opts.prompt || "";
    const c = opts.cwd || "";
    let id = "unknown";
    for (const s of STORY_PREFIXES) {
      if (p.includes(s) || c.includes(s)) { id = s; break; }
    }
    execLog.push({ id, event: "start", time: Date.now() });
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
    execLog.push({ id, event: "end", time: Date.now() });
    return { output: "Done. ALL_CRITERIA_MET", exitCode: 0, isRateLimited: false };
  }),
}));

// ─── Mock: worktree (no real git) ───────────────────────────────────────────

vi.mock("../worktree.js", () => ({
  createWorktree: vi.fn((storyId: string) => ({
    path: `/tmp/bmad-int/${storyId}`,
    branch: `feat/${storyId}`,
    storyId,
  })),
  removeWorktree: vi.fn(),
  commitInWorktree: vi.fn(() => "e2e1234"),
  pushWorktree: vi.fn(),
  createPRFromWorktree: vi.fn(() => ({ number: 99, url: "https://github.com/test/pull/99" })),
  getChangedFilesInWorktree: vi.fn(() => ["lib/e2e-fake.ts"]),
}));

// ─── Mock: slack ────────────────────────────────────────────────────────────

vi.mock("../slack.js", () => ({
  notify: vi.fn(async () => {}),
  notifyComplete: vi.fn(async () => {}),
  notifyError: vi.fn(async () => {}),
  notifyPRReady: vi.fn(async () => {}),
  notifyStatus: vi.fn(async () => {}),
}));

// ─── Mock: git-mutex (pass-through) ────────────────────────────────────────

vi.mock("../git-mutex.js", () => ({
  withGitMutex: vi.fn(async <T>(fn: () => T | Promise<T>) => fn()),
}));

// ─── Mock: child_process (git/gh/npx stubs) ────────────────────────────────

vi.mock("child_process", () => ({
  execFileSync: vi.fn((_cmd: string, args?: string[]) => {
    // git status --porcelain → no changes
    if (args?.includes("--porcelain")) return "";
    // git diff --name-only → no files
    if (args?.includes("--name-only")) return "";
    // git ls-files → no untracked
    if (args?.includes("--others")) return "";
    // gh pr checks → empty (no CI)
    if (args?.[0] === "pr" && args?.[1] === "checks") return "[]";
    // npx jest → pass
    return "";
  }),
  spawn: vi.fn(),
}));

// ─── Import real modules AFTER mocks ────────────────────────────────────────

import { config } from "../config.js";
const {
  buildQueue,
  runQueue,
  getQueueStatus,
  isQueueRunning,
  _resetForTest,
} = await import("../story-queue.js");

// ─── Paths ──────────────────────────────────────────────────────────────────

const SPECS_DIR = join(config.projectRoot, "_bmad-output/implementation-artifacts");
const QUEUE_PATH = join(config.projectRoot, "scripts/orchestrator/.queue-state.json");
const QUEUE_LOCK = QUEUE_PATH + ".lock";
const QUEUE_TMP = QUEUE_PATH + ".tmp";

// ─── Test spec files ────────────────────────────────────────────────────────

// IDs use z0/z1/z2 streams to avoid collision with real specs (a-d)
// Dep graph:
//   z0-1 → z0-2 (within-stream sequential)
//   z1-1 → z1-2 (within-stream sequential)
//   z2-1         (independent)
//   z0-1 || z1-1 || z2-1 can run in parallel
const TEST_SPECS = [
  { id: "z0-1-e2e-setup",   file: "z0-1-e2e-setup.md" },
  { id: "z0-2-e2e-auth",    file: "z0-2-e2e-auth.md" },
  { id: "z1-1-e2e-combat",  file: "z1-1-e2e-combat.md" },
  { id: "z1-2-e2e-logging", file: "z1-2-e2e-logging.md" },
  { id: "z2-1-e2e-pricing", file: "z2-1-e2e-pricing.md" },
];

const SPEC_CONTENT = `# E2E Test Spec (fake)

## Summary
This is a fake spec used by the queue integration test.

## Tasks
- [ ] Create fake component
- [ ] Add fake translations
- [ ] Write fake tests

## Acceptance Criteria
- Fake component renders
- Fake tests pass
`;

// ─── Backup/restore existing queue state ────────────────────────────────────

let originalQueueState: string | null = null;

function backupQueueState() {
  if (existsSync(QUEUE_PATH)) {
    originalQueueState = readFileSync(QUEUE_PATH, "utf-8");
  }
}

function restoreQueueState() {
  if (originalQueueState !== null) {
    writeFileSync(QUEUE_PATH, originalQueueState);
  } else {
    try { unlinkSync(QUEUE_PATH); } catch { /* didn't exist */ }
  }
  try { unlinkSync(QUEUE_LOCK); } catch {}
  try { unlinkSync(QUEUE_TMP); } catch {}
}

function createTestSpecs() {
  mkdirSync(SPECS_DIR, { recursive: true });
  for (const spec of TEST_SPECS) {
    writeFileSync(join(SPECS_DIR, spec.file), SPEC_CONTENT);
  }
}

function removeTestSpecs() {
  for (const spec of TEST_SPECS) {
    try { unlinkSync(join(SPECS_DIR, spec.file)); } catch {}
  }
}

function readQueueState() {
  if (!existsSync(QUEUE_PATH)) return null;
  return JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
}

function getMaxConcurrency(): number {
  const events = execLog
    .map((e) => ({ ...e, delta: e.event === "start" ? 1 : -1 }))
    .sort((a, b) => a.time - b.time);
  let c = 0, max = 0;
  for (const ev of events) { c += ev.delta; max = Math.max(max, c); }
  return max;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Queue Integration (real runQueue)", () => {
  beforeAll(() => {
    backupQueueState();
    createTestSpecs();
  });

  afterAll(() => {
    removeTestSpecs();
    restoreQueueState();
    _resetForTest();
  });

  afterEach(() => {
    execLog.length = 0;
    _resetForTest();
  });

  it("should run 5 fake stories through the real queue pipeline", async () => {
    // ── 1. Build queue with our test specs ────────────────────────────────
    const storyIds = TEST_SPECS.map((s) => s.id);
    const built = buildQueue(storyIds);

    expect(built.stories).toHaveLength(5);
    expect(built.stories.every((s) => s.status === "pending")).toBe(true);
    expect(built.isPaused).toBe(false);

    // ── 2. Run the REAL queue ────────────────────────────────────────────
    await runQueue();

    // ── 3. Read REAL queue state from disk ────────────────────────────────
    const state = readQueueState();
    expect(state).not.toBeNull();

    // ── 4. ALL stories should be "done" ──────────────────────────────────
    const statuses = state.stories.map((s: any) => ({ id: s.id, status: s.status }));
    console.log("\n📊 Final queue state:");
    console.table(statuses);

    for (const story of state.stories) {
      expect(story.status, `${story.id} should be done but was ${story.status}`).toBe("done");
      expect(story.finishedAt).toBeTruthy();
      expect(story.commitHash).toBe("e2e1234");
      expect(story.prNumber).toBe(99);
    }

    // ── 5. Metrics should be correct ─────────────────────────────────────
    expect(state.metrics.storiesCompleted).toBe(5);
    expect(state.metrics.storiesFailed).toBe(0);
    expect(state.metrics.totalDurationMs).toBeGreaterThan(0);
    expect(state.metrics.avgStoryDurationMs).toBeGreaterThan(0);

    // ── 6. Parallelism should have happened ──────────────────────────────
    const maxC = getMaxConcurrency();
    console.log(`\n⚡ Max concurrency observed: ${maxC} (config.maxConcurrent=${config.worktree.maxConcurrent})`);
    expect(maxC).toBeGreaterThanOrEqual(2);
    expect(maxC).toBeLessThanOrEqual(config.worktree.maxConcurrent);

    // ── 7. Dependencies should have been respected ───────────────────────
    //    z0-2 depends on z0-1 (within-stream sequential)
    //    z1-2 depends on z1-1 (within-stream sequential)
    const z01Ends = execLog.filter((e) => e.id === "z0-1" && e.event === "end");
    const z02Starts = execLog.filter((e) => e.id === "z0-2" && e.event === "start");

    expect(z01Ends.length).toBeGreaterThanOrEqual(1);
    expect(z02Starts.length).toBeGreaterThanOrEqual(1);

    const z01LastEnd = Math.max(...z01Ends.map((e) => e.time));
    const z02FirstStart = Math.min(...z02Starts.map((e) => e.time));
    console.log(`\n🔗 Dep: z0-1 ended +${z01LastEnd - execLog[0].time}ms, z0-2 started +${z02FirstStart - execLog[0].time}ms`);
    expect(z02FirstStart).toBeGreaterThanOrEqual(z01LastEnd);

    const z11Ends = execLog.filter((e) => e.id === "z1-1" && e.event === "end");
    const z12Starts = execLog.filter((e) => e.id === "z1-2" && e.event === "start");

    expect(z11Ends.length).toBeGreaterThanOrEqual(1);
    expect(z12Starts.length).toBeGreaterThanOrEqual(1);

    const z11LastEnd = Math.max(...z11Ends.map((e) => e.time));
    const z12FirstStart = Math.min(...z12Starts.map((e) => e.time));
    console.log(`🔗 Dep: z1-1 ended +${z11LastEnd - execLog[0].time}ms, z1-2 started +${z12FirstStart - execLog[0].time}ms`);
    expect(z12FirstStart).toBeGreaterThanOrEqual(z11LastEnd);

    // ── 8. Execution log summary ─────────────────────────────────────────
    console.log("\n📝 Execution log:");
    execLog.forEach((e) => {
      const rel = e.time - execLog[0].time;
      console.log(`  ${e.event === "start" ? "▶" : "■"} ${e.id} ${e.event} @ +${rel}ms`);
    });

    // ── 9. Queue status should report completion ─────────────────────────
    const status = getQueueStatus();
    expect(status).toContain("Done: 5");
    expect(isQueueRunning()).toBe(false);
  }, 120_000); // generous timeout — real queue with dep polling
});
