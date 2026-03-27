/**
 * BMAD Orchestrator — Story Queue (Parallel)
 *
 * Processes story specs with configurable concurrency.
 * Designed to run for 28+ hours unattended.
 *
 * Features:
 * - Parallel execution via semaphore (maxConcurrent slots)
 * - Dependency-aware scheduling (a0-1 before a0-2, but a0-1 || b1-1)
 * - Persistent queue state (survives restarts)
 * - Async mutex for queue state (no event-loop blocking)
 * - Retry with exponential backoff (max 3 retries per story)
 * - Rate limit detection + dedicated backoff
 * - Per-story git branches + commits (git remote ops serialized)
 * - Slack notifications with slot identification
 * - Structured logging for full history
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";
import { config } from "./config.js";
import { runClaude } from "./claude-runner.js";
import { notify, notifyComplete, notifyError } from "./slack.js";
import { logger } from "./logger.js";
import { Semaphore, Mutex } from "./semaphore.js";
import { withGitMutex } from "./git-mutex.js";
import {
  createWorktree,
  removeWorktree,
  commitInWorktree,
  pushWorktree,
  createPRFromWorktree,
  getChangedFilesInWorktree,
  type Worktree,
} from "./worktree.js";

// -- Types --

interface StoryEntry {
  id: string;
  specPath: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  branch?: string;
  commitHash?: string;
  worktreePath?: string;
  verifyAttempts?: number;
  verifyPassed?: boolean;
  slotId?: number;
}

interface QueueState {
  stories: StoryEntry[];
  runningStories: string[];
  startedAt: string;
  lastUpdated: string;
  isPaused: boolean;
}

// -- Paths --

const QUEUE_PATH = join(config.projectRoot, "scripts/orchestrator/.queue-state.json");
const LOCK_PATH = QUEUE_PATH + ".lock";

// -- Async Queue Mutex (in-process, non-blocking) --

const queueMutex = new Mutex();

function acquireFileLock(maxWaitMs: number = 5000): boolean {
  const start = Date.now();
  while (existsSync(LOCK_PATH)) {
    try {
      const lockAge = Date.now() - Number(readFileSync(LOCK_PATH, "utf-8").trim());
      if (lockAge > 60_000) {
        logger.warn("Breaking stale queue lock");
        break;
      }
    } catch {
      break;
    }
    if (Date.now() - start > maxWaitMs) {
      logger.error("Failed to acquire queue file lock — timeout");
      return false;
    }
    // Brief sync wait — only hit when cross-process contention (rare)
    const end = Date.now() + 50;
    while (Date.now() < end) { /* spin */ }
  }
  writeFileSync(LOCK_PATH, String(Date.now()));
  return true;
}

function releaseFileLock(): void {
  try { unlinkSync(LOCK_PATH); } catch { /* best effort */ }
}

/** Async mutex + file lock for queue state access */
async function withLock<T>(fn: () => T): Promise<T> {
  await queueMutex.acquire();
  try {
    if (!acquireFileLock()) {
      throw new Error("Could not acquire queue file lock");
    }
    try {
      return fn();
    } finally {
      releaseFileLock();
    }
  } finally {
    queueMutex.release();
  }
}

// -- Queue State --

function loadQueue(): QueueState {
  if (existsSync(QUEUE_PATH)) {
    const raw = JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
    // Migrate from old schema (currentIndex → runningStories)
    if (!Array.isArray(raw.runningStories)) {
      raw.runningStories = [];
    }
    return raw;
  }
  return { stories: [], runningStories: [], startedAt: "", lastUpdated: "", isPaused: false };
}

function saveQueue(state: QueueState): void {
  state.lastUpdated = new Date().toISOString();
  writeFileSync(QUEUE_PATH, JSON.stringify(state, null, 2));
}

async function loadAndSave(updater: (state: QueueState) => void): Promise<QueueState> {
  return withLock(() => {
    const state = loadQueue();
    updater(state);
    saveQueue(state);
    return state;
  });
}

// -- Dependency Resolution --

