/**
 * BMAD Orchestrator — Queue E2E Test (Fake Tasks)
 *
 * Tests the core orchestration logic with a lightweight harness that
 * mirrors the real runQueue flow but replaces all I/O with fakes:
 * - Semaphore (real) for parallel slot management
 * - Dependency resolution (real inferDependencies logic)
 * - State machine (pending → spawning → working → verifying → done)
 * - Retry on failure
 * - Crash recovery
 *
 * Does NOT import story-queue.ts directly — avoids config/fs/child_process
 * mock hell. Instead, replicates the exact patterns used by runQueue.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Semaphore } from "../semaphore.js";

// ─── Types (mirrors story-queue.ts) ─────────────────────────────────────────

type SessionStatus =
  | "pending" | "spawning" | "working" | "verifying"
  | "pr_open" | "done" | "failed" | "skipped" | "stuck";

interface FakeStory {
  id: string;
  status: SessionStatus;
  attempts: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

interface ExecutionEvent {
  id: string;
  event: "start" | "end";
  time: number;
  status?: SessionStatus;
}

// ─── Dependency Resolution (copied from story-queue.ts) ─────────────────────

const SPRINT_GATES: Record<string, string[]> = {
  "a1-1": ["a0-8"],
  "b1-1": ["a1-4"],
  "b2-1": ["a1-4"],
  "b3-1": ["a1-4"],
  "c1-1": ["b3-5"],
  "c2-1": ["b3-5"],
};

const STREAM_DEP_OVERRIDES: Record<string, string> = {
  "b2-3": "b2-1",
};

function inferDependencies(storyId: string): string[] {
  const match = storyId.match(/^([a-z]\d+)-(\d+)/);
  if (!match) return [];
  const [prefix, stream, numStr] = match;
  const num = parseInt(numStr, 10);
  const deps: string[] = [];
  if (num > 1) {
    const override = STREAM_DEP_OVERRIDES[prefix];
    deps.push(override ?? `${stream}-${num - 1}`);
  }
  const gates = SPRINT_GATES[prefix];
  if (gates) deps.push(...gates);
  return deps;
}

function findStoryByPrefix(stories: FakeStory[], depPrefix: string): FakeStory | undefined {
  return stories.find((s) => s.id === depPrefix || s.id.startsWith(depPrefix + "-"));
}

function areDependenciesMet(storyId: string, stories: FakeStory[]): boolean {
  const deps = inferDependencies(storyId);
  if (deps.length === 0) return true;
  return deps.every((depPrefix) => {
    const dep = findStoryByPrefix(stories, depPrefix);
    return !dep || dep.status === "done";
  });
}

// ─── Fake Task Executor ─────────────────────────────────────────────────────

const executionLog: ExecutionEvent[] = [];
const failOnceSet = new Set<string>();

/** Simulates what executeStorySpec does, without real I/O */
async function fakeExecuteStory(
  story: FakeStory,
  allStories: FakeStory[],
  workMs: number = 50,
): Promise<boolean> {
  story.status = "spawning";
  story.attempts++;
  story.startedAt = Date.now();

  // Simulate worktree creation
  story.status = "working";
  executionLog.push({ id: story.id, event: "start", time: Date.now(), status: "working" });

  // Simulate Claude doing work
  if (failOnceSet.has(story.id)) {
    failOnceSet.delete(story.id);
    story.status = "failed";
    story.error = "SIMULATED_FAILURE";
    executionLog.push({ id: story.id, event: "end", time: Date.now(), status: "failed" });
    return false;
  }

  await new Promise((r) => setTimeout(r, workMs + Math.random() * workMs));

  // Simulate verify
  story.status = "verifying";
  await new Promise((r) => setTimeout(r, 10));

  // Simulate commit + PR
  story.status = "pr_open";
  await new Promise((r) => setTimeout(r, 5));

  // Done
  story.status = "done";
  story.finishedAt = Date.now();
  executionLog.push({ id: story.id, event: "end", time: Date.now(), status: "done" });
  return true;
}

// ─── Queue Runner (mirrors runQueue pattern from story-queue.ts) ────────────

