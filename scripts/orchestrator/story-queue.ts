/**
 * BMAD Orchestrator — Story Queue
 *
 * Processes story specs one by one, autonomously.
 * Designed to run for 28+ hours unattended.
 *
 * Features:
 * - Persistent queue state (survives restarts)
 * - File locking (prevents concurrent state corruption)
 * - Retry with exponential backoff (max 3 retries per story)
 * - Per-story git branches + commits
 * - Slack notifications at each step
 * - Structured logging for full history
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";
import { config } from "./config.js";
import { runClaude } from "./claude-runner.js";
import { notify, notifyComplete, notifyError } from "./slack.js";
import { logger } from "./logger.js";
import * as git from "./git.js";
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
}

interface QueueState {
  stories: StoryEntry[];
  currentIndex: number;
  startedAt: string;
  lastUpdated: string;
  isPaused: boolean;
}

// -- Paths --

const QUEUE_PATH = join(config.projectRoot, "scripts/orchestrator/.queue-state.json");
const LOCK_PATH = QUEUE_PATH + ".lock";

// -- File Locking (simple atomic approach) --

function acquireLock(maxWaitMs: number = 5000): boolean {
  const start = Date.now();
  while (existsSync(LOCK_PATH)) {
    // Check for stale lock (> 60s)
    try {
      const lockAge = Date.now() - Number(readFileSync(LOCK_PATH, "utf-8").trim());
      if (lockAge > 60_000) {
        logger.warn("Breaking stale queue lock");
        break;
      }
    } catch {
      break; // Lock file corrupt, break it
    }

    if (Date.now() - start > maxWaitMs) {
      logger.error("Failed to acquire queue lock — timeout");
      return false;
    }

    // Spin wait 50ms
    const end = Date.now() + 50;
    while (Date.now() < end) { /* spin */ }
  }

  writeFileSync(LOCK_PATH, String(Date.now()));
  return true;
}

function releaseLock(): void {
  try {
    const { unlinkSync } = require("fs");
    unlinkSync(LOCK_PATH);
  } catch { /* best effort */ }
}

function withLock<T>(fn: () => T): T {
  if (!acquireLock()) {
    throw new Error("Could not acquire queue lock");
  }
  try {
    return fn();
  } finally {
    releaseLock();
  }
}

// -- Queue State --

function loadQueue(): QueueState {
  if (existsSync(QUEUE_PATH)) {
    return JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
  }
  return { stories: [], currentIndex: 0, startedAt: "", lastUpdated: "", isPaused: false };
}

function saveQueue(state: QueueState): void {
  state.lastUpdated = new Date().toISOString();
  writeFileSync(QUEUE_PATH, JSON.stringify(state, null, 2));
}

function loadAndSave(updater: (state: QueueState) => void): QueueState {
  return withLock(() => {
    const state = loadQueue();
    updater(state);
    saveQueue(state);
    return state;
  });
}

// -- Build Queue from Specs --

export function buildQueue(): QueueState {
  return withLock(() => {
    const specsDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
    const files = readdirSync(specsDir)
      .filter((f) => f.startsWith("v2-") && f.endsWith(".md"))
      .sort();

    const stories: StoryEntry[] = files.map((f) => ({
      id: f.replace(".md", ""),
      specPath: `_bmad-output/implementation-artifacts/${f}`,
      status: "pending" as const,
      attempts: 0,
    }));

    const state: QueueState = {
      stories,
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isPaused: false,
    };

    saveQueue(state);
    return state;
  });
}

// -- Verify-Fix Loop --

export interface VerifyResult {
  passed: boolean;
  testOutput: string;
  fixAttempts: number;
}

