/**
 * BMAD Orchestrator — Structured Logger
 *
 * JSON structured logging for observability.
 * Logs to console (Railway captures stdout) and optional file.
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { config } from "./config.js";

// -- Types --

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

interface TaskMetrics {
  task: string;
  model: string;
  maxTurns: number;
  durationMs: number;
  exitCode: number;
  outputLength: number;
}

// -- Config --

const LOG_DIR = join(config.projectRoot, config.paths.orchestratorLog);
const LOG_FILE = join(LOG_DIR, `run-${new Date().toISOString().slice(0, 10)}.jsonl`);
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// -- Core --

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);

  // Console: human-readable prefix + JSON for structured parts
  const prefix = `[${entry.ts.slice(11, 19)}] ${entry.level.toUpperCase().padEnd(5)}`;

  if (entry.level === "error") {
    console.error(`${prefix} ${entry.msg}`, entry.error || "");
  } else if (entry.level === "warn") {
    console.warn(`${prefix} ${entry.msg}`);
  } else {
    console.log(`${prefix} ${entry.msg}`);
  }

  // File: full JSON line
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // Don't crash on log failure
  }
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  emit({
    ts: new Date().toISOString(),
    level,
    msg,
    ...data,
  });
}

// -- Public API --

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),

  /** Log task completion metrics */
  taskComplete: (metrics: TaskMetrics) => {
    log("info", `Task complete: ${metrics.task}`, {
      task: metrics.task,
      model: metrics.model,
      maxTurns: metrics.maxTurns,
      durationMs: metrics.durationMs,
      exitCode: metrics.exitCode,
      outputLength: metrics.outputLength,
    });
  },

  /** Log git operation */
  git: (operation: string, data?: Record<string, unknown>) => {
    log("info", `[GIT] ${operation}`, data);
  },

  /** Log Claude CLI spawn */
  claude: (msg: string, data?: Record<string, unknown>) => {
    log("info", `[CLAUDE] ${msg}`, data);
  },
};