async function runFakeQueue(
  stories: FakeStory[],
  maxConcurrent: number = 3,
  maxRetries: number = 3,
): Promise<void> {
  const semaphore = new Semaphore(maxConcurrent);
  const promises: Promise<void>[] = [];

  for (const story of stories) {
    if (story.status === "done" || story.status === "skipped") continue;
    if (story.status === "failed" && story.attempts >= maxRetries) continue;

    const storyId = story.id;

    const storyPromise = semaphore.run(async () => {
      // Wait for dependencies (poll like runQueue does)
      if (!areDependenciesMet(storyId, stories)) {
        for (let waitRound = 0; waitRound < 500; waitRound++) {
          await new Promise((r) => setTimeout(r, 5));
          if (areDependenciesMet(storyId, stories)) break;
          // Bail if story was externally skipped/failed
          if (story.status === "done" || story.status === "failed" || story.status === "skipped") return;
        }
        if (!areDependenciesMet(storyId, stories)) {
          story.status = "skipped";
          story.error = "Dependencies not met after timeout";
          return;
        }
      }

      // Retry loop (same pattern as runQueue)
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (story.status === "done" || story.status === "skipped") break;
        if (story.status === "failed" && story.attempts >= maxRetries) break;

        const success = await fakeExecuteStory(story, stories);
        if (success || story.status === "done") break;

        // Retry: reset to pending with brief backoff
        if (story.attempts < maxRetries) {
          story.status = "pending";
          await new Promise((r) => setTimeout(r, 5));
        }
      }
    });

    promises.push(storyPromise);
  }

  await Promise.allSettled(promises);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStories(ids: string[]): FakeStory[] {
  return ids.map((id) => ({ id, status: "pending" as const, attempts: 0 }));
}

