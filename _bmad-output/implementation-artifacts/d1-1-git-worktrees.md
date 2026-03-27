# Story D.1.1: Git Worktrees para Isolamento no Orchestrator

Status: ready-for-dev

## Story

As a **developer**,
I want the orchestrator to use git worktrees for each story,
so that the main repo never changes branch during execution.

## Acceptance Criteria

1. New `worktree.ts` module with: createWorktree, removeWorktree, listWorktrees, commitInWorktree, pushWorktree, createPRFromWorktree
2. Worktrees created in `os.tmpdir()/bmad/<branch-slug>`
3. All git operations in worktree use `{cwd: worktree.path}`
4. Main repo NEVER changes branch during story execution
5. `claude-runner.ts` accepts optional `cwd` parameter
6. `story-queue.ts` uses worktree instead of createBranch
7. Config: `worktree.baseDir`, `worktree.maxConcurrent`, `worktree.cleanupOnSuccess`
8. Cleanup: worktree removed after success, kept on failure for inspection
9. All existing tests pass + new tests for worktree.ts

## Tasks / Subtasks

- [ ] Task 1: Add config fields (AC: #7)
- [ ] Task 2: Create worktree.ts (AC: #1, #2, #3)
- [ ] Task 3: Update claude-runner.ts (AC: #5)
- [ ] Task 4: Update story-queue.ts (AC: #6, #8)
- [ ] Task 5: Update orchestrator.ts (AC: #4)
- [ ] Task 6: Tests (AC: #9)
- [ ] Task 7: Run all tests

## Dev Notes

### Files to Modify/Create

- New: `scripts/orchestrator/worktree.ts`
- Modify: `scripts/orchestrator/config.ts` — worktree config
- Modify: `scripts/orchestrator/claude-runner.ts` — cwd param
- Modify: `scripts/orchestrator/story-queue.ts` — use worktree
- Modify: `scripts/orchestrator/orchestrator.ts` — use worktree
- New: `scripts/orchestrator/__tests__/worktree.test.ts`

### Anti-Patterns

- **DON'T** use shell: true in any exec — always execFileSync
- **DON'T** change main repo branch — worktree handles everything
- **DON'T** leave worktrees around on success — clean up

### References

- [Source: scripts/orchestrator/PROMPT-worktree-verify-fix.md — Feature 1]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
