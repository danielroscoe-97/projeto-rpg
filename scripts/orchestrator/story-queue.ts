/**
 * BMAD Orchestrator — Story Queue (Parallel) v3
 *
 * Features:
 * - Parallel execution via semaphore (maxConcurrent slots)
 * - Dependency-aware scheduling (a0-1 before a0-2, but a0-1 || b1-1)
 * - Persistent queue state (survives restarts)
 * - Atomic writes (rename-based, prevents corruption on crash)
 * - Retry with exponential backoff + contextual error (max 3 retries)
 * - Rate limit detection + dedicated backoff
 * - Crash recovery: detects stale "running" entries on startup
 * - CI feedback loop: monitors PR checks and auto-fixes failures
 * - Session state machine: spawning > working > verifying > pr_open > done
 * - Agent heartbeat: detects stuck processes via last-activity timestamp
 * - Slack notifications with slot identification
 *
 * Inspired by ComposioHQ/agent-orchestrator patterns.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";
import { config } from "./config.js";
import { runClaude } from "./claude-runner.js";
import { notify, notifyComplete, notifyError } from "./slack.js";
import { logger } from "./logger.js";
import { Semaphore, Mutex } from "./semaphore.js";
import { withGitMutex } from "./git-mutex.js";
import {
  createWorktree, removeWorktree, commitInWorktree, pushWorktree,
  createPRFromWorktree, getChangedFilesInWorktree, type Worktree,
} from "./worktree.js";

// -- Types --

export type SessionStatus =
  | "pending" | "spawning" | "working" | "verifying"
  | "pr_open" | "ci_failed" | "done" | "failed" | "skipped" | "stuck";

export interface StoryEntry {
  id: string;
  specPath: string;
  status: SessionStatus;
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  lastError?: string;
  branch?: string;
  commitHash?: string;
  worktreePath?: string;
  verifyAttempts?: number;
  verifyPassed?: boolean;
  slotId?: number;
  prNumber?: number;
  prUrl?: string;
  lastActivityAt?: string;
  ciFixAttempts?: number;
}

export interface QueueState {
  version: 3;
  stories: StoryEntry[];
  runningStories: string[];
  startedAt: string;
  lastUpdated: string;
  isPaused: boolean;
  metrics: QueueMetrics;
}

interface QueueMetrics {
  totalDurationMs: number;
  storiesCompleted: number;
  storiesFailed: number;
  totalRetries: number;
  totalCIFixes: number;
  avgStoryDurationMs: number;
}

// -- Paths --
const QUEUE_PATH = join(config.projectRoot, "scripts/orchestrator/.queue-state.json");
const LOCK_PATH = QUEUE_PATH + ".lock";

// -- Async Queue Mutex --
const queueMutex = new Mutex();

function acquireFileLock(maxWaitMs: number = 5000): boolean {
  const start = Date.now();
  while (existsSync(LOCK_PATH)) {
    try {
      const lockAge = Date.now() - Number(readFileSync(LOCK_PATH, "utf-8").trim());
      if (lockAge > 60_000) { logger.warn("Breaking stale queue lock"); break; }
    } catch { break; }
    if (Date.now() - start > maxWaitMs) { logger.error("Failed to acquire queue file lock"); return false; }
    const end = Date.now() + 50;
    while (Date.now() < end) { /* spin */ }
  }
  writeFileSync(LOCK_PATH, String(Date.now()));
  return true;
}

function releaseFileLock(): void { try { unlinkSync(LOCK_PATH); } catch { /* best effort */ } }

async function withLock<T>(fn: () => T): Promise<T> {
  await queueMutex.acquire();
  try {
    if (!acquireFileLock()) throw new Error("Could not acquire queue file lock");
    try { return fn(); } finally { releaseFileLock(); }
  } finally { queueMutex.release(); }
}

