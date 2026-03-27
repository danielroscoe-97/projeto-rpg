/**
 * BMAD Orchestrator — Main Entry Point
 *
 * Autonomous development orchestrator that:
 * - Reads BMAD agent definitions & sprint specs
 * - Interprets natural language commands (text or audio)
 * - Delegates work to Claude Code CLI (uses Max plan, zero API cost)
 * - Manages git workflow (branch → commit → push → PR)
 * - Notifies via Slack and escalates when needed
 *
 * Usage:
 *   npx tsx scripts/orchestrator/orchestrator.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getAgent, buildAgentPrompt, getToolsForAgent } from "./agents.js";
import { config } from "./config.js";
import { runClaude } from "./claude-runner.js";
import { logger } from "./logger.js";
import {
  notify,
  notifyPRReady,
  notifyStatus,
  notifyComplete,
  notifyError,
} from "./slack.js";
import * as git from "./git.js";
import {
  createWorktree,
  removeWorktree,
  commitInWorktree,
  pushWorktree,
  createPRFromWorktree,
  getChangedFilesInWorktree,
} from "./worktree.js";
import { verifyAndFix } from "./story-queue.js";
import { runQueue, pauseQueue, resumeQueue, getQueueStatus, buildQueue, retryStory, skipStory } from "./story-queue.js";
import {
  startWatcher,
  stopWatcher,
  addRule,
  listRules,
  clearRules,
  parseWatchCommand,
  setCommandHandler,
} from "./watcher.js";

// -- Types --

type OrchestratorMode =
  | "sprint"
  | "story"
  | "quickfix"
  | "spec"
  | "qa"
  | "fix"
  | "status"
  | "stop"
  | "chat"
  | "plan"
  | "watch"
  | "queue"
  | "smoke"
  | "bmad"
  | "idle";

interface TaskContext {
  mode: OrchestratorMode;
  target: string;
  startedAt: Date;
  branchName?: string;
}

// -- State --

let currentTask: TaskContext | null = null;
let shouldStop = false;
let isProcessing = false; // Concurrency lock for all entry points

// -- Core Orchestrator --

/**
 * Quick local parse for known commands (no Claude needed).
 */
export function quickParse(input: string): { mode: OrchestratorMode; target: string } | null {
  const lower = input.toLowerCase().trim();
  if (lower === "status" || lower === "qual o status" || lower.includes("status da queue")) return { mode: "status", target: "queue" };
  if (lower === "para tudo" || lower === "stop" || lower === "parar") return { mode: "stop", target: "" };
  if (lower.includes("rodar queue") || lower.includes("iniciar queue") || lower.includes("comece a implementar") || lower.includes("implementar tudo")) return { mode: "queue", target: "start" };
  if (lower.includes("pausar") || lower.includes("pause queue")) return { mode: "queue", target: "pause" };
  if (lower.includes("retomar") || lower.includes("resume queue")) return { mode: "queue", target: "resume" };
  if (lower === "smoke" || lower === "smoke test" || lower.includes("pre-flight") || lower.includes("testar pipeline")) return { mode: "smoke", target: "" };
  const retryMatch = lower.match(/^(?:retry|retentar|refazer)\s+(\S+)/);
  if (retryMatch) return { mode: "queue", target: `retry:${retryMatch[1]}` };
  const skipMatch = lower.match(/^(?:skip|pular)\s+(\S+)/);
  if (skipMatch) return { mode: "queue", target: `skip:${skipMatch[1]}` };
  return null;
}

/**
 * Parse a natural language command into a mode + target.
 */
export async function parseCommand(input: string): Promise<{
  mode: OrchestratorMode;
  target: string;
}> {
  const result = await runClaude({
    prompt: `You are a command parser. Given the user's message in Brazilian Portuguese or English, extract the intent.

Return ONLY a JSON object with two fields:
- "mode": one of "sprint", "story", "quickfix", "spec", "qa", "fix", "status", "stop", "chat", "plan", "watch"
- "target": the specific target (sprint number, story ID, bug description, etc.)

Rules:
- "roda o sprint 1" → {"mode": "sprint", "target": "1"}
- "implementa a story 1.1" → {"mode": "story", "target": "1.1"}
- "arruma o bug do player lobby" → {"mode": "quickfix", "target": "bug do player lobby - catch vazio"}
- "cria spec pra notificação de turno" → {"mode": "spec", "target": "notificação de turno do jogador"}
- "roda QA na story 1.1" → {"mode": "qa", "target": "1.1"}
- "qual o status?" → {"mode": "status", "target": ""}
- "para tudo" → {"mode": "stop", "target": ""}
- "oi" or greetings or questions or conversation → {"mode": "chat", "target": "the full message"}
- Complex ideas with multiple features, long descriptions, or full workflow requests → {"mode": "plan", "target": "the full message"}
- "quando as specs ficarem prontas comece a codar" or "acompanha o sprint" or "watch" → {"mode": "watch", "target": "the full message"}
- "lista as regras" or "quais watches" → {"mode": "watch", "target": "list"}
- "roda o pipeline bmad pra X" or "executa o fluxo completo pra X" or "faz tudo pra X" → {"mode": "bmad", "target": "X"}
- If user describes a complete feature and wants end-to-end (spec + dev + QA) → use "bmad"
- "para de acompanhar" or "remove watches" → {"mode": "watch", "target": "clear"}
- If it's a question about the project, a greeting, or general conversation → use "chat"
- Only use "quickfix" if the user clearly describes a specific bug to fix
- Use "plan" when the user describes something complex that needs to be broken down

User message: ${input}`,
    allowedTools: [],
    maxTurns: 1,
    model: config.agent.models.parsing,
  });

  try {
    const parsed = JSON.parse(
      result.output.match(/\{[\s\S]*\}/)?.[0] || "{}"
    );
    return {
      mode: parsed.mode || "idle",
      target: parsed.target || "",
    };
  } catch {
    return { mode: "quickfix", target: input };
  }
}

