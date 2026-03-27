# Prompt: Implementar Git Worktrees + Verify-Fix Loop no BMAD Orchestrator

> **Cole este prompt inteiro numa nova sessão do Claude Code.**
> Ele contém todo o contexto necessário para implementar as duas features.

---

## CONTEXTO DO PROJETO

O BMAD Orchestrator (`scripts/orchestrator/`) é um sistema autônomo que:
- Lê specs de stories BMAD e delega implementação ao Claude Code CLI
- Gerencia git workflow (branch → commit → push → PR)
- Notifica via Slack e escala quando necessário
- Roda queues de 27+ stories por 28+ horas sem supervisão

**Stack do orquestrador:** TypeScript, Node.js (ESM), tsx runtime, vitest para testes, zod para validação.

**Stack do projeto principal:** Next.js 16, React 19, TypeScript, Supabase, Zustand, Tailwind, shadcn/ui.

---

## ARQUITETURA ATUAL (8 arquivos)

### `config.ts` — Configuração com validação Zod
```typescript
export const config = configSchema.parse({
  projectRoot: process.env.PROJECT_ROOT || ".",
  paths: { agentManifest, bmadConfig, agentsDir, prdV2, sprintSpec, projectContext, orchestratorLog },
  agent: {
    maxTurnsPerStory: 80,
    maxTurnsPerQuickFix: 30,
    maxTurnsPerSpec: 40,
    maxTurnsPerQA: 40,
    maxTurnsPerChat: 10,
    timeoutMs: 45 * 60 * 1000, // 45 min
    models: { orchestrator: "opus", dev: "opus", qa: "sonnet", spec: "sonnet", quickfix: "opus", parsing: "sonnet", chat: "sonnet" },
    permissionMode: "bypassPermissions",
  },
  git: { baseBranch: "master", branchPrefix: "feat/", autoCommit: true, autoPush: true, autoCreatePR: true },
  slack: { webhookUrl, botToken, channelId, enabled },
  groq: { apiKey, model: "whisper-large-v3", language: "pt" },
  escalation: { criticalPaths: [...], alwaysEscalate: [...], autoApprove: [...] },
});
```

### `git.ts` — Operações Git (execFileSync, sem shell)
```typescript
function git(...args: string[]): string // execFileSync("git", args) — SEGURO
function gh(...args: string[]): string  // execFileSync("gh", args)
export function createBranch(storyId: string, description: string): string
  // ensureCleanState() → checkout master → pull → checkout -b feat/slug
export function commit(message: string): string       // git add -A → --file para msg
export function push(): void                           // git push -u origin branch
export function createPR(title, body): { number, url } // gh pr create --body-file
export function getStatus(): { branch, changedFiles, ahead }
export function getChangedFiles(): string[]
export function checkoutBase(): void                   // stash → checkout master
```

### `claude-runner.ts` — Executa Claude CLI
```typescript
export interface ClaudeResult { output: string; exitCode: number; }

export async function runClaude(options: {
  prompt: string;
  allowedTools?: string[];
  maxTurns?: number;
  model?: string;
  systemPrompt?: string;
  timeoutMs?: number;
}): Promise<ClaudeResult>
// spawn("claude", args, { shell: false })
// Prompt via stdin. Timeout com SIGTERM→SIGKILL.
// Logs métricas via logger.taskComplete()
```

### `story-queue.ts` — Queue de Stories (file locking)
```typescript
interface StoryEntry {
  id: string; specPath: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  attempts: number; startedAt?: string; finishedAt?: string;
  error?: string; branch?: string; commitHash?: string;
}
interface QueueState {
  stories: StoryEntry[]; currentIndex: number;
  startedAt: string; lastUpdated: string; isPaused: boolean;
}

// File locking: .queue-state.json.lock (stale detection 60s)
function withLock<T>(fn: () => T): T
function loadAndSave(updater: (state: QueueState) => void): QueueState

export function buildQueue(): QueueState  // Scan _bmad-output/implementation-artifacts/v2-*.md
export async function runQueue(): Promise<void>  // For-loop sequential, 3 retries, exponential backoff
export function pauseQueue(): void
export function resumeQueue(): void
export function getQueueStatus(): string
```

