/**
 * BMAD Orchestrator — Watcher
 *
 * Persistent state + polling loop that monitors the project
 * and triggers actions when conditions are met.
 *
 * DESIGN: Uses setCommandHandler() to break circular dependency
 * with orchestrator.ts. The handler is injected at boot time.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { config } from "./config.js";
import { notify } from "./slack.js";
import { logger } from "./logger.js";

// -- Types --

export interface WatchRule {
  id: string;
  description: string;
  condition: WatchCondition;
  action: string;
  createdAt: string;
  triggered: boolean;
}

export type WatchCondition =
  | { type: "specs_ready"; sprint: string; expectedSpecs: string[] }
  | { type: "files_exist"; paths: string[] }
  | { type: "no_open_prs" }
  | { type: "tests_pass" }
  | { type: "custom"; check: string };

interface WatcherState {
  rules: WatchRule[];
  lastCheck: string;
  isRunning: boolean;
}

// -- Command Handler (injected to break circular dep) --

type CommandHandler = (input: string) => Promise<void>;
let commandHandler: CommandHandler | null = null;

/**
 * Inject the command handler to break circular dependency.
 * Must be called before startWatcher().
 */
export function setCommandHandler(handler: CommandHandler): void {
  commandHandler = handler;
}

// -- State File --

const STATE_PATH = join(config.projectRoot, "scripts/orchestrator/.watcher-state.json");

function loadState(): WatcherState {
  if (existsSync(STATE_PATH)) {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  }
  return { rules: [], lastCheck: "", isRunning: false };
}

