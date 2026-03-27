---
story_key: bmad-orchestrator-v3-fixes
epic: orchestrator
story_id: orch-fixes
status: pending
created: 2026-03-27
updated: 2026-03-27
---

# Story: BMAD Orchestrator v3 — Critical Fixes (QA Review)

## Story
As a **developer running 71 stories over 28h**,
I want the BMAD Orchestrator v3 to be free of race conditions, broken regexes, and CI loop bugs,
So that the queue completes reliably without destroying state, triggering false CI fixes, or getting stuck.

## Context — What was reviewed

QA Review completo foi executado sobre os 17 arquivos do `scripts/orchestrator/`. Todos os
bugs abaixo foram identificados por análise estática + rastreamento de fluxo. Os 3 P0s são
reproduzíveis em uso normal e devem ser corrigidos antes de qualquer execução de produção.

---

## Acceptance Criteria

### P0 — Bloqueantes

- **AC1:** `runQueue()` possui guard global `queueIsRunning`: se já estiver rodando, a segunda
  chamada notifica "Queue já está rodando" e retorna sem destruir o estado nem criar runner duplo.

- **AC2:** `buildQueue()` sem argumentos inclui arquivos com prefix `bmad-` (regex atualizado para
  `/^(a\d|b\d|c\d|v2-|bmad-)/`).

- **AC3:** `monitorAndFixCI` não despacha agente de fix quando `ciStatus === "pending"` (timeout
  de polling). Guard explícito adicionado antes do `logger.warn`.

### P1 — Importantes

- **AC4:** `parseCommand` catch fallback retorna `{ mode: "chat", target: input }` em vez de
  `"quickfix"`.

- **AC5:** Comando `retry` via Slack/CLI chama `runQueue()` automaticamente após resetar a story
  (se a queue não estiver ativa), com notificação "retentando + reiniciando queue".

- **AC6:** `executeFullBmadFlow` verifica `pmResult.exitCode` e `archResult.exitCode` e
  `smResult.exitCode` — se qualquer step retornar `exitCode !== 0`, o pipeline lança erro com
  mensagem clara em vez de continuar com output corrompido.

- **AC7:** `checkAllRules` no watcher possui in-flight guard (`isCheckingRules`): se uma
  execução ainda está ativa quando o interval dispara, a nova execução é descartada com log de
  aviso.

- **AC8:** CI fix prompt inclui instrução para usar `withGitMutex` / instrução sequencial —
  **ou** o prompt instrui Claude a não fazer `git push` diretamente e sim reportar a correção
  para que o orquestrador faça o push via `withGitMutex`. *(Ver nota técnica abaixo.)*

### P2 — Melhorias

- **AC9:** `getProjectContext()` envolto em try/catch, retorna string vazia em vez de lançar
  exceção se o arquivo não existir.

- **AC10:** `quickParse` testes no `orchestrator.test.ts` cobrem: `retry a0-1`, `skip b1-2`,
  `retentar a0-1`, `pular b1-2`, `smoke`, e confirmam que retornam `null` para: `"oi"`,
  `"implementa story 1.1"`, `"cria spec"`.

- **AC11:** `resolveClaudePath` em `claude-runner.ts` usa `shell: false` + busca manual no
  PATH para eliminar DEP0190 warning (ou documenta por que é necessário e suprime apenas o
  warning de teste).

- **AC12:** `start-orchestrator.bat` re-executa as verificações de dependência (node, claude,
  gh) a cada reinicialização (mover os checks para dentro do loop `:start`).

- **AC13:** `story-queue.ts` exporta `queueIsRunning` getter para uso em testes.

---

## Tasks / Subtasks

### Task 1: [P0] Guard contra double `runQueue()` launch

- [ ] 1.1 Em `scripts/orchestrator/story-queue.ts`, adicionar variável de módulo:
  ```typescript
  let queueIsRunning = false;
  export function isQueueRunning(): boolean { return queueIsRunning; }
  ```
- [ ] 1.2 No início de `runQueue()`, antes de `recoverCrashedEntries()`:
  ```typescript
  export async function runQueue(): Promise<void> {
    if (queueIsRunning) {
      logger.warn("runQueue called while already running — ignoring");
      await notify("⚠️ Queue já está rodando. Aguarde a conclusão ou envie 'status'.");
      return;
    }
    queueIsRunning = true;
    try {
      // ... corpo existente ...
    } finally {
      queueIsRunning = false;
    }
  }
  ```