/**
 * Infer sequential dependencies from story ID naming convention.
 * e.g. "a0-3" depends on "a0-2", "b1-5" depends on "b1-4".
 * Stories in different streams (a vs b vs c) have no dependencies.
 */
function inferDependencies(storyId: string): string[] {
  const match = storyId.match(/^([a-z]\d+)-(\d+)/);
  if (!match) return [];
  const [, stream, numStr] = match;
  const num = parseInt(numStr);
  if (num <= 1) return [];
  return [`${stream}-${num - 1}`];
}

function areDependenciesMet(storyId: string, stories: StoryEntry[]): boolean {
  const deps = inferDependencies(storyId);
  if (deps.length === 0) return true;

  return deps.every((depId) => {
    const dep = stories.find((s) => s.id === depId);
    // If dep doesn't exist in queue, assume it's already done
    return !dep || dep.status === "done";
  });
}

// -- Build Queue from Specs --

export function buildQueue(storyIds?: string[]): QueueState {
  // Synchronous version for initial build (called before parallel execution)
  if (!acquireFileLock()) throw new Error("Could not acquire queue file lock");
  try {
    const specsDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
    let files: string[];

    if (storyIds && storyIds.length > 0) {
      files = storyIds
        .map((id) => id.endsWith(".md") ? id : `${id}.md`)
        .filter((f) => existsSync(join(specsDir, f)));
    } else {
      // Exclude d* (orchestrator self-improvement stories)
      files = readdirSync(specsDir)
        .filter((f) => /^(a\d|b\d|c\d|v2-)/.test(f) && f.endsWith(".md"))
        .sort();
    }

    const stories: StoryEntry[] = files.map((f) => ({
      id: f.replace(".md", ""),
      specPath: `_bmad-output/implementation-artifacts/${f}`,
      status: "pending" as const,
      attempts: 0,
    }));

    const state: QueueState = {
      stories,
      runningStories: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isPaused: false,
    };

    saveQueue(state);
    return state;
  } finally {
    releaseFileLock();
  }
}

// -- Verify-Fix Loop --

export interface VerifyResult {
  passed: boolean;
  testOutput: string;
  fixAttempts: number;
}

