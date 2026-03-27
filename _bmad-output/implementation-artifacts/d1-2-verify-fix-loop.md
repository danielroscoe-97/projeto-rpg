# Story D.1.2: Verify-Fix Loop Automático

Status: ready-for-dev

## Story

As a **developer**,
I want the orchestrator to automatically test and fix implementations,
so that stories ship with passing tests.

## Acceptance Criteria

1. `verifyAndFix()` function runs `npm test` in worktree after implementation
2. If tests pass, runs lightweight QA check via Claude (read-only tools)
3. If tests/QA fail, invokes Claude to fix (max 3 attempts)
4. Slack notified at each attempt
5. If still failing after 3 attempts, commits with `[NEEDS-REVIEW]` flag
6. Config: `verifyFix.enabled`, `verifyFix.maxAttempts`, `verifyFix.maxTurnsPerFix`
7. StoryEntry gains `verifyAttempts` and `verifyPassed` fields
8. All existing tests pass + new tests

## Tasks / Subtasks

- [ ] Task 1: Add config fields (AC: #6)
- [ ] Task 2: Implement verifyAndFix (AC: #1, #2, #3)
- [ ] Task 3: Fix loop (AC: #3, #5)
- [ ] Task 4: Slack notifications (AC: #4)
- [ ] Task 5: Update StoryEntry (AC: #7)
- [ ] Task 6: Integrate into executeStorySpec
- [ ] Task 7: Tests (AC: #8)

## Dev Notes

### Files to Modify/Create

- Modify: `scripts/orchestrator/story-queue.ts` — verifyAndFix + integration
- Modify: `scripts/orchestrator/config.ts` — verifyFix config
- Modify: `scripts/orchestrator/slack.ts` — verify progress notifications
- New: `scripts/orchestrator/__tests__/verify-fix.test.ts`

### Anti-Patterns

- **DON'T** skip tests — always run even if implementation "looks right"
- **DON'T** give fix agent Write access without Read first
- **DON'T** retry indefinitely — hard cap at maxAttempts

### References

- [Source: scripts/orchestrator/PROMPT-worktree-verify-fix.md — Feature 2]
- Dependencies: D.1.1

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