function saveState(state: WatcherState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// -- Condition Checkers --

async function checkCondition(condition: WatchCondition): Promise<boolean> {
  switch (condition.type) {
    case "specs_ready": {
      if (condition.expectedSpecs.length > 0) {
        return condition.expectedSpecs.every((spec) =>
          existsSync(join(config.projectRoot, spec))
        );
      }
      // Auto-detect: check if ANY new spec appeared recently
      const implDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
      const specsDir = join(config.projectRoot, "docs/quick-specs");
      const specs: string[] = [];
      for (const dir of [specsDir, implDir]) {
        if (existsSync(dir)) {
          specs.push(
            ...readdirSync(dir)
              .filter((f: string) => f.endsWith(".md"))
              .map((f: string) => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
              .filter((f: { mtime: number }) => f.mtime > Date.now() - 60 * 60 * 1000)
              .map((f: { name: string }) => f.name)
          );
        }
      }
      return specs.length > 0;
    }
    case "files_exist": {
      return condition.paths.every((p) =>
        existsSync(join(config.projectRoot, p))
      );
    }
    case "tests_pass": {
      try {
        const { execFileSync } = await import("child_process");
        execFileSync("npm", ["test", "--", "--passWithNoTests"], {
          cwd: config.projectRoot,
          timeout: 120_000,
          stdio: "pipe",
        });
        return true;
      } catch {
        return false;
      }
    }
    case "no_open_prs": {
      try {
        const { execFileSync } = await import("child_process");
        const result = execFileSync("gh", ["pr", "list", "--state", "open", "--json", "number"], {
          cwd: config.projectRoot,
          encoding: "utf-8",
          stdio: "pipe",
        });
        const prs = JSON.parse(result);
        return prs.length === 0;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

// -- Rule Management --

export function addRule(rule: Omit<WatchRule, "id" | "createdAt" | "triggered">): string {
  const state = loadState();

  // Deduplicate: skip if a rule with the same condition type + action already exists
  const conditionKey = JSON.stringify(rule.condition);
  const duplicate = state.rules.find(
    (r) => !r.triggered && JSON.stringify(r.condition) === conditionKey && r.action === rule.action
  );
  if (duplicate) {
    logger.info(`Watch rule already exists: ${duplicate.id} — skipping duplicate`);
    return duplicate.id;
  }

  const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  state.rules.push({
    ...rule,
    id,
    createdAt: new Date().toISOString(),
    triggered: false,
  });
  saveState(state);
  return id;
}

export function removeRule(id: string): boolean {
  const state = loadState();
  const before = state.rules.length;
  state.rules = state.rules.filter((r) => r.id !== id);
  saveState(state);
  return state.rules.length < before;
}

export function listRules(): WatchRule[] {
  return loadState().rules;
}

export function clearRules(): void {
  const state = loadState();
  state.rules = [];
  saveState(state);
}

// -- Polling Loop --

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function startWatcher(intervalMs: number = 15 * 60 * 1000): void {
  if (pollInterval) {
    logger.warn("Watcher already running");
    return;
  }

  if (!commandHandler) {
    logger.error("Watcher started without command handler — call setCommandHandler() first");
    return;
  }

  const state = loadState();
  state.isRunning = true;
  saveState(state);

  logger.info(`Watcher started — checking every ${intervalMs / 60_000}min`);

  checkAllRules();
  pollInterval = setInterval(checkAllRules, intervalMs);
}

export function stopWatcher(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  const state = loadState();
  state.isRunning = false;
  saveState(state);
  logger.info("Watcher stopped");
}

async function checkAllRules(): Promise<void> {
  // Guard: skip if a previous check cycle is still running
  if (isProcessing) {
    logger.debug("Skipping watch cycle — previous check still running");
    return;
  }
  isProcessing = true;

  try {
    await checkAllRulesInner();
  } finally {
    isProcessing = false;
  }
}

async function checkAllRulesInner(): Promise<void> {
  const state = loadState();
  state.lastCheck = new Date().toISOString();
  saveState(state);

  const pendingRules = state.rules.filter((r) => !r.triggered);
  if (pendingRules.length === 0) return;

  logger.debug(`Checking ${pendingRules.length} watch rules`);

  for (const rule of pendingRules) {
    try {
      const met = await checkCondition(rule.condition);

      if (met) {
        logger.info(`Watch rule triggered: ${rule.description}`);
        await notify(`👁️ *Watcher:* Condição detectada!\n*Regra:* ${rule.description}\n*Ação:* Executando "${rule.action}"...`);

        try {
          if (commandHandler) {
            await commandHandler(rule.action);
          }
          // Mark triggered and persist — both must succeed
          rule.triggered = true;
          try {
            saveState(state);
          } catch (saveErr) {
            logger.error(`Failed to persist triggered state for rule ${rule.id} — may re-execute next cycle`, { error: String(saveErr) });
          }
        } catch (error) {
          logger.error(`Watch action failed: ${rule.action}`, { error: String(error) });
          await notify(`⚠️ *Watcher:* Ação falhou para regra "${rule.description}". Será tentada novamente no próximo ciclo.`);
        }
      }
    } catch (error) {
      logger.error(`Error checking rule ${rule.id}`, { error: String(error) });
    }
  }
}

// -- Parse Natural Language into Watch Rules --

/**
 * Auto-detect spec files from implementation-artifacts directory.
 */
function detectSpecs(sprint: string): string[] {
  const implDir = join(config.projectRoot, "_bmad-output/implementation-artifacts");
  if (!existsSync(implDir)) return [];

  const prefix = `v2-${sprint.replace(".", "-")}`;
  return readdirSync(implDir)
    .filter((f: string) => f.startsWith(prefix) && f.endsWith(".md"))
    .map((f: string) => `_bmad-output/implementation-artifacts/${f}`);
}

export function parseWatchCommand(input: string): {
  description: string;
  condition: WatchCondition;
  action: string;
} | null {
  const lower = input.toLowerCase();

  // "quando as specs ficarem prontas, comece a codar sprint X"
  if (lower.includes("spec") && (lower.includes("pront") || lower.includes("ready"))) {
    const sprintMatch = input.match(/sprint\s*(\d+)/i);
    const sprint = sprintMatch?.[1] || "1";
    const expectedSpecs = detectSpecs(sprint);

    return {
      description: `Quando todas as specs do Sprint ${sprint} estiverem prontas`,
      condition: {
        type: "specs_ready",
        sprint,
        expectedSpecs,
      },
      action: `sprint ${sprint}`,
    };
  }

  // "quando os testes passarem, crie o PR"
  if (lower.includes("test") && lower.includes("pass")) {
    return {
      description: "Quando todos os testes passarem",
      condition: { type: "tests_pass" },
      action: input.replace(/quando.*?(,|\.)\s*/i, "").trim() || "status",
    };
  }

  // "quando não tiver PR aberto, comece a próxima story"
  if (lower.includes("pr") && (lower.includes("aberto") || lower.includes("open"))) {
    return {
      description: "Quando não houver PRs abertos",
      condition: { type: "no_open_prs" },
      action: input.replace(/quando.*?(,|\.)\s*/i, "").trim() || "status",
    };
  }

  return null;
}