// -- Atomic Write (prevents corruption on crash) --
function atomicWriteJSON(filePath: string, data: unknown): void {
  const tmp = filePath + ".tmp";
  const json = JSON.stringify(data, null, 2);
  writeFileSync(tmp, json);
  // renameSync can fail on Windows if target is locked — retry once
  try {
    renameSync(tmp, filePath);
  } catch {
    // Fallback: write directly (less safe but better than losing data)
    writeFileSync(filePath, json);
    try { unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// -- Queue State --
const EMPTY_METRICS: QueueMetrics = { totalDurationMs: 0, storiesCompleted: 0, storiesFailed: 0, totalRetries: 0, totalCIFixes: 0, avgStoryDurationMs: 0 };

function loadQueue(): QueueState {
  if (existsSync(QUEUE_PATH)) {
    const raw = JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
    if (!Array.isArray(raw.runningStories)) raw.runningStories = [];
    if (!raw.version) raw.version = 3;
    if (!raw.metrics) raw.metrics = { ...EMPTY_METRICS };
    return raw;
  }
  return { version: 3, stories: [], runningStories: [], startedAt: "", lastUpdated: "", isPaused: false, metrics: { ...EMPTY_METRICS } };
}

function saveQueue(state: QueueState): void {
  state.lastUpdated = new Date().toISOString();
  atomicWriteJSON(QUEUE_PATH, state);
}

async function loadAndSave(updater: (state: QueueState) => void): Promise<QueueState> {
  return withLock(() => { const state = loadQueue(); updater(state); saveQueue(state); return state; });
}

// -- Crash Recovery --
export async function recoverCrashedEntries(): Promise<number> {
  let recovered = 0;
  await loadAndSave((state) => {
    for (const story of state.stories) {
      if (story.status === "spawning" || story.status === "working" || story.status === "verifying") {
        logger.warn(`Recovering crashed story: ${story.id} (was ${story.status})`);
        story.lastError = `Crashed in "${story.status}" — recovered on restart`;
        story.status = "pending";
        recovered++;
      }
    }
    state.runningStories = [];
  });
  if (recovered > 0) {
    logger.info(`Recovered ${recovered} crashed stories`);
    await notify(`🔄 *Crash recovery:* ${recovered} stories resetadas.`);
  }
  return recovered;
}

// -- Dependency Resolution --
function inferDependencies(storyId: string): string[] {
  const match = storyId.match(/^([a-z]\d+)-(\d+)/);
  if (!match) return [];
  const [, stream, numStr] = match;
  const num = parseInt(numStr, 10);
  if (num <= 1) return [];
  return [`${stream}-${num - 1}`];
}

function areDependenciesMet(storyId: string, stories: StoryEntry[]): boolean {
  const deps = inferDependencies(storyId);
  if (deps.length === 0) return true;
  return deps.every((depId) => { const dep = stories.find((s) => s.id === depId); return !dep || dep.status === "done"; });
}

// -- Build Queue --
export function buildQueue(storyIds?: string[]): QueueState {
  if (!acquireFileLock()) throw new Error("Could not acquire queue file lock");
  try {
    const specsDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
    let files: string[];
    if (storyIds && storyIds.length > 0) {
      files = storyIds.map((id) => id.endsWith(".md") ? id : `${id}.md`).filter((f) => existsSync(join(specsDir, f)));
    } else {
      files = readdirSync(specsDir).filter((f) => /^(a\d|b\d|c\d|v2-)/.test(f) && f.endsWith(".md")).sort();
    }
    const stories: StoryEntry[] = files.map((f) => ({ id: f.replace(".md", ""), specPath: `_bmad-output/implementation-artifacts/${f}`, status: "pending" as const, attempts: 0 }));
    const state: QueueState = { version: 3, stories, runningStories: [], startedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), isPaused: false, metrics: { ...EMPTY_METRICS } };
    saveQueue(state);
    return state;
  } finally { releaseFileLock(); }
}

// -- Changed Files --
function getAllChangedFiles(worktree: Worktree): string[] {
  try {
    const committed = getChangedFilesInWorktree(worktree);
    let uncommitted: string[] = [];
    try { const raw = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: worktree.path, encoding: "utf-8", timeout: 30_000 }).trim(); uncommitted = raw ? raw.split("\n") : []; } catch { /* ignore */ }
    let untracked: string[] = [];
    try { const raw = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: worktree.path, encoding: "utf-8", timeout: 30_000 }).trim(); untracked = raw ? raw.split("\n") : []; } catch { /* ignore */ }
    return [...new Set([...committed, ...uncommitted, ...untracked])];
  } catch { return []; }
}

