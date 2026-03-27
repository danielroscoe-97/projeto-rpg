# Story D.1.3: QA Automático Pós-Implementação

Status: ready-for-dev

## Story

As a **developer**,
I want a dedicated QA step that validates implementation against acceptance criteria,
so that stories meet spec before PR.

## Acceptance Criteria

1. After verify-fix passes, QA agent reads story spec + changed files
2. QA agent checks each acceptance criterion
3. QA produces structured report: `{criterion: string, met: boolean, evidence: string}`
4. If any criterion not met, story goes back to fix cycle
5. QA uses read-only tools (Read, Glob, Grep, Bash for test runs)
6. QA result stored in StoryEntry
7. Slack notification with QA summary

## Tasks / Subtasks

- [ ] Task 1: QA prompt template (AC: #1, #2, #3)
- [ ] Task 2: QA execution in story pipeline (AC: #4)
- [ ] Task 3: Read-only tool restriction (AC: #5)
- [ ] Task 4: Result storage (AC: #6)
- [ ] Task 5: Slack notification (AC: #7)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `scripts/orchestrator/story-queue.ts` — QA step
- Modify: `scripts/orchestrator/agents.ts` — QA agent config
- Modify: `scripts/orchestrator/slack.ts` — QA notification

### Anti-Patterns

- **DON'T** give QA agent write access
- **DON'T** skip QA even if tests pass — tests don't check acceptance criteria

### References

- [Source: scripts/orchestrator/PROMPT-worktree-verify-fix.md — QA section]
- Dependencies: D.1.2

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