/**
 * Build the project context string for prompts.
 */
function getProjectContext(): string {
  const sprintSpec = readFileSync(
    join(config.projectRoot, config.paths.sprintSpec),
    "utf-8"
  );
  return sprintSpec.slice(0, 8000);
}

/**
 * Execute a sprint — runs all stories in sequence.
 */
async function executeSprint(sprintNumber: string): Promise<void> {
  await notify(`🏃 Iniciando Sprint ${sprintNumber}...`);

  const result = await runClaude({
    prompt: `You are the BMAD Sprint Orchestrator. Execute Sprint ${sprintNumber}.

## Instructions

1. Read the sprint spec at docs/epics-and-sprints-spec.md
2. Read the PRD at docs/prd-v2.md for context
3. Read _bmad-output/project-context.md for implementation rules
4. For EACH story in Sprint ${sprintNumber}, in order:
   a. Create a git branch: feat/story-{id}-{slug}
   b. Implement the story following its acceptance criteria
   c. Write tests for all new code
   d. Run tests (npm test) — fix if failing
   e. Commit all changes with a descriptive message
   f. Report what was done before moving to next story
5. After ALL stories are done, report a summary

## Escalation Rules
- If you need to modify files in: ${config.escalation.criticalPaths.join(", ")} → stop and report
- If you need to add a new dependency → stop and report
- For all implementation decisions → proceed autonomously

## Important
- Follow existing code patterns in the project
- All UI strings in messages/pt-BR.json and messages/en.json
- Never hardcode text in components
- Sanitize all broadcast data for players (anti-metagaming)
- Tests required for new code (Jest + React Testing Library)`,
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    maxTurns: config.agent.maxTurnsPerStory * 5,
    model: config.agent.models.orchestrator,
  });

  await notifyComplete({
    task: `Sprint ${sprintNumber}`,
    duration: getElapsed(),
    filesChanged: git.getChangedFiles().length,
    testsStatus: result.exitCode === 0 ? "Passed" : "Check logs",
  });
}

/**
 * Execute a single story using an isolated worktree.
 */
async function executeStory(storyId: string): Promise<void> {
  const worktree = createWorktree(storyId, `story-${storyId}`);
  if (currentTask) currentTask.branchName = worktree.branch;

  await notify(`📋 Implementando Story ${storyId} na branch \`${worktree.branch}\`...\n_Worktree: ${worktree.path}_`);

  try {
    const result = await runClaude({
      prompt: `You are a senior developer implementing Story ${storyId}.

## Instructions

1. Read the sprint spec at docs/epics-and-sprints-spec.md — find Story ${storyId}
2. Read the PRD at docs/prd-v2.md for full context
3. Read _bmad-output/project-context.md for implementation rules
4. Implement the story following ALL acceptance criteria
5. Write tests for all new code
6. Run npm test — ensure all tests pass
7. When done, report what was implemented and what files changed

## Escalation Rules
- If you need to modify files in: ${config.escalation.criticalPaths.join(", ")} → stop and explain why
- If you need to add a new dependency → stop and explain why
- For all implementation decisions → proceed autonomously

## Important
- Follow existing code patterns in the project
- All UI strings in messages/pt-BR.json and messages/en.json
- Never hardcode text in components
- Sanitize all broadcast data for players`,
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
      maxTurns: config.agent.maxTurnsPerStory,
      model: config.agent.models.dev,
      cwd: worktree.path,
    });

    // Verify-Fix Loop
    const specContent = `Story ${storyId} implementation`;
    const verification = await verifyAndFix(worktree, specContent);

    // Commit in worktree
    const filesChanged = getChangedFilesInWorktree(worktree).length;
    const verifyTag = verification.passed ? "" : " [NEEDS-REVIEW]";
    const commitHash = commitInWorktree(worktree, `feat(story-${storyId}): implement story${verifyTag}`);

    if (commitHash !== "no-changes") {
      pushWorktree(worktree);
      const pr = createPRFromWorktree(
        worktree,
        `feat(story-${storyId}): implement story`,
        `## Story ${storyId}\n\n${result.output.slice(0, 500)}\n\n### Verificação\n${verification.passed ? "✅ Passou" : "⚠️ NEEDS REVIEW"}\n\n🤖 Generated by BMAD Orchestrator`
      );

      if (pr.number) {
        await notifyPRReady({
          number: pr.number,
          title: `Story ${storyId}`,
          url: pr.url,
          story: storyId,
          summary: result.output.slice(0, 200),
        });
      }
    }

    await notifyComplete({
      task: `Story ${storyId}`,
      duration: getElapsed(),
      filesChanged,
      testsStatus: verification.passed ? "Passed" : "Failed (committed for review)",
    });
  } finally {
    if (config.worktree.cleanupOnSuccess) {
      try { removeWorktree(worktree); } catch (e) { logger.warn("Worktree cleanup failed", { error: String(e) }); }
    }
  }
}

/**
 * Execute a quick fix using an isolated worktree.
 */