**Problema atual do `runQueue`:**
1. Processa stories **sequencialmente** (uma por vez na mesma working directory)
2. `createBranch()` faz `checkout master` → `checkout -b feat/x` — **muda o working directory inteiro**
3. Se duas stories rodassem em paralelo, os checkouts colidiriam
4. **QA NÃO é executado automaticamente** após implementação — vai direto para commit
5. Se a implementação tem bugs, vai para o PR sem correção

### `orchestrator.ts` — Entry Point
```typescript
type OrchestratorMode = "sprint"|"story"|"quickfix"|"spec"|"qa"|"fix"|"status"|"stop"|"chat"|"plan"|"watch"|"queue"|"idle"

export function quickParse(input: string): { mode, target } | null
export async function parseCommand(input: string): Promise<{ mode, target }>
export async function handleCommand(input: string): Promise<void>

// Fluxos: executeSprint, executeStory, executeQuickFix, executeSpec, executeQA, executePlan, executeWatch, executeChat
// Lock global: isProcessing flag
```

### `watcher.ts` — Watch Rules (dep circular resolvida via setCommandHandler)
```typescript
export function setCommandHandler(handler: (input: string) => Promise<void>): void
export function addRule(rule): string
export function listRules(): WatchRule[]
export function clearRules(): void
export function startWatcher(intervalMs?: number): void
export function stopWatcher(): void
export function parseWatchCommand(input: string): { description, condition, action } | null
```

### `slack.ts` — Notificações
```typescript
export async function notify(message: string): Promise<void>
export async function notifyPRReady(pr: { number, title, url, story, summary }): Promise<void>
export async function notifyStatus(status: { mode, currentTask, progress, errors? }): Promise<void>
export async function notifyComplete(summary: { task, duration, filesChanged, testsStatus }): Promise<void>
export async function notifyError(error: { task, message, recoverable }): Promise<void>
export async function notifyEscalation(context: { type, description, options? }): Promise<void>
export async function transcribeAudio(audioBuffer: Buffer): Promise<string>
```

### `logger.ts` — Structured Logging (JSON)
```typescript
export const logger = {
  debug(msg, data?), info(msg, data?), warn(msg, data?), error(msg, data?),
  taskComplete(metrics: { task, model, maxTurns, durationMs, exitCode, outputLength }),
  git(operation, data?),
  claude(msg, data?),
}
```

### Testes existentes (50 testes, todos passando)
- `__tests__/config.test.ts` — 6 testes (validação Zod, models, paths)
- `__tests__/agents.test.ts` — 14 testes (CSV parser, prompt builder, tools)
- `__tests__/orchestrator.test.ts` — 8 testes (quickParse commands)
- `__tests__/watcher.test.ts` — 8 testes (parseWatchCommand)
- `__tests__/slack.test.ts` — 6 testes (notify, notifyComplete, notifyError)
- `__tests__/logger.test.ts` — 7 testes (log levels, metrics)
- `__tests__/story-queue.test.ts` — 1 teste (getQueueStatus)

---

## O QUE IMPLEMENTAR

### Feature 1: Git Worktrees para Isolamento e Paralelismo

**Referências:** ComposioHQ/agent-orchestrator, michaelshimeles/ralphy, crshdn/mission-control

**Conceito:** Em vez de `checkout master → checkout -b feat/x` (que muda o working directory inteiro e impede paralelismo), cada story roda em seu **próprio git worktree** — uma cópia isolada do repo que compartilha o .git mas tem seu próprio filesystem.

**Implementação:**

1. **Criar `worktree.ts`** — módulo novo com:
   ```typescript
   export interface Worktree {
     path: string;       // ex: /tmp/bmad/feat-story-1-1
     branch: string;     // ex: feat/story-1-1
     storyId: string;
   }

   export function createWorktree(storyId: string, description: string): Worktree
   // git worktree add <path> -b <branch> master
   // path = join(os.tmpdir(), "bmad", branchSlug)

   export function removeWorktree(worktree: Worktree): void
   // git worktree remove <path> --force

   export function listWorktrees(): Worktree[]
   // git worktree list --porcelain

   export function commitInWorktree(worktree: Worktree, message: string): string
   // execFileSync("git", ["add", "-A"], { cwd: worktree.path })
   // execFileSync("git", ["commit", "--file", msgFile], { cwd: worktree.path })

   export function pushWorktree(worktree: Worktree): void
   // execFileSync("git", ["push", "-u", "origin", worktree.branch], { cwd: worktree.path })

   export function createPRFromWorktree(worktree: Worktree, title: string, body: string): { number: number; url: string }
   // gh pr create --title ... --body-file ... --base master (cwd: worktree.path)

   export function getChangedFilesInWorktree(worktree: Worktree): string[]
   // git diff --name-only master...HEAD (cwd: worktree.path)
   ```