- [ ] 1.3 Em `orchestrator.ts`, no handler `mode === "queue"` (target `"resume"`), substituir
  `runQueue().catch(...)` por chamada que verifica `isQueueRunning()` antes:
  ```typescript
  if (!isQueueRunning()) {
    runQueue().catch((e: Error) => notify(`❌ Queue error: ${e.message}`));
  } else {
    await notify("▶️ Queue já está ativa — processamento continuando.");
  }
  ```
- [ ] 1.4 Mesmo check no target padrão ("start") do handler `mode === "queue"`.

### Task 2: [P0] Corrigir regex `buildQueue` para incluir `bmad-` prefix

- [ ] 2.1 Em `scripts/orchestrator/story-queue.ts`, linha ~196, alterar:
  ```typescript
  // ANTES:
  files = readdirSync(specsDir).filter((f) => /^(a\d|b\d|c\d|v2-)/.test(f) && f.endsWith(".md")).sort();
  // DEPOIS:
  files = readdirSync(specsDir).filter((f) => /^(a\d|b\d|c\d|v2-|bmad-)/.test(f) && f.endsWith(".md")).sort();
  ```
- [ ] 2.2 Adicionar teste em `__tests__/story-queue.test.ts` que mocka `readdirSync` retornando
  `["bmad-feat-1.md", "a0-1.md", "other.txt"]` e verifica que `buildQueue()` inclui ambos os
  `.md` válidos e exclui `other.txt`.

### Task 3: [P0] Fix CI feedback loop — guard para `ciStatus === "pending"`