async function executeQuickFix(description: string): Promise<void> {
  const slug = description.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const worktree = createWorktree("fix", `fix-${slug}`);
  if (currentTask) currentTask.branchName = worktree.branch;

  await notify(`🔧 Quick fix: ${description}...\n_Worktree: ${worktree.path}_`);

  try {
    const result = await runClaude({
      prompt: `You are a senior developer fixing an issue.

## Issue
${description}

## Instructions
1. Read _bmad-output/project-context.md for project rules
2. Find the relevant code
3. Fix the issue
4. Write/update tests
5. Run npm test — ensure all tests pass
6. Report what you changed

## Escalation
- If the fix requires architecture changes → stop and explain
- If the fix touches auth/security code → stop and explain
- For straightforward fixes → proceed autonomously`,
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
      maxTurns: config.agent.maxTurnsPerQuickFix,
      model: config.agent.models.quickfix,
      cwd: worktree.path,
    });

    const filesChanged = getChangedFilesInWorktree(worktree).length;
    const commitHash = commitInWorktree(worktree, `fix: ${description.slice(0, 50)}`);

    if (commitHash !== "no-changes") {
      pushWorktree(worktree);
      const pr = createPRFromWorktree(
        worktree,
        `fix: ${description.slice(0, 60)}`,
        `## Quick Fix\n\n${description}\n\n${result.output.slice(0, 500)}\n\n🤖 Generated by BMAD Orchestrator`
      );

      if (pr.number) {
        await notifyPRReady({
          number: pr.number,
          title: description.slice(0, 60),
          url: pr.url,
          story: "quick-fix",
          summary: result.output.slice(0, 200),
        });
      }
    }

    await notifyComplete({
      task: `Fix: ${description.slice(0, 40)}`,
      duration: getElapsed(),
      filesChanged,
      testsStatus: result.exitCode === 0 ? "Passed" : "Check logs",
    });
  } finally {
    if (config.worktree.cleanupOnSuccess) {
      try { removeWorktree(worktree); } catch (e) { logger.warn("Worktree cleanup failed", { error: String(e) }); }
    }
  }
}

/**
 * Create a spec for a new feature.
 */
async function executeSpec(description: string): Promise<void> {
  await notify(`📝 Criando spec: ${description}...`);

  await runClaude({
    prompt: `You are a Product Manager and Architect working together.

## Task
Create a detailed technical specification for: ${description}

## Instructions
1. Read docs/prd-v2.md for product context
2. Read docs/epics-and-sprints-spec.md for existing stories
3. Read _bmad-output/project-context.md for technical constraints
4. Create a spec file at docs/quick-specs/{slug}.md with:
   - User story
   - Acceptance criteria
   - Technical approach
   - Files to modify
   - Dependencies
   - Estimated effort
5. Report what you created

## Format
Follow the same format as existing specs in docs/quick-specs/`,
    allowedTools: ["Read", "Glob", "Grep", "Write"],
    maxTurns: config.agent.maxTurnsPerSpec,
    model: config.agent.models.spec,
  });

  await notifyComplete({
    task: `Spec: ${description}`,
    duration: getElapsed(),
    filesChanged: 1,
    testsStatus: "N/A (spec only)",
  });
}

/**
 * Run QA review on a story.
 */
async function executeQA(storyId: string): Promise<void> {
  await notify(`🧪 QA review: Story ${storyId}...`);

  const result = await runClaude({
    prompt: `You are a QA Engineer. Review Story ${storyId}.

## Instructions
1. Read docs/epics-and-sprints-spec.md — find Story ${storyId} acceptance criteria
2. Read the implementation (find changed files via git diff)
3. Run npm test
4. Check each acceptance criterion:
   - Is it implemented? yes or no
   - Is it tested? yes or no
   - Edge cases covered? yes or no
5. Check for:
   - Security issues (XSS, injection, data leaks to players)
   - i18n missing (hardcoded strings)
   - Accessibility issues
   - Missing error handling
6. Report findings as a structured QA report

## Output
Create a QA report with pass/fail per acceptance criterion.`,
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    maxTurns: config.agent.maxTurnsPerQA,
    model: config.agent.models.qa,
  });

  await notify(`🧪 QA Report — Story ${storyId}:\n${result.output.slice(0, 1500)}`);
}

/**
 * Full BMAD workflow — takes a complex idea and:
 * 1. Creates a spec
 * 2. Implements stories
 * 3. Runs QA
 * 4. Creates PR
 */