2. **Atualizar `claude-runner.ts`** — aceitar `cwd` opcional:
   ```typescript
   export async function runClaude(options: {
     prompt: string;
     allowedTools?: string[];
     maxTurns?: number;
     model?: string;
     systemPrompt?: string;
     timeoutMs?: number;
     cwd?: string; // NEW — worktree path
   }): Promise<ClaudeResult>
   ```
   No spawn: `cwd: options.cwd || config.projectRoot`

3. **Atualizar `story-queue.ts`** — usar worktree por story:
   - `executeStorySpec` cria worktree em vez de `createBranch`
   - Claude CLI roda com `cwd: worktree.path`
   - Commit/push/PR usam funções do worktree
   - Cleanup: `removeWorktree()` após sucesso ou falha permanente
   - `StoryEntry` ganha campo `worktreePath?: string`

4. **Atualizar `config.ts`** — novos campos:
   ```typescript
   worktree: {
     baseDir: string,        // default: os.tmpdir() + "/bmad"
     maxConcurrent: number,  // default: 1 (incrementar depois)
     cleanupOnSuccess: boolean, // default: true
   }
   ```

5. **Atualizar `orchestrator.ts`** — `executeStory`, `executeQuickFix`, `executePlan` usam worktree
   - `git.ts` funções originais continuam existindo para operações no repo principal
   - Worktree é a forma preferida para qualquer task que faz code changes

6. **Testes novos em `__tests__/worktree.test.ts`:**
   - Testar criação/remoção de worktree (mock execFileSync)
   - Testar listagem
   - Testar commit em worktree

**Regras:**
- O worktree é criado em `os.tmpdir()/bmad/<branch-slug>`
- Se o diretório já existe (de run anterior), remover primeiro
- Todas as operações git no worktree usam `{ cwd: worktree.path }`
- O repo principal NUNCA muda de branch durante execução
- Para maxConcurrent > 1 (futuro), cada worker tem seu worktree

---

### Feature 2: Verify-Fix Loop Automático

**Referências:** oh-my-claudecode (verify-fix loop), mission-control (checkpoint recovery)

**Conceito:** Após a implementação de uma story, automaticamente:
1. Rodar `npm test` no worktree
2. Se testes falham → invocar Claude para corrigir → re-testar
3. Repetir até os testes passarem ou max 3 iterações
4. Só então commit/push/PR

**Implementação:**

1. **Criar função `verifyAndFix` em `story-queue.ts`:**
   ```typescript
   interface VerifyResult {
     passed: boolean;
     testOutput: string;
     fixAttempts: number;
   }

   async function verifyAndFix(
     worktree: Worktree,
     specContent: string,
     maxAttempts: number = 3
   ): Promise<VerifyResult>
   ```

   **Fluxo:**
   ```
   attempt = 0
   while attempt < maxAttempts:
     // 1. Run tests
     testResult = execFileSync("npm", ["test", "--", "--passWithNoTests"], { cwd: worktree.path })

     if testResult.exitCode === 0:
       // 2. Run lightweight QA check
       qaResult = await runClaude({
         prompt: "Verify implementation against acceptance criteria...",
         cwd: worktree.path,
         model: config.agent.models.qa,
         maxTurns: 15,
         allowedTools: ["Read", "Glob", "Grep", "Bash"],
       })

       if qaResult.output includes "ALL_CRITERIA_MET":
         return { passed: true, testOutput, fixAttempts: attempt }

     // 3. If failed, invoke fix
     attempt++
     notify(`🔧 Tentativa ${attempt}/${maxAttempts}: corrigindo falhas...`)

     fixResult = await runClaude({
       prompt: `Tests/QA failed. Fix the issues.
         Test output: ${testOutput.slice(-2000)}
         QA feedback: ${qaFeedback}
         Story spec: ${specContent.slice(0, 3000)}
         Fix the code and run tests again.`,
       cwd: worktree.path,
       model: config.agent.models.dev,
       maxTurns: 30,
       allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
     })

   return { passed: false, testOutput, fixAttempts: maxAttempts }
   ```