/**
 * Run tests and optionally QA in a worktree, fixing failures up to maxAttempts times.
 */
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

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. Run tests
    let testPassed = false;
    try {
      testOutput = execFileSync("npm", ["test", "--", "--passWithNoTests"], {
        cwd: worktree.path,
        encoding: "utf-8",
        timeout: 120_000,
      });
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

      qaFeedback = qaResult.output;

      if (qaResult.output.includes("ALL_CRITERIA_MET")) {
        logger.info(`Verify passed on attempt ${attempt + 1}`, { storyId: worktree.storyId });
        return { passed: true, testOutput, fixAttempts: attempt };
      }
    } else if (testPassed) {
      // Tests pass and QA check disabled
      logger.info(`Tests passed (QA check disabled)`, { storyId: worktree.storyId });
      return { passed: true, testOutput, fixAttempts: attempt };
    }

    // 3. If failed, invoke fix
    const fixAttempt = attempt + 1;
    logger.warn(`Verify attempt ${fixAttempt}/${maxAttempts} failed`, { storyId: worktree.storyId });
    await notify(`🔧 *${worktree.storyId}* — Tentativa ${fixAttempt}/${maxAttempts}: corrigindo falhas...`);

    if (fixAttempt >= maxAttempts) {
      break; // Don't run fix on the last attempt — we've exhausted retries
    }

    await runClaude({
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
3. Run npm test -- --passWithNoTests to verify your fix
4. Do NOT modify test expectations unless the test itself is wrong`,
      cwd: worktree.path,
      model: config.agent.models.dev,
      maxTurns: config.verifyFix.maxTurnsPerFix,
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    });
  }

  return { passed: false, testOutput, fixAttempts: maxAttempts };
}

// -- Execute Single Story --

async function executeStorySpec(entry: StoryEntry): Promise<boolean> {
  logger.info(`Starting: ${entry.id} (attempt ${entry.attempts + 1})`);
  entry.status = "running";
  entry.startedAt = new Date().toISOString();
  entry.attempts++;

  let worktree: Worktree | null = null;

  try {
    // 1. Create worktree (isolated directory — main repo stays on base branch)
    worktree = createWorktree(entry.id, entry.id);
    entry.branch = worktree.branch;
    entry.worktreePath = worktree.path;

    await notify(`💻 *Implementando:* ${entry.id}\n_Branch: ${worktree.branch}_\n_Worktree: ${worktree.path}_`);

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

    // 6. Push
    try {
      pushWorktree(worktree);
    } catch (e) {
      logger.warn(`Push failed for ${entry.id}, continuing`, { error: String(e) });
    }

    // 7. Create PR
    const verifyStatus = verification.passed ? "✅ Verificação passou" : "⚠️ NEEDS REVIEW — verificação falhou";
    const pr = createPRFromWorktree(
      worktree,
      `feat(${entry.id}): implement story`,
      `## Story ${entry.id}\n\n${result.output.slice(0, 500)}\n\n### Verificação\n${verifyStatus}\n- Fix attempts: ${verification.fixAttempts}\n\n🤖 Generated by BMAD Orchestrator`
    );

    entry.status = "done";
    entry.finishedAt = new Date().toISOString();

    logger.info(`Done: ${entry.id} — commit ${commitHash}`);
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

    if (entry.attempts < 3) {
      // Exponential backoff: 10s, 30s, 90s
      const backoffMs = 10_000 * Math.pow(3, entry.attempts - 1);
      logger.warn(`Failed: ${entry.id} — ${err.message}. Retrying in ${backoffMs / 1000}s.`);
      entry.status = "pending";
      await notify(`⚠️ *${entry.id}* falhou (tentativa ${entry.attempts}/3): ${err.message.slice(0, 200)}\n_Retentando em ${backoffMs / 1000}s..._`);

      await new Promise((r) => setTimeout(r, backoffMs));
      return false;
    } else {
      logger.error(`Failed permanently: ${entry.id} — ${err.message}`);
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

// -- Main Queue Runner --

export async function runQueue(): Promise<void> {
  let state = withLock(() => {
    const s = loadQueue();
    if (s.stories.length === 0) {
      return buildQueue();
    }
    return s;
  });

  const total = state.stories.length;
  const pending = state.stories.filter((s) => s.status === "pending").length;
  const done = state.stories.filter((s) => s.status === "done").length;

  logger.info(`Queue: ${total} stories, ${done} done, ${pending} pending`);
  await notify(`🚀 *Story Queue iniciando!*\n*Total:* ${total} stories\n*Feitas:* ${done}\n*Pendentes:* ${pending}\n_Processando uma a uma..._`);

  for (let i = 0; i < state.stories.length; i++) {
    // Reload state (may have been paused externally)
    state = withLock(() => loadQueue());

    if (state.isPaused) {
      logger.info("Queue paused. Stopping.");
      await notify("⏸️ Queue pausada. Mande 'retomar queue' para continuar.");
      return;
    }

    const story = state.stories[i];

    if (story.status === "done" || story.status === "skipped") continue;
    if (story.status === "failed" && story.attempts >= 3) continue;

    loadAndSave((s) => { s.currentIndex = i; });

    const success = await executeStorySpec(story);
    loadAndSave((s) => { s.stories[i] = story; });

    // Progress update every 3 stories
    if ((i + 1) % 3 === 0) {
      const doneNow = state.stories.filter((s) => s.status === "done").length;
      const failedNow = state.stories.filter((s) => s.status === "failed").length;
      await notify(`📊 *Progresso:* ${doneNow}/${total} done, ${failedNow} failed`);
    }
  }

  // Final summary
  state = withLock(() => loadQueue());
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
  loadAndSave((s) => { s.isPaused = true; });
}

export function resumeQueue(): void {
  loadAndSave((s) => { s.isPaused = false; });
}

export function getQueueStatus(): string {
  const state = withLock(() => loadQueue());
  if (state.stories.length === 0) return "Queue vazia.";

  const done = state.stories.filter((s) => s.status === "done").length;
  const failed = state.stories.filter((s) => s.status === "failed").length;
  const pending = state.stories.filter((s) => s.status === "pending").length;
  const running = state.stories.filter((s) => s.status === "running").length;
  const current = state.stories[state.currentIndex];

  return `📊 *Queue Status*
*Total:* ${state.stories.length}
✅ Done: ${done}
💻 Running: ${running}${current ? ` (${current.id})` : ""}
⏳ Pending: ${pending}
❌ Failed: ${failed}
${state.isPaused ? "⏸️ PAUSADA" : "▶️ Rodando"}
_Iniciada: ${state.startedAt}_`;
}