async function executePlan(description: string): Promise<void> {
  await notify(`🧠 Recebi uma ideia complexa. Vou analisar e montar um plano completo...\n\n_"${description.slice(0, 200)}..."_`);

  // Create worktree for plan execution
  const slug = description.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const worktree = createWorktree("plan", `plan-${slug}`);
  if (currentTask) currentTask.branchName = worktree.branch;

  try {
    // Step 1: Create spec
    await notify("📝 **Passo 1/4** — Criando especificação técnica...");
    const specResult = await runClaude({
      prompt: `Você é um Product Manager e Architect trabalhando juntos.

## Ideia do Usuário
${description}

## Instruções
1. Leia docs/prd-v2.md para contexto do produto
2. Leia docs/epics-and-sprints-spec.md para stories existentes
3. Leia _bmad-output/project-context.md para regras técnicas
4. Analise a ideia e crie um plano de implementação
5. Crie um arquivo de spec em docs/quick-specs/ com:
   - Resumo da ideia
   - User stories derivadas
   - Acceptance criteria para cada story
   - Approach técnico
   - Arquivos a modificar
   - Dependências entre stories
   - Estimativa de esforço
6. Retorne o caminho do arquivo criado e um resumo das stories

## Formato
Siga o mesmo formato das specs existentes em docs/quick-specs/
Nomeie o arquivo com um slug descritivo.`,
      allowedTools: ["Read", "Glob", "Grep", "Write"],
      maxTurns: config.agent.maxTurnsPerSpec,
      model: config.agent.models.orchestrator,
      cwd: worktree.path,
    });

    await notify(`📝 Spec criada!\n${specResult.output.slice(0, 800)}`);

    // Step 2: Implement
    await notify("💻 **Passo 2/4** — Implementando stories do plano...");
    const implResult = await runClaude({
      prompt: `Você é um senior developer. Acabei de criar uma spec com stories para implementar.

## Contexto
${specResult.output.slice(0, 2000)}

## Instruções
1. Leia a spec que foi criada em docs/quick-specs/ (a mais recente)
2. Leia _bmad-output/project-context.md para regras do projeto
3. Para CADA story na spec, em ordem:
   a. Implemente seguindo os acceptance criteria
   b. Escreva testes para o código novo
   c. Rode npm test — corrija se falhar
   d. Faça git add e commit com mensagem descritiva
4. Reporte o que foi implementado

## Regras
- Siga os padrões existentes do projeto
- Todas as strings de UI em messages/pt-BR.json e messages/en.json
- Nunca hardcode texto em componentes
- Sanitize dados de broadcast para jogadores
- Testes obrigatórios (Jest + React Testing Library)`,
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
      maxTurns: config.agent.maxTurnsPerStory * 3,
      model: config.agent.models.dev,
      cwd: worktree.path,
    });

    await notify(`💻 Implementação concluída!\n${implResult.output.slice(0, 800)}`);

    // Step 3: QA
    await notify("🧪 **Passo 3/4** — Rodando QA...");
    const qaResult = await runClaude({
      prompt: `Você é um QA Engineer. Revise a implementação que acabou de ser feita.

## Instruções
1. Leia a spec mais recente em docs/quick-specs/
2. Veja os arquivos modificados (git diff)
3. Rode npm test
4. Verifique cada acceptance criterion da spec
5. Cheque: segurança, i18n, acessibilidade, error handling
6. Reporte findings

Se encontrar problemas críticos, corrija-os diretamente.`,
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write"],
      maxTurns: config.agent.maxTurnsPerQA,
      model: config.agent.models.qa,
      cwd: worktree.path,
    });

    await notify(`🧪 QA Report:\n${qaResult.output.slice(0, 800)}`);

    // Step 4: Push and PR
    await notify("🔀 **Passo 4/4** — Criando PR...");

    const filesChanged = getChangedFilesInWorktree(worktree).length;
    const commitHash = commitInWorktree(worktree, `feat: ${description.slice(0, 50)}`);

    if (commitHash !== "no-changes") {
      pushWorktree(worktree);
      const pr = createPRFromWorktree(
        worktree,
        `feat: ${description.slice(0, 60)}`,
        `## Plano Completo\n\n${description.slice(0, 300)}\n\n### O que foi feito\n${implResult.output.slice(0, 500)}\n\n### QA\n${qaResult.output.slice(0, 300)}\n\n🤖 Generated by BMAD Orchestrator`
      );

      if (pr.number) {
        await notifyPRReady({
          number: pr.number,
          title: description.slice(0, 60),
          url: pr.url,
          story: "plan",
          summary: implResult.output.slice(0, 200),
        });
      }
    }

    await notifyComplete({
      task: `Plan: ${description.slice(0, 40)}`,
      duration: getElapsed(),
      filesChanged,
      testsStatus: qaResult.exitCode === 0 ? "Passed" : "Check QA report",
    });
  } finally {
    if (config.worktree.cleanupOnSuccess) {
      try { removeWorktree(worktree); } catch (e) { logger.warn("Worktree cleanup failed", { error: String(e) }); }
    }
  }
}

/**
 * Watch mode — register rules, list, or clear.
 */
async function executeWatch(input: string): Promise<void> {
  const lower = input.toLowerCase();

  if (lower === "list" || lower.includes("lista") || lower.includes("quais")) {
    const rules = listRules();
    if (rules.length === 0) {
      await notify("👁️ Nenhuma regra de watch ativa.");
    } else {
      const list = rules
        .map((r, i) => `${i + 1}. ${r.triggered ? "✅" : "⏳"} ${r.description} → _${r.action}_`)
        .join("\n");
      await notify(`👁️ *Regras de watch:*\n${list}`);
    }
    return;
  }

  if (lower === "clear" || lower.includes("remove") || lower.includes("para de")) {
    clearRules();
    await notify("👁️ Todas as regras de watch removidas.");
    return;
  }

  // Try to parse watch rules — split by ; or • or newlines for multiple
  const parts = input
    .split(/[;•\n]/)
    .map((s) => s.replace(/^[\s\d.]+/, "").trim())
    .filter((s) => s.length > 5);

  const candidates = parts.length > 1 ? parts : [input];
  let registered = 0;

  for (const part of candidates) {
    const rule = parseWatchCommand(part);
    if (rule) {
      addRule(rule);
      registered++;
      await notify(`👁️ *Watch registrado!*\n*Condição:* ${rule.description}\n*Ação:* ${rule.action}`);
    }
  }

  // Handle the complex orchestration request
  if (registered === 0 && (lower.includes("orquest") || lower.includes("acompan") || lower.includes("monitor"))) {
    addRule({
      description: "Quando specs novas aparecerem",
      condition: { type: "specs_ready", sprint: "1", expectedSpecs: [] },
      action: "sprint 1",
    });
    addRule({
      description: "Quando todos os testes passarem",
      condition: { type: "tests_pass" },
      action: "qa story latest",
    });
    addRule({
      description: "Quando não houver PRs abertos",
      condition: { type: "no_open_prs" },
      action: "story next",
    });
    registered = 3;
    await notify(`👁️ *Pipeline completo registrado!*\n⏳ 1. Specs prontas → roda sprint\n⏳ 2. Testes passaram → roda QA\n⏳ 3. Sem PRs abertos → próxima story\n_Checando a cada 15 minutos. Decisões autônomas ativadas._`);
  }

  if (registered === 0) {
    await notify(`👁️ Não consegui entender a regra. Tente:\n• "quando as specs ficarem prontas, comece o sprint 1"\n• "quando os testes passarem, crie o PR"\n• "quando não tiver PR aberto, comece a próxima story"\n\nOu múltiplas separadas por ;`);
  } else if (registered > 1 && !lower.includes("orquest")) {
    await notify(`👁️ *${registered} regras registradas!* Checando a cada 15 minutos.`);
  }
}