export async function verifyAndFix(
  worktree: Worktree,
  specContent: string,
  maxAttempts: number = config.verifyFix.maxAttempts
): Promise<VerifyResult> {
  if (!config.verifyFix.enabled) {
    return { passed: true, testOutput: "verify-fix disabled", fixAttempts: 0 };
  }

  let testOutput = "";
  let qaFeedback = "";

  // Get changed files to scope test runs (avoids pre-existing failures).
  // At verify time, changes may be uncommitted, so we check both committed
  // diffs (vs base branch) and uncommitted working tree changes.
  let changedFiles: string[] = [];
  try {
    const committed = getChangedFilesInWorktree(worktree);
    let uncommitted: string[] = [];
    try {
      const raw = execFileSync("git", ["diff", "--name-only", "HEAD"], {
        cwd: worktree.path, encoding: "utf-8", timeout: 30_000,
      }).trim();
      uncommitted = raw ? raw.split("\n") : [];
    } catch { /* no uncommitted changes */ }
    changedFiles = [...new Set([...committed, ...uncommitted])];
  } catch {
    changedFiles = [];
  }
  const testableFiles = changedFiles.filter(
    (f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes("node_modules")
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. Run tests — scoped to changed files if possible, full suite as fallback
    let testPassed = false;
    try {
      if (testableFiles.length > 0) {
        // Run only tests related to changed files — avoids pre-existing failures
        testOutput = execFileSync(
          "npx", ["jest", "--findRelatedTests", ...testableFiles, "--passWithNoTests", "--forceExit"],
          {
            cwd: worktree.path,
            encoding: "utf-8",
            timeout: 120_000,
          }
        );
      } else {
        // No testable files changed (e.g. SQL migrations, docs) — skip tests
        testOutput = "No testable files changed — skipping tests";
      }
      testPassed = true;
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      testOutput = (err.stdout || "") + "\n" + (err.stderr || "");
      testPassed = false;
    }

    if (testPassed && config.verifyFix.runQACheck) {
      // 2. Run lightweight QA check
      const qaResult = await runClaude({
        prompt: `You are a QA Engineer. Verify the implementation against the acceptance criteria.

## Story Spec
${specContent.slice(0, 3000)}

## Instructions
1. Read the changed files and verify they match the spec's acceptance criteria
2. Check for common issues: missing i18n, hardcoded strings, security issues
3. If ALL acceptance criteria are met, respond with exactly: ALL_CRITERIA_MET
4. If any criteria are NOT met, list what's missing

Respond concisely.`,
        cwd: worktree.path,
        model: config.agent.models.qa,
        maxTurns: 15,
        allowedTools: ["Read", "Glob", "Grep", "Bash"],
      });

      if (qaResult.exitCode !== 0) {
        qaFeedback = `[Claude CLI exited ${qaResult.exitCode}]`;
      } else {
        qaFeedback = qaResult.output;
      }

      if (qaResult.exitCode === 0 && qaResult.output.includes("ALL_CRITERIA_MET")) {
        logger.info(`Verify passed on attempt ${attempt + 1}`, { storyId: worktree.storyId });
        return { passed: true, testOutput, fixAttempts: attempt };
      }
    } else if (testPassed) {
      logger.info(`Tests passed (QA check disabled)`, { storyId: worktree.storyId });
      return { passed: true, testOutput, fixAttempts: attempt };
    }

    // 3. If failed, invoke fix
    const fixAttempt = attempt + 1;
    logger.warn(`Verify attempt ${fixAttempt}/${maxAttempts} failed`, { storyId: worktree.storyId });
    await notify(`🔧 *${worktree.storyId}* — Tentativa ${fixAttempt}/${maxAttempts}: corrigindo falhas...`);

    if (fixAttempt >= maxAttempts) {
      break;
    }

    const fixResult = await runClaude({
      prompt: `Tests or QA verification failed. Fix the issues in this codebase.

## Test Output (last 2000 chars)
${testOutput.slice(-2000)}

## QA Feedback
${qaFeedback.slice(0, 1500)}

## Story Spec (for context)
${specContent.slice(0, 3000)}

## Instructions
1. Analyze the failures above
2. Fix the code to make tests pass and meet acceptance criteria
3. Run npx jest --findRelatedTests <changed-files> --passWithNoTests to verify your fix (do NOT run the full test suite)
4. Do NOT modify test expectations unless the test itself is wrong`,
      cwd: worktree.path,
      model: config.agent.models.dev,
      maxTurns: config.verifyFix.maxTurnsPerFix,
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    });

    if (fixResult.exitCode !== 0) {
      logger.warn(`Fix Claude failed (exit ${fixResult.exitCode}) — skipping to next attempt`);
    }
  }

  return { passed: false, testOutput, fixAttempts: maxAttempts };
}

// -- Execute Single Story --

async function executeStorySpec(entry: StoryEntry, slotId: number): Promise<boolean> {
  logger.info(`[Slot ${slotId}] Starting: ${entry.id} (attempt ${entry.attempts + 1})`);
  entry.status = "running";
  entry.startedAt = new Date().toISOString();
  entry.attempts++;
  entry.slotId = slotId;

  let worktree: Worktree | null = null;

  try {
    // 1. Create worktree (skipFetch — caller fetched once for all)
    worktree = createWorktree(entry.id, entry.id, { skipFetch: true });
    entry.branch = worktree.branch;
    entry.worktreePath = worktree.path;

    await notify(`💻 *[Slot ${slotId}] Implementando:* ${entry.id}\n_Branch: ${worktree.branch}_`);

    // 2. Read the spec
    const specContent = readFileSync(join(config.projectRoot, entry.specPath), "utf-8");

    // 3. Execute implementation in worktree
    const result = await runClaude({
      prompt: `You are a senior developer implementing a story for the Taverna do Mestre project.

## Story Spec
${specContent}

## Instructions
1. Read the spec above carefully — it contains exact files, line numbers, and code patterns
2. Read _bmad-output/project-context.md for project rules
3. Implement EVERY task in the spec's task list
4. Write tests for new code where applicable
5. Run npm test -- --passWithNoTests to verify nothing breaks
6. Report what you implemented and which files changed

## Critical Rules
- Follow existing code patterns
- All UI strings in messages/pt-BR.json and messages/en.json
- Never hardcode text in components
- Sanitize broadcast data (anti-metagaming)
- Use snake_case for data fields
- Error pattern: try/catch → toast.error() + Sentry.captureException()`,
      maxTurns: config.agent.maxTurnsPerStory,
      model: config.agent.models.dev,
      timeoutMs: 40 * 60 * 1000,
      cwd: worktree.path,
    });

    // 3b. Bail on CLI failure — let outer retry handle it
    if (result.exitCode !== 0) {
      if (result.isRateLimited) {
        throw new Error(`RATE_LIMITED: ${result.output.slice(-200)}`);
      }
      throw new Error(`Claude CLI exited with code ${result.exitCode}: ${result.output.slice(-500)}`);
    }

    // 4. Verify-Fix Loop
    const verification = await verifyAndFix(worktree, specContent);
    entry.verifyAttempts = verification.fixAttempts;
    entry.verifyPassed = verification.passed;

    if (!verification.passed) {
      logger.warn(`Story ${entry.id} failed verification after ${verification.fixAttempts} attempts`);
      await notify(`⚠️ *${entry.id}* — Verificação falhou após ${verification.fixAttempts} tentativas. Commitando com flag de review.`);
    }

    // 5. Commit in worktree
    const filesChanged = getChangedFilesInWorktree(worktree).length;
    const verifyTag = verification.passed ? "" : " [NEEDS-REVIEW]";
    const commitHash = commitInWorktree(worktree, `feat(${entry.id}): implement story${verifyTag}`);
    entry.commitHash = commitHash;

    if (commitHash === "no-changes") {
      logger.info(`No changes for ${entry.id}`);
      entry.status = "done";
      entry.finishedAt = new Date().toISOString();
      await notify(`⚠️ *${entry.id}* — Nenhuma mudança detectada. Pulando.`);
      removeWorktree(worktree);
      return true;
    }

    // 6. Push (serialized via git mutex) — skip PR if push fails
    let pushOk = false;
    try {
      await withGitMutex(() => pushWorktree(worktree!));
      pushOk = true;
    } catch (e) {
      logger.warn(`Push failed for ${entry.id} — PR will be skipped`, { error: String(e) });
      await notify(`⚠️ *${entry.id}* — Push falhou. Commit local preservado na branch ${entry.branch}.`);
    }

    // 7. Create PR only if push succeeded (serialized via git mutex)
    if (pushOk) {
      const verifyStatus = verification.passed ? "✅ Verificação passou" : "⚠️ NEEDS REVIEW — verificação falhou";
      await withGitMutex(() => createPRFromWorktree(
        worktree!,
        `feat(${entry.id}): implement story`,
        `## Story ${entry.id}\n\n${result.output.slice(0, 500)}\n\n### Verificação\n${verifyStatus}\n- Fix attempts: ${verification.fixAttempts}\n\n🤖 Generated by BMAD Orchestrator`
      ));
    }

    entry.status = "done";
    entry.finishedAt = new Date().toISOString();

    logger.info(`[Slot ${slotId}] Done: ${entry.id} — commit ${commitHash}`);
    await notifyComplete({
      task: entry.id,
      duration: getDuration(entry.startedAt!, entry.finishedAt),
      filesChanged,
      testsStatus: verification.passed ? "Passed" : "Failed (committed for review)",
    });

    // 8. Cleanup worktree
    if (config.worktree.cleanupOnSuccess) {
      removeWorktree(worktree);
    }

    return true;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    entry.error = err.message;
    entry.finishedAt = new Date().toISOString();

    // Cleanup worktree on failure
    if (worktree) {
      try { removeWorktree(worktree); } catch (e) {
        logger.error("Worktree cleanup failed after story failure", { error: String(e) });
      }
    }

    const isRateLimit = err.message.startsWith("RATE_LIMITED");

    if (entry.attempts < 3) {
      // Rate limit gets longer backoff
      const backoffMs = isRateLimit
        ? config.worktree.rateLimitBackoffMs * Math.pow(2, entry.attempts - 1)
        : 10_000 * Math.pow(3, entry.attempts - 1);
      const reason = isRateLimit ? "rate limited" : err.message.slice(0, 200);
      logger.warn(`[Slot ${slotId}] Failed: ${entry.id} — ${reason}. Retrying in ${backoffMs / 1000}s.`);
      entry.status = "pending";
      await notify(`⚠️ *[Slot ${slotId}] ${entry.id}* falhou (tentativa ${entry.attempts}/3): ${reason}\n_Retentando em ${backoffMs / 1000}s..._`);

      await new Promise((r) => setTimeout(r, backoffMs));
      return false;
    } else {
      logger.error(`[Slot ${slotId}] Failed permanently: ${entry.id} — ${err.message}`);
      entry.status = "failed";
      await notifyError({
        task: entry.id,
        message: err.message.slice(0, 300),
        recoverable: false,
      });
      return false;
    }
  }
}

// -- Main Queue Runner (Parallel) --

export async function runQueue(): Promise<void> {
  let state = await withLock(() => {
    const s = loadQueue();
    if (s.stories.length === 0) {
      return buildQueue();
    }
    return s;
  });

  const total = state.stories.length;
  const pending = state.stories.filter((s) => s.status === "pending").length;
  const done = state.stories.filter((s) => s.status === "done").length;
  const maxC = config.worktree.maxConcurrent;

  logger.info(`Queue: ${total} stories, ${done} done, ${pending} pending, maxConcurrent=${maxC}`);
  await notify(`🚀 *Story Queue iniciando!*\n*Total:* ${total} stories\n*Feitas:* ${done}\n*Pendentes:* ${pending}\n*Concurrency:* ${maxC} slots\n_Processando em paralelo..._`);

  // Fetch once for all worktrees
  try {
    execFileSync("git", ["fetch", "origin", config.git.baseBranch], {
      cwd: config.projectRoot,
      encoding: "utf-8",
      timeout: 60_000,
    });
  } catch {
    logger.warn("Pre-fetch failed (offline?), continuing with local state");
  }

  const semaphore = new Semaphore(maxC);
  const promises: Promise<void>[] = [];

  for (const story of state.stories) {
    if (story.status === "done" || story.status === "skipped") continue;
    if (story.status === "failed" && story.attempts >= 3) continue;

    const storyId = story.id;

    const storyPromise = semaphore.run(async () => {
      // Re-check pause state
      const current = await withLock(() => loadQueue());
      if (current.isPaused) {
        logger.info(`Queue paused — skipping ${storyId}`);
        return;
      }

      // Re-check story status (may have changed by another slot)
      const freshEntry = current.stories.find((s) => s.id === storyId);
      if (!freshEntry || freshEntry.status === "done" || freshEntry.status === "skipped") return;
      if (freshEntry.status === "failed" && freshEntry.attempts >= 3) return;

      // Check dependencies — poll until met (max 90 min for long stories)
      if (!areDependenciesMet(storyId, current.stories)) {
        logger.info(`${storyId} waiting on dependencies`);
        for (let waitRound = 0; waitRound < 180; waitRound++) { // 180 * 30s = 90 min
          await new Promise((r) => setTimeout(r, 30_000));
          const updated = await withLock(() => loadQueue());
          if (updated.isPaused) return;
          if (areDependenciesMet(storyId, updated.stories)) break;
          // If this story was externally marked done/failed, bail
          const self = updated.stories.find((s) => s.id === storyId);
          if (self?.status === "done" || self?.status === "failed" || self?.status === "skipped") return;
        }
        const final = await withLock(() => loadQueue());
        if (!areDependenciesMet(storyId, final.stories)) {
          logger.warn(`${storyId} deps never met after 90min — skipping`);
          await loadAndSave((s) => {
            const e = s.stories.find((x) => x.id === storyId);
            if (e) { e.status = "skipped"; e.error = "Dependencies not met after 90min timeout"; }
          });
          return;
        }
      }

      // Assign slot atomically inside the lock
      let slot = 1;
      await loadAndSave((s) => {
        const maxSlot = Math.max(0, ...s.stories.filter((e) => e.status === "running").map((e) => e.slotId || 0));
        slot = maxSlot + 1;
        const entry = s.stories.find((e) => e.id === storyId);
        if (entry) entry.slotId = slot;
        s.runningStories.push(storyId);
      });

      // Retry loop — always read fresh state from disk, never use stale objects
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Load fresh entry from queue state every attempt
          const entry = (await withLock(() => loadQueue())).stories.find((s) => s.id === storyId)!;
          if (entry.status === "done" || entry.status === "failed") break;

          const success = await executeStorySpec(entry, slot);

          // Persist the modified entry back to queue state
          await loadAndSave((s) => {
            const idx = s.stories.findIndex((e) => e.id === storyId);
            if (idx >= 0) Object.assign(s.stories[idx], entry);
          });

          if (success || entry.status !== "pending") break;
          // If status is "pending", executeStorySpec already did backoff — loop again
        } catch (e) {
          logger.error(`[Slot ${slot}] Unhandled error in story ${storyId} attempt ${attempt + 1}`, { error: String(e) });
          if (attempt >= MAX_RETRIES - 1) {
            await loadAndSave((s) => {
              const entry = s.stories.find((e) => e.id === storyId);
              if (entry) { entry.status = "failed"; entry.error = String(e); }
            });
          }
        }
      }

      // Always remove from runningStories when done
      await loadAndSave((s) => {
        s.runningStories = s.runningStories.filter((id) => id !== storyId);
      });
    });

    promises.push(storyPromise);
  }

  // Wait for all stories (semaphore limits actual concurrency)
  await Promise.allSettled(promises);

  // Final summary
  state = await withLock(() => loadQueue());
  const finalDone = state.stories.filter((s) => s.status === "done").length;
  const finalFailed = state.stories.filter((s) => s.status === "failed").length;
  const finalSkipped = state.stories.filter((s) => s.status === "skipped").length;

  logger.info(`Queue complete: ${finalDone} done, ${finalFailed} failed, ${finalSkipped} skipped`);
  await notify(`🏁 *Queue completa!*\n✅ *Done:* ${finalDone}/${total}\n❌ *Failed:* ${finalFailed}\n⏭️ *Skipped:* ${finalSkipped}\n\nVeja o log em: scripts/orchestrator/logs/`);
}

