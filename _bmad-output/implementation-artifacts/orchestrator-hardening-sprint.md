# Sprint: Orchestrator Hardening

**Status:** in-progress
**Priority:** Critical
**Created:** 2026-03-27
**Estimated Effort:** ~4 hours

---

## Context

O BMAD Orchestrator (`scripts/orchestrator/`) é o sistema autônomo que lê specs, delega trabalho ao Claude CLI, gerencia git workflow e notifica via Slack. Uma revisão adversarial identificou **13 issues** em 4 categorias de severidade.

## Issues Identificadas

### 🔴 Alta Severidade

| ID | Issue | Arquivo | Impacto |
|----|-------|---------|---------|
| S1 | `run()` usa `execSync` com template literals — command injection | git.ts | Segurança |
| S2 | `shell: true` no spawn do Claude CLI | claude-runner.ts | Segurança |
| R1 | Race condition no state da queue (sem file lock) | story-queue.ts | Confiabilidade |
| R2 | `executePlan` não cria branch — commita em master | orchestrator.ts | Correctness |

### 🟡 Média Severidade

| ID | Issue | Arquivo | Impacto |
|----|-------|---------|---------|
| C1 | `filesChanged` sempre 0 no summary (contado após checkoutBase) | orchestrator.ts | Correctness |
| C2 | Watcher marca `triggered=true` ANTES de executar | watcher.ts | Confiabilidade |
| C3 | `enqueueCommand` sem await na recursão | slack-bot.ts | Confiabilidade |
| C4 | Readline mode sem concurrency lock | orchestrator.ts | Confiabilidade |
| Q1 | Zero testes | todos | Qualidade |
| Q2 | Dead code: `runAsAgent()`, `@anthropic-ai/claude-agent-sdk` | claude-runner.ts, package.json | Manutenção |
| O1 | Sem structured logging nem métricas | todos | Observabilidade |

### 🟢 Baixa Severidade

| ID | Issue | Arquivo | Impacto |
|----|-------|---------|---------|
| M1 | Specs hardcoded no watcher (v2-0-*) | watcher.ts | Manutenção |
| M2 | Dependência circular orchestrator↔watcher | orchestrator.ts, watcher.ts | Manutenção |

---

## Stories

### Story H.1: Security — Eliminate Command Injection Vectors
**Files:** git.ts, claude-runner.ts
**Fixes:** S1, S2

- Replace `execSync(cmd)` with `execFileSync("git", [...args])` in git.ts
- Remove `shell: true` from claude-runner.ts spawn
- All user-controlled strings via `--file` / stdin, never interpolated

### Story H.2: Reliability — Fix State Management & Race Conditions
**Files:** story-queue.ts, watcher.ts, slack-bot.ts, orchestrator.ts
**Fixes:** R1, C2, C3, C4

- Add file locking for queue + watcher state files
- Fix watcher: execute THEN mark triggered (rollback on failure)
- Fix `enqueueCommand`: proper await on recursive call
- Add processing lock to readline interactive mode

### Story H.3: Correctness — Fix Branch/Summary/Checkout Bugs
**Files:** orchestrator.ts, git.ts
**Fixes:** R2, C1

- Add `git.createBranch()` in `executePlan()`
- Capture `filesChanged` BEFORE `checkoutBase()`
- Make `checkoutBase()` throw on failure instead of swallowing

### Story H.4: Quality — Tests, Dead Code, Config Validation
**Files:** all + new test files
**Fixes:** Q1, Q2

- Add vitest as test runner
- Add zod for config validation at boot
- Remove `runAsAgent()` from claude-runner.ts
- Remove `@anthropic-ai/claude-agent-sdk` from package.json
- Write unit tests for all pure functions

### Story H.5: Observability — Structured Logging + Metrics
**Files:** new logger.ts, all modules
**Fixes:** O1

- Create `logger.ts` with JSON structured logging
- Add task metrics: duration, model, turns used
- Add boot-time validation (gh, claude, git, node version)

### Story H.6: Maintenance — Break Circular Dep, Dynamic Specs
**Files:** orchestrator.ts, watcher.ts
**Fixes:** M1, M2

- Watcher accepts command handler via `setCommandHandler()` instead of importing
- Remove hardcoded spec paths from `parseWatchCommand()`
- Auto-detect specs from `_bmad-output/implementation-artifacts/`

---

## Execution Order

1. H.4 (package.json + vitest setup) — foundation
2. H.5 (logger.ts) — used by all other fixes
3. H.1 (git.ts security) — most critical
4. H.6 (break circular dep) — needed before H.2/H.3
5. H.2 (race conditions)
6. H.3 (correctness bugs)
7. H.4 continued (write all tests)
8. Run tests → verify green