function getTestableFiles(changedFiles: string[]): string[] {
  return changedFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes("node_modules"));
}

// -- Verify-Fix Loop --
export interface VerifyResult { passed: boolean; testOutput: string; fixAttempts: number; }

export async function verifyAndFix(worktree: Worktree, specContent: string, maxAttempts: number = config.verifyFix.maxAttempts): Promise<VerifyResult> {
  if (!config.verifyFix.enabled) return { passed: true, testOutput: "verify-fix disabled", fixAttempts: 0 };
  let testOutput = "";
  let qaFeedback = "";
  const changedFiles = getAllChangedFiles(worktree);
  const testableFiles = getTestableFiles(changedFiles);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let testPassed = false;
    try {
      if (testableFiles.length > 0) {
        testOutput = execFileSync("npx", ["jest", "--findRelatedTests", ...testableFiles, "--passWithNoTests", "--forceExit"], { cwd: worktree.path, encoding: "utf-8", timeout: 120_000 });
      } else { testOutput = "No testable files changed — skipping tests"; }
      testPassed = true;
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      testOutput = (err.stdout || "") + "\n" + (err.stderr || "");
    }

    if (testPassed && config.verifyFix.runQACheck) {
      const qaResult = await runClaude({
        prompt: `You are a QA Engineer. Verify the implementation against the acceptance criteria.\n\n## Story Spec\n${specContent.slice(0, 3000)}\n\n## Changed Files\n${changedFiles.join("\n")}\n\n## Instructions\n1. Read the changed files and verify they match the spec's acceptance criteria\n2. Check for common issues: missing i18n, hardcoded strings, security issues\n3. If ALL acceptance criteria are met, respond with exactly: ALL_CRITERIA_MET\n4. If any criteria are NOT met, list what's missing\n\nRespond concisely.`,
        cwd: worktree.path, model: config.agent.models.qa, maxTurns: 15, allowedTools: ["Read", "Glob", "Grep", "Bash"],
      });
      qaFeedback = qaResult.exitCode !== 0 ? `[Claude CLI exited ${qaResult.exitCode}]` : qaResult.output;
      if (qaResult.exitCode === 0 && qaResult.output.includes("ALL_CRITERIA_MET")) {
        logger.info(`Verify passed on attempt ${attempt + 1}`, { storyId: worktree.storyId });
        return { passed: true, testOutput, fixAttempts: attempt };
      }
    } else if (testPassed) {
      logger.info("Tests passed (QA check disabled)", { storyId: worktree.storyId });
      return { passed: true, testOutput, fixAttempts: attempt };
    }

    const fixAttempt = attempt + 1;
    logger.warn(`Verify attempt ${fixAttempt}/${maxAttempts} failed`, { storyId: worktree.storyId });
    await notify(`🔧 *${worktree.storyId}* — Tentativa ${fixAttempt}/${maxAttempts}: corrigindo falhas...`);
    if (fixAttempt >= maxAttempts) break;

    const testCmd = testableFiles.length > 0 ? `npx jest --findRelatedTests ${testableFiles.join(" ")} --passWithNoTests --forceExit` : "echo 'No testable files'";
    const fixResult = await runClaude({
      prompt: `Tests or QA verification failed. Fix the issues.\n\n## Test Output (last 2000 chars)\n${testOutput.slice(-2000)}\n\n## QA Feedback\n${qaFeedback.slice(0, 1500)}\n\n## Story Spec\n${specContent.slice(0, 3000)}\n\n## Changed Files\n${changedFiles.join("\n")}\n\n## Exact Test Command\n${testCmd}\n\n## Instructions\n1. Analyze failures\n2. Fix code — scope to files listed\n3. Run: ${testCmd}\n4. Do NOT modify test expectations unless the test itself is wrong`,
      cwd: worktree.path, model: config.agent.models.dev, maxTurns: config.verifyFix.maxTurnsPerFix, allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    });
    if (fixResult.exitCode !== 0) logger.warn(`Fix Claude failed (exit ${fixResult.exitCode})`);
  }
  return { passed: false, testOutput, fixAttempts: maxAttempts };
}