2. **Integrar no `executeStorySpec`:**
   ```typescript
   async function executeStorySpec(entry: StoryEntry): Promise<boolean> {
     // 1. Create worktree
     const worktree = createWorktree(entry.id, entry.id);

     // 2. Implement
     const implResult = await runClaude({ ..., cwd: worktree.path });

     // 3. Verify-Fix Loop (NEW)
     const verification = await verifyAndFix(worktree, specContent, 3);

     if (!verification.passed) {
       logger.warn(`Story ${entry.id} failed verification after ${verification.fixAttempts} attempts`);
       await notify(`⚠️ *${entry.id}* — Verificação falhou após 3 tentativas. Commitando com flag de review.`);
       // Commit anyway but flag for human review
     }

     // 4. Commit/Push/PR
     const commitHash = commitInWorktree(worktree, `feat(${entry.id}): implement story`);
     pushWorktree(worktree);

     // 5. Cleanup
     removeWorktree(worktree);

     return true;
   }
   ```

3. **Atualizar `config.ts`:**
   ```typescript
   verifyFix: {
     enabled: boolean,        // default: true
     maxAttempts: number,     // default: 3
     maxTurnsPerFix: number,  // default: 30
     runQACheck: boolean,     // default: true
   }
   ```

4. **Atualizar `StoryEntry`:**
   ```typescript
   interface StoryEntry {
     // ... existing fields ...
     verifyAttempts?: number;    // NEW
     verifyPassed?: boolean;     // NEW
     worktreePath?: string;      // NEW
   }
   ```

5. **Atualizar notificações Slack:**
   - `notifyComplete` ganha campo `verifyStatus: "passed" | "failed-committed" | "skipped"`
   - Mensagem de progresso inclui tentativa de fix atual

6. **Testes em `__tests__/verify-fix.test.ts`:**
   - Testar loop com mock de runClaude e execFileSync
   - Testar que para após max attempts
   - Testar que passa na primeira se testes OK

---

## REGRAS DE IMPLEMENTAÇÃO

1. **Leia cada arquivo antes de modificar.** Use Read tool, não assuma o conteúdo.
2. **Testes existentes NÃO podem quebrar.** Rode `npx vitest run` no diretório `scripts/orchestrator/` após cada mudança significativa.
3. **Mantenha `shell: false` em todo spawn/exec.** Zero interpolação de strings em shell.
4. **Mantenha file locking** para qualquer state file (queue, watcher).
5. **Use `execFileSync`** para git/gh commands, nunca `execSync` com template literals.
6. **Exports existentes devem continuar funcionando** — não quebre as assinaturas. Adicione parâmetros opcionais.
7. **git.ts original continua existindo** — worktree.ts é um módulo ADICIONAL. git.ts serve para operações no repo principal (pull, status, etc).
8. **Logger:** Use `logger.info/warn/error` em vez de `console.log`.
9. **Slack:** Notifique progresso em cada etapa significativa.
10. **Config Zod:** Novos campos de config DEVEM ter schema Zod e defaults.

## ORDEM DE EXECUÇÃO

1. Adicionar campos de config (`worktree`, `verifyFix`) no `config.ts`
2. Criar `worktree.ts` com todas as operações
3. Atualizar `claude-runner.ts` para aceitar `cwd`
4. Atualizar `story-queue.ts` com worktree + verify-fix loop
5. Atualizar `orchestrator.ts` (executeStory, executeQuickFix, executePlan)
6. Criar testes: `__tests__/worktree.test.ts`, `__tests__/verify-fix.test.ts`
7. Rodar `npx vitest run` — todos os testes devem passar (existentes + novos)
8. Reportar resultado final

## RESULTADO ESPERADO

Após implementação:
- Story queue cria **worktree isolado** para cada story (não muda branch do repo principal)
- Após implementação, roda **verify-fix loop** automaticamente (teste → fix → re-teste, max 3x)
- Tudo passa nos testes (`npx vitest run` no diretório `scripts/orchestrator/`)
- Slack recebe notificações de cada etapa do verify-fix loop
- Config validada com Zod incluindo novos campos `worktree` e `verifyFix`
