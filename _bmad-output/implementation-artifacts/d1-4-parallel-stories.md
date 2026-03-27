# Story D.1.4: Paralelismo de Stories (maxConcurrent > 1)

Status: ready-for-dev

## Story

As a **developer**,
I want the orchestrator to run multiple stories in parallel,
so that sprint execution is faster.

## Acceptance Criteria

1. `maxConcurrent` config controls how many stories run simultaneously
2. Each concurrent story uses its own worktree (from D.1.1)
3. Queue processing uses a semaphore/pool pattern
4. Stories with dependencies wait for their deps to complete
5. Slack notifications include which "slot" each story is running in
6. File locking still works correctly with concurrent access
7. No race conditions on queue state file

## Tasks / Subtasks

- [ ] Task 1: Semaphore/pool implementation (AC: #1, #3)
- [ ] Task 2: Dependency-aware scheduling (AC: #4)
- [ ] Task 3: Concurrent worktree management (AC: #2)
- [ ] Task 4: Queue state concurrency safety (AC: #6, #7)
- [ ] Task 5: Slack slot identification (AC: #5)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `scripts/orchestrator/story-queue.ts` — parallel execution
- Modify: `scripts/orchestrator/config.ts` — maxConcurrent default bump
- New: `scripts/orchestrator/semaphore.ts` — concurrency control

### Anti-Patterns

- **DON'T** use Promise.all without concurrency limit
- **DON'T** allow dependent stories to run simultaneously
- **DON'T** share any state between concurrent workers except via locked queue file

### References

- [Source: scripts/orchestrator/PROMPT-worktree-verify-fix.md — Parallelism notes]
- Dependencies: D.1.1, D.1.2, D.1.3

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
