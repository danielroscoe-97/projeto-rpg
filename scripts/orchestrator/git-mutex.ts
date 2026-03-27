/**
 * BMAD Orchestrator — Git Remote Mutex
 *
 * Serializes git remote operations (fetch, push, PR creation).
 * Git worktrees share the same .git directory, so these operations
 * must not run concurrently.
 */

import { Mutex } from "./semaphore.js";

const gitRemoteMutex = new Mutex();

/** Run a function under the git remote mutex (push, PR, fetch) */
export async function withGitMutex<T>(fn: () => T | Promise<T>): Promise<T> {
  return gitRemoteMutex.run(async () => fn());
}