/**
 * Smoke test — validates the full pipeline without running a real story.
 * Checks: worktree creation, scoped tests, commit, push, PR creation, cleanup.
 * Run this BEFORE releasing the queue to catch infra issues early.
 */
async function executeSmokeTest(): Promise<void> {
  await notify("🔬 *Smoke test iniciando...* Validando pipeline completo.");
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  let worktree: ReturnType<typeof createWorktree> | null = null;

  try {
    // 1. Worktree creation
    try {
      worktree = createWorktree("smoke-test", "smoke-test");
      checks.push({ name: "Worktree creation", ok: true, detail: worktree.path });
    } catch (e) {
      checks.push({ name: "Worktree creation", ok: false, detail: String(e) });
      throw new Error("Smoke test aborted: cannot create worktree");
    }

    // 2. Scoped test run (should pass since no files changed)
    try {
      const { execFileSync } = await import("child_process");
      // With no changed files, verify should skip tests gracefully
      const result = execFileSync(
        "npx", ["jest", "--passWithNoTests", "--forceExit", "--no-coverage", "--maxWorkers=1", "NONEXISTENT_FILE_SMOKE_TEST"],
        { cwd: worktree.path, encoding: "utf-8", timeout: 30_000, stdio: ["pipe", "pipe", "pipe"] }
      );
      checks.push({ name: "Scoped test run", ok: true, detail: "jest --passWithNoTests works" });
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      // passWithNoTests should exit 0 even with no matching files
      if (err.status === 0 || (err.stdout || "").includes("No tests found")) {
        checks.push({ name: "Scoped test run", ok: true, detail: "No tests found (expected)" });
      } else {
        checks.push({ name: "Scoped test run", ok: false, detail: (err.stderr || err.stdout || String(e)).slice(0, 200) });
      }
    }

    // 3. Commit (create a dummy file, commit, then we'll push)
    try {
      const { writeFileSync: wfs, unlinkSync: uls } = await import("fs");
      const testFile = join(worktree.path, ".smoke-test");
      wfs(testFile, `Smoke test at ${new Date().toISOString()}\n`);
      const hash = commitInWorktree(worktree, "test: smoke test (will be deleted)");
      checks.push({ name: "Git commit", ok: hash !== "no-changes", detail: `hash: ${hash}` });
    } catch (e) {
      checks.push({ name: "Git commit", ok: false, detail: String(e).slice(0, 200) });
    }

    // 4. Push
    try {
      pushWorktree(worktree);
      checks.push({ name: "Git push", ok: true, detail: `branch: ${worktree.branch}` });
    } catch (e) {
      checks.push({ name: "Git push", ok: false, detail: String(e).slice(0, 200) });
    }

    // 5. PR creation (real PR — we'll close it immediately)
    try {
      const pr = createPRFromWorktree(
        worktree,
        "test: smoke test (auto-close)",
        "🔬 Smoke test — validating orchestrator pipeline.\nThis PR will be closed automatically."
      );
      if (pr.number > 0) {
        checks.push({ name: "PR creation", ok: true, detail: `PR #${pr.number}: ${pr.url}` });
        // Close the smoke test PR immediately
        try {
          const { execFileSync } = await import("child_process");
          execFileSync("gh", ["pr", "close", String(pr.number), "--delete-branch"], {
            cwd: config.projectRoot, encoding: "utf-8", timeout: 30_000,
          });
          checks.push({ name: "PR cleanup", ok: true, detail: `PR #${pr.number} closed + branch deleted` });
        } catch (e) {
          checks.push({ name: "PR cleanup", ok: false, detail: String(e).slice(0, 200) });
        }
      } else {
        checks.push({ name: "PR creation", ok: false, detail: "PR number is 0 — creation likely failed silently" });
      }
    } catch (e) {
      checks.push({ name: "PR creation", ok: false, detail: String(e).slice(0, 200) });
    }

  } finally {
    // 6. Cleanup worktree
    if (worktree) {
      try {
        removeWorktree(worktree);
        checks.push({ name: "Worktree cleanup", ok: true, detail: "removed" });
      } catch (e) {
        checks.push({ name: "Worktree cleanup", ok: false, detail: String(e).slice(0, 200) });
      }
    }
  }

  // Report results
  const allPassed = checks.every((c) => c.ok);
  const report = checks
    .map((c) => `${c.ok ? "✅" : "❌"} *${c.name}*: ${c.detail.slice(0, 100)}`)
    .join("\n");

  const summary = allPassed
    ? "🟢 *SMOKE TEST PASSED* — Pipeline está pronto para rodar a queue."
    : "🔴 *SMOKE TEST FAILED* — Corrija os itens acima antes de rodar a queue.";

  await notify(`🔬 *Smoke Test Results:*\n\n${report}\n\n${summary}`);
  logger.info("Smoke test complete", { allPassed, checks });
}

/**
 * Conversational response — answer questions, greetings, project queries.
 */
