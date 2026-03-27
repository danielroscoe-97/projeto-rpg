/**
 * BMAD Orchestrator — Git Worktree Operations
 *
 * Provides isolated working directories for parallel story execution.
 * Each worktree shares the .git directory but has its own filesystem,
 * so the main repo never changes branch during execution.
 *
 * SECURITY: All git commands use execFileSync (no shell interpolation).
 */

import { execFileSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync, rmSync, mkdirSync, symlinkSync, realpathSync } from "fs";
import { join } from "path";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { validateBranchName, validateStoryId, toBranchSafeSlug } from "./validation.js";

const GIT_TIMEOUT = 120_000; // worktree ops can be slower

// -- Types --

export interface Worktree {
  path: string;
  branch: string;
  storyId: string;
}

// -- Helpers --

function gitInRepo(...args: string[]): string {
  logger.git(`git ${args.slice(0, 3).join(" ")}`, { args });
  return execFileSync("git", args, {
    cwd: config.projectRoot,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT,
  }).trim();
}

function gitInWorktree(worktree: Worktree, ...args: string[]): string {
  logger.git(`git ${args.slice(0, 3).join(" ")} (worktree)`, { args, cwd: worktree.path });
  return execFileSync("git", args, {
    cwd: worktree.path,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT,
  }).trim();
}

function ghInWorktree(worktree: Worktree, ...args: string[]): string {
  return execFileSync("gh", args, {
    cwd: worktree.path,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT,
  }).trim();
}

function toWorktreeSlug(description: string): string {
  return toBranchSafeSlug(description);
}

// -- Public API --

/**
 * Create an isolated git worktree for a story.
 * If the worktree directory already exists (from a previous run), removes it first.
 */
export function createWorktree(storyId: string, description: string, options?: { skipFetch?: boolean }): Worktree {
  validateStoryId(storyId);
  const slug = toWorktreeSlug(description);
  const branch = validateBranchName(`${config.git.branchPrefix}${slug}`);
  const worktreePath = join(config.worktree.baseDir, slug);

  // Clean up stale worktree if it exists
  if (existsSync(worktreePath)) {
    logger.warn(`Removing stale worktree at ${worktreePath}`);
    try {
      gitInRepo("worktree", "remove", worktreePath, "--force");
    } catch {
      // If git worktree remove fails, force-delete the directory
      rmSync(worktreePath, { recursive: true, force: true });
    }
  }

  // Delete branch if it already exists (stale from previous run)
  try {
    gitInRepo("branch", "-D", branch);
    logger.info(`Deleted stale branch ${branch}`);
  } catch {
    // Branch doesn't exist — that's fine
  }

  // Ensure base directory exists
  mkdirSync(config.worktree.baseDir, { recursive: true });

  // Pull latest on base branch (best-effort) — skip if caller already fetched
  if (!options?.skipFetch) {
    try {
      gitInRepo("fetch", "origin", config.git.baseBranch);
    } catch {
      logger.warn("Fetch failed (offline?), continuing with local state");
    }
  }

  // Create worktree with new branch from base
  gitInRepo("worktree", "add", worktreePath, "-b", branch, config.git.baseBranch);

  // Symlink node_modules from main repo (worktrees don't include gitignored files)
  const mainNodeModules = join(config.projectRoot, "node_modules");
  const wtNodeModules = join(worktreePath, "node_modules");
  if (existsSync(mainNodeModules) && !existsSync(wtNodeModules)) {
    try {
      // On Windows, 'junction' works without admin privileges
      symlinkSync(mainNodeModules, wtNodeModules, "junction");
      // Validate the symlink actually resolves
      const resolved = realpathSync(wtNodeModules);
      if (!existsSync(join(resolved, ".package-lock.json")) && !existsSync(join(resolved, "next"))) {
        logger.warn("node_modules symlink created but looks empty — tests may fail");
      } else {
        logger.info("Linked node_modules into worktree");
      }
    } catch (e) {
      logger.error("Failed to symlink node_modules — tests WILL fail in worktree. Check Windows developer mode or run as admin.", { error: String(e) });
    }
  }

  logger.info(`Created worktree`, { path: worktreePath, branch, storyId });

  return { path: worktreePath, branch, storyId };
}