// -- CI Feedback Loop (Composio AO reaction pattern) --
async function monitorAndFixCI(worktree: Worktree, prNumber: number, specContent: string, maxCIFixes: number = 2): Promise<{ fixed: boolean; attempts: number }> {
  for (let attempt = 0; attempt < maxCIFixes; attempt++) {
    let ciStatus: "success" | "failure" | "pending" | "unknown" = "pending";
    let ciLogs = "";
    for (let poll = 0; poll < 20; poll++) {
      await new Promise((r) => setTimeout(r, 30_000));
      try {
        const result = execFileSync("gh", ["pr", "checks", String(prNumber), "--json", "name,state,conclusion"], { cwd: worktree.path, encoding: "utf-8", timeout: 30_000 }).trim();
        const checks = JSON.parse(result || "[]") as Array<{ name: string; state: string; conclusion: string }>;
        if (checks.length === 0) { ciStatus = "unknown"; break; }
        if (!checks.every((c) => c.state === "COMPLETED")) continue;
        ciStatus = checks.some((c) => c.conclusion === "FAILURE" || c.conclusion === "TIMED_OUT") ? "failure" : "success";
        if (ciStatus === "failure") {
          try { ciLogs = execFileSync("gh", ["run", "view", "--log-failed", "--json", "jobs"], { cwd: worktree.path, encoding: "utf-8", timeout: 60_000 }).trim().slice(-3000); } catch { ciLogs = `CI checks failed: ${checks.filter((c) => c.conclusion === "FAILURE").map((c) => c.name).join(", ")}`; }
        }
        break;
      } catch { ciStatus = "unknown"; break; }
    }
    if (ciStatus === "success") return { fixed: true, attempts: attempt };
    if (ciStatus === "unknown") return { fixed: false, attempts: 0 }; // No CI configured
    logger.warn(`CI failed for PR #${prNumber} — auto-fixing (attempt ${attempt + 1}/${maxCIFixes})`);
    await notify(`🔴 *CI failed* PR #${prNumber} — Auto-fixing (tentativa ${attempt + 1}/${maxCIFixes})...`);
    const changedFiles = getAllChangedFiles(worktree);
    const testableFiles = getTestableFiles(changedFiles);
    const testCmd = testableFiles.length > 0 ? `npx jest --findRelatedTests ${testableFiles.join(" ")} --passWithNoTests --forceExit` : "npx jest --passWithNoTests --forceExit";
    await runClaude({
      prompt: `CI checks failed on the PR. Fix the issues.\n\n## CI Failure Logs\n${ciLogs}\n\n## Changed Files\n${changedFiles.join("\n")}\n\n## Instructions\n1. Analyze CI failure logs\n2. Fix code\n3. Run locally: ${testCmd}\n4. Stage and commit: git add -A && git commit -m "fix: resolve CI failure"\n5. Push: git push`,
      cwd: worktree.path, model: config.agent.models.dev, maxTurns: 20, allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    });
  }
  return { fixed: false, attempts: maxCIFixes };
}

// -- Heartbeat / Stuck Detection --
const STUCK_THRESHOLD_MS = 30 * 60 * 1000;
function updateHeartbeat(entry: StoryEntry): void { entry.lastActivityAt = new Date().toISOString(); }
function isStuck(entry: StoryEntry): boolean {
  if (!entry.lastActivityAt || (entry.status !== "working" && entry.status !== "verifying")) return false;
  return Date.now() - new Date(entry.lastActivityAt).getTime() > STUCK_THRESHOLD_MS;
}