async function executeChat(input: string): Promise<void> {
  const result = await runClaude({
    prompt: `Você é o BMAD Orchestrator do projeto "Taverna do Mestre" (combat tracker D&D 5e).
Responda em português brasileiro, conciso e útil. Você tem acesso ao codebase.

## Seu Time BMAD (você pode assumir a persona de qualquer um)
- John (📋 PM) — Product Manager, valida PRDs, prioriza features. Fala de forma direta, orientado a dados.
- Mary (📊 Analyst) — Business Analyst, pesquisa mercado, análise competitiva. Animada com descobertas.
- Winston (🏗️ Architect) — System Architect, decisões técnicas, patterns. Calmo e pragmático.
- Amelia (💻 Dev) — Developer, implementa código, testes. Ultra-sucinta, fala em file paths.
- Quinn (🧪 QA) — QA Engineer, testes, coverage. Prática e direta.
- Bob (🏃 SM) — Scrum Master, sprints, stories. Checklist-driven.
- Sally (🎨 UX) — UX Designer, experiência do usuário. Empática, conta histórias.
- Paige (📚 Tech Writer) — Documentação. Paciente, usa analogias.
- Barry (🚀 Quick Flow) — Dev rápido, mínima cerimônia. Direto ao ponto.

Quando o usuário pedir a opinião de um agente específico (ex: "o que o John acha"), assuma a persona dele e responda NO ESTILO dele, lendo os docs relevantes.

Quando pedir party mode ou múltiplas opiniões, responda como 2-3 agentes relevantes, cada um com seu ícone e estilo.

## Docs do projeto
- docs/prd-v2.md (PRD V2 completo)
- docs/epics-and-sprints-spec.md (sprints e stories)
- _bmad-output/project-context.md (regras técnicas)
- _bmad/_config/agent-manifest.csv (agentes completos)

## O que você pode fazer
- Executar sprints e stories
- Quick fixes
- Criar specs
- Rodar QA
- Responder como qualquer agente BMAD
- Analisar código e docs

Mensagem do usuário: ${input}`,
    allowedTools: ["Read", "Glob", "Grep"],
    maxTurns: config.agent.maxTurnsPerChat,
    model: config.agent.models.chat,
  });

  await notify(result.output);
}

// -- Full BMAD Pipeline --

interface BmadFlowContext {
  runId: string;
  runDir: string;
  description: string;
  pmBrief: string;
  architectSpec: string;
  stories: Array<{ id: string; specPath: string }>;
  startedAt: Date;
  stepStatus: Record<string, "pending" | "running" | "done" | "failed">;
}

function initFlowContext(description: string): BmadFlowContext {
  const slug = description.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const runId = `bmad-${slug}-${ts}`;
  const runDir = join(config.projectRoot, config.bmadFlow.runsDir, runId);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(runDir, "stories"), { recursive: true });

  return {
    runId, runDir, description,
    pmBrief: "", architectSpec: "", stories: [],
    startedAt: new Date(),
    stepStatus: { pm: "pending", architect: "pending", sm: "pending", dev: "pending", qa: "pending" },
  };
}

function saveManifest(ctx: BmadFlowContext): void {
  writeFileSync(join(ctx.runDir, "run-manifest.json"), JSON.stringify({
    runId: ctx.runId, description: ctx.description,
    startedAt: ctx.startedAt.toISOString(), updatedAt: new Date().toISOString(),
    stepStatus: ctx.stepStatus, storiesCount: ctx.stories.length,
  }, null, 2));
}