- [ ] 3.1 Em `scripts/orchestrator/story-queue.ts`, função `monitorAndFixCI`, após o polling
  loop (após `break` do inner for), adicionar antes das guards existentes:
  ```typescript
  // ANTES:
  if (ciStatus === "success") return { fixed: true, attempts: attempt };
  if (ciStatus === "unknown") return { fixed: false, attempts: 0 };
  logger.warn(`CI failed for PR #${prNumber}...`);

  // DEPOIS:
  if (ciStatus === "success") return { fixed: true, attempts: attempt };
  if (ciStatus === "unknown") return { fixed: false, attempts: 0 };
  if (ciStatus === "pending") {
    logger.warn(`CI still pending after polling timeout for PR #${prNumber} — skipping fix`);
    await notify(`⏳ *CI ainda rodando* para PR #${prNumber} após 10min de polling. Verifique manualmente.`);
    return { fixed: false, attempts: attempt };
  }
  // só chega aqui se ciStatus === "failure"
  logger.warn(`CI failed for PR #${prNumber}...`);
  ```
- [ ] 3.2 Adicionar teste em `__tests__/verify-fix.test.ts` (ou novo arquivo
  `__tests__/ci-monitor.test.ts`) que simula 20 polls com CI ainda `"QUEUED"` e verifica que
  a função retorna `{fixed: false}` sem chamar `runClaude`.

### Task 4: [P1] Fix `parseCommand` fallback para `chat`

- [ ] 4.1 Em `scripts/orchestrator/orchestrator.ts`, linha ~148:
  ```typescript
  // ANTES:
  } catch {
    return { mode: "quickfix", target: input };
  }
  // DEPOIS:
  } catch {
    logger.warn("parseCommand JSON parse failed — falling back to chat", { input: input.slice(0, 80) });
    return { mode: "chat", target: input };
  }
  ```
- [ ] 4.2 Adicionar ao `orchestrator.test.ts`: teste que passa string malformada para
  `parseCommand` mockando `runClaude` para retornar output sem JSON válido, e verifica retorno
  `{mode: "chat"}`.

### Task 5: [P1] `retry` via Slack reinicia a queue automaticamente

- [ ] 5.1 Em `scripts/orchestrator/orchestrator.ts`, handler `retry:`:
  ```typescript
  // ANTES:
  if (target.startsWith("retry:")) {
    const storyId = target.slice(6);
    const ok = retryStory(storyId);
    await notify(ok ? `🔄 Story *${storyId}* resetada para retry.` : `❌ Story *${storyId}* não encontrada ou não retryable.`);
    return;
  }

  // DEPOIS:
  if (target.startsWith("retry:")) {
    const storyId = target.slice(6);
    const ok = retryStory(storyId);
    if (!ok) {
      await notify(`❌ Story *${storyId}* não encontrada ou não está em estado retryable (failed/stuck).`);
      return;
    }
    await notify(`🔄 Story *${storyId}* resetada para retry.`);
    if (!isQueueRunning()) {
      await notify(`🚀 Reiniciando queue para processar retry...`);
      runQueue().catch((e: Error) => notify(`❌ Queue error no retry: ${e.message}`));
    } else {
      await notify(`_Queue já está rodando — story será processada no próximo ciclo._`);
    }
    return;
  }
  ```

### Task 6: [P1] `executeFullBmadFlow` — verificar exitCode em todos os steps

- [ ] 6.1 Em `scripts/orchestrator/orchestrator.ts`, após cada `await runClaude(...)` dos steps
  PM, Architect, SM, QA no `executeFullBmadFlow`, adicionar:
  ```typescript
  // Após pmResult:
  if (pmResult.exitCode !== 0) {
    if (pmResult.isRateLimited) throw new Error("RATE_LIMITED: Claude rate limited during PM step");
    throw new Error(`PM step failed (exit ${pmResult.exitCode}): ${pmResult.output.slice(-300)}`);
  }
  ```
  Repetir para `archResult`, `smResult`, `qaResult` com os respectivos step names.

- [ ] 6.2 Remover o padrão `if (!existsSync(path)) writeFileSync(path, result.output)` para
  PM e Architect — se o arquivo não foi criado pelo Claude, o step falhou. Substituir por:
  ```typescript
  if (!existsSync(pmPath)) {
    throw new Error(`PM agent did not produce brief at expected path: ${pmPath}`);
  }
  ctx.pmBrief = readFileSync(pmPath, "utf-8");
  ```

### Task 7: [P1] Watcher — in-flight guard em `checkAllRules`

- [ ] 7.1 Em `scripts/orchestrator/watcher.ts`, adicionar variável de módulo:
  ```typescript
  let isCheckingRules = false;
  ```
- [ ] 7.2 No início de `checkAllRules`:
  ```typescript
  async function checkAllRules(): Promise<void> {
    if (isCheckingRules) {
      logger.debug("checkAllRules already in flight — skipping this tick");
      return;
    }
    isCheckingRules = true;
    try {
      // ... corpo existente ...
    } finally {
      isCheckingRules = false;
    }
  }
  ```

### Task 8: [P2] `getProjectContext()` — try/catch

- [ ] 8.1 Em `scripts/orchestrator/orchestrator.ts`:
  ```typescript
  function getProjectContext(): string {
    try {
      const sprintSpec = readFileSync(join(config.projectRoot, config.paths.sprintSpec), "utf-8");
      return sprintSpec.slice(0, 8000);
    } catch {
      logger.warn("Sprint spec not found — continuing without project context");
      return "";
    }
  }
  ```

### Task 9: [P2] Adicionar testes faltantes em `quickParse`

- [ ] 9.1 Em `scripts/orchestrator/__tests__/orchestrator.test.ts`, adicionar describe block:
  ```typescript
  it("should parse retry commands (EN + PT-BR)", () => {
    expect(quickParse("retry a0-1")).toEqual({ mode: "queue", target: "retry:a0-1" });
    expect(quickParse("retentar a0-1")).toEqual({ mode: "queue", target: "retry:a0-1" });
    expect(quickParse("refazer b1-2")).toEqual({ mode: "queue", target: "retry:b1-2" });
  });

  it("should parse skip commands (EN + PT-BR)", () => {
    expect(quickParse("skip a0-1")).toEqual({ mode: "queue", target: "skip:a0-1" });
    expect(quickParse("pular b1-2")).toEqual({ mode: "queue", target: "skip:b1-2" });
  });

  it("should parse smoke commands", () => {
    expect(quickParse("smoke")).toEqual({ mode: "smoke", target: "" });
    expect(quickParse("smoke test")).toEqual({ mode: "smoke", target: "" });
    expect(quickParse("testar pipeline")).toEqual({ mode: "smoke", target: "" });
  });
  ```

### Task 10: [P2] Fix `start-orchestrator.bat` — mover checks para dentro do loop

- [ ] 10.1 Reestruturar o `.bat` para que as verificações de `node`, `claude`, `gh`, `.env` e
  `node_modules` rodem a cada restart, não apenas no primeiro boot:
  ```bat
  @echo off
  title BMAD Orchestrator
  cd /d "%~dp0"

  :start
  echo ========================================
  echo   BMAD Orchestrator - Taverna do Mestre
  echo ========================================
  echo.
  echo Verificando dependencias...
  where node >nul 2>&1 || (echo ERRO: Node.js nao encontrado! & timeout /t 5 & goto start)
  where claude >nul 2>&1 || (echo ERRO: Claude CLI nao encontrado! & timeout /t 5 & goto start)
  where gh >nul 2>&1 || echo AVISO: GitHub CLI nao encontrado - PRs nao serao criados
  if not exist ".env" (echo ERRO: .env nao encontrado! & timeout /t 10 & goto start)
  if not exist "node_modules" (echo Instalando dependencias... & npm install)
  echo.
  echo Iniciando...
  npx tsx slack-bot.ts
  echo.
  echo Orchestrator parou. Reiniciando em 10s...
  timeout /t 10 /nobreak
  goto :start
  ```

---

## Dev Notes

### Arquitetura: por que `queueIsRunning` e não `isProcessing`

O `isProcessing` em `orchestrator.ts` é liberado imediatamente após `runQueue()` ser disparado
(fire-and-forget). A função retorna para o caller do Slack enquanto a queue roda em background.
Por isso é necessário um guard separado **no próprio `runQueue()`** — é a única entidade que sabe
se está rodando.

### AC8 — CI fix push sem `gitRemoteMutex`

O prompt do CI fix instrui Claude a fazer `git push` diretamente. Isso não passa pelo
`withGitMutex`. A solução mais simples (sem refatorar a arquitetura): adicionar ao prompt:

```
4. Stage and commit: git add -A && git commit -m "fix: resolve CI failure"
   IMPORTANT: Do NOT push. Report the changes and stop — the orchestrator will push via
   its own git serializer.