let stuckDetectorInterval: ReturnType<typeof setInterval> | null = null;
function startStuckDetector(): void {
  if (stuckDetectorInterval) return;
  stuckDetectorInterval = setInterval(async () => {
    try {
      const stuckIds: string[] = [];
      await loadAndSave((state) => {
        for (const story of state.stories) {
          if (isStuck(story)) {
            story.status = "stuck";
            story.lastError = `Stuck: no activity for ${STUCK_THRESHOLD_MS / 60_000}min`;
            stuckIds.push(story.id);
          }
        }
      });
      for (const id of stuckIds) {
        logger.warn(`Story ${id} appears stuck`);
        await notify(`⚠️ *${id}* parece travada — sem atividade por ${STUCK_THRESHOLD_MS / 60_000}min.`);
      }
    } catch (e) { logger.error("Stuck detector error", { error: String(e) }); }
  }, 5 * 60_000);
}
function stopStuckDetector(): void { if (stuckDetectorInterval) { clearInterval(stuckDetectorInterval); stuckDetectorInterval = null; } }

// -- Execute Single Story --
async function executeStorySpec(entry: StoryEntry, slotId: number): Promise<boolean> {
  logger.info(`[Slot ${slotId}] Starting: ${entry.id} (attempt ${entry.attempts + 1})`);
  entry.status = "spawning"; entry.startedAt = new Date().toISOString(); entry.attempts++; entry.slotId = slotId; updateHeartbeat(entry);
  let worktree: Worktree | null = null;
  try {
    worktree = createWorktree(entry.id, entry.id, { skipFetch: true });
    entry.branch = worktree.branch; entry.worktreePath = worktree.path; entry.status = "working"; updateHeartbeat(entry);
    await notify(`💻 *[Slot ${slotId}] Implementando:* ${entry.id}\n_Branch: ${worktree.branch}_`);
    const specContent = readFileSync(join(config.projectRoot, entry.specPath), "utf-8");
    let retryContext = "";
    if (entry.lastError && entry.attempts > 1) {
      retryContext = `\n## Previous Attempt Failed\nThis is retry attempt ${entry.attempts}. Previous error:\n${entry.lastError.slice(0, 1000)}\nLearn from this error and avoid the same mistake.\n`;
    }
    const result = await runClaude({
      prompt: `You are a senior developer implementing a story for the Taverna do Mestre project.\n\n## Story Spec\n${specContent}${retryContext}\n## Instructions\n1. Read the spec carefully\n2. Read _bmad-output/project-context.md for project rules\n3. Implement EVERY task in the spec's task list\n4. Write tests for new code\n5. Run npx jest --findRelatedTests <changed-files> --passWithNoTests --forceExit\n6. Report what you implemented\n\n## Critical Rules\n- Follow existing code patterns\n- All UI strings in messages/pt-BR.json and messages/en.json\n- Never hardcode text in components\n- Sanitize broadcast data (anti-metagaming)\n- Use snake_case for data fields\n- Error pattern: try/catch → toast.error() + Sentry.captureException()`,
      maxTurns: config.agent.maxTurnsPerStory, model: config.agent.models.dev, timeoutMs: 40 * 60 * 1000, cwd: worktree.path,
    });
    updateHeartbeat(entry);
    if (result.exitCode !== 0) {
      if (result.isRateLimited) throw new Error(`RATE_LIMITED: ${result.output.slice(-200)}`);
      throw new Error(`Claude CLI exited with code ${result.exitCode}: ${result.output.slice(-500)}`);
    }
    entry.status = "verifying"; updateHeartbeat(entry);
    const verification = await verifyAndFix(worktree, specContent);
    entry.verifyAttempts = verification.fixAttempts; entry.verifyPassed = verification.passed; updateHeartbeat(entry);
    if (!verification.passed) {
      logger.warn(`Story ${entry.id} failed verification after ${verification.fixAttempts} attempts`);
      await notify(`⚠️ *${entry.id}* — Verificação falhou após ${verification.fixAttempts} tentativas.`);
    }
    const filesChanged = getChangedFilesInWorktree(worktree).length;
    const verifyTag = verification.passed ? "" : " [NEEDS-REVIEW]";
    const commitHash = commitInWorktree(worktree, `feat(${entry.id}): implement story${verifyTag}`);
    entry.commitHash = commitHash;
    if (commitHash === "no-changes") {
      entry.status = "done"; entry.finishedAt = new Date().toISOString();
      await notify(`⚠️ *${entry.id}* — Nenhuma mudança detectada.`);
      removeWorktree(worktree); return true;
    }
    let pushOk = false;
    try { await withGitMutex(() => pushWorktree(worktree!)); pushOk = true; } catch (e) {
      logger.warn(`Push failed for ${entry.id}`, { error: String(e) });
      await notify(`⚠️ *${entry.id}* — Push falhou. Branch: ${entry.branch}.`);
    }
    if (pushOk) {
      entry.status = "pr_open";
      const verifyStatus = verification.passed ? "✅ Verificação passou" : "⚠️ NEEDS REVIEW";
      const pr = await withGitMutex(() => createPRFromWorktree(worktree!, `feat(${entry.id}): implement story`, `## Story ${entry.id}\n\n${result.output.slice(0, 500)}\n\n### Verificação\n${verifyStatus}\n- Fix attempts: ${verification.fixAttempts}\n\n🤖 Generated by BMAD Orchestrator`));
      entry.prNumber = pr.number; entry.prUrl = pr.url;
      if (pr.number > 0) { const ciResult = await monitorAndFixCI(worktree, pr.number, specContent); entry.ciFixAttempts = ciResult.attempts; }
    }
    entry.status = "done"; entry.finishedAt = new Date().toISOString();
    logger.info(`[Slot ${slotId}] Done: ${entry.id} — commit ${commitHash}`);
    await notifyComplete({ task: entry.id, duration: getDuration(entry.startedAt!, entry.finishedAt), filesChanged, testsStatus: verification.passed ? "Passed" : "Failed (committed for review)" });
    if (config.worktree.cleanupOnSuccess) removeWorktree(worktree);
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    entry.error = err.message; entry.lastError = err.message; entry.finishedAt = new Date().toISOString();
    if (worktree) { try { removeWorktree(worktree); } catch (e) { logger.error("Worktree cleanup failed", { error: String(e) }); } }
    const isRateLimit = err.message.startsWith("RATE_LIMITED");
    if (entry.attempts < 3) {
      const backoffMs = isRateLimit ? config.worktree.rateLimitBackoffMs * Math.pow(2, entry.attempts - 1) : 10_000 * Math.pow(3, entry.attempts - 1);
      const reason = isRateLimit ? "rate limited" : err.message.slice(0, 200);
      logger.warn(`[Slot ${slotId}] Failed: ${entry.id} — ${reason}. Retrying in ${backoffMs / 1000}s.`);
      entry.status = "pending";
      await notify(`⚠️ *[Slot ${slotId}] ${entry.id}* falhou (tentativa ${entry.attempts}/3): ${reason}\n_Retentando em ${backoffMs / 1000}s..._`);
      await new Promise((r) => setTimeout(r, backoffMs));
      return false;
    } else {
      logger.error(`[Slot ${slotId}] Failed permanently: ${entry.id}`);
      entry.status = "failed";
      await notifyError({ task: entry.id, message: err.message.slice(0, 300), recoverable: false });
      return false;
    }
  }
}