async function executeFullBmadFlow(description: string): Promise<void> {
  const ctx = initFlowContext(description);

  await notify(
    `🚀 *BMAD Pipeline iniciando!*\n\n` +
    `📝 _"${description.slice(0, 200)}"_\n\n` +
    `*Run ID:* ${ctx.runId}\n` +
    `*Passos:* PM → Architect → SM → Dev → QA\n` +
    `_Artifacts em: ${config.bmadFlow.runsDir}/${ctx.runId}_`
  );

  try {
    // ── Step 1: PM ──
    ctx.stepStatus.pm = "running";
    saveManifest(ctx);
    await notify("📋 *[1/5] PM Analysis* — John está analisando a feature...");

    const pmAgent = getAgent("pm");
    if (!pmAgent) throw new Error("PM agent not found in manifest");

    const pmResult = await runClaude({
      prompt: `## Your Task\nAnalyze the following feature request and produce a Product Brief.\n\n## Feature Request\n${description}\n\n## Instructions\n1. Read docs/prd-v2.md for existing product context\n2. Read _bmad-output/project-context.md for project rules\n3. Read docs/epics-and-sprints-spec.md to understand existing features\n4. Produce a Product Brief with:\n   - Problem Statement\n   - User Stories (as a DM/player, I want... so that...)\n   - Acceptance Criteria (testable, specific)\n   - Priority and Dependencies\n   - Out of Scope\n5. Write the brief to: ${ctx.runDir}/01-pm-brief.md\n6. Be specific and actionable.`,
      systemPrompt: buildAgentPrompt(pmAgent),
      allowedTools: getToolsForAgent("pm"),
      maxTurns: config.bmadFlow.maxTurnsPerPm,
      model: config.agent.models.orchestrator,
    });

    const pmPath = join(ctx.runDir, "01-pm-brief.md");
    if (!existsSync(pmPath)) writeFileSync(pmPath, pmResult.output);
    ctx.pmBrief = readFileSync(pmPath, "utf-8");
    ctx.stepStatus.pm = "done";
    saveManifest(ctx);
    await notify(`✅ *PM Brief gerado!*\n${ctx.pmBrief.slice(0, 300)}...`);

    // ── Step 2: Architect ──
    ctx.stepStatus.architect = "running";
    saveManifest(ctx);
    await notify("🏗️ *[2/5] Architecture* — Winston está desenhando a solução técnica...");

    const archAgent = getAgent("architect");
    if (!archAgent) throw new Error("Architect agent not found in manifest");

    const archResult = await runClaude({
      prompt: `## Your Task\nDesign the technical architecture for this feature.\n\n## PM Brief\n${ctx.pmBrief.slice(0, 4000)}\n\n## Instructions\n1. Read _bmad-output/project-context.md for project rules\n2. Explore the codebase structure\n3. Produce a Technical Spec with:\n   - Architecture Overview (components to create/modify)\n   - Data Model Changes (Supabase tables, Zustand stores)\n   - API Changes (routes, middleware)\n   - UI Components\n   - Realtime/Broadcast considerations\n   - Security (anti-metagaming, auth)\n   - Migration plan\n4. Write to: ${ctx.runDir}/02-architect-spec.md\n5. Be precise with file paths.`,
      systemPrompt: buildAgentPrompt(archAgent),
      allowedTools: getToolsForAgent("architect"),
      maxTurns: config.bmadFlow.maxTurnsPerArchitect,
      model: config.agent.models.orchestrator,
    });

    const archPath = join(ctx.runDir, "02-architect-spec.md");
    if (!existsSync(archPath)) writeFileSync(archPath, archResult.output);
    ctx.architectSpec = readFileSync(archPath, "utf-8");
    ctx.stepStatus.architect = "done";
    saveManifest(ctx);
    await notify(`✅ *Architecture spec gerado!*\n${ctx.architectSpec.slice(0, 300)}...`);

    // ── Step 3: SM (Story Breakdown) ──
    ctx.stepStatus.sm = "running";
    saveManifest(ctx);
    await notify("🏃 *[3/5] Story Breakdown* — Bob está quebrando em stories...");

    const smAgent = getAgent("sm");
    if (!smAgent) throw new Error("SM agent not found in manifest");

    const storySlug = description.slice(0, 20).replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const smResult = await runClaude({
      prompt: `## Your Task\nBreak the PM Brief and Architecture Spec into implementation-ready stories.\n\n## PM Brief\n${ctx.pmBrief.slice(0, 3000)}\n\n## Architecture Spec\n${ctx.architectSpec.slice(0, 3000)}\n\n## Instructions\n1. Read existing specs in _bmad-output/implementation-artifacts/ for format reference\n2. Create 3-8 stories, each independently implementable\n3. Each story MUST include: title, acceptance criteria, tasks with file paths, dev notes\n4. Write EACH story as: _bmad-output/implementation-artifacts/bmad-${storySlug}-1.md, bmad-${storySlug}-2.md, etc.\n5. Also copy to: ${ctx.runDir}/stories/\n6. Order by dependency\n7. CRITICAL: After writing all stories, output this JSON:\n\`\`\`json\n{"stories": ["bmad-${storySlug}-1", "bmad-${storySlug}-2"]}\n\`\`\``,
      systemPrompt: buildAgentPrompt(smAgent),
      allowedTools: [...getToolsForAgent("sm"), "Edit"],
      maxTurns: config.bmadFlow.maxTurnsPerSm,
      model: config.agent.models.spec,
    });

    // Parse story IDs
    const storyJsonMatch = smResult.output.match(/\{"stories":\s*\[([^\]]+)\]\}/);
    if (storyJsonMatch) {
      try {
        const parsed = JSON.parse(storyJsonMatch[0]);
        ctx.stories = parsed.stories.map((id: string) => ({
          id: id.replace(".md", ""),
          specPath: `_bmad-output/implementation-artifacts/${id.replace(".md", "")}.md`,
        }));
      } catch { /* fallback below */ }
    }

    // Fallback: scan for files
    if (ctx.stories.length === 0) {
      const implDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
      if (existsSync(implDir)) {
        const { readdirSync } = await import("fs");
        const storyFiles = readdirSync(implDir)
          .filter((f: string) => f.startsWith(`bmad-${storySlug}`) && f.endsWith(".md"))
          .sort();
        ctx.stories = storyFiles.map((f: string) => ({
          id: f.replace(".md", ""),
          specPath: `_bmad-output/implementation-artifacts/${f}`,
        }));
      }
    }

    writeFileSync(join(ctx.runDir, "03-sm-stories.md"),
      `# Stories\n\n${ctx.stories.map((s, i) => `${i + 1}. ${s.id}`).join("\n")}\n\n---\n\n${smResult.output}`);
    ctx.stepStatus.sm = "done";
    saveManifest(ctx);
    await notify(`✅ *${ctx.stories.length} stories criadas!*\n${ctx.stories.map((s, i) => `  ${i + 1}. ${s.id}`).join("\n")}`);

    if (ctx.stories.length === 0) {
      await notify("⚠️ *SM não produziu stories!* Pipeline interrompido.");
      ctx.stepStatus.dev = "failed";
      ctx.stepStatus.qa = "failed";
      saveManifest(ctx);
      return;
    }

    // ── Step 4: Dev (via queue) ──
    ctx.stepStatus.dev = "running";
    saveManifest(ctx);
    await notify(`💻 *[4/5] Development* — Amelia implementando ${ctx.stories.length} stories em paralelo...`);

    buildQueue(ctx.stories.map((s) => s.id));
    await runQueue();

    const qStatus = getQueueStatus();
    ctx.stepStatus.dev = "done";
    saveManifest(ctx);
    await notify(`✅ *Dev phase completa!*\n${qStatus}`);

    // ── Step 5: QA ──
    ctx.stepStatus.qa = "running";
    saveManifest(ctx);
    await notify("🧪 *[5/5] QA Review* — Quinn revisando...");

    const qaAgent = getAgent("qa");
    if (!qaAgent) throw new Error("QA agent not found in manifest");

    const qaResult = await runClaude({
      prompt: `## Your Task\nReview the full BMAD pipeline output.\n\n## Feature\n${description}\n\n## PM Brief\n${ctx.pmBrief.slice(0, 2000)}\n\n## Stories\n${ctx.stories.map((s) => s.id).join(", ")}\n\n## Queue Status\n${qStatus}\n\n## Instructions\n1. Check each story against acceptance criteria\n2. Run scoped tests\n3. Check: security, i18n, anti-metagaming, accessibility\n4. Write report to: ${ctx.runDir}/05-qa-report.md`,
      systemPrompt: buildAgentPrompt(qaAgent),
      allowedTools: getToolsForAgent("qa"),
      maxTurns: config.bmadFlow.maxTurnsPerQa,
      model: config.agent.models.qa,
    });

    const qaPath = join(ctx.runDir, "05-qa-report.md");
    if (!existsSync(qaPath)) writeFileSync(qaPath, qaResult.output);
    ctx.stepStatus.qa = "done";
    saveManifest(ctx);

    // Final summary
    const elapsed = getElapsed();
    await notify(
      `🏁 *BMAD Pipeline completo!*\n\n` +
      `📝 *Feature:* ${description.slice(0, 100)}\n` +
      `📋 PM: ✅ | 🏗️ Arch: ✅ | 🏃 Stories: ${ctx.stories.length} | 💻 Dev: ✅ | 🧪 QA: ✅\n` +
      `⏱️ Tempo: ${elapsed}\n` +
      `📁 Artifacts: ${config.bmadFlow.runsDir}/${ctx.runId}/`
    );

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("BMAD Pipeline failed", { error: err.message, runId: ctx.runId });
    const failedStep = Object.entries(ctx.stepStatus).find(([, s]) => s === "running");
    if (failedStep) ctx.stepStatus[failedStep[0]] = "failed";
    saveManifest(ctx);
    await notifyError({
      task: `BMAD: ${description.slice(0, 50)}`,
      message: `Falhou no passo ${failedStep?.[0] || "unknown"}: ${err.message.slice(0, 300)}`,
      recoverable: true,
    });
  }
}


