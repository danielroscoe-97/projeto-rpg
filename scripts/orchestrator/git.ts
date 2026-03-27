/**
 * BMAD Orchestrator — Git Operations
 *
 * SECURITY: All git commands use execFileSync (no shell interpolation).
 * User-controlled strings are passed via --file, never as arguments.
 */

import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { config } from "./config.js";
import { logger } from "./logger.js";

const GIT_TIMEOUT = 60_000;

// -- Safe Execution (no shell, no interpolation) --

function git(...args: string[]): string {
  logger.git(`git ${args.slice(0, 3).join(" ")}`, { args });
  return execFileSync("git", args, {
    cwd: config.projectRoot,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT,
  }).trim();
}

function gh(...args: string[]): string {
  return execFileSync("gh", args, {
    cwd: config.projectRoot,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT,
  }).trim();
}

// -- Operations --

/**
 * Ensure clean git state before operations.
 * Stashes uncommitted changes if present.
 */
function ensureCleanState(): void {
  const status = git("status", "--porcelain");
  if (status) {
    logger.git("Stashing uncommitted changes");
    git("stash", "push", "-m", "bmad-orchestrator-autostash");
  }
}

/**
 * Create a feature branch for a story.
 * Returns the branch name.
 */
export function createBranch(storyId: string, description: string): string {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  const branchName = `${config.git.branchPrefix}${slug}`;

  ensureCleanState();
  git("checkout", config.git.baseBranch);

  // Pull latest (fail-safe — if offline, continue with local state)
  try {
    git("pull", "origin", config.git.baseBranch);
  } catch {
    logger.warn("Pull failed (offline?), continuing with local state");
  }

  // Create and checkout new branch (if already exists, just checkout)
  try {
    git("checkout", "-b", branchName);
  } catch {
    try {
      git("checkout", branchName);
    } catch {
      // Last resort — create with a unique suffix
      const uniqueBranch = `${branchName}-${Date.now().toString(36)}`;
      git("checkout", "-b", uniqueBranch);
      return uniqueBranch;
    }
  }

  return branchName;
}

/**
 * Stage and commit changes.
 * Uses --file for commit message to prevent command injection.
 */
export function commit(message: string): string {
  git("add", "-A");

  const status = git("status", "--porcelain");
  if (!status) {
    return "no-changes";
  }

  const fullMessage = `${message}\n\nCo-Authored-By: BMAD Orchestrator <bmad@pocketdm.com.br>`;

  // Write commit message to temp file — never pass via args
  const msgFile = join(config.projectRoot, ".git", "BMAD_COMMIT_MSG");
  writeFileSync(msgFile, fullMessage);

  try {
    git("commit", "--file", msgFile);
  } finally {
    try { unlinkSync(msgFile); } catch { /* cleanup best-effort */ }
  }

  return git("rev-parse", "--short", "HEAD");
}

/**
 * Push current branch to origin.
 */
export function push(): void {
  if (!config.git.autoPush) {
    logger.git("Push skipped (autoPush disabled)");
    return;
  }

  const branch = git("branch", "--show-current");
  git("push", "-u", "origin", branch);
}

/**
 * Create a Pull Request on GitHub using gh CLI.
 * Uses --body-file to prevent command injection.
 */
export function createPR(title: string, body: string): { number: number; url: string } {
  if (!config.git.autoCreatePR) {
    logger.git("PR creation skipped (autoCreatePR disabled)");
    return { number: 0, url: "" };
  }

  // Write body to temp file — never pass via args
  const bodyFile = join(config.projectRoot, ".git", "BMAD_PR_BODY");
  writeFileSync(bodyFile, body);

  try {
    const result = gh(
      "pr", "create",
      "--title", title,
      "--body-file", bodyFile,
      "--base", config.git.baseBranch,
      "--json", "number,url"
    );
    return JSON.parse(result) as { number: number; url: string };
  } catch (e) {
    logger.error("PR creation failed", { error: String(e) });
    return { number: 0, url: "" };
  } finally {
    try { unlinkSync(bodyFile); } catch { /* cleanup best-effort */ }
  }
}

/**
 * Get current git status summary.
 */
export function getStatus(): {
  branch: string;
  changedFiles: number;
  ahead: number;
} {
  const branch = git("branch", "--show-current");
  const status = git("status", "--porcelain");
  const changedFiles = status ? status.split("\n").length : 0;

  let ahead = 0;
  try {
    ahead = parseInt(
      git("rev-list", "--count", `origin/${config.git.baseBranch}..HEAD`),
      10
    );
  } catch {
    // Branch may not have upstream yet
  }

  return { branch, changedFiles, ahead };
}

/**
 * Get list of changed files in current branch vs base.
 */
export function getChangedFiles(): string[] {
  try {
    const diff = git("diff", "--name-only", `${config.git.baseBranch}...HEAD`);
    return diff ? diff.split("\n") : [];
  } catch {
    return [];
  }
}

/**
 * Checkout back to base branch.
 * Throws on failure — caller must handle.
 */
export function checkoutBase(): void {
  ensureCleanState();
  git("checkout", config.git.baseBranch);
}