// -- Main Queue Runner --
export async function runQueue(): Promise<void> {
  await recoverCrashedEntries();
  let state = await withLock(() => { const s = loadQueue(); if (s.stories.length === 0) return buildQueue(); return s; });
  const total = state.stories.length;
  const pending = state.stories.filter((s) => s.status === "pending").length;
  const done = state.stories.filter((s) => s.status === "done").length;
  const maxC = config.worktree.maxConcurrent;
  logger.info(`Queue: ${total} stories, ${done} done, ${pending} pending, maxConcurrent=${maxC}`);
  await notify(`🚀 *Story Queue iniciando!*\n*Total:* ${total} stories\n*Feitas:* ${done}\n*Pendentes:* ${pending}\n*Concurrency:* ${maxC} slots`);
  try { execFileSync("git", ["fetch", "origin", config.git.baseBranch], { cwd: config.projectRoot, encoding: "utf-8", timeout: 60_000 }); } catch { logger.warn("Pre-fetch failed"); }
  startStuckDetector();
  const semaphore = new Semaphore(maxC);
  const promises: Promise<void>[] = [];
  for (const story of state.stories) {
    if (story.status === "done" || story.status === "skipped") continue;
    if (story.status === "failed" && story.attempts >= 3) continue;
    const storyId = story.id;
    const storyPromise = semaphore.run(async () => {
      const current = await withLock(() => loadQueue());
      if (current.isPaused) { logger.info(`Queue paused — skipping ${storyId}`); return; }
      const freshEntry = current.stories.find((s) => s.id === storyId);
      if (!freshEntry || freshEntry.status === "done" || freshEntry.status === "skipped") return;
      if (freshEntry.status === "failed" && freshEntry.attempts >= 3) return;
      if (!areDependenciesMet(storyId, current.stories)) {
        logger.info(`${storyId} waiting on dependencies`);
        for (let waitRound = 0; waitRound < 180; waitRound++) {
          await new Promise((r) => setTimeout(r, 30_000));
          const updated = await withLock(() => loadQueue());
          if (updated.isPaused) return;
          if (areDependenciesMet(storyId, updated.stories)) break;
          const self = updated.stories.find((s) => s.id === storyId);
          if (self?.status === "done" || self?.status === "failed" || self?.status === "skipped") return;
        }
        const final2 = await withLock(() => loadQueue());
        if (!areDependenciesMet(storyId, final2.stories)) {
          logger.warn(`${storyId} deps never met after 90min`);
          await loadAndSave((s) => { const e = s.stories.find((x) => x.id === storyId); if (e) { e.status = "skipped"; e.error = "Dependencies not met after 90min"; } });
          return;
        }
      }
      let slot = 1;
      await loadAndSave((s) => {
        const maxSlot = Math.max(0, ...s.stories.filter((e) => e.status === "working" || e.status === "spawning" || e.status === "verifying").map((e) => e.slotId || 0));
        slot = maxSlot + 1;
        const entry = s.stories.find((e) => e.id === storyId);
        if (entry) entry.slotId = slot;
        s.runningStories.push(storyId);
      });
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const entry = (await withLock(() => loadQueue())).stories.find((s) => s.id === storyId)!;
          if (entry.status === "done" || entry.status === "failed") break;
          const success = await executeStorySpec(entry, slot);
          await loadAndSave((s) => {
            const idx = s.stories.findIndex((e) => e.id === storyId);
            if (idx >= 0) Object.assign(s.stories[idx], entry);
            if (entry.status === "done") {
              s.metrics.storiesCompleted++;
              if (entry.startedAt && entry.finishedAt) { const dur = new Date(entry.finishedAt).getTime() - new Date(entry.startedAt).getTime(); s.metrics.totalDurationMs += dur; s.metrics.avgStoryDurationMs = s.metrics.totalDurationMs / s.metrics.storiesCompleted; }
              if (entry.ciFixAttempts) s.metrics.totalCIFixes += entry.ciFixAttempts;
            } else if (entry.status === "failed") { s.metrics.storiesFailed++; }
            if (entry.attempts > 1) s.metrics.totalRetries++;
          });
          if (success || entry.status !== "pending") break;
        } catch (e) {
          logger.error(`[Slot ${slot}] Unhandled error in story ${storyId} attempt ${attempt + 1}`, { error: String(e) });
          if (attempt >= MAX_RETRIES - 1) { await loadAndSave((s) => { const entry = s.stories.find((e) => e.id === storyId); if (entry) { entry.status = "failed"; entry.error = String(e); s.metrics.storiesFailed++; } }); }
        }
      }
      await loadAndSave((s) => { s.runningStories = s.runningStories.filter((id) => id !== storyId); });
    });
    promises.push(storyPromise);
  }
  await Promise.allSettled(promises);
  stopStuckDetector();
  state = await withLock(() => loadQueue());
  const finalDone = state.stories.filter((s) => s.status === "done").length;
  const finalFailed = state.stories.filter((s) => s.status === "failed").length;
  const finalSkipped = state.stories.filter((s) => s.status === "skipped").length;
  const totalElapsed = getDuration(state.startedAt, new Date().toISOString());
  logger.info(`Queue complete: ${finalDone} done, ${finalFailed} failed, ${finalSkipped} skipped`, { metrics: state.metrics });
  await notify(`🏁 *Queue completa!*\n✅ *Done:* ${finalDone}/${total}\n❌ *Failed:* ${finalFailed}\n⏭️ *Skipped:* ${finalSkipped}\n⏱️ *Tempo:* ${totalElapsed}\n📊 Retries: ${state.metrics.totalRetries} | CI fixes: ${state.metrics.totalCIFixes} | Avg: ${Math.round(state.metrics.avgStoryDurationMs / 60_000)}min`);
}