// -- Utilities --

function getElapsed(): string {
  if (!currentTask) return "N/A";
  const ms = Date.now() - currentTask.startedAt.getTime();
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// -- Main Command Handler --

export async function handleCommand(input: string): Promise<void> {
  // Concurrency lock — prevents parallel execution from any entry point
  if (isProcessing) {
    logger.warn(`Command rejected (busy): ${input.slice(0, 50)}`);
    await notify(`⏳ Ocupado processando outro comando. Tente novamente em breve.`);
    return;
  }

  isProcessing = true;

  try {
    if (shouldStop) {
      shouldStop = false;
      await notify("⏹️ Orquestrador parado.");
      return;
    }

    // Try quick local parse first (no Claude call needed)
    const quick = quickParse(input);
    const { mode, target } = quick || await parseCommand(input);

    if (mode === "stop") {
      shouldStop = true;
      await notify("⏹️ Parando após a task atual terminar...");
      return;
    }

    if (mode === "status") {
      const qStatus = getQueueStatus();
      if (currentTask) {
        await notifyStatus({
          mode: currentTask.mode,
          currentTask: currentTask.target,
          progress: getElapsed(),
        });
        await notify(qStatus);
      } else {
        await notify(qStatus);
      }
      return;
    }

    if (mode === "queue") {
      if (target === "pause") {
        pauseQueue();
        await notify("⏸️ Queue pausada. Mande 'retomar queue' para continuar.");
        return;
      }
      if (target === "resume") {
        resumeQueue();
        await notify("▶️ Queue retomada. Reiniciando processamento...");
        runQueue().catch((e: Error) => notify(`❌ Queue error: ${e.message}`));
        return;
      }
      if (target.startsWith("retry:")) {
        const storyId = target.slice(6);
        const ok = retryStory(storyId);
        await notify(ok ? `🔄 Story *${storyId}* resetada para retry.` : `❌ Story *${storyId}* não encontrada ou não retryable.`);
        return;
      }
      if (target.startsWith("skip:")) {
        const storyId = target.slice(5);
        const ok = skipStory(storyId);
        await notify(ok ? `⏭️ Story *${storyId}* marcada como skipped.` : `❌ Story *${storyId}* não encontrada.`);
        return;
      }
      buildQueue();
      await notify("🚀 Queue construída! Iniciando processamento de todas as specs...");
      runQueue().catch((e: Error) => notify(`❌ Queue error: ${e.message}`));
      return;
    }

    // Set current task
    currentTask = {
      mode,
      target,
      startedAt: new Date(),
    };

    if (mode !== "chat" && mode !== "idle") {
      await notify(`🎯 Entendi: **${mode}** → ${target || "(sem target)"}`);
    }

    try {
      switch (mode) {
        case "sprint":
          await executeSprint(target);
          break;
        case "story":
          await executeStory(target);
          break;
        case "quickfix":
        case "fix":
          await executeQuickFix(target);
          break;
        case "spec":
          await executeSpec(target);
          break;
        case "qa":
          await executeQA(target);
          break;
        case "plan":
          await executePlan(target || input);
          break;
        case "watch":
          await executeWatch(target || input);
          break;
        case "bmad":
          await executeFullBmadFlow(target || input);
          break;
        case "smoke":
          await executeSmokeTest();
          break;
        case "chat":
        case "idle":
        default:
          await executeChat(target || input);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await notifyError({
        task: `${mode}: ${target}`,
        message: err.message,
        recoverable: false,
      });
    } finally {
      currentTask = null;
    }
  } finally {
    isProcessing = false;
  }
}

// -- Entry Point (only when executed directly) --

const isDirectRun = process.argv[1]?.includes("orchestrator");

if (isDirectRun) {
  (async () => {
    logger.info("BMAD Orchestrator starting", {
      projectRoot: config.projectRoot,
      slack: config.slack.enabled,
    });

    // Wire up circular dependency
    setCommandHandler(handleCommand);

    await notify("🤖 BMAD Orchestrator online! Mande comandos em linguagem natural.");

    const args = process.argv.slice(2).join(" ");
    if (args) {
      await handleCommand(args);
      return;
    }

    console.log("Modo interativo. Digite comandos (ou 'sair' para encerrar):\n");

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "bmad> ",
    });

    rl.prompt();

    rl.on("line", async (line: string) => {
      const input = line.trim();
      if (input === "sair" || input === "exit" || input === "quit") {
        await notify("👋 BMAD Orchestrator desligando.");
        rl.close();
        process.exit(0);
      }

      if (input) {
        await handleCommand(input); // Now safe — handleCommand has internal lock
      }

      rl.prompt();
    });
  })().catch(console.error);
}