// -- Helpers --

function getDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

// -- External Controls --

export function pauseQueue(): void {
  // Sync version for external callers (slack commands)
  if (!acquireFileLock()) return;
  try {
    const state = loadQueue();
    state.isPaused = true;
    saveQueue(state);
  } finally {
    releaseFileLock();
  }
}

export function resumeQueue(): void {
  if (!acquireFileLock()) return;
  try {
    const state = loadQueue();
    state.isPaused = false;
    saveQueue(state);
  } finally {
    releaseFileLock();
  }
}

export function getQueueStatus(): string {
  if (!acquireFileLock()) return "Could not read queue state.";
  try {
    const state = loadQueue();
    if (state.stories.length === 0) return "Queue vazia.";

    const done = state.stories.filter((s) => s.status === "done").length;
    const failed = state.stories.filter((s) => s.status === "failed").length;
    const pending = state.stories.filter((s) => s.status === "pending").length;
    const running = state.stories.filter((s) => s.status === "running");
    const runningList = running
      .map((s) => `  • ${s.id}${s.slotId ? ` [Slot ${s.slotId}]` : ""}`)
      .join("\n");

    return `📊 *Queue Status*
*Total:* ${state.stories.length}
✅ Done: ${done}
💻 Running: ${running.length}/${config.worktree.maxConcurrent}
${runningList || "  (nenhuma)"}
⏳ Pending: ${pending}
❌ Failed: ${failed}
${state.isPaused ? "⏸️ PAUSADA" : "▶️ Rodando"}
_Iniciada: ${state.startedAt}_`;
  } finally {
    releaseFileLock();
  }
}