function getMaxConcurrency(): number {
  const events = executionLog
    .map((e) => ({ ...e, delta: e.event === "start" ? 1 : -1 }))
    .sort((a, b) => a.time - b.time);
  let concurrent = 0;
  let max = 0;
  for (const ev of events) {
    concurrent += ev.delta;
    max = Math.max(max, concurrent);
  }
  return max;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Queue E2E (fake tasks)", () => {
  beforeEach(() => {
    executionLog.length = 0;
    failOnceSet.clear();
  });

  // ── 1. All stories reach "done" ───────────────────────────────────────

  it("should execute all independent stories to done", async () => {
    const stories = makeStories(["a0-1-setup-db", "b0-1-combat-ui", "c0-1-pricing"]);

    await runFakeQueue(stories, 3);

    expect(stories.every((s) => s.status === "done")).toBe(true);
    expect(stories.every((s) => s.finishedAt)).toBe(true);
  });

  // ── 2. Parallel execution: independent stories overlap ────────────────

  it("should run independent stories in parallel (maxConcurrent=3)", async () => {
    // 5 independent stories (different streams, all first in stream)
    const stories = makeStories([
      "a0-1-infra", "b0-1-combat", "c0-1-pricing", "d0-1-ui", "a1-1-test",
    ]);

    await runFakeQueue(stories, 3);

    expect(stories.every((s) => s.status === "done")).toBe(true);

    const maxC = getMaxConcurrency();
    // With 3 slots and 5 independent stories, at least 2 should overlap
    expect(maxC).toBeGreaterThanOrEqual(2);
    // Should never exceed maxConcurrent
    expect(maxC).toBeLessThanOrEqual(3);
  });

  // ── 3. Semaphore respects maxConcurrent=1 (serial) ────────────────────

  it("should serialize execution with maxConcurrent=1", async () => {
    const stories = makeStories(["a0-1-one", "b0-1-two", "c0-1-three"]);

    await runFakeQueue(stories, 1);

    expect(stories.every((s) => s.status === "done")).toBe(true);

    // With maxConcurrent=1, max concurrency should be exactly 1
    expect(getMaxConcurrency()).toBe(1);
  });

  // ── 4. Within-stream dependencies: a0-2 waits for a0-1 ───────────────

  it("should respect within-stream sequential deps (a0-2 after a0-1)", async () => {
    const stories = makeStories(["a0-1-setup", "a0-2-auth", "a0-3-tests"]);

    await runFakeQueue(stories, 3);

    expect(stories.every((s) => s.status === "done")).toBe(true);

    // a0-2 must START after a0-1 ENDS
    const a01End = executionLog.find((e) => e.id === "a0-1-setup" && e.event === "end")!;
    const a02Start = executionLog.find((e) => e.id === "a0-2-auth" && e.event === "start")!;
    expect(a02Start.time).toBeGreaterThanOrEqual(a01End.time);

    // a0-3 must START after a0-2 ENDS
    const a02End = executionLog.find((e) => e.id === "a0-2-auth" && e.event === "end")!;
    const a03Start = executionLog.find((e) => e.id === "a0-3-tests" && e.event === "start")!;
    expect(a03Start.time).toBeGreaterThanOrEqual(a02End.time);
  });

  // ── 5. Cross-stream parallelism with same-stream sequencing ───────────

  it("should run a0-1 || b0-1 in parallel, but a0-2 waits for a0-1", async () => {
    const stories = makeStories([
      "a0-1-infra", "a0-2-auth",   // sequential (same stream)
      "b0-1-combat",               // parallel with a0-*
    ]);

    await runFakeQueue(stories, 3);

    expect(stories.every((s) => s.status === "done")).toBe(true);

    // a0-1 and b0-1 should overlap
    const a01Start = executionLog.find((e) => e.id === "a0-1-infra" && e.event === "start")!;
    const a01End = executionLog.find((e) => e.id === "a0-1-infra" && e.event === "end")!;
    const b01Start = executionLog.find((e) => e.id === "b0-1-combat" && e.event === "start")!;
    const b01End = executionLog.find((e) => e.id === "b0-1-combat" && e.event === "end")!;

    // At least one of them should start before the other ends (overlap)
    const overlaps = b01Start.time < a01End.time || a01Start.time < b01End.time;
    expect(overlaps).toBe(true);

    // a0-2 must start after a0-1 finishes
    const a02Start = executionLog.find((e) => e.id === "a0-2-auth" && e.event === "start")!;
    expect(a02Start.time).toBeGreaterThanOrEqual(a01End.time);
  });

  // ── 6. Retry: story fails once, succeeds on retry ────────────────────

  it("should retry a failed story and succeed on second attempt", async () => {
    failOnceSet.add("a0-1-setup");
    const stories = makeStories(["a0-1-setup"]);

    await runFakeQueue(stories, 2);

    expect(stories[0].status).toBe("done");
    expect(stories[0].attempts).toBe(2); // failed once + succeeded once
  });

  // ── 7. Permanent failure after maxRetries ─────────────────────────────

  it("should mark story as failed after maxRetries exhausted", async () => {
    // Make it fail every attempt
    const stories = makeStories(["a0-1-setup"]);

    // Override: always fail
    const alwaysFail = async (story: FakeStory) => {
      story.status = "spawning";
      story.attempts++;
      story.status = "working";
      executionLog.push({ id: story.id, event: "start", time: Date.now() });
      story.status = "failed";
      story.error = "ALWAYS_FAILS";
      executionLog.push({ id: story.id, event: "end", time: Date.now() });
      return false;
    };

    // Run with custom executor
    const semaphore = new Semaphore(1);
    const promise = semaphore.run(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const success = await alwaysFail(stories[0]);
        if (success) break;
        if (stories[0].attempts < 3) {
          stories[0].status = "pending";
          await new Promise((r) => setTimeout(r, 1));
        }
      }
    });
    await promise;

    expect(stories[0].status).toBe("failed");
    expect(stories[0].attempts).toBe(3);
  });

  // ── 8. State machine transitions ──────────────────────────────────────

  it("should transition through correct state machine", async () => {
    const transitions: SessionStatus[] = [];
    const story: FakeStory = { id: "a0-1-test", status: "pending", attempts: 0 };

    // Proxy to capture transitions
    const handler: ProxyHandler<FakeStory> = {
      set(target, prop, value) {
        if (prop === "status") transitions.push(value as SessionStatus);
        return Reflect.set(target, prop, value);
      },
    };
    const proxy = new Proxy(story, handler);

    await fakeExecuteStory(proxy, [proxy]);

    expect(transitions).toEqual(["spawning", "working", "verifying", "pr_open", "done"]);
  });

  // ── 9. Sprint gate dependencies ───────────────────────────────────────

  it("should enforce sprint gate dependencies", () => {
    // b1-1 depends on a1-4 (sprint gate)
    expect(inferDependencies("b1-1-combat")).toContain("a1-4");

    // c1-1 depends on b3-5 (sprint gate)
    expect(inferDependencies("c1-1-pricing")).toContain("b3-5");

    // a0-1 has no deps (first story)
    expect(inferDependencies("a0-1-infra")).toEqual([]);

    // a0-2 depends on a0-1 (within-stream)
    const a02Deps = inferDependencies("a0-2-auth");
    expect(a02Deps).toContain("a0-1");
  });

  // ── 10. areDependenciesMet with mixed statuses ─────────────────────────

  it("should correctly evaluate dependency status", () => {
    const stories = makeStories(["a0-1-infra", "a0-2-auth"]);

    // a0-1 pending → a0-2 deps NOT met
    expect(areDependenciesMet("a0-2-auth", stories)).toBe(false);

    // a0-1 working → still NOT met
    stories[0].status = "working";
    expect(areDependenciesMet("a0-2-auth", stories)).toBe(false);

    // a0-1 done → deps MET
    stories[0].status = "done";
    expect(areDependenciesMet("a0-2-auth", stories)).toBe(true);

    // a0-1 has no deps → always met
    expect(areDependenciesMet("a0-1-infra", stories)).toBe(true);
  });

  // ── 11. Crash recovery simulation ─────────────────────────────────────

  it("should recover crashed entries (reset stale statuses to pending)", () => {
    const stories: FakeStory[] = [
      { id: "a0-1", status: "working", attempts: 1 },
      { id: "a0-2", status: "done", attempts: 1 },
      { id: "b1-1", status: "verifying", attempts: 1 },
      { id: "b1-2", status: "spawning", attempts: 1 },
      { id: "c1-1", status: "pending", attempts: 0 },
    ];

    // Simulate crash recovery (same logic as recoverCrashedEntries)
    let recovered = 0;
    for (const story of stories) {
      if (story.status === "spawning" || story.status === "working" || story.status === "verifying") {
        story.error = `Crashed in "${story.status}"`;
        story.status = "pending";
        recovered++;
      }
    }

    expect(recovered).toBe(3);
    expect(stories[0].status).toBe("pending");  // was working
    expect(stories[1].status).toBe("done");      // unchanged
    expect(stories[2].status).toBe("pending");  // was verifying
    expect(stories[3].status).toBe("pending");  // was spawning
    expect(stories[4].status).toBe("pending");  // unchanged
  });

  // ── 12. Skip prevents execution ───────────────────────────────────────

  it("should not execute skipped stories", async () => {
    const stories = makeStories(["a0-1-infra", "b0-1-combat"]);
    stories[1].status = "skipped";

    await runFakeQueue(stories, 2);

    expect(stories[0].status).toBe("done");
    expect(stories[1].status).toBe("skipped"); // untouched
    expect(executionLog.filter((e) => e.id === "b0-1-combat")).toHaveLength(0);
  });

  // ── 13. Full sprint simulation ────────────────────────────────────────

  it("should handle a full sprint with mixed deps and parallelism", async () => {
    // Simulate a realistic sprint:
    // Stream a0: a0-1 → a0-2 → a0-3 (sequential)
    // Stream b0: b0-1 → b0-2 (sequential, parallel with a0)
    // Stream c0: c0-1 (independent)
    const stories = makeStories([
      "a0-1-db-setup",
      "a0-2-auth-flow",
      "a0-3-api-endpoints",
      "b0-1-combat-init",
      "b0-2-combat-log",
      "c0-1-pricing-page",
    ]);

    failOnceSet.add("b0-1-combat-init"); // will retry

    await runFakeQueue(stories, 3);

    // All should complete
    expect(stories.every((s) => s.status === "done")).toBe(true);

    // Verify parallelism happened
    const maxC = getMaxConcurrency();
    expect(maxC).toBeGreaterThanOrEqual(2);
    expect(maxC).toBeLessThanOrEqual(3);

    // Verify ordering within streams
    const a01End = executionLog.find((e) => e.id === "a0-1-db-setup" && e.event === "end")!;
    const a02Start = executionLog.find((e) => e.id === "a0-2-auth-flow" && e.event === "start")!;
    expect(a02Start.time).toBeGreaterThanOrEqual(a01End.time);

    const b01End = executionLog.filter((e) => e.id === "b0-1-combat-init" && e.event === "end").pop()!;
    const b02Start = executionLog.find((e) => e.id === "b0-2-combat-log" && e.event === "start")!;
    expect(b02Start.time).toBeGreaterThanOrEqual(b01End.time);

    // b0-1 should have retried
    const b01Story = stories.find((s) => s.id === "b0-1-combat-init")!;
    expect(b01Story.attempts).toBe(2);
  });

  // ── 14. Semaphore unit test ───────────────────────────────────────────

  it("Semaphore should enforce concurrency limit", async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 10 }, (_, i) =>
      sem.run(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 20));
        active--;
        return i;
      })
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(maxActive).toBe(2);
    expect(active).toBe(0);
  });

  // ── 15. Semaphore acquire/release ─────────────────────────────────────

  it("Semaphore should track running/available/waiting correctly", async () => {
    const sem = new Semaphore(2);

    expect(sem.running).toBe(0);
    expect(sem.available).toBe(2);
    expect(sem.waiting).toBe(0);

    await sem.acquire();
    expect(sem.running).toBe(1);
    expect(sem.available).toBe(1);

    await sem.acquire();
    expect(sem.running).toBe(2);
    expect(sem.available).toBe(0);

    // Third acquire should block
    let thirdAcquired = false;
    const thirdPromise = sem.acquire().then(() => { thirdAcquired = true; });

    // Give microtask a chance
    await new Promise((r) => setTimeout(r, 1));
    expect(thirdAcquired).toBe(false);
    expect(sem.waiting).toBe(1);

    sem.release();
    await thirdPromise;
    expect(thirdAcquired).toBe(true);
    // After transfer: one released + one acquired = running stays at 2
    expect(sem.running).toBe(2);

    sem.release();
    expect(sem.running).toBe(1);
    sem.release();
    expect(sem.running).toBe(0);
  });
});
