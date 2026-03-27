# BMAD Orchestrator — Changelog

## v3.0.0 (2026-03-27)

### Breaking Changes
- Queue state schema upgraded to `version: 3` (auto-migrates from v1/v2)
- `StoryEntry.status` expanded from 5 to 10 states (session state machine)

### New Features

#### Session State Machine (Composio AO-inspired)
- Stories now transition through: `pending → spawning → working → verifying → pr_open → done`
- Additional states: `ci_failed`, `stuck`, `skipped`, `failed`
- Status visible in queue status output and Slack notifications

#### CI Feedback Loop
- After PR creation, orchestrator monitors GitHub Actions checks
- On CI failure, auto-dispatches a fix agent with CI logs (max 2 attempts)
- Pattern: `ci-failed → send-to-agent` (from Composio AO reaction system)

#### Crash Recovery
- On startup, `recoverCrashedEntries()` detects stories stuck in transient states
- Resets `spawning`/`working`/`verifying` back to `pending` for retry
- Clears stale `runningStories` array

#### Agent Heartbeat + Stuck Detection
- `updateHeartbeat()` records `lastActivityAt` on every state transition
- Background task (5min interval) detects stories with no activity for 30min
- Auto-marks stuck stories and notifies via Slack

#### Atomic Queue Writes
- `atomicWriteJSON()` writes to `.tmp` then renames (prevents corruption on crash/kill)
- Windows fallback: direct write + cleanup if rename fails (EBUSY)

#### Contextual Retry
- `lastError` preserved across retry attempts
- Retry prompt includes previous error so the agent can learn from it
- Avoids repeating the same mistake

#### Exact Changed Files in Fix Prompts
- Fix agent receives: exact file list, exact test command, scoped instructions
- No more "run npx jest --findRelatedTests <changed-files>" — command is pre-built
- Includes untracked files (`git ls-files --others --exclude-standard`)

#### Observability Metrics
- `QueueMetrics`: totalDurationMs, storiesCompleted, storiesFailed, totalRetries, totalCIFixes, avgStoryDurationMs
- Displayed in queue status and final summary notification

#### Queue Controls: retry/skip
- `retry <story-id>` — reset a failed/stuck story to pending
- `skip <story-id>` — manually skip a story
- Available via Slack commands and CLI (`retentar`/`refazer`/`pular` in PT-BR)

### Bug Fixes
- `gh pr create --json` removed (flag doesn't exist) — now parses URL from stdout
- Scoped tests: `jest --findRelatedTests` instead of full suite (avoids pre-existing failures)
- `parseInt` without radix → `parseInt(numStr, 10)`
- Stuck detector now batches state changes atomically (no spam notifications)
- CI monitoring wrapped in try/catch (timeout doesn't block story completion)

### Test Improvements
- `config.ts` now skips `PROJECT_ROOT` validation in test environments (`VITEST=true`)
- `vitest.config.ts` sets `VITEST` env var automatically
- Test mocks updated: `isRateLimited`, `renameSync`, `git-mutex`
- All 61 tests passing, TypeScript clean

### Files Changed
- `story-queue.ts` — rewritten (713 → ~550 lines, less code, more features)
- `orchestrator.ts` — retry/skip commands + imports + PT-BR aliases
- `config.ts` — test environment bypass for PROJECT_ROOT validation
- `vitest.config.ts` — VITEST env var
- `__tests__/verify-fix.test.ts` — isRateLimited mock + npx detection + git-mutex mock
- `__tests__/worktree.test.ts` — renameSync + symlinkSync mocks