// -- Helpers --
function getDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  if (hours > 0) return `${hours}h ${min}m`;
  return `${min}m ${sec}s`;
}

// -- External Controls --
export function pauseQueue(): void { if (!acquireFileLock()) return; try { const state = loadQueue(); state.isPaused = true; saveQueue(state); } finally { releaseFileLock(); } }
export function resumeQueue(): void { if (!acquireFileLock()) return; try { const state = loadQueue(); state.isPaused = false; saveQueue(state); } finally { releaseFileLock(); } }

export function getQueueStatus(): string {
  if (!acquireFileLock()) return "Could not read queue state.";
  try {
    const state = loadQueue();
    if (state.stories.length === 0) return "Queue vazia.";
    const done = state.stories.filter((s) => s.status === "done").length;
    const failed = state.stories.filter((s) => s.status === "failed").length;
    const pending = state.stories.filter((s) => s.status === "pending").length;
    const stuck = state.stories.filter((s) => s.status === "stuck").length;
    const working = state.stories.filter((s) => s.status === "working" || s.status === "spawning" || s.status === "verifying" || s.status === "pr_open");
    const workingList = working.map((s) => `  • ${s.id} [${s.status}]${s.slotId ? " Slot " + s.slotId : ""}`).join("\n");
    return `📊 *Queue Status*\n*Total:* ${state.stories.length}\n✅ Done: ${done}\n💻 Active: ${working.length}/${config.worktree.maxConcurrent}\n${workingList || "  (nenhuma)"}\n⏳ Pending: ${pending}\n❌ Failed: ${failed}${stuck ? "\n🔴 Stuck: " + stuck : ""}\n${state.isPaused ? "⏸️ PAUSADA" : "▶️ Rodando"}\n_Iniciada: ${state.startedAt}_\n📊 Avg: ${Math.round(state.metrics.avgStoryDurationMs / 60_000)}min | Retries: ${state.metrics.totalRetries} | CI fixes: ${state.metrics.totalCIFixes}`;
  } finally { releaseFileLock(); }
}

export function retryStory(storyId: string): boolean {
  if (!acquireFileLock()) return false;
  try {
    const state = loadQueue();
    const entry = state.stories.find((s) => s.id === storyId);
    if (!entry || (entry.status !== "failed" && entry.status !== "stuck")) return false;
    entry.status = "pending"; entry.attempts = Math.max(0, entry.attempts - 1); entry.error = undefined;
    saveQueue(state); return true;
  } finally { releaseFileLock(); }
}

export function skipStory(storyId: string): boolean {
  if (!acquireFileLock()) return false;
  try {
    const state = loadQueue();
    const entry = state.stories.find((s) => s.id === storyId);
    if (!entry) return false;
    entry.status = "skipped"; entry.error = "Manually skipped";
    saveQueue(state); return true;
  } finally { releaseFileLock(); }
}