```

E no `monitorAndFixCI`, após `runClaude` retornar, fazer o push explicitamente:
```typescript
await runClaude({ prompt: `...4. Stage and commit... IMPORTANT: Do NOT push...` });
// Push via mutex after Claude commits:
try {
  await withGitMutex(() => pushWorktree(worktree));
} catch (e) {
  logger.warn(`CI fix push failed: ${e}`);
}
```

### Nota sobre stuck detector (P1 arquitetural — fora do escopo deste story)

O stuck detector não funciona porque `executeStorySpec` nunca persiste status para disco
durante a execução. Corrigir isso requereria adicionar `loadAndSave` calls dentro de
`executeStorySpec` a cada mudança de status — o que introduziria locks frequentes. Isso é
uma refatoração maior e está documentado como technical debt para v3.1. **NÃO incluir neste story.**

### Imports necessários

Em `orchestrator.ts`, verificar se `isQueueRunning` está importado de `story-queue.js`:
```typescript
import { runQueue, pauseQueue, resumeQueue, getQueueStatus, buildQueue,
         retryStory, skipStory, isQueueRunning } from "./story-queue.js";
```

### Ordem de implementação recomendada

1. Task 2 (regex — menor, sem efeitos colaterais)
2. Task 3 (CI guard — sem efeitos colaterais)
3. Task 1 (guard de double-launch — afeta orchestrator.ts também)
4. Task 5 (retry + restart — depende de Task 1 para `isQueueRunning`)
5. Task 6 (exitCode checks — pode quebrar testes existentes de mock)
6. Task 7 (watcher guard — isolado)
7. Tasks 4, 8, 9, 10 (sem dependências entre si)

### Executar testes após cada task

```bash
cd scripts/orchestrator
npx tsc --noEmit         # deve passar sem erros
npx vitest run           # 61+ tests devem passar (número aumenta com novas tasks)
```

### Arquivos a NÃO modificar

- `scripts/orchestrator/semaphore.ts` — correto, sem alterações
- `scripts/orchestrator/git-mutex.ts` — correto, sem alterações
- `scripts/orchestrator/logger.ts` — correto, sem alterações
- `scripts/orchestrator/agents.ts` — correto, sem alterações
- `scripts/orchestrator/slack.ts` — correto, sem alterações
- `scripts/orchestrator/worktree.ts` — correto, sem alterações
- `scripts/orchestrator/config.ts` — correto, sem alterações

---

## File List

- `scripts/orchestrator/story-queue.ts` (modified — Tasks 1, 2, 3)
- `scripts/orchestrator/orchestrator.ts` (modified — Tasks 1, 4, 5, 6, 8)
- `scripts/orchestrator/watcher.ts` (modified — Task 7)
- `scripts/orchestrator/start-orchestrator.bat` (modified — Task 10)
- `scripts/orchestrator/__tests__/story-queue.test.ts` (modified — Task 2)
- `scripts/orchestrator/__tests__/orchestrator.test.ts` (modified — Tasks 4, 9)
- `scripts/orchestrator/__tests__/ci-monitor.test.ts` (created — Task 3)

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-27 | Story created from QA review findings (P0×3, P1×5, P2×5) |