/**
 * Remove a worktree and its branch.
 */
export function removeWorktree(worktree: Worktree): void {
  try {
    gitInRepo("worktree", "remove", worktree.path, "--force");
    logger.info(`Removed worktree`, { path: worktree.path });
  } catch (e) {
    logger.warn(`Failed to remove worktree via git, force-deleting`, { error: String(e) });
    try {
      rmSync(worktree.path, { recursive: true, force: true });
      // Prune stale worktree entries
      gitInRepo("worktree", "prune");
    } catch {
      // best effort
    }
  }

  // Clean up the branch
  try {
    gitInRepo("branch", "-D", worktree.branch);
  } catch {
    // Branch may have been pushed/merged — that's fine
  }
}

/**
 * List all active worktrees.
 */
export function listWorktrees(): Worktree[] {
  const output = gitInRepo("worktree", "list", "--porcelain");
  const worktrees: Worktree[] = [];
  const blocks = output.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let path = "";
    let branch = "";

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.slice("worktree ".length);
      }
      if (line.startsWith("branch refs/heads/")) {
        branch = line.slice("branch refs/heads/".length);
      }
    }

    // Skip the main worktree (it doesn't have a branch prefix we care about)
    if (path && branch && branch.startsWith(config.git.branchPrefix)) {
      worktrees.push({ path, branch, storyId: branch.replace(config.git.branchPrefix, "") });
    }
  }

  return worktrees;
}

/**
 * Stage all changes and commit in a worktree.
 * Uses --file for commit message to prevent command injection.
 * Returns the short commit hash, or "no-changes" if nothing to commit.
 */
export function commitInWorktree(worktree: Worktree, message: string): string {
  gitInWorktree(worktree, "add", "-A");

  const status = gitInWorktree(worktree, "status", "--porcelain");
  if (!status) {
    return "no-changes";
  }

  const fullMessage = `${message}\n\nCo-Authored-By: BMAD Orchestrator <bmad@taverna.dev>`;

  // Write commit message to temp file — never pass via args
  const msgFile = join(worktree.path, ".git-commit-msg-tmp");
  writeFileSync(msgFile, fullMessage);

  try {
    gitInWorktree(worktree, "commit", "--file", msgFile);
  } finally {
    try { unlinkSync(msgFile); } catch { /* cleanup best-effort */ }
  }

  return gitInWorktree(worktree, "rev-parse", "--short", "HEAD");
}

/**
 * Push the worktree branch to origin.
 */
export function pushWorktree(worktree: Worktree): void {
  if (!config.git.autoPush) {
    logger.git("Push skipped (autoPush disabled)");
    return;
  }

  gitInWorktree(worktree, "push", "-u", "origin", worktree.branch);
}

/**
 * Create a Pull Request from a worktree branch.
 * Uses --body-file to prevent command injection.
 */
export function createPRFromWorktree(
  worktree: Worktree,
  title: string,
  body: string
): { number: number; url: string } {
  if (!config.git.autoCreatePR) {
    logger.git("PR creation skipped (autoCreatePR disabled)");
    return { number: 0, url: "" };
  }

  const bodyFile = join(worktree.path, ".git-pr-body-tmp");
  writeFileSync(bodyFile, body);

  try {
    const result = ghInWorktree(
      worktree,
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
 * Get list of changed files in worktree vs base branch.
 */
export function getChangedFilesInWorktree(worktree: Worktree): string[] {
  try {
    const diff = gitInWorktree(worktree, "diff", "--name-only", `${config.git.baseBranch}...HEAD`);
    return diff ? diff.split("\n") : [];
  } catch {
    return [];
  }
}
